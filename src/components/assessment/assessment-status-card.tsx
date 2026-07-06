import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Award, Clock, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";

export type AssessmentStatus =
  | "locked"
  | "available"
  | "in_progress"
  | "awaiting_review"
  | "passed"
  | "failed";

interface AssessmentStatusCardProps {
  type: "CAT_1" | "CAT_2" | "FINAL_EXAM";
  title: string;
  status: AssessmentStatus;
  completionPct: number;
  threshold: number;
  attemptCount: number;
  maxAttempts: number;
  cooldownActive: boolean;
  cooldownEndsAt: string | null;
  score?: number | null;
  isCertificateEligible?: boolean;
  onStart?: () => void;
  onViewResult?: () => void;
}

const STATUS_LABELS: Record<AssessmentStatus, string> = {
  locked: "Locked",
  available: "Available",
  in_progress: "In Progress",
  awaiting_review: "Awaiting Review",
  passed: "Passed",
  failed: "Failed",
};

const STATUS_COLORS: Record<AssessmentStatus, string> = {
  locked: "bg-muted text-muted-foreground border-border",
  available: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-300",
  in_progress: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-300",
  awaiting_review: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/30 dark:text-purple-300",
  passed: "bg-green-50 text-green-700 border-green-200 dark:bg-green-950/30 dark:text-green-300",
  failed: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-300",
};

const TYPE_LABELS: Record<string, string> = {
  CAT_1: "CAT 1",
  CAT_2: "CAT 2",
  FINAL_EXAM: "Final Exam",
};

function formatCountdown(endsAt: string): string {
  const ms = new Date(endsAt).getTime() - Date.now();
  if (ms <= 0) return "0d 0h";
  const days = Math.floor(ms / 86_400_000);
  const hours = Math.floor((ms % 86_400_000) / 3_600_000);
  return `${days}d ${hours}h`;
}

export function AssessmentStatusCard({
  type,
  title,
  status,
  completionPct,
  threshold,
  attemptCount,
  maxAttempts,
  cooldownActive,
  cooldownEndsAt,
  score,
  isCertificateEligible,
  onStart,
  onViewResult,
}: AssessmentStatusCardProps) {
  return (
    <div className="border border-border rounded-xl p-4 bg-card space-y-3">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-0.5">
            {TYPE_LABELS[type] ?? type}
          </div>
          <div className="font-medium text-sm">{title}</div>
        </div>
        <span
          className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${STATUS_COLORS[status]}`}
        >
          {STATUS_LABELS[status]}
        </span>
      </div>

      {/* Unlock progress */}
      {status === "locked" && (
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Lock className="size-3" /> Unlocks at {threshold}% lecture completion
            </span>
            <span>{Math.round(completionPct)}%</span>
          </div>
          <Progress value={(completionPct / threshold) * 100} className="h-1.5" />
        </div>
      )}

      {/* Cooldown countdown */}
      {cooldownActive && cooldownEndsAt && (
        <div className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400">
          <Clock className="size-3" />
          Cooldown ends in {formatCountdown(cooldownEndsAt)}
        </div>
      )}

      {/* Score */}
      {(status === "passed" || status === "failed") && score !== null && score !== undefined && (
        <div className="text-sm">
          Score: <span className="font-semibold">{score.toFixed(1)}%</span>
          <span className="text-xs text-muted-foreground ml-2">
            (attempt {attemptCount}/{maxAttempts})
          </span>
        </div>
      )}

      {/* Certificate eligibility banner */}
      {isCertificateEligible && (
        <div className="flex items-center gap-1.5 text-xs text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-950/30 rounded-lg px-3 py-1.5">
          <Award className="size-3.5" />
          All assessments passed — certificate eligible!
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 pt-1">
        {status === "available" && !cooldownActive && onStart && (
          <Button size="sm" onClick={onStart} className="bg-brand text-brand-foreground hover:bg-brand/90">
            {attemptCount > 0 ? "Retry" : "Start"}
          </Button>
        )}
        {(status === "passed" || status === "failed" || status === "awaiting_review") && onViewResult && (
          <Button size="sm" variant="outline" onClick={onViewResult}>
            View result
          </Button>
        )}
      </div>
    </div>
  );
}
