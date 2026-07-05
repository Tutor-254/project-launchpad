import { useMemo } from "react";
import { useAuth, useRoles, useApplicationStatus } from "@/hooks/use-auth";
import {
  deriveTeachPhase,
  getTeachCta,
  getHomeHeroCtas,
  canReapply,
  type TeachAudiencePhase,
  type TeachCtaConfig,
} from "@/lib/instructor-onboarding";

export function useInstructorOnboarding() {
  const { user, loading: authLoading } = useAuth();
  const { isInstructor, isAdmin, loading: rolesLoading } = useRoles(user?.id);
  const { applicationStatus, loading: appLoading } = useApplicationStatus(user?.id);

  const loading = authLoading || (!!user && (rolesLoading || appLoading));

  const phase: TeachAudiencePhase = useMemo(
    () =>
      deriveTeachPhase({
        isAuthenticated: !!user,
        isInstructor,
        applicationStatus,
      }),
    [user, isInstructor, applicationStatus],
  );

  const teachCta: TeachCtaConfig = useMemo(() => getTeachCta(phase), [phase]);
  const homeHeroCtas = useMemo(() => getHomeHeroCtas(phase), [phase]);

  const hasPendingApplication = phase === "pending";
  const canReapplyNow =
    phase === "rejected-eligible" ||
    (applicationStatus?.status === "rejected" &&
      !!applicationStatus.reviewed_at &&
      canReapply(applicationStatus.reviewed_at));

  return {
    user,
    loading,
    phase,
    isInstructor,
    isAdmin,
    applicationStatus,
    teachCta,
    homeHeroCtas,
    hasPendingApplication,
    canReapplyNow,
  };
}
