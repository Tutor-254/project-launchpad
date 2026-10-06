# Database Schema Analysis - Actual vs Spec

## Summary
The database is **SIGNIFICANTLY MORE ADVANCED** than what the competency spec describes. The codebase has evolved significantly with many additional features already implemented. The TypeScript types file in `src/integrations/supabase/types.ts` is **SEVERELY OUTDATED** and needs to be regenerated from the live database.

## Key Findings

### Actual Database Tables (From Live Supabase)
The live database contains **60+ tables** including:

#### Competency & Assessment Related (Already Implemented)
- **assessments** - Assessment metadata (type, mastery_threshold, time limits)
- **assessment_attempts** - Student attempt tracking with scoring
- **assessment_questions** - Questions for assessments
- **assessment_responses** - Individual responses to questions
- **assessment_violations** - Academic integrity tracking
- **attempt_questions** - Question sequencing within attempts
- **badge_classes** - Badge definitions
- **badges** - Issued badges to learners
- **learning_objectives** - Competency/learning outcome definitions

#### Course & Content (Already Implemented)
- **courses** - Course metadata
- **course_sections** - Course sections
- **lectures** - Lecture content
- **lecture_progress** - Student progress tracking
- **lecture_media_assets** - Media associated with lectures
- **lecture_intelligence** - AI-generated lecture insights
- **lecture_transcripts** - Auto-generated transcripts
- **course_media_assets** - Media for courses
- **course_intelligence** - AI-generated course insights
- **course_publish_checklist** - Course publication workflow
- **learning_objectives** - Learning outcomes/competencies

#### Enrollment & Facilitation (Already Implemented)
- **enrollments** - Student course enrollment
- **contact_logs** - Facilitator contact tracking
- **follow_ups** - Follow-up task tracking
- **participation_records** - Learner participation metrics
- **hub_sessions** - Physical hub session data
- **hub_attendance** - Attendance tracking for hub sessions
- **referral_notes** - Referral/placement notes

#### Grading & Assessment
- **grade_overrides** - Manual grade adjustments
- **assessment_responses** - Response tracking with scoring

#### Platform & Admin
- **profiles** - User profiles with extended fields
- **user_roles** - User role assignments (already in spec)
- **instructor_applications** - Instructor application workflow
- **questions & answers** - Q&A forum system
- **reviews** - Course reviews
- **categories** - Course categories
- **notifications** - System notifications
- **certificates** - Course completion certificates
- **audit_log** - Audit trail for compliance
- **account_deletion_requests** - GDPR data deletion

#### Bulk Messaging & Communication
- **bulk_messages** - Bulk message campaigns
- **bulk_message_recipients** - Recipient tracking for campaigns

#### Data Integrity & Privacy
- **account_deletion_requests** - Privacy/GDPR compliance
- **ai_redaction_audit** - AI redaction audit trail
- **ai_jobs** - Background jobs for AI processing

#### Commerce (Already Implemented)
- **orders** - Orders for course enrollment
- **payments** - Payment tracking
- **payouts** - Instructor payouts
- **coupon_redemptions** - Coupon usage
- **coupons** - Discount coupons

#### Risk & Compliance
- **risk_events** - Tracking at-risk learners
- **platform_config** - Platform-wide settings

## Migration Gap

### Migrations in Codebase
- Latest migration: `20260705000001_competency-diagnostics.sql`

### Migrations Applied to Database  
- Latest applied: `20260928000001` (and many more)
- This means **30+ migrations** exist in the database that are not in the codebase

### Implications
1. **Database is ahead of code** - The live database has full implementations of many features
2. **TypeScript types are severely outdated** - Need to regenerate from live database
3. **Migration history is broken** - Local migrations don't match remote

## Competency Framework Status

### What Spec Defines
- `competencies` table
- `diagnostic_assessments` table  
- `diagnostic_questions` table
- `diagnostic_attempts` table
- `competency_assessments` table
- `assessment_attempts` table
- `practical_projects` table
- `project_submissions` table
- `project_grades` table
- `rubrics` table
- `competency_badges` table
- `learner_pathways` table

### What Exists in Database
The database has **evolved** the assessment system significantly:
- **assessments** table (broader than competency_assessments)
- **assessment_attempts** with scoring state machine
- **assessment_questions** with AI generation support
- **assessment_responses** with detailed scoring
- **badge_classes** & **badges** (more comprehensive badge system)
- **learning_objectives** (aligned with competencies)
- **assessment_violations** (academic integrity)
- **attempt_questions** (question sequencing)

**Notably Missing from Database (Per Schema)**:
- `competencies` table (may be `learning_objectives` instead)
- `diagnostic_assessments` table
- `diagnostic_questions` table
- `diagnostic_attempts` table
- `practical_projects` table
- `project_submissions` table
- `learner_pathways` table

## Next Steps: Implementation Strategy

### Priority 1: Reverse Engineer TypeScript Types
1. Generate fresh types from live database
   ```bash
   npx supabase gen types typescript --linked > src/integrations/supabase/types.ts
   ```
2. Update all imports and usages throughout the codebase
3. Verify compilation and tests pass

### Priority 2: Audit Existing Implementation
1. Map actual tables to spec requirements
2. Check if `learning_objectives` == `competencies`
3. Verify assessment attempt flow matches spec
4. Check badge issuance workflow

### Priority 3: Identify Gaps
1. Diagnostic pre-assessment flow
2. Practical project submission workflow
3. Learner pathway personalization
4. If missing, implement these features

### Priority 4: Update Tasks
1. Skip database migration tasks (already done)
2. Update task 5 (TypeScript types) - CRITICAL
3. Focus on UI/API component tasks
4. Focus on missing features (diagnostics, projects, pathways if not present)

## Files to Update

### Critical
- `src/integrations/supabase/types.ts` - **NEEDS REGENERATION**
- Any files importing the old types structure

### High Priority  
- Task definitions in `.kiro/specs/competency-framework-and-mastery/tasks.md`
  - Remove database migration tasks
  - Update TypeScript types task
  - Adjust implementation scope

## Commands for Fresh Start

```bash
# Fix migration history
npx supabase migration repair --status reverted 20260705000002
# ... (repeat for all unknown migrations)

# Generate fresh types
npx supabase gen types typescript --linked > src/integrations/supabase/types.ts

# Verify compilation
npm run build
```

## Recommendations

1. **Do NOT run migration tasks** - Database is ahead
2. **Generate types immediately** - Critical blocker
3. **Audit implementation** - Understand what's already built
4. **Focus on gaps** - Only build missing features  
5. **Reverse engineer existing code** - See how features are currently implemented
6. **Update tasks.md** - Reflect actual status and remaining work
