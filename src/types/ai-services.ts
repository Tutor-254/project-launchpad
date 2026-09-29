/**
 * TypeScript types and interfaces for AI services
 */

// ============================================================
// Assessment Generation Types
// ============================================================

export interface Question {
  id: string
  type: 'multiple-choice' | 'short-answer' | 'essay' | 'true-false' | 'matching'
  question: string
  options?: string[]
  correctAnswer: string | string[]
  explanation: string
  difficulty: 'easy' | 'medium' | 'hard'
  bloomsLevel: 'remember' | 'understand' | 'apply' | 'analyze' | 'evaluate' | 'create'
  competencies: string[]
  distractorAnalysis?: string
  estimatedTimeSeconds?: number
}

export interface AssessmentGenerationRequest {
  assessmentType: 'diagnostic' | 'cat1' | 'cat2'
  competencyIds: string[]
  courseId: string
  courseTitle: string
  courseDifficulty: 'beginner' | 'intermediate' | 'advanced'
  additionalContext?: string
  targetQuestionCount?: number
}

export interface AssessmentGenerationResult {
  assessmentId: string
  courseId: string
  type: 'diagnostic' | 'cat1' | 'cat2'
  questions: Question[]
  metadata: {
    totalQuestions: number
    estimatedDurationMinutes: number
    averageDifficulty: string
    bloomsDistribution: Record<string, number>
    competencyDistribution: Record<string, number>
  }
  qualityScore: number
  qualityIssues: string[]
  generatedAt: Date
}

// ============================================================
// Feedback Generation Types
// ============================================================

export interface CompetencyGap {
  competencyId: string
  competencyName: string
  gapLevel: 'critical' | 'moderate' | 'minor'
  description: string
  suggestedResources: string[]
}

export interface QuestionFeedback {
  questionId: string
  userAnswer: string
  correctAnswer: string
  isCorrect: boolean
  misconception?: string
  explanation: string
  confidenceScore: number // 0-100
}

export interface PersonalizedFeedback {
  attemptId: string
  learnerId: string
  assessmentId: string
  overallScore: number
  competencyGaps: CompetencyGap[]
  questionFeedback: QuestionFeedback[]
  studyGuide: string // Markdown format
  nextSteps: string[]
  estimatedRemediationHours: number
  generatedAt: Date
}

// ============================================================
// Facilitator Screening Types
// ============================================================

export interface FacilitatorScreeningRequest {
  applicationId: string
  educationalBackground?: string
  teachingExperience?: string
  subjectExpertise?: string
  materialsSamples?: string[]
  additionalInfo?: string
}

export interface ExpertiseAssessment {
  area: string
  score: number // 0-100
  level: 'novice' | 'intermediate' | 'expert'
  evidence: string
}

export interface FacilitatorScreeningResult {
  applicationId: string
  overallQualificationScore: number // 0-100
  recommendation: 'recommend' | 'consider' | 'reject'
  confidenceScore: number // 0-100
  expertiseAssessments: ExpertiseAssessment[]
  strengths: string[]
  concerns: string[]
  suggestedQuestionsForMoreInfo: string[]
  reasoning: string
  screenedAt: Date
}

// ============================================================
// Content QA Types
// ============================================================

export interface ContentQaIssue {
  category:
    | 'readability'
    | 'completeness'
    | 'consistency'
    | 'alignment'
    | 'accessibility'
    | 'bias'
    | 'accuracy'
  severity: 'critical' | 'major' | 'minor'
  description: string
  location?: string
  suggestion: string
}

export interface ContentQaResult {
  courseId: string
  readabilityScore: number // 0-100
  completenessScore: number
  consistencyScore: number
  alignmentScore: number
  accessibilityScore: number
  overallScore: number
  issues: ContentQaIssue[]
  strengths: string[]
  actionItems: string[]
  auditedAt: Date
}

// ============================================================
// Course Intelligence Types
// ============================================================

export interface ExtractedCompetency {
  name: string
  description: string
  observableBehaviors: string[]
  successCriteria: string[]
  estimatedDifficultyLevel: 'beginner' | 'intermediate' | 'advanced'
  relatedJobRoles: string[]
  prerequisites: string[]
  estimatedLearningHours: number
  confidenceScore: number // 0-100
}

export interface LearningObjective {
  text: string
  bloomsLevel: 'remember' | 'understand' | 'apply' | 'analyze' | 'evaluate' | 'create'
  competencyId: string
}

export interface CourseIntelligence {
  courseId: string
  extractedCompetencies: ExtractedCompetency[]
  learningObjectives: LearningObjective[]
  estimatedDifficultyLevel: 'beginner' | 'intermediate' | 'advanced'
  estimatedTotalHours: number
  keyTopics: string[]
  prerequisites: string[]
  relatedJobRoles: string[]
  successMetrics: string[]
  extractedAt: Date
}

// ============================================================
// Tutoring & Hints Types
// ============================================================

export interface HintLevel {
  level: 1 | 2 | 3
  content: string
  type: 'nudge' | 'strategy' | 'partial'
}

export interface ProgressiveHints {
  questionId: string
  hints: HintLevel[]
  workedExample?: string
  prerequisiteCheckSuggestion?: string
}

export interface TutoringResponse {
  conceptExplanation: string
  examples: string[]
  commonMisconceptions: string[]
  relatedConcepts: string[]
}

// ============================================================
// AI Job Types
// ============================================================

export type AIJobType =
  | 'assessment_generation'
  | 'feedback_generation'
  | 'facilitator_screening'
  | 'course_intelligence'
  | 'content_qa'
  | 'hints_generation'

export type AIJobStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled'

export interface AIJob {
  id: string
  type: AIJobType
  status: AIJobStatus
  input: Record<string, unknown>
  result?: Record<string, unknown>
  error?: string
  createdAt: Date
  startedAt?: Date
  completedAt?: Date
  costUSD?: number
  attemptsRemaining: number
}

// ============================================================
// Cost Tracking Types
// ============================================================

export interface CostRecord {
  timestamp: Date
  operation: string
  tokensUsed: number
  costUSD: number
  model: string
}

export interface CostSummary {
  period: 'day' | 'week' | 'month'
  totalCostUSD: number
  totalTokensUsed: number
  operationBreakdown: Record<string, { cost: number; tokens: number; count: number }>
  averageCostPerOperation: number
}

// ============================================================
// Validation & Response Types
// ============================================================

export interface ValidationResult<T> {
  success: boolean
  data?: T
  error?: string
  issues?: string[]
}

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  timestamp: Date
  operationId: string
}
