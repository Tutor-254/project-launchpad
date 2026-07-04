import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Sparkles, Compass, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { Button } from "@/components/ui/button";
import { CourseCard } from "@/components/course-card";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const { data: featured } = useQuery({
    queryKey: ["home-featured"],
    queryFn: async () => {
      const { data } = await supabase
        .from("courses")
        .select("id,title,subtitle,thumbnail_url,price_cents,level,instructor_id, profiles!courses_instructor_profile_fkey(display_name)")
        .eq("status", "published")
        .order("published_at", { ascending: false })
        .limit(8);
      return data ?? [];
    },
  });

  const { data: categories } = useQuery({
    queryKey: ["home-cats"],
    queryFn: async () => {
      const { data } = await supabase.from("categories").select("*").order("name");
      return data ?? [];
    },
  });

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SiteHeader />

      <main className="flex-1">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-gradient-to-br from-brand/8 via-background to-accent-warm/5" />
        <div className="absolute -top-24 -right-24 -z-10 size-96 bg-brand/10 rounded-full blur-3xl" />
        <div className="max-w-7xl mx-auto px-6 py-20 md:py-32 grid md:grid-cols-2 gap-12 items-center">
          <div>
            <span className="inline-flex items-center gap-2 text-xs font-medium bg-brand/10 text-brand px-3 py-1.5 rounded-full mb-6">
              <Sparkles className="size-3" />
              A curated learning marketplace
            </span>
            <h1 className="font-serif text-5xl md:text-6xl lg:text-7xl leading-[1.05] tracking-tight mb-6">
              Master the craft.<br />
              <span className="text-brand italic">Not just the tools.</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-[52ch] leading-relaxed mb-8">
              Deep, professional courses in software, design, business, and languages — taught by working experts who publish their trade.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link to="/courses">
                <Button size="lg" className="bg-brand text-brand-foreground hover:bg-brand/90 rounded-lg h-12 px-6">
                  Browse the library <ArrowRight className="ml-2 size-4" />
                </Button>
              </Link>
              <Link to="/teach">
                <Button size="lg" variant="outline" className="rounded-lg h-12 px-6">
                  Teach on Arcane
                </Button>
              </Link>
            </div>
          </div>
          <div className="hidden md:grid grid-cols-2 gap-4">
            {[
              { icon: Compass, label: "Curated depth", desc: "Every course is peer-reviewed for substance." },
              { icon: Users, label: "Working experts", desc: "Instructors who ship what they teach." },
              { icon: Sparkles, label: "Lifetime access", desc: "Buy once. Learn on your schedule." },
              { icon: ArrowRight, label: "Progress-first", desc: "Track completion across every lecture." },
            ].map(({ icon: Icon, label, desc }) => (
              <div key={label} className="bg-card border border-border rounded-2xl p-5 hover:shadow-lg transition-shadow">
                <div className="size-10 bg-brand/10 text-brand rounded-lg flex items-center justify-center mb-4">
                  <Icon className="size-5" />
                </div>
                <div className="font-serif font-semibold mb-1">{label}</div>
                <div className="text-xs text-muted-foreground leading-relaxed">{desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="max-w-7xl mx-auto px-6 py-12">
        <h2 className="font-serif text-2xl mb-6">Explore by discipline</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {categories?.map((c) => (
            <Link
              key={c.id}
              to="/courses"
              search={{ category: c.slug }}
              className="bg-card border border-border rounded-xl p-4 hover:border-brand hover:bg-brand/5 transition-all group"
            >
              <div className="text-sm font-medium group-hover:text-brand">{c.name}</div>
            </Link>
          ))}
        </div>
      </section>

      {/* Featured */}
      <section className="max-w-7xl mx-auto px-6 py-12 w-full">
        <div className="flex items-end justify-between mb-6">
          <h2 className="font-serif text-2xl">Newly published</h2>
          <Link to="/courses" className="text-sm font-medium text-brand hover:underline">View all →</Link>
        </div>
        {featured && featured.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {featured.map((c) => (
              <CourseCard key={c.id} course={c as any} />
            ))}
          </div>
        ) : (
          <div className="text-center py-16 border-2 border-dashed border-border rounded-2xl">
            <p className="text-muted-foreground mb-4">The library is warming up. Be the first to publish.</p>
            <Link to="/teach"><Button className="bg-brand text-brand-foreground hover:bg-brand/90">Become an instructor</Button></Link>
          </div>
        )}
      </section>

      </main>

      <SiteFooter />
    </div>
  );
}
