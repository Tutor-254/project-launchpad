import { createFileRoute } from '@tanstack/react-router'

/**
 * GET /api/ai/config/list
 * Admin-only endpoint to list AI configurations (without values)
 * Returns list of config metadata for display
 */
export const Route = createFileRoute('/api/ai/config/list')({
  server: {
    handlers: {
      GET: async () => {
        try {
          const { getAiConfigList } = await import('@/lib/ai-config.server')

          // Get configuration list
          const configList = await getAiConfigList()

          return Response.json(configList, { status: 200 })
        } catch (error) {
          console.error('Error in GET /api/ai/config/list:', error)
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
