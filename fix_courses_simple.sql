-- Simple Course Cleanup Script
-- Run these queries one at a time in Supabase SQL Editor

-- Step 1: View all courses
SELECT id, title, status, instructor_id, slug, created_at 
FROM courses 
ORDER BY created_at DESC;

-- Step 2: Delete the "Introduction to Artificial Intelligence" course
-- Review the results from Step 1 first, then run this
DELETE FROM courses 
WHERE title ILIKE '%Introduction to Artificial Intelligence%'
OR title ILIKE '%Artificial Intelligence%';

-- Step 3: Verify only one course remains
SELECT id, title, status, instructor_id, slug, published_at
FROM courses 
ORDER BY created_at DESC;

-- Step 4: Ensure courses have proper slugs
UPDATE courses
SET slug = LOWER(REPLACE(REGEXP_REPLACE(title, '[^a-zA-Z0-9\s]', '', 'g'), ' ', '-')) || '-' || SUBSTRING(id::text, 1, 8)
WHERE slug IS NULL OR slug = '';

-- Step 5: Ensure published status is set correctly
UPDATE courses
SET status = 'published'
WHERE status IS NULL AND published_at IS NOT NULL;

-- Step 6: Verify assessments exist for the course
SELECT 
  c.id as course_id,
  c.title as course_title,
  c.status,
  COUNT(a.id) as assessment_count
FROM courses c
LEFT JOIN assessments a ON a.course_id = c.id
GROUP BY c.id, c.title, c.status
ORDER BY c.created_at DESC;

-- Step 7: Check course content (sections and lectures)
SELECT 
  c.id as course_id,
  c.title,
  COUNT(DISTINCT cs.id) as section_count,
  COUNT(l.id) as lecture_count
FROM courses c
LEFT JOIN course_sections cs ON cs.course_id = c.id
LEFT JOIN lectures l ON l.section_id = cs.id
GROUP BY c.id, c.title
ORDER BY c.created_at DESC;
