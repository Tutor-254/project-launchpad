import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { CourseCard } from "@/components/course-card";
import { Heart } from "lucide-react";
import { requireAuth } from "@/lib/auth-guards";

export const Route = createFileRoute("/wishlist")({
  beforeLoad: async () => {
    await requireAuth("/wishlist");
  },
  component: WishlistPage,
  head: () => ({
    meta: [
      { title: "Wishlist — Arcane" },
      { name: "description", content: "Courses you've saved for later on Arcane." },
      { name: "robots", content: "noindex" },
    ],
  }),
});

function WishlistPage() {
  const { user } = useAuth();

  const { data } = useQuery({
    queryKey: ["wishlist", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("wishlists")
        .select("created_at, courses(id,title,subtitle,thumbnail_url,price_cents,level,instructor_id, profiles!courses_instructor_profile_fkey(display_name))")
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SiteHeader />
      <main className="max-w-7xl mx-auto px-6 py-12 w-full flex-1">
        <div className="mb-10">
          <h1 className="font-serif text-4xl mb-1">Wishlist</h1>
          <p className="text-sm text-muted-foreground">Courses you've saved for later.</p>
        </div>
        {data && data.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {data.map((row: any) => row.courses && <CourseCard key={row.courses.id} course={row.courses} />)}
          </div>
        ) : (
          <div className="text-center py-24 border-2 border-dashed border-border rounded-2xl">
            <Heart className="size-10 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-serif text-xl mb-2">Your wishlist is empty</h3>
            <p className="text-sm text-muted-foreground mb-6">Tap the heart on any course to save it here.</p>
            <Link to="/courses" className="text-brand underline">Browse courses</Link>
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
