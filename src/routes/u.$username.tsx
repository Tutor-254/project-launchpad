import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { CourseCard } from "@/components/course-card";

export const Route = createFileRoute("/u/$username")({
  component: PublicProfile,
  head: ({ params }) => ({
    meta: [
      { title: `${params.username} — Instructor on Arcane` },
      { name: "description", content: `Courses taught by ${params.username} on Arcane.` },
      { property: "og:title", content: `${params.username} on Arcane` },
      { property: "og:description", content: `Courses taught by ${params.username} on Arcane.` },
      { property: "og:url", content: `/u/${params.username}` },
      { property: "og:type", content: "profile" },
    ],
    links: [{ rel: "canonical", href: `/u/${params.username}` }],
  }),
});

function PublicProfile() {
  const { username } = Route.useParams();

  const { data: profile, isLoading } = useQuery({
    queryKey: ["public-profile", username],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, display_name, headline, bio, avatar_url, username")
        .eq("username", username)
        .maybeSingle();
      return data;
    },
  });

  const { data: courses } = useQuery({
    queryKey: ["profile-courses", profile?.id],
    enabled: !!profile?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("courses")
        .select("id,title,subtitle,thumbnail_url,price_cents,level,instructor_id, profiles!courses_instructor_profile_fkey(display_name)")
        .eq("instructor_id", profile!.id)
        .eq("status", "published")
        .order("published_at", { ascending: false });
      return data ?? [];
    },
  });

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SiteHeader />
      <main className="max-w-6xl mx-auto px-6 py-12 w-full flex-1">
        {isLoading ? (
          <p className="text-muted-foreground">Loading…</p>
        ) : !profile ? (
          <div className="text-center py-24">
            <h1 className="font-serif text-2xl mb-2">No such instructor</h1>
            <Link to="/courses" className="text-brand underline">Browse all courses</Link>
          </div>
        ) : (
          <>
            <header className="mb-10 border-b border-border pb-8">
              <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Instructor</p>
              <h1 className="font-serif text-4xl mb-2">{profile.display_name}</h1>
              {profile.headline && <p className="text-lg text-muted-foreground mb-3">{profile.headline}</p>}
              {profile.bio && <p className="text-sm max-w-2xl leading-relaxed">{profile.bio}</p>}
            </header>
            <h2 className="font-serif text-2xl mb-6">Published courses</h2>
            {courses && courses.length ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {courses.map((c: any) => <CourseCard key={c.id} course={c} />)}
              </div>
            ) : (
              <p className="text-muted-foreground">No published courses yet.</p>
            )}
          </>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
