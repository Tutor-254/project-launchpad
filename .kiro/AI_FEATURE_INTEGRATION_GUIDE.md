# AI Feature Integration Guide

**How to Add AI to Your Competency Framework Features**

---

## Overview

Each AI feature requires:
1. Import the function (1 line)
2. Call the function (2-3 lines)
3. Display the results (1-2 lines)

**Total: ~5 lines per feature**

---

## Feature 1: Auto-Generate Assessment Questions

### Where to Add It
**Competency Assessment Editor** → When instructor clicks "Generate Questions"

### Implementation

```typescript
// In your assessment editor component/route
import { generateAssessmentQuestions } from '~/lib/ai-integration.server'

// When instructor clicks "Generate Questions" button
async function handleGenerateQuestions() {
  try {
    const result = await generateAssessmentQuestions(
      competency.title,           // e.g., "API Development"
      competency.description,     // e.g., "Learn REST API design"
      numberOfQuestions           // e.g., 5
    )
    
    if (result.success) {
      // Display generated questions to instructor for review
      setGeneratedQuestions(result.questions)
      showNotification('Questions generated successfully')
    } else {
      showError(result.message)
    }
  } catch (error) {
    console.error('Error generating questions:', error)
  }
}
```

### Result Format

```typescript
{
  success: true,
  questions: [
    {
      question: "What does REST stand for?",
      options: [
        "Representational State Transfer",
        "Request-Response System Type",
        "Real-time Electronic Service Transfer",
        "Remote External Service Transfer"
      ],
      correctAnswer: "A",
      explanation: "REST stands for Representational State Transfer, an architectural style for web APIs."
    },
    // ... more questions
  ]
}
```

### Display in UI

```tsx
{generatedQuestions.map((q, idx) => (
  <div key={idx} className="p-4 border rounded-lg mb-2">
    <p className="font-semibold">{q.question}</p>
    {q.options.map((opt, i) => (
      <label key={i} className="block mt-2">
        <input type="radio" name={`q${idx}`} value={String.fromCharCode(65+i)} />
        {String.fromCharCode(65+i)}: {opt}
      </label>
    ))}
    <p className="text-sm text-gray-600 mt-2"><strong>Answer:</strong> {q.correctAnswer}</p>
    <p className="text-sm text-gray-600"><strong>Explanation:</strong> {q.explanation}</p>
  </div>
))}
```

---

## Feature 2: Intelligent Student Feedback

### Where to Add It
**Project Grading Interface** → After instructor grades project submission

### Implementation

```typescript
// In your grading interface
import { generateSubmissionFeedback } from '~/lib/ai-integration.server'

// When instructor clicks "Generate Feedback"
async function handleGenerateFeedback() {
  try {
    const result = await generateSubmissionFeedback(
      project.competency.title,     // e.g., "React Development"
      rubric.criteria,              // e.g., ["Code Quality", "Functionality", "Documentation"]
      studentSubmission.content,    // e.g., student's code/text
      500                           // max feedback length in characters
    )
    
    if (result.success) {
      // Pre-fill feedback textarea with AI suggestion
      setFeedbackText(result.feedback)
      showNotification('AI feedback generated - please review and edit as needed')
    } else {
      showError(result.message)
    }
  } catch (error) {
    console.error('Error generating feedback:', error)
  }
}
```

### Usage in Grading Form

```tsx
<div className="form-group">
  <label>Feedback for Student</label>
  <textarea
    value={feedbackText}
    onChange={(e) => setFeedbackText(e.target.value)}
    placeholder="Provide constructive feedback..."
    rows={6}
    className="w-full"
  />
  <button onClick={handleGenerateFeedback} variant="outline" className="mt-2">
    ✨ Generate AI Feedback
  </button>
  <small className="text-gray-500">
    AI will generate initial feedback - review and edit before saving
  </small>
</div>
```

### Result Format

```typescript
{
  success: true,
  feedback: "Your component architecture is well-structured with clear separation of concerns. Props are properly typed, which shows good TypeScript practices. Consider adding more inline comments for complex logic, and ensure all edge cases are handled in your error boundaries. Overall, excellent work!",
  length: 248
}
```

---

## Feature 3: Personalized Learning Paths

### Where to Add It
**Enrollment Flow / Dashboard** → After diagnostic assessment completion

### Implementation

```typescript
// In your enrollment or dashboard route
import { generateLearningPathRecommendation } from '~/lib/ai-integration.server'

// After learner completes diagnostic
async function generatePathRecommendation(learnerId: string, courseId: string) {
  try {
    // Get learner data
    const learner = await getLearnerData(learnerId)
    const course = await getCourseData(courseId)
    
    const result = await generateLearningPathRecommendation(
      learner.fullName,                    // e.g., "Jane Doe"
      learner.completedCompetencies,       // e.g., ["HTML", "CSS"]
      course.allCompetencies,              // e.g., ["JavaScript", "React", "Node.js"]
      learner.learningGoals               // e.g., "Become a full-stack developer"
    )
    
    if (result.success) {
      // Save recommendation to database
      await savePathRecommendation(learnerId, result.recommendation)
      
      // Display to learner
      showRecommendation(result.recommendation)
    } else {
      showError(result.message)
    }
  } catch (error) {
    console.error('Error generating pathway:', error)
  }
}
```

### Result Format

```typescript
{
  success: true,
  recommendation: {
    recommendation: "Based on your completion of HTML and CSS fundamentals...",
    nextCompetencies: ["JavaScript Fundamentals", "DOM Manipulation", "Async/Await"],
    rationale: "These skills build naturally on your existing knowledge...",
    estimatedDuration: "3-4 weeks",
    motivationalMessage: "You're building a strong foundation! These next skills..."
  }
}
```

### Display to Learner

```tsx
<div className="border rounded-lg p-6 bg-blue-50">
  <h3 className="text-lg font-semibold mb-2">Your Personalized Learning Path</h3>
  
  <p className="mb-4">{recommendation.recommendation}</p>
  
  <div className="mb-4">
    <h4 className="font-semibold mb-2">Recommended Next Steps:</h4>
    <ol className="list-decimal list-inside space-y-1">
      {recommendation.nextCompetencies.map((comp) => (
        <li key={comp}>{comp}</li>
      ))}
    </ol>
  </div>
  
  <p className="text-sm text-gray-700 mb-3">
    <strong>Why these?</strong> {recommendation.rationale}
  </p>
  
  <p className="text-sm text-gray-700 mb-4">
    <strong>Estimated time:</strong> {recommendation.estimatedDuration}
  </p>
  
  <p className="text-sm font-semibold text-blue-900">
    💡 {recommendation.motivationalMessage}
  </p>
  
  <button onClick={() => enrollInCompetencies(nextCompetencies)} className="mt-4">
    Start Learning
  </button>
</div>
```

---

## Feature 4: Course Improvement Suggestions

### Where to Add It
**Course Editor / Analytics** → Course review panel

### Implementation

```typescript
// In your course editor or analytics
import { generateCourseImprovements } from '~/lib/ai-integration.server'

// When instructor clicks "Get Improvement Suggestions"
async function handleGetSuggestions() {
  try {
    const result = await generateCourseImprovements(
      course.title,        // e.g., "Web Development 101"
      course.description,  // e.g., "Learn modern web development fundamentals"
      course.topics        // e.g., ["HTML", "CSS", "JavaScript"]
    )
    
    if (result.success) {
      setSuggestions(result.suggestions)
    } else {
      showError(result.message)
    }
  } catch (error) {
    console.error('Error getting suggestions:', error)
  }
}
```

### Result Format

```typescript
{
  success: true,
  suggestions: {
    suggestedTopics: [
      "Responsive Design",
      "Web Accessibility (A11y)",
      "Performance Optimization"
    ],
    contentImprovements: [
      "Add more hands-on projects",
      "Include real-world examples",
      "Add debugging techniques section"
    ],
    assessmentSuggestions: [
      "Add mini-quizzes after each module",
      "Include code review projects",
      "Add practical challenges"
    ],
    interactionStrategies: [
      "Peer code review sessions",
      "Weekly live Q&A",
      "Discussion forums by topic"
    ],
    summary: "Your course has strong fundamentals. Consider adding..."
  }
}
```

### Display Suggestions

```tsx
<div className="space-y-4">
  <div>
    <h4 className="font-semibold mb-2">Suggested Topics to Add</h4>
    <ul className="list-disc list-inside space-y-1 text-sm">
      {suggestions.suggestedTopics.map((topic) => (
        <li key={topic}>{topic}</li>
      ))}
    </ul>
  </div>
  
  <div>
    <h4 className="font-semibold mb-2">Content Improvements</h4>
    <ul className="list-disc list-inside space-y-1 text-sm">
      {suggestions.contentImprovements.map((imp) => (
        <li key={imp}>{imp}</li>
      ))}
    </ul>
  </div>
  
  <div>
    <h4 className="font-semibold mb-2">Assessment Ideas</h4>
    <ul className="list-disc list-inside space-y-1 text-sm">
      {suggestions.assessmentSuggestions.map((assess) => (
        <li key={assess}>{assess}</li>
      ))}
    </ul>
  </div>
  
  <div>
    <h4 className="font-semibold mb-2">Engagement Strategies</h4>
    <ul className="list-disc list-inside space-y-1 text-sm">
      {suggestions.interactionStrategies.map((strat) => (
        <li key={strat}>{strat}</li>
      ))}
    </ul>
  </div>
  
  <p className="text-sm font-semibold text-gray-700 mt-4">
    Summary: {suggestions.summary}
  </p>
</div>
```

---

## Feature 5: Custom AI Tasks

### Generic Content Generation

```typescript
import { generateContent } from '~/lib/ai-integration.server'

// For any custom task
async function generateCustomContent(prompt: string) {
  const result = await generateContent(
    prompt,
    {
      model: 'gemini-pro',
      temperature: 0.7,
      maxOutputTokens: 1000
    }
  )
  
  if (result.success) {
    return result.content
  } else {
    throw new Error(result.message)
  }
}
```

### Example Uses

```typescript
// Generate course welcome message
const welcomeMessage = await generateContent(
  `Write a warm, 2-3 sentence welcome message for a course on "${course.title}" 
   aimed at ${course.targetAudience}`
)

// Generate learning objectives from description
const objectives = await generateContent(
  `Based on this course description, generate 5 SMART learning objectives: 
   "${course.description}"`,
  { temperature: 0.8, maxOutputTokens: 500 }
)

// Generate discussion prompts
const prompts = await generateContent(
  `Generate 3 thought-provoking discussion prompts for students who just 
   learned about "${topic}" in the context of "${course.title}"`
)
```

---

## Implementation Workflow

### Step 1: Choose Your Feature

Pick one of the five features above to integrate first.

### Step 2: Find Your File

Locate the component or route where you want to add the feature:
- Assessment editor → Use Feature 1
- Grading interface → Use Feature 2
- Enrollment flow → Use Feature 3
- Course editor → Use Feature 4
- Anywhere else → Use Feature 5

### Step 3: Add the Code

Copy the implementation code snippet and adapt it to your specific component.

### Step 4: Handle Errors

Ensure you have error handling (try/catch and error display).

### Step 5: Test It

1. Ensure API key is configured in `/admin/ai-settings`
2. Run your feature
3. Verify AI output appears correctly
4. Test error scenarios

### Step 6: Iterate

- Refine prompts for better results
- Adjust temperature/token limits as needed
- Add user feedback mechanism
- Iterate based on results

---

## Common Patterns

### Pattern 1: Generate Then Review
```typescript
// Generate AI content and let user review/edit
const aiResult = await generateAssessmentQuestions(...)
setReviewContent(aiResult.questions)
setIsReviewMode(true)
// User edits, then saves
```

### Pattern 2: Background Generation
```typescript
// Generate AI content in background while user continues
generateSubmissionFeedback(...).then(result => {
  // Show in sidebar or toast notification
  showNotification('AI Feedback ready', result.feedback)
})
```

### Pattern 3: Progressive Enhancement
```typescript
// Show empty state, fill with AI when available
if (questions.length === 0) {
  // Load AI-generated questions
  const generated = await generateAssessmentQuestions(...)
  setQuestions(generated.questions)
}
```

---

## Testing Your Integration

### Test in Development

```typescript
// Test file: features/assessment.test.ts
import { generateAssessmentQuestions } from '~/lib/ai-integration.server'

test('generates assessment questions', async () => {
  const result = await generateAssessmentQuestions(
    'Test Topic',
    'Test description',
    3
  )
  
  expect(result.success).toBe(true)
  expect(result.questions).toHaveLength(3)
  expect(result.questions[0]).toHaveProperty('question')
  expect(result.questions[0]).toHaveProperty('options')
  expect(result.questions[0]).toHaveProperty('correctAnswer')
})
```

### Integration Points to Test

- [ ] API key configuration works
- [ ] Function executes without error
- [ ] Result has expected structure
- [ ] Error handling works
- [ ] UI displays result correctly
- [ ] User can edit/refine result

---

## Performance Tips

### 1. Cache Generated Content

```typescript
// Store generated questions in database
const cachedQuestions = await getCachedQuestions(competencyId)
if (cachedQuestions) return cachedQuestions

const newQuestions = await generateAssessmentQuestions(...)
await saveCachedQuestions(competencyId, newQuestions)
return newQuestions
```

### 2. Batch Requests

```typescript
// Generate multiple items efficiently
const feedbacks = await Promise.all(
  submissions.map(s => generateSubmissionFeedback(...))
)
```

### 3. Show Loading State

```typescript
const [isGenerating, setIsGenerating] = useState(false)

async function generate() {
  setIsGenerating(true)
  try {
    const result = await generateAssessmentQuestions(...)
    setResult(result)
  } finally {
    setIsGenerating(false)
  }
}

if (isGenerating) return <Spinner>Generating with AI...</Spinner>
```

---

## Monitoring & Analytics

### Track Usage

```typescript
// Log when AI functions are used
async function trackAIUsage(feature: string, inputLength: number) {
  await log({
    feature,
    inputLength,
    timestamp: new Date(),
    userId: currentUser.id
  })
}
```

### Monitor Costs

```typescript
// Estimate tokens and cost
const estimatedTokens = resultText.length / 4  // rough estimate
const estimatedCost = estimatedTokens * 0.000075  // Gemini pricing
console.log(`Estimated cost: $${estimatedCost.toFixed(4)}`)
```

---

## Next Steps

1. **Pick your first feature** → Choose from Feature 1-4 above
2. **Find the right component** → Locate in your codebase
3. **Add the code** → Copy & adapt the implementation
4. **Test it** → Verify it works with your API key
5. **Iterate** → Refine based on results
6. **Build more** → Add additional features

---

## Support

- **Questions?** Check `.kiro/QUICK_START_AI.md`
- **Stuck?** See `.kiro/AI_SETUP_CHECKLIST.md`
- **Need examples?** Review `.kiro/AI_INTEGRATION_SETUP.md`
- **API Docs?** Visit https://ai.google.dev/

---

**Ready to build?** 🚀

Choose a feature, find your component, and add 5 lines of code!
