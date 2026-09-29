import { createFileRoute } from '@tanstack/react-router'

/**
 * POST /api/ai/config/set
 * Admin-only endpoint to set AI configuration
 * Body: { configKey: string; configValue: string; description?: string }
 */
export const Route = createFileRoute('/api/ai/config/set')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const { setAiConfig } = await import('@/lib/ai-config.server')

          // Parse request body
          const body = (await request.json()) as {
            configKey?: string
            configValue?: string
            description?: string
          }
          const { configKey, configValue, description } = body

          if (!configKey || !configValue) {
            return Response.json(
              {
                success: false,
                message: 'Missing required fields: configKey, configValue',
              },
              { status: 400 }
            )
          }

          // Set the configuration
          const result = await setAiConfig(configKey, configValue, description)

          return Response.json(result, {
            status: result.success ? 200 : 400,
          })
        } catch (error) {
          console.error('Error in POST /api/ai/config/set:', error)
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
