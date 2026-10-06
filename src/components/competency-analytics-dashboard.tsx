import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, Download, Calendar } from 'lucide-react';

interface CompetencyMetrics {
  id: string;
  title: string;
  assessmentPassRate: number;
  projectSubmissionRate: number;
  badgeEarningRate: number;
  averageAttemptsToMastery: number;
  totalLearners: number;
  learnersPassedAssessment: number;
  learnersSubmittedProject: number;
  learnersEarnedBadge: number;
}

interface FailurePoint {
  competencyId: string;
  competencyTitle: string;
  type: 'question' | 'criterion';
  name: string;
  failureRate: number;
}

interface LearnerProgress {
  learnerId: string;
  learnerName: string;
  competencyStatuses: Record<string, 'not_started' | 'in_progress' | 'assessment_passed' | 'assessment_failed' | 'project_submitted' | 'badge_earned'>;
}

interface CompetencyAnalyticsDashboardProps {
  courseId: string;
}

const COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6'];

const STATUS_LABELS = {
  not_started: 'Not Started',
  in_progress: 'In Progress',
  assessment_passed: 'Assessment Passed',
  assessment_failed: 'Assessment Failed',
  project_submitted: 'Project Submitted',
  badge_earned: 'Badge Earned',
};

const STATUS_COLORS = {
  not_started: 'bg-gray-100 text-gray-800',
  in_progress: 'bg-blue-100 text-blue-800',
  assessment_passed: 'bg-green-100 text-green-800',
  assessment_failed: 'bg-red-100 text-red-800',
  project_submitted: 'bg-yellow-100 text-yellow-800',
  badge_earned: 'bg-green-600 text-white',
};

export function CompetencyAnalyticsDashboard({ courseId }: CompetencyAnalyticsDashboardProps) {
  const [selectedCompetency, setSelectedCompetency] = useState<string>('all');
  const [dateRange, setDateRange] = useState<string>('30');
  const [learnerGroup, setLearnerGroup] = useState<string>('all');

  // Mock data
  const competencies: CompetencyMetrics[] = [
    {
      id: 'comp-1',
      title: 'API Design & Development',
      assessmentPassRate: 82,
      projectSubmissionRate: 78,
      badgeEarningRate: 75,
      averageAttemptsToMastery: 1.8,
      totalLearners: 50,
      learnersPassedAssessment: 41,
      learnersSubmittedProject: 39,
      learnersEarnedBadge: 37,
    },
    {
      id: 'comp-2',
      title: 'Database Design & Optimization',
      assessmentPassRate: 76,
      projectSubmissionRate: 70,
      badgeEarningRate: 68,
      averageAttemptsToMastery: 2.1,
      totalLearners: 50,
      learnersPassedAssessment: 38,
      learnersSubmittedProject: 35,
      learnersEarnedBadge: 34,
    },
    {
      id: 'comp-3',
      title: 'Cloud Deployment',
      assessmentPassRate: 88,
      projectSubmissionRate: 85,
      badgeEarningRate: 82,
      averageAttemptsToMastery: 1.6,
      totalLearners: 50,
      learnersPassedAssessment: 44,
      learnersSubmittedProject: 42,
      learnersEarnedBadge: 41,
    },
  ];

  const failurePoints: FailurePoint[] = [
    {
      competencyId: 'comp-1',
      competencyTitle: 'API Design & Development',
      type: 'question',
      name: 'Authentication patterns',
      failureRate: 35,
    },
    {
      competencyId: 'comp-1',
      competencyTitle: 'API Design & Development',
      type: 'question',
      name: 'Rate limiting implementation',
      failureRate: 28,
    },
    {
      competencyId: 'comp-1',
      competencyTitle: 'API Design & Development',
      type: 'criterion',
      name: 'Code Quality (rubric)',
      failureRate: 20,
    },
    {
      competencyId: 'comp-2',
      competencyTitle: 'Database Design & Optimization',
      type: 'question',
      name: 'Query optimization',
      failureRate: 42,
    },
    {
      competencyId: 'comp-2',
      competencyTitle: 'Database Design & Optimization',
      type: 'criterion',
      name: 'Documentation (rubric)',
      failureRate: 32,
    },
    {
      competencyId: 'comp-3',
      competencyTitle: 'Cloud Deployment',
      type: 'question',
      name: 'Infrastructure as Code',
      failureRate: 18,
    },
  ];

  const learnerProgressData: LearnerProgress[] = [
    {
      learnerId: 'user-1',
      learnerName: 'Alice Johnson',
      competencyStatuses: {
        'comp-1': 'badge_earned',
        'comp-2': 'assessment_passed',
        'comp-3': 'badge_earned',
      },
    },
    {
      learnerId: 'user-2',
      learnerName: 'Bob Smith',
      competencyStatuses: {
        'comp-1': 'badge_earned',
        'comp-2': 'in_progress',
        'comp-3': 'assessment_passed',
      },
    },
    {
      learnerId: 'user-3',
      learnerName: 'Charlie Brown',
      competencyStatuses: {
        'comp-1': 'assessment_failed',
        'comp-2': 'not_started',
        'comp-3': 'in_progress',
      },
    },
    {
      learnerId: 'user-4',
      learnerName: 'Diana Prince',
      competencyStatuses: {
        'comp-1': 'badge_earned',
        'comp-2': 'badge_earned',
        'comp-3': 'project_submitted',
      },
    },
    {
      learnerId: 'user-5',
      learnerName: 'Eve Wilson',
      competencyStatuses: {
        'comp-1': 'in_progress',
        'comp-2': 'assessment_passed',
        'comp-3': 'badge_earned',
      },
    },
  ];

  // Filter data based on selections
  const filteredCompetencies = useMemo(() => {
    if (selectedCompetency === 'all') return competencies;
    return competencies.filter((c) => c.id === selectedCompetency);
  }, [selectedCompetency]);

  const filteredFailurePoints = useMemo(() => {
    if (selectedCompetency === 'all') return failurePoints;
    return failurePoints.filter((fp) => fp.competencyId === selectedCompetency);
  }, [selectedCompetency]);

  const filteredLearnerProgress = useMemo(() => {
    if (learnerGroup === 'all') return learnerProgressData;
    if (learnerGroup === 'mastered') {
      return learnerProgressData.filter((lp) =>
        Object.values(lp.competencyStatuses).includes('badge_earned')
      );
    }
    if (learnerGroup === 'struggling') {
      return learnerProgressData.filter((lp) =>
        Object.values(lp.competencyStatuses).includes('assessment_failed')
      );
    }
    return learnerProgressData;
  }, [learnerGroup]);

  // Prepare chart data
  const metricsChartData = filteredCompetencies.map((c) => ({
    title: c.title.substring(0, 12),
    'Assessment Pass %': c.assessmentPassRate,
    'Project Submit %': c.projectSubmissionRate,
    'Badge Earned %': c.badgeEarningRate,
  }));

  const failurePointsChartData = filteredFailurePoints.slice(0, 5).map((fp) => ({
    name: fp.name.substring(0, 15),
    'Failure Rate %': fp.failureRate,
  }));

  const handleExportCSV = () => {
    // Create CSV content
    const headers = ['Learner Name', ...filteredCompetencies.map((c) => c.title)];
    const rows = filteredLearnerProgress.map((lp) => [
      lp.learnerName,
      ...filteredCompetencies.map((c) => STATUS_LABELS[lp.competencyStatuses[c.id] || 'not_started']),
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n');

    // Download
    const element = document.createElement('a');
    element.setAttribute('href', `data:text/csv;charset=utf-8,${encodeURIComponent(csvContent)}`);
    element.setAttribute('download', `competency-analytics-${new Date().toISOString().split('T')[0]}.csv`);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold">Competency Analytics</h2>
        <p className="text-gray-600 text-sm mt-1">Track mastery rates, failure points, and learner progress</p>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="text-sm font-medium block mb-2">Competency</label>
          <Select value={selectedCompetency} onValueChange={setSelectedCompetency}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Competencies</SelectItem>
              {competencies.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="text-sm font-medium block mb-2">Date Range</label>
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
              <SelectItem value="all">All time</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="text-sm font-medium block mb-2">Learner Group</label>
          <Select value={learnerGroup} onValueChange={setLearnerGroup}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Learners</SelectItem>
              <SelectItem value="mastered">Mastered (Badges Earned)</SelectItem>
              <SelectItem value="struggling">Struggling (Failed Assessments)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {filteredCompetencies.map((comp) => (
          <Card key={comp.id}>
            <CardContent className="p-4">
              <div className="text-sm font-medium text-gray-600 mb-1">Assessment Pass Rate</div>
              <div className="text-2xl font-bold text-blue-600">{comp.assessmentPassRate}%</div>
              <div className="text-xs text-gray-500 mt-2">
                {comp.learnersPassedAssessment} of {comp.totalLearners} learners
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Mastery Rates by Competency */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Mastery Rates by Competency</CardTitle>
            <CardDescription>Assessment, project, and badge completion rates</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={metricsChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="title" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="Assessment Pass %" fill="#3b82f6" />
                <Bar dataKey="Project Submit %" fill="#10b981" />
                <Bar dataKey="Badge Earned %" fill="#f59e0b" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Common Failure Points */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Common Failure Points</CardTitle>
            <CardDescription>Questions and rubric items with high failure rates</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={failurePointsChartData}
                layout="vertical"
                margin={{ left: 150, right: 30 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis type="category" dataKey="name" width={140} />
                <Tooltip />
                <Bar dataKey="Failure Rate %" fill="#ef4444" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Learner Progress Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg">Learner Progress</CardTitle>
            <CardDescription>Current status per competency</CardDescription>
          </div>
          <Button onClick={handleExportCSV} variant="outline" size="sm" className="gap-2">
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-32">Learner</TableHead>
                  {filteredCompetencies.map((c) => (
                    <TableHead key={c.id} className="text-center text-xs">
                      {c.title.substring(0, 15)}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLearnerProgress.map((learner) => (
                  <TableRow key={learner.learnerId}>
                    <TableCell className="font-medium">{learner.learnerName}</TableCell>
                    {filteredCompetencies.map((c) => {
                      const status = learner.competencyStatuses[c.id] || 'not_started';
                      return (
                        <TableCell key={`${learner.learnerId}-${c.id}`} className="text-center">
                          <Badge
                            variant="secondary"
                            className={`text-xs ${STATUS_COLORS[status]}`}
                          >
                            {STATUS_LABELS[status].split(' ')[0]}
                          </Badge>
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Average Attempts to Mastery</p>
                <p className="text-2xl font-bold mt-1">
                  {(
                    filteredCompetencies.reduce((sum, c) => sum + c.averageAttemptsToMastery, 0) /
                    filteredCompetencies.length
                  ).toFixed(1)}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div>
              <p className="text-sm text-gray-600">Total Learners</p>
              <p className="text-2xl font-bold mt-1">
                {filteredLearnerProgress.length}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div>
              <p className="text-sm text-gray-600">Badges Earned (Total)</p>
              <p className="text-2xl font-bold mt-1">
                {filteredCompetencies.reduce((sum, c) => sum + c.learnersEarnedBadge, 0)}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
