-- ============================================================
-- Instructor AI Screening Migration
-- Adds pending_screening status, screening_attempts,
-- screening_responses tables, and platform_config defaults
-- ============================================================

-- 1. Extend instructor_applications status to include pending_screening
ALTER TABLE public.instructor_applications
  DROP CONSTRAINT IF EXISTS instructor_applications_status_check;

ALTER TABLE public.instructor_applications
  ADD CONSTRAINT instructor_applications_status_check
  CHECK (status IN ('pending_screening', 'pending', 'approved', 'rejected'));

-- 2. screening_attempts
CREATE TABLE public.screening_attempts (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id  uuid        NOT NULL REFERENCES public.instructor_applications(id) ON DELETE CASCADE,
  applicant_id    uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  state           text        NOT NULL DEFAULT 'in_progress'
                                CHECK (state IN ('in_progress', 'passed', 'failed')),
  score           numeric(5,2),
  started_at      timestamptz NOT NULL DEFAULT now(),
  submitted_at    timestamptz,
  UNIQUE (application_id)  -- one attempt per application
);

CREATE INDEX screening_attempts_application_id_idx ON public.screening_attempts (application_id);
CREATE INDEX screening_attempts_applicant_id_idx   ON public.screening_attempts (applicant_id);

-- 3. screening_responses
CREATE TABLE public.screening_responses (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id      uuid        NOT NULL REFERENCES public.screening_attempts(id) ON DELETE CASCADE,
  question_index  int         NOT NULL,
  question_stem   text        NOT NULL,
  question_type   text        NOT NULL CHECK (question_type IN ('MCQ', 'SHORT_ANSWER')),
  options         jsonb,                          -- [{id, text, is_correct}] for MCQ
  rubric          text        NOT NULL,
  model_answer    text,
  response_text   text,
  selected_option text,
  ai_score        numeric(5,2),
  ai_feedback     text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (attempt_id, question_index)
);

CREATE INDEX screening_responses_attempt_id_idx ON public.screening_responses (attempt_id);

-- 4. Platform config defaults for screening
INSERT INTO public.platform_config (key, value)
VALUES
  ('screening_pass_threshold', '70'),
  ('screening_question_count', '5')
ON CONFLICT DO NOTHING;

-- 5. RLS policies for screening tables

ALTER TABLE public.screening_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.screening_responses ENABLE ROW LEVEL SECURITY;

-- Grant permissions on new tables
GRANT SELECT, INSERT, UPDATE ON public.screening_attempts  TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.screening_responses TO authenticated;
GRANT ALL ON public.screening_attempts  TO service_role;
GRANT ALL ON public.screening_responses TO service_role;

-- screening_attempts: applicants can read/insert/update their own; admins can read all
CREATE POLICY "screening_attempts_applicant_select"
  ON public.screening_attempts FOR SELECT TO authenticated
  USING (applicant_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "screening_attempts_applicant_insert"
  ON public.screening_attempts FOR INSERT TO authenticated
  WITH CHECK (applicant_id = auth.uid());

CREATE POLICY "screening_attempts_applicant_update"
  ON public.screening_attempts FOR UPDATE TO authenticated
  USING (applicant_id = auth.uid());

-- screening_responses: applicants can read/insert/update their own attempt's responses; admins can read all
CREATE POLICY "screening_responses_applicant_select"
  ON public.screening_responses FOR SELECT TO authenticated
  USING (
    attempt_id IN (
      SELECT id FROM public.screening_attempts WHERE applicant_id = auth.uid()
    )
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "screening_responses_applicant_insert"
  ON public.screening_responses FOR INSERT TO authenticated
  WITH CHECK (
    attempt_id IN (
      SELECT id FROM public.screening_attempts WHERE applicant_id = auth.uid()
    )
  );

CREATE POLICY "screening_responses_applicant_update"
  ON public.screening_responses FOR UPDATE TO authenticated
  USING (
    attempt_id IN (
      SELECT id FROM public.screening_attempts WHERE applicant_id = auth.uid()
    )
  );

-- platform_config: allow authenticated users to read screening config keys
-- (supplements the existing policies in 20260705000002 which only covered pass_mark/instructor reads)
CREATE POLICY "authenticated read screening config"
  ON public.platform_config FOR SELECT TO authenticated
  USING (key IN ('screening_pass_threshold', 'screening_question_count'));
