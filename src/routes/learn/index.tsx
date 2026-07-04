import { createFileRoute, Link, useNavigate, redirect } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { Button } from "@/components/ui/button";
import { CourseCard } from "@/components/course-card";
import { GraduationCap } from "lucide-react";
import { requireAuth } from "@/lib/auth-guards";

export const Route = createFileRoute("/learn/")({
  beforeLoad: async () => {
    await requireAuth("/learn");
  },
  component: MyLearning,
});

function MyLearning() {
  const { user } = useAuth();

  const { data: enrollments } = useQuery({
    queryKey: ["my-enrollments", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("enrollments")
        .select("id, enrolled_at, courses(id,title,subtitle,thumbnail_url,price_cents,level,instructor_id, profiles!courses_instructor_profile_fkey(display_name))")
        .eq("user_id", user!.id)
        .order("enrolled_at", { ascending: false });
      return data ?? [];
    },
  });

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SiteHeader />
      <main className="max-w-7xl mx-auto px-6 py-12 w-full flex-1">
        <div className="mb-10">
          <h1 className="font-serif text-4xl mb-1">My learning</h1>
          <p className="text-sm text-muted-foreground">Everything you've enrolled in.</p>
        </div>

        {enrollments && enrollments.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {enrollments.map((e) => {
              const c: any = e.courses;
              if (!c) return null;
              return (
                <Link
                  key={e.id}
                  to="/learn/$courseId"
                  params={{ courseId: c.id }}
                  className="group"
                >
                  <CourseCard course={{ ...c, profiles: c.profiles }} />
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-24 border-2 border-dashed border-border rounded-2xl">
            <GraduationCap className="size-10 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-serif text-xl mb-2">Nothing here yet</h3>
            <p className="text-sm text-muted-foreground mb-6">Enroll in a course to begin.</p>
            <Link to="/courses">
              <Button className="bg-brand text-brand-foreground hover:bg-brand/90">Browse courses</Button>
            </Link>
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
