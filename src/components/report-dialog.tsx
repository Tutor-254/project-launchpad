import { useState } from "react";
import { toast } from "sonner";
import { Flag } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

type Target = "review" | "question" | "answer" | "course";

export function ReportButton({ targetType, targetId }: { targetType: Target; targetId: string }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!user) return toast.error("Sign in to report");
    if (reason.trim().length < 5) return toast.error("Add a short reason");
    setBusy(true);
    const { error } = await supabase.from("reports").insert({
      reporter_id: user.id,
      target_type: targetType,
      target_id: targetId,
      reason: reason.trim(),
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Report submitted — thank you");
    setOpen(false);
    setReason("");
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="text-xs text-muted-foreground hover:text-destructive inline-flex items-center gap-1"
          aria-label="Report content"
        >
          <Flag className="size-3" /> Report
        </button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Report this {targetType}</DialogTitle>
        </DialogHeader>
        <Textarea
          rows={4}
          placeholder="What's wrong with this content?"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={submit} disabled={busy} className="bg-brand text-brand-foreground hover:bg-brand/90">Submit report</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
