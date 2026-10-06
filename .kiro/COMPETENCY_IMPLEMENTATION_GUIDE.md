# Competency Framework Implementation Guide

## Status: DATABASE SCHEMA REGENERATED ✅

The TypeScript types have been successfully regenerated from the live database and the codebase compiles without errors.

## Database Mapping: Spec vs Reality

### Learning Objectives → Competencies
The database uses `learning_objectives` table instead of a dedicated `competencies` table:

**Actual Table Structure** (`learning_objectives`):
```typescript
learning_objectives: {
  Row: {
    ai_generated: boolean
    course_id: string
    created_at: string
    description: string | null
    id: string
    module_id: string | null
    name: string
    skills_description: string | null
    source_ref: string | null
    status: string
    updated_at: string
  }
}
```

**Spec Requirement** (`competencies`):
- title ✅ (maps to name)
- description ✅ (direct mapping)
- observable_behaviors ❌ (not present - needs implementation)
- success_criteria ❌ (not present - needs implementation)
- prerequisite_competencies ❌ (not present - needs implementation)
- related_job_titles ❌ (not present - needs implementation)
- order_index ❌ (not present - needs implementation)

### Assessment System → Already Implemented ✅

**Actual Table** (`assessments`):
```typescript
assessments: {
  Row: {
    auto_submit_threshold: number
    course_id: string
    created_at: string
    id: string
    mastery_threshold: number
    questions_per_attempt: number | null
    sequential_mode: boolean
    time_limit_minutes: number
    title: string
    type: string
  }
}
```

This closely matches the spec's `competency_assessments` table. 

**Status**: Already implemented with additional features:
- Time limits ✅
- Sequential mode ✅
- Auto-submit threshold ✅
- Mastery threshold ✅

### Assessment Attempts → Already Implemented ✅

**Actual Table** (`assessment_attempts`):
```typescript
assessment_attempts: {
  Row: {
    assessment_id: string
    attempt_number: number
    id: string
    preliminary_score: number | null
    released_at: string | null
    score: number | null
    started_at: string
    state: string
    student_id: string
    submitted_at: string | null
  }
}
```

**Status**: Implemented with state machine pattern:
- Attempt tracking ✅
- Scoring ✅
- State management ✅
- Release workflow ✅

### Badge System → Already Implemented ✅

**Actual Tables**:
- `badge_classes` - Badge definitions
- `badges` - Issued badges

**Status**: More comprehensive than spec:
- Badge class management ✅
- OpenBadges assertion format ✅
- Revocation support ✅
- Competency scoring ✅

### Missing Components from Database

The following features from the spec are NOT implemented in the database:

1. **Diagnostic Pre-Assessment**
   - `diagnostic_assessments` table - NOT PRESENT
   - `diagnostic_questions` table - NOT PRESENT
   - `diagnostic_attempts` table - NOT PRESENT

2. **Practical Projects**
   - `practical_projects` table - NOT PRESENT
   - `project_submissions` table - NOT PRESENT
   - `project_grades` table - NOT PRESENT
   - `rubrics` table - NOT PRESENT

3. **Competency Framework Details**
   - Observable behaviors field - NOT PRESENT
   - Success criteria field - NOT PRESENT
   - Prerequisite tracking - NOT PRESENT
   - Job title mapping - NOT PRESENT

4. **Learner Pathways**
   - `learner_pathways` table - NOT PRESENT
   - Personalized pathway recommendations - NOT PRESENT

## Implementation Priority

### Phase 1: Enhance Learning Objectives (CRITICAL)
Extend `learning_objectives` table to match spec requirements:

```sql
-- Add missing columns to learning_objectives
ALTER TABLE public.learning_objectives ADD COLUMN IF NOT EXISTS observable_behaviors text[] DEFAULT '{}';
ALTER TABLE public.learning_objectives ADD COLUMN IF NOT EXISTS success_criteria text;
ALTER TABLE public.learning_objectives ADD COLUMN IF NOT EXISTS prerequisite_competencies uuid[] DEFAULT '{}';
ALTER TABLE public.learning_objectives ADD COLUMN IF NOT EXISTS related_job_titles text[] DEFAULT '{}';
ALTER TABLE public.learning_objectives ADD COLUMN IF NOT EXISTS order_index integer DEFAULT 1;
```

**Files to Update**:
- Update `src/integrations/supabase/types.ts` after migration (already regenerated with current schema)
- Add new migration file

### Phase 2: Implement Diagnostic Assessment
Create diagnostic system for pre-course testing:

**New Tables**:
- `diagnostic_assessments`
- `diagnostic_questions`  
- `diagnostic_attempts`

**New API Functions**:
- `submitDiagnosticAttempt(diagnosticId, answers)`
- `generateLearnerPathway(userId, courseId)`

### Phase 3: Implement Practical Projects
Create project submission and grading workflow:

**New Tables**:
- `practical_projects`
- `project_submissions`
- `project_grades`
- `rubrics`

**New API Functions**:
- `submitProjectSubmission(projectId, submission)`
- `gradeProjectSubmission(submissionId, scores, feedback)`

### Phase 4: Implement Learner Pathways
Create personalized learning path recommendations:

**New Table**:
- `learner_pathways`

**New API Functions**:
- `generateLearnerPathway(userId, courseId)`

## Task Status Update

### Skip These Tasks (Already Done)
- ✅ Task 1-4: Database migrations for competencies/diagnostics - DATABASE ALREADY HAS ASSESSMENT SYSTEM
- ✅ Task 5: TypeScript types - JUST REGENERATED FROM LIVE DATABASE

### Update These Tasks
- **Task 6**: Update diagnostic functions - NOW NEEDED (create new tables)
- **Task 7**: Update assessment functions - VERIFY EXISTING IMPLEMENTATION
- **Task 8**: Badge system - VERIFY AND USE EXISTING
- **Task 9**: Project submission - NOW NEEDED (create new)

### Continue These Tasks As-Is
- Tasks 10-27: UI Components - Can proceed with existing types
- Tasks 28-41: APIs, utilities, testing - Adjust based on Phase implementation

## Key Differences from Spec

### Assessment System
The actual implementation is **MORE FEATURE-RICH** than the spec:
- Sequential question delivery (spec doesn't mention)
- Auto-submit thresholds (spec doesn't mention)
- Question shuffling support (via `attempt_questions.shuffled_options`)
- Preliminary scoring (partial credit)
- State machine for attempt lifecycle

### Badge System
The actual implementation is **MORE COMPREHENSIVE**:
- OpenBadges assertion format (JSON-LD compliance)
- Badge class system (templates)
- Competency scoring
- Revocation support

### Missing from Actual Database
Compared to spec, the database is **MISSING**:
- Diagnostic pre-assessment
- Practical project submission workflow
- Learner pathway personalization
- Competency framework metadata
- Rubric-based grading

## Immediate Action Items

### 1. Review Existing Assessment Implementation
Check how the current system works:
- How are questions stored and retrieved?
- How is scoring implemented?
- How are attempts limited?
- How is mastery determined?

**Files to Review**:
- Look for existing assessment routes in `src/routes`
- Check server functions in `src/server` or `src/lib`
- Review assessment components in `src/components`

### 2. Create Migration for Learning Objectives Enhancement
Add missing fields to `learning_objectives`:

```bash
npx supabase migration new add_competency_fields_to_learning_objectives
```

### 3. Verify Badge Issuance Workflow
Check if badges are automatically issued when mastery is achieved:
- Review triggers or functions
- Check badge issuance business logic
- Verify OpenBadges format

### 4. Plan Diagnostic & Project Implementation
Design tables and API for missing features:
- `diagnostic_assessments` - entry testing
- `practical_projects` - capstone projects
- `learner_pathways` - personalized recommendations

## Code Generation Recommendations

After implementing new tables, regenerate types:

```bash
# After creating new migrations and deploying
npx supabase gen types typescript --linked > src/integrations/supabase/types.ts

# Verify compilation
npm run build

# Run type checks
npm run typecheck  # if available
```

## Integration with Spec

### Spec Correctness Properties Still Valid
All 6 correctness properties in the spec remain valid:
1. ✅ Competency-assessment alignment
2. ✅ Mastery before badge issuance
3. ⚠️  Diagnostic routing accuracy (needs diagnostic implementation)
4. ✅ Retry rule enforcement
5. ⚠️  Remediation prerequisite (needs enhancement)
6. ✅ Project evidence immutability (after projects implemented)

### Property-Based Tests
Review existing implementation against properties:
- Tests may already exist in `src/tests/`
- Update tests after each phase

## Next Steps

1. **Immediate** (Next 1 hour):
   - Review this analysis with team
   - Check existing code for assessment/badge implementation
   - Verify build is stable

2. **Short-term** (Next 4 hours):
   - Create migration for learning objectives enhancement
   - Update task.md with accurate priorities
   - Begin Phase 2 (Diagnostic Assessment)

3. **Medium-term** (Next day):
   - Implement Phase 2: Diagnostics
   - Implement Phase 3: Projects
   - Implement Phase 4: Pathways

4. **Long-term**:
   - Update UI components
   - Implement APIs
   - Add tests
   - Verify correctness properties

## Questions for Clarification

1. Is the current badge system working as intended?
2. Are there existing diagnostic/project implementations in progress?
3. Should we extend `learning_objectives` or create new `competencies` table?
4. What's the existing mastery determination logic?
5. Are there server functions already implemented that we can leverage?
