import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, CheckCircle, Clock, Award, ArrowRight, Lightbulb } from 'lucide-react';
import { submitAssessmentAttempt, canRetryAssessment } from '@/lib/assessment.server';
import { toast } from 'sonner';

export interface TestQuestion {
  id: string;
  question_text: string;
  options: string[];
  correct_answer: string;
  points: number;
}

export interface CompetencyKnowledgeTestProps {
  assessmentId: string;
  competencyTitle: string;
  assessmentTitle: string;
  assessmentDescription?: string;
  questions: TestQuestion[];
  maxAttempts?: number;
  attemptNumber?: number;
  requiresRemediationBeforeRetry?: boolean;
  remediationLessonUrl?: string;
  retryRemaining?: boolean;
  canRetryAt?: Date;
  onComplete?: (result: {
    score: number;
    passed: boolean;
    feedback: string;
    canRetryAt?: Date;
    competencyAttained: boolean;
  }) => void;
}

interface FormState {
  answers: Record<string, string>;
  currentQuestionIndex: number;
  submitted: boolean;
}

interface ResultsState {
  score: number;
  passed: boolean;
  feedback: string;
  percentageScore: number;
  canRetryAt?: Date;
  competencyAttained: boolean;
}

export function CompetencyKnowledgeTest({
  assessmentId,
  competencyTitle,
  assessmentTitle,
  assessmentDescription,
  questions,
  maxAttempts = 3,
  attemptNumber = 1,
  requiresRemediationBeforeRetry = false,
  remediationLessonUrl,
  retryRemaining = true,
  canRetryAt,
  onComplete,
}: CompetencyKnowledgeTestProps) {
  const [formState, setFormState] = useState<FormState>({
    answers: {},
    currentQuestionIndex: 0,
    submitted: false,
  });
  const [results, setResults] = useState<ResultsState | null>(null);
  const [loading, setLoading] = useState(false);
  const [retryCountdown, setRetryCountdown] = useState<string | null>(null);

  const currentQuestion = questions[formState.currentQuestionIndex];
  const isLastQuestion = formState.currentQuestionIndex === questions.length - 1;
  const questionsAnswered = Object.keys(formState.answers).length;
  const maxScore = questions.reduce((sum, q) => sum + q.points, 0);

  // Update retry countdown
  useEffect(() => {
    if (!canRetryAt) return;

    const updateCountdown = () => {
      const now = new Date();
      const retryTime = new Date(canRetryAt);
      const diff = retryTime.getTime() - now.getTime();

      if (diff <= 0) {
        setRetryCountdown(null);
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      setRetryCountdown(`${hours}h ${minutes}m`);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [canRetryAt]);

  const handleAnswerChange = (answer: string) => {
    setFormState((prev) => ({
      ...prev,
      answers: {
        ...prev.answers,
        [currentQuestion.id]: answer,
      },
    }));
  };

  const handleNext = () => {
    if (!formState.answers[currentQuestion.id]) {
      toast.error('Please answer this question before proceeding');
      return;
    }

    if (!isLastQuestion) {
      setFormState((prev) => ({
        ...prev,
        currentQuestionIndex: prev.currentQuestionIndex + 1,
      }));
    }
  };

  const handlePrevious = () => {
    if (formState.currentQuestionIndex > 0) {
      setFormState((prev) => ({
        ...prev,
        currentQuestionIndex: prev.currentQuestionIndex - 1,
      }));
    }
  };

  const handleSubmit = async () => {
    if (questionsAnswered !== questions.length) {
      toast.error('Please answer all questions before submitting');
      return;
    }

    setLoading(true);
    try {
      const result = await submitAssessmentAttempt(assessmentId, formState.answers);
      setResults({
        score: result.score,
        passed: result.passed,
        feedback: result.feedback,
        percentageScore: Math.round((result.score / maxScore) * 100),
        canRetryAt: result.canRetryAt,
        competencyAttained: result.competencyAttained,
      });
      setFormState((prev) => ({
        ...prev,
        submitted: true,
      }));

      if (onComplete) {
        onComplete(result);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to submit assessment';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleRetake = () => {
    setFormState({
      answers: {},
      currentQuestionIndex: 0,
      submitted: false,
    });
    setResults(null);
  };

  // Show results page
  if (formState.submitted && results) {
    const attemptsRemaining = maxAttempts - attemptNumber;
    const canRetry = attemptsRemaining > 0 && (!requiresRemediationBeforeRetry || results.competencyAttained);

    return (
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {results.passed ? (
              <>
                <CheckCircle className="h-6 w-6 text-green-600" />
                Assessment Passed!
              </>
            ) : (
              <>
                <AlertCircle className="h-6 w-6 text-orange-600" />
                Assessment Incomplete
              </>
            )}
          </CardTitle>
          <CardDescription>{competencyTitle}</CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Score Display */}
          <div className="text-center">
            <div className="text-5xl font-bold mb-2">{results.percentageScore}%</div>
            <p className="text-gray-600">
              {results.score} of {maxScore} points earned
            </p>
          </div>

          {/* Result Status */}
          {results.passed ? (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                Competency Assessed Successfully! Excellent work on this assessment.
              </AlertDescription>
            </Alert>
          ) : (
            <Alert className="border-orange-200 bg-orange-50">
              <AlertCircle className="h-4 w-4 text-orange-600" />
              <AlertDescription className="text-orange-800">You scored {results.percentageScore}%. Key gaps identified in your response.</AlertDescription>
            </Alert>
          )}

          {/* Feedback */}
          {results.feedback && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Lightbulb className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-blue-900 mb-1">Feedback</h4>
                  <p className="text-blue-800 text-sm">{results.feedback}</p>
                </div>
              </div>
            </div>
          )}

          {/* Badge Status */}
          {results.passed && results.competencyAttained && (
            <Alert className="border-green-200 bg-green-50">
              <Award className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                You're on track to earn your badge! Complete the capstone project to finish.
              </AlertDescription>
            </Alert>
          )}

          {/* Attempts Remaining */}
          {!results.passed && (
            <div className="text-sm text-gray-600">
              <span className="font-semibold">{attemptsRemaining} attempts remaining</span>
              {attemptsRemaining === 1 && <span> - This is your last attempt!</span>}
            </div>
          )}

          {/* Remediation Message */}
          {!results.passed && requiresRemediationBeforeRetry && !results.competencyAttained && (
            <Alert className="border-blue-200 bg-blue-50">
              <AlertCircle className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-800">
                Remediation is required before you can retry. Complete the lesson to refresh key concepts.
              </AlertDescription>
            </Alert>
          )}

          {/* Retry Timer */}
          {!results.passed && retryCountdown && (
            <Alert className="border-yellow-200 bg-yellow-50">
              <Clock className="h-4 w-4 text-yellow-600" />
              <AlertDescription className="text-yellow-800">
                You can retry this assessment in {retryCountdown}
              </AlertDescription>
            </Alert>
          )}

          {/* Actions */}
          <div className="flex gap-3 justify-center flex-wrap">
            {!results.passed && remediationLessonUrl && (
              <Button variant="outline" asChild>
                <a href={remediationLessonUrl} target="_blank" rel="noopener noreferrer">
                  Review Lesson
                </a>
              </Button>
            )}

            {!results.passed && canRetry && !retryCountdown && (
              <Button onClick={handleRetake} className="bg-blue-600 hover:bg-blue-700">
                Retry Assessment
              </Button>
            )}

            {results.passed && (
              <>
                <Button variant="outline">View Next Steps</Button>
                <Button className="bg-green-600 hover:bg-green-700 gap-2">
                  Start Project <ArrowRight className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show question form
  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle>{assessmentTitle}</CardTitle>
        {assessmentDescription && <CardDescription>{assessmentDescription}</CardDescription>}
        <div className="flex items-center gap-4 mt-4 text-sm text-gray-600">
          <div className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            <span>Question {formState.currentQuestionIndex + 1} of {questions.length}</span>
          </div>
          <div className="text-xs">
            Attempt {attemptNumber} of {maxAttempts}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Progress Bar */}
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{
              width: `${((formState.currentQuestionIndex + 1) / questions.length) * 100}%`,
            }}
          />
        </div>

        {/* Question */}
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="bg-blue-100 text-blue-700 rounded-full w-8 h-8 flex items-center justify-center font-semibold flex-shrink-0">
              {formState.currentQuestionIndex + 1}
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold">{currentQuestion.question_text}</h3>
            </div>
          </div>

          {/* Answer Options */}
          <div className="ml-11 space-y-2">
            {currentQuestion.options.map((option, index) => (
              <label
                key={index}
                className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:border-blue-400 hover:bg-blue-50 cursor-pointer transition"
              >
                <input
                  type="radio"
                  name={`question-${currentQuestion.id}`}
                  value={option}
                  checked={formState.answers[currentQuestion.id] === option}
                  onChange={(e) => handleAnswerChange(e.target.value)}
                  className="w-4 h-4"
                />
                <span className="text-gray-700">{option}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Navigation Buttons */}
        <div className="flex justify-between gap-3 pt-4 border-t">
          <Button variant="outline" onClick={handlePrevious} disabled={formState.currentQuestionIndex === 0}>
            Previous
          </Button>

          <div className="flex gap-2">
            {isLastQuestion ? (
              <Button onClick={handleSubmit} loading={loading} className="bg-green-600 hover:bg-green-700">
                Submit Assessment
              </Button>
            ) : (
              <Button onClick={handleNext} className="bg-blue-600 hover:bg-blue-700">
                Next
              </Button>
            )}
          </div>
        </div>

        {/* Question Indicators */}
        <div className="flex flex-wrap gap-2 mt-6 pt-4 border-t">
          {questions.map((_, index) => (
            <button
              key={index}
              onClick={() =>
                setFormState((prev) => ({
                  ...prev,
                  currentQuestionIndex: index,
                }))
              }
              className={`w-8 h-8 rounded-full text-sm font-semibold transition ${
                formState.answers[questions[index].id]
                  ? 'bg-green-100 text-green-700 border border-green-300'
                  : 'bg-gray-100 text-gray-600 border border-gray-300'
              } ${index === formState.currentQuestionIndex ? 'ring-2 ring-blue-500' : ''}`}
            >
              {index + 1}
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
