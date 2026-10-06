import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertCircle, CheckCircle, Upload, Link as LinkIcon, Video, FileText, Loader } from 'lucide-react';
import { submitProjectSubmission } from '@/lib/project-submission.server';
import { toast } from 'sonner';

export interface RubricCriteria {
  name: string;
  points: number;
}

export interface RubricData {
  title: string;
  description?: string;
  criteria: RubricCriteria[];
  total_points?: number;
  passing_score_percent: number;
}

export interface ProjectData {
  id: string;
  title: string;
  brief: string;
  example_url?: string;
  submission_instructions: string;
  accepted_file_types: string[];
  max_file_size_mb: number;
  rubric: RubricData;
}

export interface ProjectSubmissionFormProps {
  projectId: string;
  projectData: ProjectData;
  onSubmitSuccess?: (result: {
    submissionId: string;
    status: string;
    submissionVersion: number;
  }) => void;
  previousSubmissions?: Array<{
    id: string;
    version: number;
    submittedAt: string;
    status: string;
    grade?: number;
    feedback?: string;
  }>;
}

type SubmissionType = 'file' | 'url' | 'video';

interface FormState {
  submissionType: SubmissionType;
  fileUrl?: string;
  externalUrl?: string;
  videoUrl?: string;
  submissionText?: string;
  submitted: boolean;
  loading: boolean;
}

export function ProjectSubmissionForm({
  projectId,
  projectData,
  onSubmitSuccess,
  previousSubmissions = [],
}: ProjectSubmissionFormProps) {
  const [formState, setFormState] = useState<FormState>({
    submissionType: 'file',
    submitted: false,
    loading: false,
  });
  const [fileUploadProgress, setFileUploadProgress] = useState(0);

  const acceptedTypesString = projectData.accepted_file_types.join(', ');
  const rubricTotalPoints =
    projectData.rubric.criteria.reduce((sum, c) => sum + c.points, 0) || projectData.rubric.total_points || 100;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const fileExtension = file.name.split('.').pop()?.toLowerCase() || '';
    if (!projectData.accepted_file_types.includes(fileExtension)) {
      toast.error(
        `File type .${fileExtension} not accepted. Accepted types: ${acceptedTypesString}`,
      );
      return;
    }

    // Validate file size
    const fileSizeMb = file.size / (1024 * 1024);
    if (fileSizeMb > projectData.max_file_size_mb) {
      toast.error(`File size exceeds ${projectData.max_file_size_mb}MB limit`);
      return;
    }

    // Simulate file upload (in real app, would upload to storage)
    setFileUploadProgress(0);
    for (let i = 0; i <= 100; i += 20) {
      await new Promise((resolve) => setTimeout(resolve, 100));
      setFileUploadProgress(i);
    }

    setFormState((prev) => ({
      ...prev,
      fileUrl: `uploaded-${file.name}`,
    }));
    toast.success('File uploaded successfully');
  };

  const handleUrlChange = (url: string) => {
    // Basic URL validation
    try {
      new URL(url);
      setFormState((prev) => ({
        ...prev,
        externalUrl: url,
      }));
    } catch {
      toast.error('Invalid URL format');
    }
  };

  const handleVideoUrlChange = (url: string) => {
    setFormState((prev) => ({
      ...prev,
      videoUrl: url,
    }));
  };

  const handleSubmit = async () => {
    // Validate submission based on type
    if (formState.submissionType === 'file' && !formState.fileUrl) {
      toast.error('Please upload a file');
      return;
    }
    if (formState.submissionType === 'url' && !formState.externalUrl) {
      toast.error('Please enter a URL');
      return;
    }
    if (formState.submissionType === 'video' && !formState.videoUrl) {
      toast.error('Please enter a video URL');
      return;
    }

    setFormState((prev) => ({
      ...prev,
      loading: true,
    }));

    try {
      const submission = {
        type: formState.submissionType,
        fileUrl: formState.fileUrl,
        externalUrl: formState.externalUrl,
        videoUrl: formState.videoUrl,
        submissionText: formState.submissionText,
      };

      const result = await submitProjectSubmission(projectId, submission);

      setFormState((prev) => ({
        ...prev,
        submitted: true,
        loading: false,
      }));

      if (onSubmitSuccess) {
        onSubmitSuccess(result);
      }

      toast.success('Project submitted successfully!');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to submit project';
      toast.error(errorMessage);
      setFormState((prev) => ({
        ...prev,
        loading: false,
      }));
    }
  };

  const handleStartOver = () => {
    setFormState({
      submissionType: 'file',
      submitted: false,
      loading: false,
    });
    setFileUploadProgress(0);
  };

  // Show success message
  if (formState.submitted) {
    return (
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-6 w-6 text-green-600" />
            Project Submitted Successfully!
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              Your project has been submitted for review. You'll receive feedback within 2-3 business days.
            </AlertDescription>
          </Alert>

          {previousSubmissions.length > 0 && (
            <div>
              <h3 className="font-semibold mb-3">Submission History</h3>
              <div className="space-y-2">
                {previousSubmissions.map((sub) => (
                  <div
                    key={sub.id}
                    className="p-3 border border-gray-200 rounded-lg flex justify-between items-start"
                  >
                    <div>
                      <div className="font-medium">Version {sub.version}</div>
                      <div className="text-sm text-gray-600">Submitted: {sub.submittedAt}</div>
                      <div className="text-xs text-gray-500 mt-1">Status: {sub.status}</div>
                    </div>
                    {sub.grade && <div className="text-lg font-bold text-green-600">{sub.grade}%</div>}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-3 justify-center">
            <Button variant="outline" onClick={handleStartOver}>
              Submit Another Version
            </Button>
            <Button className="bg-blue-600 hover:bg-blue-700">Return to Course</Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-4xl">
      <CardHeader>
        <CardTitle>{projectData.title}</CardTitle>
        <CardDescription>Complete this project to demonstrate your competency</CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Project Brief */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-900 mb-2">Project Brief</h3>
          <p className="text-blue-800 text-sm leading-relaxed">{projectData.brief}</p>
        </div>

        {/* Project Instructions */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h3 className="font-semibold text-gray-900 mb-2">Submission Instructions</h3>
          <p className="text-gray-700 text-sm leading-relaxed">{projectData.submission_instructions}</p>

          {projectData.example_url && (
            <div className="mt-3">
              <a
                href={projectData.example_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline text-sm font-medium"
              >
                View Example Submission →
              </a>
            </div>
          )}
        </div>

        {/* Rubric Display */}
        <div>
          <h3 className="font-semibold mb-3">Evaluation Rubric</h3>
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="bg-gray-50 p-3 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <div className="font-semibold">{projectData.rubric.title}</div>
                <div className="text-sm text-gray-600">Total: {rubricTotalPoints} points</div>
              </div>
            </div>
            <div className="divide-y divide-gray-200">
              {projectData.rubric.criteria.map((criterion, index) => (
                <div key={index} className="p-3 flex justify-between items-center hover:bg-gray-50">
                  <span className="text-gray-700">{criterion.name}</span>
                  <span className="font-semibold text-gray-900">{criterion.points} points</span>
                </div>
              ))}
            </div>
            <div className="bg-blue-50 p-3 border-t border-gray-200 text-sm text-gray-600">
              Passing Score: {projectData.rubric.passing_score_percent}%
            </div>
          </div>
        </div>

        {/* Submission Tabs */}
        <div>
          <h3 className="font-semibold mb-3">Submit Your Work</h3>
          <Tabs
            defaultValue="file"
            value={formState.submissionType}
            onValueChange={(value) =>
              setFormState((prev) => ({
                ...prev,
                submissionType: value as SubmissionType,
              }))
            }
          >
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="file" className="gap-2">
                <Upload className="h-4 w-4" />
                Upload File
              </TabsTrigger>
              <TabsTrigger value="url" className="gap-2">
                <LinkIcon className="h-4 w-4" />
                URL
              </TabsTrigger>
              <TabsTrigger value="video" className="gap-2">
                <Video className="h-4 w-4" />
                Video
              </TabsTrigger>
            </TabsList>

            <TabsContent value="file" className="space-y-4 mt-4">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8">
                <div className="flex flex-col items-center">
                  <Upload className="h-8 w-8 text-gray-400 mb-2" />
                  <p className="text-sm font-medium text-gray-700">Drag and drop your file here</p>
                  <p className="text-xs text-gray-500">or click to select</p>
                  <input
                    type="file"
                    onChange={handleFileChange}
                    className="hidden"
                    id="file-upload"
                    accept={projectData.accepted_file_types.map((t) => `.${t}`).join(',')}
                  />
                  <label htmlFor="file-upload" className="mt-4">
                    <Button variant="outline" asChild>
                      <span>Choose File</span>
                    </Button>
                  </label>
                </div>
              </div>

              <div className="text-xs text-gray-600 space-y-1">
                <p>Accepted formats: {acceptedTypesString}</p>
                <p>Maximum file size: {projectData.max_file_size_mb}MB</p>
              </div>

              {fileUploadProgress > 0 && fileUploadProgress < 100 && (
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all"
                    style={{ width: `${fileUploadProgress}%` }}
                  />
                </div>
              )}

              {formState.fileUrl && (
                <Alert className="border-green-200 bg-green-50">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800">File uploaded: {formState.fileUrl}</AlertDescription>
                </Alert>
              )}
            </TabsContent>

            <TabsContent value="url" className="space-y-4 mt-4">
              <div>
                <label className="text-sm font-medium">Project URL</label>
                <input
                  type="url"
                  placeholder="https://example.com/project"
                  value={formState.externalUrl || ''}
                  onChange={(e) => handleUrlChange(e.target.value)}
                  className="w-full mt-2 p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </TabsContent>

            <TabsContent value="video" className="space-y-4 mt-4">
              <div>
                <label className="text-sm font-medium">Video URL</label>
                <input
                  type="url"
                  placeholder="https://youtube.com/watch?v=... or other video URL"
                  value={formState.videoUrl || ''}
                  onChange={(e) => handleVideoUrlChange(e.target.value)}
                  className="w-full mt-2 p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Optional Notes */}
        <div>
          <label className="text-sm font-medium">Additional Notes (Optional)</label>
          <textarea
            placeholder="Add any notes about your submission..."
            value={formState.submissionText || ''}
            onChange={(e) =>
              setFormState((prev) => ({
                ...prev,
                submissionText: e.target.value,
              }))
            }
            className="w-full mt-2 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={4}
          />
        </div>

        {/* Submit Button */}
        <Button
          onClick={handleSubmit}
          loading={formState.loading}
          disabled={
            formState.loading ||
            (!formState.fileUrl && !formState.externalUrl && !formState.videoUrl)
          }
          className="w-full bg-green-600 hover:bg-green-700"
        >
          {formState.loading ? (
            <>
              <Loader className="h-4 w-4 mr-2 animate-spin" />
              Submitting...
            </>
          ) : (
            'Submit Project'
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
