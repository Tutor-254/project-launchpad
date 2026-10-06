import { createFileRoute } from '@tanstack/react-router'
import { AiConfigManager } from '../../components/ai-config-manager'
import { useAuth } from '../../hooks/use-auth'
import { Alert, AlertDescription } from '../../components/ui/alert'
import { AlertCircle } from 'lucide-react'

export const Route = createFileRoute('/admin/ai-settings')({
  component: AdminAiSettings,
})

function AdminAiSettings() {
  const { user, userRole } = useAuth()

  // Check if user is admin
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Please log in to access admin settings</AlertDescription>
        </Alert>
      </div>
    )
  }

  if (userRole !== 'admin' && userRole !== 'platform_admin') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>You don't have permission to access this page</AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">AI Settings</h1>
          <p className="text-gray-600 mt-2">
            Configure API keys and settings for AI-powered features
          </p>
        </div>

        {/* AI Configuration Manager */}
        <AiConfigManager
          onApiKeySet={() => {
            // Optionally trigger a refetch or update
            console.log('API key has been set')
          }}
        />

        {/* Documentation */}
        <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="font-semibold text-blue-900 mb-2">How to get your Gemini API Key</h3>
          <ol className="list-decimal list-inside space-y-2 text-sm text-blue-800">
            <li>
              Go to{' '}
              <a
                href="https://makersuite.google.com/app/apikey"
                target="_blank"
                rel="noopener noreferrer"
                className="underline font-medium"
              >
                Google AI Studio
              </a>
            </li>
            <li>Sign in with your Google account</li>
            <li>Click "Create API Key" and select your project</li>
            <li>Copy the generated API key</li>
            <li>Paste it in the form above and click "Test API Key"</li>
            <li>Once validated, click "Save Configuration"</li>
          </ol>
        </div>

        {/* Feature List */}
        <div className="mt-8 p-4 bg-green-50 border border-green-200 rounded-lg">
          <h3 className="font-semibold text-green-900 mb-2">AI Features Using Gemini</h3>
          <ul className="list-disc list-inside space-y-1 text-sm text-green-800">
            <li>Auto-generate assessment questions from competency descriptions</li>
            <li>Intelligent feedback on student submissions</li>
            <li>Smart grading with rubric-based evaluation</li>
            <li>Personalized learning path recommendations</li>
            <li>Course content suggestions and improvements</li>
            <li>Learner support chatbot for instant help</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
