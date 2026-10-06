# Design Document: Facilitator Console and Support Triage

## Architecture Overview

The facilitator console is a dedicated dashboard with role-based access, real-time learner monitoring, and asynchronous support workflows.

### System Components

1. **Facilitator Role & Access Control** — RLS policies restricting facilitator view to assigned cohort
2. **Real-Time Learner Activity Monitor** — Realtime subscriptions to login, progress events
3. **Risk Detection Engine** — Batch job (runs daily) computing risk signals
4. **Contact Logging & Audit Trail** — Immutable contact records for compliance
5. **Safeguarding Escalation** — Separate, secure workflow for sensitive concerns
6. **Bulk Messaging System** — Queued message delivery via SMS/WhatsApp/in-app
7. **Analytics Dashboard** — Cohort-level aggregates and progress tracking

---

## 1. Database Schema Extensions

```sql
-- Role for facilitators (distinct from instructor)
ALTER TABLE user_roles ADD CONSTRAINT valid_roles 
CHECK (role IN ('student', 'instructor', 'admin', 'facilitator'));

-- Cohorts: groups of learners assigned to a facilitator
CREATE TABLE cohorts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  facilitator_id uuid NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(facilitator_id, name)
);

-- Cohort membership
CREATE TABLE cohort_enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cohort_id uuid NOT NULL REFERENCES cohorts(id),
  learner_id uuid NOT NULL REFERENCES profiles(id),
  enrolled_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(cohort_id, learner_id)
);

-- Risk detection results (computed daily)
CREATE TABLE learner_risk_signals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  learner_id uuid NOT NULL REFERENCES profiles(id),
  cohort_id uuid REFERENCES cohorts(id),
  signal_type TEXT NOT NULL CHECK (signal_type IN (
    'no_login_7d', 'no_activity_14d', 'quiz_failure_streak',
    'incomplete_onboarding', 'tech_error_reported'
  )),
  risk_level TEXT NOT NULL CHECK (risk_level IN ('HIGH', 'MEDIUM', 'LOW')),
  detected_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  INDEX ON (cohort_id, detected_at DESC)
);

-- Support triage queue
CREATE TABLE support_triage_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  learner_id uuid NOT NULL REFERENCES profiles(id),
  cohort_id uuid NOT NULL REFERENCES cohorts(id),
  facilitator_id uuid NOT NULL REFERENCES profiles(id),
  risk_signal_id uuid REFERENCES learner_risk_signals(id),
  reason TEXT NOT NULL, -- e.g. "no_login_7d", or custom reason
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'addressed', 'dismissed')),
  created_at TIMESTAMPTZ DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  INDEX ON (cohort_id, status, created_at DESC)
);

-- Contact logs: immutable audit trail
CREATE TABLE facilitator_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  facilitator_id uuid NOT NULL REFERENCES profiles(id),
  learner_id uuid NOT NULL REFERENCES profiles(id),
  cohort_id uuid NOT NULL REFERENCES cohorts(id),
  method TEXT NOT NULL CHECK (method IN ('SMS', 'WhatsApp', 'Call', 'In-person', 'Office hours', 'Direct message')),
  contacted_at TIMESTAMPTZ NOT NULL,
  barrier_reason TEXT,
  intervention TEXT,
  notes TEXT,
  outcome TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  INDEX ON (learner_id, created_at DESC),
  INDEX ON (facilitator_id, cohort_id, created_at DESC)
);

-- Safeguarding reports: separate, sensitive data
CREATE TABLE safeguarding_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  learner_id uuid NOT NULL REFERENCES profiles(id),
  reporter_id uuid NOT NULL REFERENCES profiles(id),
  cohort_id uuid NOT NULL REFERENCES cohorts(id),
  category TEXT NOT NULL CHECK (category IN (
    'Safety risk', 'Abuse', 'Exploitation', 'Mental health crisis', 'Other'
  )),
  description TEXT NOT NULL,
  immediate_action_needed BOOLEAN DEFAULT false,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'acknowledged', 'in_progress', 'resolved')),
  created_at TIMESTAMPTZ DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  INDEX ON (status, created_at DESC)
  -- Note: No FOREIGN KEY on reporter_id to safeguarding dashboard; access via service role only
);

-- Facilitator broadcasts
CREATE TABLE facilitator_broadcasts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  facilitator_id uuid NOT NULL REFERENCES profiles(id),
  cohort_id uuid NOT NULL REFERENCES cohorts(id),
  recipient_filter TEXT NOT NULL, -- 'all', 'active', 'at_risk', or JSON list of learner IDs
  message_type TEXT NOT NULL CHECK (message_type IN ('SMS', 'WhatsApp', 'In-app')),
  message_body TEXT NOT NULL,
  sent_at TIMESTAMPTZ,
  scheduled_for TIMESTAMPTZ,
  recipient_count INT,
  delivery_status TEXT DEFAULT 'pending' CHECK (delivery_status IN ('pending', 'sent', 'partial_failure', 'failed')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Office hours sessions
CREATE TABLE office_hours_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  facilitator_id uuid NOT NULL REFERENCES profiles(id),
  cohort_id uuid NOT NULL REFERENCES cohorts(id),
  topic TEXT NOT NULL,
  scheduled_at TIMESTAMPTZ NOT NULL,
  duration_minutes INT NOT NULL,
  meeting_url TEXT,
  meeting_details TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  INDEX ON (cohort_id, scheduled_at DESC)
);

CREATE TABLE office_hours_attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES office_hours_sessions(id),
  learner_id uuid NOT NULL REFERENCES profiles(id),
  attended BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(session_id, learner_id)
);

-- RLS Policies

-- Facilitators see only their assigned cohort's learners
CREATE POLICY facilitator_can_view_own_cohort_data
ON cohort_enrollments FOR SELECT
USING (
  cohort_id IN (
    SELECT id FROM cohorts 
    WHERE facilitator_id = auth.uid()
  )
);

-- Facilitators cannot see safeguarding reports filed by other facilitators
CREATE POLICY safeguarding_isolation
ON safeguarding_reports FOR SELECT
USING (
  auth.uid() IN (SELECT id FROM profiles WHERE has_role('admin', 'safeguarding'))
);
```

---

## 2. Risk Detection Engine

```typescript
async function computeRiskSignalsDaily() {
  // Run daily, e.g., via pg_cron or external scheduler
  
  const learners = await supabase.from('profiles').select('id');
  
  for (const learner of learners) {
    const signals: RiskSignal[] = [];
    
    // Check: No login for 7+ days
    const lastLogin = await getLastLogin(learner.id);
    if (daysSince(lastLogin) >= 7) {
      signals.push({
        signal_type: 'no_login_7d',
        risk_level: 'HIGH',
      });
    }
    
    // Check: No activity for 14+ days
    const lastActivity = await getLastActivity(learner.id);
    if (daysSince(lastActivity) >= 14) {
      signals.push({
        signal_type: 'no_activity_14d',
        risk_level: 'MEDIUM',
      });
    }
    
    // Check: Quiz failure streak
    const recentQuizzes = await getRecentQuizzes(learner.id, limit: 3);
    if (recentQuizzes.every(q => !q.passed)) {
      signals.push({
        signal_type: 'quiz_failure_streak',
        risk_level: 'MEDIUM',
      });
    }
    
    // Check: Incomplete onboarding + inactivity
    const profile = await getProfile(learner.id);
    if (!profile.display_name && daysSince(profile.created_at) > 7) {
      signals.push({
        signal_type: 'incomplete_onboarding',
        risk_level: 'HIGH',
      });
    }
    
    // Insert signals and create triage items
    for (const signal of signals) {
      const existing = await supabase
        .from('learner_risk_signals')
        .select('id')
        .eq('learner_id', learner.id)
        .eq('signal_type', signal.signal_type)
        .gte('detected_at', now() - '24 hours'::interval)
        .maybeSingle();
      
      if (!existing) {
        // New signal
        await supabase.from('learner_risk_signals').insert(signal);
        
        // Create triage item
        const cohort = await getCohortForLearner(learner.id);
        if (cohort) {
          await supabase.from('support_triage_items').insert({
            learner_id: learner.id,
            cohort_id: cohort.id,
            facilitator_id: cohort.facilitator_id,
            reason: signal.signal_type,
            status: 'new',
          });
        }
      }
    }
  }
}
```

---

## 3. Facilitator Console React Components

### `<FacilitatorDashboard>`

```typescript
export function FacilitatorDashboard() {
  const { user } = useAuth();
  const [cohort, setCohort] = useQuery(['facilitator-cohort', user?.id]);
  const [learners, setLearners] = useQuery(['cohort-learners', cohort?.id]);
  const [triageQueue, setTriageQueue] = useQuery(['triage-queue', cohort?.id]);
  
  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <p className="text-sm text-muted-foreground">Total Learners</p>
          <p className="text-3xl font-bold">{learners?.length ?? 0}</p>
        </Card>
        <Card>
          <p className="text-sm text-muted-foreground">Active (7d)</p>
          <p className="text-3xl font-bold">{getActiveLearnerCount(learners)}</p>
        </Card>
        <Card>
          <p className="text-sm text-muted-foreground">At Risk</p>
          <p className="text-3xl font-bold text-amber-600">{triageQueue?.length ?? 0}</p>
        </Card>
        <Card>
          <p className="text-sm text-muted-foreground">Completion Rate</p>
          <p className="text-3xl font-bold">{getCompletionRate(learners)}%</p>
        </Card>
      </div>
      
      {/* Support Queue */}
      <Card>
        <h2 className="font-serif text-2xl mb-4">Support Queue</h2>
        <TriageQueue items={triageQueue} />
      </Card>
      
      {/* Learner Roster */}
      <Card>
        <h2 className="font-serif text-2xl mb-4">Learner Roster</h2>
        <LearnerRoster learners={learners} />
      </Card>
    </div>
  );
}
```

### `<TriageQueue>`

```typescript
export function TriageQueue({ items }: { items: TriageItem[] }) {
  return (
    <div className="space-y-3">
      {items.map(item => (
        <div key={item.id} className="border border-border rounded-lg p-4 flex justify-between items-start">
          <div>
            <p className="font-medium">{item.learner_name}</p>
            <p className="text-xs text-muted-foreground">{item.reason} · {formatDistanceToNow(item.created_at)} ago</p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={() => handleContact(item)}>Contact</Button>
            <Button size="sm" variant="outline" onClick={() => handleDismiss(item)}>Dismiss</Button>
          </div>
        </div>
      ))}
    </div>
  );
}
```

### `<ContactDialog>`

```typescript
export function ContactDialog({ item, onClose }: { item: TriageItem; onClose: () => void }) {
  const [method, setMethod] = useState<ContactMethod>();
  const [barrier, setBarrier] = useState('');
  const [intervention, setIntervention] = useState<Intervention>();
  const [notes, setNotes] = useState('');
  const [outcome, setOutcome] = useState('');
  
  async function handleSubmit() {
    await supabase.from('facilitator_contacts').insert({
      facilitator_id: user.id,
      learner_id: item.learner_id,
      method,
      contacted_at: now(),
      barrier_reason: barrier,
      intervention,
      notes,
      outcome,
    });
    
    // Mark triage item as addressed
    await supabase
      .from('support_triage_items')
      .update({ status: 'addressed', resolved_at: now() })
      .eq('id', item.id);
    
    onClose();
  }
  
  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent>
        <h2 className="font-serif text-2xl mb-4">Log Contact: {item.learner_name}</h2>
        
        <div className="space-y-4">
          <Select value={method} onValueChange={setMethod}>
            <SelectTrigger>
              <SelectValue placeholder="Contact method" />
            </SelectTrigger>
            <SelectContent>
              {['SMS', 'WhatsApp', 'Call', 'In-person', 'Office hours', 'Direct message'].map(m => (
                <SelectItem key={m} value={m}>{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Textarea
            value={barrier}
            onChange={(e) => setBarrier(e.target.value)}
            placeholder="What barrier or issue did you discuss?"
            maxLength={500}
          />
          
          <Select value={intervention} onValueChange={setIntervention}>
            <SelectTrigger>
              <SelectValue placeholder="Intervention taken" />
            </SelectTrigger>
            <SelectContent>
              {['Sent learning resource', 'Scheduled office hours', 'Technical support', 'Personal referral', 'No response'].map(i => (
                <SelectItem key={i} value={i}>{i}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Textarea
            value={outcome}
            onChange={(e) => setOutcome(e.target.value)}
            placeholder="Outcome / next steps"
            maxLength={500}
          />
          
          <Button onClick={handleSubmit} className="w-full">Log Contact</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

---

## 4. Real-Time Monitoring with Realtime Subscriptions

```typescript
function useRealTimeLearnerActivity(cohortId: string) {
  useEffect(() => {
    const subscription = supabase
      .channel(`cohort:${cohortId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'lecture_progress',
          filter: `user_id=in.(${getCohortLearnerIds(cohortId)})`,
        },
        (payload) => {
          // Update learner's last activity in real-time
          queryClient.setQueryData(
            ['learner', payload.new.user_id],
            (old: Learner) => ({
              ...old,
              last_activity: now(),
            })
          );
        }
      )
      .subscribe();
    
    return () => subscription.unsubscribe();
  }, [cohortId]);
}
```

---

## 5. Safeguarding Workflow

```typescript
export function ReportConcernDialog({ learner }: { learner: Learner }) {
  const [category, setCategory] = useState<SafeguardingCategory>();
  const [description, setDescription] = useState('');
  const [urgent, setUrgent] = useState(false);
  const { user } = useAuth();
  
  async function handleSubmit() {
    await supabase.from('safeguarding_reports').insert({
      learner_id: learner.id,
      reporter_id: user!.id,
      category,
      description,
      immediate_action_needed: urgent,
      status: 'new',
    });
    
    if (urgent) {
      // Send urgent alert to safeguarding team
      await supabase.functions.invoke('send-safeguarding-alert', {
        body: { report_id, learner_id: learner.id },
      });
    }
    
    toast.success('Concern reported. The safeguarding team will review immediately.');
  }
  
  return (
    <Dialog>
      <DialogContent>
        <h2 className="font-serif text-2xl mb-4">Report a Concern</h2>
        {/* form fields */}
      </DialogContent>
    </Dialog>
  );
}
```

---

## 6. Bulk Messaging System

```typescript
async function sendBulkMessage(cohortId: string, filter: string, message: string, method: 'SMS' | 'WhatsApp' | 'in-app') {
  // 1. Resolve recipient list
  const learners = await resolveLearnerFilter(cohortId, filter);
  
  // 2. Create broadcast record
  const broadcast = await supabase.from('facilitator_broadcasts').insert({
    cohort_id: cohortId,
    recipient_filter: filter,
    message_type: method,
    message_body: message,
    recipient_count: learners.length,
    delivery_status: 'pending',
  });
  
  // 3. Queue delivery
  for (const learner of learners) {
    if (method === 'in-app') {
      await supabase.from('notifications').insert({
        user_id: learner.id,
        type: 'facilitator_message',
        payload: { message },
      });
    } else {
      // Queue SMS/WhatsApp via external service
      await queueMessage({
        learner_id: learner.id,
        phone: learner.phone,
        method,
        message,
      });
    }
  }
}
```

---

## 7. Implementation Roadmap

### Phase 1 (Weeks 1-2): Core Dashboard and Roster
- Database schema and RLS policies
- Facilitator roster view with filtering/sorting
- Real-time activity monitoring

### Phase 2 (Week 3): Risk Detection
- Risk signal computation (daily batch)
- Triage queue UI and filtering

### Phase 3 (Week 4): Contact Logging and Follow-up
- Contact dialog and logging
- Contact history display
- Audit trail

### Phase 4 (Week 5): Bulk Messaging
- Message template system
- Bulk send UI with preview
- Delivery tracking

### Phase 5 (Week 6): Office Hours and Safeguarding
- Office hours scheduling
- Safeguarding report workflow
- Escalation alerts

### Phase 6 (Week 7): Analytics and Reporting
- Cohort-level metrics dashboard
- CSV export functionality

