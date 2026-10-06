import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, CheckCircle, Clock, HelpCircle } from 'lucide-react';
import { submitDiagnosticAttempt, canRetakeDiagnostic } from '@/lib/diagnostic.server';
import { toast } from 'sonner';

export interface DiagnosticQuestion {
  id: string;
  question_text: string;
  question_type: 'multiple_choice' | 'short_answer';
  options?: string[];
  correct_answer: string;
  points: number;
  order_index: number;
}

export interface DiagnosticAssessmentProps {
  diagnosticId: string;
  diagnosticName: string;
  diagnosticDescription: string;
  questions: DiagnosticQuestion[];
  estimatedTimeMinutes?: number;
  onComplete?: (result: {
    score: number;
    passed: boolean;
    nextSteps: string[];
  }) => void;
  cooldownMessage?: string;
  canRetake?: boolean;
}

interface FormState {
  answers: Record<string, string>;
  currentQuestionIndex: number;
  submitted: boolean;
}

interface ResultsState {
  score: number;
  passed: boolean;
  nextSteps: string[];
  percentageScore: number;
}

export function DiagnosticAssessment({
  diagnosticId,
  diagnosticName,
  diagnosticDescription,
  questions,
  estimatedTimeMinutes = 30,
  onComplete,
  cooldownMessage,
  canRetake = true,
}: DiagnosticAssessmentProps) {
  const [formState, setFormState] = useState<FormState>({
    answers: {},
    currentQuestionIndex: 0,
    submitted: false,
  });
  const [results, setResults] = useState<ResultsState | null>(null);
  const [loading, setLoading] = useState(false);

  const currentQuestion = questions[formState.currentQuestionIndex];
  const isLastQuestion = formState.currentQuestionIndex === questions.length - 1;
  const questionsAnswered = Object.keys(formState.answers).length;

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
    // Verify all questions are answered
    if (questionsAnswered !== questions.length) {
      toast.error('Please answer all questions before submitting');
      return;
    }

    setLoading(true);
    try {
      const result = await submitDiagnosticAttempt(diagnosticId, formState.answers);
      setResults({
        score: result.score,
        passed: result.passed,
        nextSteps: result.nextSteps,
        percentageScore: Math.round((result.score / questions.length) * 100),
      });
      setFormState((prev) => ({
        ...prev,
        submitted: true,
      }));

      if (onComplete) {
        onComplete(result);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to submit diagnostic';
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
    return (
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {results.passed ? (
              <>
                <CheckCircle className="h-6 w-6 text-green-600" />
                Diagnostic Complete - Ready to Proceed!
              </>
            ) : (
              <>
                <AlertCircle className="h-6 w-6 text-orange-600" />
                Diagnostic Complete - Additional Preparation Recommended
              </>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Score Display */}
          <div className="text-center">
            <div className="text-5xl font-bold mb-2">{results.percentageScore}%</div>
            <p className="text-gray-600">Your Score</p>
          </div>

          {/* Result Message */}
          {results.passed ? (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                You scored {results.percentageScore}%. You're ready! You can enroll in this course.
              </AlertDescription>
            </Alert>
          ) : (
            <Alert className="border-orange-200 bg-orange-50">
              <AlertCircle className="h-4 w-4 text-orange-600" />
              <AlertDescription className="text-orange-800">
                You scored {results.percentageScore}%. Consider reviewing the recommended prerequisite
                courses before starting this course.
              </AlertDescription>
            </Alert>
          )}

          {/* Next Steps */}
          {results.nextSteps.length > 0 && (
            <div>
              <h3 className="font-semibold mb-3">Next Steps</h3>
              <ul className="space-y-2">
                {results.nextSteps.map((step, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <span className="text-blue-600 font-semibold">{index + 1}.</span>
                    <span className="text-gray-700">{step}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Cooldown Message */}
          {cooldownMessage && (
            <Alert className="border-blue-200 bg-blue-50">
              <Clock className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-800">{cooldownMessage}</AlertDescription>
            </Alert>
          )}

          {/* Actions */}
          <div className="flex gap-3 justify-center">
            <Button variant="outline" onClick={handleRetake} disabled={!canRetake || !!cooldownMessage}>
              {cooldownMessage ? 'Cannot Retake Yet' : 'Retake Diagnostic'}
            </Button>
            {results.passed && (
              <Button className="bg-green-600 hover:bg-green-700">Enroll in Course</Button>
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
        <CardTitle>{diagnosticName}</CardTitle>
        <CardDescription>{diagnosticDescription}</CardDescription>
        <div className="flex items-center gap-4 mt-4 text-sm text-gray-600">
          <div className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            <span>Estimated time: {estimatedTimeMinutes} minutes</span>
          </div>
          <div>
            Question {formState.currentQuestionIndex + 1} of {questions.length}
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
              Q{formState.currentQuestionIndex + 1}
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold">{currentQuestion.question_text}</h3>
              <p className="text-sm text-gray-500 mt-1">Points: {currentQuestion.points}</p>
            </div>
          </div>

          {/* Answer Options */}
          <div className="ml-11 space-y-3">
            {currentQuestion.question_type === 'multiple_choice' && currentQuestion.options ? (
              <div className="space-y-2">
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
            ) : (
              <textarea
                value={formState.answers[currentQuestion.id] || ''}
                onChange={(e) => handleAnswerChange(e.target.value)}
                placeholder="Enter your answer here..."
                className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={4}
              />
            )}
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
                Submit Diagnostic
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
