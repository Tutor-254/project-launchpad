/**
 * POST /api/ai/feedback/generate
 * Generate personalized feedback for assessment attempts
 */

import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/api/ai/feedback/generate')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          // Dynamic import for server-only code (use @/ alias which is configured in tsconfig)
          const { generatePersonalizedFeedback } = await import('@/lib/ai-services/feedback-generation')
          
          const body = (await request.json()) as {
            attemptId?: string
            learnerId?: string
            assessmentId?: string
            assessmentType?: string
            courseTitle?: string
            competencies?: Array<{ id: string; name: string }>
            responses?: Array<{
              questionId: string
              question: string
              userAnswer: string
              correctAnswer: string
              competencies: string[]
            }>
          }

          // Validate
          if (!body.attemptId || !body.learnerId || !body.assessmentId) {
            return Response.json(
              {
                success: false,
                error: 'Missing required: attemptId, learnerId, assessmentId',
              },
              { status: 400 }
            )
          }

          if (!body.responses || body.responses.length === 0) {
            return Response.json(
              {
                success: false,
                error: 'No assessment responses provided',
              },
              { status: 400 }
            )
          }

          const feedback = await generatePersonalizedFeedback({
            attemptId: body.attemptId,
            learnerId: body.learnerId,
            assessmentId: body.assessmentId,
            assessmentType: (body.assessmentType as 'diagnostic' | 'cat1' | 'cat2') || 'cat1',
            courseTitle: body.courseTitle || 'Unknown Course',
            competencies: body.competencies || [],
            responses: body.responses,
          })

          return Response.json({
            success: true,
            data: feedback,
            timestamp: new Date().toISOString(),
          })
        } catch (error) {
          console.error('Error in POST /api/ai/feedback/generate:', error)
          return Response.json(
            {
              success: false,
              error: error instanceof Error ? error.message : 'Failed to generate feedback',
            },
            { status: 500 }
          )
        }
      },
    },
  },
})
