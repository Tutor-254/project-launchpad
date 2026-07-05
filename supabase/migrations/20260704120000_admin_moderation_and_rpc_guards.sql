-- Link instructor applications to profiles for admin embed queries
ALTER TABLE public.instructor_applications
  ADD CONSTRAINT instructor_applications_user_profile_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Admin moderation: reviews
CREATE POLICY "admins moderate reviews"
  ON public.reviews FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admins delete reviews"
  ON public.reviews FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Admin moderation: questions (hide/unhide)
CREATE POLICY "admins moderate questions"
  ON public.questions FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Admin moderation: unpublish any course
CREATE POLICY "admins unpublish courses"
  ON public.courses FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Require admin role inside approval RPCs
CREATE OR REPLACE FUNCTION public.approve_instructor_application(
  application_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  app record;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Admin role required';
  END IF;

  SELECT * INTO app
    FROM instructor_applications
   WHERE id = application_id
     AND status = 'pending'
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Application not found or not pending';
  END IF;

  UPDATE instructor_applications
     SET status      = 'approved',
         reviewed_at = now(),
         reviewed_by = auth.uid()
   WHERE id = application_id;

  INSERT INTO user_roles (user_id, role)
  VALUES (app.user_id, 'instructor')
  ON CONFLICT (user_id, role) DO NOTHING;

  BEGIN
    INSERT INTO notifications (user_id, type, payload)
    VALUES (
      app.user_id,
      'application_approved',
      jsonb_build_object('studio_url', '/instructor')
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Notification insert failed for approval of %: %', application_id, SQLERRM;
  END;
END;
$$;

CREATE OR REPLACE FUNCTION public.reject_instructor_application(
  application_id uuid,
  reason         text DEFAULT ''
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  app record;
  reapply_after timestamptz;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Admin role required';
  END IF;

  SELECT * INTO app
    FROM instructor_applications
   WHERE id = application_id
     AND status = 'pending'
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Application not found or not pending';
  END IF;

  reapply_after := now() + INTERVAL '30 days';

  UPDATE instructor_applications
     SET status           = 'rejected',
         rejection_reason = reason,
         reviewed_at      = now(),
         reviewed_by      = auth.uid()
   WHERE id = application_id;

  BEGIN
    INSERT INTO notifications (user_id, type, payload)
    VALUES (
      app.user_id,
      'application_rejected',
      jsonb_build_object(
        'rejection_reason', COALESCE(NULLIF(reason, ''), 'No reason provided.'),
        'reapply_after',    reapply_after
      )
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Notification insert failed for rejection of %: %', application_id, SQLERRM;
  END;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.approve_instructor_application(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.reject_instructor_application(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.approve_instructor_application(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_instructor_application(uuid, text) TO authenticated;
