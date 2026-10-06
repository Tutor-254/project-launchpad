# Tasks: Competency Framework and Mastery Learning

## Task List

### Phase 1: Core Competency Model & Database

- [x] 1. Database migrations — competencies and diagnostic assessments
  - [ ] 1.1 Create `competencies` table with columns: id, course_id, title, description, observable_behaviors, success_criteria, prerequisite_competencies, related_job_titles, order_index, created_at, updated_at
  - [ ] 1.2 Add unique partial index on `competencies (course_id, order_index)`
  - [ ] 1.3 Create `diagnostic_assessments` table with columns: id, course_id, name, description, prerequisite_competency_ids, pass_threshold, question_count, cooldown_days
  - [ ] 1.4 Create `diagnostic_questions` table with columns: id, diagnostic_id, question_text, question_type, options, correct_answer, points, order_index
  - [ ] 1.5 Create `diagnostic_attempts` table with columns: id, user_id, diagnostic_id, score, passed (generated), attempt_number, created_at
  - [ ] 1.6 Enable RLS on all three tables with appropriate policies:
    - [ ] 1.6a Competencies: authenticated SELECT all, instructors INSERT/UPDATE own course competencies
    - [ ] 1.6b Diagnostic assessments: authenticated SELECT all
    - [ ] 1.6c Diagnostic questions: authenticated SELECT all
    - [ ] 1.6d Diagnostic attempts: users SELECT/INSERT own, instructors SELECT their course diagnostics
  - [ ] 1.7 Create database indexes for query performance on foreign keys

- [x] 2. Database migrations — competency assessments and attempts
  - [ ] 2.1 Create `competency_assessments` table with columns: id, course_id, competency_id, title, description, assessment_type (knowledge_test|practical|hybrid), mastery_rule, max_attempts, retry_cooldown_hours, remediation_lesson_id, requires_remediation_before_retry, created_at, updated_at
  - [ ] 2.2 Create `assessment_attempts` table with columns: id, user_id, competency_assessment_id, attempt_number, score, passed, feedback, remediation_recommended_at, remediation_completed_at, can_retry_at, created_at, updated_at
  - [ ] 2.3 Create unique constraint on `assessment_attempts (user_id, competency_assessment_id, attempt_number)`
  - [ ] 2.4 Enable RLS on both tables:
    - [ ] 2.4a Assessment attempts: users SELECT own, instructors SELECT for their courses
  - [ ] 2.5 Create indexes on user_id, competency_assessment_id, can_retry_at for query efficiency

- [ ] 3. Database migrations — practical projects and grading
  - [ ] 3.1 Create `rubrics` table with columns: id, title, description, criteria (jsonb array of { name, points }), total_points (generated), passing_score_percent, created_at, updated_at
  - [ ] 3.2 Create `practical_projects` table with columns: id, competency_id, title, brief, example_url, submission_instructions, accepted_file_types, max_file_size_mb, rubric_id, created_at, updated_at
  - [ ] 3.3 Create `project_submissions` table with columns: id, user_id, project_id, submission_version, submission_type (file|url|video), file_url, external_url, video_url, submission_text, status (submitted|under_review|graded|rejected), created_at, updated_at
  - [ ] 3.4 Create `project_grades` table with columns: id, submission_id, rubric_id, graded_by_user_id, grading_type (instructor|ai), scores (jsonb), total_score, feedback, created_at, updated_at
  - [ ] 3.5 Create unique partial index on `project_submissions (user_id, project_id)` for one latest per project
  - [ ] 3.6 Enable RLS on all four tables with appropriate read/write policies
  - [ ] 3.7 Create indexes for query performance

- [x] 4. Database migrations — competency badges and learner pathways
  - [ ] 4.1 Create `competency_badges` table with columns: id, user_id, competency_id, assessment_passed_at, project_passed_at, badge_code (unique), created_at
  - [ ] 4.2 Create unique constraint on `competency_badges (user_id, competency_id)` — one badge per user per competency
  - [ ] 4.3 Create `learner_pathways` table with columns: id, user_id, course_id, recommended_start_section_id, skip_section_ids (uuid array), baseline_competencies (text array), recommendation_reason, created_at, updated_at
  - [ ] 4.4 Create unique constraint on `learner_pathways (user_id, course_id)`
  - [ ] 4.5 Enable RLS on both tables:
    - [ ] 4.5a Badges: users SELECT own, service role INSERT, public SELECT if portfolio_public
    - [ ] 4.5b Pathways: users SELECT own, service role INSERT/UPDATE
  - [ ] 4.6 Create indexes on user_id, course_id, competency_id

- [ ] 5. TypeScript types update
  - [x] 5.1 Add all new table types to `src/integrations/supabase/types.ts`: Competency, DiagnosticAssessment, DiagnosticQuestion, DiagnosticAttempt, CompetencyAssessment, AssessmentAttempt, Rubric, PracticalProject, ProjectSubmission, ProjectGrade, CompetencyBadge, LearnerPathway
  - [x] 5.2 Add Row, Insert, Update, Relationships types for each new table

- [ ] 6. Server functions: Diagnostic scoring and pathway generation
  - [-] 6.1 Create `src/lib/diagnostic.server.ts` with function `submitDiagnosticAttempt(diagnosticId: string, userAnswers: Record<string, string>): Promise<{ score: number; passed: boolean; nextSteps: string[] }>`
    - [x] 6.1a Fetch diagnostic questions and score user answers
    - [x] 6.1b Calculate total score
    - [x] 6.1c Check if learner exceeded attempt cooldown (7 days default)
    - [x] 6.1d Insert into diagnostic_attempts
    - [x] 6.1e If passed, return pathway recommendation; if failed, return prerequisite courses
  - [ ] 6.2 Create function `generateLearnerPathway(userId: string, courseId: string): Promise<LearnerPathway>`
    - [x] 6.2a Fetch latest diagnostic attempt for course prerequisites
    - [x] 6.2b Compare learner scores against competency prerequisites
    - [x] 6.2c Identify sections to skip, prerequisite courses to recommend
    - [x] 6.2d Insert into learner_pathways table
    - [ ] 6.2e Return pathway data with recommendation reason

- [x] 7. Server functions: Assessment submission and retry rules
  - [ ] 7.1 Create `src/lib/assessment.server.ts` with function `submitAssessmentAttempt(assessmentId: string, userAnswers: Record<string, string>): Promise<{ score: number; passed: boolean; feedback: string; canRetryAt: Date | null; competencyAttained: boolean }>`
    - [ ] 7.1a Fetch assessment and competency details
    - [ ] 7.1b Check max attempts rule — if exceeded, throw error
    - [ ] 7.1c Check retry cooldown — if violated, throw error
    - [ ] 7.1d Score the attempt based on assessment_type (knowledge_test calculates % correct; if hybrid, also checks if project is graded)
    - [ ] 7.1e Provide feedback based on failed questions/skills
    - [ ] 7.1f If requires_remediation_before_retry, set remediation_recommended_at
    - [ ] 7.1g Calculate can_retry_at = now + retry_cooldown_hours
    - [ ] 7.1h If score passes mastery_rule, set passed = true and check if project also passed → potential badge
    - [ ] 7.1i Insert into assessment_attempts table
    - [ ] 7.1j Return results

- [ ] 8. Server functions: Project grading and badge issuance
  - [ ] 8.1 Create `src/lib/project-grading.server.ts` with function `gradeProjectSubmission(submissionId: string, rubricScores: Record<string, number>, feedback: string): Promise<{ totalScore: number; passed: boolean; badgeIssued: boolean }>`
    - [ ] 8.1a Fetch submission, rubric, and competency details
    - [ ] 8.1b Validate scores match rubric criteria
    - [ ] 8.1c Calculate total score from rubric_scores
    - [ ] 8.1d Check if total_score >= rubric.passing_score_percent
    - [ ] 8.1e Insert into project_grades table
    - [ ] 8.1f Update project_submissions.status to 'graded'
    - [ ] 8.1g If passed AND assessment also passed (query latest assessment_attempts for this competency):
      - [ ] 8.1g1 Generate unique badge_code
      - [ ] 8.1g2 Insert into competency_badges (with assessment_passed_at and project_passed_at timestamps)
      - [ ] 8.1g3 Return badgeIssued = true
    - [ ] 8.1h Return results
  - [ ] 8.2 Create function `generateBadgeImage(competencyTitle: string, earnerName: string, dateEarned: Date): Promise<string>` that returns a URL to the badge PNG (stored in Supabase Storage)
    - [ ] 8.2a Use a library like `canvas` or `sharp` to generate badge image server-side
    - [ ] 8.2b Upload to `supabase-storage/badge-images/{badge_code}.png`
    - [ ] 8.2c Return signed URL

- [ ] 9. Server functions: Project submission handling
  - [ ] 9.1 Create `src/lib/project-submission.server.ts` with function `submitProjectSubmission(projectId: string, submission: { type: 'file' | 'url' | 'video'; fileUrl?: string; externalUrl?: string; videoUrl?: string; submissionText?: string }): Promise<{ submissionId: string; status: string }>`
    - [ ] 9.1a Fetch project details and rubric
    - [ ] 9.1b If type = 'file': validate file extension against accepted_file_types
    - [ ] 9.1c If type = 'file': validate file size <= max_file_size_mb
    - [ ] 9.1d If type = 'url': validate URL format (http/https)
    - [ ] 9.1e Check if user already has a submission → increment submission_version
    - [ ] 9.1f Insert into project_submissions table with status = 'submitted'
    - [ ] 9.1g Return submission ID and status

### Phase 2: UI Components — Student-Facing

- [x] 10. Diagnostic assessment component
  - [x] 10.1 Create `src/components/diagnostic-assessment.tsx`
  - [x] 10.2 Display diagnostic name, description, question count, estimated time
  - [x] 10.3 Render questions dynamically (multiple choice or short answer)
  - [x] 10.4 Accept user answers in form state
  - [x] 10.5 Submit answers via `submitDiagnosticAttempt`
  - [x] 10.6 Display results page: score, passed/failed, recommendation (prerequisite course vs. main course)
  - [x] 10.7 If failed, show: "You scored X%. Consider reviewing [Prerequisite Course] before starting." with link
  - [x] 10.8 If passed, show: "You're ready! You can enroll in this course." with enroll CTA
  - [x] 10.9 Show cooldown message if learner already took diagnostic: "You can retake this diagnostic in X days"

- [x] 11. Competency assessment (knowledge test) component
  - [x] 11.1 Create `src/components/competency-knowledge-test.tsx`
  - [x] 11.2 Display assessment title, description, competency being assessed
  - [x] 11.3 Render multiple-choice questions
  - [x] 11.4 Track attempt number and max attempts allowed
  - [x] 11.5 Submit via `submitAssessmentAttempt`
  - [x] 11.6 Display score, pass/fail status, feedback (e.g., "You scored 62%. Key gap: Error handling.")
  - [x] 11.7 If failed:
    - [x] 11.7a Show remediation lesson link (if requires_remediation_before_retry)
    - [x] 11.7b Disable "Retry" button until: cooldown elapsed + (remediation completed if required)
    - [x] 11.7c Show countdown timer: "You can retry in X hours"
    - [x] 11.7d Show attempts remaining: "2 of 3 attempts used"
  - [x] 11.8 If passed:
    - [x] 11.8a Show "Competency Assessed" with encouraging message
    - [x] 11.8b Check if project also passed → show "Badge earned!" if both passed
    - [x] 11.8c Show next steps: "Complete the capstone project to earn your badge"

- [x] 12. Project submission form component
  - [x] 12.1 Create `src/components/project-submission-form.tsx`
  - [x] 12.2 Display project title, brief (500-2000 chars), example submission, submission instructions
  - [x] 12.3 Display rubric with criteria and point scales (read-only for learner)
  - [x] 12.4 Render submission type selector: File upload | URL | Video
  - [x] 12.5 For file upload:
    - [x] 12.5a Show accepted file types and max size
    - [x] 12.5b Implement file upload with validation (extension, size)
    - [x] 12.5c Show upload progress bar
  - [x] 12.6 For URL submission: validate URL format input
  - [x] 12.7 For video: accept video URL input
  - [x] 12.8 Accept optional learner notes/comments
  - [x] 12.9 Submit via `submitProjectSubmission`
  - [x] 12.10 Show submission success: "Your project has been submitted for review" with submission version
  - [x] 12.11 Display submission history: previous submissions with timestamps, status (submitted, under_review, graded)
  - [x] 12.12 If submission graded: show grade, rubric feedback, and badge earned (if applicable)

- [x] 13. Competency overview page (learner view)
  - [x] 13.1 Create `src/routes/learn/$courseId/competencies.tsx`
  - [x] 13.2 Fetch all competencies for the course
  - [x] 13.3 Display competencies as cards showing:
    - [x] 13.3a Competency title
    - [x] 13.3b Observable behaviors (bullet list)
    - [x] 13.3c Success criteria
    - [x] 13.3d Learner's current status: Not started | Assessment in progress | Assessment passed/failed | Project in progress | Badge earned
  - [x] 13.4 Show progress bar: X of Y competencies mastered
  - [x] 13.5 Link from each competency to the assessment

### Phase 3: UI Components — Instructor-Facing

- [ ] 14. Competency framework editor (Studio)
  - [ ] 14.1 Create `src/components/competency-framework.tsx`
  - [ ] 14.2 Display list of existing competencies for the course
  - [ ] 14.3 For each competency, show: title, description, observable behaviors count, prerequisite count, job titles
  - [ ] 14.4 "Add Competency" button opens form with fields:
    - [ ] 14.4a Title (required, max 100 chars)
    - [ ] 14.4b Description (required, max 500 chars)
    - [ ] 14.4c Observable behaviors (add 2-5 items, required)
    - [ ] 14.4d Success criteria (required, free text)
    - [ ] 14.4e Prerequisite competencies (optional, multi-select from other courses)
    - [ ] 14.4f Related job titles (optional, free text, comma-separated)
  - [ ] 14.5 Edit existing competency
  - [ ] 14.6 Delete competency (warn if assessments linked)
  - [ ] 14.7 Drag to reorder competencies (update order_index)
  - [ ] 14.8 Show validation error if course has < 1 competency and user tries to publish

- [ ] 15. Competency assessment editor (Studio)
  - [ ] 15.1 Create `src/components/competency-assessment-editor.tsx`
  - [ ] 15.2 Display list of assessments for the course
  - [ ] 15.3 "Add Assessment" button opens form with fields:
    - [ ] 15.3a Assessment type (knowledge_test | practical | hybrid)
    - [ ] 15.3b Competency link (required, select from course competencies)
    - [ ] 15.3c Title (required)
    - [ ] 15.3d Description (optional)
    - [ ] 15.3e Mastery rule (e.g., "score >= 70")
    - [ ] 15.3f Max attempts (1-10, default 3)
    - [ ] 15.3g Retry cooldown hours (0-168, default 24)
    - [ ] 15.3h Requires remediation before retry (toggle)
    - [ ] 15.3i Remediation lesson link (optional, select from lectures)
  - [ ] 15.4 For knowledge_test type:
    - [ ] 15.4a "Add Question" form: question text, multiple choice options (4-5), correct answer, points
    - [ ] 15.4b Edit/delete questions
    - [ ] 15.4c Preview scoring: if user selects these answers, what's the score?
  - [ ] 15.5 For practical type:
    - [ ] 15.5a Link to rubric (select or create new)
    - [ ] 15.5b Brief field (500-2000 chars)
    - [ ] 15.5c Example submission URL
    - [ ] 15.5d Submission instructions
    - [ ] 15.5e Accepted file types (checkboxes: pdf, zip, json, csv, xlsx, etc.)
  - [ ] 15.6 Edit/delete assessments

- [ ] 16. Rubric editor (Studio)
  - [ ] 16.1 Create `src/components/rubric-editor.tsx`
  - [ ] 16.2 "New Rubric" or "Edit Rubric" form with fields:
    - [ ] 16.2a Title (e.g., "API Deployment Rubric")
    - [ ] 16.2b Description (optional)
    - [ ] 16.2c Criteria list (add/remove/edit):
      - [ ] 16.2c1 Criterion name (e.g., "Code Quality")
      - [ ] 16.2c2 Max points (0-100)
    - [ ] 16.2d Total points (auto-calculated, displayed)
    - [ ] 16.2e Passing score % (1-100%, default 70%)
  - [ ] 16.3 Preview: show how rubric appears during grading

- [x] 17. Project grading interface (Instructor)
  - [ ] 17.1 Create `src/routes/instructor/$courseId/grading.tsx`
  - [ ] 17.2 Display queue of pending project submissions (status = 'submitted' | 'under_review')
  - [ ] 17.3 For each submission, show: learner name, competency, submission date, submission preview (file name or URL)
  - [ ] 17.4 Click to grade: open full grading form
  - [ ] 17.5 Grading form displays:
    - [ ] 17.5a Project brief and example
    - [ ] 17.5b Learner's submission (embedded preview if possible, or link)
    - [ ] 17.5c Rubric with point scale inputs for each criterion
    - [ ] 17.5d Total score (auto-calculated)
    - [ ] 17.5e Pass/fail status (auto-determined from passing_score_percent)
    - [ ] 17.5f Feedback text area (optional)
  - [ ] 17.6 Submit grade via `gradeProjectSubmission`
  - [ ] 17.7 Show confirmation: "Grade recorded. Badge issued!" (if both assessment and project passed)
    - [ ] 17.7a Show learner name and badge details
  - [ ] 17.8 Remove submission from queue on successful grade

- [x] 18. Competency analytics dashboard (Instructor)
  - [ ] 18.1 Create `src/components/competency-analytics-dashboard.tsx`
  - [ ] 18.2 Display metrics per competency:
    - [ ] 18.2a % of learners who passed assessment
    - [ ] 18.2b % of learners who submitted project
    - [ ] 18.2c % of learners who earned badge
    - [ ] 18.2d Average attempts to mastery
  - [ ] 18.3 Display common failure points:
    - [ ] 18.3a For knowledge tests: % failed on each question
    - [ ] 18.3b For rubric: % of submissions scored < passing on each criterion
  - [ ] 18.4 Display learner progress table:
    - [ ] 18.4a Learner name
    - [ ] 18.4b For each competency: Not started | In progress | Assessment passed/failed | Project submitted | Badge earned
  - [ ] 18.5 Filter by:
    - [ ] 18.5a Competency
    - [ ] 18.5b Date range
    - [ ] 18.5c Learner group
  - [ ] 18.6 Export to CSV button

### Phase 4: UI Routes & Page Integration

- [-] 19. Diagnostic assessment route (pre-enrollment)
  - [ ] 19.1 Create `src/routes/learn/$courseId/diagnostic.tsx`
  - [ ] 19.2 Check if user already enrolled → redirect to course
  - [ ] 19.3 Check if diagnostic already completed within cooldown → show results or "retake in X days"
  - [ ] 19.4 Fetch diagnostic assessment for this course
  - [ ] 19.5 Render `DiagnosticAssessment` component
  - [ ] 19.6 On completion: show pathway recommendation and option to enroll

- [ ] 20. Competency assessment route
  - [ ] 20.1 Create `src/routes/learn/$courseId/$competencyId/assessment.tsx`
  - [ ] 20.2 Require authentication and enrollment in course
  - [ ] 20.3 Fetch competency assessment details
  - [ ] 20.4 Check learner's previous attempts (max attempts, cooldown)
  - [ ] 20.5 If remediation required and not completed, block attempt with message and link
  - [ ] 20.6 Render `CompetencyKnowledgeTest` component (or project form if practical type)
  - [ ] 20.7 On completion: store results and show next steps

- [ ] 21. Project submission route
  - [ ] 21.1 Create `src/routes/learn/$courseId/$competencyId/project.tsx`
  - [ ] 21.2 Require authentication and enrollment in course
  - [ ] 21.3 Require assessment passed before allowing project submission
  - [ ] 21.4 Fetch project details and rubric
  - [ ] 21.5 Render `ProjectSubmissionForm` component
  - [ ] 21.6 On submission success: show confirmation and next steps

- [ ] 22. Competency overview route
  - [ ] 22.1 Create `src/routes/learn/$courseId/competencies.tsx`
  - [ ] 22.2 Require authentication and enrollment in course
  - [ ] 22.3 Fetch all competencies for course
  - [ ] 22.4 Fetch learner's progress on each competency
  - [ ] 22.5 Render competency cards with status, progress, links to assessment/project

- [x] 23. Competency profile & export (learner)
  - [ ] 23.1 Create `src/routes/certificates/competency-profile.tsx`
  - [ ] 23.2 Fetch all `competency_badges` for authenticated user
  - [ ] 23.3 Display badges as cards with title, date earned, verification link
  - [ ] 23.4 "Export Skills" button opens modal with options:
    - [ ] 23.4a Download as PDF (learner name, all badges, recommended job titles)
    - [ ] 23.4b Generate public shareable link (with learner permission)
    - [ ] 23.4c Share to LinkedIn, Twitter, email
  - [ ] 23.5 Link to portfolio profile for social sharing

- [ ] 24. Public badge verification page
  - [ ] 24.1 Create `src/routes/verify/badge/$badgeCode.tsx`
  - [ ] 24.2 Fetch `competency_badges` by badge_code
  - [ ] 24.3 Display: competency title, earner name, date earned, issuer (Arcane), badge image
  - [ ] 24.4 Show related job titles
  - [ ] 24.5 If badgeholder made portfolio public, show project evidence (if submitted)
  - [ ] 24.6 Add share buttons (LinkedIn, Twitter, email)

- [ ] 25. Studio route: Competency section in course editor
  - [ ] 25.1 Add "Competencies" tab to `src/routes/instructor/$courseId.tsx` (course editor)
  - [ ] 25.2 Render `CompetencyFramework` component
  - [ ] 25.3 Show validation: "Your course must have at least 1 competency to publish"
  - [ ] 25.4 Add "Assessments" tab to course editor
  - [ ] 25.5 Render `CompetencyAssessmentEditor` component
  - [ ] 25.6 Add "Projects" tab to course editor
  - [ ] 25.7 Render rubric editor and project creation form

- [ ] 26. Instructor analytics update
  - [ ] 26.1 Add "Competencies" section to `src/routes/instructor/$courseId/analytics.tsx`
  - [ ] 26.2 Render `CompetencyAnalyticsDashboard` component
  - [ ] 26.3 Add "Grading Queue" link to project grading interface

- [ ] 27. Course detail page: Show diagnostic link
  - [ ] 27.1 Update `src/routes/courses/$courseId.tsx` (course detail)
  - [ ] 27.2 If course has diagnostic and user not enrolled: show "Take diagnostic test" CTA before "Enroll" button
  - [ ] 27.3 If diagnostic passed: show "You're ready! Enroll now"
  - [ ] 27.4 If diagnostic failed: show "Recommended: Complete [Prerequisite Course] first" with link

### Phase 5: Server Functions & API

- [x] 28. Diagnostic submission API
  - [x] 28.1 Create `src/server/diagnostic.ts` with exported `submitDiagnosticAttempt` function
  - [x] 28.2 Implement full logic: fetch questions, score answers, check cooldown, insert attempt, generate pathway
  - [x] 28.3 Add error handling for duplicate attempts within cooldown, invalid diagnostic

- [x] 29. Assessment submission API
  - [x] 29.1 Create `src/server/assessment.ts` with exported `submitAssessmentAttempt` function
  - [x] 29.2 Implement full logic: validate attempts, check cooldown, score answers, insert attempt, calculate feedback
  - [x] 29.3 Check if competency attained: if assessment passed AND (project passed OR no project required)
  - [x] 29.4 Return all required data for UI

- [x] 30. Project submission API
  - [x] 30.1 Create `src/server/project-submission.ts` with exported `submitProjectSubmission` function
  - [x] 30.2 Implement validation: file type, size (if file), URL format (if URL)
  - [x] 30.3 Increment version if user already has submission
  - [x] 30.4 Insert into project_submissions, return success

- [x] 31. Project grading API
  - [x] 31.1 Create `src/server/project-grading.ts` with exported `gradeProjectSubmission` function
  - [x] 31.2 Implement rubric scoring, total score calculation
  - [x] 31.3 Check if project passed (score >= passing_score_percent)
  - [x] 31.4 If passed AND assessment passed: generate badge_code, issue badge, generate badge image
  - [x] 31.5 Insert into project_grades, update submission status
  - [x] 31.6 Return grade details and badge issued flag

- [x] 32. Pathway generation API
  - [x] 32.1 Create `src/server/pathway.ts` with exported `generateLearnerPathway` function
  - [x] 32.2 Implement logic: fetch diagnostic score, compare to prerequisites, recommend sections
  - [x] 32.3 Insert into learner_pathways, return recommendation

### Phase 6: Utilities & Helpers

- [x] 33. Utility functions
  - [x] 33.1 Create `src/lib/competency-validators.ts` with:
    - [x] 33.1a `isValidCompetencyTitle(title: string): boolean`
    - [x] 33.1b `isValidMasteryRule(rule: string): boolean`
    - [x] 33.1c `calculateRubricScore(criteria, scores): { totalScore, passed }`
    - [x] 33.1d `canUserRetryAssessment(lastAttempt, maxAttempts, retryReqsCooldown): boolean`
    - [x] 33.1e `canUserRetakeDiagnostic(lastAttempt, cooldownDays): boolean`
    - [x] 33.1f `scoreMultipleChoiceQuestion(answer, correct): number`
  - [x] 33.2 Create `src/lib/badge-generation.ts` with:
    - [x] 33.2a `generateBadgeImage(competencyTitle, earnerName, dateEarned): Promise<buffer>`
    - [x] 33.2b `uploadBadgeImage(badgeCode, imageBuffer): Promise<url>`
    - [x] 33.2c `generateBadgeCode(): string`

- [x] 34. React hooks for competency features
  - [x] 34.1 Create `src/hooks/use-diagnostic.ts` with:
    - [x] 34.1a `useDiagnosticAttempts(diagnosticId): { attempts, loading, refetch }`
    - [x] 34.1b `useCanRetakeDiagnostic(diagnosticId): boolean`
  - [x] 34.2 Create `src/hooks/use-assessment.ts` with:
    - [x] 34.2a `useAssessmentAttempts(assessmentId): { attempts, loading }`
    - [x] 34.2b `useCanRetryAssessment(assessmentId): { canRetry, canRetryAt, reason }`
  - [x] 34.3 Create `src/hooks/use-competency-progress.ts` with:
    - [x] 34.3a `useCompetencyProgress(courseId): { competencies, progress, badges, loading }`

### Phase 7: Testing

- [x] 35. Property-based tests
  - [x] 35.1 Create `src/tests/pbt/competency-framework.pbt.test.ts`
  - [x] 35.2 Property 1: Competency-assessment alignment — assessments only measure competency-aligned criteria
  - [x] 35.3 Property 2: Mastery before badge issuance — badges only issued when assessment AND project passed
  - [x] 35.4 Property 3: Diagnostic routing accuracy — score < 50% → prerequisite path, >= 50% → main path
  - [x] 35.5 Property 4: Retry rule enforcement — attempts never exceed max_attempts
  - [x] 35.6 Property 5: Remediation prerequisite — if required, learner cannot retry until completed
  - [x] 35.7 Property 6: Project evidence immutability — all submissions timestamped, versions preserved

- [x] 36. Unit tests
  - [x] 36.1 Create `src/tests/unit/competency-validators.test.ts`
  - [x] 36.2 Test: `isValidCompetencyTitle` accepts 1-100 chars, rejects empty/>100
  - [x] 36.3 Test: `isValidMasteryRule` validates expression syntax (score >= 70, score >= 70 AND rubric_score >= 8, etc.)
  - [x] 36.4 Test: `calculateRubricScore` correctly sums criterion points and determines pass/fail
  - [x] 36.5 Test: `canUserRetryAssessment` correctly checks max attempts and cooldown
  - [x] 36.6 Test: `canUserRetakeDiagnostic` correctly checks 7-day cooldown
  - [x] 36.7 Test: `scoreMultipleChoiceQuestion` returns 1 for correct, 0 for incorrect

- [x] 37. Unit tests: Assessment & project grading logic
  - [x] 37.1 Create `src/tests/unit/assessment-submission.test.ts`
  - [x] 37.2 Test: `submitAssessmentAttempt` blocks attempt if max attempts exceeded
  - [x] 37.3 Test: `submitAssessmentAttempt` blocks retry if cooldown not elapsed
  - [x] 37.4 Test: `submitAssessmentAttempt` calculates score correctly (% of questions answered)
  - [x] 37.5 Test: Score is marked passed if >= mastery_rule threshold
  - [x] 37.6 Create `src/tests/unit/project-grading.test.ts`
  - [x] 37.7 Test: `gradeProjectSubmission` calculates rubric score correctly
  - [x] 37.8 Test: Badge is issued only if project passed AND assessment passed
  - [x] 37.9 Test: Badge code is unique
  - [x] 37.10 Test: Grade is inserted with correct metadata (graded_by, grading_type, timestamp)

- [x] 38. Integration tests
  - [x] 38.1 Create `src/tests/integration/competency-workflow.test.ts`
  - [x] 38.2 Test: Learner takes diagnostic → pathway generated → pathway appears on enrollment screen
  - [x] 38.3 Test: Learner takes assessment → failed → can retry after cooldown
  - [x] 38.4 Test: Learner takes assessment → passed → next steps show project
  - [x] 38.5 Test: Learner submits project → graded → badge issued if assessment also passed
  - [x] 38.6 Test: Badge appears in competency profile and verification page

### Phase 8: Trigger & Automation

- [ ] 39. Database triggers for automation
  - [ ] 39.1 Create trigger: On `assessment_attempts` INSERT with `passed = true`, check if project also passed → call badge issuance function
  - [ ] 39.2 Create trigger: On `project_grades` INSERT with `total_score >= passing_score`, update status in `project_submissions` to 'graded'
  - [ ] 39.3 Create trigger: On `competency_badges` INSERT, insert notification row with type = 'badge_earned'

### Phase 9: Documentation & Verification

- [ ] 40. End-to-end verification
  - [ ] 40.1 Verify: Instructor can create competency in Studio
  - [ ] 40.2 Verify: Instructor can create diagnostic assessment with questions
  - [ ] 40.3 Verify: Learner can take diagnostic → see results → see pathway recommendation
  - [ ] 40.4 Verify: Learner can take competency assessment → see score/feedback
  - [ ] 40.5 Verify: Learner can submit project → see grading status
  - [ ] 40.6 Verify: Instructor can grade project → learner notified, badge issued if criteria met
  - [ ] 40.7 Verify: Learner can view competency profile, export skills
  - [ ] 40.8 Verify: Public badge verification page works

- [ ] 41. Documentation
  - [ ] 41.1 Update README.md with competency framework overview and usage examples
  - [ ] 41.2 Create `COMPETENCY_FRAMEWORK.md` with instructor guide (how to define competencies, create assessments, grade projects)
  - [ ] 41.3 Create `LEARNER_PATHWAYS.md` with learner guide (what diagnostic means, how to use recommendations)

---

## Summary

**Total tasks**: 41 major tasks spanning:
- Database schema (4 task sets)
- TypeScript types (1 task set)
- Server functions (6 task sets)
- UI Components (9 task sets)
- Route integration (8 task sets)
- Testing (4 task sets)
- Automation (1 task set)
- Verification (2 task sets)

**Estimated effort**: 100-120 development hours with systematic execution and testing.

