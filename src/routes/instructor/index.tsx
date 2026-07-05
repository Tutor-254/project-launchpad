import { createFileRoute, Link, useNavigate, redirect } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, useRoles } from "@/hooks/use-auth";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatPrice } from "@/lib/format";
import { Plus, BookOpen } from "lucide-react";
import { requireAuth, requireRole, requireNoApplicationPending } from "@/lib/auth-guards";

export const Route = createFileRoute("/instructor/")({
  beforeLoad: async () => {
    const session = await requireAuth("/instructor");
    const hasRole = await requireRole(session.user.id, "instructor");
    if (!hasRole) throw redirect({ to: "/teach" });
    await requireNoApplicationPending(session.user.id);
  },
  component: InstructorHome,
});

function InstructorHome() {
  const { user } = useAuth();
  const { isInstructor } = useRoles(user?.id);
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [creating, setCreating] = useState(false);

  const { data: courses } = useQuery({
    queryKey: ["my-courses", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("courses")
        .select("id,title,subtitle,status,price_cents,level,updated_at")
        .eq("instructor_id", user!.id)
        .order("updated_at", { ascending: false });
      return data ?? [];
    },
  });

  const createCourse = useMutation({
    mutationFn: async () => {
      setCreating(true);
      // Use crypto.randomUUID for the slug suffix to guarantee uniqueness
      // even under rapid successive creates
      const suffix = crypto.randomUUID().replace(/-/g, "").slice(0, 12);
      const { data, error } = await supabase
        .from("courses")
        .insert({
          title: "Untitled course",
          instructor_id: user!.id,
          price_cents: 0,
          slug: `draft-${suffix}`,
        })
        .select("id")
        .single();
      if (error) throw error;
      if (!data) throw new Error("Course was not created — no data returned.");
      return data;
    },
    onSuccess: (d) => {
      qc.invalidateQueries({ queryKey: ["my-courses"] });
      navigate({ to: "/instructor/$courseId", params: { courseId: d.id } });
    },
    onError: (e: Error) => {
      console.error("[createCourse]", e);
      toast.error(`Could not create course: ${e.message}`);
    },
    onSettled: () => setCreating(false),
  });

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SiteHeader />
      <main className="max-w-7xl mx-auto px-6 py-12 w-full flex-1">
        <div className="flex items-end justify-between mb-8">
          <div>
            <h1 className="font-serif text-4xl mb-1">Studio</h1>
            <p className="text-sm text-muted-foreground">Your published and in-progress work.</p>
          </div>
          <div className="flex gap-2">
            <Link to="/instructor/analytics">
              <Button variant="outline">Analytics</Button>
            </Link>
            <Button
              onClick={() => createCourse.mutate()}
              disabled={creating}
              className="bg-brand text-brand-foreground hover:bg-brand/90"
            >
              <Plus className="mr-2 size-4" /> New course
            </Button>
          </div>
        </div>

        {courses && courses.length > 0 ? (
          <div className="grid gap-3">
            {courses.map((c) => (
              <Link
                key={c.id}
                to="/instructor/$courseId"
                params={{ courseId: c.id }}
                className="flex items-center justify-between bg-card border border-border rounded-xl p-5 hover:border-brand transition-colors"
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div className="size-12 bg-brand/10 rounded-lg flex items-center justify-center text-brand shrink-0">
                    <BookOpen className="size-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-serif text-lg truncate">{c.title}</div>
                    {c.subtitle && <div className="text-xs text-muted-foreground truncate">{c.subtitle}</div>}
                  </div>
                </div>
                <div className="flex items-center gap-4 shrink-0">
                  <Badge variant={c.status === "published" ? "default" : "outline"} className={c.status === "published" ? "bg-brand text-brand-foreground" : ""}>
                    {c.status}
                  </Badge>
                  <span className="text-sm font-serif text-brand">{formatPrice(c.price_cents)}</span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-24 border-2 border-dashed border-border rounded-2xl">
            <BookOpen className="size-10 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-serif text-xl mb-2">Your studio is empty</h3>
            <p className="text-sm text-muted-foreground mb-6">Start by creating your first course.</p>
            <Button onClick={() => createCourse.mutate()} disabled={creating} className="bg-brand text-brand-foreground hover:bg-brand/90">
              <Plus className="mr-2 size-4" /> New course
            </Button>
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
