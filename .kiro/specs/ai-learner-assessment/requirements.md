# Requirements Document

## Introduction

The **AI Learner Assessment** feature replaces the current lecture-completion-only certificate trigger on the Arcane e-learning platform with a structured, AI-assisted assessment gate. Each course gains three assessments: two Continuous Assessment Tests (CAT 1 and CAT 2) and one Final Exam. Students must achieve a weighted passing score across all three assessments before a certificate is issued. Instructors author question banks with AI assistance, review AI-generated questions, and act as a final check on AI-graded essay submissions. An AI provider service layer (defaulting to OpenAI) handles question generation, short-answer grading, and essay grading; the abstraction allows swapping providers without touching business logic.

This feature touches the student learning player (`src/routes/learn/$courseId.tsx`), the instructor studio (`src/routes/instructor/$courseId.tsx`), the certificate logic (`src/lib/certificates.functions.ts`), and requires new database tables, RLS policies, server functions, and an AI service module.

---

## Glossary

- **Assessment**: A timed or untimed set of questions tied to a course. One of three types per course: CAT_1, CAT_2, or FINAL_EXAM.
- **Assessment_Engine**: The platform sub-system responsible for presenting assessments, collecting responses, and computing scores.
- **AI_Service**: The abstracted AI provider layer (default: OpenAI) responsible for question generation, short-answer grading, and essay grading.
- **Question_Bank**: The set of instructor-approved questions associated with an assessment.
- **Question**: A single test item. One of three types: MCQ, SHORT_ANSWER, or ESSAY.
- **MCQ**: Multiple-choice question; exactly one correct option; graded deterministically without AI.
- **SHORT_ANSWER**: Free-text question; graded immediately by AI against a model answer and rubric; score released directly to the student.
- **ESSAY**: Extended-response question; graded by AI against a rubric; score is held for instructor review before release.
- **Rubric**: A scoring guide associated with a SHORT_ANSWER or ESSAY question, used by the AI_Service to evaluate responses.
- **Attempt**: A single instance of a student starting and submitting an assessment.
- **Attempt_State**: The lifecycle state of an Attempt: `in_progress`, `submitted`, `graded`, `pending_review`, `released`.
- **Weighted_Score**: The final numeric score computed as (CAT_1_score × 15%) + (CAT_2_score × 15%) + (FINAL_EXAM_score × 70%).
- **Pass_Mark**: The minimum Weighted_Score required to receive a certificate, expressed as an integer percentage (0–100). Platform-wide default is 60.
- **Cooldown_Period**: The mandatory waiting time between assessment attempts after the first attempt; fixed at 7 days.
- **Instructor**: A user with the `instructor` role who owns the course and manages its Question_Bank and essay reviews.
- **Student**: A user with the `student` role who is enrolled in the course.
- **Platform_Config**: A platform-wide settings store holding values such as Pass_Mark.
- **Certificate_Gate**: The composite check that determines whether a certificate can be issued: enrollment confirmed, all three assessments passed at or above the Weighted_Score threshold.

---

## Requirements

---

### Requirement 1: Assessment Structure per Course

**User Story:** As a student, I want a clear set of assessments that unlock as I progress through the course, so that I know exactly what I need to do to earn my certificate.

#### Acceptance Criteria

1. THE Assessment_Engine SHALL associate exactly three assessments with each published course: CAT_1, CAT_2, and FINAL_EXAM.
2. WHEN a student's lecture completion percentage reaches 33%, THE Assessment_Engine SHALL unlock CAT_1 for that student.
3. WHEN a student's lecture completion percentage reaches 66%, THE Assessment_Engine SHALL unlock CAT_2 for that student.
4. WHEN a student's lecture completion percentage reaches 100%, THE Assessment_Engine SHALL unlock FINAL_EXAM for that student.
5. WHILE an assessment is locked for a student, THE Assessment_Engine SHALL display the assessment as locked and show the lecture-completion threshold required to unlock it.
6. WHILE an assessment is unlocked for a student, THE Assessment_Engine SHALL allow the student to begin an Attempt if the student has not exhausted the maximum attempts and any Cooldown_Period has elapsed.

---

### Requirement 2: Question Bank Management

**User Story:** As an instructor, I want to build a question bank for each assessment using AI-generated suggestions and my own manual additions, so that I have control over the quality and relevance of assessment content.

#### Acceptance Criteria

1. WHEN an instructor requests question generation for an assessment, THE AI_Service SHALL produce a set of questions based on the course section titles and lecture descriptions or transcripts associated with the assessment's lecture range.
2. WHEN the AI_Service produces questions, THE Assessment_Engine SHALL store them with a status of `pending_review` and present them to the instructor for approval.
3. WHEN an instructor approves a question, THE Assessment_Engine SHALL update the question's status to `approved` and add it to the active Question_Bank.
4. WHEN an instructor rejects a question, THE Assessment_Engine SHALL update the question's status to `rejected` and exclude it from the active Question_Bank.
5. WHEN an instructor edits a question's text, options, model answer, or rubric, THE Assessment_Engine SHALL save the updated question and retain its current approval status.
6. WHEN an instructor adds a question manually, THE Assessment_Engine SHALL store the question with a status of `approved` without requiring AI generation.
7. WHEN an instructor deletes a question, THE Assessment_Engine SHALL remove the question from the Question_Bank; IF the question is the only approved question in the bank, THEN THE Assessment_Engine SHALL prevent deletion and return an error indicating a minimum of one approved question is required.
8. THE Assessment_Engine SHALL support questions of type MCQ, SHORT_ANSWER, and ESSAY within the same Question_Bank.
9. THE Assessment_Engine SHALL require each MCQ to have between 2 and 6 answer options, exactly one of which is marked as correct.
10. THE Assessment_Engine SHALL require each SHORT_ANSWER and ESSAY question to have a non-empty rubric.

---

### Requirement 3: Question Generation by AI

**User Story:** As an instructor, I want the platform to generate relevant questions from my course content automatically, so that I spend less time writing questions from scratch.

#### Acceptance Criteria

1. WHEN an instructor triggers AI question generation for an assessment, THE AI_Service SHALL accept the course section titles, lecture titles, and lecture descriptions or transcripts as input and return a structured list of questions with answer keys and rubrics.
2. THE AI_Service SHALL return at least one question of each supported type (MCQ, SHORT_ANSWER, ESSAY) per generation request, unless the source content is insufficient, in which case THE AI_Service SHALL return as many question types as the content supports.
3. WHEN the AI_Service returns generated questions, THE Assessment_Engine SHALL store each question with the fields: type, stem, options (MCQ only), model answer, rubric, and a source reference to the lecture or section it was derived from.
4. IF the AI_Service returns an error or times out, THEN THE Assessment_Engine SHALL surface a descriptive error message to the instructor and preserve any previously approved questions unchanged.
5. THE Assessment_Engine SHALL allow an instructor to re-trigger AI question generation for the same assessment without removing previously approved questions.

---

### Requirement 4: Student Assessment Attempt

**User Story:** As a student, I want to take an unlocked assessment and receive my score, so that I can track my understanding and progress toward a certificate.

#### Acceptance Criteria

1. WHEN a student begins an Attempt, THE Assessment_Engine SHALL create an Attempt record with state `in_progress`, record the start timestamp, and present all approved questions from the assessment's Question_Bank in a randomised order.
2. WHILE an Attempt is in state `in_progress`, THE Assessment_Engine SHALL accept the student's responses and allow the student to change responses before submission.
3. WHEN a student submits an Attempt, THE Assessment_Engine SHALL transition the Attempt to state `submitted` and immediately grade all MCQ and SHORT_ANSWER responses.
4. WHEN grading MCQ responses, THE Assessment_Engine SHALL compare each response to the correct option and assign a score of 1 for correct and 0 for incorrect without invoking the AI_Service.
5. WHEN grading SHORT_ANSWER responses, THE AI_Service SHALL compare each response to the model answer and rubric and return a score (0–100) and a feedback string.
6. WHEN grading ESSAY responses, THE AI_Service SHALL score each response against the rubric, return a score (0–100), a detailed feedback string, and a `needs_review` boolean.
7. WHEN all MCQ and SHORT_ANSWER responses are graded, THE Assessment_Engine SHALL compute a preliminary score for the Attempt, excluding unreviewed ESSAY scores, and display the preliminary score and AI feedback to the student.
8. WHEN an ESSAY response's `needs_review` flag is true, THE Assessment_Engine SHALL transition the Attempt to state `pending_review` and withhold the essay score from the student until an instructor releases it.
9. WHEN an ESSAY response's `needs_review` flag is false, THE Assessment_Engine SHALL include the essay score in the Attempt score without requiring instructor review.
10. WHEN all responses in an Attempt are graded and no essay is pending review, THE Assessment_Engine SHALL set the Attempt state to `released` and display the final score and per-question feedback to the student.

---

### Requirement 5: Retake and Attempt Limits

**User Story:** As a student, I want clear rules about retaking assessments so that I understand my options after a failed attempt.

#### Acceptance Criteria

1. THE Assessment_Engine SHALL allow each student a maximum of 3 Attempts per assessment.
2. WHEN a student submits the first Attempt for an assessment, THE Assessment_Engine SHALL permit an immediate second Attempt without enforcing a Cooldown_Period.
3. WHEN a student submits any Attempt after the first for an assessment, THE Assessment_Engine SHALL enforce a 7-day Cooldown_Period before the student may begin another Attempt, measured from the submission timestamp of the preceding Attempt.
4. WHEN a student has exhausted 3 Attempts for an assessment without achieving the Pass_Mark, THE Assessment_Engine SHALL lock the assessment for that student and display a message indicating the assessment is locked and that the instructor must reset it.
5. WHILE an assessment is locked for a student due to exhausted attempts, THE Assessment_Engine SHALL prevent the student from beginning a new Attempt.
6. WHEN an instructor resets a student's attempt count for an assessment, THE Assessment_Engine SHALL set the student's attempt count to 0, remove the lock, and allow the student to begin a fresh first Attempt without a Cooldown_Period.

---

### Requirement 6: Instructor Essay Review and Grade Override

**User Story:** As an instructor, I want to review AI-graded essays and override scores when needed, so that final grades accurately reflect student work.

#### Acceptance Criteria

1. WHEN an Attempt is in state `pending_review`, THE Assessment_Engine SHALL notify the course instructor that an essay response requires review.
2. WHEN an instructor views a pending essay response, THE Assessment_Engine SHALL display the student's response, the rubric, the AI-assigned score, and the AI-generated feedback.
3. WHEN an instructor approves an AI essay score without modification, THE Assessment_Engine SHALL record the instructor's approval, release the score to the student, and recalculate the Attempt's final score.
4. WHEN an instructor overrides an AI essay score, THE Assessment_Engine SHALL accept an integer score between 0 and 100, record the override, release the updated score to the student, and recalculate the Attempt's final score.
5. WHEN an instructor overrides any AI grade (MCQ, SHORT_ANSWER, or ESSAY), THE Assessment_Engine SHALL record the overriding instructor's user ID, the original AI score, the override score, and the override timestamp for audit purposes.
6. WHEN all pending essay responses in an Attempt have been reviewed and released, THE Assessment_Engine SHALL transition the Attempt to state `released` and display the final score and feedback to the student.

---

### Requirement 7: Certificate Gate

**User Story:** As a student, I want to receive a certificate only after demonstrating mastery through all three assessments, so that the certificate is a meaningful credential.

#### Acceptance Criteria

1. THE Assessment_Engine SHALL compute a Weighted_Score for each student as: (best released CAT_1 score × 15%) + (best released CAT_2 score × 15%) + (best released FINAL_EXAM score × 70%).
2. WHEN a student's Weighted_Score is greater than or equal to the Pass_Mark, THE Assessment_Engine SHALL trigger certificate issuance by calling the updated `issueCertificateIfComplete` server function.
3. WHEN `issueCertificateIfComplete` is called, THE Assessment_Engine SHALL verify that: (a) the student is enrolled in the course, (b) all three assessments have at least one Attempt in state `released`, and (c) the student's Weighted_Score is greater than or equal to the Pass_Mark; IF any condition is not met, THEN THE Assessment_Engine SHALL return an error and not issue the certificate.
4. THE Assessment_Engine SHALL NOT issue a certificate based on lecture completion alone.
5. WHEN a certificate is already issued for a student and course, THE Assessment_Engine SHALL return the existing certificate code without issuing a duplicate.

---

### Requirement 8: Platform-Wide Pass Mark Configuration

**User Story:** As a platform administrator, I want to configure a single pass mark that applies to all courses, so that I can adjust the certification standard without touching individual course settings.

#### Acceptance Criteria

1. THE Platform_Config SHALL store a pass mark value as an integer between 0 and 100, with a default of 60.
2. WHEN the pass mark is updated by an admin, THE Platform_Config SHALL validate that the new value is an integer between 0 and 100; IF the value is outside this range, THEN THE Platform_Config SHALL reject the update and return a validation error.
3. WHEN computing whether a student qualifies for a certificate, THE Assessment_Engine SHALL read the current pass mark from Platform_Config at the time of the check.
4. WHERE the platform does not have a configured pass mark, THE Assessment_Engine SHALL use 60 as the default pass mark.

---

### Requirement 9: AI Service Abstraction

**User Story:** As a developer, I want the AI provider to be behind an interface so that I can swap providers without rewriting business logic.

#### Acceptance Criteria

1. THE AI_Service SHALL expose a `generateQuestions(input: QuestionGenerationInput): Promise<GeneratedQuestion[]>` interface that any concrete AI provider adapter must implement.
2. THE AI_Service SHALL expose a `gradeShortAnswer(input: ShortAnswerGradingInput): Promise<ShortAnswerGradingResult>` interface that any concrete AI provider adapter must implement.
3. THE AI_Service SHALL expose a `gradeEssay(input: EssayGradingInput): Promise<EssayGradingResult>` interface that any concrete AI provider adapter must implement.
4. WHEN the concrete AI provider is OpenAI, THE AI_Service SHALL read the API key from the server-side environment variable `OPENAI_API_KEY` and SHALL NOT expose the key to client-side code.
5. IF the configured AI provider returns a non-retryable error, THEN THE AI_Service SHALL throw a typed `AIServiceError` that includes the provider name, operation name, and original error message.
6. THE AI_Service SHALL be importable only from server-side modules; client bundles SHALL NOT include the AI_Service implementation.

---

### Requirement 10: Grading Round-Trip Consistency

**User Story:** As a developer, I want AI grading inputs and outputs to be consistently structured so that scores are reliable and auditable.

#### Acceptance Criteria

1. THE AI_Service `gradeShortAnswer` function SHALL accept a `response` string, a `modelAnswer` string, and a `rubric` string, and SHALL return a `score` integer (0–100) and a `feedback` string.
2. THE AI_Service `gradeEssay` function SHALL accept a `response` string and a `rubric` string, and SHALL return a `score` integer (0–100), a `feedback` string, and a `needs_review` boolean.
3. THE AI_Service `generateQuestions` function SHALL accept a `contentChunks` array of objects each containing a `sectionTitle` string and a `lectureContent` string, and SHALL return an array of objects each containing `type`, `stem`, `options` (MCQ only), `modelAnswer`, and `rubric` fields.
4. FOR ALL valid grading inputs, re-submitting the same input to `gradeShortAnswer` SHALL return a `score` value within ±10 of the initial result, demonstrating reasonable grading stability across calls.
5. FOR ALL AI_Service responses, the returned `score` SHALL be an integer in the range [0, 100].

---

### Requirement 11: Student Assessment Progress Visibility

**User Story:** As a student, I want to see the status of all three assessments from my course player, so that I always know where I stand.

#### Acceptance Criteria

1. THE Assessment_Engine SHALL display, for each of the three assessments, one of the following statuses to the student: `Locked`, `Available`, `In Progress`, `Awaiting Review`, `Passed`, or `Failed`.
2. WHEN a student has a released Attempt with a score at or above the Pass_Mark for an assessment, THE Assessment_Engine SHALL display that assessment's status as `Passed`.
3. WHEN a student has exhausted all Attempts for an assessment without a passing score, THE Assessment_Engine SHALL display that assessment's status as `Failed (Locked)`.
4. WHEN the student's Weighted_Score meets or exceeds the Pass_Mark and all three assessments are in state `Passed`, THE Assessment_Engine SHALL display a certificate eligibility indicator to the student in the course player.
5. WHEN a Cooldown_Period is active for an assessment, THE Assessment_Engine SHALL display the date and time at which the next Attempt becomes available.

---

### Requirement 12: Instructor Assessment Dashboard

**User Story:** As an instructor, I want a dedicated assessment section in my course studio so that I can manage question banks and review pending essays from one place.

#### Acceptance Criteria

1. THE Assessment_Engine SHALL add an "Assessments" tab or section to the instructor course studio at `src/routes/instructor/$courseId.tsx`.
2. WHEN an instructor views the Assessments section, THE Assessment_Engine SHALL display the three assessments (CAT_1, CAT_2, FINAL_EXAM) with their question counts, pending essay review counts, and a link to the Question_Bank editor for each.
3. WHEN an instructor views the Question_Bank editor for an assessment, THE Assessment_Engine SHALL display all questions grouped by approval status (`pending_review`, `approved`, `rejected`) with action buttons for approve, reject, edit, and delete.
4. WHEN an instructor views the pending essay reviews panel, THE Assessment_Engine SHALL list each pending essay response with the student name (display name from profiles), submission timestamp, assessment type, and an action to review.
5. WHEN there are no pending essay reviews, THE Assessment_Engine SHALL display a message indicating no reviews are outstanding.

