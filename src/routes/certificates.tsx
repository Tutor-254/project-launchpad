import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { Award } from "lucide-react";
import { requireAuth } from "@/lib/auth-guards";

export const Route = createFileRoute("/certificates")({
  beforeLoad: async () => {
    await requireAuth("/certificates");
  },
  component: CertificatesPage,
  head: () => ({
    meta: [
      { title: "My certificates — Arcane" },
      { name: "description", content: "Certificates of completion you have earned on Arcane." },
      { name: "robots", content: "noindex" },
    ],
  }),
});

function CertificatesPage() {
  const { user } = useAuth();

  const { data } = useQuery({
    queryKey: ["my-certificates", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("certificates")
        .select("id, code, issued_at, course_id, courses(title, profiles!courses_instructor_profile_fkey(display_name))")
        .order("issued_at", { ascending: false });
      return data ?? [];
    },
  });

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SiteHeader />
      <main className="max-w-4xl mx-auto px-6 py-12 w-full flex-1">
        <h1 className="font-serif text-4xl mb-1">Certificates</h1>
        <p className="text-sm text-muted-foreground mb-8">Every course you've completed on Arcane.</p>

        {data && data.length > 0 ? (
          <div className="grid gap-3">
            {data.map((c: any) => (
              <Link
                key={c.id}
                to="/verify/$code"
                params={{ code: c.code }}
                className="flex items-center gap-4 border border-border rounded-2xl p-5 bg-card hover:border-brand transition-colors"
              >
                <Award className="size-8 text-brand shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="font-serif text-lg truncate">{c.courses?.title}</div>
                  <div className="text-xs text-muted-foreground">
                    Issued {new Date(c.issued_at).toLocaleDateString()} · Code {c.code}
                  </div>
                </div>
                <span className="text-xs text-brand">View →</span>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-24 border-2 border-dashed border-border rounded-2xl">
            <Award className="size-10 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-serif text-xl mb-2">No certificates yet</h3>
            <p className="text-sm text-muted-foreground">
              Complete every lecture in a course to earn one.
            </p>
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
