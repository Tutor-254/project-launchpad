import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Edit2, Trash2, Eye } from 'lucide-react';

interface Question {
  id: string;
  text: string;
  options: string[];
  correctAnswer: string;
  points: number;
}

interface Assessment {
  id: string;
  competencyId: string;
  title: string;
  description: string;
  type: 'knowledge_test' | 'practical' | 'hybrid';
  masteryRule: string;
  maxAttempts: number;
  retryCooldownHours: number;
  requiresRemediationBeforeRetry: boolean;
  remediationLessonId?: string;
  questions?: Question[];
}

interface Rubric {
  id: string;
  title: string;
  description: string;
  criteria: Array<{ name: string; points: number }>;
  passingScorePercent: number;
}

interface AssessmentEditorProps {
  courseId: string;
  competencies: Array<{ id: string; title: string }>;
  assessments: Assessment[];
  rubrics: Rubric[];
  onSave?: (assessments: Assessment[]) => void;
}

export function AssessmentEditor({
  courseId,
  competencies,
  assessments: initialAssessments,
  rubrics: initialRubrics,
  onSave,
}: AssessmentEditorProps) {
  const [assessments, setAssessments] = useState<Assessment[]>(initialAssessments);
  const [rubrics, setRubrics] = useState<Rubric[]>(initialRubrics);
  const [showForm, setShowForm] = useState(false);
  const [showRubricForm, setShowRubricForm] = useState(false);
  const [editingId, setEditingId] = useState<string>();
  const [editingRubricId, setEditingRubricId] = useState<string>();

  const [form, setForm] = useState<Partial<Assessment>>({
    competencyId: '',
    title: '',
    description: '',
    type: 'knowledge_test',
    masteryRule: 'score >= 70',
    maxAttempts: 3,
    retryCooldownHours: 24,
    requiresRemediationBeforeRetry: false,
    questions: [],
  });

  const [rubricForm, setRubricForm] = useState<Partial<Rubric>>({
    title: '',
    description: '',
    criteria: [{ name: '', points: 0 }],
    passingScorePercent: 70,
  });

  const handleAddQuestion = () => {
    const newQuestion: Question = {
      id: `q-${Date.now()}`,
      text: '',
      options: ['', '', '', ''],
      correctAnswer: '',
      points: 10,
    };
    setForm((prev) => ({
      ...prev,
      questions: [...(prev.questions || []), newQuestion],
    }));
  };

  const handleUpdateQuestion = (questionId: string, updates: Partial<Question>) => {
    setForm((prev) => ({
      ...prev,
      questions: (prev.questions || []).map((q) =>
        q.id === questionId ? { ...q, ...updates } : q
      ),
    }));
  };

  const handleDeleteQuestion = (questionId: string) => {
    setForm((prev) => ({
      ...prev,
      questions: (prev.questions || []).filter((q) => q.id !== questionId),
    }));
  };

  const handleSaveAssessment = () => {
    if (!form.competencyId || !form.title) {
      return;
    }

    if (editingId) {
      setAssessments((prev) =>
        prev.map((a) => (a.id === editingId ? { ...form, id: a.id } : a) as Assessment)
      );
    } else {
      setAssessments((prev) => [
        ...prev,
        {
          ...form,
          id: `assess-${Date.now()}`,
        } as Assessment,
      ]);
    }

    setShowForm(false);
    setEditingId(undefined);
    setForm({
      competencyId: '',
      title: '',
      description: '',
      type: 'knowledge_test',
      masteryRule: 'score >= 70',
      maxAttempts: 3,
      retryCooldownHours: 24,
      requiresRemediationBeforeRetry: false,
      questions: [],
    });
    onSave?.(assessments);
  };

  const handleSaveRubric = () => {
    if (!rubricForm.title) {
      return;
    }

    const totalPoints = (rubricForm.criteria || []).reduce((sum, c) => sum + (c.points || 0), 0);

    if (editingRubricId) {
      setRubrics((prev) =>
        prev.map((r) =>
          r.id === editingRubricId
            ? { ...rubricForm, id: r.id, totalPoints } as unknown as Rubric
            : r
        )
      );
    } else {
      setRubrics((prev) => [
        ...prev,
        {
          ...rubricForm,
          id: `rubric-${Date.now()}`,
        } as Rubric,
      ]);
    }

    setShowRubricForm(false);
    setEditingRubricId(undefined);
    setRubricForm({
      title: '',
      description: '',
      criteria: [{ name: '', points: 0 }],
      passingScorePercent: 70,
    });
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="assessments" className="w-full">
        {/* Assessments Tab */}
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="assessments">Assessments</TabsTrigger>
          <TabsTrigger value="rubrics">Rubrics</TabsTrigger>
        </TabsList>

        <TabsContent value="assessments" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Competency Assessments</h3>
            <Button onClick={() => setShowForm(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Add Assessment
            </Button>
          </div>

          {showForm && (
            <Card className="border-2 border-blue-200 bg-blue-50">
              <CardHeader>
                <CardTitle>{editingId ? 'Edit Assessment' : 'Add Assessment'}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Competency Link */}
                <div>
                  <label className="text-sm font-medium">Competency *</label>
                  <Select
                    value={form.competencyId}
                    onValueChange={(value) => setForm((prev) => ({ ...prev, competencyId: value }))}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select competency" />
                    </SelectTrigger>
                    <SelectContent>
                      {competencies.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Type */}
                <div>
                  <label className="text-sm font-medium">Assessment Type</label>
                  <Select
                    value={form.type}
                    onValueChange={(value) =>
                      setForm((prev) => ({
                        ...prev,
                        type: value as Assessment['type'],
                      }))
                    }
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="knowledge_test">Knowledge Test</SelectItem>
                      <SelectItem value="practical">Practical Project</SelectItem>
                      <SelectItem value="hybrid">Hybrid</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Title */}
                <div>
                  <label className="text-sm font-medium">Title *</label>
                  <Input
                    value={form.title}
                    onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                    placeholder="Assessment title"
                    className="mt-1"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="text-sm font-medium">Description</label>
                  <Textarea
                    value={form.description}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, description: e.target.value }))
                    }
                    placeholder="What is this assessment about?"
                    className="mt-1"
                    rows={2}
                  />
                </div>

                {/* Mastery Rule */}
                <div>
                  <label className="text-sm font-medium">Mastery Rule</label>
                  <Input
                    value={form.masteryRule}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, masteryRule: e.target.value }))
                    }
                    placeholder="e.g., score >= 70"
                    className="mt-1"
                  />
                </div>

                {/* Max Attempts */}
                <div>
                  <label className="text-sm font-medium">Max Attempts (1-10)</label>
                  <Input
                    type="number"
                    min={1}
                    max={10}
                    value={form.maxAttempts}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        maxAttempts: parseInt(e.target.value),
                      }))
                    }
                    className="mt-1"
                  />
                </div>

                {/* Retry Cooldown */}
                <div>
                  <label className="text-sm font-medium">Retry Cooldown (hours, 0-168)</label>
                  <Input
                    type="number"
                    min={0}
                    max={168}
                    value={form.retryCooldownHours}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        retryCooldownHours: parseInt(e.target.value),
                      }))
                    }
                    className="mt-1"
                  />
                </div>

                {/* Questions (for knowledge tests) */}
                {form.type === 'knowledge_test' && (
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="text-sm font-medium">Questions</label>
                      <Button size="sm" variant="outline" onClick={handleAddQuestion}>
                        <Plus className="h-4 w-4" />
                        Add Question
                      </Button>
                    </div>

                    {form.questions?.map((q, idx) => (
                      <Card key={q.id} className="p-3 mb-2">
                        <div className="space-y-2">
                          <Input
                            value={q.text}
                            onChange={(e) =>
                              handleUpdateQuestion(q.id, { text: e.target.value })
                            }
                            placeholder={`Question ${idx + 1}`}
                          />
                          {q.options.map((opt, optIdx) => (
                            <Input
                              key={optIdx}
                              value={opt}
                              onChange={(e) => {
                                const newOptions = [...q.options];
                                newOptions[optIdx] = e.target.value;
                                handleUpdateQuestion(q.id, { options: newOptions });
                              }}
                              placeholder={`Option ${optIdx + 1}`}
                            />
                          ))}
                          <div className="flex gap-2">
                            <Select
                              value={q.correctAnswer}
                              onValueChange={(value) =>
                                handleUpdateQuestion(q.id, { correctAnswer: value })
                              }
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Correct answer" />
                              </SelectTrigger>
                              <SelectContent>
                                {q.options.map((opt, idx) => (
                                  <SelectItem key={idx} value={opt}>
                                    {opt || `Option ${idx + 1}`}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Input
                              type="number"
                              value={q.points}
                              onChange={(e) =>
                                handleUpdateQuestion(q.id, {
                                  points: parseInt(e.target.value),
                                })
                              }
                              placeholder="Points"
                              className="w-20"
                            />
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDeleteQuestion(q.id)}
                              className="text-red-600"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2 pt-4 border-t">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowForm(false);
                      setEditingId(undefined);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleSaveAssessment} className="flex-1">
                    {editingId ? 'Save Changes' : 'Add Assessment'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Assessments List */}
          <div className="space-y-2">
            {assessments.map((assessment) => (
              <Card key={assessment.id}>
                <CardContent className="p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-semibold">{assessment.title}</h4>
                      <div className="flex gap-2 mt-1">
                        <Badge variant="outline">{assessment.type}</Badge>
                        <Badge variant="outline">Max {assessment.maxAttempts} attempts</Badge>
                      </div>
                      {assessment.description && (
                        <p className="text-sm text-gray-600 mt-1">{assessment.description}</p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setEditingId(assessment.id);
                          setForm(assessment);
                          setShowForm(true);
                        }}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          setAssessments((prev) =>
                            prev.filter((a) => a.id !== assessment.id)
                          )
                        }
                        className="text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Rubrics Tab */}
        <TabsContent value="rubrics" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Rubrics</h3>
            <Button onClick={() => setShowRubricForm(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Create Rubric
            </Button>
          </div>

          {showRubricForm && (
            <Card className="border-2 border-blue-200 bg-blue-50">
              <CardHeader>
                <CardTitle>{editingRubricId ? 'Edit Rubric' : 'Create Rubric'}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Input
                  value={rubricForm.title}
                  onChange={(e) =>
                    setRubricForm((prev) => ({ ...prev, title: e.target.value }))
                  }
                  placeholder="Rubric title"
                />

                <Textarea
                  value={rubricForm.description}
                  onChange={(e) =>
                    setRubricForm((prev) => ({ ...prev, description: e.target.value }))
                  }
                  placeholder="Rubric description"
                  rows={2}
                />

                {/* Criteria */}
                <div>
                  <label className="text-sm font-medium">Criteria</label>
                  <div className="space-y-2 mt-2">
                    {rubricForm.criteria?.map((criterion, idx) => (
                      <div key={idx} className="flex gap-2">
                        <Input
                          value={criterion.name}
                          onChange={(e) => {
                            const newCriteria = [...(rubricForm.criteria || [])];
                            newCriteria[idx] = { ...criterion, name: e.target.value };
                            setRubricForm((prev) => ({
                              ...prev,
                              criteria: newCriteria,
                            }));
                          }}
                          placeholder="Criterion name"
                        />
                        <Input
                          type="number"
                          value={criterion.points}
                          onChange={(e) => {
                            const newCriteria = [...(rubricForm.criteria || [])];
                            newCriteria[idx] = {
                              ...criterion,
                              points: parseInt(e.target.value),
                            };
                            setRubricForm((prev) => ({
                              ...prev,
                              criteria: newCriteria,
                            }));
                          }}
                          placeholder="Points"
                          className="w-24"
                        />
                      </div>
                    ))}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      setRubricForm((prev) => ({
                        ...prev,
                        criteria: [...(prev.criteria || []), { name: '', points: 0 }],
                      }))
                    }
                    className="mt-2"
                  >
                    Add Criterion
                  </Button>
                </div>

                {/* Passing Score */}
                <div>
                  <label className="text-sm font-medium">Passing Score %</label>
                  <Input
                    type="number"
                    min={1}
                    max={100}
                    value={rubricForm.passingScorePercent}
                    onChange={(e) =>
                      setRubricForm((prev) => ({
                        ...prev,
                        passingScorePercent: parseInt(e.target.value),
                      }))
                    }
                    className="mt-1"
                  />
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-4 border-t">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowRubricForm(false);
                      setEditingRubricId(undefined);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleSaveRubric} className="flex-1">
                    Save Rubric
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Rubrics List */}
          <div className="space-y-2">
            {rubrics.map((rubric) => (
              <Card key={rubric.id}>
                <CardContent className="p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-semibold">{rubric.title}</h4>
                      <p className="text-sm text-gray-600 mt-1">{rubric.description}</p>
                      <div className="text-sm mt-2">
                        <span className="font-medium">Total Points:</span>{' '}
                        {(rubric.criteria || []).reduce((sum, c) => sum + (c.points || 0), 0)}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="ghost">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
