import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useState, useEffect } from 'react';
import { ProjectSubmissionForm } from '@/components/project-submission-form';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Loader2, AlertCircle, CheckCircle2, Clock } from 'lucide-react';

export const Route = createFileRoute('/learn/$courseId/$competencyId/project')({
  component: ProjectSubmissionRoute,
});

interface ProjectData {
  id: string;
  competencyId: string;
  title: string;
  brief: string;
  exampleUrl: string;
  submissionInstructions: string;
  acceptedFileTypes: string[];
  maxFileSizeMb: number;
  rubricId: string;
  rubricTitle: string;
}

interface Submission {
  id: string;
  submissionVersion: number;
  submissionType: 'file' | 'url' | 'video';
  fileUrl?: string;
  externalUrl?: string;
  videoUrl?: string;
  status: 'submitted' | 'under_review' | 'graded';
  submissionText?: string;
  createdAt: Date;
  gradeScore?: number;
  gradeFeedback?: string;
}

function ProjectSubmissionRoute() {
  const { courseId, competencyId } = Route.useParams();
  const navigate = useNavigate();

  const [project, setProject] = useState<ProjectData | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUserEnrolled, setIsUserEnrolled] = useState(true);
  const [assessmentPassed, setAssessmentPassed] = useState(true);
  const [submissionSuccess, setSubmissionSuccess] = useState(false);
  const [lastSubmission, setLastSubmission] = useState<Submission | null>(null);

  // Mock: Load project details and user's previous submissions
  useEffect(() => {
    setIsLoading(true);
    setTimeout(() => {
      // Check if user is enrolled in course
      setIsUserEnrolled(true);

      // Check if competency assessment is passed
      setAssessmentPassed(true);

      // Load project details
      setProject({
        id: `proj-${competencyId}`,
        competencyId,
        title: 'Capstone: Deploy Your API',
        brief: `Build and deploy a Node.js REST API with the following requirements:
- Implement at least 5 endpoints (GET, POST, PUT, DELETE)
- Use a database (PostgreSQL or MongoDB)
- Implement error handling and validation
- Add comprehensive API documentation
- Deploy to a cloud platform (Heroku, Render, or similar)
- Include at least 3 unit tests`,
        exampleUrl: 'https://github.com/example/api-capstone',
        submissionInstructions: `Submit your project as a URL link to your:
- GitHub repository (required for code review)
- Deployed application link (if applicable)
- Or as a ZIP file containing your complete project

Include a README.md with setup instructions and API documentation.`,
        acceptedFileTypes: ['zip', 'pdf', 'json'],
        maxFileSizeMb: 100,
        rubricId: 'rubric-1',
        rubricTitle: 'API Deployment Rubric',
      });

      // Load user's previous submissions (mock)
      const mockSubmissions: Submission[] = [
        {
          id: 'sub-1',
          submissionVersion: 1,
          submissionType: 'url',
          externalUrl: 'https://github.com/student/api-v1',
          status: 'graded',
          createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          gradeScore: 65,
          gradeFeedback: 'Good effort but code quality needs improvement. See feedback on GitHub.',
        },
        {
          id: 'sub-2',
          submissionVersion: 2,
          submissionType: 'url',
          externalUrl: 'https://github.com/student/api-v2',
          status: 'under_review',
          createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        },
      ];
      setSubmissions(mockSubmissions);
      setLastSubmission(mockSubmissions[mockSubmissions.length - 1]);

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

  if (!assessmentPassed) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 flex items-center justify-center">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <AlertCircle className="h-12 w-12 text-orange-600 mx-auto mb-4" />
            <h1 className="text-xl font-bold mb-2">Assessment Required</h1>
            <p className="text-gray-600 mb-4">
              You need to pass the knowledge test before submitting your project.
            </p>
            <Button
              onClick={() =>
                navigate({
                  to: '/learn/$courseId/$competencyId/assessment',
                  params: { courseId, competencyId },
                })
              }
              className="w-full"
            >
              Take Assessment
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (submissionSuccess) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardContent className="p-8 text-center">
              <CheckCircle2 className="h-16 w-16 text-green-600 mx-auto mb-4" />
              <h1 className="text-2xl font-bold mb-2">Project Submitted!</h1>
              <p className="text-gray-600 mb-6">
                Your project has been received and is now in the grading queue. You'll receive feedback within 3-5 business days.
              </p>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <div className="text-sm text-gray-700 mb-2">
                  <strong>Next Steps:</strong>
                </div>
                <ul className="text-sm text-gray-700 space-y-1">
                  <li>• Instructor will review your submission</li>
                  <li>• You'll receive detailed feedback via email</li>
                  <li>• If you pass, your badge will be automatically issued</li>
                </ul>
              </div>
              <Button
                onClick={() =>
                  navigate({ to: '/learn/$courseId/competencies', params: { courseId } })
                }
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

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold mb-2">{project?.title}</h1>
          <p className="text-gray-600">Submit your project for evaluation and badge consideration</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Form */}
          <div className="lg:col-span-2">
            {project && (
              <ProjectSubmissionForm
                projectId={project.id}
                title={project.title}
                brief={project.brief}
                exampleUrl={project.exampleUrl}
                submissionInstructions={project.submissionInstructions}
                acceptedFileTypes={project.acceptedFileTypes}
                maxFileSizeMb={project.maxFileSizeMb}
                rubricTitle={project.rubricTitle}
                onSubmit={async (submission) => {
                  // Mock submission
                  const newSubmission: Submission = {
                    id: `sub-${Date.now()}`,
                    submissionVersion: (submissions.length || 0) + 1,
                    submissionType: submission.type,
                    fileUrl: submission.fileUrl,
                    externalUrl: submission.externalUrl,
                    videoUrl: submission.videoUrl,
                    submissionText: submission.submissionText,
                    status: 'submitted',
                    createdAt: new Date(),
                  };

                  setSubmissions((prev) => [...prev, newSubmission]);
                  setLastSubmission(newSubmission);
                  setSubmissionSuccess(true);
                }}
              />
            )}
          </div>

          {/* Submission History Sidebar */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Submission History</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {submissions.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">No submissions yet</p>
                ) : (
                  submissions.map((submission, idx) => (
                    <div
                      key={submission.id}
                      className="border rounded-lg p-3 space-y-2"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="text-sm font-medium">v{submission.submissionVersion}</div>
                          <div className="text-xs text-gray-500">
                            {submission.createdAt.toLocaleDateString()}
                          </div>
                        </div>
                        <Badge
                          variant={
                            submission.status === 'graded'
                              ? submission.gradeScore! >= 70
                                ? 'default'
                                : 'secondary'
                              : 'outline'
                          }
                          className={
                            submission.status === 'graded'
                              ? submission.gradeScore! >= 70
                                ? 'bg-green-600'
                                : 'bg-red-600'
                              : ''
                          }
                        >
                          {submission.status === 'submitted' && 'Submitted'}
                          {submission.status === 'under_review' && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" /> Review
                            </span>
                          )}
                          {submission.status === 'graded' && `${submission.gradeScore}%`}
                        </Badge>
                      </div>

                      <div className="text-xs text-gray-600">
                        {submission.submissionType === 'url' && (
                          <a
                            href={submission.externalUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline truncate block"
                          >
                            {submission.externalUrl}
                          </a>
                        )}
                        {submission.submissionType === 'file' && (
                          <span>{submission.fileUrl?.split('/').pop()}</span>
                        )}
                        {submission.submissionType === 'video' && (
                          <span>Video submission</span>
                        )}
                      </div>

                      {submission.status === 'graded' && submission.gradeFeedback && (
                        <div className="bg-gray-50 p-2 rounded text-xs text-gray-700 border-l-2 border-gray-300">
                          <strong>Feedback:</strong> {submission.gradeFeedback}
                        </div>
                      )}
                    </div>
                  ))
                )}

                <Button
                  variant="outline"
                  onClick={() =>
                    navigate({
                      to: '/learn/$courseId/competencies',
                      params: { courseId },
                    })
                  }
                  className="w-full mt-4"
                >
                  Back to Competencies
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
