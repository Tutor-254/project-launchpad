
-- Thumbnails: any authenticated user can read (needed to display); instructors write to their own folder (user_id prefix)
CREATE POLICY "Thumbnails readable by authenticated" ON storage.objects FOR SELECT
  TO authenticated USING (bucket_id = 'course-thumbnails');
CREATE POLICY "Anon can read thumbnails" ON storage.objects FOR SELECT
  TO anon USING (bucket_id = 'course-thumbnails');
CREATE POLICY "Instructors upload thumbnails to own folder" ON storage.objects FOR INSERT
  TO authenticated WITH CHECK (
    bucket_id = 'course-thumbnails'
    AND (storage.foldername(name))[1] = auth.uid()::text
    AND public.has_role(auth.uid(), 'instructor')
  );
CREATE POLICY "Instructors update own thumbnails" ON storage.objects FOR UPDATE
  TO authenticated USING (bucket_id = 'course-thumbnails' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Instructors delete own thumbnails" ON storage.objects FOR DELETE
  TO authenticated USING (bucket_id = 'course-thumbnails' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Videos: instructors write to own folder; reads gated via signed URLs from server (no anon/auth read policy for direct access; owning instructor can read for previews)
CREATE POLICY "Instructors read own videos" ON storage.objects FOR SELECT
  TO authenticated USING (bucket_id = 'course-videos' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Instructors upload videos to own folder" ON storage.objects FOR INSERT
  TO authenticated WITH CHECK (
    bucket_id = 'course-videos'
    AND (storage.foldername(name))[1] = auth.uid()::text
    AND public.has_role(auth.uid(), 'instructor')
  );
CREATE POLICY "Instructors update own videos" ON storage.objects FOR UPDATE
  TO authenticated USING (bucket_id = 'course-videos' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Instructors delete own videos" ON storage.objects FOR DELETE
  TO authenticated USING (bucket_id = 'course-videos' AND (storage.foldername(name))[1] = auth.uid()::text);
