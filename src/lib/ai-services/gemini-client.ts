/**
 * Gemini API Client - Core wrapper for Google's Generative AI
 * Handles API calls, retries, cost tracking, and error handling
 */

import { GoogleGenerativeAI, type GenerativeModel } from '@google/generative-ai'
import type { Content, GenerateContentRequest } from '@google/generative-ai'

// Configuration from environment
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || ''
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.0-flash-exp'
const GEMINI_COST_LIMIT_USD = parseFloat(process.env.GEMINI_COST_LIMIT_USD || '100')

// Retry configuration
const MAX_RETRIES = 5
const INITIAL_BACKOFF_MS = 1000
const MAX_BACKOFF_MS = 30000

// Token cost estimation (approximate, actual costs from API)
const TOKEN_COSTS = {
  inputPer1k: 0.00000075, // $0.75 per 1M input tokens
  outputPer1k: 0.003, // $3 per 1M output tokens
}

// Usage tracking for cost management
let totalTokensUsed = 0
let totalCostUSD = 0

export interface GeminiOptions {
  maxRetries?: number
  timeout?: number
  temperature?: number
  topP?: number
  topK?: number
}

export interface GeminiResponse {
  text: string
  tokenCount: {
    input: number
    output: number
    total: number
  }
  costEstimate: number
  model: string
  timestamp: Date
}

export interface GeminiJsonResponse<T> extends GeminiResponse {
  data: T
}

/**
 * Initialize Gemini client
 */
function initializeClient(): GenerativeModel {
  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY environment variable is not set')
  }

  const client = new GoogleGenerativeAI(GEMINI_API_KEY)
  return client.getGenerativeModel({ model: GEMINI_MODEL })
}

/**
 * Calculate exponential backoff delay
 */
function getBackoffDelay(attempt: number): number {
  const delay = Math.min(INITIAL_BACKOFF_MS * Math.pow(2, attempt), MAX_BACKOFF_MS)
  // Add jitter (0-25%)
  return delay * (0.75 + Math.random() * 0.25)
}

/**
 * Estimate token count for text
 */
async function estimateTokens(model: GenerativeModel, text: string): Promise<number> {
  try {
    const result = await model.countTokens(text)
    return result.totalTokens
  } catch {
    // Fallback: rough estimation (1 token ≈ 4 characters)
    return Math.ceil(text.length / 4)
  }
}

/**
 * Calculate cost based on tokens used
 */
function calculateCost(inputTokens: number, outputTokens: number): number {
  const inputCost = (inputTokens / 1000) * TOKEN_COSTS.inputPer1k
  const outputCost = (outputTokens / 1000) * TOKEN_COSTS.outputPer1k
  return inputCost + outputCost
}

/**
 * Main function to call Gemini API with automatic retries
 */
export async function callGemini(
  prompt: string,
  options: GeminiOptions = {}
): Promise<GeminiResponse> {
  const {
    maxRetries = MAX_RETRIES,
    timeout = 60000,
    temperature = 0.7,
    topP = 0.95,
    topK = 64,
  } = options

  let lastError: Error | null = null
  const model = initializeClient()

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // Check cost limit before making request
      if (totalCostUSD >= GEMINI_COST_LIMIT_USD) {
        throw new Error(
          `Cost limit exceeded: $${totalCostUSD.toFixed(2)} / $${GEMINI_COST_LIMIT_USD}. Please request budget increase.`
        )
      }

      // Estimate input tokens and cost
      const estimatedInputTokens = await estimateTokens(model, prompt)
      const estimatedCost =
        (estimatedInputTokens / 1000) * TOKEN_COSTS.inputPer1k + 0.001 // Add small estimate for output

      if (totalCostUSD + estimatedCost > GEMINI_COST_LIMIT_USD) {
        throw new Error(
          `Request would exceed cost limit. Current: $${totalCostUSD.toFixed(2)}, Request: ~$${estimatedCost.toFixed(4)}, Limit: $${GEMINI_COST_LIMIT_USD}`
        )
      }

      // Make the API call with timeout
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), timeout)

      let response
      try {
        response = await Promise.race([
          model.generateContent(prompt),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Gemini API call timeout')), timeout)
          ),
        ])
      } finally {
        clearTimeout(timeoutId)
      }

      if (!response.response.text()) {
        throw new Error('Empty response from Gemini API')
      }

      // Extract token counts from response metadata
      const inputTokenCount = response.response.usageMetadata?.promptTokenCount || estimatedInputTokens
      const outputTokenCount = response.response.usageMetadata?.candidatesTokenCount || 0

      const cost = calculateCost(inputTokenCount, outputTokenCount)

      // Track usage
      totalTokensUsed += inputTokenCount + outputTokenCount
      totalCostUSD += cost

      const geminiResponse: GeminiResponse = {
        text: response.response.text(),
        tokenCount: {
          input: inputTokenCount,
          output: outputTokenCount,
          total: inputTokenCount + outputTokenCount,
        },
        costEstimate: cost,
        model: GEMINI_MODEL,
        timestamp: new Date(),
      }

      console.log(`[Gemini] Success on attempt ${attempt + 1}`, {
        tokens: geminiResponse.tokenCount,
        cost: `$${cost.toFixed(6)}`,
        totalCost: `$${totalCostUSD.toFixed(2)}`,
      })

      return geminiResponse
    } catch (error) {
      lastError = error as Error
      const isLastAttempt = attempt === maxRetries

      console.error(`[Gemini] Attempt ${attempt + 1} failed:`, {
        error: lastError.message,
        retrying: !isLastAttempt,
        nextRetryIn: !isLastAttempt ? `${Math.round(getBackoffDelay(attempt))}ms` : undefined,
      })

      if (isLastAttempt) {
        break
      }

      // Wait before retrying (exponential backoff with jitter)
      const delay = getBackoffDelay(attempt)
      await new Promise((resolve) => setTimeout(resolve, delay))
    }
  }

  // All retries exhausted
  throw new Error(
    `Gemini API failed after ${maxRetries + 1} attempts. Last error: ${lastError?.message}`
  )
}

/**
 * Call Gemini and parse response as JSON
 */
export async function callGeminiJson<T>(
  prompt: string,
  schema: (data: unknown) => { success: boolean; data?: T; error?: string },
  options: GeminiOptions = {}
): Promise<GeminiJsonResponse<T>> {
  const response = await callGemini(prompt, options)

  try {
    // Extract JSON from response (handle markdown code blocks)
    let jsonText = response.text
    const jsonMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (jsonMatch) {
      jsonText = jsonMatch[1]
    }

    const parsed = JSON.parse(jsonText)
    const validation = schema(parsed)

    if (!validation.success) {
      throw new Error(`Validation failed: ${validation.error}`)
    }

    return {
      ...response,
      data: validation.data as T,
    }
  } catch (error) {
    throw new Error(
      `Failed to parse Gemini JSON response: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
  }
}

/**
 * Get current usage statistics
 */
export function getUsageStats() {
  return {
    totalTokensUsed,
    totalCostUSD: totalCostUSD.toFixed(2),
    remainingBudget: (GEMINI_COST_LIMIT_USD - totalCostUSD).toFixed(2),
    costPercentageUsed: ((totalCostUSD / GEMINI_COST_LIMIT_USD) * 100).toFixed(1),
    model: GEMINI_MODEL,
    apiKey: GEMINI_API_KEY ? 'configured' : 'missing',
  }
}

/**
 * Reset usage tracking (admin only)
 */
export function resetUsageStats() {
  const previous = { totalTokensUsed, totalCostUSD }
  totalTokensUsed = 0
  totalCostUSD = 0
  console.log('[Gemini] Usage stats reset', { previous })
  return previous
}

/**
 * Validate API key is working
 */
export async function validateApiKey(): Promise<{ valid: boolean; error?: string }> {
  try {
    const response = await callGemini('Say "OK" in one word only.', { maxRetries: 1 })
    return {
      valid: response.text.toLowerCase().includes('ok'),
    }
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}
