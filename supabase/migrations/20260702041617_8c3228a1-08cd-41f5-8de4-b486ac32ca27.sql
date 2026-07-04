
-- Wishlist
CREATE TABLE public.wishlists (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, course_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.wishlists TO authenticated;
GRANT ALL ON public.wishlists TO service_role;
ALTER TABLE public.wishlists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own wishlist read"  ON public.wishlists FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "own wishlist write" ON public.wishlists FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "own wishlist delete" ON public.wishlists FOR DELETE TO authenticated USING (user_id = auth.uid());

-- Certificates
CREATE TABLE public.certificates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  code text NOT NULL UNIQUE,
  issued_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, course_id)
);
GRANT SELECT, INSERT ON public.certificates TO authenticated;
GRANT SELECT ON public.certificates TO anon; -- for public verify by code
GRANT ALL ON public.certificates TO service_role;
ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own certs read" ON public.certificates FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "public verify"   ON public.certificates FOR SELECT TO anon USING (true);
CREATE POLICY "self issue"      ON public.certificates FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- Content reports
CREATE TYPE public.report_target AS ENUM ('review','question','answer','course');
CREATE TYPE public.report_status AS ENUM ('open','resolved','dismissed');
CREATE TABLE public.reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_type public.report_target NOT NULL,
  target_id uuid NOT NULL,
  reason text NOT NULL,
  status public.report_status NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.reports TO authenticated;
GRANT ALL ON public.reports TO service_role;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own reports read" ON public.reports FOR SELECT TO authenticated USING (reporter_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "own reports write" ON public.reports FOR INSERT TO authenticated WITH CHECK (reporter_id = auth.uid());
CREATE POLICY "admin resolve" ON public.reports FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER reports_updated BEFORE UPDATE ON public.reports FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Profile usernames (public slugs)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS username text UNIQUE;

-- Lecture progress: resume position
ALTER TABLE public.lecture_progress ADD COLUMN IF NOT EXISTS last_position_seconds integer NOT NULL DEFAULT 0;

-- Lectures: optional duration for progress %
ALTER TABLE public.lectures ADD COLUMN IF NOT EXISTS duration_seconds integer;
