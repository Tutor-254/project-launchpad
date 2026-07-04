
ALTER TABLE public.courses
  ADD CONSTRAINT courses_instructor_profile_fkey
  FOREIGN KEY (instructor_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.reviews
  ADD CONSTRAINT reviews_user_profile_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.enrollments
  ADD CONSTRAINT enrollments_user_profile_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
