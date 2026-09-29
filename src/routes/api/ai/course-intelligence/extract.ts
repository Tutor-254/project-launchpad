/**
 * POST /api/ai/course-intelligence/extract
 * Extract competencies and learning objectives from course materials
 */

import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/api/ai/course-intelligence/extract')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          // Dynamic import for server-only code (use @/ alias which is configured in tsconfig)
          const { extractCourseIntelligence } = await import('@/lib/ai-services/course-intelligence')
          
          const body = (await request.json()) as {
            courseId?: string
            courseTitle?: string
            courseDescription?: string
            materials?: string[]
            existingCompetencies?: Array<{ id: string; name: string }>
          }

          // Validate
          if (!body.courseId || !body.courseTitle) {
            return Response.json(
              {
                success: false,
                error: 'Missing required: courseId, courseTitle',
              },
              { status: 400 }
            )
          }

          if (!body.materials || body.materials.length === 0) {
            return Response.json(
              {
                success: false,
                error: 'No course materials provided',
              },
              { status: 400 }
            )
          }

          const intelligence = await extractCourseIntelligence({
            courseId: body.courseId,
            courseTitle: body.courseTitle,
            courseDescription: body.courseDescription || '',
            materials: body.materials,
            existingCompetencies: body.existingCompetencies,
          })

          return Response.json({
            success: true,
            data: intelligence,
            timestamp: new Date().toISOString(),
          })
        } catch (error) {
          console.error('Error in POST /api/ai/course-intelligence/extract:', error)
          return Response.json(
            {
              success: false,
              error: error instanceof Error ? error.message : 'Failed to extract course intelligence',
            },
            { status: 500 }
          )
        }
      },
    },
  },
})
