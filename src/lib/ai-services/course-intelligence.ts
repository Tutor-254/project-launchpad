/**
 * AI-Powered Course Intelligence Extraction Service
 * Extracts competencies and learning objectives from course materials
 */

import { callGeminiJson } from './gemini-client'
import type { CourseIntelligence, ExtractedCompetency, LearningObjective } from '~/types/ai-services'

export interface CourseIntelligenceRequest {
  courseId: string
  courseTitle: string
  courseDescription: string
  materials: string[] // Course content/materials
  existingCompetencies?: Array<{ id: string; name: string }>
}

/**
 * Extract course intelligence from materials
 */
export async function extractCourseIntelligence(
  request: CourseIntelligenceRequest
): Promise<CourseIntelligence> {
  // Extract competencies
  const competencies = await extractCompetencies(request)

  // Extract learning objectives
  const objectives = await extractLearningObjectives(request, competencies)

  // Analyze course difficulty and duration
  const analysis = analyzeCourseMaterial(request.materials)

  return {
    courseId: request.courseId,
    extractedCompetencies: competencies,
    learningObjectives: objectives,
    estimatedDifficultyLevel: analysis.difficulty,
    estimatedTotalHours: analysis.hours,
    keyTopics: analysis.topics,
    prerequisites: analysis.prerequisites,
    relatedJobRoles: analysis.jobRoles,
    successMetrics: analysis.successMetrics,
    extractedAt: new Date(),
  }
}

/**
 * Extract competencies from course materials
 */
async function extractCompetencies(
  request: CourseIntelligenceRequest
): Promise<ExtractedCompetency[]> {
  const prompt = `Analyze this course and extract the key competencies learners will develop.

Course: ${request.courseTitle}
Description: ${request.courseDescription}

Materials:
${request.materials.slice(0, 3).join('\n\n')}
${request.materials.length > 3 ? `\n... and ${request.materials.length - 3} more materials` : ''}

${request.existingCompetencies ? `\nExisting competencies to reference:\n${request.existingCompetencies.map((c) => `- ${c.name}`).join('\n')}` : ''}

Extract observable competencies with:
1. Specific, measurable name
2. Clear description
3. 2-3 observable behaviors
4. 2-3 success criteria
5. Estimated learning hours
6. Related job roles
7. Prerequisites (if any)
8. Difficulty level: beginner, intermediate, or advanced
9. Confidence score (0-100)

Return as JSON:
{
  "competencies": [
    {
      "name": "Competency Name",
      "description": "Clear description...",
      "observableBehaviors": ["behavior1", "behavior2"],
      "successCriteria": ["criterion1", "criterion2"],
      "estimatedDifficultyLevel": "intermediate",
      "relatedJobRoles": ["job1", "job2"],
      "prerequisites": [],
      "estimatedLearningHours": 10,
      "confidenceScore": 90
    }
  ]
}

Identify 4-8 competencies. Be specific and observable.`

  const validation = (
    data: unknown
  ): { success: boolean; data?: ExtractedCompetency[]; error?: string } => {
    if (!data || typeof data !== 'object') {
      return { success: false, error: 'Invalid format' }
    }

    const obj = data as Record<string, unknown>
    if (!Array.isArray(obj.competencies)) {
      return { success: false, error: 'Missing competencies array' }
    }

    const competencies: ExtractedCompetency[] = (obj.competencies as Array<Record<string, unknown>>).map(
      (c) => ({
        name: (c.name as string) || 'Unknown',
        description: (c.description as string) || '',
        observableBehaviors: Array.isArray(c.observableBehaviors)
          ? (c.observableBehaviors as string[])
          : [],
        successCriteria: Array.isArray(c.successCriteria) ? (c.successCriteria as string[]) : [],
        estimatedDifficultyLevel: (
          (c.estimatedDifficultyLevel as string) || 'intermediate'
        ) as 'beginner' | 'intermediate' | 'advanced',
        relatedJobRoles: Array.isArray(c.relatedJobRoles) ? (c.relatedJobRoles as string[]) : [],
        prerequisites: Array.isArray(c.prerequisites) ? (c.prerequisites as string[]) : [],
        estimatedLearningHours: (c.estimatedLearningHours as number) || 10,
        confidenceScore: Math.min(100, Math.max(0, (c.confidenceScore as number) || 80)),
      })
    )

    return { success: true, data: competencies }
  }

  const response = await callGeminiJson<ExtractedCompetency[]>(prompt, validation)
  return response.data
}

/**
 * Extract learning objectives
 */
async function extractLearningObjectives(
  request: CourseIntelligenceRequest,
  competencies: ExtractedCompetency[]
): Promise<LearningObjective[]> {
  const prompt = `Based on these course competencies, create learning objectives using Bloom's taxonomy.

Course: ${request.courseTitle}
Competencies:
${competencies.map((c) => `- ${c.name}: ${c.description}`).join('\n')}

For each competency, create 2-3 learning objectives following Bloom's progression (remember, understand, apply, analyze, evaluate, create).

Start with lower-order thinking and progress to higher-order.

Return as JSON:
{
  "objectives": [
    {
      "text": "By the end of this course, learners will be able to...",
      "bloomsLevel": "remember|understand|apply|analyze|evaluate|create",
      "competencyId": "comp_name"
    }
  ]
}

Create 8-12 objectives total. Use action verbs (understand, analyze, create, etc.).`

  const validation = (
    data: unknown
  ): { success: boolean; data?: LearningObjective[]; error?: string } => {
    if (!data || typeof data !== 'object') {
      return { success: false, error: 'Invalid format' }
    }

    const obj = data as Record<string, unknown>
    if (!Array.isArray(obj.objectives)) {
      return { success: false, error: 'Missing objectives array' }
    }

    const objectives: LearningObjective[] = (obj.objectives as Array<Record<string, unknown>>).map(
      (o) => ({
        text: (o.text as string) || '',
        bloomsLevel: ((o.bloomsLevel as string) || 'understand') as
          | 'remember'
          | 'understand'
          | 'apply'
          | 'analyze'
          | 'evaluate'
          | 'create',
        competencyId: (o.competencyId as string) || '',
      })
    )

    return { success: true, data: objectives }
  }

  const response = await callGeminiJson<LearningObjective[]>(prompt, validation)
  return response.data
}

/**
 * Analyze course material for metadata
 */
function analyzeCourseMaterial(materials: string[]): {
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  hours: number
  topics: string[]
  prerequisites: string[]
  jobRoles: string[]
  successMetrics: string[]
} {
  const fullText = materials.join(' ')
  const wordCount = fullText.split(/\s+/).length

  // Estimate hours (rough: 1 hour per 500-1000 words for course materials)
  const estimatedHours = Math.max(5, Math.ceil(wordCount / 750))

  // Detect difficulty from keywords
  const advancedKeywords = ['advanced', 'complex', 'specialized', 'expert', 'machine learning']
  const beginnerKeywords = ['introduction', 'basics', 'fundamentals', 'beginner', 'start']

  let difficulty: 'beginner' | 'intermediate' | 'advanced' = 'intermediate'
  if (advancedKeywords.some((k) => fullText.toLowerCase().includes(k))) {
    difficulty = 'advanced'
  } else if (beginnerKeywords.some((k) => fullText.toLowerCase().includes(k))) {
    difficulty = 'beginner'
  }

  // Extract topics (simple heuristic)
  const topicsSet = new Set<string>()
  const lines = fullText.split('\n')
  lines.forEach((line) => {
    if (line.length < 100 && line.length > 10) {
      const cleaned = line.trim()
      if (!cleaned.endsWith('.') && !cleaned.endsWith(',')) {
        topicsSet.add(cleaned.substring(0, 50))
      }
    }
  })

  const topics = Array.from(topicsSet).slice(0, 8)

  return {
    difficulty,
    hours: estimatedHours,
    topics,
    prerequisites: [],
    jobRoles: [],
    successMetrics: [
      'Successfully apply concepts in practical projects',
      'Score > 80% on assessments',
      'Complete all learning objectives',
    ],
  }
}
