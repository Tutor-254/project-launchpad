-- ============================================================================
-- Phase 8: Database Triggers for Competency Framework Automation
-- ============================================================================
-- This file contains SQL triggers that automate key business logic:
-- 1. Badge issuance when assessment + project both passed
-- 2. Submission status updates when project graded
-- 3. Notification generation on badge creation
--
-- To apply these triggers, run this file in Supabase SQL editor or psql
-- ============================================================================

-- ============================================================================
-- Trigger 39.1: Auto-issue badge when assessment passed (if project also passed)
-- ============================================================================
-- Trigger: On `assessment_attempts` INSERT with `passed = true`
-- Action: Check if project submission for same competency/user also passed
--         If yes, insert badge into competency_badges table
--
-- This trigger runs AFTER an assessment attempt is recorded.
-- It checks if there's a passing grade for the corresponding project.
-- If both assessment and project are passed, a badge is issued automatically.

CREATE OR REPLACE FUNCTION issue_badge_on_assessment_pass()
RETURNS TRIGGER AS $$
DECLARE
  v_competency_id UUID;
  v_project_grade RECORD;
  v_badge_code TEXT;
BEGIN
  -- Only proceed if assessment was passed
  IF NEW.passed = FALSE THEN
    RETURN NEW;
  END IF;

  -- Get the competency ID for this assessment
  SELECT competency_id INTO v_competency_id
  FROM competency_assessments
  WHERE id = NEW.competency_assessment_id;

  -- Check if there's a passing project grade for this competency
  -- Look for latest graded project submission for this user/competency
  SELECT pg.* INTO v_project_grade
  FROM project_grades pg
  JOIN project_submissions ps ON ps.id = pg.submission_id
  JOIN practical_projects pp ON pp.id = ps.project_id
  WHERE ps.user_id = NEW.user_id
    AND pp.competency_id = v_competency_id
    AND ps.status = 'graded'
    AND pg.total_score >= (
      SELECT (rubrics.total_points * rubrics.passing_score_percent / 100)
      FROM rubrics
      WHERE rubrics.id = pp.rubric_id
    )
  ORDER BY pg.created_at DESC
  LIMIT 1;

  -- If project is also passed, issue badge
  IF v_project_grade IS NOT NULL THEN
    -- Generate unique badge code
    v_badge_code := 'BADGE-' || substring(gen_random_uuid()::text, 1, 8) || '-' || 
                    extract(epoch from now())::bigint;

    -- Insert badge (or update if exists)
    INSERT INTO competency_badges 
      (user_id, competency_id, assessment_passed_at, project_passed_at, badge_code)
    VALUES 
      (NEW.user_id, v_competency_id, NEW.created_at, v_project_grade.created_at, v_badge_code)
    ON CONFLICT (user_id, competency_id) 
    DO UPDATE SET
      assessment_passed_at = NEW.created_at,
      badge_code = v_badge_code;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach trigger to assessment_attempts table
DROP TRIGGER IF EXISTS trigger_issue_badge_on_assessment_pass ON assessment_attempts;
CREATE TRIGGER trigger_issue_badge_on_assessment_pass
AFTER INSERT ON assessment_attempts
FOR EACH ROW
EXECUTE FUNCTION issue_badge_on_assessment_pass();

-- ============================================================================
-- Trigger 39.2: Update submission status when project graded
-- ============================================================================
-- Trigger: On `project_grades` INSERT with `total_score >= passing_score_percent`
-- Action: Update status in `project_submissions` to 'graded'
--
-- This trigger runs AFTER a grade is recorded for a project submission.
-- It updates the submission status and optionally calls badge issuance.

CREATE OR REPLACE FUNCTION update_submission_status_on_grade()
RETURNS TRIGGER AS $$
DECLARE
  v_passing_threshold NUMERIC;
  v_is_passing BOOLEAN;
  v_assessment_passed BOOLEAN;
  v_competency_id UUID;
BEGIN
  -- Get rubric passing threshold
  SELECT (total_points * passing_score_percent / 100) INTO v_passing_threshold
  FROM rubrics
  WHERE id = NEW.rubric_id;

  -- Determine if this grade is passing
  v_is_passing := NEW.total_score >= v_passing_threshold;

  -- Update submission status to 'graded'
  UPDATE project_submissions
  SET 
    status = 'graded',
    updated_at = now()
  WHERE id = NEW.submission_id;

  -- If project is passing, check if assessment also passed for badge issuance
  IF v_is_passing THEN
    -- Get competency ID
    SELECT pp.competency_id INTO v_competency_id
    FROM practical_projects pp
    WHERE pp.id = (
      SELECT project_id FROM project_submissions WHERE id = NEW.submission_id
    );

    -- Check if assessment is passed
    SELECT EXISTS (
      SELECT 1 FROM assessment_attempts aa
      JOIN competency_assessments ca ON ca.id = aa.competency_assessment_id
      WHERE aa.user_id = (SELECT user_id FROM project_submissions WHERE id = NEW.submission_id)
        AND ca.competency_id = v_competency_id
        AND aa.passed = TRUE
        AND aa.created_at > now() - INTERVAL '90 days'  -- Recent attempt
      LIMIT 1
    ) INTO v_assessment_passed;

    -- If assessment also passed, issue badge (idempotent insert)
    IF v_assessment_passed THEN
      INSERT INTO competency_badges 
        (user_id, competency_id, assessment_passed_at, project_passed_at, badge_code)
      SELECT
        ps.user_id,
        v_competency_id,
        MAX(aa.created_at) as assessment_passed_at,
        NEW.created_at as project_passed_at,
        'BADGE-' || substring(gen_random_uuid()::text, 1, 8) || '-' || 
        extract(epoch from now())::bigint
      FROM project_submissions ps
      JOIN assessment_attempts aa ON aa.user_id = ps.user_id
      WHERE ps.id = NEW.submission_id
      GROUP BY ps.user_id
      ON CONFLICT (user_id, competency_id) DO NOTHING;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach trigger to project_grades table
DROP TRIGGER IF EXISTS trigger_update_submission_on_grade ON project_grades;
CREATE TRIGGER trigger_update_submission_on_grade
AFTER INSERT ON project_grades
FOR EACH ROW
EXECUTE FUNCTION update_submission_status_on_grade();

-- ============================================================================
-- Trigger 39.3: Create notification when badge earned
-- ============================================================================
-- Trigger: On `competency_badges` INSERT
-- Action: Insert notification row with type = 'badge_earned'
--
-- This trigger runs AFTER a badge is created.
-- It creates a corresponding notification for the learner.

CREATE OR REPLACE FUNCTION create_badge_notification()
RETURNS TRIGGER AS $$
DECLARE
  v_competency_name TEXT;
BEGIN
  -- Get competency name for notification
  SELECT title INTO v_competency_name
  FROM competencies
  WHERE id = NEW.competency_id;

  -- Create notification
  -- Assuming there's a notifications table with columns:
  -- id, user_id, type, title, message, metadata, created_at, read_at
  INSERT INTO notifications (
    user_id,
    type,
    title,
    message,
    metadata,
    created_at
  ) VALUES (
    NEW.user_id,
    'badge_earned',
    'Competency Mastered!',
    'You''ve earned the ' || v_competency_name || ' Mastery Badge!',
    jsonb_build_object(
      'badge_id', NEW.id,
      'badge_code', NEW.badge_code,
      'competency_id', NEW.competency_id,
      'competency_name', v_competency_name
    ),
    now()
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach trigger to competency_badges table
DROP TRIGGER IF EXISTS trigger_create_badge_notification ON competency_badges;
CREATE TRIGGER trigger_create_badge_notification
AFTER INSERT ON competency_badges
FOR EACH ROW
EXECUTE FUNCTION create_badge_notification();

-- ============================================================================
-- Additional Helper Triggers for Data Consistency
-- ============================================================================

-- ============================================================================
-- Trigger: Auto-update updated_at on competencies
-- ============================================================================
CREATE OR REPLACE FUNCTION update_competencies_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_competencies_timestamp ON competencies;
CREATE TRIGGER trigger_update_competencies_timestamp
BEFORE UPDATE ON competencies
FOR EACH ROW
EXECUTE FUNCTION update_competencies_timestamp();

-- ============================================================================
-- Trigger: Auto-update updated_at on competency_assessments
-- ============================================================================
CREATE OR REPLACE FUNCTION update_competency_assessments_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_competency_assessments_timestamp ON competency_assessments;
CREATE TRIGGER trigger_update_competency_assessments_timestamp
BEFORE UPDATE ON competency_assessments
FOR EACH ROW
EXECUTE FUNCTION update_competency_assessments_timestamp();

-- ============================================================================
-- Trigger: Prevent duplicate diagnostic attempts within cooldown
-- ============================================================================
-- This is implemented as a check constraint or application-level validation
-- rather than a trigger, but included here for reference

-- ============================================================================
-- Verification Queries
-- ============================================================================
-- Run these to verify triggers are created correctly:

-- 1. Check that all trigger functions exist
-- SELECT * FROM pg_proc WHERE proname LIKE 'issue_badge%' OR proname LIKE 'update_%' OR proname LIKE 'create_badge%';

-- 2. Check that all triggers are attached
-- SELECT trigger_name, event_object_table, action_timing, event_manipulation 
-- FROM information_schema.triggers 
-- WHERE trigger_schema = 'public' AND trigger_name LIKE 'trigger_%';

-- 3. Test badge issuance trigger (verify a badge is created when assessment + project both pass)
-- SELECT * FROM competency_badges WHERE created_at > now() - INTERVAL '1 hour';

-- 4. Test submission status update trigger (verify submissions marked as 'graded')
-- SELECT * FROM project_submissions WHERE status = 'graded' AND updated_at > now() - INTERVAL '1 hour';

-- 5. Test notification trigger (verify notifications created for badges)
-- SELECT * FROM notifications WHERE type = 'badge_earned' AND created_at > now() - INTERVAL '1 hour';

-- ============================================================================
-- Notes
-- ============================================================================
-- - All triggers are IDEMPOTENT where possible to handle re-runs safely
-- - Triggers use SECURITY DEFINER to ensure they have appropriate permissions
-- - Error handling should be added in production (RAISE EXCEPTION)
-- - Consider adding logging for audit trails
-- - Test triggers with sample data before production deployment
-- - Monitor trigger performance in production (use EXPLAIN ANALYZE)
