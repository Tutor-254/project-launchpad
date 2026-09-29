/**
 * AI-Powered Tutoring & Progressive Hints Service
 * Provides just-in-time learning support with progressive hints
 */

import { callGeminiJson } from './gemini-client'
import type { ProgressiveHints, TutoringResponse, HintLevel } from '~/types/ai-services'

export interface HintsRequest {
  questionId: string
  question: string
  competencies: string[]
  attemptedAnswer?: string
  courseContext?: string
}

export interface TutoringRequest {
  concept: string
  learnerLevel: 'beginner' | 'intermediate' | 'advanced'
  context?: string
  previousAttempts?: string[]
}

/**
 * Generate progressive hints for a question
 */
export async function generateProgressiveHints(request: HintsRequest): Promise<ProgressiveHints> {
  const prompt = `Generate three levels of progressive hints for this question:

Question: ${request.question}
${request.attemptedAnswer ? `Student's attempt: ${request.attemptedAnswer}` : ''}
Competencies: ${request.competencies.join(', ')}
${request.courseContext ? `Course context: ${request.courseContext}` : ''}

Create hints that:
- Level 1: Gentle nudge (don't give answer)
- Level 2: Strategy hint (suggest approach)
- Level 3: Partial solution (example or key step)

Return as JSON:
{
  "hints": [
    {
      "level": 1,
      "content": "Nudge-type hint without revealing the answer...",
      "type": "nudge"
    },
    {
      "level": 2,
      "content": "Strategy hint suggesting an approach...",
      "type": "strategy"
    },
    {
      "level": 3,
      "content": "Partial solution or worked example...",
      "type": "partial"
    }
  ],
  "workedExample": "Complete worked example if helpful...",
  "prerequisiteCheckSuggestion": "Does the student understand prerequisite X? If not, review..."
}

Make hints encouraging and educational, not just answers.`

  const validation = (data: unknown): { success: boolean; data?: ProgressiveHints; error?: string } => {
    if (!data || typeof data !== 'object') {
      return { success: false, error: 'Invalid format' }
    }

    const obj = data as Record<string, unknown>
    if (!Array.isArray(obj.hints)) {
      return { success: false, error: 'Missing hints array' }
    }

    const hints: HintLevel[] = (obj.hints as Array<Record<string, unknown>>)
      .filter((h) => h && h.level && h.content)
      .map((h) => ({
        level: (h.level as number) as 1 | 2 | 3,
        content: (h.content as string) || '',
        type: ((h.type as string) || 'nudge') as 'nudge' | 'strategy' | 'partial',
      }))

    const result: ProgressiveHints = {
      questionId: request.questionId,
      hints,
      workedExample: (obj.workedExample as string) || undefined,
      prerequisiteCheckSuggestion: (obj.prerequisiteCheckSuggestion as string) || undefined,
    }

    return { success: true, data: result }
  }

  const response = await callGeminiJson<ProgressiveHints>(prompt, validation)
  return response.data
}

/**
 * Explain a concept in different ways
 */
export async function explainConcept(request: TutoringRequest): Promise<TutoringResponse> {
  const prompt = `Explain "${request.concept}" for a ${request.learnerLevel} learner.

${request.context ? `Context: ${request.context}` : ''}
${request.previousAttempts && request.previousAttempts.length > 0 ? `Previous attempts/understanding:\n${request.previousAttempts.join('\n')}` : ''}

Provide:
1. Clear concept explanation (adjust for learner level)
2. 2-3 concrete examples
3. Common misconceptions about this concept
4. Related concepts to help with understanding

Return as JSON:
{
  "conceptExplanation": "Clear, level-appropriate explanation...",
  "examples": ["Example 1: ...", "Example 2: ...", "Example 3: ..."],
  "commonMisconceptions": ["Misconception 1: why it's wrong...", "Misconception 2: ..."],
  "relatedConcepts": ["Related concept 1", "Related concept 2"]
}

Be engaging and clear. Use analogies if helpful.`

  const validation = (data: unknown): { success: boolean; data?: TutoringResponse; error?: string } => {
    if (!data || typeof data !== 'object') {
      return { success: false, error: 'Invalid format' }
    }

    const obj = data as Record<string, unknown>
    const response: TutoringResponse = {
      conceptExplanation: (obj.conceptExplanation as string) || '',
      examples: Array.isArray(obj.examples) ? (obj.examples as string[]) : [],
      commonMisconceptions: Array.isArray(obj.commonMisconceptions)
        ? (obj.commonMisconceptions as string[])
        : [],
      relatedConcepts: Array.isArray(obj.relatedConcepts) ? (obj.relatedConcepts as string[]) : [],
    }

    return { success: true, data: response }
  }

  const apiResponse = await callGeminiJson<TutoringResponse>(prompt, validation)
  return apiResponse.data
}

/**
 * Generate worked examples for practice
 */
export async function generateWorkedExamples(
  concept: string,
  difficultyLevel: 'easy' | 'medium' | 'hard',
  count: number = 3
): Promise<string[]> {
  const prompt = `Generate ${count} worked examples for the concept: "${concept}"

Difficulty level: ${difficultyLevel}

Each example should:
1. Show the problem clearly
2. Include step-by-step solution
3. Explain the reasoning at each step
4. Highlight key insights

Return as JSON:
{
  "examples": [
    "Example 1: Problem... Solution... Explanation...",
    "Example 2: ...",
    "Example 3: ..."
  ]
}

Make examples progressively more complex within the difficulty level.`

  const validation = (data: unknown): { success: boolean; data?: string[]; error?: string } => {
    if (!data || typeof data !== 'object') {
      return { success: false, error: 'Invalid format' }
    }

    const obj = data as Record<string, unknown>
    const examples = Array.isArray(obj.examples) ? (obj.examples as string[]) : []

    return { success: true, data: examples }
  }

  const response = await callGeminiJson<string[]>(prompt, validation)
  return response.data
}

/**
 * Check if learner understands prerequisites
 */
export async function checkPrerequisiteUnderstanding(
  prerequisite: string,
  learnerResponse: string
): Promise<{
  understands: boolean
  confidence: number
  feedback: string
  suggestionIfIncomplete: string
}> {
  const prompt = `Based on this response, does the learner understand "${prerequisite}"?

Learner's response: "${learnerResponse}"

Assess:
1. Do they understand the prerequisite? (yes/no)
2. Confidence in assessment (0-100)
3. Feedback on their response
4. If incomplete, what should they review?

Return as JSON:
{
  "understands": true/false,
  "confidence": 85,
  "feedback": "You show good understanding of X, but need to clarify Y...",
  "suggestionIfIncomplete": "Review section X on prerequisites..."
}`

  const validation = (
    data: unknown
  ): {
    success: boolean
    data?: {
      understands: boolean
      confidence: number
      feedback: string
      suggestionIfIncomplete: string
    }
    error?: string
  } => {
    if (!data || typeof data !== 'object') {
      return { success: false, error: 'Invalid format' }
    }

    const obj = data as Record<string, unknown>
    const result = {
      understands: obj.understands === true,
      confidence: Math.min(100, Math.max(0, (obj.confidence as number) || 75)),
      feedback: (obj.feedback as string) || '',
      suggestionIfIncomplete: (obj.suggestionIfIncomplete as string) || '',
    }

    return { success: true, data: result }
  }

  const response = await callGeminiJson(prompt, validation)
  return response.data
}
