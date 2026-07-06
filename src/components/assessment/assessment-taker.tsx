import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { submitAttempt } from "@/lib/assessment.functions";

interface Question {
  id: string;
  type: "MCQ" | "SHORT_ANSWER" | "ESSAY";
  stem: string;
  options?: Array<{ id: string; text: string; is_correct: boolean }> | null;
}

interface AssessmentTakerProps {
  attemptId: string;
  questions: Question[];
  assessmentTitle: string;
  onComplete: () => void;
  onClose: () => void;
}

export function AssessmentTaker({
  attemptId,
  questions,
  assessmentTitle,
  onComplete,
  onClose,
}: AssessmentTakerProps) {
  const [responses, setResponses] = useState<
    Record<string, { responseText?: string; selectedOption?: string }>
  >({});
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const submit = useServerFn(submitAttempt);

  function setOption(questionId: string, optionId: string) {
    setResponses((prev) => ({ ...prev, [questionId]: { selectedOption: optionId } }));
  }

  function setText(questionId: string, text: string) {
    setResponses((prev) => ({ ...prev, [questionId]: { responseText: text } }));
  }

  async function handleSubmit() {
    setConfirmOpen(false);
    setSubmitting(true);
    try {
      const payload = questions.map((q) => ({
        questionId: q.id,
        responseText: responses[q.id]?.responseText,
        selectedOption: responses[q.id]?.selectedOption,
      }));
      await submit({ data: { attemptId, responses: payload } });
      toast.success("Assessment submitted successfully");
      onComplete();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  const answeredCount = questions.filter((q) => {
    const r = responses[q.id];
    return r?.selectedOption || r?.responseText?.trim();
  }).length;

  return (
    <>
      <Dialog open onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{assessmentTitle}</DialogTitle>
            <p className="text-sm text-muted-foreground">
              {answeredCount}/{questions.length} questions answered
            </p>
          </DialogHeader>

          <div className="space-y-8 py-4">
            {questions.map((q, idx) => (
              <div key={q.id} className="space-y-3">
                <div className="flex gap-2">
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-wide shrink-0 mt-0.5">
                    Q{idx + 1}
                  </span>
                  <p className="text-sm font-medium leading-relaxed">{q.stem}</p>
                </div>

                {q.type === "MCQ" && q.options && (
                  <RadioGroup
                    value={responses[q.id]?.selectedOption ?? ""}
                    onValueChange={(v) => setOption(q.id, v)}
                    className="pl-6 space-y-2"
                  >
                    {q.options.map((opt) => (
                      <div key={opt.id} className="flex items-center gap-2">
                        <RadioGroupItem value={opt.id} id={`${q.id}-${opt.id}`} />
                        <Label htmlFor={`${q.id}-${opt.id}`} className="text-sm cursor-pointer">
                          {opt.text}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                )}

                {q.type === "SHORT_ANSWER" && (
                  <Textarea
                    placeholder="Write your answer here…"
                    rows={4}
                    className="pl-6 text-sm"
                    value={responses[q.id]?.responseText ?? ""}
                    onChange={(e) => setText(q.id, e.target.value)}
                  />
                )}

                {q.type === "ESSAY" && (
                  <Textarea
                    placeholder="Write your essay here…"
                    rows={8}
                    className="pl-6 text-sm"
                    value={responses[q.id]?.responseText ?? ""}
                    onChange={(e) => setText(q.id, e.target.value)}
                  />
                )}
              </div>
            ))}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={onClose} disabled={submitting}>
              Save &amp; exit
            </Button>
            <Button
              onClick={() => setConfirmOpen(true)}
              disabled={submitting || answeredCount === 0}
              className="bg-brand text-brand-foreground hover:bg-brand/90"
            >
              {submitting ? "Submitting…" : "Submit assessment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Submit assessment?</AlertDialogTitle>
            <AlertDialogDescription>
              You have answered {answeredCount} of {questions.length} questions. Once submitted you
              cannot change your responses.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Go back</AlertDialogCancel>
            <AlertDialogAction onClick={handleSubmit}>Submit</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
