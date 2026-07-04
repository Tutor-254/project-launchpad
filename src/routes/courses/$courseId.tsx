import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatPrice, formatDuration } from "@/lib/format";
import { PlayCircle, Clock, BookOpen, GraduationCap } from "lucide-react";
import { ReviewsSection } from "@/components/reviews-section";
import { CheckoutDialog } from "@/components/checkout-dialog";
import { WishlistButton } from "@/components/wishlist-button";


export const Route = createFileRoute("/courses/$courseId")({
  component: CourseDetail,
  head: ({ params }) => ({
    meta: [
      { title: "Course — Arcane" },
      { name: "description", content: "Deep, professional video course on Arcane." },
      { property: "og:title", content: "Course on Arcane" },
      { property: "og:description", content: "Deep, professional video course on Arcane." },
      { property: "og:type", content: "product" },
      { property: "og:url", content: `/courses/${params.courseId}` },
    ],
    links: [{ rel: "canonical", href: `/courses/${params.courseId}` }],
  }),
});

function CourseDetail() {
  const { courseId } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [thumb, setThumb] = useState<string | null>(null);
  const [checkoutOpen, setCheckoutOpen] = useState(false);


  const { data: course, isLoading } = useQuery({
    queryKey: ["course", courseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("*, profiles!courses_instructor_profile_fkey(display_name, bio, avatar_url), categories(name, slug), course_sections(id, title, position, lectures(id, title, position, duration_seconds, is_preview))")
        .eq("id", courseId)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const { data: enrollment } = useQuery({
    queryKey: ["enrollment", courseId, user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("enrollments")
        .select("id")
        .eq("course_id", courseId)
        .eq("user_id", user!.id)
        .maybeSingle();
      return data;
    },
  });

  useEffect(() => {
    if (!course?.thumbnail_url) return;
    supabase.storage.from("course-thumbnails").createSignedUrl(course.thumbnail_url, 3600)
      .then(({ data }) => setThumb(data?.signedUrl ?? null));
  }, [course?.thumbnail_url]);

  const enroll = useMutation({
    mutationFn: async () => {
      if (!user) {
        navigate({ to: "/auth", search: { mode: "signup", redirect: `/courses/${courseId}` } });
        throw new Error("Sign in required");
      }
      const { error } = await supabase.from("enrollments").insert({ course_id: courseId, user_id: user.id });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("You're enrolled!");
      qc.invalidateQueries({ queryKey: ["enrollment", courseId] });
      navigate({ to: "/learn/$courseId", params: { courseId } });
    },
    onError: (e: Error) => {
      if (e.message !== "Sign in required") toast.error(e.message);
    },
  });

  if (isLoading) return <PageShell><div className="p-16 text-center text-muted-foreground">Loading...</div></PageShell>;
  if (!course) return <PageShell><div className="p-16 text-center">Course not found.</div></PageShell>;

  const sections = (course.course_sections ?? []).sort((a: any, b: any) => a.position - b.position);
  const totalLectures = sections.reduce((sum: number, s: any) => sum + (s.lectures?.length ?? 0), 0);
  const totalDuration = sections.reduce(
    (sum: number, s: any) => sum + (s.lectures ?? []).reduce((n: number, l: any) => n + (l.duration_seconds ?? 0), 0),
    0
  );

  return (
    <PageShell>
      {/* Hero */}
      <section className="bg-brand text-brand-foreground">
        <div className="max-w-7xl mx-auto px-6 py-16 grid md:grid-cols-3 gap-12">
          <div className="md:col-span-2">
            {course.categories && (
              <Link to="/courses" search={{ category: course.categories.slug }} className="text-xs uppercase tracking-widest text-accent-warm mb-4 inline-block">
                {course.categories.name}
              </Link>
            )}
            <h1 className="font-serif text-4xl md:text-5xl leading-tight mb-4">{course.title}</h1>
            {course.subtitle && <p className="text-lg text-brand-foreground/80 mb-6">{course.subtitle}</p>}
            <div className="flex flex-wrap items-center gap-4 text-sm text-brand-foreground/70">
              <Badge variant="outline" className="border-brand-foreground/30 text-brand-foreground capitalize">{course.level}</Badge>
              <span className="flex items-center gap-1.5"><BookOpen className="size-4" />{totalLectures} lectures</span>
              <span className="flex items-center gap-1.5"><Clock className="size-4" />{formatDuration(totalDuration)}</span>
              <span>by <strong className="text-brand-foreground">{course.profiles?.display_name ?? "Instructor"}</strong></span>
            </div>
          </div>

          <aside className="bg-card text-foreground rounded-2xl p-6 shadow-xl md:sticky md:top-24 self-start">
            {thumb && (
              <img src={thumb} alt={course.title} className="w-full aspect-video object-cover rounded-lg mb-4" />
            )}
            <div className="font-serif text-3xl text-brand mb-4">{formatPrice(course.price_cents)}</div>
            {enrollment ? (
              <Link to="/learn/$courseId" params={{ courseId }}>
                <Button className="w-full h-12 bg-brand text-brand-foreground hover:bg-brand/90">
                  <GraduationCap className="mr-2 size-4" /> Continue learning
                </Button>
              </Link>
            ) : (
              <Button
                className="w-full h-12 bg-brand text-brand-foreground hover:bg-brand/90"
                onClick={() => {
                  if (!user) {
                    navigate({ to: "/auth", search: { mode: "signup", redirect: `/courses/${courseId}` } });
                    return;
                  }
                  if ((course.price_cents ?? 0) > 0) setCheckoutOpen(true);
                  else enroll.mutate();
                }}
                disabled={enroll.isPending}
              >
                {course.price_cents > 0 ? "Enroll now" : "Enroll for free"}
              </Button>
            )}
            <p className="text-xs text-muted-foreground mt-3 text-center">Lifetime access. Learn on your schedule.</p>
            {!enrollment && (
              <div className="mt-3 flex justify-center">
                <WishlistButton courseId={courseId} />
              </div>
            )}
          </aside>
        </div>
      </section>

      <CheckoutDialog
        open={checkoutOpen}
        onOpenChange={setCheckoutOpen}
        courseId={courseId}
        courseTitle={course.title}
        priceCents={course.price_cents ?? 0}
      />


      <div className="max-w-7xl mx-auto px-6 py-12 grid md:grid-cols-3 gap-12">
        <div className="md:col-span-2 space-y-12">
          {course.description && (
            <section>
              <h2 className="font-serif text-2xl mb-4">About this course</h2>
              <div className="prose prose-sm max-w-none text-foreground/80 whitespace-pre-wrap leading-relaxed">
                {course.description}
              </div>
            </section>
          )}

          <section>
            <h2 className="font-serif text-2xl mb-4">Curriculum</h2>
            <div className="border border-border rounded-2xl overflow-hidden divide-y divide-border">
              {sections.length === 0 && <div className="p-6 text-sm text-muted-foreground">Curriculum coming soon.</div>}
              {sections.map((s: any) => {
                const lectures = (s.lectures ?? []).sort((a: any, b: any) => a.position - b.position);
                return (
                  <div key={s.id}>
                    <div className="bg-secondary/50 px-5 py-3 font-medium text-sm flex justify-between">
                      <span>{s.title}</span>
                      <span className="text-muted-foreground">{lectures.length} lectures</span>
                    </div>
                    <ul>
                      {lectures.map((l: any) => (
                        <li key={l.id} className="px-5 py-3 flex items-center gap-3 text-sm hover:bg-secondary/30">
                          <PlayCircle className="size-4 text-muted-foreground shrink-0" />
                          <span className="flex-1">{l.title}</span>
                          {l.is_preview && <Badge variant="outline" className="text-[10px]">Preview</Badge>}
                          <span className="text-xs text-muted-foreground">{formatDuration(l.duration_seconds)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          </section>

          <ReviewsSection courseId={courseId} canReview={!!enrollment} />
        </div>

        <aside className="space-y-6">
          <div className="bg-card border border-border rounded-2xl p-6">
            <h3 className="font-serif text-lg mb-3">Your instructor</h3>
            <div className="font-medium">{course.profiles?.display_name}</div>
            {course.profiles?.bio && (
              <p className="text-xs text-muted-foreground mt-2 leading-relaxed">{course.profiles.bio}</p>
            )}
          </div>
        </aside>
      </div>
    </PageShell>
  );
}

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </div>
  );
}
