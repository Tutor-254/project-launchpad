/**
 * AI-Powered Facilitator Screening Service
 * Evaluates instructor applications using Gemini
 */

import { callGeminiJson } from './gemini-client'
import type {
  FacilitatorScreeningRequest,
  FacilitatorScreeningResult,
  ExpertiseAssessment,
} from '~/types/ai-services'

/**
 * Screen facilitator application
 */
export async function screenFacilitator(
  request: FacilitatorScreeningRequest
): Promise<FacilitatorScreeningResult> {
  const prompt = `You are an expert educational consultant evaluating instructor applications. Based on the information provided, assess this facilitator's qualifications.

Application ID: ${request.applicationId}

Educational Background:
${request.educationalBackground || 'Not provided'}

Teaching Experience:
${request.teachingExperience || 'Not provided'}

Subject Expertise:
${request.subjectExpertise || 'Not provided'}

Materials Samples Provided: ${request.materialsSamples ? 'Yes' : 'No'}
${request.materialsSamples ? `(${request.materialsSamples.length} samples)` : ''}

Additional Information:
${request.additionalInfo || 'None'}

Evaluate:
1. Overall qualification score (0-100)
2. Recommendation: "recommend", "consider", or "reject"
3. Expertise assessments for each relevant area (score 0-100)
4. Strengths (list 2-3)
5. Concerns (list 2-3)
6. Questions for more information (2-3 if needed)
7. Detailed reasoning

Return as JSON:
{
  "overallScore": 85,
  "recommendation": "recommend|consider|reject",
  "confidenceScore": 90,
  "expertiseAssessments": [
    {
      "area": "Subject Knowledge",
      "score": 85,
      "level": "novice|intermediate|expert",
      "evidence": "Based on..."
    }
  ],
  "strengths": ["strength1", "strength2"],
  "concerns": ["concern1", "concern2"],
  "suggestedQuestions": ["question1", "question2"],
  "reasoning": "Comprehensive reasoning..."
}

Be thorough but fair. Consider both academic credentials and practical teaching ability.`

  const validation = (
    data: unknown
  ): { success: boolean; data?: FacilitatorScreeningResult; error?: string } => {
    if (!data || typeof data !== 'object') {
      return { success: false, error: 'Invalid format' }
    }

    const obj = data as Record<string, unknown>
    if (typeof obj.overallScore !== 'number' || typeof obj.recommendation !== 'string') {
      return { success: false, error: 'Missing required fields' }
    }

    const result: FacilitatorScreeningResult = {
      applicationId: request.applicationId,
      overallQualificationScore: Math.min(100, Math.max(0, obj.overallScore as number)),
      recommendation: (obj.recommendation as string) as 'recommend' | 'consider' | 'reject',
      confidenceScore: Math.min(100, Math.max(0, (obj.confidenceScore as number) || 75)),
      expertiseAssessments: (
        (Array.isArray(obj.expertiseAssessments) ? obj.expertiseAssessments : []) as Array<{
          area: string
          score: number
          level: string
          evidence: string
        }>
      ).map((e) => ({
        area: e.area || 'Unknown',
        score: Math.min(100, Math.max(0, e.score || 0)),
        level: (e.level || 'intermediate') as 'novice' | 'intermediate' | 'expert',
        evidence: e.evidence || '',
      })),
      strengths: Array.isArray(obj.strengths) ? (obj.strengths as string[]) : [],
      concerns: Array.isArray(obj.concerns) ? (obj.concerns as string[]) : [],
      suggestedQuestions: Array.isArray(obj.suggestedQuestions) ? (obj.suggestedQuestions as string[]) : [],
      reasoning: (obj.reasoning as string) || '',
      screenedAt: new Date(),
    }

    return { success: true, data: result }
  }

  const response = await callGeminiJson<FacilitatorScreeningResult>(prompt, validation)
  return response.data
}

/**
 * Assess expertise in specific area
 */
export async function assessExpertiseArea(
  area: string,
  background: string
): Promise<ExpertiseAssessment> {
  const prompt = `Assess expertise in "${area}" based on this background:

${background}

Provide:
1. Score (0-100)
2. Level: novice, intermediate, or expert
3. Evidence from the background provided

Return as JSON:
{
  "area": "${area}",
  "score": 75,
  "level": "intermediate",
  "evidence": "Evidence-based reasoning..."
}`

  const validation = (data: unknown): { success: boolean; data?: ExpertiseAssessment; error?: string } => {
    if (!data || typeof data !== 'object') {
      return { success: false, error: 'Invalid format' }
    }

    const obj = data as Record<string, unknown>
    const assessment: ExpertiseAssessment = {
      area: (obj.area as string) || area,
      score: Math.min(100, Math.max(0, (obj.score as number) || 50)),
      level: ((obj.level as string) || 'intermediate') as 'novice' | 'intermediate' | 'expert',
      evidence: (obj.evidence as string) || '',
    }

    return { success: true, data: assessment }
  }

  const response = await callGeminiJson<ExpertiseAssessment>(prompt, validation)
  return response.data
}

/**
 * Generate follow-up questions
 */
export async function generateFollowUpQuestions(
  facilitorProfile: string,
  concernAreas: string[]
): Promise<string[]> {
  const prompt = `Based on this facilitator profile and concern areas, generate 3 thoughtful follow-up questions:

Profile:
${facilitorProfile}

Concern Areas:
${concernAreas.map((c) => `- ${c}`).join('\n')}

Generate questions that:
1. Address the concern areas
2. Are open-ended and invite detailed responses
3. Are professional and respectful
4. Help clarify suitability for teaching

Return as JSON:
{
  "questions": ["question1", "question2", "question3"]
}`

  const validation = (data: unknown): { success: boolean; data?: string[]; error?: string } => {
    if (!data || typeof data !== 'object') {
      return { success: false, error: 'Invalid format' }
    }

    const obj = data as Record<string, unknown>
    const questions = Array.isArray(obj.questions) ? (obj.questions as string[]) : []

    return { success: true, data: questions }
  }

  const response = await callGeminiJson<string[]>(prompt, validation)
  return response.data
}
