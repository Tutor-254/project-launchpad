-- ========================================
-- Task 4: Competency Badges and Learner Pathways (Part 2 - Pathways)
-- ========================================

-- ========================================
-- 4.3 Create learner_pathways table
-- ========================================
CREATE TABLE public.learner_pathways (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  recommended_start_section_id uuid,  -- REFERENCES course_sections(id) if table exists
  skip_section_ids uuid[] DEFAULT '{}',
  baseline_competencies text[] DEFAULT '{}',       -- e.g., ["Basic spreadsheet knowledge"]
  recommendation_reason text,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now(),
  CONSTRAINT one_pathway_per_course_per_user UNIQUE(user_id, course_id)
);

-- 4.6 Create indexes on user_id, course_id
CREATE INDEX idx_learner_pathways_user ON public.learner_pathways(user_id);
CREATE INDEX idx_learner_pathways_course ON public.learner_pathways(course_id);

-- 4.5b RLS: Pathways - users SELECT own, service role INSERT/UPDATE
ALTER TABLE public.learner_pathways ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own pathways" 
  ON public.learner_pathways FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Service role can insert pathways" 
  ON public.learner_pathways FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Service role can update pathways" 
  ON public.learner_pathways FOR UPDATE
  USING (true);

GRANT SELECT ON public.learner_pathways TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.learner_pathways TO authenticated;
