# AI-Powered Competency Intelligence — Requirements

## Overview

Integrate Google Gemini API to enhance the competency framework with intelligent assessment generation, facilitator screening, course intelligence, and adaptive learning paths. This elevates Arcane from a basic e-learning platform to an **AI-assisted skills mastery system**.

## Goals

1. **Facilitator Screening**: AI-powered assessment of instructor qualifications during onboarding
2. **Course Intelligence**: Extract competencies, learning objectives, and difficulty from course content
3. **Assessment Generation**: Auto-generate diagnostic tests, CAT 1 (Continuous Assessment Test 1), and CAT 2
4. **Adaptive Feedback**: Personalized remediation recommendations and learning path optimization
5. **Quality Assurance**: AI-powered content review for clarity, alignment, and accessibility
6. **Learner Support**: Intelligent tutoring and just-in-time hints

## Use Cases

### 1. Facilitator Screening (Instructor Onboarding)

**Problem**: Manual review of instructor qualifications is slow and subjective.

**Solution**: AI-powered screening of instructor applications, certifications, and teaching experience.

**Workflow**:
- Instructor submits application with:
  - Educational background (text)
  - Teaching experience summary
  - CV/resume (text extraction)
  - Sample course outline or teaching materials
  - Subject expertise areas
- Gemini API analyzes:
  - Expertise level in declared subjects (NLP classification)
  - Teaching competency (from experience description)
  - Content quality and clarity (if materials provided)
  - Alignment with platform's pedagogy
- AI generates:
  - Qualification score (0-100)
  - Expertise assessment per subject
  - Recommended subject categories
  - Screening recommendation (approve/reject/request-more-info)
  - Confidence score for each recommendation
- Admin reviews AI recommendation + full profile before final decision

**Benefits**:
- Faster screening (AI pre-filters weak candidates)
- Consistent evaluation criteria
- Bias mitigation through structured analysis
- Detailed insight for final human review

---

### 2. Course Intelligence Extraction

**Problem**: Instructors manually define competencies and learning objectives. Error-prone, incomplete.

**Solution**: AI extracts and validates competencies, learning objectives, and difficulty from course materials.

**Workflow**:
- Instructor uploads/pastes course description, syllabus, or lecture transcripts
- Gemini API extracts:
  - **Competencies**: Core skills/knowledge students will gain (structured output)
  - **Learning Objectives**: SMART objectives per competency (Bloom's taxonomy classification)
  - **Prerequisites**: Prerequisite knowledge/skills mentioned
  - **Difficulty Level**: Estimated course level (beginner/intermediate/advanced)
  - **Time Estimate**: Suggested course duration based on content volume
  - **Key Topics**: Hierarchical topic breakdown
  - **Related Skills**: Cross-course competency mapping
  - **Job Roles**: Potential job titles/roles taught
- System presents AI suggestions to instructor for review/editing
- Instructor confirms, modifies, or rejects suggestions
- Validated data populates competency framework

**Benefits**:
- Faster course setup (instructor time -60%)
- Consistent competency definitions across courses
- Automatic job-skills mapping
- Data-driven prerequisite validation

---

### 3. Assessment Generation (Diagnostic, CAT 1, CAT 2)

**Problem**: Creating rigorous, diverse assessments is time-consuming and requires expertise.

**Solution**: AI-powered generation of multiple assessment types with quality validation.

#### 3.1 Diagnostic Assessment Generation

**Workflow**:
- Input: Course competencies, prerequisites, learning objectives
- Gemini API generates:
  - 10-20 diagnostic questions (mix of difficulty)
  - Question types: multiple choice, short answer, scenario-based
  - Correct answers with detailed explanations
  - Distractor analysis (why wrong answers are plausible)
  - Difficulty scores (0-100) per question
  - Bloom's level per question
- System validates:
  - Question clarity and lack of ambiguity (NLP check)
  - Answer correctness (semantic analysis)
  - Diversity of question types
- Output: Diagnostic assessment ready for instructor review

#### 3.2 CAT 1 Generation (Formative Assessment)

**Workflow**:
- Input: Lecture content, learning objectives, competency level
- Gemini API generates:
  - 15-25 assessment questions (mix of types)
  - Questions aligned to learning objectives
  - Progressive difficulty (starts easy, ramps up)
  - Mix of factual, conceptual, and application questions
  - Rubric for short-answer questions
  - Expected score distribution
- Output: CAT 1 ready for deployment mid-course

#### 3.3 CAT 2 Generation (Summative Assessment)

**Workflow**:
- Input: All learning objectives, competency definitions, assessment difficulty threshold
- Gemini API generates:
  - 20-30 assessment questions
  - Balanced across all competencies
  - Higher-order thinking questions (application, analysis, synthesis)
  - Integration questions (combining multiple competencies)
  - Real-world scenario questions
  - Full rubric for subjective questions
- Output: CAT 2 summative assessment

**Quality Validation**:
- Bloom's level distribution (not just recall)
- Competency coverage (all competencies assessed)
- Difficulty progression (coherent)
- Linguistic clarity (readability score > 60)
- Answer alignment (each answer objectively correct)

---

### 4. Intelligent Feedback & Remediation

**Problem**: Generic feedback doesn't help students understand gaps. No personalized learning paths.

**Solution**: AI-generated personalized feedback and adaptive learning recommendations.

**Workflow**:
- Student takes assessment and submits answers
- Gemini API analyzes:
  - Incorrect answers (why the misconception exists)
  - Patterns in errors (conceptual gaps vs. careless mistakes)
  - Competency gaps (which competencies need work)
  - Difficulty level of questions missed
- AI generates:
  - **Personalized feedback** per question (not just "wrong")
    - Example: "You selected option B, but the correct answer is A because... A common misconception is..."
  - **Competency gap analysis**: Which competencies need remediation
  - **Recommended next steps**:
    - Specific lecture sections to review
    - Similar practice problems (generated on-demand)
    - Alternative explanations for difficult concepts
  - **Study guide**: AI-generated summary of key concepts for review
  - **Confidence calibration**: "You likely understand X but need more practice on Y"
- System suggests remediation resources or generates micro-lessons
- Adaptive pathway updates (quiz student on Y before allowing next competency)

**Benefits**:
- Faster learning cycle (detailed feedback immediately)
- Personalized support at scale (AI tutor)
- Reduced instructor grading burden
- Data-driven learner support

---

### 5. Course Content Quality Assurance

**Problem**: Instructors may upload content with clarity issues, inconsistencies, or accessibility problems.

**Solution**: AI-powered content audit before course publication.

**Workflow**:
- Instructor submits course content (lectures, materials, assessments)
- Gemini API performs automated QA:
  - **Clarity**: Readability score, jargon index, sentence complexity
  - **Completeness**: Are learning objectives addressed in content?
  - **Consistency**: Terminology used consistently across lectures?
  - **Alignment**: Do assessments match learning objectives?
  - **Accessibility**: Are captions needed? Can content be understood by diverse learners?
  - **Bias Detection**: Any language suggesting bias or exclusion?
  - **Accuracy**: Factual accuracy check (for domain-specific content)
  - **Examples Quality**: Are examples relevant and diverse?
- AI generates report:
  - Issues identified with severity (critical/warning/info)
  - Specific improvement suggestions
  - Examples from content
- Instructor addresses issues before publication

**Benefits**:
- Higher content quality across platform
- Faster content review cycle
- Reduced student confusion
- Better learning outcomes

---

### 6. Intelligent Tutoring (Just-in-Time Help)

**Problem**: Students get stuck; instructor may not respond for hours.

**Solution**: AI-powered hint system and concept explanation on-demand.

**Workflow**:
- Student encounters difficult concept or assessment question
- Student clicks "Need help?" or "Get a hint"
- Gemini API generates:
  - **Progressive hints**: Level 1 (hint), Level 2 (strategy), Level 3 (partial solution)
  - **Concept explanation**: Alternative explanation of concept (different from lecture)
  - **Example problem**: Similar worked example with step-by-step explanation
  - **Prerequisite check**: "Do you understand X? (prerequisite for this concept)"
- Student can escalate to instructor if needed
- Interaction logged (instructor can see which students struggled)

**Benefits**:
- 24/7 learner support
- Reduced dependency on instructor availability
- Faster problem resolution
- Learning analytics on common struggle points

---

### 7. Adaptive Learning Paths

**Problem**: One-size-fits-all curriculum doesn't account for learner pace or gaps.

**Solution**: AI-powered personalization of learning paths based on performance.

**Workflow**:
- System tracks learner progress:
  - Assessment scores per competency
  - Time-to-mastery
  - Error patterns
  - Engagement metrics
- Gemini API recommends:
  - **Learners ahead of pace**: Enrichment activities, advanced projects, stretch competencies
  - **Learners behind pace**: Additional review materials, slower-paced micro-lessons, prerequisite refreshers
  - **Learners with specific gaps**: Targeted remediation on specific competencies
  - **Next competency recommendation**: Based on prerequisites and learner readiness
- System updates curriculum pathway in real-time
- Facilitator gets alert if learner is significantly off pace

**Benefits**:
- Personalized learning experience
- Better completion rates (customized to pace)
- Early intervention for struggling learners
- Optimized learner support

---

## Functional Requirements

### FR1: Gemini API Integration
- Integrate Google Gemini API for all AI operations
- Async job queue (`ai_jobs` table) for long-running operations
- Retry logic and error handling
- Cost tracking per operation type
- Fallback to manual processes if AI unavailable

### FR2: Facilitator Screening
- Extract and analyze application materials
- Generate qualification score (0-100)
- Expertise assessment per subject
- Recommendations for admin review
- Track AI recommendation vs. final decision (for model improvement)

### FR3: Course Intelligence
- Extract competencies from course description/materials
- Generate learning objectives (Bloom's taxonomy)
- Identify prerequisites
- Estimate difficulty and duration
- Map to job roles
- Instructor review/edit interface

### FR4: Assessment Generation
- Generate diagnostic questions (10-20 questions)
- Generate CAT 1 questions (15-25 questions)
- Generate CAT 2 questions (20-30 questions)
- Include difficulty scoring, Bloom's level, distractor analysis
- Quality validation before release
- Instructor review and edit capability

### FR5: Intelligent Feedback
- Analyze student responses for misconceptions
- Generate personalized feedback per question
- Identify competency gaps
- Recommend remediation resources
- Generate study guides

### FR6: Content QA
- Readability analysis
- Completeness check (objectives vs. content)
- Consistency validation
- Accessibility audit
- Bias detection
- Accuracy check (fact-checking)

### FR7: Tutoring & Hints
- Generate progressive hints (level 1, 2, 3)
- Concept explanations (alternative approach)
- Worked examples
- Prerequisite checks
- Escalation to instructor

### FR8: Adaptive Pathways
- Track learner progress per competency
- Recommend next steps (advancement, remediation, enrichment)
- Alert facilitators for off-pace learners
- Personalized curriculum updates

---

## Technical Requirements

### TR1: API Integration
- Use Google Cloud Vertex AI or Gemini API directly
- Rate limiting: <500 requests/minute (adjust per quota)
- Retry strategy: exponential backoff (3-5 retries)
- Cost budget: Track and alert if exceeding threshold
- Latency: <30s for synchronous operations, queue async for >30s

### TR2: Data Handling
- Store AI prompts in `ai_jobs` for audit trail
- Classify sensitive data (learner responses, instructor applications)
- No learner PII sent to Gemini without consent
- Anonymize data where possible

### TR3: Quality & Safety
- All generated assessments reviewed by instructor before use
- Content moderation: Flag inappropriate generated content
- Bias testing: Audit assessments for fairness
- Uncertainty handling: Show confidence scores, require human review for low-confidence outputs
- Appeal process: Learners can flag incorrect AI feedback

### TR4: Integration Points
- `src/lib/ai-services/` — Gemini API wrapper functions
- `src/lib/assessment-generation.ts` — Assessment generation logic
- `src/lib/content-qa.ts` — Content audit logic
- `src/lib/feedback-generation.ts` — Feedback generation logic
- `src/lib/facilitator-screening.ts` — Screening logic
- Supabase triggers for async job management
- Supabase `ai_jobs` table for job queue

### TR5: Monitoring
- Log all AI operations (operation, tokens used, cost, result)
- Alert on failures or anomalies
- Dashboard: Cost tracking, operation types, error rates
- Model performance: Track where AI recommendations differ from human review

---

## Non-Functional Requirements

### NFR1: Performance
- Assessment generation: <60s (async job)
- Content analysis: <90s (async job)
- Feedback generation: <30s (synchronous, shown to learner)
- Hints generation: <10s (synchronous, shown to learner)
- Facilitator screening: <120s (async job)

### NFR2: Reliability
- 99.5% uptime (fallback if Gemini API down: revert to manual assessment creation)
- Graceful degradation (no feature broken if AI unavailable)
- Data persistence (all AI operations logged)

### NFR3: Security
- API keys stored in Supabase secrets
- All requests use HTTPS
- No sensitive data in prompt logs (unless required for debugging)
- Access control: Only instructors can trigger assessment generation; only facilitators can view AI screening

### NFR4: Scalability
- Support 1000+ concurrent users
- Queue-based processing for batch operations
- Caching of generated assessments (don't regenerate identical requests)

### NFR5: Compliance
- Transparency: Disclose AI use to learners
- Appeal process: Learners can request human review
- Data retention: Delete AI-generated prompts after 90 days
- Audit trail: All AI decisions logged and traceable

---

## Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Assessment generation time | <60s for async | Time logs |
| Instructor satisfaction with AI assessments | 4/5+ | Survey after use |
| Learner satisfaction with AI feedback | 4/5+ | Survey after assessment |
| Assessment quality (instructor review pass rate) | >85% | % passing initial review |
| Facilitation support time reduced | -40% | Before/after time tracking |
| Learner completion rate improvement | +20% | Cohort comparison |
| Content QA issues caught by AI | >90% | Detected issues / total issues |
| Cost per assessment generated | <$0.10 | API cost tracking |

---

## Phased Rollout

### Phase 1: Foundation (Week 1-2)
- Gemini API integration + job queue setup
- Assessment generation (diagnostic only)
- Instructor review UI for generated assessments
- Testing and quality validation

### Phase 2: Expansion (Week 3-4)
- CAT 1 and CAT 2 generation
- Facilitator screening integration
- Course intelligence extraction
- Content QA audit

### Phase 3: Intelligence (Week 5-6)
- Personalized feedback generation
- Intelligent tutoring (hints, explanations)
- Adaptive learning paths
- Monitoring dashboard

### Phase 4: Optimization (Week 7+)
- Fine-tuning prompts based on feedback
- Cost optimization
- User feedback integration
- Continuous improvement cycle

---

## Risks & Mitigation

| Risk | Mitigation |
|------|-----------|
| AI generates poor quality assessments | Instructor review before use; quality validation checklist; feedback loop to improve prompts |
| Cost overruns | Budget caps; rate limiting; usage alerts; cost dashboard |
| Learner data privacy concerns | Anonymization; transparency disclosure; opt-out option; audit trail |
| API downtime | Fallback to manual processes; offline assessment templates; graceful error messages |
| Bias in AI feedback | Bias testing; diverse question coverage; human review; appeal process |
| Facilitator misled by AI screening | AI is recommendation only; human review required; track disagreements for model improvement |

