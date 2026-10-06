import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import {
  submitAssessmentAttempt,
  getAssessmentAttempts,
  canRetryAssessment,
  markRemediationComplete,
} from '~/lib/assessment.server';

/**
 * Task 34.2a: Hook to fetch assessment attempts for a user
 * Returns: { attempts, loading, error, refetch }
 */
export function useAssessmentAttempts(assessmentId: string) {
  const {
    data: attempts = [],
    isLoading: loading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['assessment-attempts', assessmentId],
    queryFn: async () => {
      // TODO: Implement with actual API call
      // In real implementation, this would call a server function:
      // return await getAssessmentAttempts(userId, assessmentId);
      
      // Mock implementation
      return [
        {
          id: 'attempt-1',
          assessmentId,
          attemptNumber: 1,
          score: 62,
          passed: false,
          feedback: 'You scored 62%. Key gaps: Error handling',
          canRetryAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
          createdAt: new Date(),
        },
      ];
    },
  });

  return { attempts, loading, error, refetch };
}

/**
 * Task 34.2b: Hook to check if user can retry assessment
 * Returns: { canRetry, canRetryAt, reason }
 */
export function useCanRetryAssessment(assessmentId: string) {
  const {
    data: retryStatus = { canRetry: false, reason: '', canRetryAt: undefined },
    isLoading,
    error,
  } = useQuery({
    queryKey: ['can-retry-assessment', assessmentId],
    queryFn: async () => {
      // TODO: Implement with actual API call to server function
      // This would call: canRetryAssessment(userId, assessmentId)
      
      // Mock implementation
      return {
        canRetry: false,
        reason: 'Retry cooldown in effect. Can retry in 23 hours',
        canRetryAt: new Date(Date.now() + 23 * 60 * 60 * 1000),
      };
    },
  });

  return retryStatus;
}

/**
 * Hook to submit assessment attempt
 */
export function useSubmitAssessmentAttempt() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (payload: {
      assessmentId: string;
      userAnswers: Record<string, string>;
    }) => {
      // TODO: Implement with actual server function call
      // return await submitAssessmentAttempt(userId, payload.assessmentId, payload.userAnswers);
      
      // Mock implementation
      return {
        score: 75,
        passed: true,
        feedback: 'Excellent! You scored 75%',
        canRetryAt: null,
        competencyAttained: false,
      };
    },
    onSuccess: (data, variables) => {
      // Invalidate attempts query to refetch
      queryClient.invalidateQueries({
        queryKey: ['assessment-attempts', variables.assessmentId],
      });
      // Also invalidate retry status
      queryClient.invalidateQueries({
        queryKey: ['can-retry-assessment', variables.assessmentId],
      });
    },
  });

  return mutation;
}

/**
 * Hook to mark remediation as completed
 */
export function useMarkRemediationComplete() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (assessmentId: string) => {
      // TODO: Implement with actual server function call
      // return await markRemediationComplete(userId, assessmentId);
      
      // Mock implementation
      return { success: true };
    },
    onSuccess: (data, assessmentId) => {
      // Invalidate attempts and retry status
      queryClient.invalidateQueries({
        queryKey: ['assessment-attempts', assessmentId],
      });
      queryClient.invalidateQueries({
        queryKey: ['can-retry-assessment', assessmentId],
      });
    },
  });

  return mutation;
}

/**
 * Hook to get assessment details with user's attempt history
 */
export function useAssessmentDetails(assessmentId: string) {
  const { attempts, loading, error } = useAssessmentAttempts(assessmentId);
  const retryStatus = useCanRetryAssessment(assessmentId);

  return {
    assessmentId,
    attempts,
    retryStatus,
    loading,
    error,
  };
}

/**
 * Hook to calculate assessment progress and mastery status
 */
export function useAssessmentProgress(assessmentId: string, maxAttempts: number = 3) {
  const { attempts } = useAssessmentAttempts(assessmentId);

  // Calculate progress metrics
  const totalAttempts = attempts.length;
  const passedAttempts = attempts.filter((a: any) => a.passed).length;
  const latestAttempt = attempts[attempts.length - 1];
  const latestScore = latestAttempt?.score || 0;
  const latestPassed = latestAttempt?.passed || false;
  const attemptsRemaining = Math.max(0, maxAttempts - totalAttempts);
  const averageScore = attempts.length > 0
    ? Math.round(
        attempts.reduce((sum: number, a: any) => sum + (a.score || 0), 0) / attempts.length
      )
    : 0;

  return {
    totalAttempts,
    passedAttempts,
    attemptsRemaining,
    latestScore,
    latestPassed,
    averageScore,
    mastered: latestPassed,
    needsRemediation: !latestPassed && totalAttempts > 0,
  };
}

/**
 * Hook to get combined assessment and project mastery status
 */
export function useCompetencyMastery(assessmentId: string) {
  const assessmentProgress = useAssessmentProgress(assessmentId);

  // TODO: Fetch project submission status
  const projectSubmitted = false;
  const projectPassed = false;

  const fullyMastered = assessmentProgress.mastered && projectPassed;
  const readyForProject = assessmentProgress.mastered && !projectSubmitted;

  return {
    assessmentMastered: assessmentProgress.mastered,
    projectSubmitted,
    projectPassed,
    fullyMastered,
    readyForProject,
    nextStep: readyForProject ? 'Submit capstone project' : 'Retry assessment',
  };
}
