import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { Loader2, CheckCircle2, XCircle, AlertTriangle, ArrowRight, BookOpen } from "lucide-react";
import { requireAuth } from "@/lib/auth-guards";
import {
  startScreening,
  submitScreening,
  type ScreeningQuestion,
  type ScreeningAttemptState,
  type ScreeningResultQuestion,
} from "@/lib/screening.functions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";

// ─── Search schema ────────────────────────────────────────────────────────────

const searchSchema = z.object({
  applicationId: z.string().min(1),
});

// ─── Route ────────────────────────────────────────────────────────────────────

export const Route = createFileRoute("/screening")({
  validateSearch: searchSchema,
  beforeLoad: async () => {
    await requireAuth("/screening");
  },
  component: ScreeningPage,
});

// ─── Types ────────────────────────────────────────────────────────────────────

interface SubmitResult {
  passed: boolean;
  score: number;
  feedback: Array<{ questionId: string; aiScore: number; aiFeedback: string }>;
}

// ─── Page Component ────────────────────────────────────────────────────────────

function ScreeningPage() {
  const { applicationId } = Route.useSearch();

  // Attempt state
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<ScreeningQuestion[]>([]);
  const [attemptState, setAttemptState] = useState<ScreeningAttemptState | null>(null);

  // Responses keyed by questionId
  const [responses, setResponses] = useState<Record<string, string>>({});

  // Submit result state
  const [submitResult, setSubmitResult] = useState<SubmitResult | null>(null);
  const [resultQuestions, setResultQuestions] = useState<ScreeningResultQuestion[]>([]);

  // Loading / error state
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── On mount: call startScreening ──────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const result = await startScreening({ data: { applicationId } });
        if (cancelled) return;

        setAttemptId(result.attemptId);
        setQuestions(result.questions);

        // If the attempt was already completed (existing attempt that had state
        // passed/failed), we'd need getScreeningResult — but startScreening
        // returns in_progress unless already submitted. We'll detect that case
        // via the isExisting flag combined with empty questions indicating
        // we need a result view. For now, set in_progress and let submit update it.
        setAttemptState("in_progress");

        // Initialise responses map
        const initial: Record<string, string> = {};
        result.questions.forEach((q) => {
          initial[q.id] = "";
        });
        setResponses(initial);
      } catch (err) {
        if (!cancelled) setError((err as Error).message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [applicationId]);

  // ── Submit handler ─────────────────────────────────────────────────────────
  async function handleConfirmSubmit() {
    if (!attemptId) return;
    setSubmitting(true);
    setError(null);

    try {
      const responsesArray = questions.map((q) => ({
        questionId: q.id,
        ...(q.question_type === "MCQ"
          ? { selectedOption: responses[q.id] ?? "" }
          : { responseText: responses[q.id] ?? "" }),
      }));

      const result = await submitScreening({ data: { attemptId, responses: responsesArray } });

      setSubmitResult(result);
      setAttemptState(result.passed ? "passed" : "failed");

      // Build resultQuestions from local question data + feedback
      const feedbackMap = new Map(result.feedback.map((f) => [f.questionId, f]));
      const merged: ScreeningResultQuestion[] = questions.map((q) => {
        const fb = feedbackMap.get(q.id);
        return {
          questionId: q.id,
          question_stem: q.question_stem,
          question_type: q.question_type,
          response_text: responses[q.id] ?? null,
          ai_score: fb?.aiScore ?? null,
          ai_feedback: fb?.aiFeedback ?? null,
          model_answer: null,
          rubric: "",
        };
      });
      setResultQuestions(merged);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SiteHeader />
      <main className="flex-1 flex flex-col items-center px-4 py-12">
        {loading && <LoadingState />}
        {!loading && error && <ErrorState message={error} />}
        {!loading && !error && attemptState === "in_progress" && (
          <TestUI
            questions={questions}
            responses={responses}
            onResponseChange={(questionId, value) =>
              setResponses((prev) => ({ ...prev, [questionId]: value }))
            }
            onConfirmSubmit={handleConfirmSubmit}
            submitting={submitting}
            submitError={error}
          />
        )}
        {!loading && !error && (attemptState === "passed" || attemptState === "failed") && (
          <ResultUI
            passed={attemptState === "passed"}
            score={submitResult?.score ?? 0}
            questions={resultQuestions}
          />
        )}
      </main>
      <SiteFooter />
    </div>
  );
}

// ─── Loading state ─────────────────────────────────────────────────────────────

function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-24">
      <Loader2 className="size-8 animate-spin text-muted-foreground" />
      <p className="text-sm text-muted-foreground">Preparing your screening test…</p>
    </div>
  );
}

// ─── Error state ──────────────────────────────────────────────────────────────

function ErrorState({ message }: { message: string }) {
  return (
    <div className="max-w-md w-full text-center py-16">
      <div className="size-16 bg-destructive/10 text-destructive rounded-full flex items-center justify-center mx-auto mb-6">
        <AlertTriangle className="size-8" />
      </div>
      <h2 className="font-serif text-2xl mb-3">Could not load screening test</h2>
      <p className="text-sm text-muted-foreground mb-6 leading-relaxed">{message}</p>
      <Link to="/apply">
        <Button variant="outline">Back to application status</Button>
      </Link>
    </div>
  );
}

// ─── Test UI ──────────────────────────────────────────────────────────────────

interface TestUIProps {
  questions: ScreeningQuestion[];
  responses: Record<string, string>;
  onResponseChange: (questionId: string, value: string) => void;
  onConfirmSubmit: () => Promise<void>;
  submitting: boolean;
  submitError: string | null;
}

function TestUI({
  questions,
  responses,
  onResponseChange,
  onConfirmSubmit,
  submitting,
  submitError,
}: TestUIProps) {
  const answeredCount = questions.filter((q) => (responses[q.id] ?? "").trim() !== "").length;
  const allAnswered = answeredCount === questions.length;

  return (
    <div className="w-full max-w-3xl space-y-8">
      {/* Header */}
      <div>
        <h1 className="font-serif text-3xl font-semibold mb-2">Instructor Screening Test</h1>
        <div className="flex items-center gap-3 text-sm text-muted-foreground mb-4">
          <span>{questions.length} questions</span>
          <span>·</span>
          <span>{answeredCount} answered</span>
        </div>
        <Progress value={(answeredCount / Math.max(questions.length, 1)) * 100} className="h-1.5" />
      </div>

      {/* Instructions */}
      <Card>
        <CardContent className="pt-6 pb-5 space-y-2">
          <p className="text-sm font-medium">Before you begin</p>
          <ul className="text-sm text-muted-foreground space-y-1 list-disc pl-4">
            <li>This test was generated by AI based on your stated area of expertise.</li>
            <li>You have one attempt — your answers cannot be changed after submission.</li>
            <li>Each answer is scored automatically by AI against a scoring rubric.</li>
            <li>You need to score at least 70% to pass and move to admin review.</li>
          </ul>
        </CardContent>
      </Card>

      {/* Questions */}
      <div className="space-y-6">
        {questions.map((question, index) => (
          <QuestionCard
            key={question.id}
            index={index}
            question={question}
            value={responses[question.id] ?? ""}
            onChange={(val) => onResponseChange(question.id, val)}
          />
        ))}
      </div>

      {/* Submit error */}
      {submitError && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {submitError}
        </div>
      )}

      {/* Submit button */}
      <div className="flex justify-end pt-2 pb-8">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              className="bg-brand text-brand-foreground hover:bg-brand/90 px-8"
              disabled={submitting}
            >
              {submitting ? (
                <><Loader2 className="mr-2 size-4 animate-spin" /> Submitting…</>
              ) : (
                "Submit Test"
              )}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Submit your answers?</AlertDialogTitle>
              <AlertDialogDescription>
                {!allAnswered && (
                  <span className="block mb-2 text-amber-600 font-medium">
                    You have {questions.length - answeredCount} unanswered question
                    {questions.length - answeredCount > 1 ? "s" : ""}.
                  </span>
                )}
                Are you sure? You cannot change your answers after submitting.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={onConfirmSubmit}
                className="bg-brand text-brand-foreground hover:bg-brand/90"
              >
                Confirm &amp; Submit
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}

// ─── Single question card ─────────────────────────────────────────────────────

interface QuestionCardProps {
  index: number;
  question: ScreeningQuestion;
  value: string;
  onChange: (val: string) => void;
}

function QuestionCard({ index, question, value, onChange }: QuestionCardProps) {
  return (
    <Card className={value.trim() ? "border-brand/40" : undefined}>
      <CardHeader className="pb-3">
        <div className="flex items-start gap-3">
          <span className="shrink-0 text-xs font-bold text-muted-foreground mt-0.5 w-6">
            {index + 1}.
          </span>
          <CardTitle className="text-base font-medium leading-snug">
            {question.question_stem}
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="pl-9">
        {question.question_type === "SHORT_ANSWER" && (
          <Textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Type your answer here…"
            rows={4}
            className="resize-y"
          />
        )}
        {question.question_type === "MCQ" && question.options && (
          <RadioGroup
            value={value}
            onValueChange={onChange}
            className="space-y-2"
          >
            {question.options.map((opt) => (
              <div key={opt.id} className="flex items-center gap-3">
                <RadioGroupItem value={opt.id} id={`${question.id}-${opt.id}`} />
                <Label
                  htmlFor={`${question.id}-${opt.id}`}
                  className="text-sm font-normal cursor-pointer"
                >
                  {opt.text}
                </Label>
              </div>
            ))}
          </RadioGroup>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Result UI ────────────────────────────────────────────────────────────────

interface ResultUIProps {
  passed: boolean;
  score: number;
  questions: ScreeningResultQuestion[];
}

function ResultUI({ passed, score, questions }: ResultUIProps) {
  // Find the rejection reason if failed — it comes from ai_feedback on the
  // lowest-scored question, but the server also returns it via the submit call.
  // We surface the score and per-question feedback here.
  const rejectionContext = !passed
    ? questions
        .filter((q) => q.ai_feedback)
        .sort((a, b) => (a.ai_score ?? 0) - (b.ai_score ?? 0))
        .slice(0, 1)
        .map((q) => q.ai_feedback)
        .join("")
    : null;

  return (
    <div className="w-full max-w-3xl space-y-8">
      {/* Hero result card */}
      <div
        className={`rounded-2xl border p-8 text-center ${
          passed
            ? "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/30"
            : "border-destructive/30 bg-destructive/5"
        }`}
      >
        <div
          className={`size-16 rounded-full flex items-center justify-center mx-auto mb-5 ${
            passed ? "bg-green-500/15 text-green-600" : "bg-destructive/15 text-destructive"
          }`}
        >
          {passed ? <CheckCircle2 className="size-8" /> : <XCircle className="size-8" />}
        </div>

        <h1 className="font-serif text-3xl mb-2">
          {passed ? "You passed!" : "Test not passed"}
        </h1>

        {/* Score */}
        <div className="flex items-center justify-center gap-2 mb-4">
          <span className="text-4xl font-bold">{score}%</span>
          <Badge
            variant={passed ? "default" : "destructive"}
            className={passed ? "bg-green-600" : undefined}
          >
            {passed ? "Pass" : "Fail"}
          </Badge>
        </div>

        <Progress
          value={score}
          className={`h-2 max-w-xs mx-auto mb-6 ${passed ? "[&>*]:bg-green-600" : ""}`}
        />

        {passed ? (
          <>
            <p className="text-sm text-muted-foreground mb-6">
              Your application is now in review. Our team will be in touch shortly.
            </p>
            <Link to="/apply">
              <Button className="bg-brand text-brand-foreground hover:bg-brand/90">
                Continue to application status <ArrowRight className="ml-2 size-4" />
              </Button>
            </Link>
          </>
        ) : (
          <>
            <p className="text-sm text-muted-foreground mb-3">
              Unfortunately, your score didn&apos;t meet the passing threshold this time.
            </p>
            {rejectionContext && (
              <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto leading-relaxed">
                {rejectionContext}
              </p>
            )}
            <p className="text-xs text-muted-foreground mb-6">
              We recommend reviewing the subject matter thoroughly before reapplying. You may reapply
              after a 30-day cooldown period.
            </p>
            <div className="flex items-center justify-center gap-3 flex-wrap">
              <Link to="/courses">
                <Button variant="outline">
                  <BookOpen className="mr-2 size-4" />
                  Browse learning resources
                </Button>
              </Link>
              <Link to="/apply">
                <Button variant="ghost" className="text-muted-foreground">
                  View application status
                </Button>
              </Link>
            </div>
          </>
        )}
      </div>

      {/* Per-question feedback */}
      {questions.length > 0 && (
        <div className="space-y-4">
          <h2 className="font-serif text-xl font-semibold">Question Feedback</h2>
          {questions.map((q, index) => (
            <FeedbackCard key={q.questionId} index={index} question={q} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Per-question feedback card ───────────────────────────────────────────────

interface FeedbackCardProps {
  index: number;
  question: ScreeningResultQuestion;
}

function FeedbackCard({ index, question }: FeedbackCardProps) {
  const score = question.ai_score ?? 0;
  const scoreColor =
    score >= 70 ? "text-green-600" : score >= 40 ? "text-amber-600" : "text-destructive";

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-2 flex-1 min-w-0">
            <span className="shrink-0 text-xs font-bold text-muted-foreground mt-0.5 w-6">
              {index + 1}.
            </span>
            <p className="text-sm font-medium leading-snug">{question.question_stem}</p>
          </div>
          {question.ai_score !== null && (
            <span className={`text-sm font-bold shrink-0 ${scoreColor}`}>{score}%</span>
          )}
        </div>
      </CardHeader>
      <CardContent className="pl-8 space-y-3">
        {/* User's answer */}
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
            Your answer
          </p>
          <p className="text-sm bg-muted/50 rounded-md px-3 py-2 whitespace-pre-wrap">
            {question.response_text?.trim() || (
              <span className="italic text-muted-foreground">No answer provided</span>
            )}
          </p>
        </div>

        {/* AI feedback */}
        {question.ai_feedback && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
              AI Feedback
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed">{question.ai_feedback}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
