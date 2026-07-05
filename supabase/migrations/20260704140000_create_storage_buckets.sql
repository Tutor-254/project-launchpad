-- Create storage buckets (private — no public access, all reads via signed URLs)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  (
    'course-thumbnails',
    'course-thumbnails',
    false,
    2097152,  -- 2 MB
    ARRAY['image/jpeg', 'image/png', 'image/webp']
  ),
  (
    'course-videos',
    'course-videos',
    false,
    524288000,  -- 500 MB
    ARRAY['video/mp4', 'video/webm']
  )
ON CONFLICT (id) DO UPDATE SET
  public            = EXCLUDED.public,
  file_size_limit   = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;
