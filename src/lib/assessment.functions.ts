// Assessment server functions — server-only, all use createServerFn + requireSupabaseAuth
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getAIProvider } from "@/lib/ai-service";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AssessmentType = "CAT_1" | "CAT_2" | "FINAL_EXAM";
export type QuestionType = "MCQ" | "SHORT_ANSWER" | "ESSAY";
export type QuestionStatus = "pending_review" | "approved" | "rejected";
export type AttemptState =
  | "in_progress"
  | "submitted"
  | "graded"
  | "pending_review"
  | "released";

export interface MCQOption {
  id: string;
  text: string;
  is_correct: boolean;
}

export interface AssessmentQuestion {
  id: string;
  assessment_id: string;
  type: QuestionType;
  stem: string;
  options: MCQOption[] | null;
  model_answer: string | null;
  rubric: string | null;
  source_ref: string | null;
  status: QuestionStatus;
  ai_generated: boolean;
  created_at: string;
  updated_at: string;
}

export interface AssessmentAttempt {
  id: string;
  assessment_id: string;
  student_id: string;
  state: AttemptState;
  score: number | null;
  preliminary_score: number | null;
  started_at: string;
  submitted_at: string | null;
  released_at: string | null;
  attempt_number: number;
}

export interface AssessmentResponse {
  id: string;
  attempt_id: string;
  question_id: string;
  response_text: string | null;
  selected_option: string | null;
  ai_score: number | null;
  ai_feedback: string | null;
  needs_review: boolean;
  final_score: number | null;
  released: boolean;
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

/** Collision-safe certificate code */
function makeCode(): string {
  const raw = Math.random().toString(36).slice(2, 8) + Math.random().toString(36).slice(2, 8);
  const s = raw.toUpperCase().padEnd(12, "X").slice(0, 12);
  return `${s.slice(0, 4)}-${s.slice(4, 8)}-${s.slice(8, 12)}`;
}

/** Issue certificate if not already issued (idempotent) */
async function maybeCertificate(supabase: any, userId: string, courseId: string) {
  const { data: existing } = await supabase
    .from("certificates")
    .select("id")
    .eq("user_id", userId)
    .eq("course_id", courseId)
    .maybeSingle();
  if (existing) return;

  let code = makeCode();
  for (let i = 0; i < 3; i++) {
    const { data: clash } = await supabase
      .from("certificates")
      .select("id")
      .eq("code", code)
      .maybeSingle();
    if (!clash) break;
    code = makeCode();
  }
  await supabase.from("certificates").insert({ user_id: userId, course_id: courseId, code });
}

/** Cooldown period in milliseconds (7 days) */
const COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;

/** Unlock thresholds per assessment type */
const UNLOCK_THRESHOLD: Record<AssessmentType, number> = {
  CAT_1: 33,
  CAT_2: 66,
  FINAL_EXAM: 100,
};

// ---------------------------------------------------------------------------
// 3.13 getPassMark
// ---------------------------------------------------------------------------

export const getPassMark = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const { data } = await supabase
      .from("platform_config")
      .select("value")
      .eq("key", "pass_mark")
      .maybeSingle();
    return { passMark: data ? parseInt(data.value, 10) : 60 };
  });

// ---------------------------------------------------------------------------
// 3.14 updatePassMark
// ---------------------------------------------------------------------------

export const updatePassMark = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { value: number }) => {
    if (data?.value === undefined) throw new Error("value required");
    const v = Math.round(data.value);
    if (v < 0 || v > 100) throw new Error("Pass mark must be between 0 and 100");
    return { value: v };
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
      .upsert({ key: "pass_mark", value: String(data.value) });
    if (error) throw new Error(error.message);

    return { passMark: data.value };
  });

// ---------------------------------------------------------------------------
// 3.2 getAssessmentsForCourse
// ---------------------------------------------------------------------------

export const getAssessmentsForCourse = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { courseId: string }) => {
    if (!data?.courseId) throw new Error("courseId required");
    return data;
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { courseId } = data;

    // Fetch the three assessments for the course
    const { data: assessments, error: aErr } = await supabase
      .from("assessments")
      .select("*")
      .eq("course_id", courseId)
      .order("created_at");
    if (aErr) throw new Error(aErr.message);

    // Get lecture completion percentage via RPC
    const { data: pctData } = await supabase.rpc("get_lecture_completion_pct", {
      p_student_id: userId,
      p_course_id: courseId,
    });
    const completionPct: number = pctData ?? 0;

    // Fetch all attempts for this student across these assessments
    const assessmentIds = (assessments ?? []).map((a: any) => a.id);
    const { data: attempts } = await supabase
      .from("assessment_attempts")
      .select("*")
      .eq("student_id", userId)
      .in("assessment_id", assessmentIds.length ? assessmentIds : ["__none__"]);

    const attemptsByAssessment: Record<string, any[]> = {};
    for (const att of attempts ?? []) {
      if (!attemptsByAssessment[att.assessment_id]) {
        attemptsByAssessment[att.assessment_id] = [];
      }
      attemptsByAssessment[att.assessment_id].push(att);
    }

    const result = (assessments ?? []).map((assessment: any) => {
      const threshold = UNLOCK_THRESHOLD[assessment.type as AssessmentType] ?? 100;
      const unlocked = completionPct >= threshold;
      const myAttempts: any[] = attemptsByAssessment[assessment.id] ?? [];
      const attemptCount = myAttempts.length;
      const latestAttempt = myAttempts.sort(
        (a, b) => b.attempt_number - a.attempt_number,
      )[0] ?? null;

      // Cooldown: 7 days after first attempt start
      const firstAttempt = myAttempts.sort(
        (a, b) => new Date(a.started_at).getTime() - new Date(b.started_at).getTime(),
      )[0] ?? null;
      const cooldownActive =
        firstAttempt &&
        attemptCount > 0 &&
        Date.now() - new Date(firstAttempt.started_at).getTime() < COOLDOWN_MS &&
        attemptCount < 3;

      return {
        ...assessment,
        unlocked,
        completionPct,
        threshold,
        attemptCount,
        maxAttempts: 3,
        cooldownActive: cooldownActive ?? false,
        cooldownEndsAt: firstAttempt
          ? new Date(new Date(firstAttempt.started_at).getTime() + COOLDOWN_MS).toISOString()
          : null,
        latestAttempt,
      };
    });

    return { assessments: result };
  });

// ---------------------------------------------------------------------------
// 3.3 getQuestionBank — instructor only
// ---------------------------------------------------------------------------

export const getQuestionBank = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { assessmentId: string }) => {
    if (!data?.assessmentId) throw new Error("assessmentId required");
    return data;
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { assessmentId } = data;

    // Verify instructor owns the course
    const { data: assessment } = await supabase
      .from("assessments")
      .select("id, course_id, courses(instructor_id)")
      .eq("id", assessmentId)
      .maybeSingle();
    if (!assessment) throw new Error("Assessment not found");
    const course = (assessment as any).courses;
    if (course?.instructor_id !== userId) throw new Error("Forbidden: not your course");

    const { data: questions, error } = await supabase
      .from("assessment_questions")
      .select("*")
      .eq("assessment_id", assessmentId)
      .order("created_at");
    if (error) throw new Error(error.message);

    const grouped = {
      pending_review: (questions ?? []).filter((q: any) => q.status === "pending_review"),
      approved: (questions ?? []).filter((q: any) => q.status === "approved"),
      rejected: (questions ?? []).filter((q: any) => q.status === "rejected"),
    };

    return { questions: grouped };
  });

// ---------------------------------------------------------------------------
// 3.4 generateQuestionsWithAI — instructor only
// ---------------------------------------------------------------------------

export const generateQuestionsWithAI = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (data: {
      assessmentId: string;
      contentChunks: Array<{ sectionTitle: string; lectureContent: string }>;
    }) => {
      if (!data?.assessmentId) throw new Error("assessmentId required");
      if (!data?.contentChunks?.length) throw new Error("contentChunks required");
      return data;
    },
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { assessmentId, contentChunks } = data;

    // Instructor guard
    const { data: assessment } = await supabase
      .from("assessments")
      .select("id, type, course_id, courses(instructor_id)")
      .eq("id", assessmentId)
      .maybeSingle();
    if (!assessment) throw new Error("Assessment not found");
    if ((assessment as any).courses?.instructor_id !== userId)
      throw new Error("Forbidden: not your course");

    const aiProvider = getAIProvider();
    let generated;
    try {
      generated = await aiProvider.generateQuestions({
        contentChunks,
        assessmentType: (assessment as any).type as AssessmentType,
      });
    } catch (err) {
      // On AI error, retain previously stored questions — do not touch approved ones
      throw new Error(
        `AI generation failed: ${(err as Error).message}. Previously approved questions are preserved.`,
      );
    }

    // Insert all generated questions as pending_review
    const rows = generated.map((q) => ({
      assessment_id: assessmentId,
      type: q.type,
      stem: q.stem,
      options: q.options ? (q.options as any) : null,
      model_answer: q.modelAnswer ?? null,
      rubric: q.rubric,
      source_ref: q.sourceRef,
      status: "pending_review" as QuestionStatus,
      ai_generated: true,
    }));

    const { data: inserted, error } = await supabase
      .from("assessment_questions")
      .insert(rows)
      .select();
    if (error) throw new Error(error.message);

    return { generated: inserted };
  });

// ---------------------------------------------------------------------------
// 3.5 approveQuestion / rejectQuestion — instructor only
// ---------------------------------------------------------------------------

async function setQuestionStatus(
  supabase: any,
  userId: string,
  questionId: string,
  status: "approved" | "rejected",
) {
  const { data: question } = await supabase
    .from("assessment_questions")
    .select("id, assessment_id, assessments(course_id, courses(instructor_id))")
    .eq("id", questionId)
    .maybeSingle();
  if (!question) throw new Error("Question not found");
  const instructor = (question as any).assessments?.courses?.instructor_id;
  if (instructor !== userId) throw new Error("Forbidden: not your course");

  const { error } = await supabase
    .from("assessment_questions")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", questionId);
  if (error) throw new Error(error.message);

  return { questionId, status };
}

export const approveQuestion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { questionId: string }) => {
    if (!data?.questionId) throw new Error("questionId required");
    return data;
  })
  .handler(async ({ data, context }) =>
    setQuestionStatus(context.supabase, context.userId, data.questionId, "approved"),
  );

export const rejectQuestion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { questionId: string }) => {
    if (!data?.questionId) throw new Error("questionId required");
    return data;
  })
  .handler(async ({ data, context }) =>
    setQuestionStatus(context.supabase, context.userId, data.questionId, "rejected"),
  );

// ---------------------------------------------------------------------------
// 3.6 saveQuestion — upsert (manual add or edit), instructor only
// ---------------------------------------------------------------------------

export const saveQuestion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (data: {
      assessmentId: string;
      questionId?: string; // omit for new
      type: QuestionType;
      stem: string;
      options?: MCQOption[];
      modelAnswer?: string;
      rubric?: string;
      sourceRef?: string;
    }) => {
      if (!data?.assessmentId) throw new Error("assessmentId required");
      if (!data?.stem?.trim()) throw new Error("stem required");
      if (!data?.type) throw new Error("type required");

      if (data.type === "MCQ") {
        const opts = data.options ?? [];
        if (opts.length < 2 || opts.length > 6)
          throw new Error("MCQ requires 2–6 options");
        const correct = opts.filter((o) => o.is_correct);
        if (correct.length !== 1)
          throw new Error("MCQ requires exactly one correct option");
      }

      if (data.type === "SHORT_ANSWER" || data.type === "ESSAY") {
        if (!data.rubric?.trim()) throw new Error("rubric required for SHORT_ANSWER and ESSAY");
      }

      return data;
    },
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Instructor guard
    const { data: assessment } = await supabase
      .from("assessments")
      .select("id, courses(instructor_id)")
      .eq("id", data.assessmentId)
      .maybeSingle();
    if (!assessment) throw new Error("Assessment not found");
    if ((assessment as any).courses?.instructor_id !== userId)
      throw new Error("Forbidden: not your course");

    const payload: any = {
      assessment_id: data.assessmentId,
      type: data.type,
      stem: data.stem,
      options: data.options ?? null,
      model_answer: data.modelAnswer ?? null,
      rubric: data.rubric ?? null,
      source_ref: data.sourceRef ?? null,
      ai_generated: false,
      updated_at: new Date().toISOString(),
    };

    if (data.questionId) {
      // Edit existing
      const { data: updated, error } = await supabase
        .from("assessment_questions")
        .update(payload)
        .eq("id", data.questionId)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return { question: updated };
    } else {
      // New manually-added questions default to approved
      payload.status = "approved";
      const { data: inserted, error } = await supabase
        .from("assessment_questions")
        .insert(payload)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return { question: inserted };
    }
  });

// ---------------------------------------------------------------------------
// 3.7 deleteQuestion — instructor only, guard: at least one approved must remain
// ---------------------------------------------------------------------------

export const deleteQuestion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { questionId: string }) => {
    if (!data?.questionId) throw new Error("questionId required");
    return data;
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { questionId } = data;

    const { data: question } = await supabase
      .from("assessment_questions")
      .select("id, status, assessment_id, assessments(course_id, courses(instructor_id))")
      .eq("id", questionId)
      .maybeSingle();
    if (!question) throw new Error("Question not found");
    if ((question as any).assessments?.courses?.instructor_id !== userId)
      throw new Error("Forbidden: not your course");

    // Guard: cannot delete the last approved question
    if ((question as any).status === "approved") {
      const { count } = await supabase
        .from("assessment_questions")
        .select("id", { count: "exact", head: true })
        .eq("assessment_id", (question as any).assessment_id)
        .eq("status", "approved");
      if ((count ?? 0) <= 1)
        throw new Error("Cannot delete the only approved question in the bank");
    }

    const { error } = await supabase
      .from("assessment_questions")
      .delete()
      .eq("id", questionId);
    if (error) throw new Error(error.message);

    return { deleted: true };
  });

// ---------------------------------------------------------------------------
// 3.8 startAttempt — student, enforces unlock, max 3 attempts, cooldown
// ---------------------------------------------------------------------------

export const startAttempt = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { assessmentId: string }) => {
    if (!data?.assessmentId) throw new Error("assessmentId required");
    return data;
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { assessmentId } = data;

    const { data: assessment } = await supabase
      .from("assessments")
      .select("id, type, course_id")
      .eq("id", assessmentId)
      .maybeSingle();
    if (!assessment) throw new Error("Assessment not found");

    // Check enrollment
    const { data: enrol } = await supabase
      .from("enrollments")
      .select("id")
      .eq("user_id", userId)
      .eq("course_id", (assessment as any).course_id)
      .maybeSingle();
    if (!enrol) throw new Error("Not enrolled in this course");

    // Check unlock threshold
    const { data: pctData } = await supabase.rpc("get_lecture_completion_pct", {
      p_student_id: userId,
      p_course_id: (assessment as any).course_id,
    });
    const completionPct: number = pctData ?? 0;
    const threshold = UNLOCK_THRESHOLD[(assessment as any).type as AssessmentType] ?? 100;
    if (completionPct < threshold)
      throw new Error(
        `Assessment locked: complete ${threshold}% of lectures first (currently ${completionPct.toFixed(0)}%)`,
      );

    // Check existing attempts
    const { data: existingAttempts } = await supabase
      .from("assessment_attempts")
      .select("*")
      .eq("assessment_id", assessmentId)
      .eq("student_id", userId)
      .order("attempt_number");

    const attempts = existingAttempts ?? [];
    if (attempts.length >= 3) throw new Error("Maximum attempts (3) reached");

    // Check cooldown (7 days from first attempt)
    if (attempts.length > 0) {
      const firstStarted = new Date(attempts[0].started_at).getTime();
      if (Date.now() - firstStarted < COOLDOWN_MS) {
        const endsAt = new Date(firstStarted + COOLDOWN_MS).toISOString();
        throw new Error(`Cooldown active. You may retry after ${endsAt}`);
      }
    }

    // Get approved questions
    const { data: questions } = await supabase
      .from("assessment_questions")
      .select("*")
      .eq("assessment_id", assessmentId)
      .eq("status", "approved");
    if (!questions?.length) throw new Error("No approved questions available for this assessment");

    // Create attempt row
    const attemptNumber = attempts.length + 1;
    const { data: attempt, error: attErr } = await supabase
      .from("assessment_attempts")
      .insert({
        assessment_id: assessmentId,
        student_id: userId,
        state: "in_progress",
        attempt_number: attemptNumber,
      })
      .select()
      .single();
    if (attErr) throw new Error(attErr.message);

    return {
      attempt,
      questions: shuffle(questions),
    };
  });

// ---------------------------------------------------------------------------
// 3.9 submitAttempt — student, full grading pipeline
// ---------------------------------------------------------------------------

export const submitAttempt = createServerFn({ method: "POST" })
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

    // Verify the attempt belongs to this student and is in_progress
    const { data: attempt } = await supabase
      .from("assessment_attempts")
      .select("*, assessments(course_id, courses(instructor_id))")
      .eq("id", attemptId)
      .eq("student_id", userId)
      .maybeSingle();
    if (!attempt) throw new Error("Attempt not found");
    if ((attempt as any).state !== "in_progress")
      throw new Error("Attempt is not in progress");

    const aiProvider = getAIProvider();
    const responseRows: any[] = [];
    let hasUnreleased = false;

    for (const resp of responses) {
      const { data: question } = await supabase
        .from("assessment_questions")
        .select("*")
        .eq("id", resp.questionId)
        .maybeSingle();
      if (!question) continue;

      let aiScore: number | null = null;
      let aiFeedback: string | null = null;
      let needsReview = false;
      let finalScore: number | null = null;
      let released = false;

      if ((question as any).type === "MCQ") {
        const opts: MCQOption[] = (question as any).options ?? [];
        const correct = opts.find((o) => o.is_correct);
        const isCorrect = correct?.id === resp.selectedOption;
        aiScore = isCorrect ? 100 : 0;
        finalScore = aiScore;
        released = true;
      } else if ((question as any).type === "SHORT_ANSWER") {
        try {
          const result = await aiProvider.gradeShortAnswer({
            response: resp.responseText ?? "",
            modelAnswer: (question as any).model_answer ?? "",
            rubric: (question as any).rubric ?? "",
          });
          aiScore = result.score;
          aiFeedback = result.feedback;
          finalScore = aiScore;
          released = true;
        } catch {
          // Grading failed — mark for review
          needsReview = true;
          hasUnreleased = true;
        }
      } else if ((question as any).type === "ESSAY") {
        try {
          const result = await aiProvider.gradeEssay({
            response: resp.responseText ?? "",
            rubric: (question as any).rubric ?? "",
          });
          aiScore = result.score;
          aiFeedback = result.feedback;
          needsReview = result.needs_review;
          if (!needsReview) {
            finalScore = aiScore;
            released = true;
          } else {
            hasUnreleased = true;
          }
        } catch {
          needsReview = true;
          hasUnreleased = true;
        }
      }

      responseRows.push({
        attempt_id: attemptId,
        question_id: resp.questionId,
        response_text: resp.responseText ?? null,
        selected_option: resp.selectedOption ?? null,
        ai_score: aiScore,
        ai_feedback: aiFeedback,
        needs_review: needsReview,
        final_score: finalScore,
        released,
      });
    }

    // Upsert all response rows
    const { error: respErr } = await supabase
      .from("assessment_responses")
      .upsert(responseRows, { onConflict: "attempt_id,question_id" });
    if (respErr) throw new Error(respErr.message);

    // Compute preliminary_score = avg of released final_scores
    const releasedScores = responseRows
      .filter((r) => r.released && r.final_score !== null)
      .map((r) => r.final_score as number);
    const preliminaryScore =
      releasedScores.length > 0
        ? releasedScores.reduce((s, v) => s + v, 0) / releasedScores.length
        : null;

    const newState: AttemptState = hasUnreleased ? "pending_review" : "released";
    const now = new Date().toISOString();

    const attemptUpdate: any = {
      state: newState,
      preliminary_score: preliminaryScore,
      submitted_at: now,
    };
    if (!hasUnreleased) {
      attemptUpdate.score = preliminaryScore;
      attemptUpdate.released_at = now;
    }

    const { error: updErr } = await supabase
      .from("assessment_attempts")
      .update(attemptUpdate)
      .eq("id", attemptId);
    if (updErr) throw new Error(updErr.message);

    // If fully released: check certificate eligibility
    if (!hasUnreleased) {
      const courseId = (attempt as any).assessments?.course_id;
      if (courseId) {
        const { data: weightedData } = await supabase.rpc("compute_weighted_score", {
          p_student_id: userId,
          p_course_id: courseId,
        });
        const { data: pmRow } = await supabase
          .from("platform_config")
          .select("value")
          .eq("key", "pass_mark")
          .maybeSingle();
        const passMark = pmRow ? parseInt(pmRow.value, 10) : 60;
        if (weightedData !== null && weightedData >= passMark) {
          await maybeCertificate(supabase, userId, courseId);
        }
      }
    } else {
      // Insert essay_review_required notification for instructor
      const instructorId = (attempt as any).assessments?.courses?.instructor_id;
      if (instructorId) {
        await supabase.from("notifications").insert({
          user_id: instructorId,
          type: "essay_review_required",
          payload: { attempt_id: attemptId, course_id: (attempt as any).assessments?.course_id },
        });
      }
    }

    return { state: newState, preliminaryScore };
  });

// ---------------------------------------------------------------------------
// 3.10 getAttemptResult — student, respects released flag
// ---------------------------------------------------------------------------

export const getAttemptResult = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { attemptId: string }) => {
    if (!data?.attemptId) throw new Error("attemptId required");
    return data;
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { attemptId } = data;

    const { data: attempt } = await supabase
      .from("assessment_attempts")
      .select("*")
      .eq("id", attemptId)
      .eq("student_id", userId)
      .maybeSingle();
    if (!attempt) throw new Error("Attempt not found");

    const { data: responses } = await supabase
      .from("assessment_responses")
      .select("*, assessment_questions(type, stem, options, model_answer, rubric)")
      .eq("attempt_id", attemptId);

    // Filter feedback based on released flag
    const sanitized = (responses ?? []).map((r: any) => ({
      id: r.id,
      question_id: r.question_id,
      question: r.assessment_questions,
      selected_option: r.selected_option,
      response_text: r.response_text,
      released: r.released,
      // Only expose scores and feedback if the response is released
      ai_score: r.released ? r.ai_score : null,
      ai_feedback: r.released ? r.ai_feedback : null,
      final_score: r.released ? r.final_score : null,
      needs_review: r.needs_review,
    }));

    return { attempt, responses: sanitized };
  });

// ---------------------------------------------------------------------------
// 3.11 reviewEssayResponse — instructor approves or overrides AI essay score
// ---------------------------------------------------------------------------

export const reviewEssayResponse = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (data: { responseId: string; overrideScore?: number }) => {
      if (!data?.responseId) throw new Error("responseId required");
      if (data.overrideScore !== undefined) {
        const v = Math.round(data.overrideScore);
        if (v < 0 || v > 100) throw new Error("overrideScore must be 0–100");
      }
      return data;
    },
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { responseId, overrideScore } = data;

    // Fetch response with full context to verify instructor access
    const { data: response } = await supabase
      .from("assessment_responses")
      .select(
        "*, assessment_attempts(student_id, assessment_id, assessments(course_id, courses(instructor_id)))",
      )
      .eq("id", responseId)
      .maybeSingle();
    if (!response) throw new Error("Response not found");

    const instructorId =
      (response as any).assessment_attempts?.assessments?.courses?.instructor_id;
    if (instructorId !== userId) throw new Error("Forbidden: not your course");

    const originalScore = (response as any).ai_score ?? 0;
    const finalScore = overrideScore !== undefined ? overrideScore : originalScore;

    // Insert grade override row
    const { error: overrideErr } = await supabase.from("grade_overrides").insert({
      response_id: responseId,
      instructor_id: userId,
      original_score: originalScore,
      override_score: finalScore,
    });
    if (overrideErr) throw new Error(overrideErr.message);

    // Update response: set final_score, released = true
    const { error: respErr } = await supabase
      .from("assessment_responses")
      .update({
        final_score: finalScore,
        released: true,
        needs_review: false,
        updated_at: new Date().toISOString(),
      })
      .eq("id", responseId);
    if (respErr) throw new Error(respErr.message);

    // Check if all responses in the attempt are now released
    const attemptId = (response as any).attempt_id;
    const { data: unreleasedRows } = await supabase
      .from("assessment_responses")
      .select("id", { count: "exact", head: true })
      .eq("attempt_id", attemptId)
      .eq("released", false);
    const unreleased = (unreleasedRows as any) ?? 0;

    if (unreleased === 0) {
      // All released — recalculate attempt score
      const { data: allResponses } = await supabase
        .from("assessment_responses")
        .select("final_score")
        .eq("attempt_id", attemptId);

      const scores = (allResponses ?? [])
        .map((r: any) => r.final_score as number)
        .filter((s) => s !== null);
      const avgScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
      const now = new Date().toISOString();

      await supabase
        .from("assessment_attempts")
        .update({ state: "released", score: avgScore, released_at: now })
        .eq("id", attemptId);

      // Check certificate eligibility
      const courseId =
        (response as any).assessment_attempts?.assessments?.course_id;
      const studentId = (response as any).assessment_attempts?.student_id;
      if (courseId && studentId) {
        const { data: weightedData } = await supabase.rpc("compute_weighted_score", {
          p_student_id: studentId,
          p_course_id: courseId,
        });
        const { data: pmRow2 } = await supabase
          .from("platform_config")
          .select("value")
          .eq("key", "pass_mark")
          .maybeSingle();
        const passMark2 = pmRow2 ? parseInt(pmRow2.value, 10) : 60;
        if (weightedData !== null && weightedData >= passMark2) {
          await maybeCertificate(supabase, studentId, courseId);
        }
      }
    }

    return { reviewed: true, finalScore };
  });

// ---------------------------------------------------------------------------
// 3.12 resetStudentAttempts — instructor only
// ---------------------------------------------------------------------------

export const resetStudentAttempts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { assessmentId: string; studentId: string }) => {
    if (!data?.assessmentId) throw new Error("assessmentId required");
    if (!data?.studentId) throw new Error("studentId required");
    return data;
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { assessmentId, studentId } = data;

    // Instructor guard via assessments → courses.instructor_id
    const { data: assessment } = await supabase
      .from("assessments")
      .select("id, courses(instructor_id)")
      .eq("id", assessmentId)
      .maybeSingle();
    if (!assessment) throw new Error("Assessment not found");
    if ((assessment as any).courses?.instructor_id !== userId)
      throw new Error("Forbidden: not your course");

    // Use the Postgres function
    const { error } = await supabase.rpc("reset_student_attempts", {
      p_assessment_id: assessmentId,
      p_student_id: studentId,
    });
    if (error) throw new Error(error.message);

    return { reset: true };
  });
