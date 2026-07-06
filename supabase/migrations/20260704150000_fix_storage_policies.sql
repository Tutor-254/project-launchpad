-- Drop all existing storage policies for both buckets and replace them
-- with corrected versions that:
--   1. Use `name LIKE auth.uid()::text || '/%'` instead of foldername()[1]
--      so they work correctly for deeply nested paths (userId/courseId/file).
--   2. Add a SELECT policy for enrolled students to generate signed URLs
--      for course videos they have access to.

-- ────────────────────────────────────────────────────────────
-- THUMBNAILS
-- ────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Thumbnails readable by authenticated"  ON storage.objects;
DROP POLICY IF EXISTS "Anon can read thumbnails"              ON storage.objects;
DROP POLICY IF EXISTS "Instructors upload thumbnails to own folder" ON storage.objects;
DROP POLICY IF EXISTS "Instructors update own thumbnails"     ON storage.objects;
DROP POLICY IF EXISTS "Instructors delete own thumbnails"     ON storage.objects;

-- Anyone (incl. anon) can read thumbnails — needed for course browsing
CREATE POLICY "Thumbnails readable by everyone"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'course-thumbnails');

-- Instructors may upload/update/delete inside their own userId/ prefix
CREATE POLICY "Instructors upload thumbnails"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'course-thumbnails'
    AND name LIKE auth.uid()::text || '/%'
    AND public.has_role(auth.uid(), 'instructor')
  );

CREATE POLICY "Instructors update own thumbnails"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'course-thumbnails'
    AND name LIKE auth.uid()::text || '/%'
  );

CREATE POLICY "Instructors delete own thumbnails"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'course-thumbnails'
    AND name LIKE auth.uid()::text || '/%'
  );

-- ────────────────────────────────────────────────────────────
-- VIDEOS
-- ────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Instructors read own videos"                ON storage.objects;
DROP POLICY IF EXISTS "Instructors upload videos to own folder"    ON storage.objects;
DROP POLICY IF EXISTS "Instructors update own videos"              ON storage.objects;
DROP POLICY IF EXISTS "Instructors delete own videos"              ON storage.objects;

-- Instructor can always read their own videos (for studio preview / signed URL)
CREATE POLICY "Instructors read own videos"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'course-videos'
    AND name LIKE auth.uid()::text || '/%'
  );

-- Enrolled students can generate signed URLs for videos in courses they enrolled in.
-- We resolve ownership by extracting the courseId from the path (2nd segment).
CREATE POLICY "Enrolled students read course videos"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'course-videos'
    AND EXISTS (
      SELECT 1
      FROM public.enrollments e
      JOIN public.courses c ON c.id = e.course_id
      WHERE e.user_id = auth.uid()
        -- 2nd path segment is courseId: userId/courseId/lectureId.ext
        AND c.id::text = split_part(name, '/', 2)
    )
  );

-- Instructors upload/update/delete inside their own userId/ prefix
CREATE POLICY "Instructors upload videos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'course-videos'
    AND name LIKE auth.uid()::text || '/%'
    AND public.has_role(auth.uid(), 'instructor')
  );

CREATE POLICY "Instructors update own videos"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'course-videos'
    AND name LIKE auth.uid()::text || '/%'
  );

CREATE POLICY "Instructors delete own videos"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'course-videos'
    AND name LIKE auth.uid()::text || '/%'
  );
