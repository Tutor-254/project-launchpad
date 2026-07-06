# Tasks — AI Learner Assessment

## Implementation Plan

- [x] 1. Database Migrations
  - [x] 1.1 Create migration `20260705000001_assessment_tables.sql`
  - [x] 1.2 Create migration `20260705000002_assessment_rls.sql`
  - [x] 1.3 Create migration `20260705000003_assessment_functions.sql`
  - [x] 1.4 Create migration `20260705000004_update_certificate_gate.sql`

- [x] 2. AI Service Module
  - [x] 2.1 Create `src/lib/ai-service.ts`
  - [x] 2.2 Create `src/lib/ai-providers/openai.ts`

- [x] 3. Assessment Server Functions
  - [x] 3.1 Created `src/lib/assessment.functions.ts` with all server functions using `createServerFn` + `requireSupabaseAuth` middleware
  - [x] 3.2 Implemented `getAssessmentsForCourse`
  - [x] 3.3 Implemented `getQuestionBank`
  - [x] 3.4 Implemented `generateQuestionsWithAI`
  - [x] 3.5 Implemented `approveQuestion` and `rejectQuestion`
  - [x] 3.6 Implemented `saveQuestion`
  - [x] 3.7 Implemented `deleteQuestion`
  - [x] 3.8 Implemented `startAttempt`
  - [x] 3.9 Implemented `submitAttempt`
  - [x] 3.10 Implemented `getAttemptResult`
  - [x] 3.11 Implemented `reviewEssayResponse`
  - [x] 3.12 Implemented `resetStudentAttempts`
  - [x] 3.13 Implemented `getPassMark`
  - [x] 3.14 Implemented `updatePassMark`

- [x] 4. Updated Certificate Function
  - [x] 4.1 Updated `src/lib/certificates.functions.ts` — replaced lecture-completion gate with weighted-score gate

- [x] 5. Update Supabase Types
  - [x] 5.1 Updated `src/integrations/supabase/types.ts` — added all six new table types plus new RPC functions

- [x] 6. Student UI Components
  - [x] 6.1 Created `src/components/assessment/assessment-status-card.tsx`
  - [x] 6.2 Created `src/components/assessment/assessment-taker.tsx`
  - [x] 6.3 Created `src/components/assessment/attempt-result-view.tsx`
  - [x] 6.4 Created `src/components/assessment/assessment-panel.tsx`

- [x] 7. Instructor UI Components
  - [x] 7.1 Created `src/components/assessment/assessments-dashboard.tsx`
  - [x] 7.2 Created `src/components/assessment/question-form.tsx`
  - [x] 7.3 Created `src/components/assessment/question-bank-editor.tsx`
  - [x] 7.4 Created `src/components/assessment/essay-review-panel.tsx`

- [x] 8. Admin PassMarkConfig Section
  - [x] 8.1 Added `PassMarkConfig` component and "Pass Mark" tab to `src/routes/admin.tsx`

- [x] 9. Route Integrations
  - [x] 9.1 Updated `src/routes/learn/$courseId.tsx` — added Assessments tab with `<AssessmentPanel>`
  - [x] 9.2 Updated `src/routes/instructor/$courseId.tsx` — added Assessments tab with `<AssessmentsDashboard>` and `<EssayReviewPanel>`
  - [x] 9.3 Updated `src/routes/admin.tsx` — integrated `PassMarkConfig` section

- [x] 10. Property-Based Tests
  - [x] 10.1 P1 — `compute_weighted_score` output is always in [0, 100]
  - [x] 10.2 P2 — weighted score formula holds for arbitrary integer scores
  - [x] 10.3 P3 — `gradeShortAnswer` returns score in [0, 100] for any non-empty inputs
  - [x] 10.4 P4 — identical `gradeShortAnswer` input returns score within ±10
  - [x] 10.5 P5 — `issueCertificateIfComplete` never inserts duplicate certificate
  - [x] 10.6 P6 — `startAttempt` shuffle produces valid permutations and different orderings
