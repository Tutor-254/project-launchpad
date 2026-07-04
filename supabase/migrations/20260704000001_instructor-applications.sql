-- Create instructor_applications table
CREATE TABLE public.instructor_applications (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status         text NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending', 'approved', 'rejected')),
  expertise      text NOT NULL,
  background     text NOT NULL,
  portfolio_url  text,
  statement      text NOT NULL,
  rejection_reason text,
  reviewed_by    uuid REFERENCES auth.users(id),
  reviewed_at    timestamptz,
  created_at     timestamptz NOT NULL DEFAULT now()
);

-- Add unique partial index for one pending application per user
CREATE UNIQUE INDEX instructor_applications_one_pending_per_user
  ON public.instructor_applications (user_id)
  WHERE (status = 'pending');

-- Enable RLS and add policies
ALTER TABLE public.instructor_applications ENABLE ROW LEVEL SECURITY;

-- Users can submit their own applications
CREATE POLICY "Users can submit own applications"
  ON public.instructor_applications FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can read their own applications
CREATE POLICY "Users can read own applications"
  ON public.instructor_applications FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Admins can read all applications
CREATE POLICY "Admins can read all applications"
  ON public.instructor_applications FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Grant permissions
GRANT SELECT, INSERT ON public.instructor_applications TO authenticated;
GRANT ALL ON public.instructor_applications TO service_role;

-- Drop old self-grant policy from user_roles
DROP POLICY IF EXISTS "Users can grant themselves instructor role" ON public.user_roles;

-- Add new restricted policy for instructor role grants
CREATE POLICY "Only admins or service_role can grant instructor role"
  ON public.user_roles FOR INSERT TO authenticated
  WITH CHECK (
    role != 'instructor'
    OR public.has_role(auth.uid(), 'admin')
  );

-- Create approve_instructor_application function
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
  -- Fetch and lock the application row
  SELECT * INTO app
    FROM instructor_applications
   WHERE id = application_id
     AND status = 'pending'
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Application not found or not pending';
  END IF;

  -- Update application status
  UPDATE instructor_applications
     SET status      = 'approved',
         reviewed_at = now(),
         reviewed_by = auth.uid()
   WHERE id = application_id;

  -- Grant instructor role (idempotent via ON CONFLICT DO NOTHING)
  INSERT INTO user_roles (user_id, role)
  VALUES (app.user_id, 'instructor')
  ON CONFLICT (user_id, role) DO NOTHING;

  -- Insert approval notification (best-effort; failure does not abort)
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

-- Create reject_instructor_application function
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
  SELECT * INTO app
    FROM instructor_applications
   WHERE id = application_id
     AND status = 'pending'
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Application not found or not pending';
  END IF;

  reapply_after := now() + INTERVAL '30 days';

  -- Update application status
  UPDATE instructor_applications
     SET status           = 'rejected',
         rejection_reason = reason,
         reviewed_at      = now(),
         reviewed_by      = auth.uid()
   WHERE id = application_id;

  -- Insert rejection notification (best-effort)
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

-- Revoke public access from functions
REVOKE EXECUTE ON FUNCTION public.approve_instructor_application(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.reject_instructor_application(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.approve_instructor_application(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_instructor_application(uuid, text) TO authenticated;