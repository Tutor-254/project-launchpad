import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { saveQuestion, QuestionType, MCQOption } from "@/lib/assessment.functions";

interface QuestionFormProps {
  assessmentId: string;
  initial?: {
    id?: string;
    type: QuestionType;
    stem: string;
    options?: MCQOption[] | null;
    modelAnswer?: string | null;
    rubric?: string | null;
    sourceRef?: string | null;
  };
  onSaved: () => void;
  onCancel: () => void;
}

function generateId() {
  return Math.random().toString(36).slice(2, 8);
}

export function QuestionForm({ assessmentId, initial, onSaved, onCancel }: QuestionFormProps) {
  const qc = useQueryClient();
  const save = useServerFn(saveQuestion);

  const [type, setType] = useState<QuestionType>(initial?.type ?? "MCQ");
  const [stem, setStem] = useState(initial?.stem ?? "");
  const [rubric, setRubric] = useState(initial?.rubric ?? "");
  const [modelAnswer, setModelAnswer] = useState(initial?.modelAnswer ?? "");
  const [sourceRef, setSourceRef] = useState(initial?.sourceRef ?? "");
  const [options, setOptions] = useState<MCQOption[]>(
    initial?.options?.length
      ? initial.options
      : [
          { id: generateId(), text: "", is_correct: true },
          { id: generateId(), text: "", is_correct: false },
          { id: generateId(), text: "", is_correct: false },
          { id: generateId(), text: "", is_correct: false },
        ],
  );
  const [saving, setSaving] = useState(false);

  function addOption() {
    if (options.length >= 6) return;
    setOptions((prev) => [...prev, { id: generateId(), text: "", is_correct: false }]);
  }

  function removeOption(id: string) {
    if (options.length <= 2) return;
    setOptions((prev) => prev.filter((o) => o.id !== id));
  }

  function setOptionText(id: string, text: string) {
    setOptions((prev) => prev.map((o) => (o.id === id ? { ...o, text } : o)));
  }

  function setCorrect(id: string) {
    setOptions((prev) => prev.map((o) => ({ ...o, is_correct: o.id === id })));
  }

  async function handleSave() {
    setSaving(true);
    try {
      await save({
        data: {
          assessmentId,
          questionId: initial?.id,
          type,
          stem,
          options: type === "MCQ" ? options : undefined,
          modelAnswer: modelAnswer || undefined,
          rubric: rubric || undefined,
          sourceRef: sourceRef || undefined,
        },
      });
      toast.success(initial?.id ? "Question updated" : "Question added");
      qc.invalidateQueries({ queryKey: ["question-bank", assessmentId] });
      onSaved();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="border border-border rounded-xl p-4 bg-card space-y-4">
      {/* Type selector */}
      <div className="grid gap-1.5">
        <Label className="text-xs uppercase tracking-wide text-muted-foreground">Type</Label>
        <Select value={type} onValueChange={(v) => setType(v as QuestionType)}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="MCQ">Multiple Choice</SelectItem>
            <SelectItem value="SHORT_ANSWER">Short Answer</SelectItem>
            <SelectItem value="ESSAY">Essay</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Stem */}
      <div className="grid gap-1.5">
        <Label className="text-xs uppercase tracking-wide text-muted-foreground">Question</Label>
        <Textarea
          rows={3}
          placeholder="Enter the question text…"
          value={stem}
          onChange={(e) => setStem(e.target.value)}
        />
      </div>

      {/* MCQ Options */}
      {type === "MCQ" && (
        <div className="space-y-2">
          <Label className="text-xs uppercase tracking-wide text-muted-foreground">
            Options (select the correct one)
          </Label>
          <RadioGroup
            value={options.find((o) => o.is_correct)?.id ?? ""}
            onValueChange={setCorrect}
            className="space-y-2"
          >
            {options.map((opt) => (
              <div key={opt.id} className="flex items-center gap-2">
                <RadioGroupItem value={opt.id} id={`opt-${opt.id}`} />
                <Input
                  className="flex-1 h-8 text-sm"
                  placeholder="Option text…"
                  value={opt.text}
                  onChange={(e) => setOptionText(opt.id, e.target.value)}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeOption(opt.id)}
                  disabled={options.length <= 2}
                  className="shrink-0"
                >
                  <Trash2 className="size-3.5 text-destructive" />
                </Button>
              </div>
            ))}
          </RadioGroup>
          {options.length < 6 && (
            <Button variant="outline" size="sm" onClick={addOption}>
              <Plus className="size-3.5 mr-1" /> Add option
            </Button>
          )}
        </div>
      )}

      {/* Rubric — all types */}
      <div className="grid gap-1.5">
        <Label className="text-xs uppercase tracking-wide text-muted-foreground">
          Rubric {(type === "SHORT_ANSWER" || type === "ESSAY") && <span className="text-destructive">*</span>}
        </Label>
        <Textarea
          rows={3}
          placeholder="Grading criteria…"
          value={rubric}
          onChange={(e) => setRubric(e.target.value)}
        />
      </div>

      {/* Model answer — SHORT_ANSWER and ESSAY */}
      {(type === "SHORT_ANSWER" || type === "ESSAY") && (
        <div className="grid gap-1.5">
          <Label className="text-xs uppercase tracking-wide text-muted-foreground">
            Model answer
          </Label>
          <Textarea
            rows={4}
            placeholder="Reference answer for grading…"
            value={modelAnswer}
            onChange={(e) => setModelAnswer(e.target.value)}
          />
        </div>
      )}

      {/* Source ref */}
      <div className="grid gap-1.5">
        <Label className="text-xs uppercase tracking-wide text-muted-foreground">
          Source (optional)
        </Label>
        <Input
          placeholder="Lecture or section title this question relates to…"
          value={sourceRef}
          onChange={(e) => setSourceRef(e.target.value)}
        />
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-1">
        <Button
          onClick={handleSave}
          disabled={saving}
          className="bg-brand text-brand-foreground hover:bg-brand/90"
        >
          {saving ? "Saving…" : initial?.id ? "Update question" : "Add question"}
        </Button>
        <Button variant="outline" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
