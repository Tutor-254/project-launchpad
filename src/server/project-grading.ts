import { createServerFn } from '@tanstack/start';
import { z } from 'zod';
import {
  gradeProjectSubmission as gradeProjectSubmissionLib,
  generateBadgeImage as generateBadgeImageLib,
  generateBadgeCode as generateBadgeCodeLib,
} from '~/lib/project-grading.server';

/**
 * Server function wrapper for project grading
 * Task 31.1-31.6: Project grading API
 * 
 * Workflow:
 * 1. Fetch submission and rubric
 * 2. Validate rubric scores
 * 3. Calculate total score
 * 4. Determine pass/fail
 * 5. Insert grade record
 * 6. If passed AND assessment passed: issue badge
 * 7. Return results with badge status
 */
export const gradeProjectSubmission = createServerFn({
  method: 'POST',
})
  .validator(
    z.object({
      submissionId: z.string().uuid('Invalid submission ID'),
      rubricScores: z.record(z.string(), z.number()),
      feedback: z.string().optional(),
    })
  )
  .handler(async ({ data }) => {
    const { submissionId, rubricScores, feedback } = data;

    try {
      const gradedByUserId = 'current-user-id'; // In real implementation, get from auth context

      const result = await gradeProjectSubmissionLib(
        submissionId,
        rubricScores,
        feedback || '',
        gradedByUserId
      );

      return {
        success: true,
        ...result,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to grade project',
      };
    }
  });

/**
 * Server function to generate badge image
 */
export const generateBadgeImage = createServerFn({
  method: 'POST',
})
  .validator(
    z.object({
      competencyTitle: z.string(),
      earnerName: z.string(),
      dateEarned: z.date(),
    })
  )
  .handler(async ({ data }) => {
    const { competencyTitle, earnerName, dateEarned } = data;

    try {
      const imageUrl = await generateBadgeImageLib(competencyTitle, earnerName, dateEarned);

      return {
        success: true,
        imageUrl,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate badge image',
      };
    }
  });

/**
 * Server function to generate unique badge code
 */
export const generateBadgeCode = createServerFn({
  method: 'POST',
})
  .handler(async () => {
    try {
      const badgeCode = generateBadgeCodeLib();

      return {
        success: true,
        badgeCode,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate badge code',
      };
    }
  });
