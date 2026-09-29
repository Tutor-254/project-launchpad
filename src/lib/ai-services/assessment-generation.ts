/**
 * AI-Powered Assessment Generation Service
 * Generates diagnostic, CAT1, and CAT2 assessments using Gemini
 */

import { callGeminiJson } from './gemini-client'
import type {
  Question,
  AssessmentGenerationRequest,
  AssessmentGenerationResult,
} from '~/types/ai-services'

/**
 * Generate diagnostic assessment questions
 * Purpose: Identify prerequisite knowledge gaps before course starts
 * Questions: 10-20 basic to intermediate level
 */
export async function generateDiagnosticQuestions(
  request: AssessmentGenerationRequest
): Promise<Question[]> {
  const prompt = `You are an expert assessment designer. Generate ${request.targetQuestionCount || 15} diagnostic assessment questions for a ${request.courseDifficulty} level course.

Course: ${request.courseTitle}
Competencies to assess: ${request.competencyIds.join(', ')}
${request.additionalContext ? `Additional context: ${request.additionalContext}` : ''}

Requirements:
- Questions should be at BASIC to INTERMEDIATE difficulty levels
- Mix of multiple choice, true/false, and short answer
- Should identify prerequisite knowledge gaps
- Each question must clearly indicate which competency it assesses
- Include clear correct answers and brief explanations
- For multiple choice: 4 options with 1 correct answer

Return as JSON array with structure:
{
  "questions": [
    {
      "id": "q1",
      "type": "multiple-choice|short-answer|true-false",
      "question": "...",
      "options": ["...", "...", "...", "..."] (for multiple choice only),
      "correctAnswer": "..." or ["option1", "option2"] for matching,
      "explanation": "...",
      "difficulty": "easy|medium|hard",
      "bloomsLevel": "remember|understand|apply|analyze|evaluate|create",
      "competencies": ["comp_id1", "comp_id2"],
      "estimatedTimeSeconds": 60
    }
  ]
}

Ensure all questions are clear, unambiguous, and appropriate for diagnostic assessment.`

  const validation = (data: unknown): { success: boolean; data?: Question[]; error?: string } => {
    if (!isValidQuestionsArray(data)) {
      return {
        success: false,
        error: 'Invalid questions format',
      }
    }
    return { success: true, data: (data as { questions: Question[] }).questions }
  }

  const response = await callGeminiJson<Question[]>(prompt, validation)
  return response.data
}

/**
 * Generate CAT1 questions (Continuous Assessment Test 1)
 * Purpose: Formative assessment during learning
 * Questions: 15-25, progressive difficulty, mixed types
 */
export async function generateCAT1Questions(
  request: AssessmentGenerationRequest
): Promise<Question[]> {
  const prompt = `You are an expert assessment designer. Generate ${request.targetQuestionCount || 20} formative assessment (CAT1) questions for a ${request.courseDifficulty} level course.

Course: ${request.courseTitle}
Competencies to assess: ${request.competencyIds.join(', ')}
${request.additionalContext ? `Additional context: ${request.additionalContext}` : ''}

Requirements:
- Questions should progress from EASY to HARD
- Mix question types: 60% multiple choice, 20% short answer, 20% application-based
- Focus on understanding and application (Bloom's: understand, apply, analyze)
- Progressive difficulty - start easy, gradually increase
- Each question tests ONE specific competency clearly
- Include detailed explanations with learning value
- Multiple choice should have 4 plausible options

Return as JSON array with structure:
{
  "questions": [
    {
      "id": "q1",
      "type": "multiple-choice|short-answer|true-false",
      "question": "...",
      "options": ["...", "...", "...", "..."] (for multiple choice only),
      "correctAnswer": "..." or array for matching,
      "explanation": "Explain why this is correct and why other options are wrong...",
      "difficulty": "easy|medium|hard",
      "bloomsLevel": "remember|understand|apply|analyze|evaluate|create",
      "competencies": ["comp_id1"],
      "distractorAnalysis": "Why each wrong answer is plausible...",
      "estimatedTimeSeconds": 90
    }
  ]
}

Arrange questions in order of increasing difficulty. Ensure educational value in explanations.`

  const validation = (data: unknown): { success: boolean; data?: Question[]; error?: string } => {
    if (!isValidQuestionsArray(data)) {
      return {
        success: false,
        error: 'Invalid questions format',
      }
    }
    return { success: true, data: (data as { questions: Question[] }).questions }
  }

  const response = await callGeminiJson<Question[]>(prompt, validation)
  return response.data
}

/**
 * Generate CAT2 questions (Continuous Assessment Test 2)
 * Purpose: Summative assessment - evaluate mastery
 * Questions: 20-30, higher-order thinking, integration
 */
export async function generateCAT2Questions(
  request: AssessmentGenerationRequest
): Promise<Question[]> {
  const prompt = `You are an expert assessment designer. Generate ${request.targetQuestionCount || 25} summative assessment (CAT2) questions for a ${request.courseDifficulty} level course.

Course: ${request.courseTitle}
Competencies to assess: ${request.competencyIds.join(', ')}
${request.additionalContext ? `Additional context: ${request.additionalContext}` : ''}

Requirements:
- Questions focus on HIGHER-ORDER THINKING (analyze, evaluate, create)
- 40% multiple choice (complex scenarios), 30% essay/short answer, 30% application problems
- Test integration of multiple competencies where possible
- Real-world application scenarios
- Questions should distinguish between mastery and partial understanding
- Each option in multiple choice should be equally plausible (test critical thinking)
- Include rubrics for essay questions

Return as JSON array with structure:
{
  "questions": [
    {
      "id": "q1",
      "type": "multiple-choice|short-answer|essay",
      "question": "Real-world scenario or complex question...",
      "options": ["...", "...", "...", "..."] (for multiple choice only),
      "correctAnswer": "..." or "Refer to rubric below",
      "explanation": "Detailed explanation. For essays: include rubric criteria...",
      "difficulty": "medium|hard",
      "bloomsLevel": "analyze|evaluate|create",
      "competencies": ["comp_id1", "comp_id2"],
      "distractorAnalysis": "Each option tests a specific misconception...",
      "estimatedTimeSeconds": 180
    }
  ]
}

Ensure questions demand synthesis, analysis, and evaluation. Include real-world context.`

  const validation = (data: unknown): { success: boolean; data?: Question[]; error?: string } => {
    if (!isValidQuestionsArray(data)) {
      return {
        success: false,
        error: 'Invalid questions format',
      }
    }
    return { success: true, data: (data as { questions: Question[] }).questions }
  }

  const response = await callGeminiJson<Question[]>(prompt, validation)
  return response.data
}

/**
 * Validate assessment quality
 */
export async function validateAssessmentQuality(
  questions: Question[]
): Promise<{ score: number; issues: string[] }> {
  const issues: string[] = []
  let score = 100

  // Check Bloom's level distribution
  const bloomsDistribution = questions.reduce(
    (acc, q) => {
      acc[q.bloomsLevel] = (acc[q.bloomsLevel] || 0) + 1
      return acc
    },
    {} as Record<string, number>
  )

  const hasHigherOrder = ['analyze', 'evaluate', 'create'].some(
    (level) => bloomsDistribution[level]
  )
  if (!hasHigherOrder) {
    issues.push('No higher-order thinking questions (missing analyze/evaluate/create)')
    score -= 15
  }

  // Check difficulty distribution
  const difficultyDist = questions.reduce(
    (acc, q) => {
      acc[q.difficulty] = (acc[q.difficulty] || 0) + 1
      return acc
    },
    {} as Record<string, number>
  )

  if (!difficultyDist.easy || !difficultyDist.hard) {
    issues.push('Unbalanced difficulty distribution - should include easy and hard questions')
    score -= 10
  }

  // Check competency coverage
  const competencyCoverage = new Set<string>()
  questions.forEach((q) => q.competencies.forEach((c) => competencyCoverage.add(c)))

  // Check multiple choice options
  questions.forEach((q) => {
    if (q.type === 'multiple-choice') {
      if (!q.options || q.options.length !== 4) {
        issues.push(
          `Question "${q.question.substring(0, 50)}..." should have exactly 4 options`
        )
        score -= 5
      }
    }
  })

  // Check for clarity
  questions.forEach((q) => {
    if (q.question.length < 20) {
      issues.push(`Question "${q.question}" may be too brief`)
      score -= 3
    }
    if (!q.explanation || q.explanation.length < 20) {
      issues.push(`Question "${q.question.substring(0, 30)}..." needs better explanation`)
      score -= 5
    }
  })

  return {
    score: Math.max(0, score),
    issues,
  }
}

/**
 * Helper: Check if data is valid questions array
 */
function isValidQuestionsArray(data: unknown): data is { questions: Question[] } {
  if (!data || typeof data !== 'object') return false

  const obj = data as Record<string, unknown>
  if (!Array.isArray(obj.questions)) return false

  return obj.questions.every((q) => {
    if (!q || typeof q !== 'object') return false
    const question = q as Record<string, unknown>
    return (
      typeof question.question === 'string' &&
      typeof question.correctAnswer !== 'undefined' &&
      typeof question.explanation === 'string' &&
      typeof question.difficulty === 'string' &&
      typeof question.bloomsLevel === 'string' &&
      Array.isArray(question.competencies)
    )
  })
}

/**
 * Generate complete assessment
 */
export async function generateCompleteAssessment(
  request: AssessmentGenerationRequest
): Promise<AssessmentGenerationResult> {
  let questions: Question[] = []

  switch (request.assessmentType) {
    case 'diagnostic':
      questions = await generateDiagnosticQuestions(request)
      break
    case 'cat1':
      questions = await generateCAT1Questions(request)
      break
    case 'cat2':
      questions = await generateCAT2Questions(request)
      break
  }

  // Validate quality
  const qualityValidation = await validateAssessmentQuality(questions)

  // Calculate metadata
  const totalTime = questions.reduce((sum, q) => sum + (q.estimatedTimeSeconds || 60), 0)
  const bloomsDistribution = questions.reduce(
    (acc, q) => {
      acc[q.bloomsLevel] = (acc[q.bloomsLevel] || 0) + 1
      return acc
    },
    {} as Record<string, number>
  )

  const competencyDistribution = questions.reduce(
    (acc, q) => {
      q.competencies.forEach((c) => {
        acc[c] = (acc[c] || 0) + 1
      })
      return acc
    },
    {} as Record<string, number>
  )

  const avgDifficulty =
    questions.reduce((sum, q) => sum + (q.difficulty === 'easy' ? 1 : q.difficulty === 'medium' ? 2 : 3), 0) /
    questions.length

  return {
    assessmentId: `assessment_${Date.now()}`,
    courseId: request.courseId,
    type: request.assessmentType,
    questions,
    metadata: {
      totalQuestions: questions.length,
      estimatedDurationMinutes: Math.ceil(totalTime / 60),
      averageDifficulty: avgDifficulty < 1.5 ? 'easy' : avgDifficulty < 2.5 ? 'medium' : 'hard',
      bloomsDistribution,
      competencyDistribution,
    },
    qualityScore: qualityValidation.score,
    qualityIssues: qualityValidation.issues,
    generatedAt: new Date(),
  }
}
