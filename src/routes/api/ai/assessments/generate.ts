/**
 * POST /api/ai/assessments/generate
 * Generate assessments using AI
 */

import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/api/ai/assessments/generate')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          // Dynamic import for server-only code (use @/ alias which is configured in tsconfig)
          const { generateCompleteAssessment } = await import('@/lib/ai-services/assessment-generation')
          
          const body = (await request.json()) as {
            assessmentType?: string
            competencyIds?: string[]
            courseId?: string
            courseTitle?: string
            courseDifficulty?: string
            targetQuestionCount?: number
          }

          // Validate required fields
          if (!body.assessmentType || !body.courseId || !body.courseTitle) {
            return Response.json(
              {
                success: false,
                error: 'Missing required fields: assessmentType, courseId, courseTitle',
              },
              { status: 400 }
            )
          }

          if (!['diagnostic', 'cat1', 'cat2'].includes(body.assessmentType)) {
            return Response.json(
              {
                success: false,
                error: 'Invalid assessmentType. Must be: diagnostic, cat1, or cat2',
              },
              { status: 400 }
            )
          }

          const generationRequest = {
            assessmentType: body.assessmentType as 'diagnostic' | 'cat1' | 'cat2',
            competencyIds: body.competencyIds || [],
            courseId: body.courseId,
            courseTitle: body.courseTitle,
            courseDifficulty: (body.courseDifficulty as 'beginner' | 'intermediate' | 'advanced') || 'intermediate',
            targetQuestionCount: body.targetQuestionCount,
          }

          const result = await generateCompleteAssessment(generationRequest)

          return Response.json({
            success: true,
            data: result,
            timestamp: new Date().toISOString(),
          })
        } catch (error) {
          console.error('Error in POST /api/ai/assessments/generate:', error)
          return Response.json(
            {
              success: false,
              error: error instanceof Error ? error.message : 'Failed to generate assessment',
            },
            { status: 500 }
          )
        }
      },
    },
  },
})
