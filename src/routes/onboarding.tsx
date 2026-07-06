import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { z } from "zod";
import { toast } from "sonner";
import {
  GraduationCap,
  BookOpen,
  ArrowRight,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { canReapply } from "@/lib/instructor-onboarding";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

const searchSchema = z.object({
  intent: z.enum(["learn", "teach"]).optional().default("learn"),
});

export const Route = createFileRoute("/onboarding")({
  validateSearch: searchSchema,
  beforeLoad: async ({ search }) => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) return;

    const userId = session.user.id;
    const intent = search.intent ?? "learn";

    const { data: instructorRole } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "instructor")
      .maybeSingle();
    if (instructorRole) throw redirect({ to: "/instructor" });

    const { data: latestApp } = await supabase
      .from("instructor_applications")
      .select("id, status, reviewed_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (latestApp?.status === "pending") {
      throw redirect({ to: "/apply" });
    }

    if (latestApp?.status === "pending_screening") {
      throw redirect({ to: "/apply" });
    }

    if (latestApp?.status === "approved") {
      throw redirect({ to: "/apply" });
    }

    if (latestApp?.status === "rejected" && latestApp.reviewed_at) {
      if (!canReapply(latestApp.reviewed_at)) {
        throw redirect({ to: "/apply" });
      }
      if (intent === "teach") return;
    }

    // Teach applicants may already have a learner profile from signup
    if (intent === "teach") return;

    const { data: profile } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("id", userId)
      .maybeSingle();

    if (profile?.display_name) {
      throw redirect({ to: "/courses" });
    }
  },
  component: OnboardingPage,
});

// Pure validation helpers (also exported for tests)
export function isValidPortfolioUrl(url: string): boolean {
  if (!url) return true; // optional field — empty is valid
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export function validateApplicationForm(form: ApplicationFormState): Partial<Record<keyof ApplicationFormState, string>> {
  const errors: Partial<Record<keyof ApplicationFormState, string>> = {};

  if (!form.expertise.trim()) {
    errors.expertise = "Area of expertise is required.";
  } else if (form.expertise.length > 200) {
    errors.expertise = "Area of expertise must be 200 characters or fewer.";
  }

  if (!form.background.trim()) {
    errors.background = "Professional background is required.";
  } else if (form.background.length > 1000) {
    errors.background = "Professional background must be 1000 characters or fewer.";
  }

  if (form.portfolioUrl && !isValidPortfolioUrl(form.portfolioUrl)) {
    errors.portfolioUrl = "Please enter a valid http:// or https:// URL.";
  } else if (form.portfolioUrl && form.portfolioUrl.length > 500) {
    errors.portfolioUrl = "Portfolio URL must be 500 characters or fewer.";
  }

  if (!form.statement.trim()) {
    errors.statement = "Teaching statement is required.";
  } else if (form.statement.length < 50) {
    errors.statement = "Teaching statement must be at least 50 characters.";
  } else if (form.statement.length > 2000) {
    errors.statement = "Teaching statement must be 2000 characters or fewer.";
  }

  return errors;
}

interface ApplicationFormState {
  expertise: string;
  background: string;
  portfolioUrl: string;
  statement: string;
}

type Step = "role" | "student-profile" | "instructor-form" | "done";

function OnboardingPage() {
  const { user } = useAuth();
  const { intent } = Route.useSearch();
  const navigate = useNavigate();

  const [step, setStep] = useState<Step>("role");
  const [role, setRole] = useState<"learn" | "teach">(intent);

  // Student profile form
  const [displayName, setDisplayName] = useState(
    (user?.user_metadata?.full_name as string) ?? ""
  );
  const [interests, setInterests] = useState("");
  const [displayNameError, setDisplayNameError] = useState("");

  // Instructor application form
  const [appForm, setAppForm] = useState<ApplicationFormState>({
    expertise: "",
    background: "",
    portfolioUrl: "",
    statement: "",
  });
  const [appErrors, setAppErrors] = useState<Partial<Record<keyof ApplicationFormState, string>>>({});

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (intent === "teach") {
      setRole("teach");
      setStep("instructor-form");
    }
  }, [intent]);

  function handleRoleContinue() {
    if (role === "teach") {
      setStep("instructor-form");
    } else {
      setStep("student-profile");
    }
  }

  // Task 5.3 — student path submit
  async function handleStudentSubmit() {
    if (!displayName.trim()) {
      setDisplayNameError("Display name is required.");
      return;
    }
    setDisplayNameError("");

    if (!user) {
      navigate({ to: "/auth", search: { mode: "signup" } });
      return;
    }

    setSaving(true);
    try {
      await supabase
        .from("profiles")
        .update({
          display_name: displayName.trim(),
          bio: interests.trim() || undefined,
        })
        .eq("id", user.id);

      navigate({ to: "/courses" });
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  // Task 5.5 — instructor application submit
  async function handleApplicationSubmit() {
    const errors = validateApplicationForm(appForm);
    if (Object.keys(errors).length > 0) {
      setAppErrors(errors);
      return;
    }
    setAppErrors({});

    if (!user) {
      navigate({ to: "/auth", search: { mode: "signup" } });
      return;
    }

    setSaving(true);
    try {
      const { data, error } = await supabase
        .from("instructor_applications")
        .insert({
          user_id: user.id,
          status: "pending_screening",
          expertise: appForm.expertise.trim(),
          background: appForm.background.trim(),
          portfolio_url: appForm.portfolioUrl.trim() || null,
          statement: appForm.statement.trim(),
        })
        .select("id")
        .single();

      if (error) {
        if (error.code === "23505") {
          // Unique partial index violation — already has pending app (task 5.6)
          navigate({ to: "/apply" });
          return;
        }
        throw error;
      }

      navigate({ to: "/screening", search: { applicationId: data.id } });
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 py-12">
      {/* Logo */}
      <div className="flex items-center gap-2 mb-12">
        <div className="size-8 bg-brand rounded-lg flex items-center justify-center text-brand-foreground font-serif font-semibold text-sm">
          A
        </div>
        <span className="font-serif text-xl font-semibold tracking-tight">Arcane</span>
      </div>

      {/* Step 1 — Role Selection (Task 5.2) */}
      {step === "role" && (
        <div className="w-full max-w-lg">
          <div className="text-center mb-10">
            <h1 className="font-serif text-4xl mb-3">Welcome to Arcane</h1>
            <p className="text-muted-foreground">What brings you here?</p>
          </div>

          <div className="grid sm:grid-cols-2 gap-4 mb-8">
            <button
              onClick={() => setRole("learn")}
              className={`relative text-left p-6 rounded-2xl border-2 transition-all ${
                role === "learn"
                  ? "border-brand bg-brand/5"
                  : "border-border bg-card hover:border-brand/50"
              }`}
            >
              {role === "learn" && (
                <CheckCircle2 className="absolute top-4 right-4 size-5 text-brand" />
              )}
              <div className="size-12 bg-brand/10 text-brand rounded-xl flex items-center justify-center mb-4">
                <GraduationCap className="size-6" />
              </div>
              <div className="font-serif font-semibold text-lg mb-1">I want to learn</div>
              <div className="text-sm text-muted-foreground leading-relaxed">
                Discover courses and build skills from working experts.
              </div>
            </button>

            <button
              onClick={() => setRole("teach")}
              className={`relative text-left p-6 rounded-2xl border-2 transition-all ${
                role === "teach"
                  ? "border-brand bg-brand/5"
                  : "border-border bg-card hover:border-brand/50"
              }`}
            >
              {role === "teach" && (
                <CheckCircle2 className="absolute top-4 right-4 size-5 text-brand" />
              )}
              <div className="size-12 bg-brand/10 text-brand rounded-xl flex items-center justify-center mb-4">
                <BookOpen className="size-6" />
              </div>
              <div className="font-serif font-semibold text-lg mb-1">I want to teach</div>
              <div className="text-sm text-muted-foreground leading-relaxed">
                Share your expertise and earn from courses you create.
              </div>
            </button>
          </div>

          <Button
            onClick={handleRoleContinue}
            className="w-full h-12 bg-brand text-brand-foreground hover:bg-brand/90"
          >
            Continue <ArrowRight className="ml-2 size-4" />
          </Button>
        </div>
      )}

      {/* Step 2a — Student Profile (Task 5.3) */}
      {step === "student-profile" && (
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="font-serif text-4xl mb-3">Set up your profile</h1>
            <p className="text-muted-foreground">This is how the community sees you.</p>
          </div>

          <div className="bg-card border border-border rounded-2xl p-8 space-y-5">
            <div className="grid gap-1.5">
              <Label htmlFor="display-name">
                Display name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="display-name"
                value={displayName}
                onChange={(e) => {
                  setDisplayName(e.target.value);
                  if (displayNameError) setDisplayNameError("");
                }}
                placeholder="e.g. Wanjiru Njoroge"
              />
              {displayNameError && (
                <p className="text-xs text-destructive">{displayNameError}</p>
              )}
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="interests">
                Learning interests{" "}
                <span className="text-muted-foreground font-normal">(optional)</span>
              </Label>
              <Textarea
                id="interests"
                value={interests}
                onChange={(e) => setInterests(e.target.value)}
                placeholder="e.g. Web development, data science, design..."
                rows={3}
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => setStep("role")}
                className="flex-1"
              >
                Back
              </Button>
              <Button
                onClick={handleStudentSubmit}
                disabled={saving}
                className="flex-1 bg-brand text-brand-foreground hover:bg-brand/90"
              >
                {saving ? (
                  <><Loader2 className="mr-2 size-4 animate-spin" /> Saving...</>
                ) : (
                  "Finish setup"
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Step 2b — Instructor Application Form (Task 5.4) */}
      {step === "instructor-form" && (
        <div className="w-full max-w-xl">
          <div className="text-center mb-8">
            <h1 className="font-serif text-4xl mb-3">Apply to teach</h1>
            <p className="text-muted-foreground max-w-[45ch] mx-auto">
              Tell us about your expertise. Applications are reviewed within a few business days.
            </p>
          </div>

          <div className="bg-card border border-border rounded-2xl p-8 space-y-6">
            {/* Expertise */}
            <div className="grid gap-1.5">
              <Label htmlFor="expertise">
                Area of expertise <span className="text-destructive">*</span>
              </Label>
              <Input
                id="expertise"
                value={appForm.expertise}
                onChange={(e) => {
                  setAppForm({ ...appForm, expertise: e.target.value });
                  if (appErrors.expertise) setAppErrors({ ...appErrors, expertise: undefined });
                }}
                placeholder="e.g. Full-stack web development, Machine Learning"
                maxLength={200}
              />
              <div className="flex justify-between items-start">
                {appErrors.expertise ? (
                  <p className="text-xs text-destructive">{appErrors.expertise}</p>
                ) : <span />}
                <span className="text-xs text-muted-foreground ml-auto">
                  {appForm.expertise.length}/200
                </span>
              </div>
            </div>

            {/* Background */}
            <div className="grid gap-1.5">
              <Label htmlFor="background">
                Professional background <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="background"
                value={appForm.background}
                onChange={(e) => {
                  setAppForm({ ...appForm, background: e.target.value });
                  if (appErrors.background) setAppErrors({ ...appErrors, background: undefined });
                }}
                placeholder="Describe your work experience, credentials, and relevant achievements..."
                rows={4}
                maxLength={1000}
              />
              <div className="flex justify-between items-start">
                {appErrors.background ? (
                  <p className="text-xs text-destructive">{appErrors.background}</p>
                ) : <span />}
                <span className="text-xs text-muted-foreground ml-auto">
                  {appForm.background.length}/1000
                </span>
              </div>
            </div>

            {/* Portfolio URL */}
            <div className="grid gap-1.5">
              <Label htmlFor="portfolio-url">
                Portfolio / professional links{" "}
                <span className="text-muted-foreground font-normal">(optional)</span>
              </Label>
              <Input
                id="portfolio-url"
                type="url"
                value={appForm.portfolioUrl}
                onChange={(e) => {
                  setAppForm({ ...appForm, portfolioUrl: e.target.value });
                  if (appErrors.portfolioUrl) setAppErrors({ ...appErrors, portfolioUrl: undefined });
                }}
                placeholder="https://linkedin.com/in/yourprofile"
              />
              {appErrors.portfolioUrl && (
                <p className="text-xs text-destructive">{appErrors.portfolioUrl}</p>
              )}
            </div>

            {/* Teaching Statement */}
            <div className="grid gap-1.5">
              <Label htmlFor="statement">
                Why do you want to teach on Arcane?{" "}
                <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="statement"
                value={appForm.statement}
                onChange={(e) => {
                  setAppForm({ ...appForm, statement: e.target.value });
                  if (appErrors.statement) setAppErrors({ ...appErrors, statement: undefined });
                }}
                placeholder="Share your motivation, teaching philosophy, and what you hope to bring to learners on Arcane... (min. 50 characters)"
                rows={6}
                maxLength={2000}
              />
              <div className="flex justify-between items-start">
                {appErrors.statement ? (
                  <p className="text-xs text-destructive">{appErrors.statement}</p>
                ) : <span />}
                <span className={`text-xs ml-auto ${appForm.statement.length < 50 ? "text-muted-foreground" : "text-muted-foreground"}`}>
                  {appForm.statement.length}/2000
                </span>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => setStep("role")}
                className="flex-1"
              >
                Back
              </Button>
              <Button
                onClick={handleApplicationSubmit}
                disabled={saving}
                className="flex-1 bg-brand text-brand-foreground hover:bg-brand/90"
              >
                {saving ? (
                  <><Loader2 className="mr-2 size-4 animate-spin" /> Submitting...</>
                ) : (
                  "Submit application"
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Progress dots */}
      {step === "role" && (
        <div className="flex gap-2 mt-10">
          <div className="size-2 rounded-full bg-brand" />
          <div className="size-2 rounded-full bg-border" />
        </div>
      )}
      {(step === "student-profile" || step === "instructor-form") && (
        <div className="flex gap-2 mt-10">
          <div className="size-2 rounded-full bg-border" />
          <div className="size-2 rounded-full bg-brand" />
        </div>
      )}
    </div>
  );
}
