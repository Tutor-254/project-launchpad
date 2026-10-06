# Design Document: Competency Framework and Mastery Learning

## Architecture Overview

The competency framework extends Arcane's course and assessment architecture with:

1. **Competency model** — skill definitions with observable behaviors, success criteria, prerequisites, job mappings
2. **Diagnostic assessment system** — pre-course testing for prerequisite detection and personalized pathway routing
3. **Competency-linked assessments** — knowledge tests and practical projects directly measuring skill mastery
4. **Mastery learning workflow** — attempt → feedback → remediation → retry with retry rules and cooldowns
5. **Competency badges** — digital credentials for demonstrated skills with verification and share capabilities
6. **Competency analytics** — instructor dashboards showing mastery rates, failure points, and learner progress

---

## Database Schema Extensions

### 1. Competencies Table

```sql
CREATE TABLE competencies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title text NOT NULL,                              -- max 100 chars
  description text NOT NULL,                        -- max 500 chars
  observable_behaviors text[] NOT NULL,             -- array of 2-5 specific behaviors
  success_criteria text NOT NULL,                   -- definition of passing
  prerequisite_competencies uuid[] DEFAULT '{}',    -- array of competency IDs from earlier courses
  related_job_titles text[] DEFAULT '{}',           -- e.g., ["Junior Backend Developer", "API Specialist"]
  order_index integer NOT NULL DEFAULT 1,           -- sort order within course
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now(),
  CONSTRAINT competency_course_unique UNIQUE(course_id, order_index)
);

CREATE INDEX idx_competencies_course ON competencies(course_id);
GRANT SELECT ON competencies TO authenticated;
GRANT SELECT, INSERT, UPDATE ON competencies TO authenticated;

-- RLS: Users can read all competencies; instructors can INSERT/UPDATE own course competencies
ALTER TABLE competencies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read competencies" ON competencies FOR SELECT USING (true);
CREATE POLICY "Instructors can insert competencies for their courses" ON competencies FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM courses c WHERE c.id = course_id AND c.instructor_id = auth.uid())
  );
CREATE POLICY "Instructors can update their course competencies" ON competencies FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM courses c WHERE c.id = course_id AND c.instructor_id = auth.uid())
  );
```

### 2. Diagnostic Assessments Table

```sql
CREATE TABLE diagnostic_assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  name text NOT NULL,                               -- e.g., "Node.js Basics Diagnostic"
  description text,
  prerequisite_competency_ids uuid[] NOT NULL,     -- competencies this diagnostic covers
  pass_threshold integer NOT NULL DEFAULT 50,      -- % score to pass
  question_count integer NOT NULL DEFAULT 5,       -- 5-10 recommended
  cooldown_days integer NOT NULL DEFAULT 7,        -- min days before re-take
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

CREATE INDEX idx_diagnostic_assessments_course ON diagnostic_assessments(course_id);
GRANT SELECT ON diagnostic_assessments TO authenticated;
ALTER TABLE diagnostic_assessments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read diagnostics" ON diagnostic_assessments FOR SELECT USING (true);
```

### 3. Diagnostic Questions Table

```sql
CREATE TABLE diagnostic_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  diagnostic_id uuid NOT NULL REFERENCES diagnostic_assessments(id) ON DELETE CASCADE,
  question_text text NOT NULL,
  question_type text NOT NULL CHECK (question_type IN ('multiple_choice', 'short_answer')),
  options jsonb,                                    -- for multiple_choice: { choices: ["A", "B", "C"], correct: 1 }
  correct_answer text,                              -- for short_answer
  points integer NOT NULL DEFAULT 1,
  order_index integer NOT NULL,
  created_at timestamp DEFAULT now()
);

CREATE INDEX idx_diagnostic_questions_diagnostic ON diagnostic_questions(diagnostic_id);
GRANT SELECT ON diagnostic_questions TO authenticated;
ALTER TABLE diagnostic_questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read diagnostic questions" ON diagnostic_questions FOR SELECT USING (true);
```

### 4. Diagnostic Attempts Table

```sql
CREATE TABLE diagnostic_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  diagnostic_id uuid NOT NULL REFERENCES diagnostic_assessments(id) ON DELETE CASCADE,
  score integer NOT NULL,                           -- 0-100
  passed boolean GENERATED ALWAYS AS (score >= (SELECT pass_threshold FROM diagnostic_assessments d WHERE d.id = diagnostic_id)) STORED,
  attempt_number integer NOT NULL,
  created_at timestamp DEFAULT now(),
  CONSTRAINT diagnostic_attempt_unique UNIQUE(user_id, diagnostic_id, attempt_number)
);

CREATE INDEX idx_diagnostic_attempts_user ON diagnostic_attempts(user_id);
CREATE INDEX idx_diagnostic_attempts_diagnostic ON diagnostic_attempts(diagnostic_id);
GRANT SELECT ON diagnostic_attempts TO authenticated;
ALTER TABLE diagnostic_attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own diagnostic attempts" ON diagnostic_attempts FOR SELECT
  USING (user_id = auth.uid());
CREATE POLICY "Users can insert own diagnostic attempts" ON diagnostic_attempts FOR INSERT
  WITH CHECK (user_id = auth.uid());
```

### 5. Competency-Based Assessments Table (extends existing assessments)

```sql
CREATE TABLE competency_assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  competency_id uuid NOT NULL REFERENCES competencies(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  assessment_type text NOT NULL CHECK (assessment_type IN ('knowledge_test', 'practical', 'hybrid')),
  mastery_rule text NOT NULL,                       -- e.g., "score >= 70 AND rubric_score >= 8"
  max_attempts integer NOT NULL DEFAULT 3,
  retry_cooldown_hours integer NOT NULL DEFAULT 24,
  remediation_lesson_id uuid REFERENCES lectures(id) ON DELETE SET NULL,
  requires_remediation_before_retry boolean NOT NULL DEFAULT true,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

CREATE INDEX idx_competency_assessments_course ON competency_assessments(course_id);
CREATE INDEX idx_competency_assessments_competency ON competency_assessments(competency_id);
GRANT SELECT ON competency_assessments TO authenticated;
ALTER TABLE competency_assessments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read competency assessments" ON competency_assessments FOR SELECT USING (true);
```

### 6. Assessment Attempts Table (tracks retries, scores, feedback)

```sql
CREATE TABLE assessment_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  competency_assessment_id uuid NOT NULL REFERENCES competency_assessments(id) ON DELETE CASCADE,
  attempt_number integer NOT NULL,
  score integer NOT NULL,                           -- 0-100
  passed boolean NOT NULL,
  feedback text,                                    -- e.g., "Key gap: Error handling"
  remediation_recommended_at timestamp,
  remediation_completed_at timestamp,
  can_retry_at timestamp,                           -- attempt_timestamp + retry_cooldown
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now(),
  CONSTRAINT assessment_attempt_unique UNIQUE(user_id, competency_assessment_id, attempt_number)
);

CREATE INDEX idx_assessment_attempts_user ON assessment_attempts(user_id);
CREATE INDEX idx_assessment_attempts_assessment ON assessment_attempts(competency_assessment_id);
GRANT SELECT ON assessment_attempts TO authenticated;
ALTER TABLE assessment_attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own assessment attempts" ON assessment_attempts FOR SELECT
  USING (user_id = auth.uid());
CREATE POLICY "Instructors can read attempts in their courses" ON assessment_attempts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM competency_assessments ca
      JOIN courses c ON c.id = ca.course_id
      WHERE ca.id = competency_assessment_id AND c.instructor_id = auth.uid()
    )
  );
```

### 7. Practical Projects Table

```sql
CREATE TABLE practical_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  competency_id uuid NOT NULL REFERENCES competencies(id) ON DELETE CASCADE,
  title text NOT NULL,                              -- e.g., "Capstone: Deploy Your API"
  brief text NOT NULL,                              -- 500-2000 chars
  example_url text,                                 -- screenshot, repo link, or demo
  submission_instructions text NOT NULL,
  accepted_file_types text[] DEFAULT '{"pdf", "zip", "json", "csv", "xlsx"}',
  max_file_size_mb integer NOT NULL DEFAULT 50,
  rubric_id uuid REFERENCES rubrics(id) ON DELETE SET NULL,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

CREATE INDEX idx_practical_projects_competency ON practical_projects(competency_id);
GRANT SELECT ON practical_projects TO authenticated;
ALTER TABLE practical_projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read practical projects" ON practical_projects FOR SELECT USING (true);
```

### 8. Project Submissions Table

```sql
CREATE TABLE project_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES practical_projects(id) ON DELETE CASCADE,
  submission_version integer NOT NULL DEFAULT 1,
  submission_type text NOT NULL CHECK (submission_type IN ('file', 'url', 'video')),
  file_url text,                                    -- signed URL to uploaded file (if file type)
  external_url text,                                -- GitHub, deployed site, Google Sheets link
  video_url text,                                   -- screen recording link
  submission_text text,                             -- any notes from learner
  status text NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'under_review', 'graded', 'rejected')),
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now(),
  CONSTRAINT one_latest_submission_per_project UNIQUE(user_id, project_id, submission_version)
);

CREATE INDEX idx_project_submissions_user ON project_submissions(user_id);
CREATE INDEX idx_project_submissions_project ON project_submissions(project_id);
GRANT SELECT ON project_submissions TO authenticated;
ALTER TABLE project_submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own submissions" ON project_submissions FOR SELECT
  USING (user_id = auth.uid());
CREATE POLICY "Users can insert submissions" ON project_submissions FOR INSERT
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "Instructors can read submissions in their course projects" ON project_submissions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM practical_projects pp
      JOIN competencies c ON c.id = pp.competency_id
      JOIN courses co ON co.id = c.course_id
      WHERE pp.id = project_id AND co.instructor_id = auth.uid()
    )
  );
```

### 9. Rubrics Table

```sql
CREATE TABLE rubrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,                              -- e.g., "API Deployment Rubric"
  description text,
  criteria jsonb NOT NULL,                          -- [{ name: "Code Quality", points: 5 }, { name: "Documentation", points: 3 }]
  total_points integer GENERATED ALWAYS AS (
    (SELECT SUM((c->>'points')::integer) FROM jsonb_array_elements(criteria) AS c)
  ) STORED,
  passing_score_percent integer NOT NULL DEFAULT 70, -- % of total_points to pass
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

GRANT SELECT ON rubrics TO authenticated;
ALTER TABLE rubrics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read rubrics" ON rubrics FOR SELECT USING (true);
```

### 10. Project Grades Table

```sql
CREATE TABLE project_grades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id uuid NOT NULL REFERENCES project_submissions(id) ON DELETE CASCADE,
  rubric_id uuid NOT NULL REFERENCES rubrics(id) ON DELETE RESTRICT,
  graded_by_user_id uuid NOT NULL REFERENCES profiles(id),  -- instructor or AI
  grading_type text NOT NULL CHECK (grading_type IN ('instructor', 'ai')),
  scores jsonb NOT NULL,                            -- { "Code Quality": 4, "Documentation": 2 }
  total_score integer NOT NULL,
  feedback text,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

CREATE INDEX idx_project_grades_submission ON project_grades(submission_id);
GRANT SELECT ON project_grades TO authenticated;
ALTER TABLE project_grades ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read grades on own submissions" ON project_grades FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM project_submissions ps WHERE ps.id = submission_id AND ps.user_id = auth.uid())
  );
```

### 11. Competency Badges Table

```sql
CREATE TABLE competency_badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  competency_id uuid NOT NULL REFERENCES competencies(id) ON DELETE RESTRICT,
  assessment_passed_at timestamp NOT NULL,
  project_passed_at timestamp NOT NULL,
  badge_code text NOT NULL UNIQUE,                  -- unique verification code
  created_at timestamp DEFAULT now(),
  CONSTRAINT one_badge_per_user_competency UNIQUE(user_id, competency_id)
);

CREATE INDEX idx_competency_badges_user ON competency_badges(user_id);
GRANT SELECT ON competency_badges TO authenticated;
GRANT INSERT ON competency_badges TO authenticated;
ALTER TABLE competency_badges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own badges" ON competency_badges FOR SELECT
  USING (user_id = auth.uid());
CREATE POLICY "Users can read public badges for portfolio sharing" ON competency_badges FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles p WHERE p.id = user_id AND p.portfolio_public = true
    )
  );
CREATE POLICY "Service role can insert badges (from assessment triggers)" ON competency_badges FOR INSERT
  WITH CHECK (true);
```

### 12. Learner Pathways Table (personalized learning recommendations)

```sql
CREATE TABLE learner_pathways (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  recommended_start_section_id uuid REFERENCES course_sections(id) ON DELETE SET NULL,
  skip_section_ids uuid[] DEFAULT '{}',
  baseline_competencies text[] DEFAULT '{}',       -- e.g., ["Basic spreadsheet knowledge"]
  recommendation_reason text,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now(),
  CONSTRAINT one_pathway_per_course_per_user UNIQUE(user_id, course_id)
);

CREATE INDEX idx_learner_pathways_user ON learner_pathways(user_id);
GRANT SELECT ON learner_pathways TO authenticated;
ALTER TABLE learner_pathways ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own pathways" ON learner_pathways FOR SELECT
  USING (user_id = auth.uid());
CREATE POLICY "Service role can insert/update pathways" ON learner_pathways FOR INSERT, UPDATE
  WITH CHECK (true);
```

---

## API and Server Functions

### 1. `submitDiagnosticAttempt(diagnosticId, answers)`

**Purpose:** Record diagnostic attempt and calculate score.

```typescript
export async function submitDiagnosticAttempt(
  diagnosticId: string,
  userAnswers: { questionId: string; answer: string }[]
): Promise<{ score: number; passed: boolean; nextSteps: string[] }> {
  // 1. Fetch diagnostic questions
  // 2. Score each answer
  // 3. Calculate total score
  // 4. Insert into diagnostic_attempts
  // 5. If passed >= 50%, return pathway recommendation
  // 6. If failed, return prerequisite course recommendations
}
```

### 2. `submitAssessmentAttempt(assessmentId, answers)`

**Purpose:** Record competency assessment attempt, validate retry rules, provide feedback.

```typescript
export async function submitAssessmentAttempt(
  assessmentId: string,
  userAnswers: { questionId: string; answer: string }[]
): Promise<{ 
  score: number; 
  passed: boolean; 
  feedback: string;
  canRetryAt: Date | null;
  competencyAttained: boolean;
}> {
  // 1. Check max attempts not exceeded
  // 2. Check retry cooldown not violated
  // 3. Score the attempt
  // 4. Provide feedback (e.g., "Key gap: Error handling")
  // 5. If remediation required, set remediation_recommended_at
  // 6. If passed, check if project also passed → issue badge if both passed
}
```

### 3. `submitProjectSubmission(projectId, submission)`

**Purpose:** Store project submission and queue for review.

```typescript
export async function submitProjectSubmission(
  projectId: string,
  submission: {
    type: 'file' | 'url' | 'video';
    fileUrl?: string;
    externalUrl?: string;
    videoUrl?: string;
    submissionText?: string;
  }
): Promise<{ submissionId: string; status: 'submitted' }> {
  // 1. Validate file type and size (if file)
  // 2. Validate URL format (if URL)
  // 3. Insert into project_submissions
  // 4. Queue for instructor review
}
```

### 4. `gradeProjectSubmission(submissionId, scores, feedback)`

**Purpose:** Record rubric-based grade on project submission; trigger badge issuance if both assessment and project passed.

```typescript
export async function gradeProjectSubmission(
  submissionId: string,
  rubricScores: Record<string, number>,
  feedback: string
): Promise<{ totalScore: number; passed: boolean; badgeIssued: boolean }> {
  // 1. Calculate total score from rubric
  // 2. Insert into project_grades
  // 3. Update project_submissions status to 'graded'
  // 4. If score passes AND assessment passed, issue competency badge
}
```

### 5. `generateLearnerPathway(userId, courseId)`

**Purpose:** Diagnostic score → personalized pathway recommendations.

```typescript
export async function generateLearnerPathway(
  userId: string,
  courseId: string
): Promise<{ 
  recommendedStartSection: Section;
  skipSections: Section[];
  baselineCompetencies: string[];
  reason: string;
}> {
  // 1. Fetch diagnostic attempts for this learner + course prerequisites
  // 2. Compare learner scores to prerequisite competencies
  // 3. Recommend sections to skip, prerequisite courses to complete
  // 4. Insert into learner_pathways
}
```

---

## UI Components

### 1. CompetencyFramework Component (Instructor Studio)

Located: `src/components/competency-framework.tsx`

**Props:**
- `courseId: string`

**Responsibility:**
- Display list of course competencies
- Add/edit/delete competency form
- Map sections to competencies
- Show: observable behaviors, success criteria, prerequisite skills, job titles

### 2. DiagnosticAssessment Component

Located: `src/components/diagnostic-assessment.tsx`

**Props:**
- `diagnosticId: string`
- `onComplete: (score, passed) => void`

**Responsibility:**
- Render diagnostic questions
- Accept answers
- Submit and show results
- Display recommendations (prerequisite courses vs. main course)

### 3. CompetencyAssessment Component

Located: `src/components/competency-assessment.tsx`

**Props:**
- `assessmentId: string`
- `competencyId: string`

**Responsibility:**
- Render knowledge test questions or practical project brief
- Submit answers
- Show score, pass/fail, feedback
- Display retry rules: remaining attempts, cooldown, remediation link
- Block retry button if max attempts exceeded or cooldown active

### 4. ProjectSubmissionForm Component

Located: `src/components/project-submission-form.tsx`

**Props:**
- `projectId: string`
- `onSubmit: (submission) => void`

**Responsibility:**
- Render project brief, example, rubric
- Accept file, URL, or video submission
- Show submission history (version control)
- Validate file type and size

### 5. RubricGradeForm Component (Instructor)

Located: `src/components/rubric-grade-form.tsx`

**Props:**
- `submissionId: string`
- `rubricId: string`

**Responsibility:**
- Display rubric criteria with point scales
- Accept scores and feedback per criterion
- Auto-calculate total score
- Submit grade and show pass/fail badge issuance confirmation

### 6. CompetencyBadgeCard Component

Located: `src/components/competency-badge-card.tsx`

**Props:**
- `badgeId: string`
- `shareable: boolean`

**Responsibility:**
- Display badge image, title, date earned, issuer
- Show verification URL
- Provide share buttons (LinkedIn, Twitter, email, download PNG)

### 7. CompetencyAnalyticsDashboard Component (Instructor)

Located: `src/components/competency-analytics-dashboard.tsx`

**Props:**
- `courseId: string`

**Responsibility:**
- Display mastery rates per competency (% passed assessment, % submitted project)
- Show common failure points (which questions/rubric items failed most)
- Learner progress table (Not started | In progress | Assessed | Attained)
- Export to CSV

---

## Routes

### Student Routes

| Route | Purpose |
|-------|---------|
| `/learn/$courseId/diagnostic` | Pre-enrollment diagnostic test |
| `/learn/$courseId/competencies` | Course competency overview |
| `/learn/$courseId/$competencyId/assessment` | Competency assessment page |
| `/learn/$courseId/$competencyId/project` | Project submission page |
| `/certificates/competency-profile` | All earned competency badges |
| `/certificates/export-skills` | Export skills profile (PDF/link) |

### Instructor Routes

| Route | Purpose |
|-------|---------|
| `/instructor/$courseId/competencies` | Competency definition editor |
| `/instructor/$courseId/assessments` | Competency assessments CRUD |
| `/instructor/$courseId/projects` | Practical projects management |
| `/instructor/$courseId/grading` | Project submission grading queue |
| `/instructor/analytics/competencies` | Competency mastery analytics |

### Admin Routes (for verification)

| Route | Purpose |
|-------|---------|
| `/verify/badge/$badgeCode` | Public badge verification page |

---

## Data Validation Rules

### Competency

- Title: 1-100 chars, required
- Description: 1-500 chars, required
- Observable behaviors: 2-5 items, required
- Success criteria: required, human-readable
- Prerequisite competencies: optional, must reference existing competencies
- Related job titles: optional, free text tags

### Diagnostic Assessment

- Pass threshold: 0-100, default 50
- Question count: 5-10
- Cooldown: 0-30 days
- Questions: multiple choice OR short answer only

### Competency Assessment

- Mastery rule: parseable expression (e.g., "score >= 70 AND rubric_score >= 8")
- Max attempts: 1-10
- Retry cooldown: 0-168 hours (0-7 days)
- Remediation lesson: optional, must reference valid lecture

### Practical Project

- Brief: 500-2000 chars
- Accepted file types: standard formats (pdf, zip, json, csv, xlsx)
- Max file size: 1-500 MB
- Rubric: required, at least 2 criteria

### Rubric

- Criteria: 2-10 items
- Points per criterion: 0-100
- Passing score: 1-100%

---

## Trigger-Based Automation

### On Assessment Pass + Project Pass

**Trigger:** When `assessment_passed = true` AND `project_grade_total >= passing_threshold`

**Action:**
1. Insert row into `competency_badges`
2. Generate badge image
3. Insert notification: "Congratulations! You earned the '[Competency]' badge"
4. Update `certificates.competency_badges_count` (if exists)

### On Diagnostic Complete

**Trigger:** After `diagnostic_attempts` insert

**Action:**
1. Calculate score
2. Call `generateLearnerPathway` to create pathway recommendation
3. Insert into `learner_pathways`
4. Display pathway on course enrollment screen

### On Assessment Fail

**Trigger:** When `assessment_passed = false`

**Action:**
1. If `requires_remediation_before_retry = true`, set `remediation_recommended_at`
2. Insert notification: "You scored [X]%. Review remediation: [link to lesson]"
3. Calculate `can_retry_at = now + retry_cooldown`

---

## Testing Strategy

### Unit Tests

- **Competency data validation**: title length, observable behaviors count, job titles format
- **Diagnostic scoring**: correct/incorrect answers, score calculation, pass threshold comparison
- **Assessment retry rules**: max attempts enforcement, cooldown calculation
- **Rubric scoring**: criterion points accumulation, passing score calculation
- **Badge issuance logic**: both assessment and project passed before badge issued
- **Pathway generation**: diagnostic score → recommendation mapping

### Property-Based Tests

1. **Property 1**: Competency-assessment alignment — assessments only measure competency-aligned criteria
2. **Property 2**: Mastery before badge issuance — badges only issued when assessment AND project passed
3. **Property 3**: Diagnostic routing accuracy — score < 50% → prerequisite, >= 50% → main course
4. **Property 4**: Retry rule enforcement — attempts never exceed max
5. **Property 5**: Remediation prerequisite — if required, learner cannot retry until completed
6. **Property 6**: Project evidence immutability — all submissions timestamped, versions preserved

### Integration Tests

- Diagnostic submit → pathway generated → learner can enroll
- Assessment attempt → score recorded → feedback displayed
- Assessment pass → project submission enabled
- Project submit → queued for grading
- Project grade → badge issued if both assessment and project passed
- Badge verification page → public verification link works

---

## Security & Privacy Considerations

1. **Assessment integrity**: Prevent answer tampering; timestamp all submissions
2. **Grading transparency**: Store grading metadata (graded by, rubric version used, feedback)
3. **Badge verification**: Public verification URL shows only badgeholder's permission-granted portfolio evidence
4. **Diagnostic privacy**: Diagnostic results stored per-user; accessible only to learner and course instructor
5. **Project evidence**: Submission privacy controlled by learner's portfolio sharing settings

---

## Performance Optimization

1. **Diagnostic caching**: Cache diagnostic questions (read-heavy, infrequent updates)
2. **Badge image generation**: Pre-generate badge images; CDN cache for 1 year
3. **Learner pathway queries**: Denormalize pathway data in `learner_pathways` to avoid repeated diagnostic → recommendation recalculation
4. **Analytics aggregation**: Pre-compute competency mastery rates hourly for analytics dashboards

---

## Rollout Plan

### Phase 1: Core Competency Model
- Implement competencies table and Studio UI
- Require instructors to define competencies for course publish

### Phase 2: Assessments & Retries
- Implement competency assessments with retry rules
- Pilot with 2-3 courses

### Phase 3: Projects & Grading
- Implement project submissions, rubrics, grading
- Integrate project grading into assessment flow

### Phase 4: Badges & Verification
- Issue competency badges on mastery
- Create public verification pages
- Add share capabilities

### Phase 5: Diagnostics & Pathways
- Implement diagnostic assessments
- Generate personalized learning pathways
- Show diagnostics at enrollment

### Phase 6: Analytics
- Build instructor competency analytics
- Export capabilities
- Learner skill profile export

