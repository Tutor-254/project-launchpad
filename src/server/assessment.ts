import { createServerFn } from '@tanstack/start';
import { z } from 'zod';
import {
  submitAssessmentAttempt as submitAssessmentAttemptLib,
  canRetryAssessment as canRetryAssessmentLib,
} from '~/lib/assessment.server';

/**
 * Server function wrapper for assessment submission
 * Task 29.1-29.4: Assessment submission API
 * 
 * Workflow:
 * 1. Validate assessment exists
 * 2. Check max attempts
 * 3. Check retry cooldown
 * 4. Score the attempt
 * 5. Check if competency attained (assessment + project both passed)
 * 6. Return results
 */
export const submitAssessmentAttempt = createServerFn({
  method: 'POST',
})
  .validator(
    z.object({
      assessmentId: z.string().uuid('Invalid assessment ID'),
      userAnswers: z.record(z.string().uuid(), z.string()),
    })
  )
  .handler(async ({ data }) => {
    const { assessmentId, userAnswers } = data;

    try {
      // Call the actual implementation from lib
      const userId = 'current-user-id'; // In real implementation, get from auth context

      const result = await submitAssessmentAttemptLib(
        userId,
        assessmentId,
        userAnswers
      );

      return {
        success: true,
        ...result,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to submit assessment',
      };
    }
  });

/**
 * Server function to check if user can retry assessment
 */
export const canRetryAssessment = createServerFn({
  method: 'POST',
})
  .validator(
    z.object({
      assessmentId: z.string().uuid('Invalid assessment ID'),
    })
  )
  .handler(async ({ data }) => {
    const { assessmentId } = data;

    try {
      const userId = 'current-user-id'; // In real implementation, get from auth context

      const result = await canRetryAssessmentLib(userId, assessmentId);

      return {
        success: true,
        ...result,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to check retry eligibility',
      };
    }
  });
