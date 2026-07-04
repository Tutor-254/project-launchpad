import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, useRoles } from "@/hooks/use-auth";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { Stars } from "@/components/reviews-section";
import { Users, Star, MessageCircle, Clock } from "lucide-react";
import { requireAuth, requireRole, requireNoApplicationPending } from "@/lib/auth-guards";

export const Route = createFileRoute("/instructor/analytics")({
  beforeLoad: async () => {
    const session = await requireAuth("/instructor/analytics");
    const hasRole = await requireRole(session.user.id, "instructor");
    if (!hasRole) throw redirect({ to: "/teach" });
    await requireNoApplicationPending(session.user.id);
  },
  component: Analytics,
});

function Analytics() {
  const { user } = useAuth();
  const { isInstructor } = useRoles(user?.id);

  const { data: rows } = useQuery({
    queryKey: ["instructor-analytics", user?.id],
    enabled: !!user && isInstructor,
    queryFn: async () => {
      const { data: courses } = await supabase
        .from("courses")
        .select("id,title,status")
        .eq("instructor_id", user!.id);
      if (!courses) return [];
      const ids = courses.map((c) => c.id);
      if (!ids.length) return [];

      const [enr, rev, qs, secs] = await Promise.all([
        supabase.from("enrollments").select("course_id").in("course_id", ids),
        supabase.from("reviews").select("course_id,rating").in("course_id", ids).eq("hidden", false),
        supabase.from("questions").select("id,course_id").in("course_id", ids).eq("hidden", false),
        supabase.from("course_sections").select("id, lectures(id, lecture_progress(seconds_watched))").in("course_id", ids),
      ]);

      // Count answered questions
      const qIds = qs.data?.map((q) => q.id) ?? [];
      const { data: answered } = qIds.length
        ? await supabase.from("answers").select("question_id").in("question_id", qIds)
        : { data: [] };
      const answeredSet = new Set((answered ?? []).map((a) => a.question_id));

      return courses.map((c) => {
        const enrolls = enr.data?.filter((e) => e.course_id === c.id).length ?? 0;
        const reviews = rev.data?.filter((r) => r.course_id === c.id) ?? [];
        const avg = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;
        const qList = qs.data?.filter((q) => q.course_id === c.id) ?? [];
        const unanswered = qList.filter((q) => !answeredSet.has(q.id)).length;
        return {
          ...c,
          enrolls,
          reviewCount: reviews.length,
          avg,
          unanswered,
          questionCount: qList.length,
        };
      });
    },
  });

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SiteHeader />
      <main className="max-w-7xl mx-auto px-6 py-12 w-full flex-1">
        <div className="flex items-end justify-between mb-8">
          <div>
            <h1 className="font-serif text-4xl mb-1">Analytics</h1>
            <p className="text-sm text-muted-foreground">How your courses are performing.</p>
          </div>
          <Link to="/instructor" className="text-sm text-brand hover:underline">← Back to studio</Link>
        </div>

        <div className="grid gap-4">
          {rows?.length === 0 && (
            <div className="text-center py-16 border-2 border-dashed border-border rounded-2xl text-muted-foreground">
              No courses yet.
            </div>
          )}
          {rows?.map((c) => (
            <div key={c.id} className="bg-card border border-border rounded-2xl p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <Link to="/instructor/$courseId" params={{ courseId: c.id }} className="font-serif text-xl hover:text-brand">
                    {c.title}
                  </Link>
                  <div className="text-xs text-muted-foreground capitalize">{c.status}</div>
                </div>
                <Stars value={Math.round(c.avg)} />
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Stat icon={<Users className="size-4" />} label="Enrollments" value={c.enrolls} />
                <Stat icon={<Star className="size-4" />} label="Reviews" value={`${c.reviewCount} (${c.avg.toFixed(1)}★)`} />
                <Stat icon={<MessageCircle className="size-4" />} label="Questions" value={`${c.questionCount} · ${c.unanswered} unanswered`} highlight={c.unanswered > 0} />
                <Stat icon={<Clock className="size-4" />} label="Status" value={c.status} />
              </div>
            </div>
          ))}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

function Stat({ icon, label, value, highlight }: { icon: React.ReactNode; label: string; value: React.ReactNode; highlight?: boolean }) {
  return (
    <div className={`rounded-xl border p-4 ${highlight ? "border-accent-warm bg-accent-warm/5" : "border-border bg-background"}`}>
      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">{icon}{label}</div>
      <div className="font-serif text-lg">{value}</div>
    </div>
  );
}
