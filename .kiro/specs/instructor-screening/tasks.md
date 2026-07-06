# Tasks -- AI Instructor Screening

## Overview
Add an AI-powered screening step between the onboarding form submission and admin waitlist.
Applicants take a short AI-generated test based on their stated expertise.
Pass -> status: pending (admin waitlist). Fail -> status: rejected (instant notification + reason).

## Implementation Plan

- [x] 1. Database Migration
  - [x] 1.1 Create migration -- add `pending_screening` to `instructor_applications` status enum;
        create `screening_attempts` table (id, application_id, applicant_id, score, state, started_at, submitted_at);
        create `screening_responses` table (id, attempt_id, question_stem, question_type, rubric, model_answer, response_text, ai_score, ai_feedback);
        add `screening_pass_threshold` key to `platform_config` (default 70);
        add `screening_question_count` key to `platform_config` (default 5)

- [x] 2. Screening Server Functions
  - [x] 2.1 Create `src/lib/screening.functions.ts`
  - [x] 2.2 Implement `startScreening(applicationId)` -- verifies applicant owns the application and
        it is in `pending_screening` state; generates N questions from AI using applicant's expertise
        field as content seed; stores questions in screening_attempts + screening_responses (no answer yet);
        returns questions in shuffled order
  - [x] 2.3 Implement `submitScreening(attemptId, responses[])` -- grades each response via AI
        (SHORT_ANSWER for most, MCQ where applicable); computes average score; if score >= threshold
        updates application to `pending` and inserts admin notification; if score < threshold updates
        application to `rejected` with AI-generated rejection reason and inserts applicant notification;
        returns { passed, score, feedback }
  - [x] 2.4 Implement `getScreeningResult(attemptId)` -- returns attempt state, score, and per-question
        feedback for the result page
  - [x] 2.5 Implement `getScreeningPassThreshold` -- reads from platform_config, default 70
  - [x] 2.6 Implement `updateScreeningPassThreshold` -- admin only, validates 0-100

- [x] 3. Update Supabase Types
  - [x] 3.1 Add `screening_attempts` and `screening_responses` table types to
        `src/integrations/supabase/types.ts`; update `instructor_applications` status union to include
        `pending_screening`

- [x] 4. Update Onboarding Flow
  - [x] 4.1 Update `src/routes/onboarding.tsx` -- change `handleApplicationSubmit` to insert with
        `status = pending_screening` and navigate to `/screening?applicationId=<id>` instead of `/apply`

- [x] 5. Screening Route
  - [x] 5.1 Create `src/routes/screening.tsx` -- full-page screening experience;
        on mount calls `startScreening`; renders questions (SHORT_ANSWER textareas, MCQ radio groups);
        submit button with confirmation dialog; calls `submitScreening` on confirm;
        on result shows pass/fail state with score and per-question feedback;
        pass state has "Continue to application status" link to `/apply`;
        fail state shows rejection reason and cooldown info

- [x] 6. Update Apply Page
  - [x] 6.1 Update `src/routes/apply.tsx` -- add `ScreeningState` component rendered when
        `applicationStatus.status === 'pending_screening'`; shows a card prompting the user to
        complete their screening test with a link to `/screening?applicationId=<id>`

- [x] 7. Admin Config
  - [x] 7.1 Add screening threshold config to `src/routes/admin.tsx` -- alongside the existing
        PassMarkConfig section; fetch via `getScreeningPassThreshold`; render number input + save button;
        calls `updateScreeningPassThreshold`
