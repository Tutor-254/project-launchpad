import { useQuery } from '@tanstack/react-query';

/**
 * Task 34.3a: Hook to fetch comprehensive competency progress for a course
 * Returns: { competencies, progress, badges, loading, error }
 */
export function useCompetencyProgress(courseId: string) {
  const {
    data = {
      competencies: [],
      progress: [],
      badges: [],
    },
    isLoading: loading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['competency-progress', courseId],
    queryFn: async () => {
      // TODO: Implement with actual API call to fetch:
      // 1. All competencies for the course
      // 2. User's progress on each competency (assessment attempts, project submissions)
      // 3. User's earned badges
      
      // Mock implementation
      return {
        competencies: [
          {
            id: 'comp-1',
            title: 'API Design Fundamentals',
            description: 'Learn REST API design principles',
            status: 'in_progress', // not_started | in_progress | assessment_passed | project_passed | mastered
            assessmentAttempts: 1,
            assessmentScore: 65,
            projectSubmitted: false,
            badgeEarned: false,
          },
          {
            id: 'comp-2',
            title: 'Database Design',
            description: 'Design efficient database schemas',
            status: 'not_started',
            assessmentAttempts: 0,
            assessmentScore: null,
            projectSubmitted: false,
            badgeEarned: false,
          },
        ],
        progress: {
          totalCompetencies: 5,
          completedCompetencies: 0,
          badgesEarned: 0,
          percentComplete: 0,
        },
        badges: [],
      };
    },
  });

  return { competencies: data.competencies, progress: data.progress, badges: data.badges, loading, error, refetch };
}

/**
 * Hook to get detailed progress for a specific competency
 */
export function useCompetencyDetails(competencyId: string) {
  const {
    data = {
      competency: null,
      assessment: null,
      project: null,
      attempts: [],
      badge: null,
    },
    isLoading: loading,
    error,
  } = useQuery({
    queryKey: ['competency-details', competencyId],
    queryFn: async () => {
      // TODO: Implement with API call to fetch detailed info about:
      // 1. Competency metadata (title, description, observable behaviors, success criteria)
      // 2. Associated assessment
      // 3. Associated project
      // 4. User's attempt history
      // 5. Badge (if earned)
      
      // Mock implementation
      return {
        competency: {
          id: competencyId,
          title: 'API Design Fundamentals',
          description: 'Learn REST API design principles',
          observableBehaviors: [
            'Design RESTful endpoints',
            'Implement proper HTTP methods',
            'Handle errors gracefully',
          ],
          successCriteria: 'Pass assessment (70%+) and submit capstone project',
          jobTitles: ['Backend Developer', 'API Engineer', 'Full Stack Developer'],
        },
        assessment: {
          id: 'assess-1',
          title: 'API Design Knowledge Test',
          type: 'knowledge_test',
          maxAttempts: 3,
          retryCoolddownHours: 24,
          masteryRule: 'score >= 70',
        },
        project: {
          id: 'proj-1',
          title: 'Design Your First REST API',
          brief: 'Design and document a complete REST API for a todo app',
          submissionInstructions: 'Submit as Swagger/OpenAPI doc or GitHub README',
          acceptedFileTypes: ['pdf', 'md', 'yaml', 'json'],
        },
        attempts: [
          {
            type: 'assessment',
            attemptNumber: 1,
            score: 65,
            passed: false,
            createdAt: new Date(),
            feedback: 'You scored 65%. Key gap: HTTP method selection',
          },
        ],
        badge: null,
      };
    },
  });

  return { competency: data, loading, error };
}

/**
 * Hook to calculate overall course completion percentage
 */
export function useCourseCompletionProgress(courseId: string) {
  const { competencies, progress, loading } = useCompetencyProgress(courseId);

  const masteredCount = competencies.filter(
    (c: any) => c.status === 'mastered' || c.badgeEarned
  ).length;
  const completionPercentage =
    competencies.length > 0 ? Math.round((masteredCount / competencies.length) * 100) : 0;

  return {
    totalCompetencies: competencies.length,
    masteredCompetencies: masteredCount,
    completionPercentage,
    loading,
  };
}

/**
 * Hook to get recommended next competency to work on
 */
export function useNextRecommendedCompetency(courseId: string) {
  const { competencies, loading } = useCompetencyProgress(courseId);

  // Find next competency to work on (first not_started or in_progress)
  const nextCompetency = competencies.find(
    (c: any) => c.status === 'not_started' || c.status === 'in_progress'
  );

  return {
    nextCompetency,
    hasCompleted: competencies.length > 0 && !nextCompetency,
    loading,
  };
}

/**
 * Hook to get learner's badge portfolio
 */
export function useBadgePortfolio() {
  const {
    data = {
      badges: [],
      totalBadges: 0,
      competencies: [],
      jobTitles: [],
    },
    isLoading: loading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['badge-portfolio'],
    queryFn: async () => {
      // TODO: Implement with API call to fetch:
      // 1. All competency_badges for the user
      // 2. Associated competency info
      // 3. Aggregated job titles
      
      // Mock implementation
      return {
        badges: [
          {
            id: 'badge-1',
            competencyId: 'comp-1',
            competencyTitle: 'API Design Fundamentals',
            badgeCode: 'BADGE-abc12345-1672531200',
            earnedDate: new Date('2023-12-31'),
            verificationUrl: 'https://arcane.example.com/verify/badge/BADGE-abc12345-1672531200',
            imageUrl: 'https://storage.example.com/badges/badge-1.png',
          },
        ],
        totalBadges: 1,
        competencies: [
          {
            id: 'comp-1',
            title: 'API Design Fundamentals',
            jobTitles: ['Backend Developer', 'API Engineer'],
          },
        ],
        jobTitles: ['Backend Developer', 'API Engineer', 'Full Stack Developer'],
      };
    },
  });

  return { badges: data.badges, totalBadges: data.totalBadges, jobTitles: data.jobTitles, loading, error, refetch };
}

/**
 * Hook to track learning analytics and insights
 */
export function useLearnerAnalytics(courseId: string) {
  const { competencies } = useCompetencyProgress(courseId);

  // Calculate analytics
  const totalAssessmentAttempts = competencies.reduce(
    (sum: number, c: any) => sum + (c.assessmentAttempts || 0),
    0
  );
  const averageAssessmentScore =
    competencies.length > 0
      ? Math.round(
          competencies
            .filter((c: any) => c.assessmentScore)
            .reduce((sum: number, c: any) => sum + c.assessmentScore, 0) / competencies.length
        )
      : 0;

  const completedCompetencies = competencies.filter((c: any) => c.badgeEarned).length;
  const learningPace = totalAssessmentAttempts > competencies.length ? 'slower' : 'on-track';
  const strugglingAreas = competencies.filter(
    (c: any) => c.assessmentAttempts > 2 && !c.badgeEarned
  );

  return {
    totalAssessmentAttempts,
    averageAssessmentScore,
    completedCompetencies,
    learningPace,
    strugglingAreas,
    insights: {
      onTrack: learningPace === 'on-track',
      areasForImprovement: strugglingAreas.map((c: any) => c.title),
      nextMilestone: `${Math.min(completedCompetencies + 1, competencies.length)} of ${competencies.length} competencies`,
    },
  };
}

/**
 * Hook to check prerequisites for a competency
 */
export function useCompetencyPrerequisites(competencyId: string) {
  const {
    data = {
      prerequisites: [],
      prerequisitesMet: true,
      missingPrerequisites: [],
    },
    isLoading: loading,
    error,
  } = useQuery({
    queryKey: ['competency-prerequisites', competencyId],
    queryFn: async () => {
      // TODO: Implement with API call to fetch:
      // 1. Competency prerequisites
      // 2. Check if user has badges for all prerequisites
      
      // Mock implementation
      return {
        prerequisites: [
          {
            id: 'prereq-1',
            title: 'Fundamentals of Node.js',
            status: 'completed', // completed | not_completed | in_progress
          },
        ],
        prerequisitesMet: true,
        missingPrerequisites: [],
      };
    },
  });

  return { prerequisites: data.prerequisites, prerequisitesMet: data.prerequisitesMet, missingPrerequisites: data.missingPrerequisites, loading, error };
}
