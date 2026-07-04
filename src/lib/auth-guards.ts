import { redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

/**
 * Shared guard helpers used in route `beforeLoad` hooks.
 * Each helper throws a redirect if the condition isn't met.
 */

export async function requireAuth(currentPath: string) {
  const { data } = await supabase.auth.getSession();
  if (!data.session) {
    throw redirect({ to: "/auth", search: { redirect: currentPath } });
  }
  return data.session;
}

export async function requireRole(userId: string, role: "instructor" | "admin") {
  const { data } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", role)
    .maybeSingle();

  return !!data;
}

export async function requireNoApplicationPending(userId: string): Promise<void> {
  const { data } = await supabase
    .from("instructor_applications")
    .select("id")
    .eq("user_id", userId)
    .eq("status", "pending")
    .maybeSingle();

  if (data) {
    throw redirect({ to: "/apply" });
  }
}
