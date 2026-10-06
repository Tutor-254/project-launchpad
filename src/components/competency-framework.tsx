/**
 * Competency Framework Editor (Studio)
 * 
 * Allows instructors to create, edit, and manage competencies for their course.
 * Supports drag-to-reorder and deletion with safety warnings.
 */

import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  AlertCircle,
  Plus,
  Edit2,
  Trash2,
  GripVertical,
  Loader2,
  CheckCircle2,
  X,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type Competency = Database["public"]["Tables"]["competencies"]["Row"];
type CompetencyInsert = Database["public"]["Tables"]["competencies"]["Insert"];

type CompetencyFrameworkProps = {
  courseId: string;
};

type FormState = "idle" | "adding" | "editing";

export function CompetencyFramework({ courseId }: CompetencyFrameworkProps) {
  const [competencies, setCompetencies] = useState<Competency[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formState, setFormState] = useState<FormState>("idle");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<CompetencyInsert>>({
    title: "",
    description: "",
    observable_behaviors: [],
    success_criteria: "",
    related_job_titles: [],
  });

  const [behaviorInput, setBehaviorInput] = useState("");
  const [jobTitleInput, setJobTitleInput] = useState("");

  // Fetch competencies on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const { data, error: err } = await supabase
          .from("competencies")
          .select("*")
          .eq("course_id", courseId)
          .order("order_index", { ascending: true });

        if (err) throw new Error("Failed to load competencies");
        setCompetencies(data || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [courseId]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (editingId) {
        // Update existing
        const { error: err } = await supabase
          .from("competencies")
          .update(formData)
          .eq("id", editingId);

        if (err) throw new Error("Failed to update competency");

        // Refresh competencies
        const { data } = await supabase
          .from("competencies")
          .select("*")
          .eq("course_id", courseId)
          .order("order_index", { ascending: true });

        return data;
      } else {
        // Insert new
        const nextOrder =
          competencies.length > 0
            ? Math.max(...competencies.map((c) => c.order_index || 0)) + 1
            : 1;

        const { error: err } = await supabase
          .from("competencies")
          .insert({
            ...formData,
            course_id: courseId,
            order_index: nextOrder,
          } as CompetencyInsert);

        if (err) throw new Error("Failed to create competency");

        // Refresh competencies
        const { data } = await supabase
          .from("competencies")
          .select("*")
          .eq("course_id", courseId)
          .order("order_index", { ascending: true });

        return data;
      }
    },
    onSuccess: (data) => {
      setCompetencies(data || []);
      resetForm();
      toast.success(editingId ? "Competency updated" : "Competency created");
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to save competency");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error: err } = await supabase.from("competencies").delete().eq("id", id);

      if (err) throw new Error("Failed to delete competency");

      // Refresh competencies
      const { data } = await supabase
        .from("competencies")
        .select("*")
        .eq("course_id", courseId)
        .order("order_index", { ascending: true });

      return data;
    },
    onSuccess: (data) => {
      setCompetencies(data || []);
      setDeletingId(null);
      toast.success("Competency deleted");
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to delete competency");
    },
  });

  const reorderMutation = useMutation({
    mutationFn: async (updatedComps: Competency[]) => {
      // Update order_index for all competencies
      const updates = updatedComps.map((comp, index) => ({
        id: comp.id,
        order_index: index + 1,
      }));

      for (const update of updates) {
        const { error: err } = await supabase
          .from("competencies")
          .update({ order_index: update.order_index })
          .eq("id", update.id);

        if (err) throw new Error("Failed to reorder competencies");
      }

      return updatedComps;
    },
    onSuccess: (data) => {
      setCompetencies(data || []);
    },
  });

  const resetForm = () => {
    setFormState("idle");
    setEditingId(null);
    setFormData({
      title: "",
      description: "",
      observable_behaviors: [],
      success_criteria: "",
      related_job_titles: [],
    });
    setBehaviorInput("");
    setJobTitleInput("");
  };

  const handleEdit = (comp: Competency) => {
    setEditingId(comp.id);
    setFormData(comp);
    setFormState("editing");
  };

  const handleSubmit = () => {
    // Validate form
    if (!formData.title?.trim()) {
      toast.error("Title is required");
      return;
    }
    if (!formData.description?.trim()) {
      toast.error("Description is required");
      return;
    }
    if (!formData.observable_behaviors || formData.observable_behaviors.length < 2) {
      toast.error("At least 2 observable behaviors are required");
      return;
    }
    if (!formData.success_criteria?.trim()) {
      toast.error("Success criteria is required");
      return;
    }

    saveMutation.mutate();
  };

  const moveUp = (index: number) => {
    if (index <= 0) return;
    const newComps = [...competencies];
    [newComps[index - 1], newComps[index]] = [newComps[index], newComps[index - 1]];
    reorderMutation.mutate(newComps);
  };

  const moveDown = (index: number) => {
    if (index >= competencies.length - 1) return;
    const newComps = [...competencies];
    [newComps[index], newComps[index + 1]] = [newComps[index + 1], newComps[index]];
    reorderMutation.mutate(newComps);
  };

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="size-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-serif text-2xl font-bold">Competencies</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Define the skills learners will master in this course
          </p>
        </div>

        <Dialog open={formState !== "idle"} onOpenChange={(open) => !open && resetForm()}>
          <DialogTrigger asChild>
            <Button
              onClick={() => {
                setFormState("adding");
                setEditingId(null);
              }}
              className="bg-brand text-brand-foreground hover:bg-brand/90"
            >
              <Plus className="mr-2 size-4" />
              Add competency
            </Button>
          </DialogTrigger>

          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="font-serif">
                {editingId ? "Edit" : "Add"} competency
              </DialogTitle>
              <DialogDescription>
                Define a skill learners will develop in this course
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* Title */}
              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  placeholder="e.g., Deploy a Node.js API to cloud"
                  value={formData.title || ""}
                  onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                  maxLength={100}
                />
                <p className="text-xs text-muted-foreground">
                  {formData.title?.length || 0}/100 characters
                </p>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Description *</Label>
                <Textarea
                  id="description"
                  placeholder="Explain what this competency entails..."
                  value={formData.description || ""}
                  onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                  maxLength={500}
                  className="min-h-20"
                />
                <p className="text-xs text-muted-foreground">
                  {formData.description?.length || 0}/500 characters
                </p>
              </div>

              {/* Observable Behaviors */}
              <div className="space-y-2">
                <Label>Observable behaviors *</Label>
                <div className="space-y-2">
                  {(formData.observable_behaviors || []).map((behavior, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <Badge variant="secondary">{idx + 1}</Badge>
                      <span className="flex-1 text-sm">{behavior}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setFormData((prev) => ({
                            ...prev,
                            observable_behaviors: (prev.observable_behaviors || []).filter(
                              (_, i) => i !== idx
                            ),
                          }));
                        }}
                      >
                        <X className="size-4" />
                      </Button>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2 pt-2">
                  <Input
                    placeholder="e.g., Sets up environment variables in .env file"
                    value={behaviorInput}
                    onChange={(e) => setBehaviorInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && behaviorInput.trim()) {
                        setFormData((prev) => ({
                          ...prev,
                          observable_behaviors: [...(prev.observable_behaviors || []), behaviorInput],
                        }));
                        setBehaviorInput("");
                      }
                    }}
                  />
                  <Button
                    variant="outline"
                    onClick={() => {
                      if (behaviorInput.trim()) {
                        setFormData((prev) => ({
                          ...prev,
                          observable_behaviors: [...(prev.observable_behaviors || []), behaviorInput],
                        }));
                        setBehaviorInput("");
                      }
                    }}
                    disabled={(formData.observable_behaviors || []).length >= 5}
                  >
                    Add
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  {(formData.observable_behaviors || []).length}/5 behaviors
                </p>
              </div>

              {/* Success Criteria */}
              <div className="space-y-2">
                <Label htmlFor="success-criteria">Success criteria *</Label>
                <Textarea
                  id="success-criteria"
                  placeholder="Define how learners demonstrate mastery (e.g., scoring 70% on test and submitting working project)..."
                  value={formData.success_criteria || ""}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, success_criteria: e.target.value }))
                  }
                  className="min-h-20"
                />
              </div>

              {/* Related Job Titles */}
              <div className="space-y-2">
                <Label>Related job titles (optional)</Label>
                <div className="space-y-2">
                  {(formData.related_job_titles || []).map((title, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <Badge variant="outline">{title}</Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setFormData((prev) => ({
                            ...prev,
                            related_job_titles: (prev.related_job_titles || []).filter(
                              (_, i) => i !== idx
                            ),
                          }));
                        }}
                      >
                        <X className="size-4" />
                      </Button>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2 pt-2">
                  <Input
                    placeholder="e.g., Junior Backend Developer"
                    value={jobTitleInput}
                    onChange={(e) => setJobTitleInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && jobTitleInput.trim()) {
                        setFormData((prev) => ({
                          ...prev,
                          related_job_titles: [...(prev.related_job_titles || []), jobTitleInput],
                        }));
                        setJobTitleInput("");
                      }
                    }}
                  />
                  <Button
                    variant="outline"
                    onClick={() => {
                      if (jobTitleInput.trim()) {
                        setFormData((prev) => ({
                          ...prev,
                          related_job_titles: [...(prev.related_job_titles || []), jobTitleInput],
                        }));
                        setJobTitleInput("");
                      }
                    }}
                  >
                    Add
                  </Button>
                </div>
              </div>
            </div>

            {/* Dialog Actions */}
            <div className="flex gap-3 justify-end pt-4 border-t">
              <Button variant="outline" onClick={resetForm}>
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={saveMutation.isPending}
                className="bg-brand text-brand-foreground hover:bg-brand/90"
              >
                {saveMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="mr-2 size-4" />
                    {editingId ? "Update" : "Create"} competency
                  </>
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Competencies List */}
      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="size-8 animate-spin text-brand" />
        </div>
      ) : competencies.length > 0 ? (
        <div className="space-y-3">
          {competencies.map((comp, index) => (
            <Card key={comp.id} className="overflow-hidden">
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <GripVertical className="size-5 text-muted-foreground mt-1 flex-shrink-0" />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="font-semibold">{comp.title}</h4>
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                          {comp.description}
                        </p>
                      </div>
                    </div>

                    {/* Metadata */}
                    <div className="flex flex-wrap gap-3 mt-3 text-xs text-muted-foreground">
                      {comp.observable_behaviors && comp.observable_behaviors.length > 0 && (
                        <span>{comp.observable_behaviors.length} behaviors</span>
                      )}
                      {comp.related_job_titles && comp.related_job_titles.length > 0 && (
                        <span>{comp.related_job_titles.length} job titles</span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 flex-shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => moveUp(index)}
                      disabled={index === 0}
                    >
                      ↑
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => moveDown(index)}
                      disabled={index === competencies.length - 1}
                    >
                      ↓
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(comp)}
                    >
                      <Edit2 className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeletingId(comp.id)}
                    >
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Alert>
          <AlertCircle className="size-4" />
          <AlertDescription>No competencies yet. Add one to get started.</AlertDescription>
        </Alert>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deletingId !== null}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete competency?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. If there are assessments linked to this competency, they will
              also be affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-3 justify-end">
            <AlertDialogCancel onClick={() => setDeletingId(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingId && deleteMutation.mutate(deletingId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
