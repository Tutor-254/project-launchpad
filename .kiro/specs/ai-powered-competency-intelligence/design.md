# AI-Powered Competency Intelligence — Design

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     Gemini API (Google Cloud)                   │
└──────────────────────────┬──────────────────────────────────────┘
                           │
           ┌───────────────┼───────────────┐
           │               │               │
      ┌────▼────┐   ┌─────▼──────┐  ┌────▼─────┐
      │ Assessment │   │  Feedback  │  │  Screening│
      │ Generation │   │ Generation │  │   & QA    │
      └────┬────┘   └─────┬──────┘  └────┬─────┘
           │               │             │
      ┌────▼───────────────▼─────────────▼────┐
      │    AI Jobs Queue (Supabase)           │
      │  - Async operations                   │
      │  - Retry logic                        │
      │  - Cost tracking                      │
      └────┬──────────────────────────────────┘
           │
    ┌──────▼──────────────────────────────────────────┐
    │         AI Services Layer (src/lib/ai-services/)│
    │  - Prompt templates                           │
    │  - Response parsing                           │
    │  - Error handling                             │
    └──────┬──────────────────────────────────────────┘
           │
    ┌──────▼──────────────────────────────────────────┐
    │       Business Logic Layer                      │
    │  - Assessment generation                       │
    │  - Feedback analysis                           │
    │  - Content QA                                  │
    │  - Facilitator screening                       │
    └──────┬──────────────────────────────────────────┘
           │
    ┌──────▼──────────────────────────────────────────┐
    │         Data Layer (Supabase)                  │
    │  - competencies_assessments                    │
    │  - assessment_attempts                         │
    │  - ai_jobs (queue)                             │
    │  - ai_feedback_cache                           │
    │  - facilitator_applications                    │
    └──────────────────────────────────────────────────┘
```

---

## Data Model Extensions

### 1. AI Jobs Queue (Existing)

```sql
CREATE TABLE ai_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_type TEXT NOT NULL, -- 'assessment_generation', 'content_qa', 'feedback_generation', etc.
  input_data JSONB NOT NULL,
  result JSONB,
  status TEXT DEFAULT 'queued', -- queued, processing, completed, failed
  error_message TEXT,
  created_at TIMESTAMP DEFAULT now(),
  completed_at TIMESTAMP,
  attempts INT DEFAULT 0,
  max_attempts INT DEFAULT 5,
  cost_cents INT, -- API cost in cents
  created_by UUID REFERENCES profiles(id)
);
```

### 2. AI Assessment Metadata

```sql
CREATE TABLE ai_generated_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID REFERENCES competency_assessments(id),
  ai_job_id UUID REFERENCES ai_jobs(id),
  generation_prompt TEXT, -- Stored for audit
  quality_score FLOAT, -- 0-1, how well assessment meets criteria
  instructor_approved BOOLEAN DEFAULT FALSE,
  instructor_approved_at TIMESTAMP,
  instructor_approved_by UUID REFERENCES profiles(id),
  modifications JSONB, -- Any changes made by instructor
  created_at TIMESTAMP DEFAULT now(),
  UNIQUE(assessment_id) -- One AI generation per assessment
);
```

### 3. AI Feedback Cache

```sql
CREATE TABLE ai_feedback_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id UUID REFERENCES assessment_attempts(id),
  ai_job_id UUID REFERENCES ai_jobs(id),
  feedback JSONB, -- {
  --   personalized_feedback: [{question_id, feedback, explanation}],
  --   gap_analysis: [{competency, gap_level, recommendation}],
  --   study_guide: string,
  --   confidence: {overall: 0-1, per_gap: {...}}
  -- }
  confidence_score FLOAT, -- 0-1, how confident AI is in feedback
  created_at TIMESTAMP DEFAULT now()
);
```

### 4. Facilitator Application AI Analysis

```sql
CREATE TABLE facilitator_application_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID REFERENCES facilitator_applications(id),
  ai_job_id UUID REFERENCES ai_jobs(id),
  qualification_score FLOAT, -- 0-100
  expertise_assessment JSONB, -- {subject: score, confidence}
  teaching_competency_score FLOAT, -- 0-100
  content_quality_score FLOAT, -- 0-100 (if materials provided)
  recommendation TEXT, -- 'approve', 'reject', 'request_more_info'
  recommendation_confidence FLOAT, -- 0-1
  reasoning TEXT, -- Explanation of recommendation
  admin_decision TEXT, -- 'approved', 'rejected', 'pending' (set by human)
  admin_decision_at TIMESTAMP,
  admin_notes TEXT,
  created_at TIMESTAMP DEFAULT now()
);
```

### 5. Course Intelligence Extraction

```sql
CREATE TABLE course_ai_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID REFERENCES courses(id),
  ai_job_id UUID REFERENCES ai_jobs(id),
  extracted_competencies JSONB, -- [{name, description, level}]
  extracted_objectives JSONB, -- [{objective, bloom_level, competency_id}]
  identified_prerequisites JSONB, -- [course_ids]
  estimated_difficulty TEXT, -- 'beginner', 'intermediate', 'advanced'
  estimated_duration_hours INT,
  key_topics JSONB, -- Hierarchical topic structure
  related_skills JSONB, -- [{skill, relevance_score}]
  job_roles JSONB, -- [{role, relevance_score}]
  instructor_reviewed BOOLEAN DEFAULT FALSE,
  instructor_reviewed_at TIMESTAMP,
  instructor_modifications JSONB,
  created_at TIMESTAMP DEFAULT now()
);
```

### 6. AI Tutoring Hints & Explanations

```sql
CREATE TABLE ai_hints_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID REFERENCES competency_assessment_questions(id),
  hint_level INT, -- 1, 2, 3 (progressive hints)
  hint_text TEXT,
  worked_example TEXT,
  prerequisite_concept TEXT,
  generated_at TIMESTAMP DEFAULT now(),
  learner_feedback FLOAT, -- 0-5 stars (was this helpful?)
  UNIQUE(question_id, hint_level)
);
```

---

## API / Service Layer

### Module: `src/lib/ai-services/`

#### 1. Core Gemini Client (`gemini-client.ts`)

```typescript
export interface GeminiOptions {
  temperature?: number; // 0-2 (lower = deterministic)
  maxTokens?: number;
  topK?: number;
  topP?: number;
}

export interface GeminiResponse {
  text: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
  finishReason: string;
}

export async function callGemini(
  prompt: string,
  options?: GeminiOptions
): Promise<GeminiResponse>;

export async function parseGeminiJson<T>(
  prompt: string,
  schema: ZodSchema<T>
): Promise<T>;
```

#### 2. Assessment Generation (`assessment-generation.ts`)

```typescript
export interface AssessmentGenerationInput {
  competencies: Competency[];
  learningObjectives: LearningObjective[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  questionCount: 'diagnostic' | 'cat1' | 'cat2';
  courseContext?: string;
}

export interface GeneratedQuestion {
  text: string;
  type: 'multiple_choice' | 'short_answer' | 'scenario';
  options?: string[];
  correctAnswer: string;
  explanation: string;
  bloomLevel: 'remember' | 'understand' | 'apply' | 'analyze' | 'evaluate' | 'create';
  difficulty: 0-100;
  competencyId: string;
  distractorAnalysis?: {
    [option: string]: string; // Why this is plausible but wrong
  };
}

export async function generateDiagnosticQuestions(
  input: AssessmentGenerationInput
): Promise<GeneratedQuestion[]>;

export async function generateCAT1Questions(
  input: AssessmentGenerationInput
): Promise<GeneratedQuestion[]>;

export async function generateCAT2Questions(
  input: AssessmentGenerationInput
): Promise<GeneratedQuestion[]>;

export async function validateAssessmentQuality(
  questions: GeneratedQuestion[]
): Promise<QualityReport>;
```

#### 3. Feedback Generation (`feedback-generation.ts`)

```typescript
export interface FeedbackInput {
  attemptId: string;
  studentAnswers: Record<string, string>;
  questions: AssessmentQuestion[];
  correctAnswers: Record<string, string>;
  competencies: Competency[];
  priorPerformance?: StudentPerformance[];
}

export interface PersonalizedFeedback {
  questionId: string;
  feedback: string;
  explanation: string;
  misconception?: string;
  relatedConcept?: string;
}

export interface GapAnalysis {
  competencyId: string;
  competencyName: string;
  gapLevel: 'critical' | 'moderate' | 'minor';
  recommendation: string;
  resources: Resource[];
}

export interface FeedbackOutput {
  personalizedFeedback: PersonalizedFeedback[];
  gapAnalysis: GapAnalysis[];
  studyGuide: string;
  nextSteps: string[];
  confidence: {
    overall: number; // 0-1
    perGap: Record<string, number>;
  };
}

export async function generatePersonalizedFeedback(
  input: FeedbackInput
): Promise<FeedbackOutput>;
```

#### 4. Content QA (`content-qa.ts`)

```typescript
export interface ContentQAInput {
  courseDescription: string;
  syllabus?: string;
  lectureTranscripts?: string[];
  assessments?: Assessment[];
  competencies?: Competency[];
}

export interface ContentIssue {
  type: 'clarity' | 'completeness' | 'consistency' | 'alignment' | 'accessibility' | 'bias' | 'accuracy';
  severity: 'critical' | 'warning' | 'info';
  location: string; // Section or lecture reference
  issue: string;
  suggestion: string;
  example?: string;
}

export interface ContentQAReport {
  issues: ContentIssue[];
  readabilityScore: number; // 0-100
  completenessScore: number; // 0-100 (how well content addresses objectives)
  consistencyScore: number; // 0-100
  alignmentScore: number; // 0-100 (assessments vs. content)
  accessibilityScore: number; // 0-100
  biasRiskLevel: 'low' | 'medium' | 'high';
  overallQualityScore: number; // 0-100
  recommendations: string[];
}

export async function auditContentQuality(
  input: ContentQAInput
): Promise<ContentQAReport>;
```

#### 5. Facilitator Screening (`facilitator-screening.ts`)

```typescript
export interface ScreeningInput {
  educationalBackground: string;
  teachingExperienceSummary: string;
  resumeText?: string;
  subjectExpertise: string[];
  teachingMaterials?: string;
  courseOutline?: string;
}

export interface ExpertiseAssessment {
  subject: string;
  experienceLevel: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  score: number; // 0-100
  evidence: string[];
}

export interface ScreeningOutput {
  qualificationScore: number; // 0-100
  expertiseAssessments: ExpertiseAssessment[];
  teachingCompetencyScore: number; // 0-100
  contentQualityScore?: number; // 0-100 (if materials provided)
  recommendation: 'approve' | 'reject' | 'request_more_info';
  recommendationConfidence: number; // 0-1
  reasoning: string;
  recommendedSubjects: string[];
  questionsForApplicant?: string[]; // If requesting more info
}

export async function screenFacilitator(
  input: ScreeningInput
): Promise<ScreeningOutput>;
```

#### 6. Course Intelligence (`course-intelligence.ts`)

```typescript
export interface CourseIntelligenceInput {
  courseDescription: string;
  syllabus?: string;
  lectureContent?: string[];
  instructor_expertise?: string;
}

export interface ExtractedCompetency {
  name: string;
  description: string;
  observable_behaviors: string[];
  success_criteria: string;
  estimated_level: 'beginner' | 'intermediate' | 'advanced';
}

export interface ExtractedObjective {
  text: string;
  bloom_level: string; // remember, understand, apply, analyze, evaluate, create
  competency_id?: string; // Which competency this teaches
}

export interface CourseIntelligenceOutput {
  competencies: ExtractedCompetency[];
  objectives: ExtractedObjective[];
  prerequisites: string[]; // Prerequisite course names
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimated_hours: number;
  topics: {
    name: string;
    subtopics: string[];
    duration_hours: number;
  }[];
  related_skills: Array<{ skill: string; relevance: number }>;
  job_roles: Array<{ role: string; relevance: number }>;
  key_takeaways: string[];
}

export async function extractCourseIntelligence(
  input: CourseIntelligenceInput
): Promise<CourseIntelligenceOutput>;
```

#### 7. Tutoring & Hints (`tutoring-service.ts`)

```typescript
export interface HintInput {
  questionId: string;
  questionText: string;
  correctAnswer: string;
  studentAnswer?: string;
  competency: Competency;
  bloomLevel: string;
}

export interface ProgressiveHint {
  level: 1 | 2 | 3;
  hint: string;
  workedExample?: string;
  prerequisiteCheck?: string;
}

export async function generateProgressiveHints(
  input: HintInput
): Promise<ProgressiveHint[]>;

export async function explainConcept(
  concept: string,
  difficulty: string,
  alternativeApproach?: boolean
): Promise<string>;
```

---

## Business Logic Layer

### Module: `src/lib/assessment-generation.ts` (Enhanced)

```typescript
export async function generateAssessmentWithAI(
  assessmentType: 'diagnostic' | 'cat1' | 'cat2',
  competencies: Competency[],
  courseId: string,
  userId: string
): Promise<Assessment> {
  // 1. Create AI job
  const job = await createAIJob('assessment_generation', {
    assessmentType,
    competencies,
    courseId,
  });

  // 2. Call Gemini to generate questions
  const generatedQuestions = await generateAssessmentQuestions(
    assessmentType,
    competencies
  );

  // 3. Validate quality
  const qualityReport = await validateAssessmentQuality(generatedQuestions);
  if (qualityReport.overallScore < 0.7) {
    // Regenerate if quality is poor
    return generateAssessmentWithAI(assessmentType, competencies, courseId, userId);
  }

  // 4. Store in database
  const assessment = await createAssessment({
    competencies,
    questions: generatedQuestions,
    courseId,
  });

  // 5. Mark AI generation for instructor review
  await markForInstructorReview(assessment.id, job.id);

  // 6. Update job status
  await updateAIJob(job.id, 'completed', { assessmentId: assessment.id });

  return assessment;
}
```

### Module: `src/lib/feedback-generation.ts` (New)

```typescript
export async function generateAssessmentFeedback(
  attemptId: string,
  userId: string
): Promise<FeedbackOutput> {
  // 1. Fetch attempt data
  const attempt = await getAssessmentAttempt(attemptId);
  const assessment = await getAssessment(attempt.assessment_id);
  const questions = await getAssessmentQuestions(assessment.id);
  const correctAnswers = await getCorrectAnswers(assessment.id);
  const competencies = await getCompetencies(assessment.course_id);

  // 2. Create AI job
  const job = await createAIJob('feedback_generation', {
    attemptId,
    studentAnswers: attempt.answers,
  });

  // 3. Generate feedback
  const feedback = await generatePersonalizedFeedback({
    attemptId,
    studentAnswers: attempt.answers,
    questions,
    correctAnswers,
    competencies,
  });

  // 4. Cache feedback
  await cacheFeedback(attemptId, feedback, job.id);

  // 5. Update attempt with feedback
  await updateAttemptFeedback(attemptId, feedback);

  // 6. Update learner pathway if significant gaps detected
  const gaps = feedback.gapAnalysis.filter((g) => g.gapLevel === 'critical');
  if (gaps.length > 0) {
    await updateLearnerPathway(userId, assessment.course_id, gaps);
  }

  return feedback;
}
```

### Module: `src/lib/facilitator-screening.ts` (New)

```typescript
export async function screenFacilitatorApplication(
  applicationId: string,
  adminId: string
): Promise<ScreeningOutput> {
  // 1. Fetch application
  const application = await getApplication(applicationId);

  // 2. Create AI job
  const job = await createAIJob('facilitator_screening', {
    applicationId,
  });

  // 3. Perform screening
  const screening = await screenFacilitator({
    educationalBackground: application.educational_background,
    teachingExperienceSummary: application.experience_summary,
    resumeText: application.resume_text,
    subjectExpertise: application.subject_expertise,
    teachingMaterials: application.materials_text,
  });

  // 4. Store results
  await storeScreeningAnalysis(applicationId, screening, job.id);

  // 5. Notify admin
  await notifyAdminScreeningComplete(applicationId, screening);

  return screening;
}
```

---

## Database Triggers & Functions

### Trigger: Auto-generate feedback on assessment submission

```sql
CREATE OR REPLACE FUNCTION trigger_generate_feedback_on_submission()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.passed IS NOT NULL THEN
    -- Insert into ai_jobs queue
    INSERT INTO ai_jobs (job_type, input_data, created_by)
    VALUES (
      'feedback_generation',
      jsonb_build_object('attempt_id', NEW.id),
      NEW.user_id
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_assessment_attempt_submitted
AFTER UPDATE ON assessment_attempts
FOR EACH ROW
WHEN (OLD.passed IS NULL AND NEW.passed IS NOT NULL)
EXECUTE FUNCTION trigger_generate_feedback_on_submission();
```

### Background Job Processor (Supabase Edge Function)

```typescript
// supabase/functions/process-ai-jobs/index.ts
export async function processAIJobs() {
  // 1. Fetch queued jobs
  const jobs = await getQueuedJobs();

  for (const job of jobs) {
    try {
      // 2. Update status to processing
      await updateJobStatus(job.id, 'processing');

      // 3. Execute job based on type
      let result;
      switch (job.job_type) {
        case 'assessment_generation':
          result = await generateAssessmentQuestions(job.input_data);
          break;
        case 'feedback_generation':
          result = await generateAssessmentFeedback(job.input_data);
          break;
        case 'facilitator_screening':
          result = await screenFacilitator(job.input_data);
          break;
        case 'content_qa':
          result = await auditContentQuality(job.input_data);
          break;
        // ... other job types
      }

      // 4. Store result
      await updateJobStatus(job.id, 'completed', {
        result,
        cost_cents: calculateCost(result),
      });

      // 5. Notify user
      await notifyJobComplete(job.created_by, job.id, result);
    } catch (error) {
      // 6. Handle error with retry
      await updateJobStatus(job.id, 'failed', {
        error: error.message,
        attempts: job.attempts + 1,
      });

      if (job.attempts < job.max_attempts) {
        // Requeue with exponential backoff
        await requeueJob(job.id);
      }
    }
  }
}
```

---

## UI Components & Routes

### 1. Assessment Generation Interface

**Route**: `/instructor/$courseId/assessments/generate`

- Input form (competencies, difficulty, type)
- Generation status with progress bar
- Generated questions preview
- Edit/approve interface
- Quality score display
- Deploy button (publish to course)

### 2. Facilitator Screening Dashboard

**Route**: `/admin/facilitator-screening`

- Application queue (pending, reviewed, approved, rejected)
- AI screening report display
- Recommendation with confidence
- Expert/subject area breakdown
- Admin decision interface (approve/reject/request-more-info)
- Comparison: AI recommendation vs. admin decision

### 3. Content QA Report

**Route**: `/instructor/$courseId/quality-audit`

- Summary scores (readability, completeness, alignment, accessibility)
- Issues list by severity
- Suggestions for improvement
- Export report button

### 4. Course Intelligence Extraction

**Route**: `/instructor/$courseId/setup/ai-analysis`

- Extracted competencies (editable)
- Learning objectives (editable)
- Difficulty and duration estimates
- Job roles mapping
- Review/approve interface

### 5. Learner Feedback Display

**Route**: `/learn/$courseId/$assessmentId/feedback`

- Question-by-question feedback
- Gap analysis with recommendations
- Study guide (AI-generated summary)
- Next steps
- Hints for struggling areas (click for progressive hints)

---

## Prompt Templates

### Assessment Generation Prompt Template

```
You are an expert educator and assessment designer. Generate rigorous, clear, and engaging assessment questions aligned to competencies and learning objectives.

Competencies:
${JSON.stringify(competencies, null, 2)}

Learning Objectives:
${JSON.stringify(objectives, null, 2)}

Assessment Type: ${assessmentType}
Difficulty Level: ${difficulty}
Question Count: ${count}

Requirements:
1. Generate ${count} questions
2. Mix question types: ${types.join(', ')}
3. Each question should:
   - Align to exactly one competency
   - Assess a specific learning objective
   - Have a clear, unambiguous correct answer
   - Include plausible distractors (for multiple choice)
   - Include difficulty rating (0-100)
   - Include Bloom's taxonomy level
4. Validate question clarity and lack of bias
5. Ensure diversity of question topics

Output as JSON array with structure:
{
  "text": "question text",
  "type": "multiple_choice|short_answer|scenario",
  "options": [...],
  "correctAnswer": "...",
  "explanation": "why this is correct",
  "bloomLevel": "remember|understand|apply|analyze|evaluate|create",
  "difficulty": 0-100,
  "competencyId": "...",
  "distractorAnalysis": { "option": "why this is plausible but wrong" }
}

Generate high-quality questions that would be suitable for use in an accredited online course.
```

### Feedback Generation Prompt Template

```
You are an expert educational psychologist and learning scientist. Analyze student responses to assessment questions and generate personalized, actionable feedback.

Assessment Questions:
${JSON.stringify(questions, null, 2)}

Student Answers:
${JSON.stringify(studentAnswers, null, 2)}

Correct Answers:
${JSON.stringify(correctAnswers, null, 2)}

Competencies Assessed:
${JSON.stringify(competencies, null, 2)}

Tasks:
1. For each incorrect answer, identify:
   - The likely misconception
   - Why the student might have chosen this answer
   - The correct understanding needed
2. Identify competency gaps (which competencies need remediation)
3. Provide personalized feedback for each question
4. Generate a study guide for the competencies with gaps
5. Suggest next steps for learning
6. Rate your confidence in the feedback

Output as JSON with structure:
{
  "personalizedFeedback": [
    {
      "questionId": "...",
      "feedback": "personalized feedback",
      "explanation": "explanation of correct answer",
      "misconception": "what the student likely believes",
      "relatedConcept": "related concept to review"
    }
  ],
  "gapAnalysis": [
    {
      "competencyId": "...",
      "competencyName": "...",
      "gapLevel": "critical|moderate|minor",
      "recommendation": "specific action to take",
      "resources": [{ "type": "video|article|practice", "title": "...", "duration": "..." }]
    }
  ],
  "studyGuide": "markdown formatted study guide",
  "nextSteps": ["step 1", "step 2", ...],
  "confidence": { "overall": 0.0-1.0, "perGap": { "competencyId": 0.0-1.0 } }
}

Be specific, constructive, and encouraging. Focus on helping the student understand, not just telling them what's wrong.
```

### Facilitator Screening Prompt Template

```
You are an expert educator and hiring manager. Evaluate a facilitator's qualifications for teaching on this platform.

Application Information:
- Educational Background: ${background}
- Teaching Experience: ${experience}
- Subject Expertise: ${expertise}
- Teaching Materials Quality: ${materialsQuality}

Platform Requirements:
- Must demonstrate subject matter expertise
- Must show evidence of effective teaching
- Must produce high-quality educational content
- Must align with our pedagogical approach (competency-based learning)

Tasks:
1. Assess expertise level (beginner|intermediate|advanced|expert) in each subject
2. Rate teaching competency (0-100)
3. Rate content quality if materials provided (0-100)
4. Provide overall qualification score (0-100)
5. Make recommendation: approve|reject|request_more_info
6. If requesting more info, ask specific clarifying questions

Output as JSON:
{
  "qualificationScore": 0-100,
  "expertiseAssessments": [
    { "subject": "...", "level": "...", "score": 0-100, "evidence": [...] }
  ],
  "teachingCompetencyScore": 0-100,
  "contentQualityScore": 0-100,
  "recommendation": "approve|reject|request_more_info",
  "recommendationConfidence": 0.0-1.0,
  "reasoning": "detailed explanation",
  "recommendedSubjects": ["..."],
  "questionsForApplicant": ["..."]
}

Be fair, evidence-based, and constructive. Highlight strengths while noting areas for development.
```

---

## Implementation Checklist

- [ ] Gemini API integration & credentials setup
- [ ] `ai_jobs` table queue implementation
- [ ] Cost tracking & monitoring
- [ ] Assessment generation (diagnostic, CAT 1, CAT 2)
- [ ] Quality validation for assessments
- [ ] Facilitator screening integration
- [ ] Course intelligence extraction
- [ ] Content QA audit
- [ ] Personalized feedback generation
- [ ] Hints & tutoring service
- [ ] UI components for each feature
- [ ] Instructor review interface
- [ ] Admin dashboard for screening
- [ ] Error handling & graceful degradation
- [ ] Rate limiting & quota management
- [ ] Audit trail & logging
- [ ] User consent & transparency messaging
- [ ] Testing (unit, integration, end-to-end)
- [ ] Documentation & training
- [ ] Launch with monitoring

