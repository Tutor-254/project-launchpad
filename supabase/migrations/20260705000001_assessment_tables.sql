-- ============================================================
-- Assessment Tables Migration
-- Creates: assessments, assessment_questions, assessment_attempts,
--          assessment_responses, grade_overrides, platform_config
-- ============================================================

-- -------------------------
-- assessments
-- -------------------------
CREATE TABLE public.assessments (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id  uuid        NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  type       text        NOT NULL CHECK (type IN ('CAT_1', 'CAT_2', 'FINAL_EXAM')),
  title      text        NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (course_id, type)
);

CREATE INDEX assessments_course_id_idx ON public.assessments (course_id);

-- -------------------------
-- assessment_questions
-- -------------------------
CREATE TABLE public.assessment_questions (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id  uuid        NOT NULL REFERENCES public.assessments(id) ON DELETE CASCADE,
  type           text        NOT NULL CHECK (type IN ('MCQ', 'SHORT_ANSWER', 'ESSAY')),
  stem           text        NOT NULL,
  options        jsonb,                          -- [{id, text, is_correct}] for MCQ only
  model_answer   text,
  rubric         text,
  source_ref     text,                           -- lecture/section title the AI derived it from
  status         text        NOT NULL DEFAULT 'pending_review'
                               CHECK (status IN ('pending_review', 'approved', 'rejected')),
  ai_generated   boolean     NOT NULL DEFAULT false,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX assessment_questions_assessment_id_idx ON public.assessment_questions (assessment_id);
CREATE INDEX assessment_questions_status_idx        ON public.assessment_questions (status);

-- -------------------------
-- assessment_attempts
-- -------------------------
CREATE TABLE public.assessment_attempts (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id     uuid        NOT NULL REFERENCES public.assessments(id) ON DELETE CASCADE,
  student_id        uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  state             text        NOT NULL DEFAULT 'in_progress'
                                  CHECK (state IN (
                                    'in_progress', 'submitted', 'graded',
                                    'pending_review', 'released'
                                  )),
  score             numeric(5,2),   -- final released score 0-100
  preliminary_score numeric(5,2),  -- score excluding pending essays
  started_at        timestamptz NOT NULL DEFAULT now(),
  submitted_at      timestamptz,
  released_at       timestamptz,
  attempt_number    int         NOT NULL DEFAULT 1,
  UNIQUE (assessment_id, student_id, attempt_number)
);

CREATE INDEX assessment_attempts_assessment_id_idx ON public.assessment_attempts (assessment_id);
CREATE INDEX assessment_attempts_student_id_idx    ON public.assessment_attempts (student_id);
CREATE INDEX assessment_attempts_state_idx         ON public.assessment_attempts (state);

-- -------------------------
-- assessment_responses
-- -------------------------
CREATE TABLE public.assessment_responses (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id      uuid        NOT NULL REFERENCES public.assessment_attempts(id) ON DELETE CASCADE,
  question_id     uuid        NOT NULL REFERENCES public.assessment_questions(id) ON DELETE CASCADE,
  response_text   text,
  selected_option text,                          -- option id for MCQ
  ai_score        numeric(5,2),
  ai_feedback     text,
  needs_review    boolean     NOT NULL DEFAULT false,
  final_score     numeric(5,2),                  -- set after instructor review or ai_score if no review needed
  released        boolean     NOT NULL DEFAULT false,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (attempt_id, question_id)
);

CREATE INDEX assessment_responses_attempt_id_idx  ON public.assessment_responses (attempt_id);
CREATE INDEX assessment_responses_question_id_idx ON public.assessment_responses (question_id);
CREATE INDEX assessment_responses_needs_review_idx ON public.assessment_responses (needs_review)
  WHERE needs_review = true;

-- -------------------------
-- grade_overrides
-- -------------------------
CREATE TABLE public.grade_overrides (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  response_id    uuid        NOT NULL REFERENCES public.assessment_responses(id) ON DELETE CASCADE,
  instructor_id  uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  original_score numeric(5,2) NOT NULL,
  override_score numeric(5,2) NOT NULL,
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX grade_overrides_response_id_idx   ON public.grade_overrides (response_id);
CREATE INDEX grade_overrides_instructor_id_idx ON public.grade_overrides (instructor_id);

-- -------------------------
-- platform_config
-- -------------------------
CREATE TABLE public.platform_config (
  key   text PRIMARY KEY,
  value text NOT NULL
);

-- Seed default pass mark
INSERT INTO public.platform_config (key, value)
VALUES ('pass_mark', '60')
ON CONFLICT DO NOTHING;
