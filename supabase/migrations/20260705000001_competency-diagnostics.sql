-- ========================================
-- Task 1: Competency Framework & Diagnostic Assessments Migration
-- ========================================

-- ========================================
-- 1.1 Create competencies table
-- ========================================
CREATE TABLE public.competencies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  title text NOT NULL,                              -- max 100 chars
  description text NOT NULL,                        -- max 500 chars
  observable_behaviors text[] NOT NULL,             -- array of 2-5 specific behaviors
  success_criteria text NOT NULL,                   -- definition of passing
  prerequisite_competencies uuid[] DEFAULT '{}',    -- array of competency IDs from earlier courses
  related_job_titles text[] DEFAULT '{}',           -- e.g., ["Junior Backend Developer", "API Specialist"]
  order_index integer NOT NULL DEFAULT 1,           -- sort order within course
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now(),
  CONSTRAINT competency_course_order_unique UNIQUE(course_id, order_index)
);

-- 1.2 Add unique partial index on competencies (course_id, order_index)
CREATE UNIQUE INDEX idx_competencies_course_order_unique 
  ON public.competencies (course_id, order_index);

-- 1.7 Create index for query performance on foreign keys
CREATE INDEX idx_competencies_course ON public.competencies(course_id);

-- 1.6a RLS: Competencies - authenticated SELECT all, instructors INSERT/UPDATE own course competencies
ALTER TABLE public.competencies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read competencies" 
  ON public.competencies FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Instructors can insert competencies for their courses" 
  ON public.competencies FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.courses c WHERE c.id = course_id AND c.instructor_id = auth.uid())
  );

CREATE POLICY "Instructors can update their course competencies" 
  ON public.competencies FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.courses c WHERE c.id = course_id AND c.instructor_id = auth.uid())
  );

GRANT SELECT ON public.competencies TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.competencies TO authenticated;

-- ========================================
-- 1.3 Create diagnostic_assessments table
-- ========================================
CREATE TABLE public.diagnostic_assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  name text NOT NULL,                               -- e.g., "Node.js Basics Diagnostic"
  description text,
  prerequisite_competency_ids uuid[] NOT NULL,     -- competencies this diagnostic covers
  pass_threshold integer NOT NULL DEFAULT 50,      -- % score to pass
  question_count integer NOT NULL DEFAULT 5,       -- 5-10 recommended
  cooldown_days integer NOT NULL DEFAULT 7,        -- min days before re-take
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

-- 1.7 Create index for query performance
CREATE INDEX idx_diagnostic_assessments_course ON public.diagnostic_assessments(course_id);

-- 1.6b RLS: Diagnostic assessments - authenticated SELECT all
ALTER TABLE public.diagnostic_assessments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read diagnostics" 
  ON public.diagnostic_assessments FOR SELECT TO authenticated
  USING (true);

GRANT SELECT ON public.diagnostic_assessments TO authenticated;

-- ========================================
-- 1.4 Create diagnostic_questions table
-- ========================================
CREATE TABLE public.diagnostic_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  diagnostic_id uuid NOT NULL REFERENCES public.diagnostic_assessments(id) ON DELETE CASCADE,
  question_text text NOT NULL,
  question_type text NOT NULL CHECK (question_type IN ('multiple_choice', 'short_answer')),
  options jsonb,                                    -- for multiple_choice: { choices: ["A", "B", "C"], correct: 1 }
  correct_answer text,                              -- for short_answer
  points integer NOT NULL DEFAULT 1,
  order_index integer NOT NULL,
  created_at timestamp DEFAULT now()
);

-- 1.7 Create index for query performance
CREATE INDEX idx_diagnostic_questions_diagnostic ON public.diagnostic_questions(diagnostic_id);

-- 1.6c RLS: Diagnostic questions - authenticated SELECT all
ALTER TABLE public.diagnostic_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read diagnostic questions" 
  ON public.diagnostic_questions FOR SELECT TO authenticated
  USING (true);

GRANT SELECT ON public.diagnostic_questions TO authenticated;

-- ========================================
-- 1.5 Create diagnostic_attempts table
-- ========================================
CREATE TABLE public.diagnostic_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  diagnostic_id uuid NOT NULL REFERENCES public.diagnostic_assessments(id) ON DELETE CASCADE,
  score integer NOT NULL,                           -- 0-100
  passed boolean GENERATED ALWAYS AS (
    score >= (SELECT pass_threshold FROM public.diagnostic_assessments d WHERE d.id = diagnostic_id)
  ) STORED,
  attempt_number integer NOT NULL,
  created_at timestamp DEFAULT now(),
  CONSTRAINT diagnostic_attempt_unique UNIQUE(user_id, diagnostic_id, attempt_number)
);

-- 1.7 Create indexes for query performance
CREATE INDEX idx_diagnostic_attempts_user ON public.diagnostic_attempts(user_id);
CREATE INDEX idx_diagnostic_attempts_diagnostic ON public.diagnostic_attempts(diagnostic_id);

-- 1.6d RLS: Diagnostic attempts - users SELECT/INSERT own, instructors SELECT their course diagnostics
ALTER TABLE public.diagnostic_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own diagnostic attempts" 
  ON public.diagnostic_attempts FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own diagnostic attempts" 
  ON public.diagnostic_attempts FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Instructors can read diagnostic attempts in their courses" 
  ON public.diagnostic_attempts FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.diagnostic_assessments da
      JOIN public.courses c ON c.id = da.course_id
      WHERE da.id = diagnostic_id AND c.instructor_id = auth.uid()
    )
  );

GRANT SELECT ON public.diagnostic_attempts TO authenticated;
GRANT SELECT, INSERT ON public.diagnostic_attempts TO authenticated;
