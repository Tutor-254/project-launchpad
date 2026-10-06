// AI provider abstraction layer. Server-only.
// Imported only from server functions — OPENAI_API_KEY never reaches the client bundle.

export interface QuestionGenerationInput {
  contentChunks: Array<{ sectionTitle: string; lectureContent: string }>;
  assessmentType: 'CAT_1' | 'CAT_2' | 'FINAL_EXAM';
}

export interface GeneratedQuestion {
  type: 'MCQ' | 'SHORT_ANSWER' | 'ESSAY';
  stem: string;
  options?: Array<{ id: string; text: string; is_correct: boolean }>;
  modelAnswer?: string;
  rubric: string;
  sourceRef: string;
}

export interface ShortAnswerGradingInput {
  response: string;
  modelAnswer: string;
  rubric: string;
}

export interface ShortAnswerGradingResult {
  score: number; // 0-100 integer
  feedback: string;
}

export interface EssayGradingInput {
  response: string;
  rubric: string;
}

export interface EssayGradingResult {
  score: number; // 0-100 integer
  feedback: string;
  needs_review: boolean;
}

export interface AIProvider {
  generateQuestions(input: QuestionGenerationInput): Promise<GeneratedQuestion[]>;
  gradeShortAnswer(input: ShortAnswerGradingInput): Promise<ShortAnswerGradingResult>;
  gradeEssay(input: EssayGradingInput): Promise<EssayGradingResult>;
}

export class AIServiceError extends Error {
  constructor(
    public provider: string,
    public operation: string,
    public originalMessage: string,
  ) {
    super(`[${provider}:${operation}] ${originalMessage}`);
    this.name = 'AIServiceError';
  }
}

// Factory — returns the configured provider; server-side only.
// Note: This is legacy code. New code should use the Gemini services directly.
export function getAIProvider(): AIProvider {
  throw new AIServiceError(
    'legacy',
    'getAIProvider',
    'This AI provider factory is deprecated. Use the Gemini AI services directly from @/lib/ai-services/*',
  );
}
