import { createFileRoute } from '@tanstack/react-router';
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, BookOpen, Trophy, Clock, CheckCircle } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useNavigate } from '@tanstack/react-router';

interface CompetencyStatus {
  id: string;
  title: string;
  description: string;
  observable_behaviors: string[];
  success_criteria: string;
  status: 'not_started' | 'in_progress' | 'assessment_passed' | 'assessment_failed' | 'project_in_progress' | 'badge_earned';
  assessmentScore?: number;
  projectStatus?: string;
  badgeEarned?: boolean;
}

interface CourseCompetencies {
  courseId: string;
  competencies: CompetencyStatus[];
  masteredCount: number;
  totalCount: number;
}

export const Route = createFileRoute('/learn/$courseId/competencies')({
  component: CompetenciesPage,
});

function CompetenciesPage() {
  const { courseId } = Route.useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [competencies, setCompetencies] = useState<CourseCompetencies | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch competencies for course
    const fetchCompetencies = async () => {
      try {
        // In real implementation, fetch from API
        // const response = await fetch(`/api/courses/${courseId}/competencies`);
        // const data = await response.json();
        // setCompetencies(data);

        // Mock data for now
        setCompetencies({
          courseId,
          competencies: [
            {
              id: '1',
              title: 'API Design',
              description: 'Design and build RESTful APIs following best practices',
              observable_behaviors: [
                'Create endpoints with proper HTTP methods',
                'Implement authentication and authorization',
                'Handle errors gracefully',
              ],
              success_criteria:
                'Learner can design a complete API with authentication, proper error handling, and documentation.',
              status: 'badge_earned',
              assessmentScore: 85,
              projectStatus: 'graded',
              badgeEarned: true,
            },
            {
              id: '2',
              title: 'Database Design',
              description: 'Model and implement database schemas for complex applications',
              observable_behaviors: [
                'Design normalized schemas',
                'Implement relationships and constraints',
                'Optimize for query performance',
              ],
              success_criteria:
                'Learner can design a normalized database schema with appropriate indexes and relationships.',
              status: 'assessment_passed',
              assessmentScore: 78,
            },
            {
              id: '3',
              title: 'Testing & Quality',
              description: 'Write tests and ensure code quality',
              observable_behaviors: [
                'Write unit tests',
                'Write integration tests',
                'Use code coverage tools',
              ],
              success_criteria: 'Learner can write comprehensive tests with >80% code coverage.',
              status: 'in_progress',
            },
            {
              id: '4',
              title: 'Deployment & DevOps',
              description: 'Deploy applications to production and manage infrastructure',
              observable_behaviors: [
                'Use container technologies',
                'Set up CI/CD pipelines',
                'Monitor and debug production issues',
              ],
              success_criteria: 'Learner can deploy a full-stack application with automated testing and monitoring.',
              status: 'not_started',
            },
          ],
          masteredCount: 1,
          totalCount: 4,
        });
      } catch (error) {
        console.error('Failed to fetch competencies:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCompetencies();
  }, [courseId]);

  const getStatusColor = (status: CompetencyStatus['status']) => {
    switch (status) {
      case 'not_started':
        return 'bg-gray-100 text-gray-700';
      case 'in_progress':
        return 'bg-blue-100 text-blue-700';
      case 'assessment_passed':
        return 'bg-green-100 text-green-700';
      case 'assessment_failed':
        return 'bg-orange-100 text-orange-700';
      case 'project_in_progress':
        return 'bg-purple-100 text-purple-700';
      case 'badge_earned':
        return 'bg-green-100 text-green-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusIcon = (status: CompetencyStatus['status']) => {
    switch (status) {
      case 'badge_earned':
        return <Trophy className="h-4 w-4" />;
      case 'assessment_passed':
        return <CheckCircle className="h-4 w-4" />;
      case 'in_progress':
        return <Clock className="h-4 w-4" />;
      default:
        return <BookOpen className="h-4 w-4" />;
    }
  };

  const getStatusLabel = (status: CompetencyStatus['status']) => {
    switch (status) {
      case 'not_started':
        return 'Not Started';
      case 'in_progress':
        return 'In Progress';
      case 'assessment_passed':
        return 'Assessment Passed';
      case 'assessment_failed':
        return 'Assessment Failed';
      case 'project_in_progress':
        return 'Project In Progress';
      case 'badge_earned':
        return 'Badge Earned';
      default:
        return 'Unknown';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading competencies...</p>
        </div>
      </div>
    );
  }

  if (!competencies) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600">Unable to load competencies</p>
      </div>
    );
  }

  const progressPercentage = (competencies.masteredCount / competencies.totalCount) * 100;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Course Competencies</h1>
          <p className="text-gray-600">Master key skills by completing assessments and projects</p>
        </div>

        {/* Progress Summary */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-yellow-600" />
              Your Progress
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-700">Competencies Mastered</span>
                <span className="text-2xl font-bold text-blue-600">
                  {competencies.masteredCount} of {competencies.totalCount}
                </span>
              </div>
              <Progress value={progressPercentage} className="h-3" />
            </div>
            <p className="text-sm text-gray-600">
              {competencies.totalCount - competencies.masteredCount} competencies remaining
            </p>
          </CardContent>
        </Card>

        {/* Competencies Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {competencies.competencies.map((competency) => (
            <Card key={competency.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{competency.title}</CardTitle>
                    <CardDescription className="mt-1">{competency.description}</CardDescription>
                  </div>
                  <Badge className={`ml-2 gap-1 ${getStatusColor(competency.status)}`}>
                    {getStatusIcon(competency.status)}
                    {getStatusLabel(competency.status)}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Observable Behaviors */}
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">What You'll Learn</h4>
                  <ul className="space-y-1">
                    {competency.observable_behaviors.map((behavior, index) => (
                      <li key={index} className="text-sm text-gray-600 flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                        {behavior}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Success Criteria */}
                <div className="bg-blue-50 border border-blue-200 rounded p-3">
                  <p className="text-sm text-blue-900">
                    <span className="font-semibold">Success Criteria: </span>
                    {competency.success_criteria}
                  </p>
                </div>

                {/* Score Display */}
                {competency.assessmentScore && (
                  <div className="flex items-center justify-between text-sm bg-green-50 p-2 rounded">
                    <span className="text-gray-700">Assessment Score:</span>
                    <span className="font-bold text-green-700">{competency.assessmentScore}%</span>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-2 pt-2">
                  {competency.status === 'not_started' && (
                    <Button
                      className="w-full bg-blue-600 hover:bg-blue-700"
                      onClick={() => navigate({ to: `/learn/${courseId}/${competency.id}/assessment` })}
                    >
                      Start Assessment
                    </Button>
                  )}

                  {(competency.status === 'in_progress' || competency.status === 'assessment_failed') && (
                    <Button
                      className="w-full bg-blue-600 hover:bg-blue-700"
                      onClick={() => navigate({ to: `/learn/${courseId}/${competency.id}/assessment` })}
                    >
                      Continue Assessment
                    </Button>
                  )}

                  {competency.status === 'assessment_passed' && (
                    <Button
                      className="w-full bg-green-600 hover:bg-green-700"
                      onClick={() => navigate({ to: `/learn/${courseId}/${competency.id}/project` })}
                    >
                      Start Project
                    </Button>
                  )}

                  {competency.status === 'project_in_progress' && (
                    <Button
                      className="w-full bg-purple-600 hover:bg-purple-700"
                      onClick={() => navigate({ to: `/learn/${courseId}/${competency.id}/project` })}
                    >
                      Submit Project
                    </Button>
                  )}

                  {competency.status === 'badge_earned' && (
                    <Button variant="outline" className="w-full">
                      View Badge
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
