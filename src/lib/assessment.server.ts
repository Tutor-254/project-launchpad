import { createClient } from '@supabase/supabase-js'
import type { Database } from '~/integrations/supabase/types'

// Initialize Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL || ''
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const supabase = createClient<Database>(supabaseUrl, supabaseKey)

/**
 * Task 7.1: submitAssessmentAttempt
 * Records a competency assessment attempt, validates retry rules, and returns feedback
 */
export async function submitAssessmentAttempt(
  userId: string,
  assessmentId: string,
  userAnswers: Record<string, string>
): Promise<{
  score: number
  passed: boolean
  feedback: string
  canRetryAt: Date | null
  competencyAttained: boolean
}> {
  try {
    // 7.1a: Fetch assessment and competency details
    const { data: assessment, error: assessmentError } = await supabase
      .from('competency_assessments')
      .select('*, competencies(*)')
      .eq('id', assessmentId)
      .single()

    if (assessmentError || !assessment) {
      throw new Error(`Assessment not found: ${assessmentError?.message}`)
    }

    const competency = assessment.competencies as any

    // 7.1b: Check max_attempts rule — if exceeded, throw error
    const { data: attempts, error: attemptsError } = await supabase
      .from('assessment_attempts')
      .select('*')
      .eq('user_id', userId)
      .eq('competency_assessment_id', assessmentId)

    if (attemptsError) {
      throw new Error(`Failed to fetch attempts: ${attemptsError.message}`)
    }

    const attemptCount = (attempts?.length || 0) + 1
    if (attemptCount > assessment.max_attempts) {
      throw new Error(`Max attempts (${assessment.max_attempts}) exceeded`)
    }

    // 7.1c: Check retry cooldown (can_retry_at) — if violated, throw error
    const lastAttempt = attempts?.[attempts.length - 1]
    if (lastAttempt && lastAttempt.can_retry_at) {
      const canRetryAt = new Date(lastAttempt.can_retry_at)
      if (new Date() < canRetryAt) {
        throw new Error(
          `Cannot retry until ${canRetryAt.toISOString()}. Retry cooldown in effect.`
        )
      }
    }

    // 7.1d: Score the attempt based on assessment_type
    let score = 0
    let feedback = ''

    if (assessment.assessment_type === 'knowledge_test' || assessment.assessment_type === 'hybrid') {
      // Fetch assessment questions for scoring
      const { data: questions, error: questionsError } = await supabase
        .from('assessment_questions')
        .select('*')
        .eq('assessment_id', assessmentId)

      if (questionsError) {
        throw new Error(`Failed to fetch questions: ${questionsError.message}`)
      }

      // Calculate score based on correct answers
      let correctCount = 0
      const failedTopics: string[] = []

      questions?.forEach((question) => {
        const userAnswer = userAnswers[question.id]
        if (!userAnswer) return

        // Parse options to find correct answer
        const options = question.options as any
        if (options?.correct !== undefined) {
          const correctOption = options.choices?.[options.correct]
          if (userAnswer === correctOption) {
            correctCount++
          } else {
            // Track failed topics for feedback
            const tags = question.competency_tags as string[]
            if (tags && tags.length > 0) {
              failedTopics.push(...tags)
            }
          }
        }
      })

      score = Math.round((correctCount / (questions?.length || 1)) * 100)

      // 7.1e: Provide feedback based on failed questions
      if (failedTopics.length > 0) {
        const uniqueTopics = [...new Set(failedTopics)].slice(0, 3)
        feedback = `You scored ${score}%. Key gaps: ${uniqueTopics.join(', ')}`
      } else {
        feedback = `You scored ${score}%`
      }
    }

    // 7.1f: If requires_remediation_before_retry and not passed, set remediation_recommended_at
    let remediationRecommendedAt = null
    const passThreshold = parseInt(assessment.mastery_rule.match(/\d+/)?.[0] || '70')
    const passed = score >= passThreshold

    if (!passed && assessment.requires_remediation_before_retry) {
      remediationRecommendedAt = new Date()
    }

    // 7.1g: Calculate can_retry_at = now + retry_cooldown_hours
    const canRetryAtDate = new Date()
    canRetryAtDate.setHours(canRetryAtDate.getHours() + assessment.retry_cooldown_hours)
    const canRetryAt = !passed ? canRetryAtDate : null

    // 7.1h: If score passes mastery_rule, check if project also passed → potential badge
    let competencyAttained = false
    if (passed) {
      // Check if project submission also passed for this competency
      const { data: projectGrade, error: projectError } = await supabase
        .from('project_grades')
        .select(
          `
          *,
          submission_id,
          project_submissions!inner(
            id,
            project_id,
            user_id,
            practical_projects!inner(competency_id)
          )
        `
        )
        .eq('project_submissions.user_id', userId)
        .eq('project_submissions.practical_projects.competency_id', competency.id)
        .gte('total_score', parseInt(String(assessment.rubric_id ? 70 : 0)))
        .single()

      competencyAttained = !projectError && projectGrade != null
    }

    // 7.1i: Insert into assessment_attempts table
    const { data: newAttempt, error: insertError } = await supabase
      .from('assessment_attempts')
      .insert({
        user_id: userId,
        competency_assessment_id: assessmentId,
        attempt_number: attemptCount,
        score,
        passed,
        feedback,
        remediation_recommended_at: remediationRecommendedAt,
        can_retry_at: canRetryAt?.toISOString(),
      })
      .select()
      .single()

    if (insertError || !newAttempt) {
      throw new Error(`Failed to record attempt: ${insertError?.message}`)
    }

    // 7.1j: Return results
    return {
      score,
      passed,
      feedback,
      canRetryAt,
      competencyAttained,
    }
  } catch (error) {
    console.error('Error submitting assessment attempt:', error)
    throw error
  }
}

/**
 * Get assessment attempt history for a user
 */
export async function getAssessmentAttempts(userId: string, assessmentId: string) {
  const { data, error } = await supabase
    .from('assessment_attempts')
    .select('*')
    .eq('user_id', userId)
    .eq('competency_assessment_id', assessmentId)
    .order('attempt_number', { ascending: false })

  if (error) {
    throw new Error(`Failed to fetch attempts: ${error.message}`)
  }

  return data
}

/**
 * Check if user can retry an assessment
 */
export async function canRetryAssessment(
  userId: string,
  assessmentId: string
): Promise<{
  canRetry: boolean
  reason: string
  canRetryAt?: Date
}> {
  try {
    const { data: assessment, error: assessmentError } = await supabase
      .from('competency_assessments')
      .select('*')
      .eq('id', assessmentId)
      .single()

    if (assessmentError || !assessment) {
      throw new Error(`Assessment not found`)
    }

    const attempts = await getAssessmentAttempts(userId, assessmentId)

    // Check max attempts
    if (attempts.length >= assessment.max_attempts) {
      return {
        canRetry: false,
        reason: `Max attempts (${assessment.max_attempts}) exceeded`,
      }
    }

    // Check cooldown
    const lastAttempt = attempts[0]
    if (lastAttempt?.can_retry_at) {
      const canRetryAt = new Date(lastAttempt.can_retry_at)
      if (new Date() < canRetryAt) {
        return {
          canRetry: false,
          reason: `Retry cooldown in effect`,
          canRetryAt,
        }
      }
    }

    // Check remediation
    if (lastAttempt?.remediation_recommended_at && !lastAttempt?.remediation_completed_at) {
      return {
        canRetry: false,
        reason: `Remediation must be completed before retry`,
      }
    }

    return {
      canRetry: true,
      reason: 'Ready to retry',
    }
  } catch (error) {
    console.error('Error checking retry eligibility:', error)
    throw error
  }
}

/**
 * Mark remediation as completed
 */
export async function markRemediationComplete(userId: string, assessmentId: string) {
  try {
    const { data: attempt, error: fetchError } = await supabase
      .from('assessment_attempts')
      .select('*')
      .eq('user_id', userId)
      .eq('competency_assessment_id', assessmentId)
      .order('attempt_number', { ascending: false })
      .limit(1)
      .single()

    if (fetchError || !attempt) {
      throw new Error('Assessment attempt not found')
    }

    const { error: updateError } = await supabase
      .from('assessment_attempts')
      .update({
        remediation_completed_at: new Date().toISOString(),
      })
      .eq('id', attempt.id)

    if (updateError) {
      throw new Error(`Failed to mark remediation complete: ${updateError.message}`)
    }

    return { success: true }
  } catch (error) {
    console.error('Error marking remediation complete:', error)
    throw error
  }
}
