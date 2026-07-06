import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { reviewEssayResponse } from "@/lib/assessment.functions";

interface EssayReviewPanelProps {
  courseId: string;
}

export function EssayReviewPanel({ courseId }: EssayReviewPanelProps) {
  const qc = useQueryClient();
  const review = useServerFn(reviewEssayResponse);
  const [overrides, setOverrides] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState<string | null>(null);

  const { data: pendingResponses, isLoading } = useQuery({
    queryKey: ["essay-review", courseId],
    queryFn: async () => {
      // Get all assessments for this course
      const { data: assessments } = await supabase
        .from("assessments")
        .select("id, type, title")
        .eq("course_id", courseId);

      if (!assessments?.length) return [];

      const assessmentIds = assessments.map((a) => a.id);

      // Get attempts pending review
      const { data: attempts } = await supabase
        .from("assessment_attempts")
        .select("id, student_id, assessment_id, submitted_at")
        .eq("state", "pending_review")
        .in("assessment_id", assessmentIds);

      if (!attempts?.length) return [];

      const attemptIds = attempts.map((a) => a.id);
      const studentIds = [...new Set(attempts.map((a) => a.student_id))];

      // Get unreleased essay responses
      const { data: responses } = await supabase
        .from("assessment_responses")
        .select(
          "id, attempt_id, question_id, response_text, ai_score, ai_feedback, needs_review, released, assessment_questions(stem, type, rubric)",
        )
        .in("attempt_id", attemptIds)
        .eq("needs_review", true)
        .eq("released", false);

      if (!responses?.length) return [];

      // Fetch student display names
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, display_name")
        .in("id", studentIds);

      const profileMap = new Map((profiles ?? []).map((p) => [p.id, p.display_name]));
      const attemptMap = new Map(attempts.map((a) => [a.id, a]));
      const assessmentMap = new Map(assessments.map((a) => [a.id, a]));

      return responses
        .filter((r: any) => r.assessment_questions?.type === "ESSAY")
        .map((r: any) => {
          const attempt = attemptMap.get(r.attempt_id);
          const assessment = attempt ? assessmentMap.get(attempt.assessment_id) : null;
          return {
            ...r,
            studentName: attempt ? (profileMap.get(attempt.student_id) ?? "Unknown") : "Unknown",
            submittedAt: attempt?.submitted_at ?? null,
            assessmentType: assessment?.type ?? "",
            assessmentTitle: assessment?.title ?? "",
          };
        });
    },
  });

  async function handleReview(responseId: string, useOverride: boolean) {
    setSubmitting(responseId);
    try {
      const overrideScore = useOverride ? parseInt(overrides[responseId] ?? "", 10) : undefined;
      if (useOverride && (isNaN(overrideScore!) || overrideScore! < 0 || overrideScore! > 100)) {
        toast.error("Override score must be 0–100");
        return;
      }
      await review({ data: { responseId, overrideScore: useOverride ? overrideScore : undefined } });
      toast.success("Response reviewed");
      qc.invalidateQueries({ queryKey: ["essay-review", courseId] });
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSubmitting(null);
    }
  }

  const TYPE_LABELS: Record<string, string> = {
    CAT_1: "CAT 1",
    CAT_2: "CAT 2",
    FINAL_EXAM: "Final Exam",
  };

  return (
    <div className="space-y-5">
      <div>
        <h3 className="font-semibold text-sm">Essay Review</h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          Review AI-flagged essay responses and approve or override the score.
        </p>
      </div>

      {isLoading && (
        <p className="text-sm text-muted-foreground py-6 text-center">Loading pending reviews…</p>
      )}

      {!isLoading && !pendingResponses?.length && (
        <div className="py-10 text-center text-sm text-muted-foreground">
          <CheckCircle2 className="size-8 mx-auto mb-2 text-green-500" />
          No essay responses pending review.
        </div>
      )}

      {pendingResponses?.map((r: any) => (
        <div key={r.id} className="border border-border rounded-xl p-4 bg-card space-y-3">
          {/* Header */}
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <div>
              <div className="font-medium text-sm">{r.studentName}</div>
              <div className="text-xs text-muted-foreground">
                {TYPE_LABELS[r.assessmentType] ?? r.assessmentType} · {r.assessmentTitle}
                {r.submittedAt && (
                  <> · {new Date(r.submittedAt).toLocaleDateString()}</>
                )}
              </div>
            </div>
            <div className="text-sm font-semibold">
              AI score: {r.ai_score !== null ? `${r.ai_score}%` : "—"}
            </div>
          </div>

          {/* Question stem */}
          <div className="text-xs text-muted-foreground">
            <span className="font-medium">Question:</span> {r.assessment_questions?.stem}
          </div>

          {/* Student response */}
          <div className="text-sm bg-secondary/40 rounded-lg p-3 whitespace-pre-wrap">
            {r.response_text ?? <em className="text-muted-foreground">No response</em>}
          </div>

          {/* AI feedback */}
          {r.ai_feedback && (
            <div className="text-xs bg-blue-50 dark:bg-blue-950/30 text-blue-800 dark:text-blue-300 rounded-lg p-2">
              <span className="font-medium">AI feedback:</span> {r.ai_feedback}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-end gap-3 flex-wrap pt-1">
            <Button
              size="sm"
              onClick={() => handleReview(r.id, false)}
              disabled={submitting === r.id}
              className="bg-brand text-brand-foreground hover:bg-brand/90"
            >
              Approve AI score ({r.ai_score ?? "—"}%)
            </Button>

            <div className="flex items-end gap-2">
              <div className="grid gap-1">
                <Label className="text-xs text-muted-foreground">Override score</Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  className="w-20 h-8 text-sm"
                  placeholder="0–100"
                  value={overrides[r.id] ?? ""}
                  onChange={(e) =>
                    setOverrides((prev) => ({ ...prev, [r.id]: e.target.value }))
                  }
                />
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleReview(r.id, true)}
                disabled={submitting === r.id || !overrides[r.id]}
              >
                Submit override
              </Button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
