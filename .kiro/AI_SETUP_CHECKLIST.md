# AI Integration Setup Checklist

**Use this to verify everything is working**

---

## ✅ Pre-Setup Verification

- [ ] Application builds: `npm run build` passes
- [ ] TypeScript: No compilation errors
- [ ] Dependencies: `npm list @google/generative-ai` shows installed
- [ ] Database: Connected to Supabase

---

## ✅ Step 1: Get API Key

- [ ] Visit https://makersuite.google.com/app/apikey
- [ ] Signed in with Google account
- [ ] Created new API key
- [ ] Copied the key (looks like: `AIzaSyD...`)
- [ ] Saved key securely

---

## ✅ Step 2: Add to Application

- [ ] Started dev server: `npm run dev`
- [ ] Navigated to: `http://localhost:3000/admin/ai-settings`
- [ ] Logged in as admin user
- [ ] Pasted API key in input field
- [ ] Clicked "Test API Key"
- [ ] ✓ Green checkmark appeared
- [ ] Clicked "Save Configuration"
- [ ] Saw success message

---

## ✅ Step 3: Verify Configuration

### Database Level
```bash
# Run in Supabase SQL Editor:
SELECT config_key, is_encrypted, last_used_at 
FROM ai_config 
WHERE config_key = 'GEMINI_API_KEY';
```

- [ ] Query returns a row
- [ ] `config_key` = 'GEMINI_API_KEY'
- [ ] `is_encrypted` = true

### Application Level
```bash
# Test the endpoint:
curl http://localhost:3000/api/ai/config/list
```

- [ ] Returns JSON array
- [ ] Contains configuration entries
- [ ] No error messages

---

## ✅ Step 4: Test AI Functions

### Test 1: Generate Questions

```typescript
// In a server function or route:
import { generateAssessmentQuestions } from '~/lib/ai-integration.server'

const result = await generateAssessmentQuestions(
  'JavaScript Basics',
  'Learn JavaScript fundamentals including variables and functions',
  3
)

console.log(result.success) // Should be true
console.log(result.questions.length) // Should be 3
```

- [ ] Function executes without error
- [ ] Returns questions array
- [ ] Each question has: question, options, correctAnswer, explanation

### Test 2: Generate Feedback

```typescript
const result = await generateSubmissionFeedback(
  'Code Quality',
  ['Readability', 'Performance', 'Documentation'],
  'const x = 1; x++; console.log(x);',
  500
)

console.log(result.success) // Should be true
console.log(result.feedback) // Should have text
```

- [ ] Function executes without error
- [ ] Returns feedback text
- [ ] Text is constructive and helpful

### Test 3: Generate Recommendation

```typescript
const result = await generateLearningPathRecommendation(
  'Test Learner',
  ['HTML', 'CSS'],
  ['JavaScript', 'React', 'Node.js'],
  'Become a full-stack developer'
)

console.log(result.success) // Should be true
console.log(result.recommendation) // Should have structure
```

- [ ] Function executes without error
- [ ] Returns recommendation object
- [ ] Includes: nextCompetencies, rationale, motivationalMessage

---

## ✅ Step 5: Integration Testing

### Test in Your Code

- [ ] Imported AI function in a component/route
- [ ] Added 3-5 lines to call the function
- [ ] Function executed without errors
- [ ] Received expected output format
- [ ] No TypeScript errors

### Test Error Handling

- [ ] Called function with invalid inputs
- [ ] Function returned error in result.success
- [ ] Error message was clear and helpful
- [ ] Application didn't crash

---

## ✅ Step 6: Security Verification

### Check Database Security

```sql
-- Verify RLS policies exist
SELECT * FROM pg_policies WHERE tablename = 'ai_config';
```

- [ ] Policies exist for table
- [ ] At least 4 policies shown
- [ ] Policies include SELECT, INSERT, UPDATE, DELETE

### Check No Secrets in Code

- [ ] Searched for `AIzaSy` in codebase: 0 results
- [ ] No API key in .env.example
- [ ] No API key in version control
- [ ] Only stored in Supabase table

---

## ✅ Step 7: Documentation Review

- [ ] Read `.kiro/QUICK_START_AI.md` (3 min)
- [ ] Skimmed `.kiro/AI_INTEGRATION_SETUP.md` (5 min)
- [ ] Reviewed available functions
- [ ] Understood security model
- [ ] Noted error handling patterns

---

## ✅ Step 8: Integration Planning

Choose which features to implement:

- [ ] Auto-generate assessment questions
- [ ] Intelligent student feedback
- [ ] Personalized learning paths
- [ ] Course improvement suggestions
- [ ] Custom AI features

For each:
- [ ] Identified where to add AI function
- [ ] Estimated effort (usually 3-5 lines)
- [ ] Planned UI/UX for feature
- [ ] Added to development queue

---

## ✅ Final Verification

### Build Check
```bash
npm run build
```

- [ ] Build succeeds
- [ ] No TypeScript errors
- [ ] No warnings about AI integration
- [ ] Build time < 5 seconds

### Type Check
```bash
npm run lint
```

- [ ] No errors in AI files
- [ ] No type mismatches
- [ ] All imports resolve

### Dev Server
```bash
npm run dev
```

- [ ] Server starts without errors
- [ ] Admin settings page loads
- [ ] API endpoints respond
- [ ] No console errors

---

## ✅ Production Ready

- [ ] All above checklist items complete
- [ ] API key is in production-ready state
- [ ] Database migration is applied
- [ ] Team is trained on usage
- [ ] Cost limits are set in Google Cloud
- [ ] Monitoring/logging is configured
- [ ] Error handling is in place

---

## ✅ Post-Implementation

- [ ] At least one AI feature is integrated
- [ ] Feature is tested with real data
- [ ] Users can access the feature
- [ ] Feedback is collected
- [ ] Improvements are planned

---

## If Something Doesn't Work

### API Key Issues
- [ ] Double-check key at https://makersuite.google.com/app/apikey
- [ ] Verify key was pasted completely
- [ ] Try generating new key
- [ ] Test endpoint response

### Build Issues
- [ ] Run `npm run build` to see full error
- [ ] Check file paths are relative (not absolute)
- [ ] Verify imports are correct
- [ ] Check TypeScript errors with `npm run lint`

### Database Issues
- [ ] Run migration: `supabase db push`
- [ ] Check RLS policies in SQL editor
- [ ] Verify user has admin role
- [ ] Check table exists: `SELECT * FROM ai_config;`

### Function Issues
- [ ] Check error message in console
- [ ] Verify API key is set
- [ ] Try simpler prompt first
- [ ] Check TypeScript types match expected

---

## Support

- **Quick Help:** `.kiro/QUICK_START_AI.md`
- **Full Setup:** `.kiro/AI_INTEGRATION_SETUP.md`
- **Implementation:** `.kiro/AI_IMPLEMENTATION_READY.md`
- **API Docs:** https://ai.google.dev/

---

**Status:** Ready to build! ✅

**Next Step:** Follow the checklist and get your API key!
