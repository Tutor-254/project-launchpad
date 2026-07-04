import { createFileRoute, Link } from "@tanstack/react-router";
import { useAuth, useRoles, useApplicationStatus } from "@/hooks/use-auth";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { Button } from "@/components/ui/button";
import { Sparkles, Users, DollarSign, Clock, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/teach")({
  component: TeachPage,
});

function TeachPage() {
  const { user, loading } = useAuth();
  const { isInstructor, loading: rolesLoading } = useRoles(user?.id);
  const { applicationStatus, loading: appLoading } = useApplicationStatus(user?.id);

  const hasPendingApplication =
    !isInstructor && applicationStatus?.status === "pending";

  const isReady = !loading && !rolesLoading && !appLoading;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SiteHeader />
      <main className="flex-1">
        <section className="max-w-4xl mx-auto px-6 py-20 text-center">
          <span className="inline-flex items-center gap-2 text-xs font-medium bg-accent-warm/10 text-accent-warm px-3 py-1.5 rounded-full mb-6">
            <Sparkles className="size-3" /> Teach on Arcane
          </span>
          <h1 className="font-serif text-5xl md:text-6xl leading-tight mb-6">
            Share what you <span className="italic text-brand">actually know.</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-[55ch] mx-auto mb-12">
            Turn your craft into a course. Reach motivated learners worldwide and keep the majority of every sale.
          </p>

          <div className="grid md:grid-cols-3 gap-4 max-w-3xl mx-auto mb-16">
            {[
              { icon: Users, label: "Global reach", desc: "Learners from 100+ countries." },
              { icon: DollarSign, label: "Fair revenue share", desc: "Keep up to 90% of course sales." },
              { icon: Sparkles, label: "Best-in-class tools", desc: "Studio built for serious authors." },
            ].map(({ icon: Icon, label, desc }) => (
              <div key={label} className="bg-card border border-border rounded-2xl p-6 text-left">
                <div className="size-10 bg-brand/10 text-brand rounded-lg flex items-center justify-center mb-3">
                  <Icon className="size-5" />
                </div>
                <div className="font-serif font-semibold mb-1">{label}</div>
                <div className="text-xs text-muted-foreground">{desc}</div>
              </div>
            ))}
          </div>

          {/* CTA area — varies by auth + application state */}
          <div className="max-w-md mx-auto">
            {isReady && hasPendingApplication ? (
              /* Pending applicant */
              <div className="bg-card border border-border rounded-2xl p-8 text-left">
                <div className="flex items-center gap-3 mb-4">
                  <div className="size-10 bg-amber-500/10 text-amber-500 rounded-lg flex items-center justify-center">
                    <Clock className="size-5" />
                  </div>
                  <div>
                    <p className="font-serif font-semibold">Application in review</p>
                    <p className="text-xs text-muted-foreground">We'll notify you when a decision is made.</p>
                  </div>
                </div>
                <Link to="/apply">
                  <Button className="w-full h-12 bg-brand text-brand-foreground hover:bg-brand/90">
                    Check your application status <ArrowRight className="ml-2 size-4" />
                  </Button>
                </Link>
              </div>
            ) : isReady && isInstructor ? (
              /* Already an instructor */
              <div className="bg-card border border-border rounded-2xl p-8 text-center">
                <p className="font-serif text-xl mb-2">Welcome back, instructor!</p>
                <p className="text-sm text-muted-foreground mb-6">Your Studio is ready.</p>
                <Link to="/instructor">
                  <Button className="w-full h-12 bg-brand text-brand-foreground hover:bg-brand/90">
                    Go to Studio <ArrowRight className="ml-2 size-4" />
                  </Button>
                </Link>
              </div>
            ) : (
              /* Unauthenticated or authenticated without pending application */
              <div className="bg-card border border-border rounded-2xl p-8 text-left">
                <h2 className="font-serif text-2xl mb-2">Ready to share your expertise?</h2>
                <p className="text-sm text-muted-foreground mb-6">
                  Apply to become an instructor. Our team reviews applications within a few business days.
                </p>
                {user ? (
                  <Link to="/onboarding" search={{ intent: "teach" }}>
                    <Button className="w-full h-12 bg-brand text-brand-foreground hover:bg-brand/90">
                      Apply to teach <ArrowRight className="ml-2 size-4" />
                    </Button>
                  </Link>
                ) : (
                  <Link to="/auth" search={{ mode: "signup", intent: "teach" }}>
                    <Button className="w-full h-12 bg-brand text-brand-foreground hover:bg-brand/90">
                      Sign up to teach <ArrowRight className="ml-2 size-4" />
                    </Button>
                  </Link>
                )}
              </div>
            )}
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
