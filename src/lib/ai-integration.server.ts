import { GoogleGenerativeAI, type GenerateContentRequest } from '@google/generative-ai'
import { getGeminiApiKey } from './ai-config.server'

/**
 * AI Integration Utilities
 * Server-side utilities for using Gemini API with competency framework
 */

// Get model from environment or use default
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.0-flash-exp'

let cachedClient: GoogleGenerativeAI | null = null

/**
 * Get or initialize Gemini client
 * Caches the client for performance
 */
async function getGeminiClient(): Promise<GoogleGenerativeAI> {
  if (cachedClient) {
    return cachedClient
  }

  const apiKey = await getGeminiApiKey()
  cachedClient = new GoogleGenerativeAI(apiKey)
  return cachedClient
}

/**
 * Generate assessment questions from competency description
 */
export async function generateAssessmentQuestions(
  competencyTitle: string,
  competencyDescription: string,
  questionCount: number = 5
) {
  try {
    const client = await getGeminiClient()
    const model = client.getGenerativeModel({ model: GEMINI_MODEL })

    const prompt = `You are an expert educational content creator. Create ${questionCount} multiple-choice assessment questions for the following competency:

Competency: ${competencyTitle}
Description: ${competencyDescription}

For each question, provide:
1. The question text
2. Exactly 4 answer options (labeled A, B, C, D)
3. The correct answer (just the letter)
4. A brief explanation of why the answer is correct

Format your response as a JSON array with the following structure:
[
  {
    "question": "Question text here?",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctAnswer": "A",
    "explanation": "Explanation of why A is correct"
  }
]

Only return valid JSON, no additional text.`

    const result = await model.generateContent(prompt)
    const responseText = result.response.text()

    // Parse JSON response
    const questions = JSON.parse(responseText)
    return {
      success: true,
      questions,
      message: `Generated ${questions.length} assessment questions`,
    }
  } catch (error) {
    console.error('Error generating assessment questions:', error)
    return {
      success: false,
      questions: [],
      message: error instanceof Error ? error.message : 'Failed to generate questions',
    }
  }
}

/**
 * Generate intelligent feedback for student submission
 */
export async function generateSubmissionFeedback(
  competencyTitle: string,
  rubricCriteria: string[],
  studentSubmission: string,
  maxLength: number = 500
) {
  try {
    const client = await getGeminiClient()
    const model = client.getGenerativeModel({ model: GEMINI_MODEL })

    const criteriaList = rubricCriteria.map((c, i) => `${i + 1}. ${c}`).join('\n')

    const prompt = `You are an expert instructor providing constructive feedback on student work. 

Competency Being Assessed: ${competencyTitle}

Grading Criteria:
${criteriaList}

Student Submission:
${studentSubmission}

Provide concise, constructive feedback that:
1. Acknowledges what the student did well
2. Identifies areas for improvement
3. Provides specific suggestions for enhancement
4. Is encouraging and supportive in tone

Keep your feedback under ${maxLength} characters.`

    const result = await model.generateContent(prompt)
    const feedback = result.response.text()

    return {
      success: true,
      feedback,
      length: feedback.length,
    }
  } catch (error) {
    console.error('Error generating feedback:', error)
    return {
      success: false,
      feedback: '',
      message: error instanceof Error ? error.message : 'Failed to generate feedback',
    }
  }
}

/**
 * Generate personalized learning path recommendation
 */
export async function generateLearningPathRecommendation(
  learnerName: string,
  completedCompetencies: string[],
  availableCompetencies: string[],
  learnerGoals: string
) {
  try {
    const client = await getGeminiClient()
    const model = client.getGenerativeModel({ model: GEMINI_MODEL })

    const completed = completedCompetencies.length > 0 
      ? completedCompetencies.join(', ') 
      : 'None yet'
    const available = availableCompetencies.join(', ')

    const prompt = `You are a learning path advisor. Based on the following learner profile, recommend a personalized learning path.

Learner: ${learnerName}
Learning Goals: ${learnerGoals}
Completed Competencies: ${completed}
Available Competencies to Learn: ${available}

Provide a JSON recommendation with:
{
  "recommendation": "Clear, personalized recommendation text",
  "nextCompetencies": ["Top 3 competencies to learn next in priority order"],
  "rationale": "Why these competencies are recommended",
  "estimatedDuration": "Estimated time to complete next 3 competencies",
  "motivationalMessage": "An encouraging message for the learner"
}

Only return valid JSON, no additional text.`

    const result = await model.generateContent(prompt)
    const responseText = result.response.text()

    // Parse JSON response
    const recommendation = JSON.parse(responseText)
    return {
      success: true,
      recommendation,
    }
  } catch (error) {
    console.error('Error generating learning path:', error)
    return {
      success: false,
      recommendation: null,
      message: error instanceof Error ? error.message : 'Failed to generate recommendation',
    }
  }
}

/**
 * Generate course content suggestions
 */
export async function generateCourseImprovements(
  courseTitle: string,
  courseDescription: string,
  currentTopics: string[]
)  {
  try {
    const client = await getGeminiClient()
    const model = client.getGenerativeModel({ model: GEMINI_MODEL })

    const topicsList = currentTopics.join(', ')

    const prompt = `You are a curriculum design expert. Review this course and suggest improvements.

Course Title: ${courseTitle}
Description: ${courseDescription}
Current Topics: ${topicsList}

Provide suggestions as a JSON object with:
{
  "suggestedTopics": ["New topics to add"],
  "contentImprovements": ["Specific improvements to existing content"],
  "assessmentSuggestions": ["Types of assessments that would work well"],
  "interactionStrategies": ["Ways to increase student engagement"],
  "summary": "Brief summary of recommendations"
}

Only return valid JSON, no additional text.`

    const result = await model.generateContent(prompt)
    const responseText = result.response.text()

    // Parse JSON response
    const suggestions = JSON.parse(responseText)
    return {
      success: true,
      suggestions,
    }
  } catch (error) {
    console.error('Error generating course improvements:', error)
    return {
      success: false,
      suggestions: null,
      message: error instanceof Error ? error.message : 'Failed to generate suggestions',
    }
  }
}

/**
 * Generic content generation
 * Use this for custom AI tasks
 */
export async function generateContent(
  prompt: string,
  options?: {
    model?: string
    temperature?: number
    maxOutputTokens?: number
  }
) {
  try {
    const client = await getGeminiClient()
    const model = client.getGenerativeModel({
      model: options?.model || GEMINI_MODEL,
      generationConfig: {
        temperature: options?.temperature || 0.7,
        maxOutputTokens: options?.maxOutputTokens || 1000,
      },
    })

    const result = await model.generateContent(prompt)
    const text = result.response.text()

    return {
      success: true,
      content: text,
      usageMetadata: result.response.usageMetadata,
    }
  } catch (error) {
    console.error('Error in generateContent:', error)
    return {
      success: false,
      content: '',
      message: error instanceof Error ? error.message : 'Failed to generate content',
    }
  }
}

/**
 * Clear cached client (useful for testing or switching API keys)
 */
export function clearGeminiClientCache() {
  cachedClient = null
}
