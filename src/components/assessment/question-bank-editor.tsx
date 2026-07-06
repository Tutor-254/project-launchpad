import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Check, Pencil, Plus, Sparkles, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { QuestionForm } from "./question-form";
import {
  getQuestionBank,
  approveQuestion,
  rejectQuestion,
  deleteQuestion,
  generateQuestionsWithAI,
  MCQOption,
} from "@/lib/assessment.functions";

interface QuestionBankEditorProps {
  assessmentId: string;
  courseId: string;
  /** Content chunks from the course for AI generation */
  contentChunks?: Array<{ sectionTitle: string; lectureContent: string }>;
}

type EditingState = "new" | string; // string = questionId being edited

const STATUS_LABELS: Record<string, string> = {
  pending_review: "Pending review",
  approved: "Approved",
  rejected: "Rejected",
};

const STATUS_COLORS: Record<string, string> = {
  pending_review: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30",
  approved: "bg-green-50 text-green-700 border-green-200 dark:bg-green-950/30",
  rejected: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30",
};

export function QuestionBankEditor({
  assessmentId,
  courseId,
  contentChunks = [],
}: QuestionBankEditorProps) {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<EditingState | null>(null);
  const [generatingAI, setGeneratingAI] = useState(false);

  const getBank = useServerFn(getQuestionBank);
  const approve = useServerFn(approveQuestion);
  const reject = useServerFn(rejectQuestion);
  const del = useServerFn(deleteQuestion);
  const generateAI = useServerFn(generateQuestionsWithAI);

  const { data, isLoading } = useQuery({
    queryKey: ["question-bank", assessmentId],
    queryFn: () => getBank({ data: { assessmentId } }),
  });

  async function handleApprove(questionId: string) {
    try {
      await approve({ data: { questionId } });
      qc.invalidateQueries({ queryKey: ["question-bank", assessmentId] });
      toast.success("Question approved");
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  async function handleReject(questionId: string) {
    try {
      await reject({ data: { questionId } });
      qc.invalidateQueries({ queryKey: ["question-bank", assessmentId] });
      toast.success("Question rejected");
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  async function handleDelete(questionId: string) {
    if (!confirm("Delete this question?")) return;
    try {
      await del({ data: { questionId } });
      qc.invalidateQueries({ queryKey: ["question-bank", assessmentId] });
      toast.success("Question deleted");
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  async function handleGenerateAI() {
    if (!contentChunks.length) {
      toast.error("No course content available for AI generation");
      return;
    }
    setGeneratingAI(true);
    try {
      const result = await generateAI({ data: { assessmentId, contentChunks } });
      qc.invalidateQueries({ queryKey: ["question-bank", assessmentId] });
      toast.success(`${(result.generated as any[]).length} questions generated — review and approve them`);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setGeneratingAI(false);
    }
  }

  const grouped = data?.questions ?? { pending_review: [], approved: [], rejected: [] };
  const allQuestions = [
    ...grouped.pending_review,
    ...grouped.approved,
    ...grouped.rejected,
  ];

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex items-center gap-2 flex-wrap">
        <Button
          size="sm"
          variant="outline"
          onClick={() => setEditing("new")}
          disabled={editing !== null}
        >
          <Plus className="size-3.5 mr-1" /> Add manually
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={handleGenerateAI}
          disabled={generatingAI || editing !== null}
        >
          <Sparkles className="size-3.5 mr-1" />
          {generatingAI ? "Generating…" : "Generate with AI"}
        </Button>
        <span className="text-xs text-muted-foreground ml-auto">
          {grouped.approved.length} approved · {grouped.pending_review.length} pending
        </span>
      </div>

      {/* New question form */}
      {editing === "new" && (
        <QuestionForm
          assessmentId={assessmentId}
          onSaved={() => setEditing(null)}
          onCancel={() => setEditing(null)}
        />
      )}

      {isLoading && (
        <p className="text-sm text-muted-foreground text-center py-8">Loading questions…</p>
      )}

      {!isLoading && allQuestions.length === 0 && editing !== "new" && (
        <p className="text-sm text-muted-foreground text-center py-8">
          No questions yet. Add manually or generate with AI.
        </p>
      )}

      {/* Questions grouped by status */}
      {(["pending_review", "approved", "rejected"] as const).map((status) => {
        const qs = grouped[status];
        if (!qs.length) return null;
        return (
          <div key={status} className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
              {STATUS_LABELS[status]} ({qs.length})
            </h4>
            {qs.map((q: any) => (
              <div key={q.id}>
                {editing === q.id ? (
                  <QuestionForm
                    assessmentId={assessmentId}
                    initial={{
                      id: q.id,
                      type: q.type,
                      stem: q.stem,
                      options: q.options as MCQOption[] | null,
                      modelAnswer: q.model_answer,
                      rubric: q.rubric,
                      sourceRef: q.source_ref,
                    }}
                    onSaved={() => setEditing(null)}
                    onCancel={() => setEditing(null)}
                  />
                ) : (
                  <div className="border border-border rounded-xl p-4 bg-card space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full border ${STATUS_COLORS[status]}`}
                          >
                            {q.type}
                          </span>
                          {q.ai_generated && (
                            <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                              <Sparkles className="size-2.5" /> AI
                            </span>
                          )}
                        </div>
                        <p className="text-sm">{q.stem}</p>
                      </div>
                      {/* Actions */}
                      <div className="flex gap-1 shrink-0">
                        {status === "pending_review" && (
                          <>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleApprove(q.id)}
                              title="Approve"
                            >
                              <Check className="size-3.5 text-green-600" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleReject(q.id)}
                              title="Reject"
                            >
                              <X className="size-3.5 text-red-600" />
                            </Button>
                          </>
                        )}
                        {status === "rejected" && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleApprove(q.id)}
                            title="Approve"
                          >
                            <Check className="size-3.5 text-green-600" />
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setEditing(q.id)}
                          title="Edit"
                          disabled={editing !== null}
                        >
                          <Pencil className="size-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDelete(q.id)}
                          title="Delete"
                        >
                          <Trash2 className="size-3.5 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}
