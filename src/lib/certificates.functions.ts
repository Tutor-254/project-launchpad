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

    // Existing cert?
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

    // Count lectures and completed lectures
    const { data: secs } = await supabase
      .from("course_sections")
      .select("lectures(id)")
      .eq("course_id", courseId);
    const lectureIds: string[] = (secs ?? []).flatMap((s: any) => (s.lectures ?? []).map((l: any) => l.id));
    if (lectureIds.length === 0) throw new Error("Course has no lectures");

    const { data: done } = await supabase
      .from("lecture_progress")
      .select("lecture_id")
      .eq("user_id", userId)
      .eq("completed", true)
      .in("lecture_id", lectureIds);
    if ((done?.length ?? 0) < lectureIds.length) {
      throw new Error("Course not yet completed");
    }

    let code = makeCode();
    // Retry on rare collision
    for (let i = 0; i < 3; i++) {
      const { data: clash } = await supabase.from("certificates").select("id").eq("code", code).maybeSingle();
      if (!clash) break;
      code = makeCode();
    }

    const { error } = await supabase
      .from("certificates")
      .insert({ user_id: userId, course_id: courseId, code });
    if (error) throw new Error(error.message);

    return { code, issued: true };
  });
