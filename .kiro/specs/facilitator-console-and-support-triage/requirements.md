# Requirements Document: Facilitator Console and Support Triage

## Introduction

Facilitators (community hub managers, instructors overseeing cohorts) need dedicated operational tooling to manage learner support, identify at-risk learners, and track interventions. This feature provides:

1. A **Facilitator Console** dashboard showing learner roster, activity status, and support-risk flags
2. **Automated risk detection** based on engagement signals
3. **Support triage workflow** with contact logging and outcomes tracking
4. **Bulk messaging and notifications** for cohort-wide communication

---

## Glossary

- **Facilitator**: A community hub manager or instructor overseeing a learner cohort (not the same as course instructor)
- **Cohort**: A group of learners assigned to a facilitator for support and monitoring
- **Risk Signal**: An automated flag indicating a learner might need intervention (no login for 7 days, repeated quiz failure, etc.)
- **Intervention**: A recorded action (SMS, WhatsApp, office hours referral, direct message) taken to support a learner
- **Triage**: The process of prioritizing learners by risk level for facilitator action

---

## Requirements

### Requirement 1: Facilitator Onboarding

**User Story:** As a facilitator, I want to be assigned to a cohort and see my dashboard immediately so I can start supporting learners.

#### Acceptance Criteria

1. WHEN a platform admin creates a new cohort, THEY SHALL assign a facilitator by email or user ID.
2. THE facilitator SHALL receive a notification with a link to `/facilitator` (new route for facilitators).
3. WHEN the facilitator navigates to `/facilitator`, THEY SHALL see: cohort name, assigned learner count, and a quick-start guide (if first visit).
4. IF a facilitator has no assigned cohort, THEY SHALL see a message "No cohort assigned yet. Contact support." with a contact link.

---

### Requirement 2: Facilitator Roster with Activity Status

**User Story:** As a facilitator, I want to see all learners in my cohort with their current activity status so I know who is actively learning and who is falling behind.

#### Acceptance Criteria

1. THE Facilitator Console SHALL display a searchable, sortable learner roster with columns:
   - Learner name
   - Email / phone number
   - Current course (if enrolled)
   - Last login (e.g., "2 hours ago", "3 days ago")
   - Current module (if in progress)
   - Completion % for current course
   - Risk level badge (green "on track", yellow "at risk", red "high risk")
2. FACILITATORS SHALL be able to sort by: name, last_login, risk_level, completion_percent.
3. FACILITATORS SHALL be able to filter by: risk_level, current_course, enrollment_status (active, inactive, completed).
4. WHEN a facilitator clicks a learner row, IT SHALL open a learner detail panel showing:
   - Profile (name, avatar, contact info, device type)
   - Enrollment timeline (courses, start date, completion status)
   - Recent activity log (last 10 events: login, lesson watched, quiz attempted, message sent)
   - Assigned device / data plan if using shared resources
   - Baseline skills assessment and progress vs. baseline

---

### Requirement 3: Automated Risk Detection and Triage Queue

**User Story:** As a facilitator, I want the system to flag learners who need help so I don't have to manually check each learner's activity.

#### Acceptance Criteria

1. THE system SHALL compute a "Risk Level" for each learner daily based on:
   - No login for 7+ days (HIGH risk)
   - No meaningful activity (lesson watch / quiz attempt) for 14+ days (MEDIUM risk)
   - Repeated quiz failure (> 3 consecutive failed attempts without passing) (MEDIUM risk)
   - Long inactivity period combined with incomplete onboarding (HIGH risk)
   - Reported technical error or connection issue (LOW risk)
2. WHEN a learner's risk level changes, THE system SHALL insert a "support_triage_item" row with: learner_id, risk_signal, detected_at, status (new, addressed, dismissed).
3. THE Facilitator Console SHALL display a "Support Queue" showing learners flagged as HIGH or MEDIUM risk in reverse chronological order (newest first).
4. THE Support Queue SHALL include: learner name, risk reason, days since last activity, and action buttons (Contact, Dismiss, Mark resolved).
5. FACILITATORS MAY manually add a learner to the Support Queue with a custom reason.

---

### Requirement 4: Facilitator-Learner Contact Logging

**User Story:** As a facilitator, I want to log every interaction with a learner so the team can track what support was provided and follow up on outcomes.

#### Acceptance Criteria

1. WHEN a facilitator clicks "Contact" on a learner in the Support Queue, A modal dialog SHALL open with fields:
   - Contact method: SMS, WhatsApp, Call, In-person, Office hours, Direct message
   - Contact date & time (pre-filled with now)
   - Barrier / issue discussed (free text, max 500 characters)
   - Intervention taken: "Sent learning resource", "Scheduled office hours", "Technical support", "Personal referral (safeguarding)", "No response"
   - Notes (free text, max 1000 characters)
   - Outcome / next steps (free text, max 500 characters)
2. WHEN a facilitator submits the contact log, THE system SHALL:
   - Insert a `facilitator_contacts` row with: facilitator_id, learner_id, method, contacted_at, barrier_reason, intervention, notes, outcome, created_at
   - Mark the associated triage item as "addressed" (or "dismissed" if no follow-up needed)
   - Display confirmation: "Contact logged. [Learner] will see a notification if you send a message."
3. THE learner MAY optionally receive a notification of the contact (e.g., "Your facilitator reached out"). Notification is optional based on contact method.

---

### Requirement 5: Learner Support Card with Contact History

**User Story:** As a facilitator, I want to see all previous interactions with a learner so I can provide consistent, informed support.

#### Acceptance Criteria

1. IN the learner detail panel, THERE SHALL be a "Support History" section showing:
   - List of all `facilitator_contacts` rows for this learner, sorted reverse-chronologically
   - Each row displays: date, facilitator name, contact method, barrier/issue, intervention, outcome
   - Inline "Add contact" button to log a new interaction
2. THE Support History SHALL be visible only to the assigned facilitator and admins.

---

### Requirement 6: Bulk Messaging and Announcements

**User Story:** As a facilitator, I want to send a message to multiple learners at once (e.g., a module starts, office hours reminder) so I don't have to contact each learner individually.

#### Acceptance Criteria

1. IN the Facilitator Console, THERE SHALL be a "Send Message" button that opens a dialog with:
   - Recipient filter: "All learners in cohort", "Active learners (logged in last 7 days)", "At-risk learners", "Specific learner(s)"
   - Message type: "SMS", "WhatsApp", "In-app notification"
   - Message template selector (optional pre-built templates like "Course starts Monday", "Quiz reminder")
   - Message body (max 160 characters for SMS, 1000 for in-app)
   - Send now or schedule for later
2. BEFORE sending, THE system SHALL display: "Message will be sent to 45 learners via SMS" (confirmation count).
3. WHEN the facilitator confirms, THE system SHALL:
   - Create a `facilitator_broadcasts` row with: facilitator_id, cohort_id, recipients, message_type, message_body, sent_at
   - Send the message via SMS/WhatsApp API (external service) or insert notification rows for in-app messages
   - Display "Message sent to 45 learners" confirmation and log delivery status
4. FACILITATORS SHALL see a "Broadcast History" log showing all past messages, recipient counts, and delivery status.

---

### Requirement 7: Office Hours and Group Sessions

**User Story:** As a facilitator, I want to schedule office hours and invite learners so they can get real-time support.

#### Acceptance Criteria

1. IN the Facilitator Console, THERE SHALL be an "Office Hours" calendar view showing:
   - Scheduled sessions (date, time, duration, topic, attendee count)
   - "Schedule new office hours" button
2. WHEN a facilitator schedules office hours, THEY SHALL provide:
   - Date, time (local timezone), duration
   - Topic or description (e.g., "Q&A for Module 3")
   - Invite specific learners or all cohort members
3. WHEN office hours are scheduled, INVITED learners SHALL:
   - Receive an in-app notification and optional SMS/WhatsApp reminder
   - See the session on their calendar or in `/learn` dashboard
   - Receive a video call link (Zoom, Google Meet) or meeting details
4. AFTER office hours end, THE facilitator MAY mark attendance and log outcomes (notes on discussions, action items for follow-up).

---

### Requirement 8: Safeguarding Flags and Referral Workflow

**User Story:** As a facilitator, I want to report safeguarding concerns so the appropriate team can follow up without exposing sensitive data to other learners' facilitators.

#### Acceptance Criteria

1. IN a learner's detail panel, THERE SHALL be a "Report concern" button visible only to facilitators.
2. WHEN clicked, A modal SHALL open with:
   - Concern category: "Safety risk", "Abuse", "Exploitation", "Mental health crisis", "Other"
   - Concern description (required, free text, max 1000 characters)
   - Immediate action needed (yes/no)
3. WHEN submitted, THE system SHALL:
   - Create a `safeguarding_reports` row (NOT visible to other facilitators' query results)
   - Route to a **safeguarding team dashboard** (admin/safeguarding role only)
   - Notify the safeguarding team immediately if "immediate action needed" = true
   - Log the report with timestamp, reporter, learner, and concern details
4. THE safeguarding team SHALL see a dedicated interface for reviewing, responding to, and resolving reports.

---

### Requirement 9: Facilitator Dashboards and Cohort Analytics

**User Story:** As a facilitator, I want to see high-level cohort metrics so I can assess overall health and identify systemic issues.

#### Acceptance Criteria

1. THE Facilitator Console SHALL display a summary card with:
   - Total learners in cohort
   - Active learners (logged in last 7 days)
   - Course completion rate
   - Average completion time vs. target
   - At-risk learner count
   - Average support response time (hours from flag to first contact)
2. THERE SHALL be a "Cohort Progress" chart showing:
   - Lessons started vs. completed (bar chart)
   - Completion timeline (line chart): target vs. actual
   - Drop-off by lesson (where do learners tend to quit)
3. FACILITATORS MAY download a CSV report of learner progress for their records or to share with stakeholders.

---

## Correctness Properties

### Property 1: Support queue reflects current risk state

**For all learners L in support queue:**
`risk_level(L) ∈ {HIGH, MEDIUM} ∧ detected_at(L) >= now() - 24_hours`

The support queue only contains learners flagged as HIGH or MEDIUM risk within the last 24 hours.

### Property 2: Contact log immutability

**For all facilitator contacts C:**
`created_at(C) ≤ now ∧ contact_logged(C) = true`

All contact logs are immutable after creation. Corrections are made via new entries, not updates.

### Property 3: Safeguarding data isolation

**For all safeguarding reports R and facilitators F:**
`F.facilitator_id ≠ R.reporter_id → safeguarding_data_visible(F, R) = false`

Facilitators cannot see safeguarding reports filed by other facilitators. Only safeguarding team sees all reports.

### Property 4: Risk signal accuracy

**For all risk signals S:**
`signal_triggered(S) → learner_meets_condition(S) = true`

A learner is only flagged with a risk signal if they meet the signal's condition (e.g., 7+ days no login).

### Property 5: Contact notification consent

**For all contacts C where contact_method(C) ∈ {SMS, WhatsApp, Call}:**
`learner_consented_to_contact(C) = true ∨ facilitated_outreach_policy_allows(C) = true`

Facilitator-initiated contact respects learner preferences and platform policies.

---

## Acceptance Criteria Summary

| Feature | P0/P1 | Key Metric |
|---------|-------|-----------|
| Facilitator roster | P0 | 100% of cohort visible with activity status |
| Risk detection | P0 | Flags generated within 24 hours of condition met |
| Contact logging | P0 | All interventions logged; 100% audit trail |
| Bulk messaging | P0 | Send to 100+ learners in < 30s |
| Office hours | P1 | Schedule, invite, join, record attendance |
| Safeguarding workflow | P0 | Reports secure, immediate escalation if urgent |
| Cohort analytics | P1 | Completion rate, drop-off analysis, downloadable reports |

