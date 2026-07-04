
-- ============ REVIEWS moderation flag ============
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS hidden boolean NOT NULL DEFAULT false;

-- ============ QUESTIONS ============
CREATE TABLE public.questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  lecture_id uuid REFERENCES public.lectures(id) ON DELETE SET NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  body text NOT NULL,
  hidden boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.questions TO authenticated;
GRANT SELECT ON public.questions TO anon;
GRANT ALL ON public.questions TO service_role;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "questions readable when not hidden"
  ON public.questions FOR SELECT
  USING (
    NOT hidden
    OR user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.courses c WHERE c.id = course_id AND c.instructor_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  );
CREATE POLICY "enrolled or instructor can ask"
  ON public.questions FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND (
      EXISTS (SELECT 1 FROM public.enrollments e WHERE e.course_id = questions.course_id AND e.user_id = auth.uid())
      OR EXISTS (SELECT 1 FROM public.courses c WHERE c.id = questions.course_id AND c.instructor_id = auth.uid())
    )
  );
CREATE POLICY "author can update own question"
  ON public.questions FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "author or admin can delete question"
  ON public.questions FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER questions_set_updated_at BEFORE UPDATE ON public.questions
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

ALTER TABLE public.questions
  ADD CONSTRAINT questions_user_profile_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- ============ ANSWERS ============
CREATE TABLE public.answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id uuid NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body text NOT NULL,
  is_instructor_answer boolean NOT NULL DEFAULT false,
  hidden boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.answers TO authenticated;
GRANT SELECT ON public.answers TO anon;
GRANT ALL ON public.answers TO service_role;
ALTER TABLE public.answers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "answers readable when not hidden"
  ON public.answers FOR SELECT
  USING (
    NOT hidden
    OR user_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
  );
CREATE POLICY "enrolled or instructor can answer"
  ON public.answers FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.questions q
      JOIN public.courses c ON c.id = q.course_id
      WHERE q.id = answers.question_id
        AND (
          c.instructor_id = auth.uid()
          OR EXISTS (SELECT 1 FROM public.enrollments e WHERE e.course_id = c.id AND e.user_id = auth.uid())
        )
    )
  );
CREATE POLICY "author can update own answer"
  ON public.answers FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "author or admin can delete answer"
  ON public.answers FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER answers_set_updated_at BEFORE UPDATE ON public.answers
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

ALTER TABLE public.answers
  ADD CONSTRAINT answers_user_profile_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- auto-flag instructor answers
CREATE OR REPLACE FUNCTION public.tg_mark_instructor_answer()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.questions q
    JOIN public.courses c ON c.id = q.course_id
    WHERE q.id = NEW.question_id AND c.instructor_id = NEW.user_id
  ) THEN
    NEW.is_instructor_answer := true;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER answers_mark_instructor BEFORE INSERT ON public.answers
  FOR EACH ROW EXECUTE FUNCTION public.tg_mark_instructor_answer();

-- ============ NOTIFICATIONS ============
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user reads own notifications"
  ON public.notifications FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "user updates own notifications"
  ON public.notifications FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "user deletes own notifications"
  ON public.notifications FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE INDEX notifications_user_unread_idx ON public.notifications (user_id, read_at, created_at DESC);

-- ============ NOTIFICATION TRIGGERS ============
CREATE OR REPLACE FUNCTION public.tg_notify_new_answer()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  asker uuid;
  q_title text;
  q_course uuid;
BEGIN
  SELECT user_id, title, course_id INTO asker, q_title, q_course
    FROM public.questions WHERE id = NEW.question_id;
  IF asker IS NOT NULL AND asker <> NEW.user_id THEN
    INSERT INTO public.notifications (user_id, type, payload)
    VALUES (asker, 'answer.new', jsonb_build_object(
      'question_id', NEW.question_id,
      'answer_id', NEW.id,
      'course_id', q_course,
      'question_title', q_title,
      'is_instructor_answer', NEW.is_instructor_answer
    ));
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER answers_notify AFTER INSERT ON public.answers
  FOR EACH ROW EXECUTE FUNCTION public.tg_notify_new_answer();

CREATE OR REPLACE FUNCTION public.tg_notify_new_question()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  instructor uuid;
BEGIN
  SELECT instructor_id INTO instructor FROM public.courses WHERE id = NEW.course_id;
  IF instructor IS NOT NULL AND instructor <> NEW.user_id THEN
    INSERT INTO public.notifications (user_id, type, payload)
    VALUES (instructor, 'question.new', jsonb_build_object(
      'question_id', NEW.id,
      'course_id', NEW.course_id,
      'title', NEW.title
    ));
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER questions_notify AFTER INSERT ON public.questions
  FOR EACH ROW EXECUTE FUNCTION public.tg_notify_new_question();

CREATE OR REPLACE FUNCTION public.tg_notify_new_review()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  instructor uuid;
  c_title text;
BEGIN
  SELECT instructor_id, title INTO instructor, c_title FROM public.courses WHERE id = NEW.course_id;
  IF instructor IS NOT NULL AND instructor <> NEW.user_id THEN
    INSERT INTO public.notifications (user_id, type, payload)
    VALUES (instructor, 'review.new', jsonb_build_object(
      'review_id', NEW.id,
      'course_id', NEW.course_id,
      'rating', NEW.rating,
      'course_title', c_title
    ));
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER reviews_notify AFTER INSERT ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.tg_notify_new_review();

-- ============ COUPONS ============
CREATE TABLE public.coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  course_id uuid REFERENCES public.courses(id) ON DELETE CASCADE,
  percent_off int NOT NULL CHECK (percent_off BETWEEN 1 AND 100),
  expires_at timestamptz,
  max_redemptions int,
  redemptions int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.coupons TO anon, authenticated;
GRANT ALL ON public.coupons TO service_role;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "coupons readable by all" ON public.coupons FOR SELECT USING (true);
CREATE POLICY "admins manage coupons" ON public.coupons FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============ COURSES FULL-TEXT SEARCH ============
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS search_tsv tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(subtitle, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(description, '')), 'C')
  ) STORED;
CREATE INDEX IF NOT EXISTS courses_search_tsv_idx ON public.courses USING GIN (search_tsv);
