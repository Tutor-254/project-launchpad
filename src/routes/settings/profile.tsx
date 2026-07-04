import { createFileRoute, redirect } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { requireAuth } from "@/lib/auth-guards";

export const Route = createFileRoute("/settings/profile")({
  beforeLoad: async () => {
    await requireAuth("/settings/profile");
  },
  component: ProfileSettings,
});

function ProfileSettings() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [form, setForm] = useState({ display_name: "", headline: "", bio: "", username: "" });

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").eq("id", user!.id).single();
      return data;
    },
  });

  useEffect(() => {
    if (profile) setForm({
      display_name: profile.display_name ?? "",
      headline: profile.headline ?? "",
      bio: profile.bio ?? "",
      username: (profile as any).username ?? "",
    });
  }, [profile]);

  const save = useMutation({
    mutationFn: async () => {
      const clean = {
        ...form,
        username: form.username.trim() ? form.username.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "") : null,
      };
      const { error } = await supabase.from("profiles").update(clean).eq("id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Profile updated");
      qc.invalidateQueries({ queryKey: ["profile"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SiteHeader />
      <main className="max-w-2xl mx-auto px-6 py-12 w-full flex-1">
        <h1 className="font-serif text-4xl mb-2">Profile</h1>
        <p className="text-sm text-muted-foreground mb-8">How you appear to the community.</p>

        <form
          onSubmit={(e) => { e.preventDefault(); save.mutate(); }}
          className="bg-card border border-border rounded-2xl p-8 space-y-5"
        >
          <div className="grid gap-1.5">
            <Label>Display name</Label>
            <Input value={form.display_name} onChange={(e) => setForm({ ...form, display_name: e.target.value })} />
          </div>
          <div className="grid gap-1.5">
            <Label>Public username</Label>
            <Input
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              placeholder="e.g. jane-doe"
            />
            <p className="text-xs text-muted-foreground">
              Your public profile URL: <code>/u/{form.username || "your-username"}</code>. Lowercase letters, numbers, hyphens and underscores only.
            </p>
          </div>
          <div className="grid gap-1.5">
            <Label>Headline</Label>
            <Input value={form.headline} onChange={(e) => setForm({ ...form, headline: e.target.value })} placeholder="e.g. Senior product designer" />
          </div>
          <div className="grid gap-1.5">
            <Label>Bio</Label>
            <Textarea rows={5} value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} />
          </div>
          <Button type="submit" className="bg-brand text-brand-foreground hover:bg-brand/90" disabled={save.isPending}>
            Save
          </Button>
        </form>
      </main>
      <SiteFooter />
    </div>
  );
}
