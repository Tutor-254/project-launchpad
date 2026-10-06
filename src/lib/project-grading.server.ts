import { createClient } from '@supabase/supabase-js'
import type { Database } from '~/integrations/supabase/types'
import { v4 as uuidv4 } from 'uuid'

// Initialize Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL || ''
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const supabase = createClient<Database>(supabaseUrl, supabaseKey)

/**
 * Task 8.1: gradeProjectSubmission
 * Records rubric-based grade on project submission; triggers badge issuance if both assessment and project passed
 */
export async function gradeProjectSubmission(
  submissionId: string,
  rubricScores: Record<string, number>,
  feedback: string,
  gradedByUserId: string
): Promise<{
  totalScore: number
  passed: boolean
  badgeIssued: boolean
}> {
  try {
    // 8.1a: Fetch submission, rubric, and competency details
    const { data: submission, error: submissionError } = await supabase
      .from('project_submissions')
      .select(
        `
        *,
        project_id,
        user_id,
        practical_projects!inner(
          id,
          competency_id,
          rubric_id,
          rubrics!inner(*)
        )
      `
      )
      .eq('id', submissionId)
      .single()

    if (submissionError || !submission) {
      throw new Error(`Submission not found: ${submissionError?.message}`)
    }

    const project = (submission.practical_projects as any)[0]
    const rubric = project.rubrics as any

    // 8.1b: Validate rubric_scores keys match rubric criteria names
    if (!rubric || !rubric.criteria) {
      throw new Error('Rubric not found for this project')
    }

    const rubricCriteria = rubric.criteria as any[]
    const criteriaNames = rubricCriteria.map((c) => c.name)

    for (const scoreName of Object.keys(rubricScores)) {
      if (!criteriaNames.includes(scoreName)) {
        throw new Error(`Invalid rubric criterion: ${scoreName}`)
      }
    }

    // 8.1c: Calculate total_score from rubric_scores sum
    const totalScore = Object.values(rubricScores).reduce((sum, score) => sum + (score || 0), 0)

    // 8.1d: Check if total_score >= rubric.passing_score_percent
    const passingThreshold = (rubric.total_points * rubric.passing_score_percent) / 100
    const passed = totalScore >= passingThreshold

    // 8.1e: Insert into project_grades table
    const { data: grade, error: insertError } = await supabase
      .from('project_grades')
      .insert({
        submission_id: submissionId,
        rubric_id: rubric.id,
        graded_by_user_id: gradedByUserId,
        grading_type: 'instructor',
        scores: rubricScores,
        total_score: totalScore,
        feedback: feedback || null,
      })
      .select()
      .single()

    if (insertError || !grade) {
      throw new Error(`Failed to record grade: ${insertError?.message}`)
    }

    // 8.1f: Update project_submissions.status to 'graded'
    const { error: updateError } = await supabase
      .from('project_submissions')
      .update({
        status: 'graded',
        updated_at: new Date().toISOString(),
      })
      .eq('id', submissionId)

    if (updateError) {
      throw new Error(`Failed to update submission status: ${updateError.message}`)
    }

    // 8.1g: If passed AND assessment also passed → issue badge
    let badgeIssued = false

    if (passed) {
      // Check if assessment also passed
      const { data: assessmentAttempts, error: assessmentError } = await supabase
        .from('assessment_attempts')
        .select('*')
        .eq('user_id', submission.user_id)
        .eq('passed', true)
        .order('created_at', { ascending: false })
        .limit(1)

      if (!assessmentError && assessmentAttempts && assessmentAttempts.length > 0) {
        const lastAttempt = assessmentAttempts[0]

        // Get the competency_assessment to find competency_id
        const { data: assessment, error: assessmentFetchError } = await supabase
          .from('competency_assessments')
          .select('competency_id')
          .eq('id', lastAttempt.competency_assessment_id)
          .single()

        if (!assessmentFetchError && assessment) {
          // Check if badge already exists
          const { data: existingBadge } = await supabase
            .from('competency_badges')
            .select('*')
            .eq('user_id', submission.user_id)
            .eq('competency_id', assessment.competency_id)
            .single()

          if (!existingBadge) {
            // 8.1g1: Generate unique badge_code
            const badgeCode = generateBadgeCode()

            // 8.1g2: Insert into competency_badges
            const { error: badgeError } = await supabase
              .from('competency_badges')
              .insert({
                user_id: submission.user_id,
                competency_id: assessment.competency_id,
                assessment_passed_at: new Date(lastAttempt.created_at).toISOString(),
                project_passed_at: new Date().toISOString(),
                badge_code: badgeCode,
              })

            if (!badgeError) {
              badgeIssued = true
            }
          }
        }
      }
    }

    // 8.1h: Return results
    return {
      totalScore,
      passed,
      badgeIssued,
    }
  } catch (error) {
    console.error('Error grading project submission:', error)
    throw error
  }
}

/**
 * Task 8.2: generateBadgeImage
 * Generates SVG badge and uploads to storage
 */
export async function generateBadgeImage(
  competencyTitle: string,
  earnerName: string,
  dateEarned: Date
): Promise<string> {
  try {
    // Generate SVG badge content
    const badgeSvg = generateBadgeSvg(competencyTitle, earnerName, dateEarned)

    // Convert SVG to buffer
    const svgBuffer = Buffer.from(badgeSvg, 'utf-8')

    // Generate unique filename
    const badgeCode = generateBadgeCode()
    const fileName = `badge-${badgeCode}.svg`

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('badge-images')
      .upload(fileName, svgBuffer, {
        contentType: 'image/svg+xml',
        upsert: false,
      })

    if (uploadError) {
      throw new Error(`Failed to upload badge: ${uploadError.message}`)
    }

    // Get signed URL (valid for 1 year)
    const { data: signedUrl, error: signError } = await supabase.storage
      .from('badge-images')
      .createSignedUrl(fileName, 365 * 24 * 60 * 60)

    if (signError || !signedUrl) {
      throw new Error(`Failed to generate signed URL: ${signError?.message}`)
    }

    return signedUrl.signedUrl
  } catch (error) {
    console.error('Error generating badge image:', error)
    throw error
  }
}

/**
 * Generate unique badge code for verification
 */
function generateBadgeCode(): string {
  return `badge-${uuidv4().split('-')[0]}`
}

/**
 * Generate SVG badge HTML
 */
function generateBadgeSvg(competencyTitle: string, earnerName: string, dateEarned: Date): string {
  const width = 300
  const height = 400
  const formattedDate = dateEarned.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <!-- Background -->
  <rect width="${width}" height="${height}" fill="#f8f9fa" rx="10"/>
  
  <!-- Border -->
  <rect width="${width}" height="${height}" fill="none" stroke="#2563eb" stroke-width="3" rx="10"/>
  
  <!-- Badge icon circle -->
  <circle cx="150" cy="80" r="50" fill="#2563eb"/>
  <path d="M 150 40 L 160 65 L 185 65 L 168 80 L 175 105 L 150 90 L 125 105 L 132 80 L 115 65 L 140 65 Z" fill="#fbbf24"/>
  
  <!-- Competency title -->
  <text x="150" y="160" font-size="18" font-weight="bold" text-anchor="middle" fill="#1f2937" font-family="Arial, sans-serif">
    ${competencyTitle}
  </text>
  
  <!-- "Badge Earned" text -->
  <text x="150" y="190" font-size="12" text-anchor="middle" fill="#6b7280" font-family="Arial, sans-serif">
    Badge Earned
  </text>
  
  <!-- Earned by line -->
  <text x="150" y="220" font-size="11" text-anchor="middle" fill="#374151" font-family="Arial, sans-serif">
    Earned by:
  </text>
  
  <!-- Earner name -->
  <text x="150" y="245" font-size="14" font-weight="bold" text-anchor="middle" fill="#1f2937" font-family="Arial, sans-serif">
    ${earnerName}
  </text>
  
  <!-- Date earned -->
  <text x="150" y="275" font-size="11" text-anchor="middle" fill="#6b7280" font-family="Arial, sans-serif">
    ${formattedDate}
  </text>
  
  <!-- Issuer -->
  <text x="150" y="310" font-size="10" text-anchor="middle" fill="#6b7280" font-family="Arial, sans-serif">
    Verified by Arcane
  </text>
  
  <!-- Footer line -->
  <line x1="30" y1="330" x2="270" y2="330" stroke="#d1d5db" stroke-width="1"/>
  
  <!-- Verification note -->
  <text x="150" y="360" font-size="9" text-anchor="middle" fill="#9ca3af" font-family="Arial, sans-serif">
    This badge verifies demonstrated competency
  </text>
</svg>`
}

/**
 * Fetch badge details for verification
 */
export async function getBadgeForVerification(badgeCode: string) {
  try {
    const { data: badge, error } = await supabase
      .from('competency_badges')
      .select(
        `
        *,
        competencies!inner(title, related_job_titles),
        profiles!inner(full_name)
      `
      )
      .eq('badge_code', badgeCode)
      .single()

    if (error || !badge) {
      throw new Error('Badge not found')
    }

    return badge
  } catch (error) {
    console.error('Error fetching badge:', error)
    throw error
  }
}

/**
 * Get all badges for a user
 */
export async function getUserBadges(userId: string) {
  try {
    const { data: badges, error } = await supabase
      .from('competency_badges')
      .select(
        `
        *,
        competencies!inner(title, related_job_titles)
      `
      )
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      throw new Error(`Failed to fetch badges: ${error.message}`)
    }

    return badges || []
  } catch (error) {
    console.error('Error fetching user badges:', error)
    throw error
  }
}
