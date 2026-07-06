-- ============================================================
-- Assessment Functions & Course Publish Trigger
-- Creates:
--   • compute_weighted_score(p_student_id, p_course_id)
--   • get_lecture_completion_pct(p_student_id, p_course_id)
--   • reset_student_attempts(p_assessment_id, p_student_id)
--   • tg_create_assessments_on_publish  (trigger function)
--   • on_course_published               (trigger on courses)
-- ============================================================

-- ============================================================
-- 1. compute_weighted_score
--    Returns the weighted score for a student/course pair:
--      (best CAT_1 released score × 0.15)
--    + (best CAT_2 released score × 0.15)
--    + (best FINAL_EXAM released score × 0.70)
--    Returns NULL if any assessment type has no released attempt.
-- ============================================================
CREATE OR REPLACE FUNCTION public.compute_weighted_score(
  p_student_id uuid,
  p_course_id  uuid
)
RETURNS numeric
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cat1_best  numeric;
  v_cat2_best  numeric;
  v_final_best numeric;
BEGIN
  -- Best released score for CAT_1
  SELECT MAX(aa.score)
    INTO v_cat1_best
    FROM public.assessment_attempts aa
    JOIN public.assessments         a  ON a.id = aa.assessment_id
   WHERE a.course_id    = p_course_id
     AND aa.student_id  = p_student_id
     AND a.type         = 'CAT_1'
     AND aa.state       = 'released'
     AND aa.score       IS NOT NULL;

  -- Best released score for CAT_2
  SELECT MAX(aa.score)
    INTO v_cat2_best
    FROM public.assessment_attempts aa
    JOIN public.assessments         a  ON a.id = aa.assessment_id
   WHERE a.course_id    = p_course_id
     AND aa.student_id  = p_student_id
     AND a.type         = 'CAT_2'
     AND aa.state       = 'released'
     AND aa.score       IS NOT NULL;

  -- Best released score for FINAL_EXAM
  SELECT MAX(aa.score)
    INTO v_final_best
    FROM public.assessment_attempts aa
    JOIN public.assessments         a  ON a.id = aa.assessment_id
   WHERE a.course_id    = p_course_id
     AND aa.student_id  = p_student_id
     AND a.type         = 'FINAL_EXAM'
     AND aa.state       = 'released'
     AND aa.score       IS NOT NULL;

  -- Return NULL if any type has no released attempt
  IF v_cat1_best IS NULL OR v_cat2_best IS NULL OR v_final_best IS NULL THEN
    RETURN NULL;
  END IF;

  RETURN ROUND(
    (v_cat1_best  * 0.15)
  + (v_cat2_best  * 0.15)
  + (v_final_best * 0.70),
    2
  );
END;
$$;

-- ============================================================
-- 2. get_lecture_completion_pct
--    Returns the percentage (0–100) of lectures in the course
--    that are marked completed by the student.
--    Returns 0 if the course has no lectures.
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_lecture_completion_pct(
  p_student_id uuid,
  p_course_id  uuid
)
RETURNS numeric
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total     integer;
  v_completed integer;
BEGIN
  -- Total lectures in this course
  SELECT COUNT(l.id)
    INTO v_total
    FROM public.lectures        l
    JOIN public.course_sections s ON s.id = l.section_id
   WHERE s.course_id = p_course_id;

  IF v_total = 0 THEN
    RETURN 0;
  END IF;

  -- Lectures the student has completed
  SELECT COUNT(lp.lecture_id)
    INTO v_completed
    FROM public.lecture_progress lp
    JOIN public.lectures         l  ON l.id = lp.lecture_id
    JOIN public.course_sections  s  ON s.id = l.section_id
   WHERE s.course_id  = p_course_id
     AND lp.user_id   = p_student_id
     AND lp.completed = true;

  RETURN ROUND((v_completed::numeric / v_total::numeric) * 100, 2);
END;
$$;

-- ============================================================
-- 3. reset_student_attempts
--    Deletes all attempt rows for a student on a given
--    assessment. Only callable by the course instructor.
--    Uses SECURITY DEFINER with a manual ownership check so
--    the delete can bypass RLS, but identity is verified first.
-- ============================================================
CREATE OR REPLACE FUNCTION public.reset_student_attempts(
  p_assessment_id uuid,
  p_student_id    uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_instructor_id uuid;
BEGIN
  -- Resolve the instructor of the course linked to this assessment
  SELECT c.instructor_id
    INTO v_instructor_id
    FROM public.assessments a
    JOIN public.courses     c ON c.id = a.course_id
   WHERE a.id = p_assessment_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Assessment not found: %', p_assessment_id;
  END IF;

  -- Verify the calling user is the course instructor
  IF auth.uid() IS DISTINCT FROM v_instructor_id THEN
    RAISE EXCEPTION 'Only the course instructor may reset student attempts';
  END IF;

  -- Delete all attempts for the student on this assessment
  DELETE FROM public.assessment_attempts
   WHERE assessment_id = p_assessment_id
     AND student_id    = p_student_id;
END;
$$;

-- ============================================================
-- 4. Course publish trigger
--    When a course's status transitions to 'published',
--    auto-insert one assessment row for each of CAT_1,
--    CAT_2, and FINAL_EXAM.
--    ON CONFLICT DO NOTHING is safe because assessments has
--    UNIQUE (course_id, type).
-- ============================================================
CREATE OR REPLACE FUNCTION public.tg_create_assessments_on_publish()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only fire when status changes TO 'published'
  IF NEW.status = 'published' AND (OLD.status IS DISTINCT FROM 'published') THEN
    INSERT INTO public.assessments (course_id, type, title)
    VALUES
      (NEW.id, 'CAT_1',      'Continuous Assessment Test 1'),
      (NEW.id, 'CAT_2',      'Continuous Assessment Test 2'),
      (NEW.id, 'FINAL_EXAM', 'Final Examination')
    ON CONFLICT (course_id, type) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_course_published
  AFTER UPDATE OF status ON public.courses
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_create_assessments_on_publish();

-- ============================================================
-- Grant execute permissions
-- ============================================================
REVOKE EXECUTE
  ON FUNCTION public.compute_weighted_score(uuid, uuid)
  FROM PUBLIC, anon;
GRANT EXECUTE
  ON FUNCTION public.compute_weighted_score(uuid, uuid)
  TO authenticated;

REVOKE EXECUTE
  ON FUNCTION public.get_lecture_completion_pct(uuid, uuid)
  FROM PUBLIC, anon;
GRANT EXECUTE
  ON FUNCTION public.get_lecture_completion_pct(uuid, uuid)
  TO authenticated;

REVOKE EXECUTE
  ON FUNCTION public.reset_student_attempts(uuid, uuid)
  FROM PUBLIC, anon;
GRANT EXECUTE
  ON FUNCTION public.reset_student_attempts(uuid, uuid)
  TO authenticated;
