import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, Circle, AlertCircle } from 'lucide-react';
import type { Database } from '@/integrations/supabase/types';

type Competency = Database['public']['Tables']['competencies']['Row'];

interface CompetencyStatus {
  competencyId: string;
  status: 'not_started' | 'in_progress' | 'assessment_passed' | 'assessment_failed' | 'project_submitted' | 'badge_earned';
  assessmentScore?: number;
  projectStatus?: 'submitted' | 'under_review' | 'graded';
}

interface CompetencyOverviewProps {
  competencies: Competency[];
  learnerProgress: Map<string, CompetencyStatus>;
  onAssessmentClick?: (competencyId: string) => void;
  onProjectClick?: (competencyId: string) => void;
}

function getStatusColor(status: CompetencyStatus['status']): string {
  switch (status) {
    case 'badge_earned':
      return 'bg-green-50 border-green-200';
    case 'assessment_passed':
      return 'bg-blue-50 border-blue-200';
    case 'project_submitted':
      return 'bg-purple-50 border-purple-200';
    case 'assessment_failed':
      return 'bg-yellow-50 border-yellow-200';
    case 'in_progress':
      return 'bg-gray-50 border-gray-200';
    default:
      return 'bg-white border-gray-200';
  }
}

function getStatusIcon(status: CompetencyStatus['status']) {
  switch (status) {
    case 'badge_earned':
      return <CheckCircle className="h-5 w-5 text-green-600" />;
    case 'assessment_passed':
      return <CheckCircle className="h-5 w-5 text-blue-600" />;
    case 'project_submitted':
      return <AlertCircle className="h-5 w-5 text-purple-600" />;
    case 'assessment_failed':
      return <AlertCircle className="h-5 w-5 text-yellow-600" />;
    case 'in_progress':
      return <Circle className="h-5 w-5 text-gray-400" />;
    default:
      return <Circle className="h-5 w-5 text-gray-300" />;
  }
}

function getStatusLabel(status: CompetencyStatus['status']): string {
  switch (status) {
    case 'badge_earned':
      return 'Badge Earned';
    case 'assessment_passed':
      return 'Assessment Passed';
    case 'project_submitted':
      return 'Project Submitted';
    case 'assessment_failed':
      return 'Assessment Failed';
    case 'in_progress':
      return 'In Progress';
    default:
      return 'Not Started';
  }
}

export function CompetencyOverview({
  competencies,
  learnerProgress,
  onAssessmentClick,
  onProjectClick,
}: CompetencyOverviewProps) {
  const badgesEarned = Array.from(learnerProgress.values()).filter(
    p => p.status === 'badge_earned'
  ).length;

  const progressPercentage = Math.round((badgesEarned / competencies.length) * 100);

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Progress Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Your Progress</CardTitle>
          <CardDescription>
            {badgesEarned} of {competencies.length} competencies mastered
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Progress value={progressPercentage} />
            <p className="text-sm text-gray-600 mt-2">{progressPercentage}% complete</p>
          </div>
        </CardContent>
      </Card>

      {/* Competencies Grid */}
      <div className="grid gap-4">
        {competencies.map((competency) => {
          const progress = learnerProgress.get(competency.id);
          const status = progress?.status || 'not_started';

          return (
            <Card
              key={competency.id}
              className={`border-2 cursor-pointer transition-all hover:shadow-lg ${getStatusColor(status)}`}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {getStatusIcon(status)}
                      <CardTitle className="text-lg">{competency.title}</CardTitle>
                    </div>
                    <CardDescription className="text-sm">
                      {competency.description}
                    </CardDescription>
                  </div>
                  <Badge variant="secondary">{getStatusLabel(status)}</Badge>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Observable Behaviors */}
                {competency.observable_behaviors && (
                  <div>
                    <h4 className="font-semibold text-sm mb-2">What You'll Learn:</h4>
                    <ul className="text-sm text-gray-700 space-y-1">
                      {Array.isArray(competency.observable_behaviors)
                        ? competency.observable_behaviors.slice(0, 3).map((behavior, idx) => (
                            <li key={idx} className="flex items-start gap-2">
                              <span className="text-blue-600 mt-0.5">•</span>
                              <span>{behavior}</span>
                            </li>
                          ))
                        : null}
                    </ul>
                    {Array.isArray(competency.observable_behaviors) && competency.observable_behaviors.length > 3 && (
                      <p className="text-xs text-gray-600 mt-2">
                        +{competency.observable_behaviors.length - 3} more
                      </p>
                    )}
                  </div>
                )}

                {/* Success Criteria */}
                {competency.success_criteria && (
                  <div>
                    <h4 className="font-semibold text-sm mb-2">Success Criteria:</h4>
                    <p className="text-sm text-gray-700">{competency.success_criteria}</p>
                  </div>
                )}

                {/* Related Job Titles */}
                {competency.related_job_titles && (
                  <div>
                    <h4 className="font-semibold text-sm mb-2">Relevant Roles:</h4>
                    <div className="flex flex-wrap gap-1">
                      {(Array.isArray(competency.related_job_titles)
                        ? competency.related_job_titles
                        : typeof competency.related_job_titles === 'string'
                        ? competency.related_job_titles.split(',')
                        : []
                      ).slice(0, 3).map((job, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          {job.trim()}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-2 pt-2">
                  {status === 'not_started' || status === 'assessment_failed' ? (
                    <Button
                      size="sm"
                      className="flex-1 bg-blue-600 hover:bg-blue-700"
                      onClick={() => onAssessmentClick?.(competency.id)}
                    >
                      Take Assessment
                    </Button>
                  ) : status === 'assessment_passed' ? (
                    <Button
                      size="sm"
                      className="flex-1 bg-purple-600 hover:bg-purple-700"
                      onClick={() => onProjectClick?.(competency.id)}
                    >
                      Submit Project
                    </Button>
                  ) : status === 'badge_earned' ? (
                    <Button size="sm" variant="outline" disabled className="flex-1">
                      ✓ Mastered
                    </Button>
                  ) : (
                    <Button size="sm" variant="outline" disabled className="flex-1">
                      In Progress
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
