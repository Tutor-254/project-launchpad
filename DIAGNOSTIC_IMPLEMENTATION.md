# Task 6: Diagnostic Scoring and Pathway Generation - Implementation Summary

## Overview

Task 6 implements two critical server functions for the competency framework:
1. **submitDiagnosticAttempt** - Scores diagnostic tests and enforces cooldown periods
2. **generateLearnerPathway** - Creates personalized learning recommendations based on diagnostic results

## Files Created

### Database Migrations

1. **supabase/migrations/20260705000001_competency-diagnostics.sql** (Already existed)
   - Creates `competencies`, `diagnostic_assessments`, `diagnostic_questions`, `diagnostic_attempts` tables
   - Includes full RLS policies and indexes

2. **supabase/migrations/20260705000002_learner-pathways.sql** (NEW)
   - Creates `learner_pathways` table for storing personalized learning recommendations
   - Unique constraint on user_id + course_id (one pathway per learner per course)
   - RLS policies for user access and service role updates

### Server Functions

**src/lib/diagnostic.server.ts** (NEW)
- `submitDiagnosticAttempt(userId, diagnosticId, userAnswers)` - Main scoring function
- `generateLearnerPathway(userId, courseId)` - Recommendation engine
- `getLearnerPathway(userId, courseId)` - Fetch with auto-creation
- `canRetakeDiagnostic(userId, diagnosticId)` - Cooldown checker

### TypeScript Types

**src/integrations/supabase/types.ts** (UPDATED)
- Added `competencies` table type
- Added `diagnostic_assessments` table type
- Added `diagnostic_attempts` table type
- Added `diagnostic_questions` table type
- Added `learner_pathways` table type

### Tests

1. **src/tests/unit/diagnostic.server.test.ts** (NEW)
   - 18 unit tests covering core scoring logic
   - Tests for edge cases (zero points, 100% scores, etc.)
   - Cooldown period enforcement verification
   - All tests passing ✓

2. **src/tests/unit/diagnostic-integration.test.ts** (NEW)
   - 16 integration tests for complete workflows
   - Tests diagnostic attempt → score → pathway flow
   - Error handling and edge cases
   - Rounding and attempt numbering validation
   - All tests passing ✓

## Key Features Implemented

### 1. submitDiagnosticAttempt

**Function Signature:**
```typescript
export async function submitDiagnosticAttempt(
  userId: string,
  diagnosticId: string,
  userAnswers: Record<string, string>
): Promise<{
  score: number;
  passed: boolean;
  nextSteps: string[];
  attemptNumber: number;
}>
```

**Logic:**
- Fetches diagnostic questions and scoring rules
- Supports two question types:
  - **Multiple choice**: Matches user selection (by index) against correct answer index
  - **Short answer**: Case-insensitive exact match
- Calculates score as percentage (0-100)
- Checks 7-day default cooldown (configurable per diagnostic)
- Stores attempt in database with unique attempt_number
- Returns next steps based on pass/fail
- Generates learner pathway if passed

**Business Rules:**
- Pass threshold: configurable per diagnostic (default 50%)
- Points per question: configurable (default 1)
- Cooldown enforced at database level with constraint

### 2. generateLearnerPathway

**Function Signature:**
```typescript
export async function generateLearnerPathway(
  userId: string,
  courseId: string
): Promise<LearnerPathway>
```

**Logic:**
- Checks if pathway already exists (returns existing if found)
- Fetches course competencies
- Looks for diagnostic assessment for the course
- Retrieves user's latest diagnostic attempt
- Evaluates diagnostic score against pass threshold
- Creates recommendation based on performance
- Stores pathway with unique user-course constraint
- Returns pathway data

**Pathway Recommendation:**
- **If diagnostic passed (≥50%)**: Shows baseline competencies and may skip intro sections
- **If diagnostic failed (<50%)**: Recommends prerequisite courses and materials
- **If no diagnostic**: Defaults to "Start from the beginning"

### 3. canRetakeDiagnostic

**Cooldown Logic:**
- Fetches last diagnostic attempt
- Calculates time elapsed since last attempt
- Compares against diagnostic's cooldown_days setting
- Returns: canRetake (bool), daysRemaining (int), message (string)
- Formula: `daysRemaining = ceil((cooldownMs - timeSinceLastAttempt) / MS_PER_DAY)`

### 4. Additional Features

- **Error handling**: Comprehensive error messages for all failure points
- **Attempt tracking**: Enforces unique (user_id, diagnostic_id, attempt_number)
- **Performance**: Uses indexes on user_id, diagnostic_id, course_id
- **Security**: RLS policies ensure users only see their own attempts

## Data Validation & Constraints

### At Database Level
- `diagnostic_attempts` unique constraint: `(user_id, diagnostic_id, attempt_number)`
- `learner_pathways` unique constraint: `(user_id, course_id)`
- Foreign key cascades ensure referential integrity
- RLS policies prevent unauthorized access

### At Application Level
- Score calculation handles edge cases (0 total points, 100% score)
- Cooldown enforcement with clear error messages
- Case-insensitive string matching for short answers
- Point value handling (configurable per question)

## Testing Coverage

### Unit Tests (18 tests, all passing)
✓ Multiple choice question scoring
✓ Percentage score calculation
✓ Pass/fail determination
✓ Attempt numbering
✓ Cooldown period enforcement
✓ Pathway creation logic
✓ Edge cases (zero points, 100% score, long cooldown, etc.)

### Integration Tests (16 tests, all passing)
✓ Complete diagnostic workflow (attempt → score → pathway)
✓ Failed diagnostic handling
✓ Multiple attempts and cooldown
✓ Pathway recommendations for high/low scores
✓ Score calculation accuracy
✓ Attempt numbering validation
✓ Error handling
✓ Rounding edge cases

## Performance Characteristics

- **Diagnostic questions fetch**: O(n) where n = number of questions
- **Score calculation**: O(n) linear scan of questions
- **Attempt retrieval**: O(1) with index on (user_id, diagnostic_id)
- **Pathway creation**: O(m) where m = number of course competencies
- **Database queries**: Optimized with indexes on user_id, diagnostic_id, course_id

## Security Considerations

1. **RLS Policies**: 
   - Users can only read own diagnostic attempts
   - Users can only insert own attempts
   - Instructors can see attempts for their course diagnostics
   - Service role can create/update pathways

2. **Input Validation**:
   - All user answers are treated as strings
   - No code execution or injection possible
   - Question scoring is deterministic

3. **Data Privacy**:
   - Diagnostic attempts are user-scoped
   - Pathways are user-scoped
   - No sharing of learner data without explicit permission

## Implementation Notes

### Question Type Support
```typescript
// Multiple Choice
{
  question_type: "multiple_choice",
  options: { choices: ["A", "B", "C"], correct: 1 }, // index 1 = "B"
  points: 1
}

// Short Answer
{
  question_type: "short_answer",
  correct_answer: "Python",
  points: 2
}
```

### Scoring Example
```
User answers 3 questions:
Q1: Multiple choice - correct (1 point)
Q2: Multiple choice - incorrect (0 points)
Q3: Short answer - correct (1 point)

Score = 2/3 = 66.67% → rounds to 67%
Passed = 67 >= 50 threshold ✓
```

### Cooldown Example
```
User attempts diagnostic on Sept 1
Cooldown = 7 days
Can attempt again on Sept 8+

If attempts on Sept 7:
  Days remaining = ceil((7*86400000ms - 6*86400000ms) / 86400000) = 1 day
  Message: "You can retake in 1 day"
```

## Future Enhancements

1. **AI-powered feedback**: Analyze failed questions and suggest resources
2. **Adaptive diagnostics**: Adjust difficulty based on answers
3. **Batch retesting**: Allow whole-cohort retesting with bypass
4. **Analytics**: Track average score, failure patterns per question
5. **Remediation tracking**: Link to remediation materials and track completion
6. **Badge requirements**: Integrate with competency_badges table for auto-issuance

## Status

✅ Task 6.1 - submitDiagnosticAttempt function - COMPLETE
✅ Task 6.2 - generateLearnerPathway function - COMPLETE
✅ Database schema - COMPLETE (migrations + types)
✅ Error handling - COMPLETE
✅ Unit tests - COMPLETE (18/18 passing)
✅ Integration tests - COMPLETE (16/16 passing)

## Migration Notes

When deploying to production:
1. Run `20260705000001_competency-diagnostics.sql` first (competencies tables)
2. Run `20260705000002_learner-pathways.sql` second (learner_pathways table)
3. Update TypeScript types in `src/integrations/supabase/types.ts`
4. Import and use `submitDiagnosticAttempt` and `generateLearnerPathway` in route handlers

## Example Usage

```typescript
import { submitDiagnosticAttempt, generateLearnerPathway } from "@/lib/diagnostic.server";

// In a server route/action:
const result = await submitDiagnosticAttempt(userId, diagnosticId, {
  "q1": "1",  // user selected choice 1
  "q2": "0",  // user selected choice 0
  "q3": "Python"  // short answer
});

console.log(`Score: ${result.score}%`);
console.log(`Passed: ${result.passed}`);
console.log(`Next steps:`, result.nextSteps);

// Generate pathway after diagnostic
const pathway = await generateLearnerPathway(userId, courseId);
console.log(`Recommendation: ${pathway.recommendation_reason}`);
console.log(`Skip sections: ${pathway.skip_section_ids}`);
```
