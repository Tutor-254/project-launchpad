import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { CourseCard } from "@/components/course-card";

const searchSchema = z.object({
  q: z.string().optional(),
  category: z.string().optional(),
  level: z.enum(["beginner", "intermediate", "advanced"]).optional(),
});

export const Route = createFileRoute("/courses/")({
  validateSearch: searchSchema,
  component: CoursesList,
  head: () => ({
    meta: [
      { title: "Browse courses — Arcane" },
      { name: "description", content: "Explore Arcane's curated catalogue of professional-grade video courses in software, design, business, data, and languages." },
      { property: "og:title", content: "Browse courses — Arcane" },
      { property: "og:description", content: "Explore Arcane's curated catalogue of professional video courses." },
      { property: "og:url", content: "/courses" },
    ],
    links: [{ rel: "canonical", href: "/courses" }],
  }),
});

function CoursesList() {
  const { q, category, level } = Route.useSearch();

  const { data: cats } = useQuery({
    queryKey: ["cats"],
    queryFn: async () => (await supabase.from("categories").select("*").order("name")).data ?? [],
  });

  const { data: courses, isLoading } = useQuery({
    queryKey: ["courses", { q, category, level }],
    queryFn: async () => {
      let query = supabase
        .from("courses")
        .select("id,title,subtitle,thumbnail_url,price_cents,level,instructor_id, profiles!courses_instructor_profile_fkey(display_name), categories!inner(slug)")
        .eq("status", "published");
      if (q) query = query.textSearch("search_tsv", q, { type: "websearch", config: "english" });
      if (level) query = query.eq("level", level);
      if (category) query = query.eq("categories.slug", category);
      const { data } = await query.order("published_at", { ascending: false }).limit(60);
      return data ?? [];
    },
  });

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SiteHeader />
      <main className="max-w-7xl mx-auto px-6 py-12 w-full flex-1">
        <div className="mb-10">
          <h1 className="font-serif text-4xl mb-2">
            {q ? <>Results for <span className="italic text-brand">"{q}"</span></> : "The full library"}
          </h1>
          <p className="text-muted-foreground text-sm">Curated courses across disciplines.</p>
        </div>

        <div className="flex flex-wrap gap-2 mb-8">
          <FilterChip label="All" href="/courses" active={!category && !level} />
          {cats?.map((c) => (
            <FilterChip
              key={c.id}
              label={c.name}
              href={{ to: "/courses", search: { category: c.slug } }}
              active={category === c.slug}
            />
          ))}
        </div>

        {isLoading ? (
          <div className="text-center py-16 text-muted-foreground">Loading...</div>
        ) : courses && courses.length ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {courses.map((c) => <CourseCard key={c.id} course={c as any} />)}
          </div>
        ) : (
          <div className="text-center py-16 border-2 border-dashed border-border rounded-2xl">
            <p className="text-muted-foreground">No courses match your search.</p>
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}

function FilterChip({ label, href, active }: { label: string; href: any; active?: boolean }) {
  return (
    <Link
      {...(typeof href === "string" ? { to: href } : href)}
      className={`px-4 py-1.5 rounded-full text-sm border transition-colors ${
        active ? "bg-brand text-brand-foreground border-brand" : "bg-card border-border hover:border-brand"
      }`}
    >
      {label}
    </Link>
  );
}
