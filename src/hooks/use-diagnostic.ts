import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { canUserRetakeDiagnostic, submitDiagnosticAttempt } from '~/server/diagnostic';

/**
 * Task 34.1a: Hook to fetch diagnostic attempts for a user
 * Returns: { attempts, loading, error, refetch }
 */
export function useDiagnosticAttempts(diagnosticId: string) {
  const {
    data: attempts = [],
    isLoading: loading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['diagnostic-attempts', diagnosticId],
    queryFn: async () => {
      // TODO: Implement with actual API call to fetch diagnostic_attempts
      // from Supabase for this diagnostic_id
      
      // Mock implementation
      return [
        {
          id: '1',
          diagnosticId,
          score: 65,
          passed: false,
          attemptNumber: 1,
          createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        },
      ];
    },
  });

  return { attempts, loading, error, refetch };
}

/**
 * Task 34.1b: Hook to check if user can retake diagnostic
 * Returns: boolean
 */
export function useCanRetakeDiagnostic(diagnosticId: string) {
  const queryClient = useQueryClient();

  const {
    data: canRetake = false,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['can-retake-diagnostic', diagnosticId],
    queryFn: async () => {
      // Call the server function
      const result = await canUserRetakeDiagnostic({
        userId: 'current-user-id', // Get from auth context in real implementation
        diagnosticId,
      });

      return result.success && result.canRetake;
    },
  });

  return { canRetake, isLoading, error };
}

/**
 * Hook to submit diagnostic attempt
 */
export function useSubmitDiagnosticAttempt() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (payload: {
      diagnosticId: string;
      userAnswers: Record<string, string>;
    }) => {
      const result = await submitDiagnosticAttempt(payload);
      if (!result.success) {
        throw new Error(result.error || 'Failed to submit diagnostic');
      }
      return result;
    },
    onSuccess: (data) => {
      // Invalidate attempts query to refetch
      queryClient.invalidateQueries({
        queryKey: ['diagnostic-attempts', data.pathwayId],
      });
    },
  });

  return mutation;
}

/**
 * Hook to get diagnostic details with user's attempts
 */
export function useDiagnosticDetails(diagnosticId: string) {
  const {
    data: attempts = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ['diagnostic-details', diagnosticId],
    queryFn: async () => {
      // TODO: Implement with API call to fetch diagnostic details
      // including questions and user's attempt history
      
      // Mock implementation
      return {
        id: diagnosticId,
        name: 'Node.js Basics Diagnostic',
        description: 'Test your knowledge of Node.js fundamentals',
        questions: [
          {
            id: 'q1',
            text: 'What is the primary use of Node.js?',
            type: 'multiple_choice',
            options: ['Server-side JS', 'Client-side JS', 'Mobile dev', 'Game dev'],
          },
        ],
        userAttempts: attempts,
        passThreshold: 50,
      };
    },
  });

  return { diagnostic: data, isLoading, error };
}

/**
 * Hook to track diagnostic scoring progress
 */
export function useDiagnosticProgress(diagnosticId: string) {
  const { attempts } = useDiagnosticAttempts(diagnosticId);
  const { canRetake } = useCanRetakeDiagnostic(diagnosticId);

  // Calculate progress metrics
  const totalAttempts = attempts.length;
  const passedAttempts = attempts.filter(a => a.passed).length;
  const latestAttempt = attempts[attempts.length - 1];
  const latestScore = latestAttempt?.score || 0;

  return {
    totalAttempts,
    passedAttempts,
    latestScore,
    lastAttemptPassed: latestAttempt?.passed || false,
    canRetake,
  };
}
