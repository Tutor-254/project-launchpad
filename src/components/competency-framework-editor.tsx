import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Plus, Edit2, Trash2, GripVertical } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface Competency {
  id: string;
  title: string;
  description: string;
  observable_behaviors: string[];
  success_criteria: string;
  prerequisite_competencies: string[];
  related_job_titles: string[];
  order_index: number;
}

interface CompetencyFrameworkEditorProps {
  courseId: string;
  competencies: Competency[];
  onSave?: (competencies: Competency[]) => void;
  onPublish?: () => void;
}

interface FormState {
  isOpen: boolean;
  editingId?: string;
  title: string;
  description: string;
  behaviors: string[];
  successCriteria: string;
  prerequisites: string[];
  jobTitles: string[];
}

export function CompetencyFrameworkEditor({
  courseId,
  competencies,
  onSave,
  onPublish,
}: CompetencyFrameworkEditorProps) {
  const [items, setItems] = useState<Competency[]>(competencies);
  const [form, setForm] = useState<FormState>({
    isOpen: false,
    title: '',
    description: '',
    behaviors: ['', ''],
    successCriteria: '',
    prerequisites: [],
    jobTitles: [],
  });

  const handleAddCompetency = () => {
    setForm({
      isOpen: true,
      title: '',
      description: '',
      behaviors: ['', ''],
      successCriteria: '',
      prerequisites: [],
      jobTitles: [],
    });
  };

  const handleEditCompetency = (competency: Competency) => {
    setForm({
      isOpen: true,
      editingId: competency.id,
      title: competency.title,
      description: competency.description,
      behaviors: competency.observable_behaviors || ['', ''],
      successCriteria: competency.success_criteria,
      prerequisites: competency.prerequisite_competencies || [],
      jobTitles: competency.related_job_titles || [],
    });
  };

  const handleSaveCompetency = () => {
    if (!form.title || !form.description || !form.successCriteria) {
      return;
    }

    const behaviors = form.behaviors.filter((b) => b.trim());
    if (behaviors.length === 0) {
      return;
    }

    if (form.editingId) {
      setItems((prev) =>
        prev.map((c) =>
          c.id === form.editingId
            ? {
                ...c,
                title: form.title,
                description: form.description,
                observable_behaviors: behaviors,
                success_criteria: form.successCriteria,
                prerequisite_competencies: form.prerequisites,
                related_job_titles: form.jobTitles,
              }
            : c
        )
      );
    } else {
      const newCompetency: Competency = {
        id: `comp-${Date.now()}`,
        title: form.title,
        description: form.description,
        observable_behaviors: behaviors,
        success_criteria: form.successCriteria,
        prerequisite_competencies: form.prerequisites,
        related_job_titles: form.jobTitles,
        order_index: items.length,
      };
      setItems((prev) => [...prev, newCompetency]);
    }

    setForm({ isOpen: false, title: '', description: '', behaviors: ['', ''], successCriteria: '', prerequisites: [], jobTitles: [] });
  };

  const handleDeleteCompetency = (id: string) => {
    setItems((prev) => prev.filter((c) => c.id !== id));
  };

  const handleReorder = (fromIndex: number, toIndex: number) => {
    const newItems = [...items];
    const [movedItem] = newItems.splice(fromIndex, 1);
    newItems.splice(toIndex, 0, movedItem);
    setItems(newItems.map((c, idx) => ({ ...c, order_index: idx })));
  };

  const handlePublish = () => {
    if (items.length === 0) {
      return;
    }
    onSave?.(items);
    onPublish?.();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Competency Framework</h2>
          <p className="text-gray-600 text-sm mt-1">Define the skills learners will master</p>
        </div>
        <Button onClick={handleAddCompetency} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Competency
        </Button>
      </div>

      {/* Validation Alert */}
      {items.length === 0 && (
        <Alert className="border-orange-200 bg-orange-50">
          <AlertCircle className="h-4 w-4 text-orange-600" />
          <AlertDescription className="text-orange-800">
            Your course must have at least 1 competency to publish
          </AlertDescription>
        </Alert>
      )}

      {/* Form Modal */}
      {form.isOpen && (
        <Card className="border-2 border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle>{form.editingId ? 'Edit Competency' : 'Add Competency'}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Title */}
            <div>
              <label className="text-sm font-medium">Title *</label>
              <Input
                maxLength={100}
                value={form.title}
                onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                placeholder="e.g., API Design"
                className="mt-1"
              />
              <p className="text-xs text-gray-500 mt-1">{form.title.length}/100</p>
            </div>

            {/* Description */}
            <div>
              <label className="text-sm font-medium">Description *</label>
              <Textarea
                maxLength={500}
                value={form.description}
                onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="What is this competency about?"
                className="mt-1"
                rows={3}
              />
              <p className="text-xs text-gray-500 mt-1">{form.description.length}/500</p>
            </div>

            {/* Observable Behaviors */}
            <div>
              <label className="text-sm font-medium">Observable Behaviors (2-5 required) *</label>
              <div className="space-y-2 mt-2">
                {form.behaviors.map((behavior, index) => (
                  <Input
                    key={index}
                    value={behavior}
                    onChange={(e) => {
                      const newBehaviors = [...form.behaviors];
                      newBehaviors[index] = e.target.value;
                      setForm((prev) => ({ ...prev, behaviors: newBehaviors }));
                    }}
                    placeholder={`Behavior ${index + 1}`}
                  />
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    form.behaviors.length < 5 &&
                    setForm((prev) => ({
                      ...prev,
                      behaviors: [...prev.behaviors, ''],
                    }))
                  }
                  disabled={form.behaviors.length >= 5}
                >
                  Add Behavior
                </Button>
              </div>
            </div>

            {/* Success Criteria */}
            <div>
              <label className="text-sm font-medium">Success Criteria *</label>
              <Textarea
                value={form.successCriteria}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    successCriteria: e.target.value,
                  }))
                }
                placeholder="What does mastery look like?"
                className="mt-1"
                rows={2}
              />
            </div>

            {/* Job Titles */}
            <div>
              <label className="text-sm font-medium">Related Job Titles (comma-separated)</label>
              <Input
                value={form.jobTitles.join(', ')}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    jobTitles: e.target.value
                      .split(',')
                      .map((t) => t.trim())
                      .filter((t) => t),
                  }))
                }
                placeholder="e.g., Backend Engineer, DevOps Engineer"
                className="mt-1"
              />
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() =>
                  setForm({ isOpen: false, title: '', description: '', behaviors: ['', ''], successCriteria: '', prerequisites: [], jobTitles: [] })
                }
              >
                Cancel
              </Button>
              <Button onClick={handleSaveCompetency} className="flex-1 bg-blue-600 hover:bg-blue-700">
                {form.editingId ? 'Save Changes' : 'Add Competency'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Competencies List */}
      <div className="space-y-2">
        {items.map((competency, index) => (
          <Card key={competency.id} className="hover:shadow-md transition">
            <CardContent className="p-4">
              <div className="flex items-start gap-4">
                <GripVertical className="h-5 w-5 text-gray-400 mt-1 cursor-grab" />
                <div className="flex-1">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg">{competency.title}</h3>
                      <p className="text-gray-600 text-sm mt-1">{competency.description}</p>
                    </div>
                    <Badge variant="outline">{index + 1}</Badge>
                  </div>

                  {/* Metadata */}
                  <div className="flex gap-6 mt-3 text-sm text-gray-600">
                    <div>
                      <span className="font-medium">Behaviors:</span> {competency.observable_behaviors?.length || 0}
                    </div>
                    <div>
                      <span className="font-medium">Prerequisites:</span> {competency.prerequisite_competencies?.length || 0}
                    </div>
                    {competency.related_job_titles && competency.related_job_titles.length > 0 && (
                      <div>
                        <span className="font-medium">Jobs:</span> {competency.related_job_titles.join(', ')}
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEditCompetency(competency)}
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteCompetency(competency.id)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Publish Button */}
      {items.length > 0 && (
        <div className="flex gap-2 pt-4 border-t">
          <Button variant="outline">Save Draft</Button>
          <Button onClick={handlePublish} className="bg-green-600 hover:bg-green-700">
            Publish Course
          </Button>
        </div>
      )}
    </div>
  );
}
