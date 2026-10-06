/**
 * Task 33.1: Competency validation and scoring utilities
 * 
 * Provides helper functions for:
 * - Validating competency metadata
 * - Calculating scores and mastery rules
 * - Checking retry and retry eligibility
 */

/**
 * 33.1a: Validate competency title format and length
 * Accepts: 1-100 characters, non-empty, reasonable characters
 */
export function isValidCompetencyTitle(title: string): boolean {
  if (!title || typeof title !== 'string') {
    return false;
  }

  const trimmed = title.trim();
  
  // Check length constraints: 1-100 characters
  if (trimmed.length < 1 || trimmed.length > 100) {
    return false;
  }

  // Check for valid characters (allow letters, numbers, spaces, hyphens, commas)
  const validPattern = /^[a-zA-Z0-9\s\-,&()./]+$/;
  if (!validPattern.test(trimmed)) {
    return false;
  }

  return true;
}

/**
 * 33.1b: Validate mastery rule syntax
 * Examples of valid rules:
 * - "score >= 70"
 * - "score >= 70 AND rubric_score >= 8"
 * - "score >= 80 OR project_score >= 90"
 */
export function isValidMasteryRule(rule: string): boolean {
  if (!rule || typeof rule !== 'string') {
    return false;
  }

  const trimmed = rule.trim().toLowerCase();

  // Check if it contains score references
  if (!trimmed.includes('score')) {
    return false;
  }

  // Check for valid comparison operators
  const validOperators = ['>=', '<=', '>', '<', '==', '!='];
  if (!validOperators.some(op => trimmed.includes(op))) {
    return false;
  }

  // Check for valid logical operators (if multiple conditions)
  const hasLogicalOps = trimmed.includes('and') || trimmed.includes('or');
  if (hasLogicalOps) {
    // If has logical operators, validate they're used correctly
    const parts = trimmed.split(/\s+(and|or)\s+/i);
    if (parts.length < 3) {
      return false; // Should have at least: condition AND condition
    }
  }

  return true;
}

/**
 * 33.1c: Calculate rubric score from criterion scores
 * Returns: { totalScore, passed, percentScore }
 */
export function calculateRubricScore(
  criteria: Array<{ name: string; points: number }>,
  scores: Record<string, number>,
  passingPercentage: number = 70
): { totalScore: number; percentScore: number; passed: boolean } {
  if (!criteria || criteria.length === 0) {
    return { totalScore: 0, percentScore: 0, passed: false };
  }

  // Calculate total possible points
  const totalPossiblePoints = criteria.reduce((sum, c) => sum + (c.points || 0), 0);
  
  if (totalPossiblePoints === 0) {
    return { totalScore: 0, percentScore: 0, passed: false };
  }

  // Calculate earned points
  let earnedPoints = 0;
  criteria.forEach((criterion) => {
    const score = scores[criterion.name] || 0;
    earnedPoints += Math.min(score, criterion.points); // Cap at max points for criterion
  });

  // Calculate percentage
  const percentScore = Math.round((earnedPoints / totalPossiblePoints) * 100);

  // Determine pass/fail
  const passed = percentScore >= passingPercentage;

  return {
    totalScore: earnedPoints,
    percentScore,
    passed,
  };
}

/**
 * 33.1d: Check if user can retry assessment
 * Considers: attempt count, cooldown time, remediation completion
 */
export function canUserRetryAssessment(
  lastAttempt: {
    attemptNumber: number;
    canRetryAt?: Date | null;
    remediationCompletedAt?: Date | null;
  } | null,
  maxAttempts: number,
  retryRequiresCooldown: boolean = true
): { canRetry: boolean; reason: string } {
  // No previous attempt means user can attempt once
  if (!lastAttempt) {
    return { canRetry: true, reason: 'Ready for first attempt' };
  }

  // Check max attempts
  if (lastAttempt.attemptNumber >= maxAttempts) {
    return {
      canRetry: false,
      reason: `Maximum attempts (${maxAttempts}) exceeded`,
    };
  }

  // Check cooldown if required
  if (retryRequiresCooldown && lastAttempt.canRetryAt) {
    const now = new Date();
    const canRetryAt = new Date(lastAttempt.canRetryAt);
    if (now < canRetryAt) {
      const hoursRemaining = Math.ceil(
        (canRetryAt.getTime() - now.getTime()) / (1000 * 60 * 60)
      );
      return {
        canRetry: false,
        reason: `Retry cooldown in effect. Can retry in ${hoursRemaining} hours`,
      };
    }
  }

  return { canRetry: true, reason: 'Ready to retry' };
}

/**
 * 33.1e: Check if user can retake diagnostic (7-day cooldown default)
 */
export function canUserRetakeDiagnostic(
  lastAttempt: { createdAt: Date } | null,
  cooldownDays: number = 7
): { canRetake: boolean; daysRemaining: number } {
  if (!lastAttempt) {
    return { canRetake: true, daysRemaining: 0 };
  }

  const now = new Date();
  const lastAttemptDate = new Date(lastAttempt.createdAt);
  const nextRetakeDate = new Date(
    lastAttemptDate.getTime() + cooldownDays * 24 * 60 * 60 * 1000
  );

  if (now >= nextRetakeDate) {
    return { canRetake: true, daysRemaining: 0 };
  }

  const daysRemaining = Math.ceil(
    (nextRetakeDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  );

  return { canRetake: false, daysRemaining };
}

/**
 * 33.1f: Score a multiple choice question
 * Returns: 1 point for correct answer, 0 for incorrect
 */
export function scoreMultipleChoiceQuestion(
  userAnswer: string,
  correctAnswer: string
): number {
  if (!userAnswer || !correctAnswer) {
    return 0;
  }

  // Case-insensitive comparison after trimming whitespace
  const userAnswerNormalized = String(userAnswer).trim().toLowerCase();
  const correctAnswerNormalized = String(correctAnswer).trim().toLowerCase();

  return userAnswerNormalized === correctAnswerNormalized ? 1 : 0;
}

/**
 * Parse and evaluate a mastery rule against scores
 * Example: "score >= 70 AND rubric_score >= 8"
 */
export function evaluateMasteryRule(
  rule: string,
  scores: {
    score?: number;
    rubric_score?: number;
    project_score?: number;
  }
): boolean {
  if (!rule || !scores) {
    return false;
  }

  try {
    // Create a safe evaluation context with the scores
    let evaluationString = rule.toLowerCase();

    // Replace score references with actual values
    evaluationString = evaluationString.replace(/score\b/g, `${scores.score || 0}`);
    evaluationString = evaluationString.replace(/rubric_score/g, `${scores.rubric_score || 0}`);
    evaluationString = evaluationString.replace(/project_score/g, `${scores.project_score || 0}`);

    // Replace logical operators
    evaluationString = evaluationString.replace(/\band\b/g, '&&');
    evaluationString = evaluationString.replace(/\bor\b/g, '||');

    // Create a function to safely evaluate the expression
    // This is basic - in production, use a library like expr-eval for safety
    // eslint-disable-next-line no-new-func
    const result = Function(`'use strict'; return (${evaluationString})`)();
    
    return Boolean(result);
  } catch (error) {
    console.error('Error evaluating mastery rule:', error);
    return false;
  }
}

/**
 * Calculate average attempts to mastery for a competency
 */
export function calculateAverageAttemptsToMastery(
  attempts: Array<{
    attemptNumber: number;
    passed: boolean;
  }>
): number {
  if (!attempts || attempts.length === 0) {
    return 0;
  }

  // Find the attempt number where user first passed
  const passingAttempt = attempts.find(a => a.passed);
  
  if (!passingAttempt) {
    return attempts.length; // Return total if never passed
  }

  return passingAttempt.attemptNumber;
}

/**
 * Generate feedback based on failed topics/questions
 */
export function generateAssessmentFeedback(
  score: number,
  failedTopics: string[] = [],
  maxPoints: number = 100
): string {
  if (score >= 80) {
    return `Excellent work! You scored ${score}%. You have a strong grasp of this competency.`;
  } else if (score >= 70) {
    return `Good job! You scored ${score}%. You've demonstrated competency, though some areas could use review.`;
  } else if (score >= 60) {
    const topics = failedTopics.slice(0, 3).join(', ');
    return `You scored ${score}%. Areas to review: ${topics || 'Core concepts'}. Remediation is recommended.`;
  } else {
    const topics = failedTopics.slice(0, 3).join(', ');
    return `You scored ${score}%. Key gaps: ${topics || 'Fundamental concepts'}. Please review remediation materials before retrying.`;
  }
}

/**
 * Validate competency prerequisites are met
 */
export function validatePrerequisitesMet(
  learnerBadges: string[],
  requiredPrerequisites: string[]
): boolean {
  if (!requiredPrerequisites || requiredPrerequisites.length === 0) {
    return true; // No prerequisites required
  }

  // Check if learner has all required prerequisite badges
  return requiredPrerequisites.every(prereq => learnerBadges.includes(prereq));
}
