import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, useRoles } from "@/hooks/use-auth";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Stars } from "@/components/reviews-section";
import { EyeOff, Trash2, ShieldOff, CheckCircle2, XCircle } from "lucide-react";
import { requireAuth } from "@/lib/auth-guards";
import { getPassMark, updatePassMark } from "@/lib/assessment.functions";
import { getScreeningPassThreshold, updateScreeningPassThreshold } from "@/lib/screening.functions";

export const Route = createFileRoute("/admin")({
  beforeLoad: async () => {
    await requireAuth("/admin");
  },
  component: AdminConsole,
});

function AdminConsole() {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: rolesLoading } = useRoles(user?.id);

  const gateLoading = authLoading || rolesLoading;

  // Pending count for badge
  const { data: pendingCount } = useQuery({
    queryKey: ["admin-applications-pending-count"],
    enabled: !!user && isAdmin,
    queryFn: async () => {
      const { count } = await supabase
        .from("instructor_applications")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending");
      return count ?? 0;
    },
    refetchInterval: 30_000,
  });

  if (gateLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <SiteHeader />
        <main className="flex-1 flex items-center justify-center">
          <p className="text-sm text-muted-foreground">Loading admin console…</p>
        </main>
        <SiteFooter />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <SiteHeader />
        <main className="flex-1 flex items-center justify-center px-6">
          <div className="max-w-md text-center">
            <h1 className="font-serif text-2xl mb-2">Admin access required</h1>
            <p className="text-sm text-muted-foreground">
              Your account does not have the admin role. Ask a project owner to grant it in Supabase.
            </p>
          </div>
        </main>
        <SiteFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SiteHeader />
      <main className="max-w-6xl mx-auto px-6 py-12 w-full flex-1">
        <h1 className="font-serif text-4xl mb-2">Admin console</h1>
        <p className="text-sm text-muted-foreground mb-8">Moderate community content and unpublish courses.</p>

        <Tabs defaultValue="reviews">
          <TabsList>
            <TabsTrigger value="reviews">Reviews</TabsTrigger>
            <TabsTrigger value="questions">Questions</TabsTrigger>
            <TabsTrigger value="courses">Courses</TabsTrigger>
            <TabsTrigger value="applications" className="relative">
              Applications
              {(pendingCount ?? 0) > 0 && (
                <span className="ml-1.5 inline-flex items-center justify-center size-4 rounded-full bg-brand text-brand-foreground text-[10px] font-bold">
                  {pendingCount}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="passmark">Pass Mark</TabsTrigger>
            <TabsTrigger value="screening-threshold">Screening Threshold</TabsTrigger>
          </TabsList>
          <TabsContent value="reviews" className="mt-6"><ReviewsMod /></TabsContent>
          <TabsContent value="questions" className="mt-6"><QuestionsMod /></TabsContent>
          <TabsContent value="courses" className="mt-6"><CoursesMod /></TabsContent>
          <TabsContent value="applications" className="mt-6"><ApplicationsMod /></TabsContent>
          <TabsContent value="passmark" className="mt-6"><PassMarkConfig /></TabsContent>
          <TabsContent value="screening-threshold" className="mt-6"><ScreeningThresholdConfig /></TabsContent>
        </Tabs>
      </main>
      <SiteFooter />
    </div>
  );
}

// ─── Applications Mod ──────────────────────────────────────────────────────────

type AppStatusFilter = "pending" | "approved" | "rejected" | "all";

function ApplicationsMod() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<AppStatusFilter>("pending");
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-applications", filter],
    queryFn: async () => {
      let q = supabase
        .from("instructor_applications")
        .select(
          "id, status, expertise, background, portfolio_url, statement, created_at, reviewed_at, rejection_reason, user_id"
        )
        .order("created_at", { ascending: false })
        .limit(100);
      if (filter !== "all") q = q.eq("status", filter);
      const { data: apps, error: appsErr } = await q;
      if (appsErr) throw appsErr;
      if (!apps?.length) return [];

      const userIds = [...new Set(apps.map((a) => a.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, display_name")
        .in("id", userIds);

      const nameByUser = new Map((profiles ?? []).map((p) => [p.id, p.display_name]));

      return apps.map((app) => ({
        ...app,
        applicant_name: nameByUser.get(app.user_id) ?? "Unknown user",
      }));
    },
  });

  const approve = useMutation({
    mutationFn: async (applicationId: string) => {
      const { error } = await supabase.rpc("approve_instructor_application", {
        application_id: applicationId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Application approved");
      qc.invalidateQueries({ queryKey: ["admin-applications"] });
      qc.invalidateQueries({ queryKey: ["admin-applications-pending-count"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const reject = useMutation({
    mutationFn: async ({ applicationId, reason }: { applicationId: string; reason: string }) => {
      const { error } = await supabase.rpc("reject_instructor_application", {
        application_id: applicationId,
        reason: reason || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Application rejected");
      setRejectingId(null);
      setRejectReason("");
      qc.invalidateQueries({ queryKey: ["admin-applications"] });
      qc.invalidateQueries({ queryKey: ["admin-applications-pending-count"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const statusFilters: AppStatusFilter[] = ["pending", "approved", "rejected", "all"];

  return (
    <div>
      {/* Status filter bar */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {statusFilters.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 text-xs rounded-full border capitalize transition-colors ${
              filter === f
                ? "bg-brand text-brand-foreground border-brand"
                : "border-border hover:border-brand/50"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Applications list */}
      <div className="space-y-4">
        {isLoading && (
          <p className="text-sm text-muted-foreground py-8 text-center">Loading applications…</p>
        )}
        {error && (
          <p className="text-sm text-destructive py-8 text-center">
            Failed to load applications: {(error as Error).message}
          </p>
        )}
        {!isLoading && !error && data?.length === 0 && (
          <p className="text-sm text-muted-foreground py-8 text-center">
            No {filter !== "all" ? filter : ""} applications found.
          </p>
        )}
        {data?.map((app: any) => (
          <div key={app.id} className="border border-border rounded-xl p-5 bg-card space-y-3">
            {/* Header */}
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="font-medium text-sm">
                  {app.applicant_name}
                </div>
                <div className="text-xs text-muted-foreground">
                  Submitted {new Date(app.created_at).toLocaleDateString()}
                  {app.reviewed_at &&
                    ` · Reviewed ${new Date(app.reviewed_at).toLocaleDateString()}`}
                </div>
              </div>
              <span
                className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                  app.status === "pending"
                    ? "border-amber-400 text-amber-600 bg-amber-50 dark:bg-amber-950/30"
                    : app.status === "pending_screening"
                      ? "border-blue-400 text-blue-600 bg-blue-50 dark:bg-blue-950/30"
                      : app.status === "approved"
                        ? "border-green-400 text-green-600 bg-green-50 dark:bg-green-950/30"
                        : "border-red-400 text-red-600 bg-red-50 dark:bg-red-950/30"
                }`}
              >
                {app.status}
              </span>
            </div>

            {/* Application body */}
            <div className="grid gap-2 text-sm">
              <div>
                <span className="text-muted-foreground text-xs font-medium uppercase tracking-wide">Expertise</span>
                <p className="mt-0.5">{app.expertise}</p>
              </div>
              <div>
                <span className="text-muted-foreground text-xs font-medium uppercase tracking-wide">Background</span>
                <p className="mt-0.5 text-sm text-muted-foreground leading-relaxed line-clamp-3">
                  {app.background}
                </p>
              </div>
              {app.portfolio_url && (
                <div>
                  <span className="text-muted-foreground text-xs font-medium uppercase tracking-wide">Portfolio</span>
                  <a
                    href={app.portfolio_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-0.5 block text-brand hover:underline text-sm truncate"
                  >
                    {app.portfolio_url}
                  </a>
                </div>
              )}
              <div>
                <span className="text-muted-foreground text-xs font-medium uppercase tracking-wide">Teaching statement</span>
                <p className="mt-0.5 text-sm text-muted-foreground leading-relaxed line-clamp-4">
                  {app.statement}
                </p>
              </div>
            </div>

            {/* Actions — only for pending */}
            {app.status === "pending" && (
              <div className="border-t border-border pt-3 space-y-3">
                {rejectingId === app.id ? (
                  <div className="space-y-2">
                    <Textarea
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      placeholder="Optional rejection reason (visible to applicant)…"
                      rows={3}
                      className="text-sm"
                    />
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setRejectingId(null);
                          setRejectReason("");
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        disabled={reject.isPending}
                        onClick={() =>
                          reject.mutate({ applicationId: app.id, reason: rejectReason })
                        }
                      >
                        <XCircle className="size-3.5 mr-1" />
                        Confirm Reject
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="bg-brand text-brand-foreground hover:bg-brand/90"
                      disabled={approve.isPending}
                      onClick={() => approve.mutate(app.id)}
                    >
                      <CheckCircle2 className="size-3.5 mr-1" />
                      Approve
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setRejectingId(app.id)}
                    >
                      <XCircle className="size-3.5 mr-1" />
                      Reject
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Show rejection reason for rejected apps */}
            {app.status === "rejected" && app.rejection_reason && (
              <div className="border-t border-border pt-3">
                <p className="text-xs text-muted-foreground">
                  <span className="font-medium">Reason: </span>
                  {app.rejection_reason}
                </p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Reviews Mod ───────────────────────────────────────────────────────────────

function ReviewsMod() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<"all" | "hidden">("all");
  const { data } = useQuery({
    queryKey: ["admin-reviews", filter],
    queryFn: async () => {
      let q = supabase.from("reviews").select("id,rating,comment,hidden,created_at,course_id,user_id, courses(title), profiles!reviews_user_profile_fkey(display_name)").order("created_at", { ascending: false }).limit(100);
      if (filter === "hidden") q = q.eq("hidden", true);
      const { data } = await q;
      return data ?? [];
    },
  });

  const toggle = useMutation({
    mutationFn: async ({ id, hidden }: { id: string; hidden: boolean }) => {
      const { error } = await supabase.from("reviews").update({ hidden }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-reviews"] }),
    onError: (e: Error) => toast.error(e.message),
  });
  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("reviews").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-reviews"] }),
  });

  return (
    <div>
      <FilterBar filter={filter} setFilter={setFilter} />
      <div className="space-y-3">
        {data?.map((r: any) => (
          <div key={r.id} className={`border border-border rounded-xl p-4 bg-card ${r.hidden ? "opacity-60" : ""}`}>
            <div className="flex justify-between mb-2">
              <div>
                <div className="text-xs text-muted-foreground">{r.courses?.title} · {r.profiles?.display_name}</div>
                <Stars value={r.rating} className="mt-1" />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => toggle.mutate({ id: r.id, hidden: !r.hidden })}>
                  <EyeOff className="size-3.5 mr-1" /> {r.hidden ? "Unhide" : "Hide"}
                </Button>
                <Button variant="outline" size="sm" onClick={() => remove.mutate(r.id)}>
                  <Trash2 className="size-3.5 mr-1" /> Delete
                </Button>
              </div>
            </div>
            {r.comment && <p className="text-sm">{r.comment}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Questions Mod ─────────────────────────────────────────────────────────────

function QuestionsMod() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<"all" | "hidden">("all");
  const { data } = useQuery({
    queryKey: ["admin-questions", filter],
    queryFn: async () => {
      let q = supabase.from("questions").select("id,title,body,hidden,created_at,course_id, courses(title), profiles!questions_user_profile_fkey(display_name)").order("created_at", { ascending: false }).limit(100);
      if (filter === "hidden") q = q.eq("hidden", true);
      const { data } = await q;
      return data ?? [];
    },
  });
  const toggle = useMutation({
    mutationFn: async ({ id, hidden }: { id: string; hidden: boolean }) => {
      const { error } = await supabase.from("questions").update({ hidden }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-questions"] }),
  });
  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("questions").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-questions"] }),
  });
  return (
    <div>
      <FilterBar filter={filter} setFilter={setFilter} />
      <div className="space-y-3">
        {data?.map((q: any) => (
          <div key={q.id} className={`border border-border rounded-xl p-4 bg-card ${q.hidden ? "opacity-60" : ""}`}>
            <div className="flex justify-between mb-2">
              <div className="min-w-0">
                <div className="font-medium text-sm">{q.title}</div>
                <div className="text-xs text-muted-foreground">{q.courses?.title} · {q.profiles?.display_name}</div>
              </div>
              <div className="flex gap-2 shrink-0">
                <Button variant="outline" size="sm" onClick={() => toggle.mutate({ id: q.id, hidden: !q.hidden })}>
                  <EyeOff className="size-3.5 mr-1" /> {q.hidden ? "Unhide" : "Hide"}
                </Button>
                <Button variant="outline" size="sm" onClick={() => remove.mutate(q.id)}>
                  <Trash2 className="size-3.5 mr-1" /> Delete
                </Button>
              </div>
            </div>
            {q.body && <p className="text-sm text-muted-foreground">{q.body}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Courses Mod ───────────────────────────────────────────────────────────────

function CoursesMod() {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["admin-courses"],
    queryFn: async () => {
      const { data } = await supabase
        .from("courses")
        .select("id,title,status,created_at, profiles!courses_instructor_profile_fkey(display_name)")
        .order("created_at", { ascending: false })
        .limit(100);
      return data ?? [];
    },
  });
  const unpublish = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("courses").update({ status: "draft", published_at: null }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Course unpublished");
      qc.invalidateQueries({ queryKey: ["admin-courses"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <div className="space-y-3">
      {data?.map((c: any) => (
        <div key={c.id} className="border border-border rounded-xl p-4 bg-card flex justify-between items-center">
          <div>
            <div className="font-medium text-sm">{c.title}</div>
            <div className="text-xs text-muted-foreground">by {c.profiles?.display_name} · {c.status}</div>
          </div>
          {c.status === "published" && (
            <Button variant="outline" size="sm" onClick={() => unpublish.mutate(c.id)}>
              <ShieldOff className="size-3.5 mr-1" /> Unpublish
            </Button>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Shared FilterBar ──────────────────────────────────────────────────────────

function FilterBar({ filter, setFilter }: { filter: "all" | "hidden"; setFilter: (f: "all" | "hidden") => void }) {
  return (
    <div className="flex gap-2 mb-4">
      {(["all", "hidden"] as const).map((f) => (
        <button
          key={f}
          onClick={() => setFilter(f)}
          className={`px-3 py-1.5 text-xs rounded-full border ${filter === f ? "bg-brand text-brand-foreground border-brand" : "border-border"}`}
        >
          {f === "all" ? "All" : "Hidden only"}
        </button>
      ))}
    </div>
  );
}

// ─── PassMarkConfig ────────────────────────────────────────────────────────────

function PassMarkConfig() {
  const getPass = useServerFn(getPassMark);
  const updatePass = useServerFn(updatePassMark);
  const [value, setValue] = useState<string>("");
  const [saving, setSaving] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["pass-mark"],
    queryFn: () => getPass({ data: undefined }),
    onSuccess: (d: any) => setValue(String(d.passMark)),
  });

  async function handleSave() {
    const parsed = parseInt(value, 10);
    if (isNaN(parsed) || parsed < 0 || parsed > 100) {
      toast.error("Pass mark must be an integer between 0 and 100");
      return;
    }
    setSaving(true);
    try {
      await updatePass({ data: { value: parsed } });
      toast.success(`Pass mark updated to ${parsed}%`);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-sm space-y-4">
      <div>
        <h2 className="font-serif text-lg mb-1">Assessment Pass Mark</h2>
        <p className="text-sm text-muted-foreground">
          The minimum weighted score (0–100) a student must achieve to earn a certificate.
        </p>
      </div>

      <div className="flex items-end gap-3">
        <div className="grid gap-1.5">
          <label className="text-xs uppercase tracking-wide text-muted-foreground font-medium">
            Pass mark (%)
          </label>
          <Input
            type="number"
            min={0}
            max={100}
            className="w-24"
            value={isLoading ? "" : value}
            disabled={isLoading}
            onChange={(e) => setValue(e.target.value)}
            placeholder={isLoading ? "…" : "0–100"}
          />
        </div>
        <Button
          onClick={handleSave}
          disabled={saving || isLoading}
          className="bg-brand text-brand-foreground hover:bg-brand/90"
        >
          {saving ? "Saving…" : "Save"}
        </Button>
      </div>

      {data && (
        <p className="text-xs text-muted-foreground">
          Current pass mark: <span className="font-semibold">{data.passMark}%</span>
        </p>
      )}
    </div>
  );
}

// ─── ScreeningThresholdConfig ──────────────────────────────────────────────────

function ScreeningThresholdConfig() {
  const getThreshold = useServerFn(getScreeningPassThreshold);
  const updateThreshold = useServerFn(updateScreeningPassThreshold);
  const [value, setValue] = useState<string>("");
  const [saving, setSaving] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["screening-threshold"],
    queryFn: () => getThreshold({ data: undefined }),
    onSuccess: (d: any) => setValue(String(d.threshold)),
  });

  async function handleSave() {
    const parsed = parseInt(value, 10);
    if (isNaN(parsed) || parsed < 0 || parsed > 100) {
      toast.error("Screening threshold must be an integer between 0 and 100");
      return;
    }
    setSaving(true);
    try {
      await updateThreshold({ data: { threshold: parsed } });
      toast.success(`Screening threshold updated to ${parsed}%`);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-sm space-y-4">
      <div>
        <h2 className="font-serif text-lg mb-1">Instructor Screening Threshold</h2>
        <p className="text-sm text-muted-foreground">
          The minimum score (0–100) an applicant must achieve on the AI screening test to advance
          to the admin review waitlist.
        </p>
      </div>

      <div className="flex items-end gap-3">
        <div className="grid gap-1.5">
          <label className="text-xs uppercase tracking-wide text-muted-foreground font-medium">
            Threshold (%)
          </label>
          <Input
            type="number"
            min={0}
            max={100}
            className="w-24"
            value={isLoading ? "" : value}
            disabled={isLoading}
            onChange={(e) => setValue(e.target.value)}
            placeholder={isLoading ? "…" : "0–100"}
          />
        </div>
        <Button
          onClick={handleSave}
          disabled={saving || isLoading}
          className="bg-brand text-brand-foreground hover:bg-brand/90"
        >
          {saving ? "Saving…" : "Save"}
        </Button>
      </div>

      {data && (
        <p className="text-xs text-muted-foreground">
          Current threshold: <span className="font-semibold">{data.threshold}%</span>
        </p>
      )}
    </div>
  );
}
