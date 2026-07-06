// Server-only — never import from client-side code.
// Requires the `openai` npm package: npm install openai

import OpenAI from 'openai';
import { z } from 'zod';
import {
  AIProvider,
  AIServiceError,
  EssayGradingInput,
  EssayGradingResult,
  GeneratedQuestion,
  QuestionGenerationInput,
  ShortAnswerGradingInput,
  ShortAnswerGradingResult,
} from '../ai-service';

// ---------------------------------------------------------------------------
// Zod schemas for parsing AI responses
// ---------------------------------------------------------------------------

const MCQOptionSchema = z.object({
  id: z.string(),
  text: z.string(),
  is_correct: z.boolean(),
});

const GeneratedQuestionSchema = z.object({
  type: z.enum(['MCQ', 'SHORT_ANSWER', 'ESSAY']),
  stem: z.string(),
  options: z.array(MCQOptionSchema).optional(),
  modelAnswer: z.string().optional(),
  rubric: z.string(),
  sourceRef: z.string(),
});

const GeneratedQuestionsResponseSchema = z.object({
  questions: z.array(GeneratedQuestionSchema),
});

const ShortAnswerResponseSchema = z.object({
  score: z.number(),
  feedback: z.string(),
});

const EssayResponseSchema = z.object({
  score: z.number(),
  feedback: z.string(),
  needs_review: z.boolean().optional(),
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function clampScore(score: number): number {
  return Math.round(Math.min(100, Math.max(0, score)));
}

/**
 * Returns true for HTTP status codes in the 4xx range (non-retryable).
 * 5xx and network errors are transient and should bubble up to the caller.
 */
function isNonRetryable(err: unknown): boolean {
  if (err instanceof OpenAI.APIError) {
    return err.status !== undefined && err.status >= 400 && err.status < 500;
  }
  // Invalid JSON / parse errors are also non-retryable
  if (err instanceof SyntaxError) return true;
  return false;
}

// ---------------------------------------------------------------------------
// OpenAIProvider
// ---------------------------------------------------------------------------

export class OpenAIProvider implements AIProvider {
  private client: OpenAI;
  private model: string;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new AIServiceError(
        'openai',
        'constructor',
        'OPENAI_API_KEY environment variable is not set.',
      );
    }
    this.client = new OpenAI({ apiKey });
    this.model = process.env.OPENAI_MODEL ?? 'gpt-4o-mini';
  }

  // -------------------------------------------------------------------------
  // generateQuestions
  // -------------------------------------------------------------------------

  async generateQuestions(input: QuestionGenerationInput): Promise<GeneratedQuestion[]> {
    const { contentChunks, assessmentType } = input;

    const contentSummary = contentChunks
      .map((c) => `Section: ${c.sectionTitle}\n${c.lectureContent}`)
      .join('\n\n---\n\n');

    const systemPrompt = `You are an expert instructional designer. Generate assessment questions based on the provided course content.
Return a JSON object with a "questions" array. Each question must follow this schema:
- type: "MCQ" | "SHORT_ANSWER" | "ESSAY"
- stem: the question text
- options: for MCQ only — array of {id, text, is_correct} with exactly one correct option and 3-4 total options
- modelAnswer: for SHORT_ANSWER only — a concise reference answer
- rubric: grading criteria for all types
- sourceRef: the section or lecture title this question relates to

Generate a balanced mix: roughly 40% MCQ, 40% SHORT_ANSWER, 20% ESSAY.
Target question count: ${assessmentType === 'FINAL_EXAM' ? 15 : 10}.`;

    const userPrompt = `Assessment type: ${assessmentType}

Course content:
${contentSummary}

Generate questions that assess understanding, application, and critical thinking across the content.`;

    try {
      const completion = await this.client.chat.completions.create({
        model: this.model,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
      });

      const raw = completion.choices[0]?.message?.content;
      if (!raw) {
        throw new AIServiceError('openai', 'generateQuestions', 'Empty response from OpenAI.');
      }

      let parsed: unknown;
      try {
        parsed = JSON.parse(raw);
      } catch (jsonErr) {
        throw new AIServiceError(
          'openai',
          'generateQuestions',
          `Failed to parse JSON response: ${(jsonErr as Error).message}`,
        );
      }

      const validated = GeneratedQuestionsResponseSchema.safeParse(parsed);
      if (!validated.success) {
        throw new AIServiceError(
          'openai',
          'generateQuestions',
          `Invalid response schema: ${validated.error.message}`,
        );
      }

      return validated.data.questions as GeneratedQuestion[];
    } catch (err) {
      if (err instanceof AIServiceError) throw err;
      if (isNonRetryable(err)) {
        throw new AIServiceError(
          'openai',
          'generateQuestions',
          `Non-retryable error: ${(err as Error).message}`,
        );
      }
      // Transient errors (5xx, network) bubble up as-is
      throw err;
    }
  }

  // -------------------------------------------------------------------------
  // gradeShortAnswer
  // -------------------------------------------------------------------------

  async gradeShortAnswer(input: ShortAnswerGradingInput): Promise<ShortAnswerGradingResult> {
    const { response, modelAnswer, rubric } = input;

    const systemPrompt = `You are a fair and precise academic grader. Grade a student's short-answer response.
Return a JSON object with exactly these fields:
- score: integer from 0 to 100
- feedback: brief, constructive feedback (1-3 sentences)

Base your grade on how closely the response matches the model answer and satisfies the rubric.`;

    const userPrompt = `Model answer: ${modelAnswer}

Rubric: ${rubric}

Student response: ${response}

Grade the response and return JSON with score and feedback.`;

    try {
      const completion = await this.client.chat.completions.create({
        model: this.model,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
      });

      const raw = completion.choices[0]?.message?.content;
      if (!raw) {
        throw new AIServiceError('openai', 'gradeShortAnswer', 'Empty response from OpenAI.');
      }

      let parsed: unknown;
      try {
        parsed = JSON.parse(raw);
      } catch (jsonErr) {
        throw new AIServiceError(
          'openai',
          'gradeShortAnswer',
          `Failed to parse JSON response: ${(jsonErr as Error).message}`,
        );
      }

      const validated = ShortAnswerResponseSchema.safeParse(parsed);
      if (!validated.success) {
        throw new AIServiceError(
          'openai',
          'gradeShortAnswer',
          `Invalid response schema: ${validated.error.message}`,
        );
      }

      return {
        score: clampScore(validated.data.score),
        feedback: validated.data.feedback,
      };
    } catch (err) {
      if (err instanceof AIServiceError) throw err;
      if (isNonRetryable(err)) {
        throw new AIServiceError(
          'openai',
          'gradeShortAnswer',
          `Non-retryable error: ${(err as Error).message}`,
        );
      }
      throw err;
    }
  }

  // -------------------------------------------------------------------------
  // gradeEssay
  // -------------------------------------------------------------------------

  async gradeEssay(input: EssayGradingInput): Promise<EssayGradingResult> {
    const { response, rubric } = input;

    const systemPrompt = `You are an experienced academic essay grader. Evaluate a student's essay response.
Return a JSON object with exactly these fields:
- score: integer from 0 to 100
- feedback: detailed, constructive feedback (2-4 sentences covering strengths and areas to improve)
- needs_review: boolean — set to true if you are uncertain about the score or if the essay raises concerns requiring human oversight

Grade holistically based on the rubric. Reserve needs_review=false only when you are confident in the score.`;

    const userPrompt = `Rubric: ${rubric}

Student essay: ${response}

Grade the essay and return JSON with score, feedback, and needs_review.`;

    try {
      const completion = await this.client.chat.completions.create({
        model: this.model,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
      });

      const raw = completion.choices[0]?.message?.content;
      if (!raw) {
        throw new AIServiceError('openai', 'gradeEssay', 'Empty response from OpenAI.');
      }

      let parsed: unknown;
      try {
        parsed = JSON.parse(raw);
      } catch (jsonErr) {
        throw new AIServiceError(
          'openai',
          'gradeEssay',
          `Failed to parse JSON response: ${(jsonErr as Error).message}`,
        );
      }

      const validated = EssayResponseSchema.safeParse(parsed);
      if (!validated.success) {
        throw new AIServiceError(
          'openai',
          'gradeEssay',
          `Invalid response schema: ${validated.error.message}`,
        );
      }

      const score = clampScore(validated.data.score);
      // needs_review defaults to true for any score below 70, or if the AI explicitly set it
      const needs_review = validated.data.needs_review !== undefined
        ? validated.data.needs_review || score < 70
        : score < 70;

      return {
        score,
        feedback: validated.data.feedback,
        needs_review,
      };
    } catch (err) {
      if (err instanceof AIServiceError) throw err;
      if (isNonRetryable(err)) {
        throw new AIServiceError(
          'openai',
          'gradeEssay',
          `Non-retryable error: ${(err as Error).message}`,
        );
      }
      throw err;
    }
  }
}
