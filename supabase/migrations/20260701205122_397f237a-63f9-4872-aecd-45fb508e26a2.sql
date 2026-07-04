
-- Enums
CREATE TYPE public.app_role AS ENUM ('student', 'instructor', 'admin');
CREATE TYPE public.course_status AS ENUM ('draft', 'published');
CREATE TYPE public.course_level AS ENUM ('beginner', 'intermediate', 'advanced', 'all');

-- Profiles (mirrors auth.users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  headline TEXT,
  bio TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.profiles TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- User roles (separate table, per security guidance)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can grant themselves instructor role" ON public.user_roles FOR INSERT
  WITH CHECK (auth.uid() = user_id AND role IN ('student', 'instructor'));

-- has_role security-definer function
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- Auto-create profile + default student role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'student')
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- updated_at helper
CREATE OR REPLACE FUNCTION public.tg_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Categories
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.categories TO anon, authenticated;
GRANT ALL ON public.categories TO service_role;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Categories are viewable by everyone" ON public.categories FOR SELECT USING (true);
CREATE POLICY "Admins manage categories" ON public.categories FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.categories (slug, name) VALUES
  ('development', 'Development'),
  ('design', 'Design'),
  ('business', 'Business'),
  ('data-science', 'Data Science'),
  ('languages', 'Languages'),
  ('personal-growth', 'Personal Growth');

-- Courses
CREATE TABLE public.courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instructor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  subtitle TEXT,
  description TEXT,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  thumbnail_url TEXT,
  level public.course_level NOT NULL DEFAULT 'all',
  language TEXT NOT NULL DEFAULT 'English',
  status public.course_status NOT NULL DEFAULT 'draft',
  price_cents INTEGER NOT NULL DEFAULT 0,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON public.courses(instructor_id);
CREATE INDEX ON public.courses(category_id);
CREATE INDEX ON public.courses(status);
GRANT SELECT ON public.courses TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.courses TO authenticated;
GRANT ALL ON public.courses TO service_role;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Published courses viewable by everyone" ON public.courses FOR SELECT
  USING (status = 'published' OR auth.uid() = instructor_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Instructors create own courses" ON public.courses FOR INSERT
  WITH CHECK (auth.uid() = instructor_id AND public.has_role(auth.uid(), 'instructor'));
CREATE POLICY "Instructors update own courses" ON public.courses FOR UPDATE
  USING (auth.uid() = instructor_id) WITH CHECK (auth.uid() = instructor_id);
CREATE POLICY "Instructors delete own courses" ON public.courses FOR DELETE
  USING (auth.uid() = instructor_id);
CREATE TRIGGER courses_updated_at BEFORE UPDATE ON public.courses
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Sections
CREATE TABLE public.course_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON public.course_sections(course_id);
GRANT SELECT ON public.course_sections TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.course_sections TO authenticated;
GRANT ALL ON public.course_sections TO service_role;
ALTER TABLE public.course_sections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Sections viewable when course viewable" ON public.course_sections FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.courses c WHERE c.id = course_id
    AND (c.status = 'published' OR c.instructor_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))));
CREATE POLICY "Instructors manage own course sections" ON public.course_sections FOR ALL
  USING (EXISTS (SELECT 1 FROM public.courses c WHERE c.id = course_id AND c.instructor_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.courses c WHERE c.id = course_id AND c.instructor_id = auth.uid()));

-- Lectures
CREATE TABLE public.lectures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id UUID NOT NULL REFERENCES public.course_sections(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  video_path TEXT,
  duration_seconds INTEGER NOT NULL DEFAULT 0,
  position INTEGER NOT NULL DEFAULT 0,
  is_preview BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON public.lectures(section_id);
GRANT SELECT ON public.lectures TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lectures TO authenticated;
GRANT ALL ON public.lectures TO service_role;
ALTER TABLE public.lectures ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Lectures viewable when course viewable" ON public.lectures FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.course_sections s JOIN public.courses c ON c.id = s.course_id
    WHERE s.id = section_id
    AND (c.status = 'published' OR c.instructor_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))));
CREATE POLICY "Instructors manage own lectures" ON public.lectures FOR ALL
  USING (EXISTS (SELECT 1 FROM public.course_sections s JOIN public.courses c ON c.id = s.course_id
    WHERE s.id = section_id AND c.instructor_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.course_sections s JOIN public.courses c ON c.id = s.course_id
    WHERE s.id = section_id AND c.instructor_id = auth.uid()));

-- Enrollments
CREATE TABLE public.enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  enrolled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, course_id)
);
CREATE INDEX ON public.enrollments(user_id);
CREATE INDEX ON public.enrollments(course_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.enrollments TO authenticated;
GRANT ALL ON public.enrollments TO service_role;
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own enrollments" ON public.enrollments FOR SELECT
  USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM public.courses c WHERE c.id = course_id AND c.instructor_id = auth.uid()));
CREATE POLICY "Users enroll themselves" ON public.enrollments FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users unenroll themselves" ON public.enrollments FOR DELETE
  USING (auth.uid() = user_id);

-- Lecture progress
CREATE TABLE public.lecture_progress (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lecture_id UUID NOT NULL REFERENCES public.lectures(id) ON DELETE CASCADE,
  completed BOOLEAN NOT NULL DEFAULT false,
  seconds_watched INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, lecture_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lecture_progress TO authenticated;
GRANT ALL ON public.lecture_progress TO service_role;
ALTER TABLE public.lecture_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own progress" ON public.lecture_progress FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Reviews
CREATE TABLE public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(course_id, user_id)
);
CREATE INDEX ON public.reviews(course_id);
GRANT SELECT ON public.reviews TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.reviews TO authenticated;
GRANT ALL ON public.reviews TO service_role;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Reviews viewable by everyone" ON public.reviews FOR SELECT USING (true);
CREATE POLICY "Enrolled students post reviews" ON public.reviews FOR INSERT
  WITH CHECK (auth.uid() = user_id AND EXISTS (
    SELECT 1 FROM public.enrollments e WHERE e.user_id = auth.uid() AND e.course_id = reviews.course_id
  ));
CREATE POLICY "Users edit own reviews" ON public.reviews FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own reviews" ON public.reviews FOR DELETE USING (auth.uid() = user_id);
