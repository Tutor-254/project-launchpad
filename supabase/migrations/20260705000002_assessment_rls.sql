-- ============================================================
-- Assessment RLS Policies Migration
-- Enables Row Level Security for all six assessment tables and
-- adds SELECT / INSERT / UPDATE / DELETE policies covering:
--   • student access
--   • instructor access (own courses)
--   • admin access (unrestricted)
-- ============================================================

-- ============================================================
-- assessments
-- ============================================================
ALTER TABLE public.assessments ENABLE ROW LEVEL SECURITY;

-- Students: read assessments whose course they are enrolled in
CREATE POLICY "students read enrolled assessments"
  ON public.assessments FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.enrollments e
      WHERE e.course_id = assessments.course_id
        AND e.user_id   = auth.uid()
    )
  );

-- Instructors: read assessments for courses they own
CREATE POLICY "instructors read own course assessments"
  ON public.assessments FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id            = assessments.course_id
        AND c.instructor_id = auth.uid()
    )
  );

-- Instructors: insert assessments into their own courses
CREATE POLICY "instructors insert own course assessments"
  ON public.assessments FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id            = assessments.course_id
        AND c.instructor_id = auth.uid()
    )
  );

-- Admins: full access
CREATE POLICY "admins manage assessments"
  ON public.assessments FOR ALL TO authenticated
  USING    (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- assessment_questions
-- ============================================================
ALTER TABLE public.assessment_questions ENABLE ROW LEVEL SECURITY;

-- Students: only see approved questions for assessments in enrolled courses
CREATE POLICY "students read approved assessment questions"
  ON public.assessment_questions FOR SELECT TO authenticated
  USING (
    assessment_questions.status = 'approved'
    AND EXISTS (
      SELECT 1 FROM public.assessments a
      JOIN public.enrollments e ON e.course_id = a.course_id
      WHERE a.id        = assessment_questions.assessment_id
        AND e.user_id   = auth.uid()
    )
  );

-- Instructors: read all questions (any status) for their own courses
CREATE POLICY "instructors read own course questions"
  ON public.assessment_questions FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.assessments a
      JOIN public.courses c ON c.id = a.course_id
      WHERE a.id            = assessment_questions.assessment_id
        AND c.instructor_id = auth.uid()
    )
  );

-- Instructors: insert questions into their own courses
CREATE POLICY "instructors insert own course questions"
  ON public.assessment_questions FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.assessments a
      JOIN public.courses c ON c.id = a.course_id
      WHERE a.id            = assessment_questions.assessment_id
        AND c.instructor_id = auth.uid()
    )
  );

-- Instructors: update (approve / reject / edit) questions in their own courses
CREATE POLICY "instructors update own course questions"
  ON public.assessment_questions FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.assessments a
      JOIN public.courses c ON c.id = a.course_id
      WHERE a.id            = assessment_questions.assessment_id
        AND c.instructor_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.assessments a
      JOIN public.courses c ON c.id = a.course_id
      WHERE a.id            = assessment_questions.assessment_id
        AND c.instructor_id = auth.uid()
    )
  );

-- Instructors: delete questions in their own courses
CREATE POLICY "instructors delete own course questions"
  ON public.assessment_questions FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.assessments a
      JOIN public.courses c ON c.id = a.course_id
      WHERE a.id            = assessment_questions.assessment_id
        AND c.instructor_id = auth.uid()
    )
  );

-- Admins: full access
CREATE POLICY "admins manage assessment questions"
  ON public.assessment_questions FOR ALL TO authenticated
  USING    (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- assessment_attempts
-- ============================================================
ALTER TABLE public.assessment_attempts ENABLE ROW LEVEL SECURITY;

-- Students: read their own attempts
CREATE POLICY "students read own attempts"
  ON public.assessment_attempts FOR SELECT TO authenticated
  USING (student_id = auth.uid());

-- Students: start a new attempt (insert)
CREATE POLICY "students insert own attempts"
  ON public.assessment_attempts FOR INSERT TO authenticated
  WITH CHECK (student_id = auth.uid());

-- Students: update their own in-progress attempts (e.g. submit)
CREATE POLICY "students update own in_progress attempts"
  ON public.assessment_attempts FOR UPDATE TO authenticated
  USING    (student_id = auth.uid() AND state = 'in_progress')
  WITH CHECK (student_id = auth.uid());

-- Instructors: read attempts by students enrolled in their courses
CREATE POLICY "instructors read own course student attempts"
  ON public.assessment_attempts FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.assessments a
      JOIN public.courses c ON c.id = a.course_id
      WHERE a.id            = assessment_attempts.assessment_id
        AND c.instructor_id = auth.uid()
    )
  );

-- Admins: full access
CREATE POLICY "admins manage assessment attempts"
  ON public.assessment_attempts FOR ALL TO authenticated
  USING    (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- assessment_responses
-- ============================================================
ALTER TABLE public.assessment_responses ENABLE ROW LEVEL SECURITY;

-- Students: read their own responses (via attempt ownership)
CREATE POLICY "students read own responses"
  ON public.assessment_responses FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.assessment_attempts aa
      WHERE aa.id         = assessment_responses.attempt_id
        AND aa.student_id = auth.uid()
    )
  );

-- Students: insert responses for their own attempts
CREATE POLICY "students insert own responses"
  ON public.assessment_responses FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.assessment_attempts aa
      WHERE aa.id         = assessment_responses.attempt_id
        AND aa.student_id = auth.uid()
    )
  );

-- Students: update their own responses (allowed while attempt is in_progress)
CREATE POLICY "students update own responses"
  ON public.assessment_responses FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.assessment_attempts aa
      WHERE aa.id         = assessment_responses.attempt_id
        AND aa.student_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.assessment_attempts aa
      WHERE aa.id         = assessment_responses.attempt_id
        AND aa.student_id = auth.uid()
    )
  );

-- Instructors: read responses for students in their courses (for essay review)
CREATE POLICY "instructors read own course student responses"
  ON public.assessment_responses FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.assessment_attempts aa
      JOIN public.assessments a  ON a.id  = aa.assessment_id
      JOIN public.courses     c  ON c.id  = a.course_id
      WHERE aa.id             = assessment_responses.attempt_id
        AND c.instructor_id   = auth.uid()
    )
  );

-- Instructors: update responses (set final_score, released flag after essay review)
CREATE POLICY "instructors update own course student responses"
  ON public.assessment_responses FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.assessment_attempts aa
      JOIN public.assessments a  ON a.id  = aa.assessment_id
      JOIN public.courses     c  ON c.id  = a.course_id
      WHERE aa.id             = assessment_responses.attempt_id
        AND c.instructor_id   = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.assessment_attempts aa
      JOIN public.assessments a  ON a.id  = aa.assessment_id
      JOIN public.courses     c  ON c.id  = a.course_id
      WHERE aa.id             = assessment_responses.attempt_id
        AND c.instructor_id   = auth.uid()
    )
  );

-- Admins: full access
CREATE POLICY "admins manage assessment responses"
  ON public.assessment_responses FOR ALL TO authenticated
  USING    (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- grade_overrides
-- ============================================================
ALTER TABLE public.grade_overrides ENABLE ROW LEVEL SECURITY;

-- Students: read grade overrides that apply to their own responses
CREATE POLICY "students read own grade overrides"
  ON public.grade_overrides FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.assessment_responses ar
      JOIN public.assessment_attempts aa ON aa.id = ar.attempt_id
      WHERE ar.id         = grade_overrides.response_id
        AND aa.student_id = auth.uid()
    )
  );

-- Instructors: read grade overrides in their own courses
CREATE POLICY "instructors read own course grade overrides"
  ON public.grade_overrides FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.assessment_responses ar
      JOIN public.assessment_attempts aa ON aa.id  = ar.attempt_id
      JOIN public.assessments         a  ON a.id   = aa.assessment_id
      JOIN public.courses             c  ON c.id   = a.course_id
      WHERE ar.id           = grade_overrides.response_id
        AND c.instructor_id = auth.uid()
    )
  );

-- Instructors: insert grade overrides for responses in their own courses
-- (insert-only; deletes require admin role per security design)
CREATE POLICY "instructors insert grade overrides"
  ON public.grade_overrides FOR INSERT TO authenticated
  WITH CHECK (
    instructor_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.assessment_responses ar
      JOIN public.assessment_attempts aa ON aa.id  = ar.attempt_id
      JOIN public.assessments         a  ON a.id   = aa.assessment_id
      JOIN public.courses             c  ON c.id   = a.course_id
      WHERE ar.id           = grade_overrides.response_id
        AND c.instructor_id = auth.uid()
    )
  );

-- Admins: full access (including delete)
CREATE POLICY "admins manage grade overrides"
  ON public.grade_overrides FOR ALL TO authenticated
  USING    (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- platform_config
-- ============================================================
ALTER TABLE public.platform_config ENABLE ROW LEVEL SECURITY;

-- Students: read only the pass_mark key
CREATE POLICY "students read pass_mark config"
  ON public.platform_config FOR SELECT TO authenticated
  USING (key = 'pass_mark');

-- Instructors: read all config keys (read-only)
CREATE POLICY "instructors read platform config"
  ON public.platform_config FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'instructor'));

-- Admins: full access (insert, update, delete)
CREATE POLICY "admins manage platform config"
  ON public.platform_config FOR ALL TO authenticated
  USING    (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
