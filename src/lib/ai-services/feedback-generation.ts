/**
 * AI-Powered Personalized Feedback Generation Service
 * Generates personalized feedback based on learner responses
 */

import { callGeminiJson } from './gemini-client'
import type { PersonalizedFeedback, CompetencyGap, QuestionFeedback } from '~/types/ai-services'

export interface FeedbackGenerationRequest {
  attemptId: string
  learnerId: string
  assessmentId: string
  assessmentType: 'diagnostic' | 'cat1' | 'cat2'
  courseTitle: string
  competencies: Array<{ id: string; name: string }>
  responses: Array<{
    questionId: string
    question: string
    userAnswer: string
    correctAnswer: string
    competencies: string[]
  }>
}

/**
 * Generate personalized feedback for assessment attempt
 */
export async function generatePersonalizedFeedback(
  request: FeedbackGenerationRequest
): Promise<PersonalizedFeedback> {
  // Calculate basic correctness
  const responses = request.responses.map((r) => ({
    ...r,
    isCorrect: r.userAnswer.toLowerCase().trim() === r.correctAnswer.toLowerCase().trim(),
  }))

  const correctCount = responses.filter((r) => r.isCorrect).length
  const overallScore = (correctCount / responses.length) * 100

  // Generate feedback for each question
  const questionFeedback = await generateQuestionFeedback(request, responses)

  // Identify competency gaps
  const gaps = await identifyCompetencyGaps(request, responses, questionFeedback)

  // Generate study guide
  const studyGuide = await generateStudyGuide(request, gaps, questionFeedback)

  // Generate next steps
  const nextSteps = await generateNextSteps(gaps, overallScore)

  const remedationHours = Math.ceil(gaps.reduce((sum, gap) => sum + (gap.gapLevel === 'critical' ? 3 : gap.gapLevel === 'moderate' ? 1.5 : 0.5), 0))

  return {
    attemptId: request.attemptId,
    learnerId: request.learnerId,
    assessmentId: request.assessmentId,
    overallScore,
    competencyGaps: gaps,
    questionFeedback,
    studyGuide,
    nextSteps,
    estimatedRemediationHours: remedationHours,
    generatedAt: new Date(),
  }
}

/**
 * Generate feedback for each question
 */
async function generateQuestionFeedback(
  request: FeedbackGenerationRequest,
  responses: Array<{
    questionId: string
    question: string
    userAnswer: string
    correctAnswer: string
    competencies: string[]
    isCorrect: boolean
  }>
): Promise<QuestionFeedback[]> {
  const prompt = `You are an expert educator providing personalized feedback. Analyze these assessment responses and provide detailed, constructive feedback for each question.

Assessment Type: ${request.assessmentType}
Course: ${request.courseTitle}

Questions and Responses:
${responses
  .map(
    (r, i) => `
Question ${i + 1}: ${r.question}
Student's Answer: ${r.userAnswer}
Correct Answer: ${r.correctAnswer}
Status: ${r.isCorrect ? 'CORRECT' : 'INCORRECT'}
`
  )
  .join('\n')}

For each question, provide:
1. Whether the answer is correct or incorrect
2. Why the student's answer is correct/incorrect (identify misconceptions if wrong)
3. What concept this tests
4. Confidence level in your feedback (0-100)

Return as JSON array:
{
  "feedback": [
    {
      "questionId": "q1",
      "userAnswer": "...",
      "correctAnswer": "...",
      "isCorrect": true/false,
      "misconception": "Brief description if wrong, or null if correct",
      "explanation": "Clear, encouraging explanation of why this is/isn't correct...",
      "confidenceScore": 95
    }
  ]
}

Be encouraging but honest. Explain the reasoning, not just the answer.`

  const validation = (
    data: unknown
  ): { success: boolean; data?: QuestionFeedback[]; error?: string } => {
    if (!data || typeof data !== 'object') {
      return { success: false, error: 'Invalid format' }
    }

    const obj = data as Record<string, unknown>
    if (!Array.isArray(obj.feedback)) {
      return { success: false, error: 'Missing feedback array' }
    }

    const feedback = obj.feedback.map((item: unknown, index: number) => {
      const f = item as Record<string, unknown>
      return {
        questionId: responses[index]?.questionId || `q${index + 1}`,
        userAnswer: responses[index]?.userAnswer || '',
        correctAnswer: responses[index]?.correctAnswer || '',
        isCorrect: f.isCorrect === true,
        misconception: (f.misconception as string) || undefined,
        explanation: (f.explanation as string) || 'See correct answer above',
        confidenceScore: Math.min(100, Math.max(0, Number(f.confidenceScore) || 80)),
      }
    })

    return { success: true, data: feedback }
  }

  const response = await callGeminiJson<QuestionFeedback[]>(prompt, validation)
  return response.data
}

/**
 * Identify competency gaps based on responses
 */
async function identifyCompetencyGaps(
  request: FeedbackGenerationRequest,
  responses: Array<{ competencies: string[]; isCorrect: boolean }>,
  questionFeedback: QuestionFeedback[]
): Promise<CompetencyGap[]> {
  // Calculate performance by competency
  const competencyPerformance = request.competencies.reduce(
    (acc, comp) => {
      const relatedQuestions = responses.filter((r) => r.competencies.includes(comp.id))
      const correctCount = relatedQuestions.filter((r) => r.isCorrect).length
      const percentage =
        relatedQuestions.length > 0 ? (correctCount / relatedQuestions.length) * 100 : 100

      acc[comp.id] = {
        name: comp.name,
        percentage,
        questionCount: relatedQuestions.length,
      }
      return acc
    },
    {} as Record<string, { name: string; percentage: number; questionCount: number }>
  )

  // Generate gap analysis
  const gaps = Object.entries(competencyPerformance)
    .filter(([_, perf]) => perf.percentage < 80)
    .map(([id, perf]) => ({
      competencyId: id,
      competencyName: perf.name,
      gapLevel:
        perf.percentage < 50 ? 'critical' : perf.percentage < 70 ? 'moderate' : 'minor',
      description: `Performance: ${Math.round(perf.percentage)}% (${perf.questionCount} questions)`,
      suggestedResources: generateResourceSuggestions(perf.name),
    }))

  return gaps
}

/**
 * Generate study guide based on gaps
 */
async function generateStudyGuide(
  request: FeedbackGenerationRequest,
  gaps: CompetencyGap[],
  _questionFeedback: QuestionFeedback[]
): Promise<string> {
  if (gaps.length === 0) {
    return `# Study Guide - Excellent Work!

You've demonstrated strong understanding of the course material. To continue improving, focus on challenging yourself with application-level problems and exploring connections between concepts.`
  }

  const prompt = `Create a concise study guide for a learner who needs to improve in these areas:

${gaps.map((g) => `- ${g.competencyName}: ${g.description}`).join('\n')}

Course: ${request.courseTitle}

Create a markdown study guide that:
1. Summarizes key concepts for each gap area
2. Provides memory aids or mnemonics
3. Suggests practice strategies
4. Includes one worked example per gap
5. Lists common mistakes to avoid

Keep it practical and actionable (500-800 words total).`

  const validation = (data: unknown): { success: boolean; data?: string; error?: string } => {
    if (typeof data !== 'object' || !data) return { success: false, error: 'Invalid format' }
    const obj = data as Record<string, unknown>
    const content = obj.guide || obj.studyGuide || JSON.stringify(data)
    return {
      success: Boolean(content),
      data: typeof content === 'string' ? content : JSON.stringify(content),
    }
  }

  const response = await callGeminiJson<string>(prompt, validation)
  return response.data
}

/**
 * Generate next steps for learner
 */
async function generateNextSteps(gaps: CompetencyGap[], overallScore: number): Promise<string[]> {
  const steps: string[] = []

  if (overallScore >= 80) {
    steps.push('Excellent performance! Consider exploring advanced topics or peer tutoring.')
  } else if (overallScore >= 60) {
    steps.push('Good start! Review the study guide and practice similar problems.')
  } else {
    steps.push('Focus on fundamental concepts. Use the study guide for targeted review.')
  }

  gaps.forEach((gap) => {
    if (gap.gapLevel === 'critical') {
      steps.push(
        `Priority: Master ${gap.competencyName}. Spend 2-3 hours on focused practice for this competency.`
      )
    } else if (gap.gapLevel === 'moderate') {
      steps.push(`Review ${gap.competencyName} and complete 5-10 practice problems on this topic.`)
    }
  })

  if (gaps.length === 0) {
    steps.push('Consider helping peers by explaining concepts you understand well.')
  }

  return steps
}

/**
 * Generate resource suggestions
 */
function generateResourceSuggestions(competencyName: string): string[] {
  return [
    `Textbook chapter on ${competencyName}`,
    `Khan Academy videos for ${competencyName}`,
    `Practice problem set: ${competencyName} (Level 1-3)`,
    `Study group discussion on ${competencyName}`,
  ]
}
