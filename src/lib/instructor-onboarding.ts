import type { ApplicationStatus } from "@/hooks/use-auth";

/** Where a user sits in the instructor application funnel (orthogonal to admin). */
export type TeachAudiencePhase =
  | "guest"
  | "instructor"
  | "pending"
  | "rejected-cooldown"
  | "rejected-eligible"
  | "eligible";

export type TeachCtaConfig = {
  phase: TeachAudiencePhase;
  label: string;
  description: string;
  to: string;
  search?: { intent?: "teach" | "learn"; mode?: "signup" | "signin" };
  tone: "brand" | "amber" | "muted";
};

/**
 * Returns true iff `now` is at or after `rejectedAt` + 30 days.
 */
export function canReapply(rejectedAt: string, now: Date = new Date()): boolean {
  const cooldownEnd = new Date(rejectedAt);
  cooldownEnd.setDate(cooldownEnd.getDate() + 30);
  return now >= cooldownEnd;
}

export function deriveTeachPhase(input: {
  isAuthenticated: boolean;
  isInstructor: boolean;
  applicationStatus: ApplicationStatus | null;
}): TeachAudiencePhase {
  const { isAuthenticated, isInstructor, applicationStatus } = input;

  if (!isAuthenticated) return "guest";
  if (isInstructor) return "instructor";

  switch (applicationStatus?.status) {
    case "pending":
      return "pending";
    case "rejected":
      if (applicationStatus.reviewed_at && canReapply(applicationStatus.reviewed_at)) {
        return "rejected-eligible";
      }
      return "rejected-cooldown";
    default:
      return "eligible";
  }
}

export function getTeachCta(phase: TeachAudiencePhase): TeachCtaConfig {
  switch (phase) {
    case "guest":
      return {
        phase,
        label: "Sign up to teach",
        description: "Create a free account and apply to become an instructor.",
        to: "/auth",
        search: { mode: "signup", intent: "teach" },
        tone: "brand",
      };
    case "instructor":
      return {
        phase,
        label: "Go to Studio",
        description: "Manage your courses, analytics, and payouts.",
        to: "/instructor",
        tone: "brand",
      };
    case "pending":
      return {
        phase,
        label: "Application pending",
        description: "Your application is under review. Check status for updates.",
        to: "/apply",
        tone: "amber",
      };
    case "rejected-cooldown":
      return {
        phase,
        label: "Application status",
        description: "View feedback and when you can reapply.",
        to: "/apply",
        tone: "muted",
      };
    case "rejected-eligible":
      return {
        phase,
        label: "Reapply to teach",
        description: "You're eligible to submit a new instructor application.",
        to: "/onboarding",
        search: { intent: "teach" },
        tone: "brand",
      };
    case "eligible":
      return {
        phase,
        label: "Apply to teach",
        description: "Share your expertise. Applications are reviewed within a few business days.",
        to: "/onboarding",
        search: { intent: "teach" },
        tone: "brand",
      };
  }
}

/** Primary hero CTA for the home page — learn-first for students, studio-first for instructors. */
export function getHomeHeroCtas(phase: TeachAudiencePhase): {
  primary: { label: string; to: string; search?: TeachCtaConfig["search"] };
  secondary: { label: string; to: string; search?: TeachCtaConfig["search"] };
} {
  if (phase === "instructor") {
    return {
      primary: { label: "Open Studio", to: "/instructor" },
      secondary: { label: "My Learning", to: "/learn" },
    };
  }
  if (phase === "pending" || phase === "rejected-cooldown" || phase === "rejected-eligible") {
    const teach = getTeachCta(phase);
    return {
      primary: { label: "Browse the library", to: "/courses" },
      secondary: { label: teach.label, to: teach.to, search: teach.search },
    };
  }
  return {
    primary: { label: "Browse the library", to: "/courses" },
    secondary: { label: "Teach on Arcane", to: "/teach" },
  };
}

export const ONBOARDING_INTENT_KEY = "arcane_onboarding_intent";

export function persistOnboardingIntent(intent: "learn" | "teach") {
  if (typeof sessionStorage !== "undefined") {
    sessionStorage.setItem(ONBOARDING_INTENT_KEY, intent);
  }
}

export function consumeOnboardingIntent(): "learn" | "teach" | null {
  if (typeof sessionStorage === "undefined") return null;
  const value = sessionStorage.getItem(ONBOARDING_INTENT_KEY);
  sessionStorage.removeItem(ONBOARDING_INTENT_KEY);
  return value === "teach" || value === "learn" ? value : null;
}
