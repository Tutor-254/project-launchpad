# Tasks: AI-Powered Competency Intelligence

## Task List

### Phase 1: Foundation & Setup

- [-] 1. Gemini API Integration & Configuration
  - [ ] 1.1 Create Google Cloud project and enable Gemini API
  - [ ] 1.2 Configure authentication (API key or service account)
  - [ ] 1.3 Set up rate limiting (500 req/min) and quota monitoring
  - [x] 1.4 Create `src/lib/ai-services/gemini-client.ts` with core API wrapper
  - [x] 1.5 Implement retry logic with exponential backoff (3-5 retries)
  - [x] 1.6 Add cost tracking and logging for all API calls
  - [x] 1.7 Create environment variables: `GEMINI_API_KEY`, `GEMINI_MODEL`, `GEMINI_COST_LIMIT_USD`
  - [ ] 1.8 Add secrets to Supabase/environment
  - [ ] 1.9 Test API connectivity and error handling

- [-] 2. AI Jobs Queue Setup
  - [ ] 2.1 Create `ai_jobs` table schema (already exists, verify structure)
  - [ ] 2.2 Create `ai_generated_assessments` table for assessment metadata
  - [ ] 2.3 Create `ai_feedback_cache` table for feedback storage
  - [ ] 2.4 Create `facilitator_application_analysis` table for screening results
  - [ ] 2.5 Create `course_ai_analysis` table for course intelligence
  - [ ] 2.6 Create `ai_hints_cache` table for tutoring hints
  - [ ] 2.7 Add indexes on job tables for query performance
  - [ ] 2.8 Enable RLS on all new tables with appropriate policies
  - [ ] 2.9 Create database triggers for job status updates
  - [ ] 2.10 Set up Supabase Edge Function for background job processing

- [ ] 3. TypeScript Types & Interfaces
  - [ ] 3.1 Create `src/types/ai-services.ts` with all type definitions
  - [ ] 3.2 Define GeminiOptions, GeminiResponse, assessment generation types
  - [ ] 3.3 Define feedback generation types
  - [ ] 3.4 Define facilitator screening types
  - [ ] 3.5 Define course intelligence types
  - [ ] 3.6 Add types to `src/integrations/supabase/types.ts` for new tables
  - [ ] 3.7 Create Zod schemas for JSON validation from Gemini

### Phase 2: Core AI Services

- [ ] 4. Gemini Client Implementation
  - [ ] 4.1 Implement `callGemini()` function for basic API calls
  - [ ] 4.2 Implement `parseGeminiJson<T>()` function with schema validation
  - [ ] 4.3 Add structured output support (if available in Gemini)
  - [ ] 4.4 Implement token counting for cost estimation
  - [ ] 4.5 Add logging and observability
  - [ ] 4.6 Implement fallback/graceful degradation
  - [ ] 4.7 Add unit tests for Gemini client

- [x] 5. Assessment Generation Service
  - [ ] 5.1 Create `src/lib/ai-services/assessment-generation.ts`
  - [ ] 5.2 Implement `generateDiagnosticQuestions()` function
    - [ ] 5.2a Create diagnostic assessment prompt template
    - [ ] 5.2b Generate 10-20 questions with mix of types
    - [ ] 5.2c Include difficulty scoring and Bloom's levels
    - [ ] 5.2d Include distractor analysis
  - [ ] 5.3 Implement `generateCAT1Questions()` function
    - [ ] 5.3a Create CAT 1 prompt template
    - [ ] 5.3b Generate 15-25 questions (formative assessment)
    - [ ] 5.3c Progressive difficulty (easy to hard)
    - [ ] 5.3d Mix of question types
  - [ ] 5.4 Implement `generateCAT2Questions()` function
    - [ ] 5.4a Create CAT 2 prompt template
    - [ ] 5.4b Generate 20-30 questions (summative assessment)
    - [ ] 5.4c Higher-order thinking questions
    - [ ] 5.4d Integration questions across competencies
  - [ ] 5.5 Implement `validateAssessmentQuality()` function
    - [ ] 5.5a Check Bloom's level distribution
    - [ ] 5.5b Verify competency coverage
    - [ ] 5.5c Validate difficulty progression
    - [ ] 5.5d Check linguistic clarity (readability score)
    - [ ] 5.5e Verify answer correctness
  - [ ] 5.6 Add unit tests for assessment generation

- [x] 6. Feedback Generation Service
  - [ ] 6.1 Create `src/lib/ai-services/feedback-generation.ts`
  - [ ] 6.2 Implement `generatePersonalizedFeedback()` function
    - [ ] 6.2a Analyze incorrect answers for misconceptions
    - [ ] 6.2b Generate question-by-question feedback
    - [ ] 6.2c Identify competency gaps
    - [ ] 6.2d Provide resources for each gap
    - [ ] 6.2e Rate confidence in feedback
  - [ ] 6.3 Create study guide generation (markdown format)
  - [ ] 6.4 Add caching to avoid regenerating same feedback
  - [ ] 6.5 Add unit tests for feedback generation

- [ ] 7. Facilitator Screening Service
  - [ ] 7.1 Create `src/lib/ai-services/facilitator-screening.ts`
  - [ ] 7.2 Implement `screenFacilitator()` function
    - [ ] 7.2a Analyze educational background
    - [ ] 7.2b Assess teaching experience
    - [ ] 7.2c Evaluate subject expertise
    - [ ] 7.2d Rate content quality (if materials provided)
    - [ ] 7.2e Generate qualification score (0-100)
    - [ ] 7.2f Provide recommendation with reasoning
  - [ ] 7.3 Create expertise assessment per subject
  - [ ] 7.4 Generate questions for more info requests
  - [ ] 7.5 Add confidence scoring for recommendations
  - [ ] 7.6 Add unit tests for facilitator screening

- [ ] 8. Content QA Service
  - [ ] 8.1 Create `src/lib/ai-services/content-qa.ts`
  - [ ] 8.2 Implement `auditContentQuality()` function
    - [ ] 8.2a Analyze readability (readability score)
    - [ ] 8.2b Check completeness (objectives vs. content)
    - [ ] 8.2c Validate consistency (terminology, tone)
    - [ ] 8.2d Check alignment (assessments vs. content)
    - [ ] 8.2e Audit accessibility
    - [ ] 8.2f Detect potential bias
    - [ ] 8.2g Fact-check accuracy (if appropriate)
  - [ ] 8.3 Generate structured issues report
  - [ ] 8.4 Provide actionable recommendations
  - [ ] 8.5 Add unit tests for content QA

- [ ] 9. Course Intelligence Service
  - [ ] 9.1 Create `src/lib/ai-services/course-intelligence.ts`
  - [ ] 9.2 Implement `extractCourseIntelligence()` function
    - [ ] 9.2a Extract competencies from course materials
    - [ ] 9.2b Generate learning objectives with Bloom's levels
    - [ ] 9.2c Identify prerequisites
    - [ ] 9.2d Estimate difficulty and duration
    - [ ] 9.2e Extract key topics (hierarchical)
    - [ ] 9.2f Identify related skills
    - [ ] 9.2g Map to job roles
  - [ ] 9.3 Structure output with confidence scores
  - [ ] 9.4 Add unit tests for course intelligence

- [ ] 10. Tutoring & Hints Service
  - [ ] 10.1 Create `src/lib/ai-services/tutoring-service.ts`
  - [ ] 10.2 Implement `generateProgressiveHints()` function
    - [ ] 10.2a Generate level 1 hint (nudge without answer)
    - [ ] 10.2b Generate level 2 hint (strategy hint)
    - [ ] 10.2c Generate level 3 hint (partial solution)
  - [ ] 10.3 Implement `explainConcept()` function (alternative explanation)
  - [ ] 10.4 Generate worked examples
  - [ ] 10.5 Check prerequisite understanding
  - [ ] 10.6 Add unit tests for tutoring service

### Phase 3: Business Logic Integration

- [ ] 11. Assessment Generation Business Logic
  - [ ] 11.1 Create `src/lib/assessment-generation-ai.ts`
  - [ ] 11.2 Implement `generateAssessmentWithAI()` function
    - [ ] 11.2a Create AI job in queue
    - [ ] 11.2b Call Gemini to generate questions
    - [ ] 11.2c Validate quality (regenerate if poor)
    - [ ] 11.2d Store questions in database
    - [ ] 11.2e Mark for instructor review
    - [ ] 11.2f Notify instructor
  - [ ] 11.3 Implement fallback if AI unavailable
  - [ ] 11.4 Add error handling and logging
  - [ ] 11.5 Add integration tests

- [ ] 12. Feedback Generation Business Logic
  - [ ] 12.1 Create `src/lib/feedback-generation-ai.ts`
  - [ ] 12.2 Implement `generateAssessmentFeedback()` function
    - [ ] 12.2a Create AI job in queue
    - [ ] 12.2b Fetch assessment attempt data
    - [ ] 12.2c Call Gemini to generate feedback
    - [ ] 12.2d Cache feedback results
    - [ ] 12.2e Update attempt with feedback
    - [ ] 12.2f Update learner pathway if gaps detected
  - [ ] 12.3 Implement trigger for auto-generation on submission
  - [ ] 12.4 Add error handling and logging
  - [ ] 12.5 Add integration tests

- [ ] 13. Facilitator Screening Business Logic
  - [ ] 13.1 Create `src/lib/facilitator-screening-ai.ts`
  - [ ] 13.2 Implement `screenFacilitatorApplication()` function
    - [ ] 13.2a Create AI job in queue
    - [ ] 13.2b Extract application data
    - [ ] 13.2c Call Gemini for screening
    - [ ] 13.2d Store screening analysis
    - [ ] 13.2e Notify admin with recommendations
  - [ ] 13.3 Implement admin review interface support
  - [ ] 13.4 Track AI recommendation vs. final decision
  - [ ] 13.5 Add feedback loop for model improvement
  - [ ] 13.6 Add error handling and logging
  - [ ] 13.7 Add integration tests

- [ ] 14. Course Intelligence Business Logic
  - [ ] 14.1 Create `src/lib/course-intelligence-ai.ts`
  - [ ] 14.2 Implement `extractCourseCompetencies()` function
    - [ ] 14.2a Create AI job in queue
    - [ ] 14.2b Extract competencies from course materials
    - [ ] 14.2c Store extracted data
    - [ ] 14.2d Present to instructor for review
  - [ ] 14.3 Implement instructor review/edit workflow
  - [ ] 14.4 Store final competency definitions
  - [ ] 14.5 Add error handling and logging
  - [ ] 14.6 Add integration tests

- [ ] 15. Background Job Processing
  - [ ] 15.1 Create Supabase Edge Function for job processing
  - [ ] 15.2 Implement job queue polling
  - [ ] 15.3 Implement job execution by type
  - [ ] 15.4 Implement error handling and retry logic
  - [ ] 15.5 Implement cost tracking and alerts
  - [ ] 15.6 Add logging and observability
  - [ ] 15.7 Add scheduled trigger (every 5-10 minutes)

### Phase 4: UI Components & Routes

- [ ] 16. Assessment Generation UI
  - [ ] 16.1 Create `src/components/ai-assessment-generator.tsx`
    - [ ] 16.1a Input form (competencies, difficulty, type)
    - [ ] 16.1b Generation status with progress
    - [ ] 16.1c Preview of generated questions
    - [ ] 16.1d Quality score display
    - [ ] 16.1e Edit interface for questions
    - [ ] 16.1f Deploy/approve button
  - [ ] 16.2 Create `/instructor/$courseId/assessments/generate` route
  - [ ] 16.3 Add instructor review interface
  - [ ] 16.4 Add component tests

- [ ] 17. Facilitator Screening Dashboard
  - [ ] 17.1 Create `src/components/facilitator-screening-dashboard.tsx`
    - [ ] 17.1a Queue of pending applications
    - [ ] 17.1b AI screening report display
    - [ ] 17.1c Recommendation with confidence
    - [ ] 17.1d Expert assessment breakdown
    - [ ] 17.1e Admin decision interface (approve/reject/more-info)
    - [ ] 17.1f Comparison view (AI vs. final decision)
  - [ ] 17.2 Create `/admin/facilitator-screening` route
  - [ ] 17.3 Add search and filter
  - [ ] 17.4 Add component tests

- [ ] 18. Content QA Report UI
  - [ ] 18.1 Create `src/components/content-qa-report.tsx`
    - [ ] 18.1a Summary scores display
    - [ ] 18.1b Issues list by severity
    - [ ] 18.1c Suggestions with examples
    - [ ] 18.1d Export report button
  - [ ] 18.2 Create `/instructor/$courseId/quality-audit` route
  - [ ] 18.3 Add drill-down into specific issues
  - [ ] 18.4 Add component tests

- [ ] 19. Course Intelligence Setup UI
  - [ ] 19.1 Create `src/components/course-intelligence-setup.tsx`
    - [ ] 19.1a Display extracted competencies
    - [ ] 19.1b Display extracted objectives
    - [ ] 19.1c Display difficulty/duration estimates
    - [ ] 19.1d Display job roles mapping
    - [ ] 19.1e Edit interface (approve/reject/modify)
  - [ ] 19.2 Create `/instructor/$courseId/setup/ai-analysis` route
  - [ ] 19.3 Add component tests

- [ ] 20. Learner Feedback Display
  - [ ] 20.1 Create `src/components/assessment-feedback-display.tsx`
    - [ ] 20.1a Question-by-question feedback
    - [ ] 20.1b Gap analysis with recommendations
    - [ ] 20.1c Study guide display
    - [ ] 20.1d Next steps/action items
    - [ ] 20.1e Hints button for each question
  - [ ] 20.2 Create `/learn/$courseId/$assessmentId/feedback` route
  - [ ] 20.3 Add progressive hints display (level 1, 2, 3)
  - [ ] 20.4 Add component tests

- [ ] 21. Hints & Tutoring UI
  - [ ] 21.1 Create `src/components/progressive-hints.tsx`
    - [ ] 21.1a Hint level selector
    - [ ] 21.1b Display hint text
    - [ ] 21.1c Display worked example
    - [ ] 21.1d Prerequisite check
  - [ ] 21.2 Add to assessment UI for learners
  - [ ] 21.3 Add component tests

### Phase 5: Monitoring & Optimization

- [ ] 22. Cost Tracking & Monitoring
  - [ ] 22.1 Create dashboard for API usage
    - [ ] 22.1a Tokens used per day/week/month
    - [ ] 22.1b Cost breakdown by operation type
    - [ ] 22.1c Alerts for unusual usage
  - [ ] 22.2 Create alerts if cost exceeds budget
  - [ ] 22.3 Add per-user tracking for auditing
  - [ ] 22.4 Add cost reporting to admin

- [ ] 23. Job Queue Monitoring
  - [ ] 23.1 Create admin dashboard for job queue
    - [ ] 23.1a Queue stats (pending, processing, completed, failed)
    - [ ] 23.1b Job details (type, age, status)
    - [ ] 23.1c Error logs
    - [ ] 23.1d Manual retry capability
  - [ ] 23.2 Add alerts for stuck jobs
  - [ ] 23.3 Add analytics (avg processing time, success rate)

- [ ] 24. Performance Optimization
  - [ ] 24.1 Implement caching for repeated requests
  - [ ] 24.2 Add Redis caching (if available)
  - [ ] 24.3 Optimize prompt templates for token efficiency
  - [ ] 24.4 Implement result caching strategy
  - [ ] 24.5 Add performance metrics

- [ ] 25. Model Improvement Loop
  - [ ] 25.1 Collect feedback on AI-generated content
    - [ ] 25.1a Instructor ratings on assessments
    - [ ] 25.1b Learner ratings on feedback quality
    - [ ] 25.1c Admin feedback on screening accuracy
  - [ ] 25.2 Track AI recommendation accuracy
  - [ ] 25.3 Periodically analyze and improve prompts
  - [ ] 25.4 A/B test different prompt versions

### Phase 6: Testing & Documentation

- [ ] 26. Unit Tests
  - [ ] 26.1 Test Gemini client (mocked API)
  - [ ] 26.2 Test assessment generation logic
  - [ ] 26.3 Test feedback generation logic
  - [ ] 26.4 Test facilitator screening logic
  - [ ] 26.5 Test course intelligence extraction
  - [ ] 26.6 Test tutoring/hints service
  - [ ] 26.7 Aim for >80% code coverage

- [ ] 27. Integration Tests
  - [ ] 27.1 Test end-to-end assessment generation workflow
  - [ ] 27.2 Test end-to-end feedback generation workflow
  - [ ] 27.3 Test end-to-end facilitator screening workflow
  - [ ] 27.4 Test job queue processing
  - [ ] 27.5 Test error handling and retry logic
  - [ ] 27.6 Test with real Gemini API (sandbox environment)

- [ ] 28. E2E Tests (Optional)
  - [ ] 28.1 Test instructor generates assessment via UI
  - [ ] 28.2 Test learner completes assessment and receives feedback
  - [ ] 28.3 Test admin reviews facilitator screening recommendation
  - [ ] 28.4 Test instructor reviews course intelligence extraction

- [ ] 29. Documentation
  - [ ] 29.1 Create API documentation for AI services
  - [ ] 29.2 Create prompt template documentation
  - [ ] 29.3 Create troubleshooting guide for common issues
  - [ ] 29.4 Create cost estimation guide
  - [ ] 29.5 Create transparency/disclosure for learners (AI use)
  - [ ] 29.6 Create instructor guide for using AI features

- [ ] 30. Security & Compliance
  - [ ] 30.1 Security audit of AI integrations
  - [ ] 30.2 Data privacy review (PII handling)
  - [ ] 30.3 Create data retention policy for AI prompts/results
  - [ ] 30.4 Implement audit logging
  - [ ] 30.5 Create appeal process for learner feedback disputes

---

## Summary

**Total Tasks**: 30 major tasks across 6 phases spanning:
- Gemini API integration (3 tasks)
- Core AI services (7 tasks)
- Business logic (5 tasks)
- UI & routes (6 tasks)
- Monitoring & optimization (4 tasks)
- Testing & documentation (5 tasks)

**Estimated Effort**: 80-100 hours for full implementation

**Priority**:
- P0: Tasks 1-15 (Foundation + core services)
- P1: Tasks 16-21 (UI + integration)
- P2: Tasks 22-25 (Monitoring + optimization)
- P3: Tasks 26-30 (Testing + documentation)

**Prerequisites**:
- Google Cloud project with Gemini API enabled
- API key or service account credentials
- Supabase project with competency framework tables (from Phase 1)
- Understanding of prompting best practices

**Success Criteria**:
- All Gemini API integrations working
- Assessment generation produces quality questions (>85% pass instructor review)
- Feedback generation rated >4/5 by learners
- Facilitator screening recommendations agree with human review >80%
- <5% API failure rate with proper error handling
- Cost per assessment <$0.10
- <1 second latency for hint generation
- 99.5% job queue success rate

