import { createFileRoute } from '@tanstack/react-router'

/**
 * POST /api/ai/config/test
 * Test if a Gemini API key is valid
 * Body: { apiKey: string }
 * Returns: { success: boolean; message: string }
 */
export const Route = createFileRoute('/api/ai/config/test')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const { testGeminiApiKey } = await import('@/lib/ai-config.server')

          // Parse request body
          const body = (await request.json()) as { apiKey?: string }
          const { apiKey } = body

          if (!apiKey) {
            return Response.json(
              {
                success: false,
                message: 'Missing required field: apiKey',
              },
              { status: 400 }
            )
          }

          // Test the API key
          const result = await testGeminiApiKey(apiKey)

          return Response.json(result, {
            status: result.success ? 200 : 400,
          })
        } catch (error) {
          console.error('Error in POST /api/ai/config/test:', error)
          return Response.json(
            {
              success: false,
              message: error instanceof Error ? error.message : 'Internal server error',
            },
            { status: 500 }
          )
        }
      },
    },
  },
})
