import { createFileRoute, Link, useNavigate, redirect } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/format";
import { BookOpen, GraduationCap } from "lucide-react";
import { requireAuth } from "@/lib/auth-guards";
import type { CourseCardData } from "@/components/course-card";

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
                  className="group flex flex-col bg-card border border-border rounded-2xl overflow-hidden hover:shadow-xl hover:-translate-y-0.5 transition-all"
                >
                  <EnrolledCourseCard course={{ ...c, profiles: c.profiles }} />
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

// A card variant that renders as a <div> (not an <a>) so it is safe to nest
// inside the <Link> wrapper in MyLearning without creating <a> inside <a>.
function EnrolledCourseCard({ course }: { course: CourseCardData }) {
  const [thumb, setThumb] = useState<string | null>(null);

  useEffect(() => {
    if (!course.thumbnail_url) return;
    let cancelled = false;
    supabase.storage
      .from("course-thumbnails")
      .createSignedUrl(course.thumbnail_url, 7200)
      .then(({ data }) => {
        if (!cancelled) setThumb(data?.signedUrl ?? null);
      });
    return () => { cancelled = true; };
  }, [course.thumbnail_url]);

  return (
    <>
      <div className="aspect-video bg-gradient-to-br from-brand/20 to-accent-warm/20 relative overflow-hidden">
        {thumb ? (
          <img src={thumb} alt={course.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-brand/40">
            <BookOpen className="size-12" />
          </div>
        )}
      </div>
      <div className="p-5 flex flex-col gap-2 flex-1">
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-muted-foreground">
          <span>{course.level}</span>
        </div>
        <h3 className="font-serif text-lg leading-tight line-clamp-2 group-hover:text-brand transition-colors">
          {course.title}
        </h3>
        {course.subtitle && (
          <p className="text-xs text-muted-foreground line-clamp-2">{course.subtitle}</p>
        )}
        <div className="flex-1" />
        <div className="flex items-center justify-between pt-3 border-t border-border">
          <span className="text-xs text-muted-foreground truncate max-w-[15ch]">
            {course.profiles?.display_name ?? "Instructor"}
          </span>
          <span className="font-serif text-base font-semibold text-brand">
            {formatPrice(course.price_cents)}
          </span>
        </div>
      </div>
    </>
  );
}
