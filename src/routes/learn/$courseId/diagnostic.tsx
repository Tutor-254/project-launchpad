import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useState, useEffect } from 'react';
import { DiagnosticAssessment } from '@/components/diagnostic-assessment';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';

export const Route = createFileRoute('/learn/$courseId/diagnostic')({
  component: DiagnosticRoute,
});

interface DiagnosticAssessmentData {
  id: string;
  courseId: string;
  name: string;
  description: string;
  prerequisiteCompetencyIds: string[];
  passThreshold: number;
  questionCount: number;
  cooldownDays: number;
}

interface PathwayRecommendation {
  recommendedStartSection: string;
  skipSections: string[];
  baselineCompetencies: string[];
  reason: string;
  passed: boolean;
  score: number;
}

function DiagnosticRoute() {
  const { courseId } = Route.useParams();
  const navigate = useNavigate();

  const [diagnostic, setDiagnostic] = useState<DiagnosticAssessmentData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [userEnrolled, setUserEnrolled] = useState(false);
  const [lastAttemptWithinCooldown, setLastAttemptWithinCooldown] = useState(false);
  const [daysUntilRetake, setDaysUntilRetake] = useState(0);
  const [pathwayRecommendation, setPathwayRecommendation] = useState<PathwayRecommendation | null>(null);
  const [showPathway, setShowPathway] = useState(false);

  // Mock: Load diagnostic assessment for course
  useEffect(() => {
    setIsLoading(true);
    setTimeout(() => {
      // Check if user is already enrolled (mock check)
      setUserEnrolled(false);

      // Check if diagnostic was recently completed (mock check)
      setLastAttemptWithinCooldown(false);
      setDaysUntilRetake(3);

      // Load diagnostic details
      setDiagnostic({
        id: `diag-${courseId}`,
        courseId,
        name: 'Node.js Basics Diagnostic',
        description: 'Test your knowledge of Node.js fundamentals before starting this course. Takes approximately 15 minutes.',
        prerequisiteCompetencyIds: ['comp-prerequisites-1', 'comp-prerequisites-2'],
        passThreshold: 50,
        questionCount: 10,
        cooldownDays: 7,
      });

      setIsLoading(false);
    }, 500);
  }, [courseId]);

  const handleDiagnosticComplete = (score: number, passed: boolean) => {
    // Mock pathway recommendation
    const recommendation: PathwayRecommendation = {
      recommendedStartSection: passed ? 'Section 1: Advanced Concepts' : 'Section 0: Fundamentals Review',
      skipSections: passed ? ['Section 0: Fundamentals'] : [],
      baselineCompetencies: passed
        ? ['Node.js fundamentals', 'Event loop understanding']
        : ['Basic JavaScript', 'Callback concepts'],
      reason: passed
        ? `Your score of ${score}% indicates strong baseline knowledge. We're starting you with advanced concepts.`
        : `Your score of ${score}% suggests you'd benefit from reviewing Node.js fundamentals first.`,
      passed,
      score,
    };

    setPathwayRecommendation(recommendation);
    setShowPathway(true);
  };

  const handleEnroll = () => {
    navigate({
      to: '/learn/$courseId',
      params: { courseId },
    });
  };

  const handleSkipAndEnroll = () => {
    // In a real app, this would flag the learner in analytics as having skipped diagnostic
    navigate({
      to: '/learn/$courseId',
      params: { courseId },
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (userEnrolled) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 flex items-center justify-center">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <CheckCircle2 className="h-12 w-12 text-green-600 mx-auto mb-4" />
            <h1 className="text-xl font-bold mb-2">Already Enrolled</h1>
            <p className="text-gray-600 mb-4">You're already enrolled in this course. Continue to the course page.</p>
            <Button onClick={handleEnroll} className="w-full bg-blue-600 hover:bg-blue-700">
              Go to Course
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (lastAttemptWithinCooldown && !showPathway) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 flex items-center justify-center">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <AlertCircle className="h-12 w-12 text-orange-600 mx-auto mb-4" />
            <h1 className="text-xl font-bold mb-2">Retake Not Available Yet</h1>
            <p className="text-gray-600 mb-2">You can retake this diagnostic in:</p>
            <p className="text-3xl font-bold text-orange-600 mb-6">{daysUntilRetake} days</p>
            <p className="text-sm text-gray-500 mb-4">
              Diagnostics can be retaken every 7 days to ensure thoughtful assessment.
            </p>
            <Button onClick={handleSkipAndEnroll} variant="outline" className="w-full">
              Continue to Course
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (showPathway && pathwayRecommendation) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Your Diagnostic Results</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Score */}
              <div className="text-center">
                <div className="text-5xl font-bold text-blue-600 mb-2">
                  {pathwayRecommendation.score}%
                </div>
                <div className={`text-lg font-semibold ${pathwayRecommendation.passed ? 'text-green-600' : 'text-red-600'}`}>
                  {pathwayRecommendation.passed ? 'PASSED' : 'NEEDS IMPROVEMENT'}
                </div>
              </div>

              {/* Recommendation */}
              <Alert className={pathwayRecommendation.passed ? 'border-green-200 bg-green-50' : 'border-orange-200 bg-orange-50'}>
                <AlertCircle
                  className={`h-4 w-4 ${pathwayRecommendation.passed ? 'text-green-600' : 'text-orange-600'}`}
                />
                <AlertDescription
                  className={pathwayRecommendation.passed ? 'text-green-800' : 'text-orange-800'}
                >
                  {pathwayRecommendation.reason}
                </AlertDescription>
              </Alert>

              {/* Baseline Competencies */}
              <div>
                <h3 className="font-semibold mb-2">Baseline Competencies Detected</h3>
                <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                  {pathwayRecommendation.baselineCompetencies.map((comp, idx) => (
                    <div key={idx} className="text-sm text-gray-700">
                      • {comp}
                    </div>
                  ))}
                </div>
              </div>

              {/* Recommended Path */}
              <div>
                <h3 className="font-semibold mb-2">Recommended Learning Path</h3>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
                  <div>
                    <div className="text-sm text-gray-600">Start with:</div>
                    <div className="font-medium text-blue-900">{pathwayRecommendation.recommendedStartSection}</div>
                  </div>
                  {pathwayRecommendation.skipSections.length > 0 && (
                    <div>
                      <div className="text-sm text-gray-600">Can skip:</div>
                      <div className="space-y-1">
                        {pathwayRecommendation.skipSections.map((section, idx) => (
                          <div key={idx} className="text-sm text-green-700">
                            ✓ {section}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* CTA */}
              {pathwayRecommendation.passed ? (
                <div className="space-y-3 pt-4 border-t">
                  <p className="text-center text-gray-600 font-medium">You're ready! Let's get started.</p>
                  <Button onClick={handleEnroll} className="w-full bg-green-600 hover:bg-green-700 h-12 text-base">
                    Enroll in Course
                  </Button>
                </div>
              ) : (
                <div className="space-y-3 pt-4 border-t">
                  <p className="text-center text-gray-600">
                    We recommend completing the prerequisite before starting this course. Or you can proceed anyway.
                  </p>
                  <div className="flex gap-3">
                    <Button variant="outline" className="flex-1">
                      View Prerequisite
                    </Button>
                    <Button onClick={handleSkipAndEnroll} className="flex-1 bg-blue-600 hover:bg-blue-700">
                      Enroll Anyway
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-3xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Diagnostic Assessment</h1>
          <p className="text-gray-600">
            Before you start, let's assess your baseline knowledge to personalize your learning path.
          </p>
        </div>

        {diagnostic && (
          <DiagnosticAssessment
            diagnosticId={diagnostic.id}
            name={diagnostic.name}
            description={diagnostic.description}
            questionCount={diagnostic.questionCount}
            passThreshold={diagnostic.passThreshold}
            onComplete={handleDiagnosticComplete}
          />
        )}
      </div>
    </div>
  );
}
