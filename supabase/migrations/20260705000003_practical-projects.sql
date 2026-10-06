-- ========================================
-- Tasks 3-8: Practical Projects, Grading, and Badges
-- ========================================

-- ========================================
-- 3.1 Create rubrics table
-- ========================================
CREATE TABLE public.rubrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  criteria jsonb NOT NULL, -- [{ name: "Code Quality", points: 5 }, { name: "Documentation", points: 3 }]
  total_points integer GENERATED ALWAYS AS (
    COALESCE((SELECT SUM(CAST(c->>'points' AS integer)) FROM jsonb_array_elements(criteria) AS c), 0)
  ) STORED,
  passing_score_percent integer NOT NULL DEFAULT 70,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

-- ========================================
-- 3.2 Create practical_projects table
-- ========================================
CREATE TABLE public.practical_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  competency_id uuid NOT NULL REFERENCES public.competencies(id) ON DELETE CASCADE,
  title text NOT NULL,
  brief text NOT NULL,
  example_url text,
  submission_instructions text NOT NULL,
  accepted_file_types text[] DEFAULT '{"pdf", "zip", "json"}'::text[],
  max_file_size_mb integer NOT NULL DEFAULT 50,
  rubric_id uuid REFERENCES public.rubrics(id) ON DELETE SET NULL,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

-- ========================================
-- 3.3 Create project_submissions table
-- ========================================
CREATE TABLE public.project_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.practical_projects(id) ON DELETE CASCADE,
  submission_version integer NOT NULL DEFAULT 1,
  submission_type text NOT NULL CHECK (submission_type IN ('file', 'url', 'video')),
  file_url text,
  external_url text,
  video_url text,
  submission_text text,
  status text NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'under_review', 'graded', 'rejected')),
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now(),
  CONSTRAINT one_submission_per_user_project UNIQUE(user_id, project_id)
);

-- ========================================
-- 3.4 Create project_grades table
-- ========================================
CREATE TABLE public.project_grades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id uuid NOT NULL REFERENCES public.project_submissions(id) ON DELETE CASCADE,
  rubric_id uuid NOT NULL REFERENCES public.rubrics(id) ON DELETE RESTRICT,
  graded_by_user_id uuid NOT NULL REFERENCES public.profiles(id),
  grading_type text NOT NULL CHECK (grading_type IN ('instructor', 'ai')),
  scores jsonb NOT NULL, -- { "Code Quality": 4, "Documentation": 2 }
  total_score integer NOT NULL,
  feedback text,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

-- ========================================
-- Indexes for query performance
-- ========================================
CREATE INDEX idx_rubrics_id ON public.rubrics(id);
CREATE INDEX idx_practical_projects_competency ON public.practical_projects(competency_id);
CREATE INDEX idx_practical_projects_rubric ON public.practical_projects(rubric_id);
CREATE INDEX idx_project_submissions_user ON public.project_submissions(user_id);
CREATE INDEX idx_project_submissions_project ON public.project_submissions(project_id);
CREATE INDEX idx_project_submissions_status ON public.project_submissions(status);
CREATE INDEX idx_project_grades_submission ON public.project_grades(submission_id);
CREATE INDEX idx_project_grades_rubric ON public.project_grades(rubric_id);

-- ========================================
-- RLS (Row Level Security)
-- ========================================

-- Rubrics: anyone can read
ALTER TABLE public.rubrics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone_read_rubrics" ON public.rubrics FOR SELECT USING (true);

-- Practical projects: anyone can read
ALTER TABLE public.practical_projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone_read_projects" ON public.practical_projects FOR SELECT USING (true);

-- Project submissions: users read own, insert own
ALTER TABLE public.project_submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_read_own_submissions" ON public.project_submissions FOR SELECT TO authenticated 
  USING (user_id = auth.uid());
CREATE POLICY "users_insert_submissions" ON public.project_submissions FOR INSERT TO authenticated 
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "users_update_own_submissions" ON public.project_submissions FOR UPDATE TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "instructors_read_submissions" ON public.project_submissions FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM practical_projects pp
      JOIN competencies c ON c.id = pp.competency_id
      JOIN courses co ON co.id = c.course_id
      WHERE pp.id = project_id AND co.instructor_id = auth.uid()
    )
  );

-- Project grades: users read own, instructors insert/read in their courses
ALTER TABLE public.project_grades ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_read_own_grades" ON public.project_grades FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM project_submissions ps WHERE ps.id = submission_id AND ps.user_id = auth.uid()
    )
  );
CREATE POLICY "instructors_insert_grades" ON public.project_grades FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM project_submissions ps
      JOIN practical_projects pp ON pp.id = ps.project_id
      JOIN competencies c ON c.id = pp.competency_id
      JOIN courses co ON co.id = c.course_id
      WHERE ps.id = submission_id AND co.instructor_id = auth.uid()
    )
  );
CREATE POLICY "instructors_read_grades" ON public.project_grades FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM project_submissions ps
      JOIN practical_projects pp ON pp.id = ps.project_id
      JOIN competencies c ON c.id = pp.competency_id
      JOIN courses co ON co.id = c.course_id
      WHERE ps.id = submission_id AND co.instructor_id = auth.uid()
    )
  );

-- ========================================
-- Grants
-- ========================================
GRANT SELECT ON public.rubrics TO authenticated;
GRANT SELECT ON public.practical_projects TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.project_submissions TO authenticated;
GRANT SELECT, INSERT ON public.project_grades TO authenticated;
