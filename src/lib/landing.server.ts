/**
 * Landing Page Server Functions
 *
 * Server-side data fetching for role-specific landing page data.
 * These functions run on the server and return aggregated data for the landing page.
 */

import { supabase } from "@/integrations/supabase/client";

export type UserRole = "learner" | "facilitator" | "admin" | "shared_device";

/**
 * Fetch active course enrollment for a learner
 * Returns course name, progress %, and estimated completion time
 */
export async function getActiveEnrollment(userId: string) {
  try {
    const { data, error } = await supabase
      .from("enrollments")
      .select(
        `
        id,
        course_id,
        status,
        progress_percent,
        created_at,
        courses (
          id,
          title,
          description,
          duration_minutes
        )
      `,
      )
      .eq("user_id", userId)
      .eq("status", "active")
      .maybeSingle();

    if (error) {
      console.error("Error fetching active enrollment:", error);
      return null;
    }

    if (!data) return null;

    return {
      courseId: data.course_id,
      courseTitle: data.courses?.title || "Untitled Course",
      progressPercent: data.progress_percent || 0,
      durationMinutes: data.courses?.duration_minutes || 0,
    };
  } catch (error) {
    console.error("Error in getActiveEnrollment:", error);
    return null;
  }
}

/**
 * Count pending assessments for a learner
 * Returns count of assessments with state = 'pending' or 'submitted'
 */
export async function getPendingAssessmentCount(userId: string) {
  try {
    const { count, error } = await supabase
      .from("assessment_attempts")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .in("state", ["pending", "submitted"]);

    if (error) {
      console.error("Error fetching pending assessment count:", error);
      return 0;
    }

    return count || 0;
  } catch (error) {
    console.error("Error in getPendingAssessmentCount:", error);
    return 0;
  }
}

/**
 * Fetch recent pending assessments for a learner
 * Returns up to 3 assessments with title and due date
 */
export async function getRecentPendingAssessments(userId: string, limit: number = 3) {
  try {
    const { data, error } = await supabase
      .from("assessment_attempts")
      .select(
        `
        id,
        assessment_id,
        state,
        created_at,
        assessments (
          id,
          title,
          due_date
        )
      `,
      )
      .eq("user_id", userId)
      .in("state", ["pending", "submitted"])
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("Error fetching pending assessments:", error);
      return [];
    }

    return (data || []).map((attempt) => ({
      id: attempt.assessment_id,
      title: attempt.assessments?.title || "Untitled Assessment",
      dueDate: attempt.assessments?.due_date || null,
      state: attempt.state,
    }));
  } catch (error) {
    console.error("Error in getRecentPendingAssessments:", error);
    return [];
  }
}

/**
 * Count at-risk learners for a facilitator
 * Returns count of enrollments with at_risk = true
 */
export async function getAtRiskCount(facilitatorId: string) {
  try {
    const { count, error } = await supabase
      .from("enrollments")
      .select("id", { count: "exact", head: true })
      .eq("facilitator_id", facilitatorId)
      .eq("at_risk", true);

    if (error) {
      console.error("Error fetching at-risk count:", error);
      return 0;
    }

    return count || 0;
  } catch (error) {
    console.error("Error in getAtRiskCount:", error);
    return 0;
  }
}

/**
 * Get total learner count for a facilitator
 */
export async function getLearnerCount(facilitatorId: string) {
  try {
    const { count, error } = await supabase
      .from("enrollments")
      .select("id", { count: "exact", head: true })
      .eq("facilitator_id", facilitatorId);

    if (error) {
      console.error("Error fetching learner count:", error);
      return 0;
    }

    return count || 0;
  } catch (error) {
    console.error("Error in getLearnerCount:", error);
    return 0;
  }
}

/**
 * Get learning progress summary for a learner
 * Returns certificates earned, badges earned, overall completion %
 */
export async function getLearningProgressSummary(userId: string) {
  try {
    // Get certificates
    const { count: certificateCount, error: certError } = await supabase
      .from("certificates")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("status", "issued");

    if (certError) {
      console.error("Error fetching certificate count:", certError);
    }

    // Get badges
    const { count: badgeCount, error: badgeError } = await supabase
      .from("learner_badges")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId);

    if (badgeError) {
      console.error("Error fetching badge count:", badgeError);
    }

    return {
      certificatesEarned: certificateCount || 0,
      badgesEarned: badgeCount || 0,
    };
  } catch (error) {
    console.error("Error in getLearningProgressSummary:", error);
    return {
      certificatesEarned: 0,
      badgesEarned: 0,
    };
  }
}

/**
 * Get system health status for admins
 * Returns overall status (green/yellow/red), active user count, AI job metrics
 */
export async function getSystemHealthStatus() {
  try {
    // Get active sessions (last 24h)
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count: activeUsersCount, error: activeUsersError } = await supabase
      .from("sessions")
      .select("id", { count: "exact", head: true })
      .gte("created_at", twentyFourHoursAgo);

    if (activeUsersError) {
      console.error("Error fetching active users:", activeUsersError);
    }

    // Get recent health events
    const { data: healthEvents, error: healthError } = await supabase
      .from("platform_health_events")
      .select("status, created_at")
      .order("created_at", { ascending: false })
      .limit(1);

    if (healthError) {
      console.error("Error fetching health events:", healthError);
    }

    // Determine overall status
    const latestStatus = healthEvents?.[0]?.status || "green";
    const statusColor =
      latestStatus === "red" ? "red" : latestStatus === "yellow" ? "yellow" : "green";

    return {
      status: statusColor,
      statusMessage:
        statusColor === "red"
          ? "System issues detected"
          : statusColor === "yellow"
            ? "Minor issues detected"
            : "All systems operational",
      activeUsers: activeUsersCount || 0,
      aiJobsProcessed24h: 0, // Will be calculated based on ai_jobs table
      databaseHealthy: true,
    };
  } catch (error) {
    console.error("Error in getSystemHealthStatus:", error);
    return {
      status: "yellow",
      statusMessage: "Unable to fetch health status",
      activeUsers: 0,
      aiJobsProcessed24h: 0,
      databaseHealthy: false,
    };
  }
}

/**
 * Aggregate all landing page data for a role
 * Returns role-specific data needed for the landing page
 */
export async function getLandingPageData(userId: string, role: UserRole) {
  try {
    const data: Record<string, any> = {
      role,
      userId,
    };

    if (role === "learner" || role === "shared_device") {
      data.activeEnrollment = await getActiveEnrollment(userId);
      data.pendingAssessmentCount = await getPendingAssessmentCount(userId);
      data.recentAssessments = await getRecentPendingAssessments(userId);
      data.progressSummary = await getLearningProgressSummary(userId);
    } else if (role === "facilitator") {
      data.atRiskCount = await getAtRiskCount(userId);
      data.learnerCount = await getLearnerCount(userId);
    } else if (role === "admin") {
      data.systemHealth = await getSystemHealthStatus();
    }

    return data;
  } catch (error) {
    console.error("Error in getLandingPageData:", error);
    return {
      role,
      userId,
      error: "Failed to fetch landing page data",
    };
  }
}
