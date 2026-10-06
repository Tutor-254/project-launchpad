# Complete System Architecture: Competency Framework + AI Intelligence

## Overview

A comprehensive, two-layer intelligent learning system:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    LAYER 2: AI INTELLIGENCE (NEW)                       │
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────┐    │
│  │                   Gemini API Services                          │    │
│  │                                                                │    │
│  │  ┌─────────────┐  ┌──────────────┐  ┌─────────────────┐      │    │
│  │  │Assessment   │  │ Feedback     │  │Facilitator      │      │    │
│  │  │Generation   │  │ Generation   │  │Screening        │      │    │
│  │  │             │  │              │  │                 │      │    │
│  │  │- Diagnostic │  │- Gap Analysis│  │- Qualification  │      │    │
│  │  │- CAT 1      │  │- Misconcs.   │  │  Score          │      │    │
│  │  │- CAT 2      │  │- Remediation │  │- Expertise      │      │    │
│  │  │- Quality    │  │  Resources   │  │  Assessment     │      │    │
│  │  │  Validation │  │- Study Guide │  │- Recommendation │      │    │
│  │  └─────────────┘  └──────────────┘  └─────────────────┘      │    │
│  │                                                                │    │
│  │  ┌─────────────┐  ┌──────────────┐  ┌─────────────────┐      │    │
│  │  │Content QA   │  │Course        │  │Tutoring &       │      │    │
│  │  │Audit        │  │Intelligence  │  │Hints            │      │    │
│  │  │             │  │              │  │                 │      │    │
│  │  │- Readability│  │- Competency  │  │- Progressive    │      │    │
│  │  │- Alignment  │  │  Extraction  │  │  Hints          │      │    │
│  │  │- Accessbty. │  │- Objectives  │  │- Explanations   │      │    │
│  │  │- Bias Check │  │- Job Skills  │  │- Worked Exmls.  │      │    │
│  │  └─────────────┘  └──────────────┘  └─────────────────┘      │    │
│  │                                                                │    │
│  └────────────────────────────────────────────────────────────────┘    │
│                           ↓ (Enhances)                                  │
├──────────────────────────────────────────────────────────────────────────┤
│              LAYER 1: COMPETENCY FRAMEWORK (EXISTING)                   │
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────┐      │
│  │                Core Competency Management                    │      │
│  │                                                              │      │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────────────┐    │      │
│  │  │Competency  │  │Assessment  │  │Project             │    │      │
│  │  │Definition  │  │Management  │  │Management          │    │      │
│  │  │            │  │            │  │                    │    │      │
│  │  │- Title     │  │- Knowledge │  │- Submission        │    │      │
│  │  │- Behaviors │  │  Tests     │  │  Handling          │    │      │
│  │  │- Criteria  │  │- Mastery   │  │- Rubric Scoring    │    │      │
│  │  │- Prerequisites│- Retry Rules │  │- Grade Recording  │    │      │
│  │  │- Job Roles │  │- Feedback  │  │- Version Tracking  │    │      │
│  │  └────────────┘  └────────────┘  └────────────────────┘    │      │
│  │                                                              │      │
│  │  ┌────────────────────┐  ┌──────────────────────────────┐  │      │
│  │  │Badge Issuance      │  │Learner Pathways             │  │      │
│  │  │                    │  │                              │  │      │
│  │  │- Automatic on      │  │- Dynamic recommendations    │  │      │
│  │  │  Mastery           │  │- Skip sections (advanced)   │  │      │
│  │  │- Unique codes      │  │- Prerequisite courses       │  │      │
│  │  │- SVG generation    │  │- Remediation tracking       │  │      │
│  │  │- Public verification│ │- Adaptive sequencing        │  │      │
│  │  │- Portfolio export  │  │- Progress tracking          │  │      │
│  │  └────────────────────┘  └──────────────────────────────┘  │      │
│  │                                                              │      │
│  └──────────────────────────────────────────────────────────────┘      │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## Complete User Journeys

### Journey 1: Instructor Creates a Competency-Based Course

```
INSTRUCTOR WORKFLOW
═══════════════════════════════════════════════════════════════════

Phase 1: Course Setup (AI-Assisted)
───────────────────────────────────
1. Instructor creates course
   └─ Title, description, target audience

2. [AI] Extract course intelligence
   └─ Upload syllabus/materials
   └─ Gemini extracts:
      ├─ Competencies
      ├─ Learning objectives (Bloom's levels)
      ├─ Prerequisites
      ├─ Estimated difficulty/duration
      └─ Job skills mapping

3. [INSTRUCTOR] Review and approve extracted competencies
   └─ Edit descriptions
   └─ Add/remove competencies
   └─ Validate prerequisites
   └─ Save to database

Phase 2: Assessment Creation (AI-Assisted)
──────────────────────────────────────────
4. Instructor selects competency
   └─ Click "Generate Assessment"

5. [AI] Generate diagnostic assessment
   ├─ Input: Competencies, difficulty
   ├─ Gemini generates: 10-20 questions
   │  ├─ Mix of multiple choice, short answer
   │  ├─ Difficulty scores (0-100)
   │  ├─ Bloom's levels (remember→create)
   │  ├─ Distractor analysis
   │  └─ Explanations for each answer
   └─ Quality validation (>85% pass quality check)

6. [INSTRUCTOR] Review and approve assessment
   ├─ View questions
   ├─ Can edit, delete, regenerate
   ├─ View quality score
   └─ Deploy when ready

7. [AI] Generate CAT 1 (formative) and CAT 2 (summative)
   └─ Same process as diagnostic
   └─ 15-25 questions (CAT 1)
   └─ 20-30 questions (CAT 2)

Phase 3: Rubric & Project Setup (Manual + AI)
─────────────────────────────────────────────
8. Instructor creates project rubric
   ├─ Criteria (e.g., "Code Quality")
   ├─ Point scales
   └─ System auto-calculates total points

9. Instructor creates project brief
   ├─ Title, description
   ├─ Submission instructions
   ├─ Accepted file types
   ├─ Example submission
   └─ Link to rubric

10. [AI] Content QA audit (optional)
    └─ Gemini audits:
       ├─ Readability of instructions
       ├─ Alignment to learning objectives
       ├─ Accessibility considerations
       ├─ Clarity of expectations
       └─ Generate improvement suggestions

Phase 4: Publish Course
──────────────────────
11. Instructor publishes course
    └─ Sets live on platform
    └─ Competencies + Assessments + Projects ready
    └─ Learners can now enroll
```

### Journey 2: Learner Takes Course with AI Support

```
LEARNER WORKFLOW
════════════════════════════════════════════════════════════════

Phase 1: Enrollment & Diagnostic
────────────────────────────────
1. Learner views course
   └─ Sees diagnostic assessment requirement

2. Learner takes diagnostic (AI-generated)
   ├─ 10-20 questions
   ├─ Answers submitted
   └─ Score calculated

3. [AI] Diagnostic analysis
   ├─ Compare score to prerequisites
   ├─ Generate pathway recommendation
   └─ Create learner_pathways record

4. Learner sees diagnostic results
   ├─ Score and percentage
   ├─ Pass/fail status
   ├─ Pathway recommendation
   ├─ List of prerequisite courses (if needed)
   └─ "You're ready!" message (if passed)

5. Learner enrolls in course
   └─ Pathway customized to their level

Phase 2: Competency Assessment
──────────────────────────────
6. Learner completes course content
   └─ Watches lectures
   └─ Reviews materials

7. Learner takes competency assessment (CAT 1)
   ├─ 15-25 AI-generated questions
   ├─ Mix of difficulty levels
   ├─ Answers submitted
   └─ Attempt recorded

8. [AI] Personalized feedback generation
   ├─ Analyze each response
   ├─ Identify misconceptions
   ├─ Detect competency gaps
   ├─ Generate study guide
   ├─ Rate confidence in analysis
   └─ Store in ai_feedback_cache

9. Learner views detailed feedback
   ├─ Question-by-question analysis
   │  "You selected B, but correct answer is A because...
   │   Common misconception: ...
   │   You likely chose B because: ..."
   ├─ Gap analysis
   │  "You need to focus on: [Competency X]"
   ├─ Study guide (AI-generated)
   │  "Key concepts to review: ..."
   ├─ Recommended resources
   ├─ Confidence scores shown
   └─ "Need help?" button for hints

10. Learner clicks "Need help?"
    ├─ Can request hints for specific questions
    └─ [AI] Generates progressive hints:
       ├─ Level 1: "Think about..."
       ├─ Level 2: "Try this approach..."
       └─ Level 3: "Here's a similar solved example..."

11. Learner reviews resources
    ├─ Re-reads materials
    ├─ Reviews study guide
    ├─ Works through practice problems
    └─ After cooldown → ready to retry

12. Learner retakes assessment
    ├─ Completes CAT 1 again
    ├─ Receives new personalized feedback
    ├─ [AI] Adaptive pathway updates
    │  ├─ If still struggling: more remediation recommended
    │  ├─ If improving: ready for project
    │  └─ If excelling: enrichment activities suggested
    └─ Passes? → Move to project

Phase 3: Project Submission & Grading
─────────────────────────────────────
13. Learner submits project
    ├─ Views rubric (read-only)
    ├─ Selects submission type (file/URL/video)
    ├─ Validates and submits
    ├─ Sees confirmation + version number
    └─ Submission stored with version tracking

14. Instructor grades project
    ├─ Views submission
    ├─ Scores against rubric criteria
    ├─ Enters feedback
    └─ Marks as graded

15. [System] Check badge eligibility
    ├─ Assessment passed? ✓
    ├─ Project passed? ✓
    └─ YES → Issue badge!

16. [AI/System] Generate badge
    ├─ Create unique badge_code
    ├─ Generate SVG badge image
    │  (Competency title, learner name, date, issuer)
    ├─ Store signed URL
    └─ Store in competency_badges table

Phase 4: Badge & Portfolio
──────────────────────────
17. Learner receives badge notification
    ├─ Alert: "You earned a badge!"
    ├─ Badge displayed with certificate
    └─ Option to share or add to portfolio

18. Learner views competency profile
    ├─ All earned badges displayed
    ├─ Can click to verify each badge
    ├─ Can see competency details
    └─ Can export skills portfolio (PDF, JSON, LinkedIn share)

19. Learner shares badge
    ├─ Copy verification link
    ├─ Share to LinkedIn, Twitter, WhatsApp, email
    └─ Badge visible at public URL for verification

Phase 5: Adaptive Progression
─────────────────────────────
20. System updates learner pathway
    ├─ Completed competency X
    ├─ Performance analysis:
    │  ├─ Fast learner? → Recommend advanced competencies
    │  ├─ On-pace? → Continue as planned
    │  └─ Struggling? → Extra support + remediation
    ├─ Next recommended competency:
    │  ├─ Check prerequisites
    │  ├─ Consider learner pace
    │  └─ Suggest start date
    └─ Pathway updated in real-time

21. Learner continues through course
    └─ Process repeats for each competency
    └─ [AI] Adapts pathway dynamically
    └─ Facilitator alerted if at-risk
    └─ Complete course → Earn certificate
```

### Journey 3: Admin Reviews Facilitator Application

```
ADMIN/FACILITATOR SCREENING WORKFLOW
════════════════════════════════════════════════════════════════

Phase 1: Instructor Application
───────────────────────────────
1. Instructor (applicant) visits /teach
   └─ Completes onboarding form

2. Applicant submits:
   ├─ Educational background (free text)
   ├─ Teaching experience summary
   ├─ Resume/CV (text or PDF)
   ├─ Subject expertise areas
   ├─ Optional: Sample teaching materials
   └─ Submits application

Phase 2: AI Screening
────────────────────
3. [System] Create AI job
   └─ Job type: "facilitator_screening"

4. [AI] Gemini API evaluates application
   ├─ Analyze educational background
   ├─ Assess teaching experience
   ├─ Evaluate subject expertise
   │  ├─ Extract claimed expertise areas
   │  ├─ Rate expertise level (beginner→expert)
   │  ├─ Score per subject (0-100)
   │  └─ Confidence in rating (0-1)
   ├─ Rate teaching competency (0-100)
   ├─ Rate content quality if materials provided (0-100)
   ├─ Generate overall qualification score (0-100)
   ├─ Make recommendation:
   │  ├─ "APPROVE" (high qualification)
   │  ├─ "REJECT" (low qualification)
   │  └─ "REQUEST_MORE_INFO" (unclear credentials)
   ├─ Rate recommendation confidence (0-1)
   ├─ Provide detailed reasoning
   └─ Store results in facilitator_application_analysis

Phase 3: Admin Review
────────────────────
5. Admin visits /admin/facilitator-screening
   ├─ Sees queue of pending applications
   ├─ Sorts by:
   │  ├─ Newest first
   │  ├─ Highest qualification score
   │  └─ By subject area
   └─ Selects application to review

6. Admin sees AI screening report:
   ├─ Qualification score (0-100)
   ├─ Recommendation with confidence
   ├─ Expertise breakdown per subject
   ├─ Teaching competency score
   ├─ Content quality score (if applicable)
   ├─ Detailed reasoning from AI
   ├─ Full application details
   ├─ Materials preview (if provided)
   └─ Comparison: AI recommendation vs. final decision tracking

7. Admin makes final decision
   ├─ Approves (if AI recommendation aligned)
   ├─ Rejects (if concerns about AI recommendation)
   ├─ Requests more info (ask specific questions)
   └─ Adds admin notes (reason for decision)

Phase 4: Feedback Loop
─────────────────────
8. [System] Tracks AI accuracy
   ├─ Did AI recommend approve? → Did admin approve?
   ├─ Disagreement → Flag for model improvement
   ├─ Accuracy rating (0-1) per decision
   └─ Monthly accuracy report to stakeholders

9. Applicant notified
   ├─ If approved: Congratulations! Welcome onboarded
   ├─ If rejected: Thank you, we're looking for... (feedback)
   └─ If more info requested: Can respond with additional materials

10. Approved instructors
    ├─ Gain "instructor" role
    ├─ Can access /instructor studio
    ├─ Can create courses
    ├─ Can use AI-assisted tools
    └─ Subject expertise noted for course recommendations
```

---

## System Statistics

### After Full Implementation

**Components**:
- 8 AI services (assessment gen, feedback gen, screening, QA, intelligence, tutoring, hints, pathways)
- 20+ UI components (forms, dashboards, displays)
- 15+ database tables (competencies, assessments, projects, badges, pathways, AI metadata, job queue)
- 30+ API endpoints
- 50+ trigger functions and stored procedures

**Capabilities**:
- Generate 1,000s of unique assessments per day
- Provide personalized feedback to 10,000+ learners simultaneously
- Screen instructors in minutes instead of hours
- Audit course content automatically
- Track 100,000+ learner pathways in real-time
- Issue digital badges with verification capability

**Performance**:
- Assessment generation: <60 seconds (async)
- Feedback generation: <30 seconds (sync, shown immediately)
- Hint generation: <10 seconds (sync)
- Screening: <2 minutes (async)
- Content audit: <90 seconds (async)

**Scale**:
- Support 1,000+ concurrent users
- Process 10,000+ assessments per month
- Track 100,000+ competency completions annually
- Issue 50,000+ badges per year

---

## ROI Summary

### Year 1 Impact

**Cost**:
- Development: $11,000-16,500
- AI API (year 1): $2,400-3,600
- **Total Year 1**: $13,400-20,100

**Benefit**:
- Instructor time savings: $15,000-25,000
- Facilitator time savings: $10,000-15,000
- Learner retention improvement: $20,000-50,000
- **Total Year 1**: $45,000-90,000

**ROI**: 220%-570% in Year 1

### Ongoing (Year 2+)

**Annual Cost**: $2,400-3,600 (API only, amortized dev cost)

**Annual Benefit**: $40,000-80,000 (time savings + retention)

**ROI**: 1,100%-3,300% ongoing

---

## Competitive Advantages

1. **Speed**: AI-assisted course creation (60% faster)
2. **Quality**: AI-validated assessments + content audits
3. **Scale**: AI tutor supports unlimited learners 24/7
4. **Personalization**: Adaptive pathways based on performance
5. **Insights**: AI-powered analytics on learner gaps and progress
6. **Trust**: Transparent AI with human oversight for all decisions

---

## Next Steps to Launch

1. **Week 1**: Get Gemini API credentials, test connectivity
2. **Week 2-3**: Implement Phase 1 (API integration, job queue)
3. **Week 4-5**: Implement Phase 2 (AI services)
4. **Week 6-7**: Integrate with existing code, build UI
5. **Week 8**: Testing, monitoring, launch
6. **Ongoing**: Monitor costs, collect feedback, improve prompts

---

## Conclusion

This is a **complete, production-ready blueprint** for an **AI-powered intelligent learning system** that combines:

- **Competency Framework** (Phase 1-2) - Foundation for measuring mastery
- **AI Intelligence** (New Spec) - Automation, personalization, adaptation

Result: A platform that rivals premium e-learning providers like Coursera, while being cost-effective, customizable, and focused on **skills-based mastery** for emerging markets. 

🚀 **Ready to build an intelligent learning platform!**

