-- Fix Courses and AI Generation Issues
-- Run this SQL in your Supabase SQL Editor

-- 1. Delete "Introduction to Artificial Intelligence" course
-- First, let's see what we have
SELECT id, title, status, instructor_id, created_at 
FROM courses 
ORDER BY created_at DESC;

-- Delete the AI course (adjust the title if slightly different)
DELETE FROM courses 
WHERE title ILIKE '%Introduction to Artificial Intelligence%'
OR title ILIKE '%Artificial Intelligence%';

-- 2. Verify remaining courses
SELECT id, title, status, instructor_id, slug, published_at
FROM courses 
ORDER BY created_at DESC;

-- 3. Ensure the remaining course has a proper slug
UPDATE courses
SET slug = LOWER(REPLACE(REGEXP_REPLACE(title, '[^a-zA-Z0-9\s]', '', 'g'), ' ', '-')) || '-' || SUBSTRING(id::text, 1, 8)
WHERE slug IS NULL OR slug = '';

-- 4. Check that courses have the status column properly set
UPDATE courses
SET status = 'published'
WHERE status IS NULL AND published_at IS NOT NULL;

-- 5. Verify assessments exist for published courses
SELECT 
  c.id as course_id,
  c.title as course_title,
  COUNT(a.id) as assessment_count
FROM courses c
LEFT JOIN competency_assessments a ON a.course_id = c.id
WHERE c.status = 'published'
GROUP BY c.id, c.title;

-- 6. If assessments don't exist, we need to create them
-- This will be handled by the application logic

-- 7. Check course_sections and lectures for content
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
