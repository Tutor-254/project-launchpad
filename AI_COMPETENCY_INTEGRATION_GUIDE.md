# AI-Powered Competency Intelligence — Integration Guide

## How AI Integrates with Existing Competency Framework

This document shows how the new **AI-Powered Competency Intelligence** spec integrates with the **Competency Framework & Mastery Learning** spec completed earlier.

---

## Architecture: Two Integrated Layers

```
┌─────────────────────────────────────────────────────────────────┐
│                   LAYER 2: AI Intelligence                      │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Gemini API Services                                     │   │
│  │  - Assessment Generation                                │   │
│  │  - Feedback Generation                                  │   │
│  │  - Facilitator Screening                                │   │
│  │  - Content QA                                           │   │
│  │  - Course Intelligence                                  │   │
│  │  - Tutoring & Hints                                     │   │
│  └────────────┬─────────────────────────────────────────────┘   │
│               │ (Enhances)                                       │
├───────────────┼──────────────────────────────────────────────────┤
│                   LAYER 1: Competency Framework                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Core Components (Existing - Phase 1-2)                 │   │
│  │  - Competencies (definition, observable behaviors)      │   │
│  │  - Assessments (tests, rubrics, grading)                │   │
│  │  - Projects (submission, evaluation)                    │   │
│  │  - Badges (earned on mastery)                           │   │
│  │  - Learner Pathways (personalized progression)          │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Integration Points

### 1. **Assessment Generation Integration**

**Before (Phase 1-2)**: Instructors manually create assessment questions
```
Instructor (Manual)
  ↓
Create competency assessment
  ├─ Title, description
  ├─ Link to competency
  ├─ Manually write questions
  ├─ Manually define correct answers
  ├─ Manually set difficulty/Bloom's level
  ↓
Assessment ready (time: 2-3 hours per assessment)
```

**After (AI Integration)**: Instructors use AI to generate, then review
```
Instructor (AI-Assisted)
  ↓
Click "Generate Assessment"
  ├─ Select competencies
  ├─ Select difficulty level
  ├─ Select assessment type (diagnostic/CAT1/CAT2)
  ↓
[AI Job Created] → Gemini API generates questions
  ├─ 10-30 questions with metadata
  ├─ Difficulty scores
  ├─ Bloom's levels
  ├─ Distractor analysis
  ↓
Quality validation
  ├─ Check Bloom's distribution
  ├─ Verify competency coverage
  ├─ Validate clarity and correctness
  ↓
Instructor reviews and approves
  ├─ Can edit/delete/regenerate questions
  ├─ Can publish or discard
  ↓
Assessment ready (time: 10-15 minutes per assessment)
```

**Impact**: 85-90% time savings

---

### 2. **Feedback Generation Integration**

**Before (Phase 1-2)**: Generic feedback based on scores
```
Learner submits assessment
  ↓
System calculates score
  ↓
Feedback: "You scored 62%. You passed/failed."
  (Generic message, no insight into why)
```

**After (AI Integration)**: Personalized feedback with misconception analysis
```
Learner submits assessment
  ↓
[AI Job Created] → Gemini API analyzes responses
  ├─ Per-question analysis
  ├─ Misconception identification
  ├─ Competency gap detection
  ├─ Resource recommendations
  ├─ Study guide generation
  ↓
Learner sees:
  ├─ Score and percentage
  ├─ Question-by-question feedback
  │  "You selected B (incorrect). Common misconception: ...
  │   The correct answer is A because..."
  ├─ Gap analysis
  │  "You need to focus on: [Competency X]"
  ├─ Study guide (AI-generated)
  ├─ Next steps and resources
  ├─ Progressive hints (click for help)
  ↓
System updates learner pathway
  ├─ Recommends remediation if gaps detected
  ├─ Adapts next competency based on readiness
```

**Impact**: Higher engagement, faster learning, reduced support requests

---

### 3. **Assessment-Rubric-Badge Workflow**

**The Complete Flow** (Phase 1 + AI Integration):

```
Student takes Knowledge Assessment (AI-Generated)
  ↓
Receives personalized feedback (AI-Generated)
  ├─ Passes? → Continue to project
  ├─ Fails? → Receive remediation resources (AI-Suggested)
  │          Retry after cooldown
  ↓
Student submits project (Project Submission Form - Phase 2)
  ↓
Instructor grades using rubric (Manual today, AI-Assisted future)
  ├─ Rubric scores entered
  ├─ Auto-calculation of total score
  ├─ Generate feedback (AI-Powered - Phase 3)
  ↓
Both assessment AND project passed?
  ├─ YES → Badge issued automatically
  │        Badge image generated (SVG)
  │        Stored in `competency_badges` table
  ├─ NO → Recommend remediation
  ↓
Badge available in:
  ├─ Learner profile (`/certificates/competency-profile`)
  ├─ Public verification page (`/verify/badge/$code`)
  ├─ Share on social media
  ↓
Learner can export portfolio (all badges, skills, evidence)
```

---

### 4. **Facilitator Screening Integration**

**Existing (Phase 1)**: Manual application review

**With AI (New)**: AI-assisted screening
```
Instructor applies at /teach
  ↓
Submits application with:
  ├─ Educational background
  ├─ Teaching experience summary
  ├─ Resume/CV
  ├─ Subject expertise
  ├─ Teaching materials (optional)
  ↓
[AI Job Created] → Gemini API evaluates
  ├─ Expertise level per subject
  ├─ Teaching competency score (0-100)
  ├─ Content quality score (if materials provided)
  ├─ Overall qualification score (0-100)
  ├─ Recommendation: approve/reject/request-more-info
  ├─ Confidence in recommendation (0-1)
  ├─ Reasoning for recommendation
  ↓
Admin reviews at `/admin/facilitator-screening`
  ├─ Sees AI recommendation + confidence
  ├─ Sees full application and AI analysis
  ├─ Can approve, reject, or request more info
  ├─ Submits final decision
  ↓
System tracks:
  ├─ Did AI recommend approve? → Did admin approve?
  ├─ Uses disagreements to improve prompts
  ├─ Monthly accuracy report to stakeholders
```

**Impact**: Faster screening, consistent criteria, bias mitigation

---

### 5. **Course Intelligence Integration**

**Existing (Phase 1)**: Manual competency definition

**With AI (New)**: AI-assisted setup
```
Instructor creates course
  ↓
Uploads course description and materials
  ↓
Clicks "Analyze Course Materials"
  ↓
[AI Job Created] → Gemini API extracts:
  ├─ Competencies (observable_behaviors, success_criteria)
  ├─ Learning objectives (with Bloom's levels)
  ├─ Prerequisites
  ├─ Estimated difficulty & duration
  ├─ Key topics
  ├─ Related job skills
  ├─ Potential job roles
  ↓
Instructor reviews extracted data at `/instructor/$courseId/setup/ai-analysis`
  ├─ Can approve suggestions
  ├─ Can edit (modify descriptions, etc.)
  ├─ Can reject (manually define instead)
  ├─ Creates competencies in database
  ↓
Competencies now populate course framework
  ├─ Available for assessment generation
  ├─ Available for learner progress tracking
  ├─ Available for badge issuance
```

**Impact**: 60% faster course setup, consistent competency definitions

---

### 6. **Learner Pathway Adaptation**

**Existing (Phase 1)**: Static pathway based on diagnostic score

**With AI (New)**: Dynamic adaptation based on performance
```
Diagnostic Assessment
  ↓
Learner pathway generated (existing logic)
  ├─ Which sections to skip
  ├─ Which prerequisites to review
  ↓
Learner completes competency assessments
  ↓
[AI Analysis]
  ├─ Competency gaps identified (from feedback generation)
  ├─ Learning pace analyzed (fast/on-pace/struggling)
  ├─ Time-to-mastery estimated
  ↓
Pathway updated dynamically:
  ├─ Fast learner → Add enrichment activities, stretch goals
  ├─ On-pace → Proceed as planned
  ├─ Struggling → Add remediation, slow pace, extra support
  ├─ Specific gaps → Recommend targeted micro-lessons
  ↓
Facilitator dashboard shows:
  ├─ Learner cohorts by pace
  ├─ At-risk learners (with alerts)
  ├─ Recommended interventions (from AI analysis)
```

**Impact**: Higher completion rates, personalized support, early intervention

---

## Data Flow: Complete Example

```
STEP 1: Course Setup
─────────────────────
Instructor uploads course syllabus
  ↓ AI extracts competencies
Competency Framework stores: {
  id: "api-design",
  title: "API Design",
  observable_behaviors: [...],
  success_criteria: "..."
}

STEP 2: Assessment Creation
─────────────────────────────
Instructor selects competency "api-design"
  ↓ AI generates questions
Questions stored in `competency_assessments` with `ai_generated_assessments` metadata

STEP 3: Learner Takes Assessment
───────────────────────────────────
Learner answers questions
  ↓ Submitted to `assessment_attempts`
Assessment Submission System scores answers

STEP 4: AI Feedback
────────────────────
[AI Job] Generated Feedback
  ├─ Identifies misconceptions
  ├─ Generates personalized feedback
  ├─ Stored in `ai_feedback_cache`
  ├─ Stored with `assessment_attempts`

STEP 5: Gap Analysis
─────────────────────
From feedback, system detects gaps
  ↓ Updates `learner_pathways`
  ├─ Recommends remediation
  ├─ Suggests next competency
  ├─ Alerts facilitator if struggling

STEP 6: Project Submission
───────────────────────────
Learner submits project
  ↓ Stored in `project_submissions`

STEP 7: Grading & Badge
────────────────────────
Instructor grades (or AI grades) in future
  ↓ Stored in `project_grades`

STEP 8: Badge Issuance
──────────────────────
Both assessment AND project passed?
  ✓ YES → Badge issued
    └─ Stored in `competency_badges`
    └─ Badge image generated (SVG)
    └─ Available in learner profile
    └─ Shareable on social media
  ✗ NO → Recommend remediation
    └─ Suggest next steps
    └─ Alert facilitator
```

---

## Database Integration

### New Tables (AI Intelligence)
```
ai_generated_assessments
  ├─ assessment_id → competency_assessments.id
  ├─ ai_job_id → ai_jobs.id
  ├─ quality_score (0-1)
  ├─ instructor_approved (boolean)
  └─ modifications (JSON)

ai_feedback_cache
  ├─ attempt_id → assessment_attempts.id
  ├─ ai_job_id → ai_jobs.id
  ├─ feedback (JSON: personalized + gap analysis)
  ├─ confidence_score (0-1)
  └─ created_at

facilitator_application_analysis
  ├─ application_id → facilitator_applications.id
  ├─ ai_job_id → ai_jobs.id
  ├─ qualification_score (0-100)
  ├─ recommendation (approve/reject/more-info)
  ├─ recommendation_confidence (0-1)
  └─ admin_decision (set by human)

course_ai_analysis
  ├─ course_id → courses.id
  ├─ ai_job_id → ai_jobs.id
  ├─ extracted_competencies (JSON)
  ├─ extracted_objectives (JSON)
  ├─ instructor_reviewed (boolean)
  └─ instructor_modifications (JSON)

ai_hints_cache
  ├─ question_id → competency_assessment_questions.id
  ├─ hint_level (1, 2, or 3)
  ├─ hint_text (string)
  └─ learner_feedback (0-5 stars)
```

### Existing Tables (Enhanced by AI)
```
competency_assessments
  ├─ NOW linked to ai_generated_assessments
  ├─ AI can auto-generate assessment details
  └─ AI validates before instructor approval

assessment_attempts
  ├─ NOW linked to ai_feedback_cache
  ├─ AI generates personalized feedback on submission
  └─ Feedback shown to learner automatically

learner_pathways
  ├─ NOW dynamically updated by AI analysis
  ├─ AI recommends next competencies
  ├─ AI adapts pathway based on performance
  └─ Facilitators see AI-recommended interventions
```

---

## User Experience: Before vs. After

### Instructor Experience

**Before (Phase 1-2)**:
- Manual competency definition: 1-2 hours
- Manual assessment creation: 2-3 hours per assessment
- Manual content review: Ad-hoc, time-consuming
- Assessment quality: Varies by instructor
- Facilitation support: Manual feedback review

**After (With AI)**:
- AI-assisted competency extraction: 15-30 min (from materials)
- AI-generated assessments: 10-15 min (review + approve)
- Automated content audit: 30 min (initial setup, then continuous)
- Consistent quality: AI validation + human review
- Automated feedback generation: Learners supported 24/7

---

### Learner Experience

**Before (Phase 1-2)**:
- Generic feedback ("You scored 62%")
- Wait for instructor to provide detailed feedback
- One-size-fits-all curriculum
- Limited support outside of office hours
- Unclear what to do next

**After (With AI)**:
- Personalized feedback with misconception analysis
- Immediate detailed feedback on submission
- Adaptive curriculum (customized to pace and gaps)
- 24/7 tutoring support (hints, explanations)
- Clear next steps and resources
- Faster learning cycle, higher engagement

---

### Facilitator/Admin Experience

**Before**:
- Manual screening of instructor applications
- Manual review of course quality
- Manual identification of struggling learners
- Manual assignment of remediation

**After**:
- AI-assisted screening with recommendations
- Automated content audit with suggestions
- Dashboard alerts for at-risk learners
- AI-recommended interventions
- Time to focus on human support, not administrative tasks

---

## Implementation Timeline

### Week 1-2: Foundation (Parallel with existing Phase 3)
- Gemini API setup
- Job queue infrastructure
- Database schema

### Week 3-4: Core Services (Parallel with existing Phase 4)
- Assessment generation
- Feedback generation
- Facilitator screening

### Week 5: Integration (Parallel with existing Phase 5)
- Hook up AI services to existing workflows
- Background job processing
- Trigger setup

### Week 6-8: UI & Launch (After existing Phase 4)
- UI components
- Monitoring
- Testing & launch

---

## Costs & ROI

### Implementation Cost
- Development: 80-100 hours (~$8,000-12,000 at $100/hour)
- Testing & QA: 20-30 hours (~$2,000-3,000)
- Deployment & monitoring: 10-15 hours (~$1,000-1,500)
- **Total**: ~$11,000-16,500

### Monthly Operating Costs (Gemini API)
- Pilot (100 assessments): ~$15-50/month
- Growth (500+ learners): ~$100-300/month
- Scale (1,000+ learners): ~$500-1,000/month

### ROI (Estimated)
- **Instructor time savings**: 60-80% on course setup → $5,000-10,000/year per instructor
- **Facilitator time savings**: 40-50% on support → $10,000-15,000/year per facilitator
- **Learner retention improvement**: +20% completion → $20,000-50,000/year in additional revenue
- **API costs**: -$200-300/month
- **Break-even**: 2-4 months (depending on scale)

---

## Conclusion

The **AI-Powered Competency Intelligence** spec seamlessly integrates with the existing **Competency Framework** (Phase 1-2) to create a **complete, AI-enhanced intelligent learning system**:

1. **Enhances** existing assessment and feedback workflows
2. **Accelerates** course setup and competency definition
3. **Improves** content quality through automated audits
4. **Personalizes** learning paths and support
5. **Scales** instructor-led instruction with AI assistance
6. **Measures** and continuously improves system performance

The two specs work together:
- **Phase 1-2** provides the foundation (competencies, assessments, grading, badges)
- **AI Spec** provides the intelligence (generation, feedback, adaptation, screening)

Together, they transform Arcane into a **sophisticated, AI-powered skills mastery platform** that benefits instructors, learners, and the organization.

