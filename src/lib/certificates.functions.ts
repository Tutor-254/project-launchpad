import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

function makeCode(): string {
  // 12-char base36 code, uppercase and grouped: ABCD-EFGH-IJKL
  const raw = Math.random().toString(36).slice(2, 8) + Math.random().toString(36).slice(2, 8);
  const s = raw.toUpperCase().padEnd(12, "X").slice(0, 12);
  return `${s.slice(0, 4)}-${s.slice(4, 8)}-${s.slice(8, 12)}`;
}

export const issueCertificateIfComplete = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { courseId: string }) => {
    if (!data?.courseId) throw new Error("courseId required");
    return data;
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { courseId } = data;

    // Idempotency: return existing cert without re-inserting
    const { data: existing } = await supabase
      .from("certificates")
      .select("id, code")
      .eq("user_id", userId)
      .eq("course_id", courseId)
      .maybeSingle();
    if (existing) return { code: existing.code, issued: false };

    // Confirm enrollment
    const { data: enrol } = await supabase
      .from("enrollments")
      .select("id")
      .eq("user_id", userId)
      .eq("course_id", courseId)
      .maybeSingle();
    if (!enrol) throw new Error("Not enrolled");

    // (a) Compute weighted assessment score via RPC
    const { data: weightedScore, error: rpcErr } = await supabase.rpc(
      "compute_weighted_score",
      { p_student_id: userId, p_course_id: courseId },
    );
    if (rpcErr) throw new Error(rpcErr.message);
    if (weightedScore === null) throw new Error("No released assessment scores yet");

    // (b) Verify all three assessment types have at least one released attempt
    const { data: assessments } = await supabase
      .from("assessments")
      .select("id, type")
      .eq("course_id", courseId);

    const assessmentIds = (assessments ?? []).map((a) => a.id);
    if (assessmentIds.length < 3) throw new Error("Course does not have all three assessments yet");

    const { data: releasedAttempts } = await supabase
      .from("assessment_attempts")
      .select("assessment_id")
      .eq("student_id", userId)
      .eq("state", "released")
      .in("assessment_id", assessmentIds);

    const releasedAssessmentIds = new Set((releasedAttempts ?? []).map((a) => a.assessment_id));
    const allReleased = assessmentIds.every((id) => releasedAssessmentIds.has(id));
    if (!allReleased) throw new Error("Not all assessments have a released attempt");

    // (c) Read pass_mark from platform_config
    const { data: pmRow } = await supabase
      .from("platform_config")
      .select("value")
      .eq("key", "pass_mark")
      .maybeSingle();
    const passMark = pmRow ? parseInt(pmRow.value, 10) : 60;

    // (d) Weighted score must meet pass mark
    if (weightedScore < passMark) {
      throw new Error(
        `Weighted score ${weightedScore.toFixed(1)} is below the pass mark of ${passMark}`,
      );
    }

    // Issue certificate with collision-safe code
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

    const { error } = await supabase
      .from("certificates")
      .insert({ user_id: userId, course_id: courseId, code });
    if (error) throw new Error(error.message);

    return { code, issued: true };
  });
