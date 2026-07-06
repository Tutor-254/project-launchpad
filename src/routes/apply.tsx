import { createFileRoute, redirect, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Clock, CheckCircle2, XCircle, Loader2, ArrowRight, RefreshCw, ClipboardList } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, useRoles, useApplicationStatus } from "@/hooks/use-auth";
import { requireAuth } from "@/lib/auth-guards";
import { Button } from "@/components/ui/button";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";

import { canReapply } from "@/lib/instructor-onboarding";

export { canReapply };

/** Returns the earliest re-apply Date (rejectedAt + 30 days). */
function reapplyDate(rejectedAt: string): Date {
  const d = new Date(rejectedAt);
  d.setDate(d.getDate() + 30);
  return d;
}

/** Formats remaining time as "Xd Yh" or "Yh Zm" etc. */
function formatCountdown(target: Date, now: Date = new Date()): string {
  const ms = target.getTime() - now.getTime();
  if (ms <= 0) return "now";
  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

// ─── Route ────────────────────────────────────────────────────────────────────

export const Route = createFileRoute("/apply")({
  beforeLoad: async () => {
    // Must be authenticated
    const session = await requireAuth("/apply");
    const userId = session.user.id;

    // Already an instructor → go to Studio
    const { data: roleRow } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "instructor")
      .maybeSingle();

    if (roleRow) throw redirect({ to: "/instructor" });

    // No application at all → redirect to onboarding
    const { data: app } = await supabase
      .from("instructor_applications")
      .select("id")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!app) throw redirect({ to: "/onboarding", search: { intent: "teach" } });
  },
  component: ApplyPage,
});

// ─── Page Component ────────────────────────────────────────────────────────────

export function ApplyPage() {
  const { user } = useAuth();
  const { isInstructor } = useRoles(user?.id);
  const { applicationStatus, loading } = useApplicationStatus(user?.id);
  const navigate = useNavigate();

  // Approved → auto-redirect after 2 s
  useEffect(() => {
    if (applicationStatus?.status === "approved" || isInstructor) {
      const t = setTimeout(() => navigate({ to: "/instructor" }), 2000);
      return () => clearTimeout(t);
    }
  }, [applicationStatus?.status, isInstructor, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <SiteHeader />
        <main className="flex-1 flex items-center justify-center">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
        </main>
        <SiteFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SiteHeader />
      <main className="flex-1 flex items-center justify-center px-4 py-16">
        {(applicationStatus?.status === "approved" || isInstructor) && (
          <ApprovedState />
        )}
        {applicationStatus?.status === "pending_screening" && (
          <ScreeningState applicationId={applicationStatus.id} />
        )}
        {applicationStatus?.status === "pending" && (
          <PendingState createdAt={applicationStatus.created_at} />
        )}
        {applicationStatus?.status === "rejected" && applicationStatus.reviewed_at && (
          <RejectedState
            rejectedAt={applicationStatus.reviewed_at}
            reason={applicationStatus.rejection_reason ?? undefined}
          />
        )}
        {!applicationStatus && (
          <div className="max-w-md text-center">
            <p className="text-muted-foreground mb-4">We couldn&apos;t load your application status.</p>
            <Link to="/onboarding" search={{ intent: "teach" }}>
              <Button className="bg-brand text-brand-foreground hover:bg-brand/90">
                Start instructor application
              </Button>
            </Link>
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}

// ─── State sub-components ──────────────────────────────────────────────────────

export function ApprovedState() {
  return (
    <div className="max-w-md w-full text-center">
      <div className="size-16 bg-green-500/10 text-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
        <CheckCircle2 className="size-8" />
      </div>
      <h1 className="font-serif text-3xl mb-3">You're approved!</h1>
      <p className="text-muted-foreground mb-2">
        Your instructor application has been approved. Welcome aboard!
      </p>
      <p className="text-sm text-muted-foreground">
        Redirecting you to your Studio in a moment…
      </p>
    </div>
  );
}

export function PendingState({ createdAt }: { createdAt: string }) {
  const submittedDate = new Date(createdAt).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="max-w-lg w-full">
      {/* Header card */}
      <div className="text-center mb-8">
        <div className="size-16 bg-brand/10 text-brand rounded-full flex items-center justify-center mx-auto mb-6">
          <Clock className="size-8" />
        </div>
        <h1 className="font-serif text-3xl mb-3">Application under review</h1>
        <p className="text-muted-foreground">
          We received your application on{" "}
          <span className="font-medium text-foreground">{submittedDate}</span>.
        </p>
      </div>

      <div className="bg-card border border-border rounded-2xl p-8 space-y-4">
        <div className="flex items-start gap-3">
          <div className="size-5 bg-brand/10 text-brand rounded-full flex items-center justify-center shrink-0 mt-0.5">
            <span className="text-[10px] font-bold">1</span>
          </div>
          <div>
            <p className="text-sm font-medium">Application submitted</p>
            <p className="text-xs text-muted-foreground">{submittedDate}</p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <div className="size-5 bg-muted text-muted-foreground rounded-full flex items-center justify-center shrink-0 mt-0.5">
            <span className="text-[10px] font-bold">2</span>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Under review</p>
            <p className="text-xs text-muted-foreground">
              Our team reviews applications within 3–5 business days.
            </p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <div className="size-5 bg-muted text-muted-foreground rounded-full flex items-center justify-center shrink-0 mt-0.5">
            <span className="text-[10px] font-bold">3</span>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Decision notified</p>
            <p className="text-xs text-muted-foreground">
              You'll receive a notification once a decision is made.
            </p>
          </div>
        </div>
      </div>

      <p className="text-center text-sm text-muted-foreground mt-6">
        While you wait, you can continue{" "}
        <Link to="/courses" className="text-brand hover:underline">
          browsing courses
        </Link>{" "}
        or{" "}
        <Link to="/learn" className="text-brand hover:underline">
          learning
        </Link>
        .
      </p>
    </div>
  );
}

export function ScreeningState({ applicationId }: { applicationId: string }) {
  return (
    <div className="max-w-lg w-full">
      <div className="text-center mb-8">
        <div className="size-16 bg-brand/10 text-brand rounded-full flex items-center justify-center mx-auto mb-6">
          <ClipboardList className="size-8" />
        </div>
        <h1 className="font-serif text-3xl mb-3">One more step</h1>
        <p className="text-muted-foreground">
          Before your application is reviewed, you need to complete a short AI-generated
          screening test based on your stated area of expertise.
        </p>
      </div>

      <div className="bg-card border border-border rounded-2xl p-8 space-y-5">
        <div className="space-y-3 text-sm text-muted-foreground">
          <div className="flex items-start gap-3">
            <div className="size-5 bg-brand/10 text-brand rounded-full flex items-center justify-center shrink-0 mt-0.5">
              <span className="text-[10px] font-bold">1</span>
            </div>
            <p>You'll be given a short set of questions tailored to your expertise.</p>
          </div>
          <div className="flex items-start gap-3">
            <div className="size-5 bg-brand/10 text-brand rounded-full flex items-center justify-center shrink-0 mt-0.5">
              <span className="text-[10px] font-bold">2</span>
            </div>
            <p>Answer each question to the best of your ability — there's no time limit.</p>
          </div>
          <div className="flex items-start gap-3">
            <div className="size-5 bg-brand/10 text-brand rounded-full flex items-center justify-center shrink-0 mt-0.5">
              <span className="text-[10px] font-bold">3</span>
            </div>
            <p>
              If you pass, your application moves to admin review. If not, you'll see detailed
              feedback and can reapply after 30 days.
            </p>
          </div>
        </div>

        <Link to="/screening" search={{ applicationId }}>
          <Button className="w-full bg-brand text-brand-foreground hover:bg-brand/90 mt-2">
            Start screening test <ArrowRight className="ml-2 size-4" />
          </Button>
        </Link>
      </div>

      <p className="text-center text-sm text-muted-foreground mt-6">
        While you prepare, feel free to{" "}
        <Link to="/courses" className="text-brand hover:underline">
          browse courses
        </Link>
        .
      </p>
    </div>
  );
}

export function RejectedState({
  rejectedAt,
  reason,
}: {
  rejectedAt: string;
  reason?: string;
}) {
  const [now, setNow] = useState(new Date());

  // Tick every minute to update the countdown
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);

  const eligible = canReapply(rejectedAt, now);
  const earliest = reapplyDate(rejectedAt);
  const countdown = formatCountdown(earliest, now);

  const earliestStr = earliest.toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="max-w-lg w-full">
      <div className="text-center mb-8">
        <div className="size-16 bg-destructive/10 text-destructive rounded-full flex items-center justify-center mx-auto mb-6">
          <XCircle className="size-8" />
        </div>
        <h1 className="font-serif text-3xl mb-3">Application not approved</h1>
        <p className="text-muted-foreground">
          Unfortunately your application wasn't successful this time.
        </p>
      </div>

      <div className="bg-card border border-border rounded-2xl p-8 space-y-6">
        {/* Reason */}
        <div>
          <p className="text-sm font-medium mb-1">Reviewer's feedback</p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {reason ??
              "No specific reason was provided. Please review our instructor guidelines before reapplying."}
          </p>
        </div>

        {/* Reapply cooldown */}
        <div className="border-t border-border pt-5">
          <p className="text-sm font-medium mb-1">Earliest re-application</p>
          <p className="text-sm text-muted-foreground mb-4">
            {eligible
              ? "You are now eligible to reapply."
              : `You can reapply on ${earliestStr} (in ${countdown}).`}
          </p>

          {eligible ? (
            <Link to="/onboarding" search={{ intent: "teach" }}>
              <Button className="w-full bg-brand text-brand-foreground hover:bg-brand/90">
                Reapply now <ArrowRight className="ml-2 size-4" />
              </Button>
            </Link>
          ) : (
            <Button disabled className="w-full">
              <RefreshCw className="mr-2 size-4" />
              Reapply available {earliestStr}
            </Button>
          )}
        </div>
      </div>

      <p className="text-center text-sm text-muted-foreground mt-6">
        In the meantime, keep{" "}
        <Link to="/courses" className="text-brand hover:underline">
          building your skills
        </Link>
        .
      </p>
    </div>
  );
}
