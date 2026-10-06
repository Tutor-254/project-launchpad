import { createClient } from '@supabase/supabase-js'
import type { Database } from '~/integrations/supabase/types'

// Initialize Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL || ''
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const supabase = createClient<Database>(supabaseUrl, supabaseKey)

/**
 * Task 9.1: submitProjectSubmission
 * Stores project submission and queues for review
 */
export async function submitProjectSubmission(
  userId: string,
  projectId: string,
  submission: {
    type: 'file' | 'url' | 'video'
    fileUrl?: string
    externalUrl?: string
    videoUrl?: string
    submissionText?: string
  }
): Promise<{
  submissionId: string
  status: string
  submissionVersion: number
}> {
  try {
    // 9.1a: Fetch project details and rubric
    const { data: project, error: projectError } = await supabase
      .from('practical_projects')
      .select('*, rubrics(*)')
      .eq('id', projectId)
      .single()

    if (projectError || !project) {
      throw new Error(`Project not found: ${projectError?.message}`)
    }

    // 9.1b: If type = 'file': validate file extension against accepted_file_types
    if (submission.type === 'file' && submission.fileUrl) {
      const fileExtension = submission.fileUrl.split('.').pop()?.toLowerCase()
      const acceptedTypes = (project.accepted_file_types as string[]) || []

      if (fileExtension && !acceptedTypes.includes(fileExtension)) {
        throw new Error(
          `File type .${fileExtension} not accepted. Allowed types: ${acceptedTypes.join(', ')}`
        )
      }

      // 9.1c: If type = 'file': validate file size <= max_file_size_mb
      // Note: File size validation is typically done on client side before upload
      // This is a safety check if fileUrl includes size info
      if (submission.fileUrl.includes('size=')) {
        const sizeMatch = submission.fileUrl.match(/size=(\d+)/)
        if (sizeMatch) {
          const fileSizeMb = parseInt(sizeMatch[1]) / (1024 * 1024)
          if (fileSizeMb > project.max_file_size_mb) {
            throw new Error(
              `File size (${fileSizeMb.toFixed(2)}MB) exceeds maximum (${project.max_file_size_mb}MB)`
            )
          }
        }
      }
    }

    // 9.1d: If type = 'url': validate URL format (http/https, valid URL)
    if (submission.type === 'url' && submission.externalUrl) {
      try {
        const url = new URL(submission.externalUrl)
        if (!['http:', 'https:'].includes(url.protocol)) {
          throw new Error('URL must use http:// or https://')
        }
      } catch (error) {
        throw new Error(`Invalid URL format: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }

    // 9.1e: Check if user already has a submission → increment submission_version
    const { data: existingSubmission, error: existingError } = await supabase
      .from('project_submissions')
      .select('*')
      .eq('user_id', userId)
      .eq('project_id', projectId)
      .single()

    let submissionVersion = 1
    if (!existingError && existingSubmission) {
      submissionVersion = (existingSubmission.submission_version || 0) + 1

      // Update existing submission instead of creating new one
      const { data: updatedSubmission, error: updateError } = await supabase
        .from('project_submissions')
        .update({
          submission_version: submissionVersion,
          submission_type: submission.type,
          file_url: submission.type === 'file' ? submission.fileUrl : null,
          external_url: submission.type === 'url' ? submission.externalUrl : null,
          video_url: submission.type === 'video' ? submission.videoUrl : null,
          submission_text: submission.submissionText || null,
          status: 'submitted',
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingSubmission.id)
        .select()
        .single()

      if (updateError || !updatedSubmission) {
        throw new Error(`Failed to update submission: ${updateError?.message}`)
      }

      // 9.1g: Return submission ID and status
      return {
        submissionId: updatedSubmission.id,
        status: updatedSubmission.status,
        submissionVersion: updatedSubmission.submission_version,
      }
    }

    // 9.1f: Insert into project_submissions table with status = 'submitted'
    const { data: newSubmission, error: insertError } = await supabase
      .from('project_submissions')
      .insert({
        user_id: userId,
        project_id: projectId,
        submission_version: submissionVersion,
        submission_type: submission.type,
        file_url: submission.type === 'file' ? submission.fileUrl : null,
        external_url: submission.type === 'url' ? submission.externalUrl : null,
        video_url: submission.type === 'video' ? submission.videoUrl : null,
        submission_text: submission.submissionText || null,
        status: 'submitted',
      })
      .select()
      .single()

    if (insertError || !newSubmission) {
      throw new Error(`Failed to record submission: ${insertError?.message}`)
    }

    // 9.1g: Return submission ID and status
    return {
      submissionId: newSubmission.id,
      status: newSubmission.status,
      submissionVersion: newSubmission.submission_version,
    }
  } catch (error) {
    console.error('Error submitting project:', error)
    throw error
  }
}

/**
 * Get project submission details
 */
export async function getProjectSubmission(submissionId: string) {
  try {
    const { data: submission, error } = await supabase
      .from('project_submissions')
      .select(
        `
        *,
        project_id,
        user_id,
        practical_projects!inner(
          id,
          title,
          brief,
          competency_id,
          rubric_id,
          accepted_file_types,
          max_file_size_mb
        )
      `
      )
      .eq('id', submissionId)
      .single()

    if (error) {
      throw new Error(`Failed to fetch submission: ${error.message}`)
    }

    return submission
  } catch (error) {
    console.error('Error fetching submission:', error)
    throw error
  }
}

/**
 * Get all submissions for a project by a user
 */
export async function getUserProjectSubmissions(userId: string, projectId: string) {
  try {
    const { data: submissions, error } = await supabase
      .from('project_submissions')
      .select('*')
      .eq('user_id', userId)
      .eq('project_id', projectId)
      .order('submission_version', { ascending: false })

    if (error) {
      throw new Error(`Failed to fetch submissions: ${error.message}`)
    }

    return submissions || []
  } catch (error) {
    console.error('Error fetching user submissions:', error)
    throw error
  }
}

/**
 * Get pending submissions for instructor grading (course level)
 */
export async function getPendingSubmissionsForCourse(courseId: string) {
  try {
    const { data: submissions, error } = await supabase
      .from('project_submissions')
      .select(
        `
        *,
        profiles:user_id(full_name, email),
        practical_projects!inner(
          id,
          title,
          competencies!inner(title)
        )
      `
      )
      .eq('status', 'submitted')
      .eq('practical_projects.competencies.course_id', courseId)
      .order('created_at', { ascending: true })

    if (error) {
      throw new Error(`Failed to fetch submissions: ${error.message}`)
    }

    return submissions || []
  } catch (error) {
    console.error('Error fetching pending submissions:', error)
    throw error
  }
}

/**
 * Get submission submission history (version control)
 */
export async function getSubmissionHistory(userId: string, projectId: string) {
  try {
    const { data: submissions, error } = await supabase
      .from('project_submissions')
      .select('*')
      .eq('user_id', userId)
      .eq('project_id', projectId)
      .order('submission_version', { ascending: false })

    if (error) {
      throw new Error(`Failed to fetch submission history: ${error.message}`)
    }

    return submissions || []
  } catch (error) {
    console.error('Error fetching submission history:', error)
    throw error
  }
}

/**
 * Validate file metadata before submission
 */
export function validateFileSubmission(
  fileName: string,
  fileSizeMb: number,
  acceptedTypes: string[],
  maxSizeMb: number
): { valid: boolean; error?: string } {
  // Validate file extension
  const fileExtension = fileName.split('.').pop()?.toLowerCase()
  if (!fileExtension || !acceptedTypes.includes(fileExtension)) {
    return {
      valid: false,
      error: `File type .${fileExtension} not accepted. Allowed types: ${acceptedTypes.join(', ')}`,
    }
  }

  // Validate file size
  if (fileSizeMb > maxSizeMb) {
    return {
      valid: false,
      error: `File size (${fileSizeMb.toFixed(2)}MB) exceeds maximum (${maxSizeMb}MB)`,
    }
  }

  return { valid: true }
}

/**
 * Validate URL submission format
 */
export function validateUrlSubmission(url: string): { valid: boolean; error?: string } {
  try {
    const urlObj = new URL(url)
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      return {
        valid: false,
        error: 'URL must use http:// or https://',
      }
    }
    return { valid: true }
  } catch (error) {
    return {
      valid: false,
      error: `Invalid URL format: ${error instanceof Error ? error.message : 'Unknown error'}`,
    }
  }
}
