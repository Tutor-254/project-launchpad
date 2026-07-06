-- Assessment + Screening tables and functions (previously written but never applied to this DB)

-- assessments
CREATE TABLE public.assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('CAT_1','CAT_2','FINAL_EXAM')),
  title text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (course_id, type)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.assessments TO authenticated;
GRANT ALL ON public.assessments TO service_role;
ALTER TABLE public.assessments ENABLE ROW LEVEL SECURITY;
CREATE INDEX assessments_course_id_idx ON public.assessments (course_id);

CREATE POLICY "students read enrolled assessments" ON public.assessments FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.enrollments e WHERE e.course_id = assessments.course_id AND e.user_id = auth.uid()));
CREATE POLICY "instructors read own course assessments" ON public.assessments FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.courses c WHERE c.id = assessments.course_id AND c.instructor_id = auth.uid()));
CREATE POLICY "instructors insert own course assessments" ON public.assessments FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.courses c WHERE c.id = assessments.course_id AND c.instructor_id = auth.uid()));
CREATE POLICY "admins manage assessments" ON public.assessments FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- assessment_questions
CREATE TABLE public.assessment_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id uuid NOT NULL REFERENCES public.assessments(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('MCQ','SHORT_ANSWER','ESSAY')),
  stem text NOT NULL,
  options jsonb,
  model_answer text,
  rubric text,
  source_ref text,
  status text NOT NULL DEFAULT 'pending_review' CHECK (status IN ('pending_review','approved','rejected')),
  ai_generated boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.assessment_questions TO authenticated;
GRANT ALL ON public.assessment_questions TO service_role;
ALTER TABLE public.assessment_questions ENABLE ROW LEVEL SECURITY;
CREATE INDEX assessment_questions_assessment_id_idx ON public.assessment_questions (assessment_id);
CREATE INDEX assessment_questions_status_idx ON public.assessment_questions (status);

CREATE POLICY "students read approved assessment questions" ON public.assessment_questions FOR SELECT TO authenticated
  USING (status = 'approved' AND EXISTS (SELECT 1 FROM public.assessments a JOIN public.enrollments e ON e.course_id = a.course_id WHERE a.id = assessment_questions.assessment_id AND e.user_id = auth.uid()));
CREATE POLICY "instructors read own course questions" ON public.assessment_questions FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.assessments a JOIN public.courses c ON c.id = a.course_id WHERE a.id = assessment_questions.assessment_id AND c.instructor_id = auth.uid()));
CREATE POLICY "instructors insert own course questions" ON public.assessment_questions FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.assessments a JOIN public.courses c ON c.id = a.course_id WHERE a.id = assessment_questions.assessment_id AND c.instructor_id = auth.uid()));
CREATE POLICY "instructors update own course questions" ON public.assessment_questions FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.assessments a JOIN public.courses c ON c.id = a.course_id WHERE a.id = assessment_questions.assessment_id AND c.instructor_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.assessments a JOIN public.courses c ON c.id = a.course_id WHERE a.id = assessment_questions.assessment_id AND c.instructor_id = auth.uid()));
CREATE POLICY "instructors delete own course questions" ON public.assessment_questions FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.assessments a JOIN public.courses c ON c.id = a.course_id WHERE a.id = assessment_questions.assessment_id AND c.instructor_id = auth.uid()));
CREATE POLICY "admins manage assessment questions" ON public.assessment_questions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- assessment_attempts
CREATE TABLE public.assessment_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id uuid NOT NULL REFERENCES public.assessments(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  state text NOT NULL DEFAULT 'in_progress' CHECK (state IN ('in_progress','submitted','graded','pending_review','released')),
  score numeric(5,2),
  preliminary_score numeric(5,2),
  started_at timestamptz NOT NULL DEFAULT now(),
  submitted_at timestamptz,
  released_at timestamptz,
  attempt_number int NOT NULL DEFAULT 1,
  UNIQUE (assessment_id, student_id, attempt_number)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.assessment_attempts TO authenticated;
GRANT ALL ON public.assessment_attempts TO service_role;
ALTER TABLE public.assessment_attempts ENABLE ROW LEVEL SECURITY;
CREATE INDEX assessment_attempts_assessment_id_idx ON public.assessment_attempts (assessment_id);
CREATE INDEX assessment_attempts_student_id_idx ON public.assessment_attempts (student_id);
CREATE INDEX assessment_attempts_state_idx ON public.assessment_attempts (state);

CREATE POLICY "students read own attempts" ON public.assessment_attempts FOR SELECT TO authenticated USING (student_id = auth.uid());
CREATE POLICY "students insert own attempts" ON public.assessment_attempts FOR INSERT TO authenticated WITH CHECK (student_id = auth.uid());
CREATE POLICY "students update own in_progress attempts" ON public.assessment_attempts FOR UPDATE TO authenticated
  USING (student_id = auth.uid() AND state = 'in_progress') WITH CHECK (student_id = auth.uid());
CREATE POLICY "instructors read own course student attempts" ON public.assessment_attempts FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.assessments a JOIN public.courses c ON c.id = a.course_id WHERE a.id = assessment_attempts.assessment_id AND c.instructor_id = auth.uid()));
CREATE POLICY "admins manage assessment attempts" ON public.assessment_attempts FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- assessment_responses
CREATE TABLE public.assessment_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id uuid NOT NULL REFERENCES public.assessment_attempts(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES public.assessment_questions(id) ON DELETE CASCADE,
  response_text text,
  selected_option text,
  ai_score numeric(5,2),
  ai_feedback text,
  needs_review boolean NOT NULL DEFAULT false,
  final_score numeric(5,2),
  released boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (attempt_id, question_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.assessment_responses TO authenticated;
GRANT ALL ON public.assessment_responses TO service_role;
ALTER TABLE public.assessment_responses ENABLE ROW LEVEL SECURITY;
CREATE INDEX assessment_responses_attempt_id_idx ON public.assessment_responses (attempt_id);
CREATE INDEX assessment_responses_question_id_idx ON public.assessment_responses (question_id);
CREATE INDEX assessment_responses_needs_review_idx ON public.assessment_responses (needs_review) WHERE needs_review = true;

CREATE POLICY "students read own responses" ON public.assessment_responses FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.assessment_attempts aa WHERE aa.id = assessment_responses.attempt_id AND aa.student_id = auth.uid()));
CREATE POLICY "students insert own responses" ON public.assessment_responses FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.assessment_attempts aa WHERE aa.id = assessment_responses.attempt_id AND aa.student_id = auth.uid()));
CREATE POLICY "students update own responses" ON public.assessment_responses FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.assessment_attempts aa WHERE aa.id = assessment_responses.attempt_id AND aa.student_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.assessment_attempts aa WHERE aa.id = assessment_responses.attempt_id AND aa.student_id = auth.uid()));
CREATE POLICY "instructors read own course student responses" ON public.assessment_responses FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.assessment_attempts aa JOIN public.assessments a ON a.id = aa.assessment_id JOIN public.courses c ON c.id = a.course_id WHERE aa.id = assessment_responses.attempt_id AND c.instructor_id = auth.uid()));
CREATE POLICY "instructors update own course student responses" ON public.assessment_responses FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.assessment_attempts aa JOIN public.assessments a ON a.id = aa.assessment_id JOIN public.courses c ON c.id = a.course_id WHERE aa.id = assessment_responses.attempt_id AND c.instructor_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.assessment_attempts aa JOIN public.assessments a ON a.id = aa.assessment_id JOIN public.courses c ON c.id = a.course_id WHERE aa.id = assessment_responses.attempt_id AND c.instructor_id = auth.uid()));
CREATE POLICY "admins manage assessment responses" ON public.assessment_responses FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- grade_overrides
CREATE TABLE public.grade_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  response_id uuid NOT NULL REFERENCES public.assessment_responses(id) ON DELETE CASCADE,
  instructor_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  original_score numeric(5,2) NOT NULL,
  override_score numeric(5,2) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.grade_overrides TO authenticated;
GRANT ALL ON public.grade_overrides TO service_role;
ALTER TABLE public.grade_overrides ENABLE ROW LEVEL SECURITY;
CREATE INDEX grade_overrides_response_id_idx ON public.grade_overrides (response_id);
CREATE INDEX grade_overrides_instructor_id_idx ON public.grade_overrides (instructor_id);

CREATE POLICY "students read own grade overrides" ON public.grade_overrides FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.assessment_responses ar JOIN public.assessment_attempts aa ON aa.id = ar.attempt_id WHERE ar.id = grade_overrides.response_id AND aa.student_id = auth.uid()));
CREATE POLICY "instructors read own course grade overrides" ON public.grade_overrides FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.assessment_responses ar JOIN public.assessment_attempts aa ON aa.id = ar.attempt_id JOIN public.assessments a ON a.id = aa.assessment_id JOIN public.courses c ON c.id = a.course_id WHERE ar.id = grade_overrides.response_id AND c.instructor_id = auth.uid()));
CREATE POLICY "instructors insert grade overrides" ON public.grade_overrides FOR INSERT TO authenticated
  WITH CHECK (instructor_id = auth.uid() AND EXISTS (SELECT 1 FROM public.assessment_responses ar JOIN public.assessment_attempts aa ON aa.id = ar.attempt_id JOIN public.assessments a ON a.id = aa.assessment_id JOIN public.courses c ON c.id = a.course_id WHERE ar.id = grade_overrides.response_id AND c.instructor_id = auth.uid()));
CREATE POLICY "admins manage grade overrides" ON public.grade_overrides FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- platform_config
CREATE TABLE public.platform_config (
  key text PRIMARY KEY,
  value text NOT NULL
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.platform_config TO authenticated;
GRANT ALL ON public.platform_config TO service_role;
ALTER TABLE public.platform_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "students read pass_mark config" ON public.platform_config FOR SELECT TO authenticated USING (key = 'pass_mark');
CREATE POLICY "instructors read platform config" ON public.platform_config FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'instructor'));
CREATE POLICY "admins manage platform config" ON public.platform_config FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "authenticated read screening config" ON public.platform_config FOR SELECT TO authenticated
  USING (key IN ('screening_pass_threshold','screening_question_count'));

INSERT INTO public.platform_config (key, value) VALUES
  ('pass_mark','60'),
  ('screening_pass_threshold','70'),
  ('screening_question_count','5')
ON CONFLICT DO NOTHING;

-- Functions
CREATE OR REPLACE FUNCTION public.compute_weighted_score(p_student_id uuid, p_course_id uuid)
RETURNS numeric LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_cat1 numeric; v_cat2 numeric; v_final numeric;
BEGIN
  SELECT MAX(aa.score) INTO v_cat1 FROM public.assessment_attempts aa JOIN public.assessments a ON a.id=aa.assessment_id
    WHERE a.course_id=p_course_id AND aa.student_id=p_student_id AND a.type='CAT_1' AND aa.state='released' AND aa.score IS NOT NULL;
  SELECT MAX(aa.score) INTO v_cat2 FROM public.assessment_attempts aa JOIN public.assessments a ON a.id=aa.assessment_id
    WHERE a.course_id=p_course_id AND aa.student_id=p_student_id AND a.type='CAT_2' AND aa.state='released' AND aa.score IS NOT NULL;
  SELECT MAX(aa.score) INTO v_final FROM public.assessment_attempts aa JOIN public.assessments a ON a.id=aa.assessment_id
    WHERE a.course_id=p_course_id AND aa.student_id=p_student_id AND a.type='FINAL_EXAM' AND aa.state='released' AND aa.score IS NOT NULL;
  IF v_cat1 IS NULL OR v_cat2 IS NULL OR v_final IS NULL THEN RETURN NULL; END IF;
  RETURN ROUND((v_cat1*0.15)+(v_cat2*0.15)+(v_final*0.70),2);
END; $$;
REVOKE EXECUTE ON FUNCTION public.compute_weighted_score(uuid,uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.compute_weighted_score(uuid,uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_lecture_completion_pct(p_student_id uuid, p_course_id uuid)
RETURNS numeric LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_total int; v_done int;
BEGIN
  SELECT COUNT(l.id) INTO v_total FROM public.lectures l JOIN public.course_sections s ON s.id=l.section_id WHERE s.course_id=p_course_id;
  IF v_total=0 THEN RETURN 0; END IF;
  SELECT COUNT(lp.lecture_id) INTO v_done FROM public.lecture_progress lp
    JOIN public.lectures l ON l.id=lp.lecture_id
    JOIN public.course_sections s ON s.id=l.section_id
    WHERE s.course_id=p_course_id AND lp.user_id=p_student_id AND lp.completed=true;
  RETURN ROUND((v_done::numeric/v_total::numeric)*100,2);
END; $$;
REVOKE EXECUTE ON FUNCTION public.get_lecture_completion_pct(uuid,uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_lecture_completion_pct(uuid,uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.reset_student_attempts(p_assessment_id uuid, p_student_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_instructor uuid;
BEGIN
  SELECT c.instructor_id INTO v_instructor FROM public.assessments a JOIN public.courses c ON c.id=a.course_id WHERE a.id=p_assessment_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Assessment not found'; END IF;
  IF auth.uid() IS DISTINCT FROM v_instructor THEN RAISE EXCEPTION 'Forbidden'; END IF;
  DELETE FROM public.assessment_attempts WHERE assessment_id=p_assessment_id AND student_id=p_student_id;
END; $$;
REVOKE EXECUTE ON FUNCTION public.reset_student_attempts(uuid,uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reset_student_attempts(uuid,uuid) TO authenticated;

-- Course publish trigger auto-creates the three assessments
CREATE OR REPLACE FUNCTION public.tg_create_assessments_on_publish()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status='published' AND (OLD.status IS DISTINCT FROM 'published') THEN
    INSERT INTO public.assessments (course_id, type, title) VALUES
      (NEW.id,'CAT_1','Continuous Assessment Test 1'),
      (NEW.id,'CAT_2','Continuous Assessment Test 2'),
      (NEW.id,'FINAL_EXAM','Final Examination')
    ON CONFLICT (course_id, type) DO NOTHING;
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER on_course_published AFTER UPDATE OF status ON public.courses FOR EACH ROW EXECUTE FUNCTION public.tg_create_assessments_on_publish();

-- Screening: extend instructor_applications status
ALTER TABLE public.instructor_applications DROP CONSTRAINT IF EXISTS instructor_applications_status_check;
ALTER TABLE public.instructor_applications ADD CONSTRAINT instructor_applications_status_check
  CHECK (status IN ('pending_screening','pending','approved','rejected'));

-- screening_attempts
CREATE TABLE public.screening_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES public.instructor_applications(id) ON DELETE CASCADE,
  applicant_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  state text NOT NULL DEFAULT 'in_progress' CHECK (state IN ('in_progress','passed','failed')),
  score numeric(5,2),
  started_at timestamptz NOT NULL DEFAULT now(),
  submitted_at timestamptz,
  UNIQUE (application_id)
);
GRANT SELECT, INSERT, UPDATE ON public.screening_attempts TO authenticated;
GRANT ALL ON public.screening_attempts TO service_role;
ALTER TABLE public.screening_attempts ENABLE ROW LEVEL SECURITY;
CREATE INDEX screening_attempts_application_id_idx ON public.screening_attempts (application_id);
CREATE INDEX screening_attempts_applicant_id_idx ON public.screening_attempts (applicant_id);

CREATE POLICY "screening_attempts_applicant_select" ON public.screening_attempts FOR SELECT TO authenticated
  USING (applicant_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "screening_attempts_applicant_insert" ON public.screening_attempts FOR INSERT TO authenticated
  WITH CHECK (applicant_id = auth.uid());
CREATE POLICY "screening_attempts_applicant_update" ON public.screening_attempts FOR UPDATE TO authenticated
  USING (applicant_id = auth.uid());

-- screening_responses
CREATE TABLE public.screening_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id uuid NOT NULL REFERENCES public.screening_attempts(id) ON DELETE CASCADE,
  question_index int NOT NULL,
  question_stem text NOT NULL,
  question_type text NOT NULL CHECK (question_type IN ('MCQ','SHORT_ANSWER')),
  options jsonb,
  rubric text NOT NULL,
  model_answer text,
  response_text text,
  selected_option text,
  ai_score numeric(5,2),
  ai_feedback text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (attempt_id, question_index)
);
GRANT SELECT, INSERT, UPDATE ON public.screening_responses TO authenticated;
GRANT ALL ON public.screening_responses TO service_role;
ALTER TABLE public.screening_responses ENABLE ROW LEVEL SECURITY;
CREATE INDEX screening_responses_attempt_id_idx ON public.screening_responses (attempt_id);

CREATE POLICY "screening_responses_applicant_select" ON public.screening_responses FOR SELECT TO authenticated
  USING (attempt_id IN (SELECT id FROM public.screening_attempts WHERE applicant_id = auth.uid()) OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "screening_responses_applicant_insert" ON public.screening_responses FOR INSERT TO authenticated
  WITH CHECK (attempt_id IN (SELECT id FROM public.screening_attempts WHERE applicant_id = auth.uid()));
CREATE POLICY "screening_responses_applicant_update" ON public.screening_responses FOR UPDATE TO authenticated
  USING (attempt_id IN (SELECT id FROM public.screening_attempts WHERE applicant_id = auth.uid()));