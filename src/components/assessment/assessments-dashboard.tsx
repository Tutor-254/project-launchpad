import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { BookOpen, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { getAssessmentsForCourse } from "@/lib/assessment.functions";
import { QuestionBankEditor } from "./question-bank-editor";

interface AssessmentsDashboardProps {
  courseId: string;
  /** Content chunks passed down for AI generation */
  contentChunks?: Array<{ sectionTitle: string; lectureContent: string }>;
}

const TYPE_LABELS: Record<string, string> = {
  CAT_1: "CAT 1",
  CAT_2: "CAT 2",
  FINAL_EXAM: "Final Exam",
};

export function AssessmentsDashboard({ courseId, contentChunks = [] }: AssessmentsDashboardProps) {
  const getAssessments = useServerFn(getAssessmentsForCourse);
  const [openEditorId, setOpenEditorId] = useState<string | null>(null);
  const [openEditorTitle, setOpenEditorTitle] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["instructor-assessments", courseId],
    queryFn: () => getAssessments({ data: { courseId } }),
  });

  const assessments = data?.assessments ?? [];
  const openAssessment = assessments.find((a: any) => a.id === openEditorId);

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-semibold text-sm">Assessments</h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          Manage question banks for each assessment type.
        </p>
      </div>

      {isLoading && (
        <p className="text-sm text-muted-foreground py-4 text-center">Loading assessments…</p>
      )}

      {!isLoading && assessments.length === 0 && (
        <p className="text-sm text-muted-foreground py-4 text-center">
          Assessments are created automatically when the course is published.
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-3">
        {assessments.map((a: any) => (
          <div key={a.id} className="border border-border rounded-xl p-4 bg-card space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  {TYPE_LABELS[a.type] ?? a.type}
                </div>
                <div className="font-medium text-sm mt-0.5">{a.title}</div>
              </div>
            </div>

            {/* Stats row */}
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <BookOpen className="size-3" />
              <span>{a._questionCount ?? "—"} questions</span>
            </div>

            <Button
              size="sm"
              variant="outline"
              className="w-full"
              onClick={() => {
                setOpenEditorId(a.id);
                setOpenEditorTitle(`${TYPE_LABELS[a.type] ?? a.type} — Question Bank`);
              }}
            >
              Manage questions
            </Button>
          </div>
        ))}
      </div>

      {/* Question bank editor in a sheet */}
      <Sheet open={!!openEditorId} onOpenChange={(o) => !o && setOpenEditorId(null)}>
        <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{openEditorTitle}</SheetTitle>
          </SheetHeader>
          <div className="mt-6">
            {openEditorId && (
              <QuestionBankEditor
                assessmentId={openEditorId}
                courseId={courseId}
                contentChunks={contentChunks}
              />
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
