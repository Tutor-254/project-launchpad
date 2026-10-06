/**
 * Server-side AI configuration management
 * Uses hardcoded environment variables for API keys
 */

// Get Gemini API key from environment
const geminiApiKey = process.env.GEMINI_API_KEY || process.env['Gemini API Key'] || ''

// Simple in-memory storage for API keys during session (for override capability)
const apiKeyStore: Record<string, string> = {}

// Initialize with environment key if available
if (geminiApiKey) {
  apiKeyStore['GEMINI_API_KEY'] = geminiApiKey
}

/**
 * Retrieve Gemini API key from memory store
 */
export async function getGeminiApiKey(): Promise<string> {
  try {
    const apiKey = apiKeyStore['GEMINI_API_KEY']
    
    if (!apiKey) {
      throw new Error('Gemini API key not configured. Please set it in admin settings.')
    }
    
    return apiKey
  } catch (error) {
    console.error('Error in getGeminiApiKey:', error)
    throw error
  }
}

/**
 * Get all AI configuration from memory store
 */
export async function getAiConfigList() {
  try {
    const configs = Object.entries(apiKeyStore).map(([key, _]) => ({
      id: key,
      config_key: key,
      config_type: 'api_key',
      description: key === 'GEMINI_API_KEY' ? 'Google Gemini API key' : 'API key',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      last_used_at: null,
    }))
    
    return configs
  } catch (error) {
    console.error('Error in getAiConfigList:', error)
    throw error
  }
}

/**
 * Set AI configuration in memory store
 */
export async function setAiConfig(
  configKey: string,
  configValue: string,
  description?: string
): Promise<{ success: boolean; message: string }> {
  try {
    // Validate input
    if (!configKey || !configValue) {
      return {
        success: false,
        message: 'Configuration key and value are required',
      }
    }
    
    // Store in memory
    apiKeyStore[configKey] = configValue
    
    return {
      success: true,
      message: `Configuration "${configKey}" saved successfully`,
    }
  } catch (error) {
    console.error('Error in setAiConfig:', error)
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error occurred',
    }
  }
}

/**
 * Validate Gemini API key format
 * Checks basic validity without making API calls
 */
export function validateGeminiApiKey(apiKey: string): boolean {
  // Gemini API keys are typically long alphanumeric strings with special chars
  // This is a basic validation - actual validation happens when used
  if (!apiKey || apiKey.length < 20) {
    return false
  }
  
  // Check if it looks like a valid format (alphanumeric, hyphens, underscores, dots allowed)
  const apiKeyPattern = /^[a-zA-Z0-9\-_.]+$/
  return apiKeyPattern.test(apiKey)
}

/**
 * Test Gemini API key by making a simple API call
 * Returns { success: boolean; message: string }
 */
export async function testGeminiApiKey(apiKey: string) {
  try {
    // First validate format
    if (!validateGeminiApiKey(apiKey)) {
      return {
        success: false,
        message: 'Invalid API key format. Gemini API keys should be long alphanumeric strings.',
      }
    }

    // Import Gemini SDK
    const { GoogleGenerativeAI } = await import('@google/generative-ai')
    
    const client = new GoogleGenerativeAI(apiKey)
    
    // Try multiple models in order of preference (latest to oldest)
    const models = ['gemini-2.0-flash-exp', 'gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-pro']
    let lastError: Error | null = null
    
    for (const modelName of models) {
      try {
        const model = client.getGenerativeModel({ model: modelName })
        const result = await model.generateContent('Say "API key is valid" in one sentence.')
        
        if (result.response.text()) {
          return {
            success: true,
            message: `✓ Gemini API key is valid and working (using ${modelName})`,
          }
        }
      } catch (error) {
        lastError = error as Error
        // Log which model failed and continue to next
        console.log(`[AI Config] Model ${modelName} failed:`, lastError.message)
        continue
      }
    }
    
    // If we get here, no models worked
    return {
      success: false,
      message: `API key format is valid, but couldn't reach Gemini API. Error: ${lastError?.message || 'Unknown error'}. Please ensure your API key has access to Gemini models.`,
    }
  } catch (error) {
    console.error('Error testing Gemini API key:', error)
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to validate API key',
    }
  }
}

/**
 * Delete AI configuration from memory store
 */
export async function deleteAiConfig(configKey: string): Promise<{ success: boolean; message: string }> {
  try {
    delete apiKeyStore[configKey]
    
    return {
      success: true,
      message: `Configuration "${configKey}" deleted successfully`,
    }
  } catch (error) {
    console.error('Error in deleteAiConfig:', error)
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error occurred',
    }
  }
}
