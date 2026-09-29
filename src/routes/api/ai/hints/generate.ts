/**
 * POST /api/ai/hints/generate
 * Generate progressive hints for questions
 */

import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/api/ai/hints/generate')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          // Dynamic import for server-only code (use @/ alias which is configured in tsconfig)
          const { generateProgressiveHints } = await import('@/lib/ai-services/tutoring-service')
          
          const body = (await request.json()) as {
            questionId?: string
            question?: string
            competencies?: string[]
            attemptedAnswer?: string
            courseContext?: string
          }

          // Validate
          if (!body.questionId || !body.question) {
            return Response.json(
              {
                success: false,
                error: 'Missing required: questionId, question',
              },
              { status: 400 }
            )
          }

          const hints = await generateProgressiveHints({
            questionId: body.questionId,
            question: body.question,
            competencies: body.competencies || [],
            attemptedAnswer: body.attemptedAnswer,
            courseContext: body.courseContext,
          })

          return Response.json({
            success: true,
            data: hints,
            timestamp: new Date().toISOString(),
          })
        } catch (error) {
          console.error('Error in POST /api/ai/hints/generate:', error)
          return Response.json(
            {
              success: false,
              error: error instanceof Error ? error.message : 'Failed to generate hints',
            },
            { status: 500 }
          )
        }
      },
    },
  },
})
