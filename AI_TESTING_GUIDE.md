# AI Features Testing Guide - Arcane Platform

## Quick Start Testing (5 Minutes)

### Step 1: Verify AI Configuration

1. Start the development server:
```bash
npm run dev
```

2. Login as admin user

3. Navigate to **Admin Console** → **AI Settings** tab

4. Click **"Test Configuration"** button

**Expected Result**: ✅ Success message showing API key is working

---

### Step 2: Test Assessment Generation

1. Navigate to `/instructor/{any-course-id}`

2. Click **"Create New Assessment"**

3. Select **"Generate with AI"** option

4. Fill in the form:
   - Assessment Type: CAT1
   - Target Questions: 15
   - Difficulty: Intermediate

5. Click **"Generate"**

**Expected Result**: ✅ 15 questions generated with correct structure, Bloom's levels, and competency mappings

**Fallback if no UI**: Test via API:
```bash
curl -X POST http://localhost:3000/api/ai/assessments/generate \
  -H "Content-Type: application/json" \
  -d '{
    "courseId": "test-course",
    "courseTitle": "Introduction to Web Development",
    "assessmentType": "cat1",
    "competencyIds": ["html-basics", "css-fundamentals"],
    "courseDifficulty": "intermediate",
    "targetQuestionCount": 15
  }'
```

---

### Step 3: Test Feedback Generation

**Prerequisites**: Student must have completed an assessment

1. Navigate to `/learn/{courseId}/{competencyId}/assessment`

2. Complete an assessment (answer some questions correctly, some incorrectly)

3. Submit the assessment

4. View feedback page

**Expected Result**: 
- ✅ Personalized feedback for each question
- ✅ Competency gap analysis
- ✅ Custom study guide generated
- ✅ Next steps recommendations

**Fallback - Test via API**:
```bash
curl -X POST http://localhost:3000/api/ai/feedback/generate \
  -H "Content-Type: application/json" \
  -d '{
    "attemptId": "attempt-123",
    "learnerId": "user-123",
    "assessmentId": "assessment-456",
    "assessmentType": "cat1",
    "courseTitle": "Web Development",
    "competencies": [
      {"id": "html-basics", "name": "HTML Fundamentals"}
    ],
    "responses": [
      {
        "questionId": "q1",
        "question": "What does HTML stand for?",
        "userAnswer": "Hypertext Markup Language",
        "correctAnswer": "Hypertext Markup Language",
        "competencies": ["html-basics"]
      },
      {
        "questionId": "q2",
        "question": "What is the purpose of the <head> tag?",
        "userAnswer": "To display content",
        "correctAnswer": "To contain metadata and document information",
        "competencies": ["html-basics"]
      }
    ]
  }'
```

---

### Step 4: Test Progressive Hints (Learner Support)

**During Assessment**:

1. While taking an assessment, click **"Get Hint"** button on a question

2. View Hint Level 1 (nudge)

3. If needed, click **"Next Hint"** for Level 2 (strategy)

4. If still stuck, click **"Final Hint"** for Level 3 (partial solution)

**Expected Result**:
- ✅ Level 1: Gentle hint without answer
- ✅ Level 2: Problem-solving strategy
- ✅ Level 3: Partial solution or example

**Test via API**:
```bash
curl -X POST http://localhost:3000/api/ai/hints/generate \
  -H "Content-Type: application/json" \
  -d '{
    "questionId": "q-css-1",
    "question": "How do you center a div horizontally using flexbox?",
    "competencies": ["css-layouts"],
    "attemptedAnswer": "I tried text-align: center but it didnt work",
    "courseContext": "CSS Flexbox module"
  }'
```

---

### Step 5: Test Course Intelligence

**For Instructors Creating Courses**:

1. Navigate to course creation page

2. Enter course title and description

3. Add some course materials (text content)

4. Click **"Analyze with AI"** or **"Extract Competencies"**

**Expected Result**:
- ✅ 4-8 competencies extracted
- ✅ Learning objectives generated
- ✅ Difficulty level estimated
- ✅ Estimated learning hours calculated
- ✅ Related job roles identified

**Test via API**:
```bash
curl -X POST http://localhost:3000/api/ai/course-intelligence/extract \
  -H "Content-Type: application/json" \
  -d '{
    "courseId": "new-course",
    "courseTitle": "Full Stack Web Development",
    "courseDescription": "Learn to build modern web applications from scratch",
    "materials": [
      "Module 1: HTML fundamentals - Learn the building blocks of web pages...",
      "Module 2: CSS Styling - Master responsive design and modern layouts...",
      "Module 3: JavaScript Basics - Add interactivity to your websites..."
    ]
  }'
```

---

### Step 6: Test Grading System

**For Instructors**:

1. Navigate to `/instructor/{courseId}/grading`

2. Select a project submission

3. Enter rubric scores for each criterion:
   - Code Quality: 8/10
   - Functionality: 9/10
   - Documentation: 7/10

4. Add feedback text

5. Submit grade

**Expected Result**:
- ✅ Total score calculated (24/30)
- ✅ Pass/fail status determined
- ✅ Badge issued if both assessment and project passed
- ✅ Feedback saved and visible to student

---

### Step 7: Test Learning Pathways

**For Learners**:

1. Complete diagnostic assessment for a course

2. Navigate to course enrollment page `/learn/{courseId}`

3. View recommended learning pathway

**Expected Result**:
- ✅ Pathway generated based on diagnostic score
- ✅ Sections marked for skipping (if high score)
- ✅ Recommended starting point shown
- ✅ Prerequisite courses suggested (if low score)

---

## Full System Test (15 Minutes)

### Complete User Journey

1. **Admin**: Configure AI Settings
   - Set API key
   - Test configuration
   - ✅ Success

2. **Instructor**: Create Course with AI
   - Extract competencies from materials
   - Generate CAT1 assessment
   - Review and approve questions
   - ✅ Course ready

3. **Learner**: Take Diagnostic
   - Complete diagnostic assessment
   - ✅ Pathway generated

4. **Learner**: Enroll in Course
   - View recommended pathway
   - Skip basic sections (if qualified)
   - ✅ Personalized experience

5. **Learner**: Take CAT1
   - Use hints when stuck
   - Submit answers
   - ✅ Progressive support provided

6. **System**: Generate Feedback
   - AI analyzes responses
   - ✅ Personalized feedback delivered

7. **Learner**: Review Feedback
   - View competency gaps
   - Read study guide
   - Follow next steps
   - ✅ Clear improvement path

8. **Learner**: Complete Project
   - Submit project for grading
   - ✅ Submission recorded

9. **Instructor**: Grade Project
   - Use rubric to score
   - Provide feedback
   - ✅ Grade recorded

10. **System**: Issue Badge
    - Verify assessment passed
    - Verify project passed
    - ✅ Badge issued automatically

---

## Troubleshooting

### Issue: "API Key Invalid"

**Solution**:
1. Check `.env` file has `GEMINI_API_KEY` set
2. Verify key is valid at https://makersuite.google.com/app/apikey
3. Restart development server
4. Test again in Admin → AI Settings

### Issue: "Generation Failed"

**Solution**:
1. Check internet connection
2. Verify API key hasn't exceeded quota
3. Check browser console for detailed error
4. Try with smaller question count
5. Check cost limit in `.env` (`GEMINI_COST_LIMIT_USD`)

### Issue: "Hints Not Showing"

**Solution**:
1. Verify assessment has "hint support" enabled
2. Check that question has competencies assigned
3. Test hint API endpoint directly
4. Verify user has permission to request hints

### Issue: "Feedback Not Generating"

**Solution**:
1. Ensure assessment was completed and submitted
2. Verify responses were saved properly
3. Check that assessment has competencies mapped
4. Test feedback API endpoint with sample data

---

## Performance Expectations

### Response Times

- **Assessment Generation**: 10-30 seconds (15-25 questions)
- **Feedback Generation**: 5-15 seconds (per attempt)
- **Progressive Hints**: 3-8 seconds (3 hint levels)
- **Course Intelligence**: 15-25 seconds (comprehensive analysis)
- **API Key Test**: 2-5 seconds

### Token Usage (Approximate)

- **CAT1 Generation**: ~3,000-5,000 tokens
- **Feedback Generation**: ~2,000-4,000 tokens
- **Hints Generation**: ~500-1,000 tokens
- **Course Intelligence**: ~4,000-6,000 tokens

### Cost Estimates (Gemini 2.0 Flash)

- **Input**: $0.000000075 per token
- **Output**: $0.000003 per token
- **Average CAT1 Generation**: ~$0.015
- **Average Feedback**: ~$0.01
- **Average Hints**: ~$0.003

**Monthly Estimate** (for 100 active courses):
- ~$150-300/month

---

## Success Criteria

✅ **All Features Functional**:
- Assessment generation working for diagnostic, CAT1, CAT2
- Feedback generation providing personalized insights
- Hints system offering progressive support
- Course intelligence extracting competencies
- Grading system issuing badges correctly
- Learning pathways adapting to performance

✅ **Quality Standards Met**:
- Generated questions have proper Bloom's levels
- Feedback identifies real misconceptions
- Hints are pedagogically sound (don't give answers away)
- Competency extraction is accurate
- Grading is fair and rubric-based

✅ **User Experience Smooth**:
- Response times acceptable
- Error messages clear and actionable
- UI intuitive for all user types
- No repeated failures or crashes

---

## Next Steps After Testing

1. **If All Tests Pass**:
   - ✅ System is production-ready
   - Train facilitators on AI features
   - Monitor usage and collect feedback
   - Adjust cost limits as needed

2. **If Issues Found**:
   - Document specific error messages
   - Check logs for detailed stack traces
   - Verify environment configuration
   - Test individual API endpoints
   - Contact support if persistent issues

---

## Support Resources

- **API Documentation**: See `AI_FUNCTIONALITY_AUDIT_AND_FIXES.md`
- **Type Definitions**: `src/types/ai-services.ts`
- **Implementation Files**: `src/lib/ai-services/`
- **API Routes**: `src/routes/api/ai/`

---

## Test Completion Checklist

- [ ] AI configuration tested and working
- [ ] Assessment generation (CAT1) successful
- [ ] Feedback generation working
- [ ] Progressive hints functional
- [ ] Course intelligence extracting competencies
- [ ] Grading system issuing badges
- [ ] Learning pathways generating correctly
- [ ] All API endpoints responding
- [ ] Error handling graceful
- [ ] Performance acceptable
- [ ] Cost tracking working
- [ ] User experience smooth

**Date Tested**: _______________
**Tested By**: _______________
**Issues Found**: _______________
**Status**: ✅ PASS / ❌ FAIL

---

Last Updated: 2026-10-06
