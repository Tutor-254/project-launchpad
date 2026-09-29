'use client'

import { useState, useEffect } from 'react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Alert, AlertDescription } from './ui/alert'
import { Loader2, Eye, EyeOff, Check, X, AlertCircle, Info } from 'lucide-react'
import { useQuery, useMutation } from '@tanstack/react-query'

interface AiConfigManagerProps {
  onApiKeySet?: () => void
}

export function AiConfigManager({ onApiKeySet }: AiConfigManagerProps) {
  const [apiKey, setApiKey] = useState('')
  const [showApiKey, setShowApiKey] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [validationStatus, setValidationStatus] = useState<'idle' | 'checking' | 'valid' | 'invalid'>('idle')
  const [testMessage, setTestMessage] = useState('')

  // Fetch current AI config
  const { data: configList, isLoading: isLoadingConfig } = useQuery({
    queryKey: ['ai-config-list'],
    queryFn: async () => {
      const response = await fetch('/api/ai/config/list', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      })
      if (!response.ok) throw new Error('Failed to fetch config')
      return response.json()
    },
  })

  // Mutation for setting API key
  const setApiKeyMutation = useMutation({
    mutationFn: async (key: string) => {
      const response = await fetch('/api/ai/config/set', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          configKey: 'GEMINI_API_KEY',
          configValue: key,
          description: 'Google Gemini API key for AI-powered features',
        }),
      })
      if (!response.ok) throw new Error('Failed to set API key')
      return response.json()
    },
    onSuccess: (data) => {
      if (data.success) {
        setTestMessage(data.message)
        setIsEditing(false)
        setApiKey('')
        onApiKeySet?.()
      }
    },
    onError: (error) => {
      setTestMessage(`Error: ${error instanceof Error ? error.message : 'Failed to set API key'}`)
    },
  })

  // Mutation for testing API key
  const testApiKeyMutation = useMutation({
    mutationFn: async (key: string) => {
      setValidationStatus('checking')
      const response = await fetch('/api/ai/config/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: key }),
      })
      if (!response.ok) throw new Error('Failed to test API key')
      return response.json()
    },
    onSuccess: (data) => {
      if (data.success) {
        setValidationStatus('valid')
        setTestMessage(data.message)
      } else {
        setValidationStatus('invalid')
        setTestMessage(data.message)
      }
    },
    onError: (error) => {
      setValidationStatus('invalid')
      setTestMessage(`Error: ${error instanceof Error ? error.message : 'Failed to test API key'}`)
    },
  })

  const handleTestApiKey = () => {
    if (!apiKey.trim()) {
      setTestMessage('Please enter an API key')
      setValidationStatus('invalid')
      return
    }
    testApiKeyMutation.mutate(apiKey)
  }

  const handleSaveApiKey = () => {
    if (!apiKey.trim()) {
      setTestMessage('Please enter an API key')
      return
    }
    if (validationStatus !== 'valid') {
      setTestMessage('Please test the API key first')
      return
    }
    setApiKeyMutation.mutate(apiKey)
  }

  const isConfigured = configList && configList.length > 0

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>AI Configuration</CardTitle>
        <CardDescription>
          Manage API keys and settings for AI-powered features
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Status Display */}
        {isConfigured && !isEditing && (
          <Alert className="bg-green-50 border-green-200">
            <Check className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              ✓ Gemini API Key is configured and ready
            </AlertDescription>
          </Alert>
        )}

        {/* Configuration Form */}
        {!isConfigured || isEditing ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Gemini API Key</label>
              <div className="relative">
                <Input
                  type={showApiKey ? 'text' : 'password'}
                  placeholder="Enter your Google Gemini API key"
                  value={apiKey}
                  onChange={(e) => {
                    setApiKey(e.target.value)
                    setValidationStatus('idle')
                    setTestMessage('')
                  }}
                  disabled={setApiKeyMutation.isPending}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <p className="text-xs text-gray-500">
                Get your API key from{' '}
                <a
                  href="https://makersuite.google.com/app/apikey"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  Google AI Studio
                </a>
              </p>
            </div>

            {/* Validation Status */}
            {testMessage && (
              <Alert
                className={
                  validationStatus === 'valid'
                    ? 'bg-green-50 border-green-200'
                    : validationStatus === 'invalid'
                      ? 'bg-red-50 border-red-200'
                      : 'bg-blue-50 border-blue-200'
                }
              >
                {validationStatus === 'valid' ? (
                  <Check className="h-4 w-4 text-green-600" />
                ) : validationStatus === 'invalid' ? (
                  <X className="h-4 w-4 text-red-600" />
                ) : (
                  <Info className="h-4 w-4 text-blue-600" />
                )}
                <AlertDescription
                  className={
                    validationStatus === 'valid'
                      ? 'text-green-800'
                      : validationStatus === 'invalid'
                        ? 'text-red-800'
                        : 'text-blue-800'
                  }
                >
                  {testMessage}
                </AlertDescription>
              </Alert>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2">
              <Button
                onClick={handleTestApiKey}
                variant="outline"
                disabled={!apiKey.trim() || testApiKeyMutation.isPending}
                className="flex-1"
              >
                {testApiKeyMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Test API Key
              </Button>
              <Button
                onClick={handleSaveApiKey}
                disabled={
                  !apiKey.trim() || validationStatus !== 'valid' || setApiKeyMutation.isPending
                }
                className="flex-1"
              >
                {setApiKeyMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Configuration
              </Button>
            </div>

            {isConfigured && (
              <Button
                onClick={() => {
                  setIsEditing(false)
                  setApiKey('')
                  setTestMessage('')
                  setValidationStatus('idle')
                }}
                variant="ghost"
                className="w-full"
              >
                Cancel
              </Button>
            )}
          </div>
        ) : (
          /* Configuration Status View */
          <div className="space-y-3">
            <div className="p-3 bg-gray-50 rounded-lg border">
              <p className="text-sm font-medium text-gray-700">Configuration Status</p>
              <p className="text-sm text-gray-600 mt-1">
                Gemini API is configured and validated
              </p>
              {configList && configList[0]?.last_used_at && (
                <p className="text-xs text-gray-500 mt-1">
                  Last used: {new Date(configList[0].last_used_at).toLocaleString()}
                </p>
              )}
            </div>

            <Button
              onClick={() => setIsEditing(true)}
              variant="outline"
              className="w-full"
            >
              Update API Key
            </Button>
          </div>
        )}

        {/* Information Section */}
        <Alert className="bg-blue-50 border-blue-200">
          <Info className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800">
            <strong>Security Note:</strong> API keys are encrypted in Supabase and only accessible
            to server-side code. They are never exposed to the client.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  )
}
