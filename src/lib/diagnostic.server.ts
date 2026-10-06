/**
 * Server functions for diagnostic assessments and learner pathway generation
 * 
 * This module handles:
 * - Diagnostic attempt submission and scoring
 * - Learner pathway recommendation generation
 * 
 * SECURITY: These functions use supabaseAdmin (service role) for internal operations,
 * but should be wrapped in route handlers that authenticate the user first.
 */

import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { 
  Database 
} from "@/integrations/supabase/types";

type DiagnosticAssessment = Database["public"]["Tables"]["diagnostic_assessments"]["Row"];
type DiagnosticQuestion = Database["public"]["Tables"]["diagnostic_questions"]["Row"];
type DiagnosticAttempt = Database["public"]["Tables"]["diagnostic_attempts"]["Row"];
type LearnerPathway = Database["public"]["Tables"]["learner_pathways"]["Row"];
type Competency = Database["public"]["Tables"]["competencies"]["Row"];

/**
 * Submit a diagnostic attempt and calculate the score
 * 
 * @param userId - The user's UUID
 * @param diagnosticId - The diagnostic assessment ID
 * @param userAnswers - Map of question ID to answer string
 * @returns Score (0-100), passed status, and next steps
 */
export async function submitDiagnosticAttempt(
  userId: string,
  diagnosticId: string,
  userAnswers: Record<string, string>
): Promise<{
  score: number;
  passed: boolean;
  nextSteps: string[];
  attemptNumber: number;
}> {
  // 1. Fetch diagnostic questions
  const { data: questions, error: questionsError } = await supabaseAdmin
    .from("diagnostic_questions")
    .select("*")
    .eq("diagnostic_id", diagnosticId)
    .order("order_index", { ascending: true });

  if (questionsError) {
    throw new Error(`Failed to fetch diagnostic questions: ${questionsError.message}`);
  }

  // 2. Fetch diagnostic details for pass threshold
  const { data: diagnostic, error: diagnosticError } = await supabaseAdmin
    .from("diagnostic_assessments")
    .select("*")
    .eq("id", diagnosticId)
    .single();

  if (diagnosticError) {
    throw new Error(`Failed to fetch diagnostic: ${diagnosticError.message}`);
  }

  // 3. Check attempt cooldown
  const cooldownMs = diagnostic.cooldown_days * 24 * 60 * 60 * 1000;
  const { data: lastAttempt } = await supabaseAdmin
    .from("diagnostic_attempts")
    .select("created_at")
    .eq("user_id", userId)
    .eq("diagnostic_id", diagnosticId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (lastAttempt) {
    const timeSinceLastAttempt = Date.now() - new Date(lastAttempt.created_at).getTime();
    if (timeSinceLastAttempt < cooldownMs) {
      const daysRemaining = Math.ceil((cooldownMs - timeSinceLastAttempt) / (24 * 60 * 60 * 1000));
      throw new Error(
        `You can retake this diagnostic in ${daysRemaining} day${daysRemaining !== 1 ? "s" : ""}. ` +
        `Last attempt was on ${new Date(lastAttempt.created_at).toLocaleDateString()}.`
      );
    }
  }

  // 4. Score the attempt
  let totalScore = 0;
  let totalPoints = 0;

  for (const question of questions || []) {
    const userAnswer = userAnswers[question.id] || "";
    totalPoints += question.points || 1;

    if (question.question_type === "multiple_choice") {
      const options = question.options as any;
      if (options && options.correct !== undefined) {
        // options format: { choices: [...], correct: index }
        const selectedIndex = parseInt(userAnswer);
        if (selectedIndex === options.correct) {
          totalScore += question.points || 1;
        }
      }
    } else if (question.question_type === "short_answer") {
      // Exact match scoring for short answers
      if (question.correct_answer && userAnswer.toLowerCase() === question.correct_answer.toLowerCase()) {
        totalScore += question.points || 1;
      }
    }
  }

  // Calculate percentage score
  const percentScore = totalPoints > 0 ? Math.round((totalScore / totalPoints) * 100) : 0;

  // 5. Get next attempt number
  const { data: previousAttempts } = await supabaseAdmin
    .from("diagnostic_attempts")
    .select("attempt_number")
    .eq("user_id", userId)
    .eq("diagnostic_id", diagnosticId)
    .order("attempt_number", { ascending: false })
    .limit(1);

  const nextAttemptNumber = (previousAttempts?.[0]?.attempt_number ?? 0) + 1;

  // 6. Insert attempt into database
  const { error: insertError } = await supabaseAdmin
    .from("diagnostic_attempts")
    .insert({
      user_id: userId,
      diagnostic_id: diagnosticId,
      score: percentScore,
      attempt_number: nextAttemptNumber,
    });

  if (insertError) {
    throw new Error(`Failed to record diagnostic attempt: ${insertError.message}`);
  }

  const passed = percentScore >= diagnostic.pass_threshold;

  // 7. Determine next steps based on pass/fail
  const nextSteps: string[] = [];

  if (passed) {
    nextSteps.push("You're ready for this course!");
    nextSteps.push("Proceed to enrollment");
  } else {
    nextSteps.push(`You scored ${percentScore}%. Consider reviewing prerequisite materials.`);
    
    // Fetch prerequisite competencies to recommend courses
    if (diagnostic.prerequisite_competency_ids && diagnostic.prerequisite_competency_ids.length > 0) {
      nextSteps.push("We recommend completing these prerequisite topics first:");
      nextSteps.push("View recommended learning path");
    }
  }

  return {
    score: percentScore,
    passed,
    nextSteps,
    attemptNumber: nextAttemptNumber,
  };
}

/**
 * Generate a personalized learning pathway for a learner based on diagnostic results
 * 
 * @param userId - The user's UUID
 * @param courseId - The course ID
 * @returns Pathway recommendation with sections to skip and starting point
 */
export async function generateLearnerPathway(
  userId: string,
  courseId: string
): Promise<LearnerPathway> {
  // 1. Fetch the course to get its diagnostic
  const { data: course, error: courseError } = await supabaseAdmin
    .from("courses")
    .select("*")
    .eq("id", courseId)
    .single();

  if (courseError) {
    throw new Error(`Failed to fetch course: ${courseError.message}`);
  }

  // 2. Check if pathway already exists
  const { data: existingPathway } = await supabaseAdmin
    .from("learner_pathways")
    .select("*")
    .eq("user_id", userId)
    .eq("course_id", courseId)
    .single();

  if (existingPathway) {
    return existingPathway;
  }

  // 3. Get course competencies
  const { data: competencies } = await supabaseAdmin
    .from("competencies")
    .select("*")
    .eq("course_id", courseId)
    .order("order_index", { ascending: true });

  // 4. Find any diagnostic for prerequisites
  const { data: diagnosticAssessments } = await supabaseAdmin
    .from("diagnostic_assessments")
    .select("*")
    .eq("course_id", courseId)
    .limit(1);

  let recommendation = "Start from the beginning";
  let baselineCompetencies: string[] = [];
  let skipSectionIds: string[] = [];

  if (diagnosticAssessments && diagnosticAssessments.length > 0) {
    const diagnostic = diagnosticAssessments[0];

    // Get the user's latest diagnostic attempt
    const { data: attempts } = await supabaseAdmin
      .from("diagnostic_attempts")
      .select("*")
      .eq("user_id", userId)
      .eq("diagnostic_id", diagnostic.id)
      .order("created_at", { ascending: false })
      .limit(1);

    if (attempts && attempts.length > 0) {
      const attempt = attempts[0];
      const passed = attempt.score >= (diagnostic.pass_threshold || 50);

      if (passed) {
        recommendation = `You demonstrated foundational knowledge (${attempt.score}%). You're ready for this course!`;
        baselineCompetencies = diagnostic.prerequisite_competency_ids
          ? competencies
              ?.filter(c => diagnostic.prerequisite_competency_ids?.includes(c.id))
              .map(c => c.title) || []
          : [];
      } else {
        recommendation = `You scored ${attempt.score}% on the diagnostic. We recommend reviewing prerequisite materials before continuing.`;
      }
    }
  }

  // 5. Create the pathway
  const { data: newPathway, error: insertError } = await supabaseAdmin
    .from("learner_pathways")
    .insert({
      user_id: userId,
      course_id: courseId,
      recommended_start_section_id: null, // Could be extended to recommend specific sections
      skip_section_ids: skipSectionIds,
      baseline_competencies: baselineCompetencies,
      recommendation_reason: recommendation,
    })
    .select()
    .single();

  if (insertError) {
    throw new Error(`Failed to create learner pathway: ${insertError.message}`);
  }

  return newPathway;
}

/**
 * Get learner pathway for a course (creates if doesn't exist)
 * 
 * @param userId - The user's UUID
 * @param courseId - The course ID
 * @returns Pathway data or creates new one
 */
export async function getLearnerPathway(
  userId: string,
  courseId: string
): Promise<LearnerPathway | null> {
  try {
    const { data: pathway } = await supabaseAdmin
      .from("learner_pathways")
      .select("*")
      .eq("user_id", userId)
      .eq("course_id", courseId)
      .single();

    if (pathway) {
      return pathway;
    }

    // Generate if not found
    return await generateLearnerPathway(userId, courseId);
  } catch (error) {
    console.error("Error fetching learner pathway:", error);
    return null;
  }
}

/**
 * Check if a user can retake a diagnostic
 * 
 * @param userId - The user's UUID
 * @param diagnosticId - The diagnostic ID
 * @returns Object with canRetake boolean and message
 */
export async function canRetakeDiagnostic(
  userId: string,
  diagnosticId: string
): Promise<{ canRetake: boolean; daysRemaining: number; message: string }> {
  // Fetch diagnostic
  const { data: diagnostic } = await supabaseAdmin
    .from("diagnostic_assessments")
    .select("*")
    .eq("id", diagnosticId)
    .single();

  if (!diagnostic) {
    return { canRetake: true, daysRemaining: 0, message: "Diagnostic not found" };
  }

  // Get last attempt
  const { data: lastAttempt } = await supabaseAdmin
    .from("diagnostic_attempts")
    .select("created_at")
    .eq("user_id", userId)
    .eq("diagnostic_id", diagnosticId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (!lastAttempt) {
    return { canRetake: true, daysRemaining: 0, message: "No previous attempts" };
  }

  const cooldownMs = diagnostic.cooldown_days * 24 * 60 * 60 * 1000;
  const timeSinceLastAttempt = Date.now() - new Date(lastAttempt.created_at).getTime();
  const daysRemaining = Math.ceil((cooldownMs - timeSinceLastAttempt) / (24 * 60 * 60 * 1000));

  if (timeSinceLastAttempt < cooldownMs) {
    return {
      canRetake: false,
      daysRemaining: Math.max(0, daysRemaining),
      message: `You can retake this diagnostic in ${daysRemaining} day${daysRemaining !== 1 ? "s" : ""}.`,
    };
  }

  return { canRetake: true, daysRemaining: 0, message: "Ready to retake" };
}
