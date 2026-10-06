# AI Integration - Complete Reference

**Everything You Need to Know**

---

## Quick Navigation

| Need | File | Time |
|------|------|------|
| **Getting Started** | `.kiro/QUICK_START_AI.md` | 3 min |
| **Step-by-Step Setup** | `.kiro/AI_INTEGRATION_SETUP.md` | 10 min |
| **Build AI Features** | `.kiro/AI_FEATURE_INTEGRATION_GUIDE.md` | 15 min |
| **Verify Everything** | `.kiro/AI_SETUP_CHECKLIST.md` | 20 min |
| **All Details** | `.kiro/AI_IMPLEMENTATION_READY.md` | 30 min |

---

## The Essentials

### 3 Steps to Activate

```
1. Get API Key    → https://makersuite.google.com/app/apikey (2 min)
2. Configure App  → http://localhost:3000/admin/ai-settings (1 min)
3. Start Building → Use AI functions in your code (5 min)
```

### 5 AI Functions Ready to Use

| Function | Use Case | Input | Output |
|----------|----------|-------|--------|
| `generateAssessmentQuestions()` | Auto-generate test questions | Competency title + description + count | Array of questions with options & answers |
| `generateSubmissionFeedback()` | Intelligent student feedback | Competency + rubric + submission | Personalized feedback text |
| `generateLearningPathRecommendation()` | Personalized pathways | Learner profile + competencies + goals | Recommended next steps & rationale |
| `generateCourseImprovements()` | Content suggestions | Course title + description + topics | Topics, improvements, assessments |
| `generateContent()` | Custom tasks | Any prompt | Generated text response |

### File Structure

```
You Created: 13 Files

Database
  └─ supabase/migrations/20260929000001_add_ai_config.sql

Backend
  ├─ src/lib/ai-config.server.ts          ← Configuration
  └─ src/lib/ai-integration.server.ts     ← AI Functions

API
  ├─ src/routes/api/ai/config/set.ts
  ├─ src/routes/api/ai/config/list.ts
  └─ src/routes/api/ai/config/test.ts

Frontend
  ├─ src/components/ai-config-manager.tsx
  └─ src/routes/admin/ai-settings.tsx

Documentation
  ├─ .kiro/QUICK_START_AI.md
  ├─ .kiro/AI_INTEGRATION_SETUP.md
  ├─ .kiro/AI_FEATURE_INTEGRATION_GUIDE.md
  ├─ .kiro/AI_IMPLEMENTATION_READY.md
  ├─ .kiro/AI_SETUP_CHECKLIST.md
  ├─ .kiro/AI_SETUP_COMPLETE.md
  └─ .kiro/AI_INTEGRATION_SUMMARY.txt
```

---

## Feature Integration Examples

### Example 1: Generate Test Questions (5 lines)

```typescript
import { generateAssessmentQuestions } from '~/lib/ai-integration.server'

// When instructor clicks "Generate"
const result = await generateAssessmentQuestions(
  'JavaScript Fundamentals',
  'Learn JS basics',
  5
)
// result.questions → Display to instructor for review
```

### Example 2: Intelligent Feedback (5 lines)

```typescript
import { generateSubmissionFeedback } from '~/lib/ai-integration.server'

// When grading project
const result = await generateSubmissionFeedback(
  'React Components',
  ['Code Quality', 'Functionality'],
  studentCode,
  500
)
// result.feedback → Pre-fill feedback textarea
```

### Example 3: Learning Paths (5 lines)

```typescript
import { generateLearningPathRecommendation } from '~/lib/ai-integration.server'

// After diagnostic
const result = await generateLearningPathRecommendation(
  'Jane Doe',
  ['HTML', 'CSS'],
  ['JavaScript', 'React', 'Node.js'],
  'Become full-stack'
)
// result.recommendation → Show to learner
```

---

## Security Checklist

✅ **API keys are encrypted** in Supabase  
✅ **Never exposed to client** - server-side only  
✅ **Admin role required** - RLS policies enforce  
✅ **Usage tracked** - last_used_at field  
✅ **No hardcoded secrets** - environment variables only  
✅ **Audit trail maintained** - for compliance  

---

## Implementation Timeline

### Week 1: Setup (Day 1)
- [ ] Get Gemini API key (2 min)
- [ ] Add to app via admin UI (1 min)
- [ ] Test configuration works (2 min)

### Week 1-2: Integrate First Feature (4-6 hours)
- [ ] Choose one feature (Feature 1-4 or custom)
- [ ] Find the right component
- [ ] Add AI function call (~5 lines)
- [ ] Test and iterate
- [ ] Deploy to production

### Week 2+: Scale (Ongoing)
- [ ] Add more AI features
- [ ] Refine prompts
- [ ] Monitor costs/usage
- [ ] Gather user feedback

---

## Common Questions

### Q: How much does it cost?
**A:** Gemini API is pay-per-token (~$0.000075/token). Most operations: $0.01-0.10. Free tier available for development.

### Q: How long do requests take?
**A:** Typical: 1-3 seconds. Max: 10 seconds with retries.

### Q: Can I edit AI-generated content?
**A:** Yes! All functions generate content that users can review and edit before saving.

### Q: Is it secure?
**A:** Yes. API keys are encrypted, never exposed to clients, and stored in database with RLS policies.

### Q: What if the API fails?
**A:** All functions return `{ success: false, message: "error" }`. Implement error handling in your code.

### Q: Can I use it offline?
**A:** No, requires internet connection for Gemini API calls.

### Q: Is the AI output deterministic?
**A:** No, can vary slightly each time. This is normal behavior.

---

## Setup Verification

### Checklist

- [ ] `.npm run build` passes ✅
- [ ] TypeScript has no errors ✅
- [ ] `@google/generative-ai` installed ✅
- [ ] `ai_config` database table created ✅
- [ ] `/admin/ai-settings` page loads ✅
- [ ] API endpoints respond ✅
- [ ] All functions are exported ✅

---

## Your AI Functions

### Function: generateAssessmentQuestions()

**Location:** `src/lib/ai-integration.server.ts`

**Signature:**
```typescript
generateAssessmentQuestions(
  competencyTitle: string,
  competencyDescription: string,
  questionCount: number = 5
)
```

**Returns:**
```typescript
{
  success: boolean,
  questions: Array<{
    question: string,
    options: string[],
    correctAnswer: string,
    explanation: string
  }>,
  message?: string
}
```

**Use Case:** Auto-generate multiple-choice test questions from competency description

---

### Function: generateSubmissionFeedback()

**Location:** `src/lib/ai-integration.server.ts`

**Signature:**
```typescript
generateSubmissionFeedback(
  competencyTitle: string,
  rubricCriteria: string[],
  studentSubmission: string,
  maxLength?: number
)
```

**Returns:**
```typescript
{
  success: boolean,
  feedback: string,
  length: number
}
```

**Use Case:** Generate intelligent, constructive feedback on student work

---

### Function: generateLearningPathRecommendation()

**Location:** `src/lib/ai-integration.server.ts`

**Signature:**
```typescript
generateLearningPathRecommendation(
  learnerName: string,
  completedCompetencies: string[],
  availableCompetencies: string[],
  learnerGoals: string
)
```

**Returns:**
```typescript
{
  success: boolean,
  recommendation: {
    recommendation: string,
    nextCompetencies: string[],
    rationale: string,
    estimatedDuration: string,
    motivationalMessage: string
  }
}
```

**Use Case:** Personalize learning paths based on learner profile

---

### Function: generateCourseImprovements()

**Location:** `src/lib/ai-integration.server.ts`

**Signature:**
```typescript
generateCourseImprovements(
  courseTitle: string,
  courseDescription: string,
  currentTopics: string[]
)
```

**Returns:**
```typescript
{
  success: boolean,
  suggestions: {
    suggestedTopics: string[],
    contentImprovements: string[],
    assessmentSuggestions: string[],
    interactionStrategies: string[],
    summary: string
  }
}
```

**Use Case:** Suggest course enhancements and improvements

---

### Function: generateContent()

**Location:** `src/lib/ai-integration.server.ts`

**Signature:**
```typescript
generateContent(
  prompt: string,
  options?: {
    model?: string,
    temperature?: number,
    maxOutputTokens?: number
  }
)
```

**Returns:**
```typescript
{
  success: boolean,
  content: string,
  usageMetadata?: any
}
```

**Use Case:** Custom AI tasks with any prompt

---

## API Endpoints

### POST /api/ai/config/set
Set or update AI configuration

```bash
curl -X POST http://localhost:3000/api/ai/config/set \
  -H "Content-Type: application/json" \
  -d '{
    "configKey": "GEMINI_API_KEY",
    "configValue": "your-api-key-here",
    "description": "Google Gemini API key"
  }'
```

### GET /api/ai/config/list
List all configurations (without values)

```bash
curl http://localhost:3000/api/ai/config/list
```

### POST /api/ai/config/test
Test if API key works

```bash
curl -X POST http://localhost:3000/api/ai/config/test \
  -H "Content-Type: application/json" \
  -d '{"apiKey": "your-key"}'
```

---

## Error Handling

### Common Errors

```typescript
// API key not configured
{ success: false, message: "Gemini API key not configured" }

// Invalid API key
{ success: false, message: "Invalid API key format" }

// Rate limit exceeded
{ success: false, message: "Rate limit exceeded. Please try again later" }

// Network error
{ success: false, message: "Failed to connect to Gemini API" }
```

### How to Handle

```typescript
try {
  const result = await generateAssessmentQuestions(...)
  
  if (result.success) {
    // Use result.questions
  } else {
    // Handle error
    showError(result.message)
    // Show fallback UI or manual input option
  }
} catch (error) {
  console.error('Unexpected error:', error)
  showError('Something went wrong. Please try again.')
}
```

---

## Production Deployment

### Before Going Live

- [ ] API key is configured
- [ ] Database migration is applied
- [ ] All functions are tested
- [ ] Error handling is in place
- [ ] Usage is monitored
- [ ] Cost limits are set
- [ ] Team is trained
- [ ] Documentation is shared

### Deployment Steps

```bash
# 1. Apply database migration
supabase db push --project-ref nhvvgoilwseiagzbbhmx

# 2. Build
npm run build

# 3. Deploy
npm run deploy

# 4. Configure in production
# Go to /admin/ai-settings and add production API key
```

---

## Monitoring

### Check Configuration

```sql
SELECT config_key, is_encrypted, last_used_at, created_at
FROM ai_config
WHERE config_key = 'GEMINI_API_KEY';
```

### Monitor Usage

```sql
SELECT 
  config_key,
  last_used_at,
  EXTRACT(EPOCH FROM (NOW() - last_used_at)) / 86400 as days_since_use
FROM ai_config
ORDER BY last_used_at DESC;
```

### Track Errors

```typescript
// Add logging to track errors
import { logError } from '~/lib/logging'

const result = await generateContent(...)
if (!result.success) {
  await logError({
    function: 'generateContent',
    error: result.message,
    timestamp: new Date()
  })
}
```

---

## Performance Optimization

### Caching

```typescript
// Cache generated content
const getCachedOrGenerate = async (key, generator) => {
  const cached = await getFromCache(key)
  if (cached) return cached
  
  const result = await generator()
  await setInCache(key, result, 24 * 60 * 60) // 24 hour TTL
  return result
}
```

### Batching

```typescript
// Process multiple items efficiently
const feedbacks = await Promise.all(
  submissions.map(s => generateSubmissionFeedback(...))
)
```

### Progressive Enhancement

```typescript
// Show empty state while generating
<div>
  {isLoading && <Skeleton />}
  {!isLoading && content && <div>{content}</div>}
</div>
```

---

## Support & Resources

### Documentation
- **Quick Start:** `.kiro/QUICK_START_AI.md`
- **Setup Guide:** `.kiro/AI_INTEGRATION_SETUP.md`
- **Feature Integration:** `.kiro/AI_FEATURE_INTEGRATION_GUIDE.md`
- **Implementation Details:** `.kiro/AI_IMPLEMENTATION_READY.md`
- **Checklist:** `.kiro/AI_SETUP_CHECKLIST.md`

### External
- **Gemini API:** https://ai.google.dev/
- **API Studio:** https://makersuite.google.com/app/apikey
- **Supabase:** https://supabase.com/docs
- **TypeScript:** https://www.typescriptlang.org/

### Your Application
- **Admin Settings:** `http://localhost:3000/admin/ai-settings`
- **Database:** Supabase project `nhvvgoilwseiagzbbhmx`

---

## Summary

**You now have:**

✅ Complete AI infrastructure  
✅ 5 ready-to-use functions  
✅ Secure configuration system  
✅ Admin UI for management  
✅ Full documentation  
✅ Integration examples  

**Next steps:**

1. Get your Gemini API key
2. Add to application via `/admin/ai-settings`
3. Choose a feature to build
4. Add ~5 lines of code
5. Test and iterate

**Status:** 🚀 Ready to Build AI Features

---

**Created:** September 29, 2026  
**Build:** ✅ Passing  
**Security:** ✅ Verified  
**Documentation:** ✅ Complete
