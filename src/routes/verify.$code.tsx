import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { Award, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/verify/$code")({
  component: VerifyPage,
  head: ({ params }) => ({
    meta: [
      { title: `Certificate ${params.code} — Arcane` },
      { name: "description", content: `Verify Arcane certificate ${params.code}.` },
      { property: "og:title", content: `Arcane certificate ${params.code}` },
      { property: "og:description", content: "Verified certificate of completion issued by Arcane." },
      { property: "og:url", content: `/verify/${params.code}` },
      { property: "og:type", content: "article" },
    ],
    links: [{ rel: "canonical", href: `/verify/${params.code}` }],
  }),
});

function VerifyPage() {
  const { code } = Route.useParams();

  const { data, isLoading } = useQuery({
    queryKey: ["cert", code],
    queryFn: async () => {
      const { data: cert } = await supabase
        .from("certificates")
        .select("id, code, issued_at, user_id, course_id, courses(title, subtitle, profiles!courses_instructor_profile_fkey(display_name))")
        .eq("code", code)
        .maybeSingle();
      if (!cert) return null;
      const { data: learner } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("id", cert.user_id)
        .maybeSingle();
      return { ...cert, learner };
    },
  });

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <div className="print:hidden"><SiteHeader /></div>
      <main className="flex-1 max-w-3xl mx-auto w-full px-6 py-12">
        {isLoading ? (
          <p className="text-center text-muted-foreground py-16">Verifying…</p>
        ) : !data ? (
          <div className="text-center py-24 border-2 border-dashed border-border rounded-2xl">
            <h1 className="font-serif text-2xl mb-2">Certificate not found</h1>
            <p className="text-sm text-muted-foreground mb-6">
              We could not find a certificate with code <code className="font-mono">{code}</code>.
            </p>
            <Link to="/" className="text-brand underline">Back home</Link>
          </div>
        ) : (
          <>
            <div className="flex justify-end mb-4 print:hidden">
              <Button variant="outline" onClick={() => window.print()} className="gap-2">
                <Printer className="size-4" /> Print
              </Button>
            </div>
            <article className="border-4 border-brand rounded-3xl p-12 bg-card text-center relative overflow-hidden">
              <div className="absolute inset-x-0 top-0 h-2 bg-brand" />
              <Award className="size-14 text-brand mx-auto mb-6" />
              <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground mb-2">Certificate of Completion</p>
              <h1 className="font-serif text-3xl md:text-4xl mb-6">Arcane</h1>
              <p className="text-sm text-muted-foreground">This certifies that</p>
              <p className="font-serif text-3xl md:text-4xl my-3">
                {(data as any).learner?.display_name ?? "Learner"}
              </p>
              <p className="text-sm text-muted-foreground">has successfully completed</p>
              <p className="font-serif text-2xl md:text-3xl italic mt-3 mb-6 text-brand">
                {(data as any).courses?.title}
              </p>
              {(data as any).courses?.subtitle && (
                <p className="text-sm text-muted-foreground max-w-lg mx-auto mb-6">
                  {(data as any).courses.subtitle}
                </p>
              )}
              <div className="flex justify-between text-xs text-muted-foreground mt-12 pt-6 border-t border-border">
                <div className="text-left">
                  <div className="font-medium">{(data as any).courses?.profiles?.display_name}</div>
                  <div>Instructor</div>
                </div>
                <div className="text-right">
                  <div className="font-medium">{new Date(data.issued_at).toLocaleDateString()}</div>
                  <div>Issued</div>
                </div>
              </div>
              <div className="mt-4 text-[10px] text-muted-foreground font-mono">
                Verify at /verify/{data.code}
              </div>
            </article>
          </>
        )}
      </main>
      <div className="print:hidden"><SiteFooter /></div>
    </div>
  );
}
