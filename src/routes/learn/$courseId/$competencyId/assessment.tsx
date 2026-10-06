import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useState, useEffect } from 'react';
import { CompetencyKnowledgeTest } from '@/components/competency-knowledge-test';
import { ProjectSubmissionForm } from '@/components/project-submission-form';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';

export const Route = createFileRoute('/learn/$courseId/$competencyId/assessment')({
  component: CompetencyAssessmentRoute,
});

interface CompetencyAssessmentData {
  id: string;
  competencyId: string;
  title: string;
  description: string;
  assessmentType: 'knowledge_test' | 'practical' | 'hybrid';
  masteryRule: string;
  maxAttempts: number;
  retryCooldownHours: number;
  remediationLessonId?: string;
  remediationLessonTitle?: string;
  requiresRemediationBeforeRetry: boolean;
}

interface AssessmentAttempt {
  attemptNumber: number;
  score: number;
  passed: boolean;
  createdAt: Date;
  canRetryAt?: Date;
}

interface AssessmentResult {
  score: number;
  passed: boolean;
  feedback: string;
  canRetryAt: Date | null;
  competencyAttained: boolean;
}

function CompetencyAssessmentRoute() {
  const { courseId, competencyId } = Route.useParams();
  const navigate = useNavigate();

  const [assessment, setAssessment] = useState<CompetencyAssessmentData | null>(null);
  const [attempts, setAttempts] = useState<AssessmentAttempt[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUserEnrolled, setIsUserEnrolled] = useState(true);
  const [remediationComplete, setRemediationComplete] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [result, setResult] = useState<AssessmentResult | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Mock: Load assessment details and user's previous attempts
  useEffect(() => {
    setIsLoading(true);
    setTimeout(() => {
      // Check if user is enrolled in course
      setIsUserEnrolled(true);

      // Load assessment details
      setAssessment({
        id: `assess-${competencyId}`,
        competencyId,
        title: 'API Design & Development Knowledge Test',
        description: 'Test your understanding of API design principles, RESTful conventions, and error handling.',
        assessmentType: 'knowledge_test',
        masteryRule: 'score >= 70',
        maxAttempts: 3,
        retryCooldownHours: 24,
        remediationLessonId: 'lecture-error-handling',
        remediationLessonTitle: 'Error Handling Best Practices',
        requiresRemediationBeforeRetry: true,
      });

      // Load user's previous attempts (mock)
      setAttempts([
        {
          attemptNumber: 1,
          score: 62,
          passed: false,
          createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
          canRetryAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        },
      ]);

      setRemediationComplete(false);
      setIsLoading(false);
    }, 500);
  }, [competencyId]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!isUserEnrolled) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 flex items-center justify-center">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <AlertCircle className="h-12 w-12 text-red-600 mx-auto mb-4" />
            <h1 className="text-xl font-bold mb-2">Not Enrolled</h1>
            <p className="text-gray-600 mb-4">You need to enroll in this course first.</p>
            <Button
              onClick={() => navigate({ to: '/learn/$courseId', params: { courseId } })}
              className="w-full"
            >
              Go to Course
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (showResult && result) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Assessment Complete</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Score */}
              <div className="text-center">
                <div className="text-5xl font-bold text-blue-600 mb-2">{result.score}%</div>
                <Badge
                  className={`text-lg px-4 py-2 ${result.passed ? 'bg-green-600' : 'bg-red-600'}`}
                >
                  {result.passed ? 'PASSED' : 'NEEDS IMPROVEMENT'}
                </Badge>
              </div>

              {/* Feedback */}
              <Alert className={result.passed ? 'border-green-200 bg-green-50' : 'border-orange-200 bg-orange-50'}>
                <AlertCircle
                  className={`h-4 w-4 ${result.passed ? 'text-green-600' : 'text-orange-600'}`}
                />
                <AlertDescription
                  className={result.passed ? 'text-green-800' : 'text-orange-800'}
                >
                  {result.feedback}
                </AlertDescription>
              </Alert>

              {/* Passed Flow */}
              {result.passed && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                    <h3 className="font-semibold text-green-900">Competency Assessed!</h3>
                  </div>
                  <p className="text-sm text-green-800">
                    Great work! You've demonstrated mastery of this competency. Now complete the capstone project to earn your badge.
                  </p>
                  <Button className="w-full bg-green-600 hover:bg-green-700">
                    Go to Project Submission
                  </Button>
                </div>
              )}

              {/* Failed Flow - Remediation Required */}
              {!result.passed && assessment?.requiresRemediationBeforeRetry && (
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 space-y-3">
                  <h3 className="font-semibold text-orange-900">Remediation Recommended</h3>
                  <p className="text-sm text-orange-800">
                    Before you retry, we recommend reviewing this material:
                  </p>
                  <Button
                    variant="outline"
                    className="w-full border-orange-300 hover:bg-orange-100"
                  >
                    📚 {assessment.remediationLessonTitle}
                  </Button>
                  <div className="text-xs text-orange-700 pt-2 border-t border-orange-200">
                    After completing the remediation, you can retry in {assessment.retryCooldownHours} hours.
                  </div>
                </div>
              )}

              {/* Failed Flow - Retry Available */}
              {!result.passed && !result.canRetryAt && (
                <div>
                  <p className="text-sm text-gray-600 mb-4">
                    Attempt {attempts.length} of {assessment?.maxAttempts}
                  </p>
                  <Button
                    onClick={() => {
                      setShowResult(false);
                      setResult(null);
                    }}
                    className="w-full"
                  >
                    Try Again
                  </Button>
                </div>
              )}

              {/* Failed Flow - Retry Blocked by Cooldown */}
              {!result.passed && result.canRetryAt && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-sm text-red-800 mb-2">
                    You can retry this assessment in:
                  </p>
                  <p className="text-2xl font-bold text-red-600">
                    {Math.ceil(
                      (result.canRetryAt.getTime() - Date.now()) / (1000 * 60 * 60)
                    )}{' '}
                    hours
                  </p>
                </div>
              )}

              {/* Back to Competency Overview */}
              <Button
                variant="outline"
                onClick={() => navigate({ to: '/learn/$courseId/competencies', params: { courseId } })}
                className="w-full"
              >
                Back to Competencies
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const lastAttempt = attempts.length > 0 ? attempts[attempts.length - 1] : null;
  const canRetry = !lastAttempt || (lastAttempt.canRetryAt && new Date() >= lastAttempt.canRetryAt);
  const attemptsRemaining = assessment ? assessment.maxAttempts - attempts.length : 0;

  // Check if remediation is required and not complete
  const remediationRequired = assessment?.requiresRemediationBeforeRetry && lastAttempt && !lastAttempt.passed && !remediationComplete;

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">{assessment?.title}</h1>
          <p className="text-gray-600">{assessment?.description}</p>
        </div>

        {/* Attempt Info */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <div className="text-xs text-gray-600 uppercase">Attempts</div>
                <div className="text-2xl font-bold">
                  {attempts.length}/{assessment?.maxAttempts}
                </div>
              </div>
              {lastAttempt && (
                <>
                  <div>
                    <div className="text-xs text-gray-600 uppercase">Last Score</div>
                    <div className="text-2xl font-bold">{lastAttempt.score}%</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-600 uppercase">Status</div>
                    <Badge
                      className={lastAttempt.passed ? 'bg-green-600' : 'bg-red-600'}
                    >
                      {lastAttempt.passed ? 'Passed' : 'Failed'}
                    </Badge>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Remediation Alert */}
        {remediationRequired && (
          <Alert className="mb-6 border-orange-200 bg-orange-50">
            <AlertCircle className="h-4 w-4 text-orange-600" />
            <AlertDescription className="text-orange-800">
              Please complete the remediation lesson before retrying: <strong>{assessment?.remediationLessonTitle}</strong>
            </AlertDescription>
          </Alert>
        )}

        {/* Retry Cooldown Alert */}
        {!canRetry && lastAttempt && (
          <Alert className="mb-6 border-blue-200 bg-blue-50">
            <AlertCircle className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-800">
              You can retry this assessment in{' '}
              <strong>
                {lastAttempt.canRetryAt
                  ? Math.ceil(
                      (lastAttempt.canRetryAt.getTime() - Date.now()) / (1000 * 60 * 60)
                    )
                  : 24}{' '}
                hours
              </strong>
            </AlertDescription>
          </Alert>
        )}

        {/* Max Attempts Reached */}
        {attemptsRemaining <= 0 && (
          <Alert className="mb-6 border-red-200 bg-red-50">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              You've used all available attempts. Contact your instructor for assistance.
            </AlertDescription>
          </Alert>
        )}

        {/* Assessment Component - Show if can attempt */}
        {assessment && canRetry && attemptsRemaining > 0 && !remediationRequired && (
          <CompetencyKnowledgeTest
            assessmentId={assessment.id}
            competencyId={competencyId}
            title={assessment.title}
            attemptNumber={attempts.length + 1}
            maxAttempts={assessment.maxAttempts}
            onSubmit={async (score: number, passed: boolean, feedback: string) => {
              setIsSubmitting(true);
              await new Promise((r) => setTimeout(r, 1000));

              setResult({
                score,
                passed,
                feedback,
                canRetryAt: passed ? null : new Date(Date.now() + assessment.retryCooldownHours * 60 * 60 * 1000),
                competencyAttained: passed,
              });

              setShowResult(true);
              setIsSubmitting(false);
            }}
          />
        )}

        {/* Blocked States */}
        {!canRetry && (
          <Card>
            <CardContent className="p-8 text-center">
              <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">
                Please wait until your cooldown period expires before retrying.
              </p>
            </CardContent>
          </Card>
        )}

        {attemptsRemaining <= 0 && (
          <Card>
            <CardContent className="p-8 text-center">
              <AlertCircle className="h-12 w-12 text-red-600 mx-auto mb-4" />
              <p className="text-gray-600">
                You've reached the maximum number of attempts for this assessment.
              </p>
              <Button
                variant="outline"
                onClick={() => navigate({ to: '/learn/$courseId/competencies', params: { courseId } })}
                className="mt-4"
              >
                Back to Competencies
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
