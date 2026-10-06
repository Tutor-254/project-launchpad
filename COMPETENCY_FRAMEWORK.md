# Competency Framework & Mastery Learning

## Overview

The Competency Framework adds skill-based learning to Arcane, enabling:
- **Competency definitions** — explicit, observable skill statements
- **Diagnostic assessment** — pre-course testing for prerequisite identification
- **Mastery learning** — structured feedback, remediation, and retry cycles
- **Practical projects** — real-world artifact submission with rubric grading
- **Competency badges** — shareable digital credentials for demonstrated skills

This guide covers instructor-facing features: defining competencies, creating assessments, grading projects, and viewing analytics.

---

## Table of Contents

1. [Instructor Workflow](#instructor-workflow)
2. [Defining Competencies](#defining-competencies)
3. [Creating Assessments](#creating-assessments)
4. [Setting Up Rubrics](#setting-up-rubrics)
5. [Grading Projects](#grading-projects)
6. [Viewing Analytics](#viewing-analytics)
7. [Best Practices](#best-practices)

---

## Instructor Workflow

### High-Level Steps

```
1. Define competencies → Observable behaviors, success criteria
2. Create diagnostic   → Pre-course assessment to route learners
3. Create assessments  → Knowledge tests for each competency
4. Create projects     → Practical capstone activities
5. Grade projects      → Review submissions, apply rubrics
6. View analytics      → Track mastery rates and failure points
```

### Typical Course Structure

| Element | Purpose | Timing |
|---------|---------|--------|
| Diagnostic Assessment | Route learner to appropriate level (basics vs. advanced) | Before enrollment |
| Competency Assessments | Test knowledge of each skill (1-3 per competency) | During course |
| Practical Projects | Capture real-world evidence (1 per competency) | During/after course |
| Badges | Award digital credential (1 per competency) | After assessment + project pass |

---

## Defining Competencies

### What is a Competency?

A **competency** is a discrete, observable skill that a learner can demonstrate. Examples:

- "Deploy a Node.js API to a cloud platform"
- "Analyze business requirements and translate to data schema"
- "Conduct user interviews and synthesize findings"

### Creating a Competency

1. **Navigate to Studio** → Course editor → **Competencies** tab
2. **Click "Add Competency"**
3. **Fill in the form**:

#### Title (Required)
- 1-100 characters
- Clear, action-oriented phrasing
- Examples:
  - ✅ "Deploy a Node.js API to AWS"
  - ✅ "Design database schemas for multi-tenant apps"
  - ❌ "Node" (too vague)
  - ❌ "Advanced Node.js API Development for Cloud Deployment at Enterprise Scale" (too long)

#### Description (Required)
- 1-500 characters
- Explain what learners will be able to do
- Include context about why this skill matters

**Example:**
> "Learners will take a Node.js application and deploy it to AWS EC2 or Lambda. They'll understand containerization, environment variables, and production best practices."

#### Observable Behaviors (Required)
- 2-5 specific, measurable actions
- Write in second person: "Learner can..."
- Make them verifiable in a project or assessment

**Example:**
- Connects to a database using environment variables
- Implements error handling for failed API requests
- Deploys to cloud platform without exposing secrets
- Monitors application logs in production

#### Success Criteria (Required)
- Describe what "passing" looks like
- Reference your assessment + project grading

**Example:**
> "Passes the Node.js API deployment knowledge test (70%+) AND submits a working deployed API with proper environment handling and error logging."

#### Prerequisites (Optional)
- List competencies from earlier courses or sections
- Learners must earn these badges before attempting this competency
- Common example: "Fundamentals of Node.js" → "Deploy a Node.js API"

#### Related Job Titles (Optional)
- Entry-level roles that use this skill
- Helps learners understand career relevance

**Example:**
- Backend Developer
- DevOps Engineer
- Full Stack Developer
- Cloud Solutions Architect

### Organizing Competencies

- **Order within course**: Drag to reorder (affects recommended sequence)
- **Group related competencies**: Use course sections (e.g., "Deployment Fundamentals" section)
- **Minimum requirement**: Course must have ≥1 competency to publish

---

## Creating Assessments

### Assessment Types

| Type | Purpose | Timing | Format |
|------|---------|--------|--------|
| **Knowledge Test** | Verify conceptual understanding | Early in mastery cycle | MCQ, fill-in-the-blank |
| **Practical Project** | Capture real-world evidence | Peak or end of mastery cycle | File, URL, or video submission |
| **Hybrid** | Both knowledge + practical | Full mastery cycle | Knowledge test + project submission |

### Creating a Knowledge Test Assessment

1. **Studio** → Course editor → **Assessments** tab
2. **Click "Add Assessment"**
3. **Choose Type**: "Knowledge Test"
4. **Fill in details**:

#### Basic Info

- **Competency**: Select from course competencies
- **Title**: e.g., "Node.js API Deployment Knowledge Test"
- **Description**: What learners will be tested on
- **Mastery Rule**: e.g., "score >= 70%" or "score >= 70 AND rubric_score >= 8"

#### Assessment Rules

- **Max Attempts**: 1-10 (default: 3)
  - Prevents endless retrying
  - Encourages thoughtful first attempts
- **Retry Cooldown**: Hours before re-taking (default: 24)
  - Gives time for remediation
  - Prevents gaming the system
- **Requires Remediation Before Retry** (toggle)
  - If enabled, learner must complete remediation lesson before retry
  - Leave ON for high-stakes assessments
- **Remediation Lesson** (optional)
  - Select a course lecture to recommend after failure
  - Example: "Remediation: API Error Handling"

#### Knowledge Test Questions

1. **Click "Add Question"**
2. **Fill in**:
   - **Question Text**: Clear, unambiguous
   - **Type**: Multiple choice (4-5 options)
   - **Options**: 4-5 answer choices
   - **Correct Answer**: Mark which option is correct
   - **Points**: 1-10 per question

3. **Tips for good questions**:
   - ✅ "What HTTP method is idempotent?" (tests specific knowledge)
   - ❌ "Why is REST good?" (opinion-based, hard to grade)
   - ✅ Single, clear correct answer
   - ✅ Distractors that test common misconceptions

### Creating a Practical Project Assessment

1. **Studio** → Course editor → **Assessments** tab
2. **Click "Add Assessment"**, choose type **"Practical"**
3. **Link to Rubric** (create one if needed; see next section)
4. **Fill in project details**:

#### Project Brief (Required)
- 500-2,000 characters
- What learner will build/submit
- Constraints (time, tools, format)

**Example:**
> "Build a Node.js REST API with ≥3 endpoints that handle CRUD operations on a `users` collection. The API must authenticate requests using JWT tokens. Deploy to AWS EC2 or Heroku. Document endpoints using Swagger."

#### Example Submission (Optional)
- Link to reference solution (GitHub repo, deployed site, etc.)
- Learners see what "good" looks like

#### Submission Instructions (Required)
- Where/how to submit
- Format expectations
- What files to include

**Example:**
> "Submit a ZIP file containing: (1) source code in `/src` folder, (2) README.md with setup/deploy instructions, (3) Swagger documentation in `/docs`, (4) link to deployed API."

#### Accepted File Types (Optional)
- Checkboxes: pdf, zip, json, csv, xlsx, docx, mp4, etc.
- Common: zip (for code projects), pdf (for documents), mp4 (for video walkthroughs)

#### Max File Size (Optional)
- Default: 50 MB
- Larger for video submissions (100+ MB)
- Prevent storage abuse

---

## Setting Up Rubrics

### What is a Rubric?

A **rubric** is a scoring guide for practical projects. Each **criterion** has a point scale (e.g., 0-5 points). Total points determine pass/fail.

### Creating a Rubric

1. **Studio** → Assessments tab → **"New Rubric"** (or reuse existing)
2. **Fill in**:

#### Title
- e.g., "API Deployment Rubric"
- Reusable across multiple projects

#### Criteria
- **Click "Add Criterion"** to add each scoring dimension
- **Criterion Name**: e.g., "Code Quality"
- **Points**: e.g., 0-5
- Continue for each criterion

**Example Rubric: API Deployment Project**

| Criterion | Points |
|-----------|--------|
| Code Quality (structure, clarity, standards) | 5 |
| Functionality (all requirements met, no bugs) | 5 |
| Error Handling (graceful failures, proper codes) | 3 |
| Documentation (README, comments, Swagger) | 2 |
| **Total** | **15** |

#### Passing Score %
- Default: 70% of total points
- Example: 70% of 15 = 10.5 points needed to pass

### Rubric Best Practices

1. **3-5 criteria**: More is hard to grade fairly
2. **Weighted points**: Core skills get more points
3. **Clear descriptions**: In instructions or grading interface
4. **Consistency**: Instructors grade using the same rubric across learners
5. **Reusable**: Share rubrics across projects/courses

---

## Grading Projects

### Grading Queue

1. **Studio** → Course analytics or **Grading Queue** tab
2. See pending submissions waiting for instructor feedback
3. **Submitted date**, **learner name**, **competency**, **submission preview** (filename or URL)

### Grading a Submission

1. **Click submission** in queue
2. **Review**:
   - Project brief and example
   - Learner's submission (preview or link)
   - Rubric criteria

3. **Score each criterion**:
   - Use point scale (e.g., 0-5)
   - Application auto-calculates total + pass/fail

4. **Provide feedback** (optional):
   - Specific, actionable comments
   - "Great separation of concerns. Next time, add logging for error debugging."
   - Encourages future improvement

5. **Submit grade**:
   - System marks submission as "graded"
   - Learner receives notification
   - If assessment + project both passed → **badge issued** ✨

### Batch Grading Tips

- Grade in order of submission date (fairness)
- Use consistent rubric interpretation
- Type feedback template once, copy/paste for similar submissions
- Mark outstanding projects for portfolio showcasing

---

## Viewing Analytics

### Dashboard Overview

**Studio** → Course analytics → **Competencies** tab

View metrics per competency:

| Metric | What It Shows |
|--------|---------------|
| % Passed Assessment | Of enrolled learners, how many passed knowledge test? |
| % Submitted Project | Of those who passed, how many submitted a project? |
| % Earned Badge | Of those who submitted, how many earned the full badge? |
| Avg Attempts to Mastery | How many tries needed before passing? |

### Failure Points

See where learners struggle:

- **Knowledge Tests**: Which questions have lowest pass rates?
- **Projects**: Which rubric criteria score lowest across submissions?

Use this to:
- Revise unclear lecture content
- Adjust rubric or difficulty
- Add remediation resources

### Learner Progress Table

Filter by competency, date range, or group:

| Learner | Comp 1 | Comp 2 | Comp 3 | Badges |
|---------|--------|--------|--------|--------|
| Alice | ✓ Badge | In Progress | Not started | 1 |
| Bob | ✓ Badge | ✓ Badge | In Progress | 2 |

### Export Data

- **Download CSV** for further analysis
- Columns: learner name, competency, status, score, submission date, grade
- Use for reporting, interventions, or external system sync

---

## Badge Verification & Sharing

### Public Badge Verification

Each badge has a unique verification link:

```
https://arcane.example.com/verify/badge/BADGE-a1b2c3d4-1672531200
```

**Public page shows**:
- Competency title
- Earner name & date
- Issuer (Arcane)
- Badge image
- Related job titles
- Submission evidence (if public portfolio)

### Social Sharing

Learners can share badges on:
- **LinkedIn**: Auto-formatted post with badge image
- **Twitter**: Short tweet with link
- **Email**: Message to network
- **Shareable link**: Portfolio URL (if learner opts in)

---

## Best Practices

### 1. Define Clear Competencies

✅ **Do**:
- One skill per competency
- Observable, measurable behaviors
- 2-5 observable behaviors per competency
- Success criteria tied to assessment + project

❌ **Don't**:
- Vague titles ("Advanced Skills")
- Combine multiple skills ("APIs and Databases and DevOps")
- Impossible criteria ("mastery" with no grading scale)

### 2. Design Assessments to Match Competencies

✅ **Do**:
- Assessment questions test behaviors listed in competency
- Mastery rule (70%+) aligns with course rigor
- Rubric criteria match project brief

❌ **Don't**:
- Ask about unrelated concepts in questions
- Set mastery rule too high (100%) or too low (40%)
- Rubric that doesn't align with project requirements

### 3. Provide Remediation

✅ **Do**:
- Link remediation lectures for common failure points
- Require remediation before retry for important skills
- Give constructive feedback on projects

❌ **Don't**:
- Require remediation on every failure (frustrating)
- Provide feedback only as "wrong" or "try again"
- Block retries indefinitely

### 4. Use Consistent Grading

✅ **Do**:
- Write detailed rubric descriptions
- Grade in order (reduce biasing toward later submissions)
- Use same rubric across all learners

❌ **Don't**:
- Change rubric criteria mid-course
- Grade harshly one submission, leniently another
- Create new rubrics for each learner

### 5. Monitor Analytics

✅ **Do**:
- Review failure rates quarterly
- Identify bottleneck competencies
- Adjust content or rubric based on data

❌ **Don't**:
- Ignore learner feedback on assessments
- Keep impossible competencies active
- Assume low pass rates mean low learner effort

---

## FAQ

### Q: How many competencies should my course have?
**A**: 3-7 is typical. Each competency = assessment + project + grading workload. Start with core skills; add advanced competencies later.

### Q: Can learners retake the diagnostic?
**A**: Yes, after 7 days by default. This prevents gaming the pathway system. Adjust in diagnostic settings if needed.

### Q: What if a learner passes the project but fails the assessment?
**A**: Badge is **not** issued until both are passed. They can retry the assessment immediately (after cooldown). If project is time-sensitive, offer a "regrade" option after assessment retry.

### Q: Can I weight certain rubric criteria more?
**A**: Yes—allocate more points to critical criteria. Example: "Code Quality" = 5 pts, "Documentation" = 2 pts.

### Q: How long should remediation resources be?
**A**: 15-30 min video typically. Target learners who scored 50-70%; they need focused reteaching, not full content review.

### Q: Can I export badges for reporting?
**A**: Yes, via Analytics → Export CSV. Badge data includes: learner, competency, date earned, badge code.

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Learner can't retake assessment | Check: max attempts reached? In cooldown? Remediation required and not completed? |
| Learner can't submit project | Likely cause: assessment not yet passed. Require assessment before project submission. |
| Badge not issued after grading | Verify: (1) project score >= rubric passing %, (2) assessment is passed, (3) no system errors in logs |
| Rubric not showing in grading | Ensure: (1) rubric linked to project, (2) rubric has ≥1 criterion with points |

---

## Next Steps

1. **Define 3-5 core competencies** for your course
2. **Create diagnostic assessment** (5-10 questions) for prerequisite routing
3. **Create 1 knowledge test + 1 project** per competency
4. **Create/reuse rubric** for fair grading
5. **Publish course** with competency framework enabled
6. **Grade early learner projects** to test your rubrics
7. **Refine** based on learner feedback and analytics

---

## Support & Resources

- **Detailed setup walkthrough**: `/docs/competency-setup-guide`
- **Rubric templates**: `/templates/rubrics`
- **Assessment question bank**: `/templates/questions`
- **Contact support**: support@arcane.example.com

---

*Last updated: September 2026*
