import { createServerFn } from '@tanstack/start';
import { z } from 'zod';
import {
  submitProjectSubmission as submitProjectSubmissionLib,
  validateFileSubmission,
  validateUrlSubmission,
} from '~/lib/project-submission.server';

/**
 * Server function wrapper for project submission
 * Task 30.1-30.4: Project submission API
 * 
 * Workflow:
 * 1. Validate project exists
 * 2. Validate submission data:
 *    - File type/size if file submission
 *    - URL format if URL submission
 * 3. Check version and increment if resubmission
 * 4. Insert into database
 * 5. Return submission ID and status
 */
export const submitProjectSubmission = createServerFn({
  method: 'POST',
})
  .validator(
    z.object({
      projectId: z.string().uuid('Invalid project ID'),
      submission: z.object({
        type: z.enum(['file', 'url', 'video']),
        fileUrl: z.string().optional(),
        externalUrl: z.string().optional(),
        videoUrl: z.string().optional(),
        submissionText: z.string().optional(),
      }),
    })
  )
  .handler(async ({ data }) => {
    const { projectId, submission } = data;

    try {
      const userId = 'current-user-id'; // In real implementation, get from auth context

      const result = await submitProjectSubmissionLib(userId, projectId, submission);

      return {
        success: true,
        ...result,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to submit project',
      };
    }
  });

/**
 * Server function to validate file submission before upload
 */
export const validateFileBeforeSubmit = createServerFn({
  method: 'POST',
})
  .validator(
    z.object({
      fileName: z.string(),
      fileSizeMb: z.number(),
      acceptedTypes: z.array(z.string()),
      maxSizeMb: z.number(),
    })
  )
  .handler(async ({ data }) => {
    const { fileName, fileSizeMb, acceptedTypes, maxSizeMb } = data;

    try {
      const result = validateFileSubmission(fileName, fileSizeMb, acceptedTypes, maxSizeMb);

      return {
        success: result.valid,
        error: result.error,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Validation failed',
      };
    }
  });

/**
 * Server function to validate URL submission
 */
export const validateUrlBeforeSubmit = createServerFn({
  method: 'POST',
})
  .validator(
    z.object({
      url: z.string().url('Invalid URL'),
    })
  )
  .handler(async ({ data }) => {
    const { url } = data;

    try {
      const result = validateUrlSubmission(url);

      return {
        success: result.valid,
        error: result.error,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'URL validation failed',
      };
    }
  });
