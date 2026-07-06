import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AssessmentStatusCard, AssessmentStatus } from "./assessment-status-card";
import { AssessmentTaker } from "./assessment-taker";
import { AttemptResultView } from "./attempt-result-view";
import { getAssessmentsForCourse, startAttempt } from "@/lib/assessment.functions";

interface AssessmentPanelProps {
  courseId: string;
  certCode?: string | null;
}

type ActiveView =
  | { type: "taker"; attemptId: string; questions: any[]; title: string }
  | { type: "result"; attemptId: string };

function deriveStatus(assessment: any): AssessmentStatus {
  if (!assessment.unlocked) return "locked";
  const latest = assessment.latestAttempt;
  if (!latest) return "available";
  if (latest.state === "in_progress") return "in_progress";
  if (latest.state === "pending_review") return "awaiting_review";
  if (latest.state === "released") {
    // Determine pass/fail — we don't have pass mark here, use score presence
    return latest.score !== null ? (assessment.attemptCount <= assessment.maxAttempts ? "passed" : "failed") : "available";
  }
  return "available";
}

export function AssessmentPanel({ courseId, certCode }: AssessmentPanelProps) {
  const qc = useQueryClient();
  const [activeView, setActiveView] = useState<ActiveView | null>(null);

  const getAssessments = useServerFn(getAssessmentsForCourse);
  const start = useServerFn(startAttempt);

  const { data, isLoading, error } = useQuery({
    queryKey: ["assessments", courseId],
    queryFn: () => getAssessments({ data: { courseId } }),
  });

  async function handleStart(assessmentId: string, title: string) {
    try {
      const result = await start({ data: { assessmentId } });
      setActiveView({
        type: "taker",
        attemptId: result.attempt.id,
        questions: result.questions,
        title,
      });
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  function handleComplete() {
    setActiveView(null);
    qc.invalidateQueries({ queryKey: ["assessments", courseId] });
  }

  const assessments = data?.assessments ?? [];
  const allPassed = assessments.every((a: any) => {
    const s = deriveStatus(a);
    return s === "passed";
  });

  if (activeView?.type === "taker") {
    return (
      <AssessmentTaker
        attemptId={activeView.attemptId}
        questions={activeView.questions}
        assessmentTitle={activeView.title}
        onComplete={handleComplete}
        onClose={() => setActiveView(null)}
      />
    );
  }

  if (activeView?.type === "result") {
    return (
      <AttemptResultView
        attemptId={activeView.attemptId}
        courseId={courseId}
        isCertificateEligible={allPassed}
        certCode={certCode}
        onClose={() => setActiveView(null)}
      />
    );
  }

  return (
    <div className="space-y-4 p-4">
      <div>
        <h2 className="font-semibold text-sm">Assessments</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Pass all three assessments to earn your certificate.
        </p>
      </div>

      {isLoading && (
        <p className="text-sm text-muted-foreground py-4 text-center">Loading assessments…</p>
      )}

      {error && (
        <p className="text-sm text-destructive py-4 text-center">
          {(error as Error).message}
        </p>
      )}

      {assessments.map((assessment: any) => {
        const status = deriveStatus(assessment);
        const latest = assessment.latestAttempt;
        return (
          <AssessmentStatusCard
            key={assessment.id}
            type={assessment.type}
            title={assessment.title}
            status={status}
            completionPct={assessment.completionPct}
            threshold={assessment.threshold}
            attemptCount={assessment.attemptCount}
            maxAttempts={assessment.maxAttempts}
            cooldownActive={assessment.cooldownActive}
            cooldownEndsAt={assessment.cooldownEndsAt}
            score={latest?.score}
            isCertificateEligible={allPassed}
            onStart={() => handleStart(assessment.id, assessment.title)}
            onViewResult={
              latest ? () => setActiveView({ type: "result", attemptId: latest.id }) : undefined
            }
          />
        );
      })}
    </div>
  );
}
