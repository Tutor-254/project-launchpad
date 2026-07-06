import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Award, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getAttemptResult } from "@/lib/assessment.functions";
import { Link } from "@tanstack/react-router";

interface AttemptResultViewProps {
  attemptId: string;
  courseId: string;
  isCertificateEligible?: boolean;
  certCode?: string | null;
  onClose: () => void;
}

const QUESTION_TYPE_LABELS: Record<string, string> = {
  MCQ: "Multiple Choice",
  SHORT_ANSWER: "Short Answer",
  ESSAY: "Essay",
};

export function AttemptResultView({
  attemptId,
  courseId,
  isCertificateEligible,
  certCode,
  onClose,
}: AttemptResultViewProps) {
  const getResult = useServerFn(getAttemptResult);

  const { data, isLoading, error } = useQuery({
    queryKey: ["attempt-result", attemptId],
    queryFn: () => getResult({ data: { attemptId } }),
  });

  if (isLoading) {
    return (
      <div className="p-8 text-center text-sm text-muted-foreground">Loading results…</div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8 text-center text-sm text-destructive">
        Failed to load results: {(error as Error)?.message}
      </div>
    );
  }

  const { attempt, responses } = data;
  const isPendingReview = attempt.state === "pending_review";

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="border border-border rounded-xl p-5 bg-card space-y-2">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-xs text-muted-foreground uppercase tracking-wide font-bold mb-1">
              Attempt {attempt.attempt_number} Result
            </div>
            <div className="text-2xl font-bold">
              {attempt.score !== null
                ? `${Number(attempt.score).toFixed(1)}%`
                : attempt.preliminary_score !== null
                  ? `${Number(attempt.preliminary_score).toFixed(1)}% (preliminary)`
                  : "—"}
            </div>
          </div>
          <span
            className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
              attempt.state === "released"
                ? "bg-green-50 text-green-700 border-green-200 dark:bg-green-950/30 dark:text-green-300"
                : "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/30 dark:text-purple-300"
            }`}
          >
            {attempt.state === "released" ? "Graded" : "Awaiting Review"}
          </span>
        </div>

        {isPendingReview && (
          <div className="flex items-center gap-1.5 text-xs text-purple-600 dark:text-purple-400">
            <Clock className="size-3" />
            Some essay responses are pending instructor review. Your final score will be updated once
            all responses are reviewed.
          </div>
        )}

        {attempt.preliminary_score !== null && attempt.score !== null && (
          <div className="text-xs text-muted-foreground">
            Preliminary (released responses): {Number(attempt.preliminary_score).toFixed(1)}%
          </div>
        )}
      </div>

      {/* Certificate eligibility banner */}
      {isCertificateEligible && (
        <div className="flex items-center gap-2 text-sm text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-950/30 rounded-xl px-4 py-3 border border-green-200 dark:border-green-800">
          <Award className="size-4 shrink-0" />
          <span>All assessments passed — you are eligible for a certificate!</span>
          {certCode && (
            <Link
              to="/verify/$code"
              params={{ code: certCode }}
              className="ml-auto text-xs underline"
            >
              View certificate
            </Link>
          )}
        </div>
      )}

      {/* Per-question breakdown */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold">Question breakdown</h3>
        {responses.map((r: any, idx: number) => (
          <div key={r.id} className="border border-border rounded-xl p-4 space-y-2 bg-card">
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-1 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                    Q{idx + 1} · {QUESTION_TYPE_LABELS[r.question?.type] ?? r.question?.type}
                  </span>
                  {r.needs_review && !r.released && (
                    <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-950/30 dark:text-purple-300">
                      Pending review
                    </span>
                  )}
                </div>
                <p className="text-sm">{r.question?.stem}</p>
              </div>
              {r.released && r.final_score !== null && (
                <div className="text-sm font-semibold shrink-0">{Number(r.final_score).toFixed(0)}%</div>
              )}
            </div>

            {/* Student's answer */}
            {r.response_text && (
              <div className="text-xs text-muted-foreground bg-secondary/40 rounded-lg p-2">
                <span className="font-medium">Your answer:</span> {r.response_text}
              </div>
            )}
            {r.selected_option && r.question?.options && (
              <div className="text-xs text-muted-foreground bg-secondary/40 rounded-lg p-2">
                <span className="font-medium">Your choice:</span>{" "}
                {r.question.options.find((o: any) => o.id === r.selected_option)?.text ??
                  r.selected_option}
              </div>
            )}

            {/* AI feedback — only when released */}
            {r.released && r.ai_feedback && (
              <div className="text-xs bg-blue-50 dark:bg-blue-950/30 text-blue-800 dark:text-blue-300 rounded-lg p-2">
                <span className="font-medium">Feedback:</span> {r.ai_feedback}
              </div>
            )}
          </div>
        ))}
      </div>

      <Button variant="outline" onClick={onClose}>
        Close
      </Button>
    </div>
  );
}
