import { createFileRoute } from '@tanstack/react-router';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle2, AlertCircle, Loader2, Download, ExternalLink } from 'lucide-react';

// Types
interface ProjectSubmission {
  id: string;
  userId: string;
  projectId: string;
  learnerName: string;
  competencyTitle: string;
  submissionVersion: number;
  submissionType: 'file' | 'url' | 'video';
  fileUrl?: string;
  externalUrl?: string;
  videoUrl?: string;
  submissionText?: string;
  status: 'submitted' | 'under_review' | 'graded';
  createdAt: Date;
}

interface RubricCriterion {
  name: string;
  points: number;
}

interface Rubric {
  id: string;
  title: string;
  description?: string;
  criteria: RubricCriterion[];
  totalPoints: number;
  passingScorePercent: number;
}

interface GradingFormState {
  submissionId: string;
  scores: Record<string, number>;
  feedback: string;
  totalScore: number;
  passed: boolean;
}

export const Route = createFileRoute('/instructor/$courseId/grading')({
  component: GradingPage,
});

function GradingPage() {
  const { courseId } = Route.useParams();
  const [submissions, setSubmissions] = useState<ProjectSubmission[]>([]);
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<string | null>(null);
  const [rubrics, setRubrics] = useState<Record<string, Rubric>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [badgeIssued, setBadgeIssued] = useState(false);
  const [badgeDetails, setBadgeDetails] = useState<{ learnerName: string; competencyTitle: string } | null>(null);

  const [gradingForm, setGradingForm] = useState<GradingFormState>({
    submissionId: '',
    scores: {},
    feedback: '',
    totalScore: 0,
    passed: false,
  });

  // Mock: Load submissions for this course
  useEffect(() => {
    setIsLoading(true);
    // In a real app, this would fetch from the database
    setTimeout(() => {
      setSubmissions([
        {
          id: 'sub-1',
          userId: 'user-1',
          projectId: 'proj-1',
          learnerName: 'Alice Johnson',
          competencyTitle: 'API Deployment',
          submissionVersion: 1,
          submissionType: 'url',
          externalUrl: 'https://github.com/alice/api-project',
          status: 'submitted',
          createdAt: new Date('2026-09-20'),
        },
        {
          id: 'sub-2',
          userId: 'user-2',
          projectId: 'proj-1',
          learnerName: 'Bob Smith',
          competencyTitle: 'API Deployment',
          submissionVersion: 1,
          submissionType: 'file',
          fileUrl: '/submissions/bob-api.zip',
          status: 'submitted',
          createdAt: new Date('2026-09-21'),
        },
        {
          id: 'sub-3',
          userId: 'user-3',
          projectId: 'proj-1',
          learnerName: 'Charlie Brown',
          competencyTitle: 'API Deployment',
          submissionVersion: 2,
          submissionType: 'url',
          externalUrl: 'https://github.com/charlie/api-v2',
          status: 'under_review',
          createdAt: new Date('2026-09-22'),
        },
      ]);

      setRubrics({
        'proj-1': {
          id: 'rubric-1',
          title: 'API Deployment Rubric',
          description: 'Evaluation of API deployment project',
          criteria: [
            { name: 'Code Quality', points: 5 },
            { name: 'Documentation', points: 3 },
            { name: 'Testing', points: 4 },
            { name: 'Deployment Process', points: 3 },
          ],
          totalPoints: 15,
          passingScorePercent: 70,
        },
      });

      setIsLoading(false);
    }, 500);
  }, [courseId]);

  const pendingSubmissions = submissions.filter((s) => s.status === 'submitted' || s.status === 'under_review');

  const handleSelectSubmission = (submissionId: string) => {
    const submission = submissions.find((s) => s.id === submissionId);
    if (!submission) return;

    setSelectedSubmissionId(submissionId);
    const rubric = rubrics[submission.projectId];

    if (rubric) {
      const initialScores: Record<string, number> = {};
      rubric.criteria.forEach((c) => {
        initialScores[c.name] = 0;
      });

      setGradingForm({
        submissionId,
        scores: initialScores,
        feedback: '',
        totalScore: 0,
        passed: false,
      });
    }
  };

  const handleUpdateScore = (criterionName: string, score: number) => {
    const updatedScores = { ...gradingForm.scores, [criterionName]: score };
    const rubric = selectedSubmissionId
      ? rubrics[submissions.find((s) => s.id === selectedSubmissionId)?.projectId || '']
      : null;

    if (!rubric) return;

    let totalScore = 0;
    let maxScore = 0;
    rubric.criteria.forEach((c) => {
      const score = updatedScores[c.name] || 0;
      totalScore += score;
      maxScore += c.points;
    });

    const scorePercentage = (totalScore / maxScore) * 100;
    const passed = scorePercentage >= rubric.passingScorePercent;

    setGradingForm({
      ...gradingForm,
      scores: updatedScores,
      totalScore,
      passed,
    });
  };

  const handleSubmitGrade = async () => {
    setIsSaving(true);
    // Simulate API call to grade submission
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const submission = submissions.find((s) => s.id === selectedSubmissionId);
    if (submission && gradingForm.passed) {
      setBadgeIssued(true);
      setBadgeDetails({
        learnerName: submission.learnerName,
        competencyTitle: submission.competencyTitle,
      });
    }

    // Update submission status
    if (selectedSubmissionId) {
      setSubmissions((prev) =>
        prev.map((s) =>
          s.id === selectedSubmissionId
            ? { ...s, status: 'graded' }
            : s
        )
      );
    }

    setIsSaving(false);
    setSelectedSubmissionId(null);

    // Auto-close success message after 5 seconds
    setTimeout(() => setBadgeIssued(false), 5000);
  };

  const selectedSubmission = submissions.find((s) => s.id === selectedSubmissionId);
  const selectedRubric = selectedSubmission
    ? rubrics[selectedSubmission.projectId]
    : null;

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Project Grading Queue</h1>
        <p className="text-gray-600 mt-1">Review and grade learner submissions</p>
      </div>

      {/* Badge Issued Confirmation */}
      {badgeIssued && badgeDetails && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            <strong>Grade recorded!</strong> Badge issued to {badgeDetails.learnerName} for the "{badgeDetails.competencyTitle}" competency.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Submissions Queue */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Pending Submissions</CardTitle>
              <CardDescription>{pendingSubmissions.length} to grade</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {isLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                  </div>
                ) : pendingSubmissions.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-8">No pending submissions</p>
                ) : (
                  pendingSubmissions.map((submission) => (
                    <button
                      key={submission.id}
                      onClick={() => handleSelectSubmission(submission.id)}
                      className={`w-full text-left p-3 rounded-lg border-2 transition ${
                        selectedSubmissionId === submission.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="font-medium text-sm">{submission.learnerName}</div>
                      <div className="text-xs text-gray-600 mt-1">{submission.competencyTitle}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        v{submission.submissionVersion} • {submission.submissionType}
                      </div>
                      <div className="text-xs text-gray-400 mt-1">
                        {submission.createdAt.toLocaleDateString()}
                      </div>
                    </button>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Grading Form */}
        <div className="lg:col-span-2">
          {selectedSubmission && selectedRubric ? (
            <Card>
              <CardHeader>
                <CardTitle>Grade Submission: {selectedSubmission.learnerName}</CardTitle>
                <CardDescription>{selectedSubmission.competencyTitle}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Project Brief */}
                <div>
                  <h3 className="font-semibold mb-2">Project Brief</h3>
                  <div className="bg-gray-50 p-4 rounded-lg text-sm text-gray-700">
                    <p>Capstone: Deploy a Node.js API to a cloud platform with proper CI/CD, documentation, and test coverage.</p>
                  </div>
                </div>

                {/* Example Submission */}
                <div>
                  <h3 className="font-semibold mb-2">Example Submission</h3>
                  <a
                    href="https://example.com/api-example"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline text-sm flex items-center gap-1"
                  >
                    View example <ExternalLink className="h-3 w-3" />
                  </a>
                </div>

                {/* Learner Submission */}
                <div>
                  <h3 className="font-semibold mb-2">Learner Submission</h3>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    {selectedSubmission.submissionType === 'url' ? (
                      <a
                        href={selectedSubmission.externalUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline text-sm flex items-center gap-1"
                      >
                        {selectedSubmission.externalUrl} <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : selectedSubmission.submissionType === 'file' ? (
                      <a
                        href={selectedSubmission.fileUrl}
                        download
                        className="text-blue-600 hover:underline text-sm flex items-center gap-1"
                      >
                        <Download className="h-3 w-3" />
                        {selectedSubmission.fileUrl?.split('/').pop()}
                      </a>
                    ) : (
                      <a
                        href={selectedSubmission.videoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline text-sm flex items-center gap-1"
                      >
                        View video <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                  {selectedSubmission.submissionText && (
                    <p className="text-sm text-gray-600 mt-2">
                      <strong>Learner notes:</strong> {selectedSubmission.submissionText}
                    </p>
                  )}
                </div>

                {/* Rubric Scoring */}
                <div>
                  <h3 className="font-semibold mb-3">Rubric Scoring</h3>
                  <div className="space-y-4">
                    {selectedRubric.criteria.map((criterion) => (
                      <div key={criterion.name} className="border rounded-lg p-4">
                        <div className="flex justify-between items-center mb-2">
                          <label className="font-medium">{criterion.name}</label>
                          <span className="text-sm text-gray-600">0-{criterion.points} points</span>
                        </div>
                        <Input
                          type="number"
                          min={0}
                          max={criterion.points}
                          value={gradingForm.scores[criterion.name] || 0}
                          onChange={(e) =>
                            handleUpdateScore(criterion.name, parseInt(e.target.value) || 0)
                          }
                          className="w-20"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Score Summary */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-semibold">Total Score</span>
                    <span className="text-2xl font-bold text-blue-600">
                      {gradingForm.totalScore}/{selectedRubric.totalPoints}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-700">Passing score: {selectedRubric.passingScorePercent}%</span>
                    <Badge
                      variant={gradingForm.passed ? 'default' : 'secondary'}
                      className={gradingForm.passed ? 'bg-green-600' : 'bg-red-600'}
                    >
                      {gradingForm.passed ? 'PASS' : 'FAIL'}
                    </Badge>
                  </div>
                </div>

                {/* Feedback */}
                <div>
                  <label className="text-sm font-medium block mb-2">Feedback (Optional)</label>
                  <Textarea
                    value={gradingForm.feedback}
                    onChange={(e) => setGradingForm({ ...gradingForm, feedback: e.target.value })}
                    placeholder="Provide specific feedback for the learner..."
                    rows={4}
                  />
                </div>

                {/* Actions */}
                <div className="flex gap-2 border-t pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setSelectedSubmissionId(null)}
                  >
                    Back
                  </Button>
                  <Button
                    onClick={handleSubmitGrade}
                    disabled={isSaving}
                    className="flex-1 bg-blue-600 hover:bg-blue-700"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Submitting...
                      </>
                    ) : (
                      'Submit Grade'
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <AlertCircle className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">Select a submission to begin grading</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
