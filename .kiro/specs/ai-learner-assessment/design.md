# Design Document — AI Learner Assessment

## Overview

This feature introduces a three-assessment gate (CAT 1, CAT 2, Final Exam) between course completion and certificate issuance on the Arcane platform. It adds an AI service layer (OpenAI by default) for question generation, short-answer grading, and essay grading, and gives instructors a dashboard to manage question banks and review AI-flagged essays. The certificate logic is updated so that lecture completion alone no longer triggers certificate issuance.

---

## Architecture

### Layer Diagram

```
Browser (React / TanStack Router)
  ├── Student Learn Player   src/routes/learn/$courseId.tsx
  │     └── AssessmentPanel component
  ├── Instructor Studio      src/routes/instructor/$courseId.tsx
  │     └── AssessmentsTab component
  └── Admin                  src/routes/admin.tsx
        └── PassMarkConfig widget

TanStack Start Server Functions  (server-only, no client bundle)
  ├── src/lib/assessment.functions.ts   — all assessment mutations & queries
  ├── src/lib/certificates.functions.ts — updated issueCertificateIfComplete
  └── src/lib/ai-service.ts             — AI provider abstraction

Supabase (PostgreSQL + RLS)
  ├── assessments
  ├── assessment_questions
  ├── assessment_attempts
  ├── assessment_responses
  ├── grade_overrides
  └── platform_config
```

### Key Design Decisions

1. **Server-only AI calls** — `src/lib/ai-service.ts` is imported only from server functions. The `OPENAI_API_KEY` never reaches the client bundle. This mirrors how `src/lib/mpesa.server.ts` is structured.
2. **Provider abstraction** — An `AIProvider` interface with three methods (`generateQuestions`, `gradeShortAnswer`, `gradeEssay`) is defined. `OpenAIProvider` is the default concrete implementation. Swapping to another provider requires only a new class and a one-line change in the factory.
3. **Server functions over API routes** — All mutations and queries use `createServerFn` from `@tanstack/react-start` and the `requireSupabaseAuth` middleware, consistent with the rest of the codebase (`certificates.functions.ts`, `checkout.functions.ts`).
4. **Weighted score computed in SQL** — A Postgres function `compute_weighted_score(p_student_id, p_course_id)` returns the weighted score. This keeps score logic atomic, consistent, and testable via migration.
5. **Certificate gate replaces lecture-completion gate** — `issueCertificateIfComplete` is updated to call `compute_weighted_score` via Supabase RPC and check all three assessments have a released attempt before inserting a certificate row.
6. **Essay review via notifications** — When an attempt moves to `pending_review`, a row is inserted into the existing `notifications` table (type `essay_review_required`) targeting the course instructor, reusing the existing bell component.

---

## Database Schema

### New Tables

#### `assessments`
```sql
CREATE TABLE assessments (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id     uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  type          text NOT NULL CHECK (type IN ('CAT_1','CAT_2','FINAL_EXAM')),
  title         text NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (course_id, type)
);
```
One row per course per type. Created automatically when a course is published via a Postgres trigger on the `courses` table.

#### `assessment_questions`
```sql
CREATE TABLE assessment_questions (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id  uuid NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
  type           text NOT NULL CHECK (type IN ('MCQ','SHORT_ANSWER','ESSAY')),
  stem           text NOT NULL,
  options        jsonb,          -- [{id, text, is_correct}] for MCQ only
  model_answer   text,
  rubric         text,
  source_ref     text,           -- lecture/section title the AI derived it from
  status         text NOT NULL DEFAULT 'pending_review'
                   CHECK (status IN ('pending_review','approved','rejected')),
  ai_generated   boolean NOT NULL DEFAULT false,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);
```

#### `assessment_attempts`
```sql
CREATE TABLE assessment_attempts (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id     uuid NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
  student_id        uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  state             text NOT NULL DEFAULT 'in_progress'
                      CHECK (state IN ('in_progress','submitted','graded',
                                       'pending_review','released')),
  score             numeric(5,2),    -- final released score 0-100
  preliminary_score numeric(5,2),   -- score excluding pending essays
  started_at        timestamptz NOT NULL DEFAULT now(),
  submitted_at      timestamptz,
  released_at       timestamptz,
  attempt_number    int NOT NULL DEFAULT 1,
  UNIQUE (assessment_id, student_id, attempt_number)
);
```

#### `assessment_responses`
```sql
CREATE TABLE assessment_responses (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id       uuid NOT NULL REFERENCES assessment_attempts(id) ON DELETE CASCADE,
  question_id      uuid NOT NULL REFERENCES assessment_questions(id) ON DELETE CASCADE,
  response_text    text,
  selected_option  text,            -- option id for MCQ
  ai_score         numeric(5,2),
  ai_feedback      text,
  needs_review     boolean NOT NULL DEFAULT false,
  final_score      numeric(5,2),    -- set after instructor review or ai_score if no review needed
  released         boolean NOT NULL DEFAULT false,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (attempt_id, question_id)
);
```

#### `grade_overrides`
```sql
CREATE TABLE grade_overrides (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  response_id    uuid NOT NULL REFERENCES assessment_responses(id) ON DELETE CASCADE,
  instructor_id  uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  original_score numeric(5,2) NOT NULL,
  override_score numeric(5,2) NOT NULL,
  created_at     timestamptz NOT NULL DEFAULT now()
);
```

#### `platform_config`
```sql
CREATE TABLE platform_config (
  key    text PRIMARY KEY,
  value  text NOT NULL
);
-- Seed:
INSERT INTO platform_config (key, value) VALUES ('pass_mark', '60')
  ON CONFLICT DO NOTHING;
```

### New Postgres Functions

#### `compute_weighted_score(p_student_id uuid, p_course_id uuid) RETURNS numeric`
Aggregates the best released score per assessment type for the given student/course and returns:
`(cat1_best * 0.15) + (cat2_best * 0.15) + (final_best * 0.70)`
Returns `NULL` if any of the three assessment types has no released attempt.

#### `get_lecture_completion_pct(p_student_id uuid, p_course_id uuid) RETURNS numeric`
Returns the percentage (0–100) of lectures in the course marked complete by the student. Used server-side to determine assessment unlock eligibility.

#### `reset_student_attempts(p_assessment_id uuid, p_student_id uuid) RETURNS void`
Deletes all attempt rows for the student on that assessment, callable only by the course instructor via an RLS check on the `assessments.course_id → courses.instructor_id` chain.

### RLS Policies (summary)

| Table | Student reads | Student writes | Instructor reads | Instructor writes | Admin |
|---|---|---|---|---|---|
| assessments | enrolled course | — | own courses | — | all |
| assessment_questions | enrolled, `approved` only | — | own course, all statuses | own course | all |
| assessment_attempts | own rows | own rows (insert/update in_progress) | own course students | — | all |
| assessment_responses | own rows | own rows | own course students | — | all |
| grade_overrides | own responses | — | own course | insert | all |
| platform_config | `pass_mark` key only | — | read | — | all (write) |

---

## AI Service Module

### Interface — `src/lib/ai-service.ts`

```typescript
export interface QuestionGenerationInput {
  contentChunks: Array<{ sectionTitle: string; lectureContent: string }>;
  assessmentType: 'CAT_1' | 'CAT_2' | 'FINAL_EXAM';
}

export interface GeneratedQuestion {
  type: 'MCQ' | 'SHORT_ANSWER' | 'ESSAY';
  stem: string;
  options?: Array<{ id: string; text: string; is_correct: boolean }>;
  modelAnswer?: string;
  rubric: string;
  sourceRef: string;
}

export interface ShortAnswerGradingInput {
  response: string;
  modelAnswer: string;
  rubric: string;
}

export interface ShortAnswerGradingResult {
  score: number;      // 0-100 integer
  feedback: string;
}

export interface EssayGradingInput {
  response: string;
  rubric: string;
}

export interface EssayGradingResult {
  score: number;      // 0-100 integer
  feedback: string;
  needs_review: boolean;
}

export interface AIProvider {
  generateQuestions(input: QuestionGenerationInput): Promise<GeneratedQuestion[]>;
  gradeShortAnswer(input: ShortAnswerGradingInput): Promise<ShortAnswerGradingResult>;
  gradeEssay(input: EssayGradingInput): Promise<EssayGradingResult>;
}

export class AIServiceError extends Error {
  constructor(
    public provider: string,
    public operation: string,
    public originalMessage: string
  ) {
    super(`[${provider}:${operation}] ${originalMessage}`);
    this.name = 'AIServiceError';
  }
}

// Factory — returns the configured provider; server-side only
export function getAIProvider(): AIProvider { ... }
```

### OpenAI Adapter — `src/lib/ai-providers/openai.ts`

- Uses `openai` npm package (server-only import)
- Reads `process.env.OPENAI_API_KEY`
- `generateQuestions`: calls `chat.completions.create` with a structured JSON prompt asking for MCQ, SHORT_ANSWER, and ESSAY items; parses response with Zod schema validation
- `gradeShortAnswer`: prompt includes the model answer and rubric; instructs the model to return `{ score, feedback }` JSON; score is clamped to [0, 100]
- `gradeEssay`: prompt includes the rubric; instructs the model to return `{ score, feedback, needs_review }` JSON; `needs_review` defaults to `true` for any score below 70
- All methods catch non-retryable errors (4xx, invalid JSON) and throw `AIServiceError`; transient errors (5xx, timeout) bubble up for the caller to surface

---

## Server Functions — `src/lib/assessment.functions.ts`

All functions use `createServerFn` + `requireSupabaseAuth` middleware matching the existing pattern in `certificates.functions.ts`.

| Function | Method | Actor | Description |
|---|---|---|---|
| `getAssessmentsForCourse` | GET | Student / Instructor | Returns three assessments with unlock state and student attempt summary |
| `getQuestionBank` | GET | Instructor | All questions for an assessment grouped by status |
| `generateQuestionsWithAI` | POST | Instructor | Calls AI service, stores results as `pending_review` |
| `approveQuestion` | POST | Instructor | Sets question status → `approved` |
| `rejectQuestion` | POST | Instructor | Sets question status → `rejected` |
| `saveQuestion` | POST | Instructor | Upsert a question (manual add or edit) |
| `deleteQuestion` | POST | Instructor | Deletes question; guards minimum one approved question |
| `startAttempt` | POST | Student | Creates attempt row, returns randomised approved question list |
| `submitAttempt` | POST | Student | Saves responses, runs grading pipeline |
| `getAttemptResult` | GET | Student | Returns attempt state + per-question feedback (respects release flag) |
| `reviewEssayResponse` | POST | Instructor | Approves or overrides AI essay score; records to `grade_overrides` |
| `resetStudentAttempts` | POST | Instructor | Resets attempt count for a student on one assessment |
| `getPassMark` | GET | Any | Reads `pass_mark` from `platform_config` |
| `updatePassMark` | POST | Admin | Validates 0–100 range, updates `platform_config` |

### Grading Pipeline (inside `submitAttempt`)

```
For each response in the attempt:
  if MCQ         → compare selected_option to correct option id
                   score = (correct ? 100 : 0), released = true, final_score = score
  if SHORT_ANSWER → aiProvider.gradeShortAnswer()
                   store ai_score, ai_feedback
                   final_score = ai_score, released = true
  if ESSAY       → aiProvider.gradeEssay()
                   store ai_score, ai_feedback, needs_review
                   if needs_review = true  → released = false
                   if needs_review = false → released = true, final_score = ai_score

After all responses processed:
  preliminary_score = avg(final_score) WHERE released = true
  if no unreleased responses exist:
    attempt.state   = 'released'
    attempt.score   = preliminary_score
    → compute_weighted_score RPC
    → if weighted_score >= pass_mark → issueCertificateIfComplete()
  else:
    attempt.state   = 'pending_review'
    → insert notification (type='essay_review_required') for course instructor
```

---

## Updated Certificate Function

`issueCertificateIfComplete` in `src/lib/certificates.functions.ts` replaces the lecture-completion check with:

1. Check enrollment (unchanged)
2. Call `compute_weighted_score(userId, courseId)` via `supabase.rpc()`
3. Verify all three assessment types have at least one attempt in `released` state for this student/course
4. Read `pass_mark` from `platform_config`
5. Compare weighted score ≥ pass_mark
6. Only then insert the certificate row (existing collision-safe `makeCode()` logic unchanged)

The old lecture-progress counting block is removed entirely.

---

## UI Components

### Student Side — `src/routes/learn/$courseId.tsx`

A new `<AssessmentPanel>` component is added to the learn player (sidebar tab or collapsible section):

| Component | Purpose |
|---|---|
| `AssessmentStatusCard` | One per assessment type; badge showing `Locked / Available / In Progress / Awaiting Review / Passed / Failed`; unlock progress bar; cooldown countdown |
| `AssessmentTaker` | Full-screen dialog; renders MCQ radio groups, SHORT_ANSWER textareas, ESSAY rich textareas; submit with confirmation |
| `AttemptResultView` | Score breakdown, per-question AI feedback, certificate eligibility banner |

### Instructor Side — `src/routes/instructor/$courseId.tsx`

A new **Assessments** tab added alongside the existing curriculum and analytics tabs:

| Component | Purpose |
|---|---|
| `AssessmentsDashboard` | CAT 1, CAT 2, Final Exam cards with question count, pending review badge, link to editor |
| `QuestionBankEditor` | Questions grouped by status; approve/reject/edit/delete actions; "Generate with AI" and "Add manually" buttons |
| `QuestionForm` | Inline form; type selector drives visible fields (options for MCQ; rubric for all; model answer for SHORT_ANSWER/ESSAY) |
| `EssayReviewPanel` | Lists pending essays with student display name, submission time, AI score, AI feedback; approve/override controls |

### Admin Side — `src/routes/admin.tsx`

A small **PassMarkConfig** section appended to the admin panel:
- Displays current pass mark fetched via `getPassMark`
- Number input + save button; client-side 0–100 validation before calling `updatePassMark`

---

## Property-Based Testing

The following correctness properties will be validated with PBT (Vitest + fast-check):

| # | Property | Where |
|---|---|---|
| P1 | `compute_weighted_score` output is always in [0, 100] for any valid inputs | SQL function unit test |
| P2 | Weighted score formula: `(cat1 * 0.15) + (cat2 * 0.15) + (final * 0.70)` holds for arbitrary integer scores | Pure TS helper test |
| P3 | `gradeShortAnswer` returns a score in [0, 100] for any non-empty string inputs | AI service unit test with mocked provider |
| P4 | Re-submitting identical `gradeShortAnswer` input returns a score within ±10 of the first result (grading stability) | AI service stability test |
| P5 | `issueCertificateIfComplete` never inserts a duplicate certificate for the same (user, course) pair | Server function test with in-memory Supabase mock |
| P6 | `startAttempt` always returns questions in a different order than insertion order for banks with ≥ 3 questions (shuffle sanity) | Server function test |

---

## File Structure (new files only)

```
src/
  lib/
    ai-service.ts                      AI provider interface + factory
    ai-providers/
      openai.ts                        OpenAI concrete adapter
    assessment.functions.ts            All assessment server functions
  components/
    assessment/
      assessment-panel.tsx             Student-facing assessment overview
      assessment-status-card.tsx       Per-assessment status card
      assessment-taker.tsx             In-progress attempt UI
      attempt-result-view.tsx          Score + feedback view
      question-bank-editor.tsx         Instructor question management
      question-form.tsx                Create / edit question inline form
      essay-review-panel.tsx           Instructor essay review UI

supabase/
  migrations/
    20260705000001_assessment_tables.sql      New tables
    20260705000002_assessment_rls.sql         RLS policies
    20260705000003_assessment_functions.sql   Postgres functions + trigger
    20260705000004_update_certificate_gate.sql  (documents the app-layer change)
```

Modified files:
- `src/routes/learn/$courseId.tsx` — add `<AssessmentPanel>`
- `src/routes/instructor/$courseId.tsx` — add Assessments tab
- `src/routes/admin.tsx` — add PassMarkConfig section
- `src/lib/certificates.functions.ts` — replace lecture-completion gate with weighted-score gate
- `src/integrations/supabase/types.ts` — add new table types

---

## Error Handling

- AI errors surface as `AIServiceError` with provider + operation context; server functions catch and return user-friendly messages without leaking API details
- If AI generation fails mid-batch, any questions already stored as `pending_review` are retained; previously `approved` questions are never touched
- If grading partially fails on one question, the attempt is flagged `grading_error` in `preliminary_score` and the instructor is notified; the student sees a pending state
- Duplicate certificate issuance is idempotent — existing code is returned without a second insert

---

## Security Considerations

- `OPENAI_API_KEY` is read only from `process.env` inside server functions; it is never referenced in any client-imported module
- All server functions use `requireSupabaseAuth` middleware
- RLS on `assessment_questions` ensures students only see `approved` questions; status filtering is enforced at the database level, not just in application code
- `grade_overrides` is insert-only for instructors; deletes require admin role
- `platform_config` writes are guarded by `has_role('admin', auth.uid())` in the RLS policy
