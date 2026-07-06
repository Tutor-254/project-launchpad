// Screening server functions — server-only, all use createServerFn + requireSupabaseAuth
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getAIProvider } from "@/lib/ai-service";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ScreeningAttemptState = "in_progress" | "passed" | "failed";
export type ScreeningQuestionType = "MCQ" | "SHORT_ANSWER";

export interface ScreeningMCQOption {
  id: string;
  text: string;
  is_correct: boolean;
}

/** A single screening question returned to the applicant (no correct answer exposed) */
export interface ScreeningQuestion {
  /** The screening_responses row id */
  id: string;
  question_stem: string;
  question_type: ScreeningQuestionType;
  /** Options for MCQ questions; null for SHORT_ANSWER */
  options: Array<{ id: string; text: string }> | null;
}

/** Full question data including rubric/model_answer — for internal use and result view */
export interface ScreeningQuestionFull {
  id: string;
  question_stem: string;
  question_type: ScreeningQuestionType;
  options: ScreeningMCQOption[] | null;
  rubric: string;
  model_answer: string | null;
}

export interface ScreeningResponseInput {
  questionId: string;
  responseText?: string;
  selectedOption?: string;
}

export interface ScreeningFeedbackItem {
  questionId: string;
  aiScore: number;
  aiFeedback: string;
}

export interface ScreeningResultQuestion {
  questionId: string;
  question_stem: string;
  question_type: ScreeningQuestionType;
  response_text: string | null;
  ai_score: number | null;
  ai_feedback: string | null;
  model_answer: string | null;
  rubric: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Fisher-Yates shuffle — returns a new array */
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ---------------------------------------------------------------------------
// AI interfaces for screening
// ---------------------------------------------------------------------------

interface GeneratedScreeningQuestion {
  question_stem: string;
  question_type: "MCQ" | "SHORT_ANSWER";
  options?: ScreeningMCQOption[];
  model_answer?: string;
  rubric: string;
}

/**
 * Ask the AI to generate N screening questions based on the applicant's expertise.
 */
async function generateScreeningQuestions(
  expertise: string,
  count: number,
): Promise<GeneratedScreeningQuestion[]> {
  const aiProvider = getAIProvider();

  const systemPrompt = `You are an expert technical interviewer. Generate screening questions to evaluate a prospective online instructor's knowledge.
Return a JSON object with a "questions" array. Each question must follow this schema:
- question_stem: the question text (string)
- question_type: "MCQ" or "SHORT_ANSWER"
- options: for MCQ only — array of {id, text, is_correct} with exactly one correct option and 3-4 total options. Use ids "a", "b", "c", "d".
- model_answer: for SHORT_ANSWER only — a concise reference answer
- rubric: grading criteria (string, required for all types)

Generate a balanced mix: roughly 40% MCQ and 60% SHORT_ANSWER (or as close as possible given the count).
Cover the following topic areas in the question set:
1. Conceptual understanding of the topic
2. Practical application
3. Common pitfalls and edge cases
4. Teaching ability (how would you explain X to a beginner)

Total questions: ${count}.`;

  const userPrompt = `Applicant's stated area of expertise: ${expertise}

Generate ${count} screening questions that assess whether this applicant has sufficient knowledge in their stated expertise to teach it effectively.`;

  // We reuse the AI provider's underlying OpenAI client via a custom call pattern.
  // Since AIProvider doesn't have a generateScreeningQuestions method, we call
  // generateQuestions with a content chunk that encodes the expertise.
  const rawQuestions = await aiProvider.generateQuestions({
    contentChunks: [
      {
        sectionTitle: `Instructor Screening: ${expertise}`,
        lectureContent: userPrompt,
      },
    ],
    assessmentType: "CAT_1", // Not used for screening but required by type
  });

  // Map the GeneratedQuestion shape to our ScreeningQuestion shape
  const screeningQuestions: GeneratedScreeningQuestion[] = rawQuestions
    .slice(0, count)
    .filter((q) => q.type === "MCQ" || q.type === "SHORT_ANSWER")
    .map((q) => ({
      question_stem: q.stem,
      question_type: q.type as "MCQ" | "SHORT_ANSWER",
      options: q.options?.map((o) => ({ id: o.id, text: o.text, is_correct: o.is_correct })),
      model_answer: q.modelAnswer,
      rubric: q.rubric,
    }));

  // If we didn't get enough (e.g. AI returned ESSAY questions), pad with SHORT_ANSWER placeholders
  // In practice the AI should always return the right count, but we truncate/use what we got.
  return screeningQuestions.slice(0, count);
}

// ---------------------------------------------------------------------------
// 2.2 startScreening
// ---------------------------------------------------------------------------

export const startScreening = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { applicationId: string }) => {
    if (!data?.applicationId) throw new Error("applicationId required");
    return data;
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { applicationId } = data;

    // Verify the authenticated user owns this application
    const { data: application, error: appErr } = await supabase
      .from("instructor_applications")
      .select("id, user_id, status, expertise")
      .eq("id", applicationId)
      .maybeSingle();

    if (appErr) throw new Error(appErr.message);
    if (!application) throw new Error("Application not found");
    if (application.user_id !== userId)
      throw new Error("Forbidden: you do not own this application");
    if (application.status !== "pending_screening")
      throw new Error(
        `Application is not in pending_screening state (current: ${application.status})`,
      );

    // Check for an existing attempt (idempotent — return existing questions)
    const { data: existingAttempt } = await supabase
      .from("screening_attempts")
      .select("id, state")
      .eq("application_id", applicationId)
      .maybeSingle();

    if (existingAttempt) {
      // Return the already-generated questions for this attempt
      const { data: existingResponses, error: respErr } = await supabase
        .from("screening_responses")
        .select("id, question_stem, question_type, options")
        .eq("attempt_id", existingAttempt.id)
        .order("question_index");

      if (respErr) throw new Error(respErr.message);

      const questions: ScreeningQuestion[] = (existingResponses ?? []).map((r: any) => ({
        id: r.id,
        question_stem: r.question_stem,
        question_type: r.question_type as ScreeningQuestionType,
        options:
          r.question_type === "MCQ" && Array.isArray(r.options)
            ? (r.options as ScreeningMCQOption[]).map((o) => ({ id: o.id, text: o.text }))
            : null,
      }));

      return {
        attemptId: existingAttempt.id,
        questions: shuffle(questions),
        isExisting: true,
      };
    }

    // Read screening_question_count from platform_config (default 5)
    const { data: configRow } = await supabase
      .from("platform_config")
      .select("value")
      .eq("key", "screening_question_count")
      .maybeSingle();

    const questionCount = configRow ? parseInt(configRow.value, 10) : 5;

    // Generate questions via AI
    let generated: GeneratedScreeningQuestion[];
    try {
      generated = await generateScreeningQuestions(application.expertise, questionCount);
    } catch (err) {
      throw new Error(
        `AI question generation failed: ${(err as Error).message}`,
      );
    }

    if (!generated.length) {
      throw new Error("AI returned no questions for the given expertise");
    }

    // Create the screening_attempts row
    const { data: attempt, error: attErr } = await supabase
      .from("screening_attempts")
      .insert({
        application_id: applicationId,
        applicant_id: userId,
        state: "in_progress",
      })
      .select()
      .single();

    if (attErr) throw new Error(attErr.message);

    // Insert one screening_responses row per question (no response yet)
    const responseRows = generated.map((q, index) => ({
      attempt_id: attempt.id,
      question_index: index,
      question_stem: q.question_stem,
      question_type: q.question_type,
      options: q.options ? (q.options as any) : null,
      rubric: q.rubric,
      model_answer: q.model_answer ?? null,
      // response_text and selected_option are null (not answered yet)
    }));

    const { data: insertedResponses, error: insErr } = await supabase
      .from("screening_responses")
      .insert(responseRows)
      .select("id, question_stem, question_type, options");

    if (insErr) throw new Error(insErr.message);

    // Return shuffled questions (strip is_correct from options)
    const questions: ScreeningQuestion[] = (insertedResponses ?? []).map((r: any) => ({
      id: r.id,
      question_stem: r.question_stem,
      question_type: r.question_type as ScreeningQuestionType,
      options:
        r.question_type === "MCQ" && Array.isArray(r.options)
          ? (r.options as ScreeningMCQOption[]).map((o) => ({ id: o.id, text: o.text }))
          : null,
    }));

    return {
      attemptId: attempt.id,
      questions: shuffle(questions),
      isExisting: false,
    };
  });

// ---------------------------------------------------------------------------
// 2.3 submitScreening
// ---------------------------------------------------------------------------

export const submitScreening = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (data: {
      attemptId: string;
      responses: Array<{
        questionId: string;
        responseText?: string;
        selectedOption?: string;
      }>;
    }) => {
      if (!data?.attemptId) throw new Error("attemptId required");
      if (!data?.responses?.length) throw new Error("responses required");
      return data;
    },
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { attemptId, responses } = data;

    // Verify the current user owns the attempt
    const { data: attempt, error: attErr } = await supabase
      .from("screening_attempts")
      .select("id, applicant_id, application_id, state")
      .eq("id", attemptId)
      .maybeSingle();

    if (attErr) throw new Error(attErr.message);
    if (!attempt) throw new Error("Screening attempt not found");
    if (attempt.applicant_id !== userId)
      throw new Error("Forbidden: you do not own this attempt");
    if (attempt.state !== "in_progress")
      throw new Error(`Attempt is not in progress (current state: ${attempt.state})`);

    // Load all response rows for this attempt (contains question data)
    const { data: responseRows, error: rowErr } = await supabase
      .from("screening_responses")
      .select("id, question_type, options, rubric, model_answer")
      .eq("attempt_id", attemptId);

    if (rowErr) throw new Error(rowErr.message);

    const aiProvider = getAIProvider();
    const feedback: ScreeningFeedbackItem[] = [];
    const scores: number[] = [];

    // Build a map for quick lookup
    const responseRowMap = new Map<string, any>(
      (responseRows ?? []).map((r: any) => [r.id, r]),
    );

    // Grade each response
    const updates: Array<{
      id: string;
      response_text: string | null;
      selected_option: string | null;
      ai_score: number;
      ai_feedback: string;
    }> = [];

    for (const resp of responses) {
      const row = responseRowMap.get(resp.questionId);
      if (!row) continue;

      let aiScore = 0;
      let aiFeedback = "";

      if (row.question_type === "MCQ") {
        // Grade MCQ by checking selected_option against is_correct
        const opts: ScreeningMCQOption[] = Array.isArray(row.options) ? row.options : [];
        const correctOpt = opts.find((o) => o.is_correct);
        const isCorrect = correctOpt?.id === resp.selectedOption;
        aiScore = isCorrect ? 100 : 0;
        aiFeedback = isCorrect
          ? "Correct answer."
          : `Incorrect. The correct answer was: ${correctOpt?.text ?? "N/A"}.`;
      } else {
        // SHORT_ANSWER — grade via AI
        try {
          const result = await aiProvider.gradeShortAnswer({
            response: resp.responseText ?? "",
            modelAnswer: row.model_answer ?? "",
            rubric: row.rubric ?? "",
          });
          aiScore = result.score;
          aiFeedback = result.feedback;
        } catch (err) {
          // If grading fails, assign 0 and note the failure
          aiScore = 0;
          aiFeedback = "Grading failed — response could not be evaluated.";
        }
      }

      scores.push(aiScore);
      feedback.push({ questionId: resp.questionId, aiScore, aiFeedback });
      updates.push({
        id: resp.questionId,
        response_text: resp.responseText ?? null,
        selected_option: resp.selectedOption ?? null,
        ai_score: aiScore,
        ai_feedback: aiFeedback,
      });
    }

    // Persist graded responses
    for (const upd of updates) {
      const { error: updErr } = await supabase
        .from("screening_responses")
        .update({
          response_text: upd.response_text,
          selected_option: upd.selected_option,
          ai_score: upd.ai_score,
          ai_feedback: upd.ai_feedback,
        })
        .eq("id", upd.id);
      if (updErr) throw new Error(`Failed to save response ${upd.id}: ${updErr.message}`);
    }

    // Compute average score (0-100)
    const averageScore =
      scores.length > 0
        ? Math.round(scores.reduce((sum, s) => sum + s, 0) / scores.length)
        : 0;

    // Read screening_pass_threshold from platform_config (default 70)
    const { data: thresholdRow } = await supabase
      .from("platform_config")
      .select("value")
      .eq("key", "screening_pass_threshold")
      .maybeSingle();

    const passThreshold = thresholdRow ? parseInt(thresholdRow.value, 10) : 70;
    const passed = averageScore >= passThreshold;
    const now = new Date().toISOString();

    if (passed) {
      // Update application to 'pending' (admin waitlist)
      const { error: appErr } = await supabase
        .from("instructor_applications")
        .update({ status: "pending" })
        .eq("id", attempt.application_id);
      if (appErr) throw new Error(`Failed to update application status: ${appErr.message}`);

      // Insert admin notification
      // Find an admin to notify — use a generic admin notification targeting all admins
      // by looking up user_roles for admin role
      const { data: adminRows } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "admin");

      for (const adminRow of adminRows ?? []) {
        await supabase.from("notifications").insert({
          user_id: adminRow.user_id,
          type: "instructor_application_pending",
          payload: {
            application_id: attempt.application_id,
            applicant_id: userId,
            score: averageScore,
          },
        });
      }

      // Mark attempt state as 'passed'
      const { error: stateErr } = await supabase
        .from("screening_attempts")
        .update({ state: "passed", score: averageScore, submitted_at: now })
        .eq("id", attemptId);
      if (stateErr) throw new Error(`Failed to update attempt state: ${stateErr.message}`);
    } else {
      // Generate a rejection reason via AI
      let rejectionReason =
        `Your screening test score was ${averageScore}%, which is below the minimum required score of ${passThreshold}%. ` +
        `Please review the subject matter and consider reapplying after improving your expertise.`;

      try {
        const aiProvider2 = getAIProvider();
        const result = await aiProvider2.gradeShortAnswer({
          response: `The applicant scored ${averageScore}% on a screening test for "${await getApplicationExpertise(supabase, attempt.application_id)}". They need to score at least ${passThreshold}% to pass.`,
          modelAnswer: "Provide a constructive, specific rejection reason explaining the score and what to improve.",
          rubric:
            "The rejection reason should be 1-2 sentences, professional, specific to the score and topic, and constructive.",
        });
        if (result.feedback && result.feedback.length > 10) {
          rejectionReason = result.feedback;
        }
      } catch {
        // Use default rejection reason if AI fails
      }

      // Update application to 'rejected' with reason
      const { error: appErr } = await supabase
        .from("instructor_applications")
        .update({ status: "rejected", rejection_reason: rejectionReason })
        .eq("id", attempt.application_id);
      if (appErr) throw new Error(`Failed to update application status: ${appErr.message}`);

      // Insert applicant notification
      await supabase.from("notifications").insert({
        user_id: userId,
        type: "screening_failed",
        payload: {
          application_id: attempt.application_id,
          score: averageScore,
          rejection_reason: rejectionReason,
        },
      });

      // Mark attempt state as 'failed'
      const { error: stateErr } = await supabase
        .from("screening_attempts")
        .update({ state: "failed", score: averageScore, submitted_at: now })
        .eq("id", attemptId);
      if (stateErr) throw new Error(`Failed to update attempt state: ${stateErr.message}`);
    }

    return {
      passed,
      score: averageScore,
      feedback,
    };
  });

/** Helper: fetch the expertise for an application */
async function getApplicationExpertise(supabase: any, applicationId: string): Promise<string> {
  const { data } = await supabase
    .from("instructor_applications")
    .select("expertise")
    .eq("id", applicationId)
    .maybeSingle();
  return (data as any)?.expertise ?? "the stated topic";
}

// ---------------------------------------------------------------------------
// 2.4 getScreeningResult
// ---------------------------------------------------------------------------

export const getScreeningResult = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { attemptId: string }) => {
    if (!data?.attemptId) throw new Error("attemptId required");
    return data;
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { attemptId } = data;

    // Load the attempt
    const { data: attempt, error: attErr } = await supabase
      .from("screening_attempts")
      .select("id, applicant_id, application_id, state, score, started_at, submitted_at")
      .eq("id", attemptId)
      .maybeSingle();

    if (attErr) throw new Error(attErr.message);
    if (!attempt) throw new Error("Screening attempt not found");

    // Verify the current user owns the attempt OR is an admin
    if (attempt.applicant_id !== userId) {
      const { data: adminRole } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .eq("role", "admin")
        .maybeSingle();

      if (!adminRole) throw new Error("Forbidden: you do not have access to this attempt");
    }

    // Load per-question feedback
    const { data: responses, error: respErr } = await supabase
      .from("screening_responses")
      .select(
        "id, question_stem, question_type, response_text, ai_score, ai_feedback, model_answer, rubric",
      )
      .eq("attempt_id", attemptId)
      .order("question_index");

    if (respErr) throw new Error(respErr.message);

    const questions: ScreeningResultQuestion[] = (responses ?? []).map((r: any) => ({
      questionId: r.id,
      question_stem: r.question_stem,
      question_type: r.question_type as ScreeningQuestionType,
      response_text: r.response_text,
      ai_score: r.ai_score,
      ai_feedback: r.ai_feedback,
      model_answer: r.model_answer,
      rubric: r.rubric,
    }));

    return {
      state: attempt.state as ScreeningAttemptState,
      score: attempt.score as number | null,
      started_at: attempt.started_at as string,
      submitted_at: attempt.submitted_at as string | null,
      questions,
    };
  });

// ---------------------------------------------------------------------------
// 2.5 getScreeningPassThreshold
// ---------------------------------------------------------------------------

export const getScreeningPassThreshold = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;

    const { data } = await supabase
      .from("platform_config")
      .select("value")
      .eq("key", "screening_pass_threshold")
      .maybeSingle();

    return { threshold: data ? parseInt(data.value, 10) : 70 };
  });

// ---------------------------------------------------------------------------
// 2.6 updateScreeningPassThreshold
// ---------------------------------------------------------------------------

export const updateScreeningPassThreshold = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { threshold: number }) => {
    if (data?.threshold === undefined || data?.threshold === null)
      throw new Error("threshold required");
    if (typeof data.threshold !== "number") throw new Error("threshold must be a number");
    const v = Math.round(data.threshold);
    if (v < 0 || v > 100) throw new Error("Threshold must be between 0 and 100 (inclusive)");
    return { threshold: v };
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Admin-only guard
    const { data: roleRow } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleRow) throw new Error("Forbidden: admin only");

    const { error } = await supabase
      .from("platform_config")
      .upsert({ key: "screening_pass_threshold", value: String(data.threshold) });

    if (error) throw new Error(error.message);

    return { threshold: data.threshold };
  });
