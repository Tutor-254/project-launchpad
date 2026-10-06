# Requirements Document: Competency Framework and Mastery Learning

## Introduction

Employment outcomes depend on learners actually demonstrating job-ready skills, not just completing videos. This feature introduces:

1. **Competency definitions** — explicit skill statements with observable behaviors
2. **Diagnostic assessment** — entry testing to identify prerequisites and personalize pathways
3. **Mastery learning** — structured remediation for failed assessments, retry rules to prevent guessing
4. **Practical project evidence** — real-world artifact submission and rubric-based evaluation
5. **Competency badges** — certifications for demonstrated skills (not just course completion)

---

## Glossary

- **Competency**: A specific, observable skill (e.g., "Deploy a Node.js API to a cloud platform")
- **Competency Statement**: Formal description of a skill with: observable behaviors, success criteria, related entry-level tasks
- **Diagnostic Assessment**: Pre-course test assessing prior knowledge, identifying prerequisites
- **Mastery Learning**: Structured pathway: attempt → receive feedback → remediate → retry → demonstrate mastery
- **Remediation**: Targeted re-teaching focused on the specific skill the learner failed
- **Practical Project**: Real-world artifact (website, spreadsheet, business plan) submitted as evidence
- **Rubric**: Scored assessment criteria (e.g., "Code quality: 0-5 points")
- **Competency Badge**: Digital credential awarded for passing a competency assessment + submitting evidence

---

## Requirements

### Requirement 1: Competency Framework Definition

**User Story:** As an instructor, I want to define the skills a learner should demonstrate at the end of my course so the learning and assessment are aligned.

#### Acceptance Criteria

1. IN the Studio course editor, THERE SHALL be a "Competencies" section where instructors can define course-level competencies.
2. FOR each competency, THE instructor SHALL provide:
   - Title (max 100 characters, e.g., "Deploy a Node.js API")
   - Description (max 500 characters, explaining what the skill entails)
   - Observable behaviors (list of 2-5 specific, measurable actions, e.g., "Connects to a database using environment variables")
   - Success criteria (definition of passing, e.g., "Receives 70% or higher on the assessment and submits a working project")
   - Prerequisite skills (optional list of competencies from earlier courses)
   - Related entry-level tasks / job titles (e.g., "Junior Backend Developer", "API Integrations Specialist")
3. INSTRUCTORS SHALL be able to map course sections/lectures to competencies (one section = one competency).
4. THE system SHALL prevent a course from being published unless at least one competency is defined.

---

### Requirement 2: Diagnostic Assessment

**User Story:** As a learner, I want to take a quick diagnostic test before starting a course so I know if I need foundational skills first.

#### Acceptance Criteria

1. BEFORE a learner enrolls in a course, THE system SHALL present an optional "Take diagnostic test" prompt.
2. THE diagnostic test SHALL include: 5-10 questions assessing prerequisite knowledge (selected from prerequisite competencies).
3. AFTER completing the diagnostic, THE system SHALL:
   - Score the test (pass/fail or percentage)
   - Display the learner's results and recommended next steps
   - If score < 50%, recommend prerequisite courses or modules
   - If score >= 50%, confirm "You're ready" and allow enrollment
4. IF a learner fails the diagnostic, THEY SHALL be offered:
   - "Start a prerequisite module" (link to recommended earlier course)
   - "Skip and enroll anyway" (allows enrollment but flags in instructor analytics)
5. LEARNERS MAY re-take the diagnostic after 7 days or after completing a prerequisite.

---

### Requirement 3: Competency-Based Assessments

**User Story:** As an instructor, I want to create assessments that directly measure a specific competency so I know learners can actually apply the skill.

#### Acceptance Criteria

1. IN the Studio, instructors SHALL create assessments with fields:
   - Assessment title and description
   - Linked competency (required)
   - Assessment type: "Knowledge test" (multiple choice), "Practical" (file submission), "Hybrid" (test + project)
   - For knowledge tests: questions with scoring
   - For practical: submission instructions, file types accepted, rubric
2. EACH assessment SHALL have a mastery rule: e.g., "Pass if ≥ 70% on test OR ≥ 8/10 on rubric"
3. WHEN a learner completes an assessment, THE system SHALL record:
   - Attempt number
   - Score (numeric, 0-100)
   - Pass/fail status
   - Competency attained (yes/no)

---

### Requirement 4: Retry Rules and Remediation

**User Story:** As an instructor, I want to prevent learners from repeatedly guessing until they pass, while still allowing multiple attempts to demonstrate mastery.

#### Acceptance Criteria

1. INSTRUCTORS SHALL define retry rules per assessment:
   - Max attempts (e.g., 3)
   - Retry cooldown (e.g., 24 hours between attempts)
   - Remediation requirement: "Before retry, complete Module 3.2 (Remediation: Error Handling)"
2. IF a learner fails an assessment:
   - THEY SHALL see feedback: "You scored 62%. Key gap: [topic]. Review the remediation below."
   - THEY SHALL be offered a remediation lesson link (instructor-specified)
   - A "Retry" button SHALL be disabled until: remediation is completed AND cooldown elapsed
3. AFTER max attempts are exhausted without passing, THE system SHALL:
   - Flag the learner in instructor's analytics with "Failed after 3 attempts"
   - Allow instructor to manually override (mark competency attained anyway) for borderline cases

---

### Requirement 5: Practical Projects and Rubric Scoring

**User Story:** As a learner, I want to submit a real-world project so I can prove I can apply the skill, not just answer test questions.

#### Acceptance Criteria

1. EACH competency-focused course SHALL include at least one "Capstone Project" (practical assignment) with:
   - Project brief (description of what to build, format 500-2000 characters)
   - Example submission (screenshot, GitHub repo, working link)
   - Submission instructions (file types, format, max size)
   - Rubric (scoring criteria with point breakdowns)
2. LEARNERS SHALL submit projects via:
   - File upload (PDF, ZIP, spreadsheet)
   - URL submission (GitHub repo link, deployed website, Google Sheets)
   - Video submission (screen recording demonstrating the project)
3. AFTER submission, THE system SHALL:
   - Store the submission with timestamp and learner ID
   - Display version history (learners can re-submit; all versions kept)
   - Queue for instructor or AI review
4. THE instructor OR AI grader SHALL score using the rubric:
   - Display each criterion with 0-5 point scale
   - Auto-calculate total score
   - Provide written feedback per criterion
5. IF score passes rubric (e.g., ≥ 70%), THE learner:
   - Receives "Competency Attained" badge notification
   - Can export the project + rubric feedback as portfolio evidence

---

### Requirement 6: Competency Badges and Credentials

**User Story:** As a learner, I want to earn a digital badge for each skill I master so I can prove my abilities to employers.

#### Acceptance Criteria

1. WHEN a learner passes a competency assessment AND submits a passing project, THE system SHALL:
   - Create a `competency_badges` row
   - Generate a digital badge image with: competency title, date earned, "Verified by Arcane", learner name
   - Display in `/certificates` alongside course certificates
2. EACH badge SHALL have:
   - Unique verification URL (e.g., `/verify/badge/abc123`) showing: competency, rubric, project evidence (if public)
   - Metadata: competency, issuer (Arcane), date, learner name
   - Share options: LinkedIn, Twitter, email, download as PNG
3. THE badge SHALL be linked to the entry-level jobs / roles this competency prepares for (e.g., "Badge: Deploy APIs" links to "API Developer" roles).
4. EMPLOYERS MAY verify the badge by visiting the verification URL and confirming the skill.

---

### Requirement 7: Personalized Learning Pathways

**User Story:** As a learner, I want the system to recommend a learning path based on my baseline skills so I don't waste time on material I already know.

#### Acceptance Criteria

1. AFTER diagnostic assessment or first login, THE system SHALL:
   - Show learner their baseline skills (e.g., "Detected: Basic spreadsheet knowledge")
   - Recommend a learning path: start with [Module A], skip [Module B], take [Module C]
   - Explain the recommendation: "You passed the Excel basics test, so we're starting you with Advanced Formulas"
2. LEARNERS MAY override the recommendation: "I'd prefer to start from the beginning anyway"
3. THE recommended path SHALL update as the learner completes modules (re-test shows progress)

---

### Requirement 8: Competency Analytics and Instructor View

**User Story:** As an instructor, I want to see how many learners are mastering each competency so I know if my course is effective.

#### Acceptance Criteria

1. IN the Instructor Analytics page, THERE SHALL be a "Competency Report" showing:
   - For each competency: % of learners who passed the assessment
   - For each competency: % of learners who submitted passing projects
   - Average attempts to mastery
   - Common failure points (which questions/rubric items are most often failed)
2. INSTRUCTORS SHALL see a "Competency Mastery by Learner" table:
   - Learner name
   - Competencies: "Not started" | "In progress" | "Assessed (passed/failed)" | "Attained" | "Attained + project"
3. INSTRUCTORS MAY filter by: competency, learner group, date range
4. INSTRUCTORS SHALL be able to export reports as CSV for stakeholder sharing

---

### Requirement 9: Portable Competency Profile

**User Story:** As a learner, I want to export my competency badges and project evidence so I can share my skills with employers or educational partners.

#### Acceptance Criteria

1. IN `/certificates`, learners SHALL see a "Competency Profile" showing all badges earned.
2. LEARNERS SHALL be able to generate a "Skills Export" (PDF or link) containing:
   - All competency badges earned
   - Project evidence (with learner's permission)
   - Baseline vs. post-course skills comparison
   - Recommended entry-level jobs matching the competencies
3. THE export SHALL be shareable: email, WhatsApp, LinkedIn, or public link (with learner's consent settings)

---

## Correctness Properties

### Property 1: Competency-assessment alignment

**For all competencies C and assessments A:**
`A.linked_competency = C → A.success_criteria ⊆ C.observable_behaviors`

Assessments only measure competency-aligned criteria. No assessment measures skills outside the competency definition.

### Property 2: Mastery before badge issuance

**For all badges B:**
`assessment_passed(B.competency) ∧ project_passed(B.competency) = true`

Badges are only issued when both assessment AND project are passed.

### Property 3: Diagnostic routing accuracy

**For all diagnostics D and learners L:**
`score(D, L) < 50% → path_recommendation(L) = 'prerequisite'`
`score(D, L) >= 50% → path_recommendation(L) = 'main_course'`

Diagnostic recommendations are always consistent with the score threshold.

### Property 4: Retry rule enforcement

**For all learners L and assessments A with max_attempts = M:**
`attempt_count(L, A) ≤ M`

Learners cannot exceed the max attempts rule. Additional attempts are blocked by the UI and DB constraint.

### Property 5: Remediation prerequisite

**For all retries R where remediation_required = true:**
`remediation_completed(R.learner) = true ∨ retry_blocked(R) = true`

If remediation is required before retry, learners cannot retry until the remediation is marked complete.

### Property 6: Project evidence immutability

**For all submissions S:**
`created_at(S) ≤ now ∧ updated_at(S) ≥ created_at(S)`

All submissions are timestamped; version history is preserved for audit trails.

---

## Acceptance Criteria Summary

| Feature | P0/P1 | Key Metric |
|---------|-------|-----------|
| Competency definition | P0 | All courses define ≥1 competency + observable behaviors |
| Diagnostic assessment | P1 | Learners take diagnostic; 95% completion rate |
| Competency assessments | P0 | Assessments linked to competencies; pass/fail recorded |
| Remediation & retries | P1 | Avg. attempts to mastery = 1.8 (target: <2) |
| Practical projects | P0/P1 | 80%+ of course completers submit projects |
| Competency badges | P1 | Badges verifiable and shareable |
| Personalized paths | P1 | Diagnostic → pathway recommendation shown to 95% of learners |
| Competency analytics | P1 | Instructor view shows mastery rates per competency |

