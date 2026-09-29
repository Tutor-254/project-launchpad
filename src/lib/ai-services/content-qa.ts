/**
 * AI-Powered Content Quality Audit Service
 * Evaluates course content for quality, clarity, and accessibility
 */

import { callGeminiJson } from './gemini-client'
import type { ContentQaResult, ContentQaIssue } from '~/types/ai-services'

export interface ContentQaRequest {
  courseId: string
  courseTitle: string
  courseContent: string[]
  objectives?: string[]
  assessmentItems?: string[]
}

/**
 * Audit course content quality
 */
export async function auditContentQuality(request: ContentQaRequest): Promise<ContentQaResult> {
  const prompt = `Audit the quality of this course content on multiple dimensions:

Course: ${request.courseTitle}

Content:
${request.courseContent.slice(0, 5).join('\n\n')}
${request.courseContent.length > 5 ? `\n... and ${request.courseContent.length - 5} more sections` : ''}

${request.objectives ? `\nLearning Objectives:\n${request.objectives.join('\n')}` : ''}
${request.assessmentItems ? `\nAssessment Items:\n${request.assessmentItems.slice(0, 3).join('\n')}` : ''}

Evaluate on these dimensions (0-100 scale):
1. Readability (clarity, grammar, organization)
2. Completeness (do objectives match content? all topics covered?)
3. Consistency (terminology, tone, formatting)
4. Alignment (assessments match content and objectives?)
5. Accessibility (can diverse learners understand? inclusive language?)

Identify issues by category:
- readability: Grammar, clarity, organization issues
- completeness: Missing content or unmet objectives
- consistency: Terminology or formatting inconsistencies
- alignment: Misalignment between objectives, content, assessments
- accessibility: Barriers for diverse learners
- bias: Potentially exclusionary language
- accuracy: Factual errors or outdated information

Return as JSON:
{
  "scores": {
    "readability": 85,
    "completeness": 78,
    "consistency": 90,
    "alignment": 82,
    "accessibility": 75,
    "overall": 82
  },
  "issues": [
    {
      "category": "readability",
      "severity": "major",
      "description": "Paragraph 2 uses complex jargon without explanation",
      "location": "Section 1.2",
      "suggestion": "Define technical terms or link to glossary"
    }
  ],
  "strengths": ["Clear objectives", "Well-organized sections"],
  "actionItems": ["Add glossary for technical terms", "Simplify introduction paragraph"]
}

Prioritize critical issues. Be constructive in suggestions.`

  const validation = (data: unknown): { success: boolean; data?: ContentQaResult; error?: string } => {
    if (!data || typeof data !== 'object') {
      return { success: false, error: 'Invalid format' }
    }

    const obj = data as Record<string, unknown>
    const scores = (obj.scores as Record<string, number>) || {}

    const result: ContentQaResult = {
      courseId: request.courseId,
      readabilityScore: Math.min(100, Math.max(0, scores.readability || 75)),
      completenessScore: Math.min(100, Math.max(0, scores.completeness || 75)),
      consistencyScore: Math.min(100, Math.max(0, scores.consistency || 75)),
      alignmentScore: Math.min(100, Math.max(0, scores.alignment || 75)),
      accessibilityScore: Math.min(100, Math.max(0, scores.accessibility || 75)),
      overallScore: Math.min(100, Math.max(0, scores.overall || 75)),
      issues: (
        (Array.isArray(obj.issues) ? obj.issues : []) as Array<Record<string, unknown>>
      ).map((issue) => ({
        category: (issue.category as string) as ContentQaIssue['category'],
        severity: (issue.severity as string) as ContentQaIssue['severity'],
        description: (issue.description as string) || '',
        location: (issue.location as string) || undefined,
        suggestion: (issue.suggestion as string) || '',
      })),
      strengths: Array.isArray(obj.strengths) ? (obj.strengths as string[]) : [],
      actionItems: Array.isArray(obj.actionItems) ? (obj.actionItems as string[]) : [],
      auditedAt: new Date(),
    }

    return { success: true, data: result }
  }

  const response = await callGeminiJson<ContentQaResult>(prompt, validation)
  return response.data
}

/**
 * Check for specific content issues
 */
export async function checkContentIssue(
  issueType: 'bias' | 'accessibility' | 'accuracy' | 'clarity',
  content: string
): Promise<{
  hasIssues: boolean
  severity: 'critical' | 'major' | 'minor'
  description: string
  suggestions: string[]
}> {
  const prompts: Record<string, string> = {
    bias: `Check this content for potentially biased or exclusionary language:

${content}

Look for:
- Gender bias
- Cultural bias
- Age/ability bias
- Stereotypes
- Exclusionary language

Return JSON with hasIssues (bool), severity, description, and suggestions array.`,

    accessibility: `Check this content for accessibility barriers:

${content}

Look for:
- Complex jargon without explanation
- Long, convoluted sentences
- Lack of structure/headings
- Wall of text without breaks
- Missing context for specialized terms

Return JSON with readability assessment.`,

    accuracy: `Check this content for potential factual errors:

${content}

Look for:
- Outdated information
- Factually incorrect statements
- Unsupported claims
- Misleading presentation

Return JSON assessment.`,

    clarity: `Assess the clarity of this content:

${content}

Evaluate organization, flow, and directness. Return JSON with clarity scores.`,
  }

  const prompt = prompts[issueType] || prompts.clarity

  const validation = (
    data: unknown
  ): {
    success: boolean
    data?: {
      hasIssues: boolean
      severity: 'critical' | 'major' | 'minor'
      description: string
      suggestions: string[]
    }
    error?: string
  } => {
    if (!data || typeof data !== 'object') {
      return { success: false, error: 'Invalid format' }
    }

    const obj = data as Record<string, unknown>
    const result = {
      hasIssues: (obj.hasIssues as boolean) || false,
      severity: ((obj.severity as string) || 'minor') as 'critical' | 'major' | 'minor',
      description: (obj.description as string) || '',
      suggestions: Array.isArray(obj.suggestions) ? (obj.suggestions as string[]) : [],
    }

    return { success: true, data: result }
  }

  const response = await callGeminiJson(prompt, validation)
  return response.data
}
