import { describe, it, expect } from 'vitest';
import {
  isValidCompetencyTitle,
  isValidMasteryRule,
  calculateRubricScore,
  canUserRetryAssessment,
  canUserRetakeDiagnostic,
  scoreMultipleChoiceQuestion,
  evaluateMasteryRule,
} from '~/lib/competency-validators';

describe('Competency Validators Unit Tests', () => {
  // ────────────────────────────────────────────────────────────────────────────
  // Task 36.2: isValidCompetencyTitle
  // ────────────────────────────────────────────────────────────────────────────
  describe('isValidCompetencyTitle', () => {
    it('36.2a: accepts titles between 1-100 characters', () => {
      expect(isValidCompetencyTitle('D')).toBe(true); // 1 char
      expect(isValidCompetencyTitle('API Design')).toBe(true); // typical length
      expect(isValidCompetencyTitle('A'.repeat(100))).toBe(true); // 100 chars
    });

    it('36.2b: rejects empty or whitespace-only titles', () => {
      expect(isValidCompetencyTitle('')).toBe(false);
      expect(isValidCompetencyTitle('   ')).toBe(false);
      expect(isValidCompetencyTitle('\n')).toBe(false);
    });

    it('36.2c: rejects titles longer than 100 characters', () => {
      expect(isValidCompetencyTitle('A'.repeat(101))).toBe(false);
      expect(isValidCompetencyTitle('A'.repeat(200))).toBe(false);
    });

    it('36.2d: rejects titles with invalid characters', () => {
      expect(isValidCompetencyTitle('Title@123')).toBe(false);
      expect(isValidCompetencyTitle('Title#Tag')).toBe(false);
      expect(isValidCompetencyTitle('Title$Price')).toBe(false);
    });

    it('36.2e: accepts titles with letters, numbers, spaces, hyphens, commas', () => {
      expect(isValidCompetencyTitle('Deploy a Node.js API')).toBe(true);
      expect(isValidCompetencyTitle('React - Building Components')).toBe(true);
      expect(isValidCompetencyTitle('Python, Java, C++')).toBe(true);
      expect(isValidCompetencyTitle('Advanced (Expert) Level')).toBe(true);
      expect(isValidCompetencyTitle('API/REST Design')).toBe(true);
    });

    it('36.2f: trims whitespace before validation', () => {
      // Titles with leading/trailing spaces that become valid after trim
      expect(isValidCompetencyTitle('   Valid Title   ')).toBe(true);
    });
  });

  // ────────────────────────────────────────────────────────────────────────────
  // Task 36.3: isValidMasteryRule
  // ────────────────────────────────────────────────────────────────────────────
  describe('isValidMasteryRule', () => {
    it('36.3a: accepts simple comparison rules', () => {
      expect(isValidMasteryRule('score >= 70')).toBe(true);
      expect(isValidMasteryRule('score > 60')).toBe(true);
      expect(isValidMasteryRule('score <= 80')).toBe(true);
      expect(isValidMasteryRule('score < 90')).toBe(true);
      expect(isValidMasteryRule('score == 75')).toBe(true);
      expect(isValidMasteryRule('score != 0')).toBe(true);
    });

    it('36.3b: accepts combined rules with AND', () => {
      expect(isValidMasteryRule('score >= 70 AND rubric_score >= 8')).toBe(true);
      expect(isValidMasteryRule('score >= 70 and rubric_score >= 8')).toBe(true);
    });

    it('36.3c: accepts combined rules with OR', () => {
      expect(isValidMasteryRule('score >= 80 OR project_score >= 90')).toBe(true);
      expect(isValidMasteryRule('score >= 80 or project_score >= 90')).toBe(true);
    });

    it('36.3d: rejects rules without score reference', () => {
      expect(isValidMasteryRule('grade >= A')).toBe(false);
      expect(isValidMasteryRule('passed == true')).toBe(false);
    });

    it('36.3e: rejects rules without comparison operator', () => {
      expect(isValidMasteryRule('score 70')).toBe(false);
      expect(isValidMasteryRule('score')).toBe(false);
    });

    it('36.3f: rejects malformed combined rules', () => {
      expect(isValidMasteryRule('score >= 70 AND')).toBe(false);
      expect(isValidMasteryRule('AND score >= 70')).toBe(false);
    });

    it('36.3g: accepts various score variable names', () => {
      expect(isValidMasteryRule('score >= 70')).toBe(true);
      expect(isValidMasteryRule('rubric_score >= 8')).toBe(true);
      expect(isValidMasteryRule('project_score >= 50')).toBe(true);
    });
  });

  // ────────────────────────────────────────────────────────────────────────────
  // Task 36.4: calculateRubricScore
  // ────────────────────────────────────────────────────────────────────────────
  describe('calculateRubricScore', () => {
    it('36.4a: correctly sums criterion points', () => {
      const criteria = [
        { name: 'Code Quality', points: 5 },
        { name: 'Documentation', points: 3 },
        { name: 'Testing', points: 2 },
      ];
      const scores = {
        'Code Quality': 5,
        'Documentation': 3,
        'Testing': 2,
      };

      const result = calculateRubricScore(criteria, scores);
      expect(result.totalScore).toBe(10); // 5 + 3 + 2
      expect(result.percentScore).toBe(100);
      expect(result.passed).toBe(true);
    });

    it('36.4b: correctly determines pass/fail based on percentage', () => {
      const criteria = [
        { name: 'Criterion A', points: 10 },
      ];

      // Passing score (70%)
      let scores = { 'Criterion A': 7 };
      let result = calculateRubricScore(criteria, scores, 70);
      expect(result.percentScore).toBe(70);
      expect(result.passed).toBe(true);

      // Failing score (60%)
      scores = { 'Criterion A': 6 };
      result = calculateRubricScore(criteria, scores, 70);
      expect(result.percentScore).toBe(60);
      expect(result.passed).toBe(false);
    });

    it('36.4c: caps scores at max points per criterion', () => {
      const criteria = [
        { name: 'Criterion', points: 5 },
      ];
      const scores = {
        'Criterion': 10, // More than max
      };

      const result = calculateRubricScore(criteria, scores);
      expect(result.totalScore).toBe(5); // Capped at max points
    });

    it('36.4d: handles missing criteria gracefully', () => {
      const criteria: Array<{ name: string; points: number }> = [];
      const scores = {};

      const result = calculateRubricScore(criteria, scores);
      expect(result.totalScore).toBe(0);
      expect(result.percentScore).toBe(0);
      expect(result.passed).toBe(false);
    });

    it('36.4e: calculates percentage correctly for partial scores', () => {
      const criteria = [
        { name: 'Criterion A', points: 5 },
        { name: 'Criterion B', points: 5 },
      ];
      const scores = {
        'Criterion A': 3,
        'Criterion B': 2,
      };

      const result = calculateRubricScore(criteria, scores, 50);
      expect(result.totalScore).toBe(5); // 3 + 2
      expect(result.percentScore).toBe(50); // 5 / 10 * 100
      expect(result.passed).toBe(true); // 50% >= 50% threshold
    });
  });

  // ────────────────────────────────────────────────────────────────────────────
  // Task 36.5: canUserRetryAssessment
  // ────────────────────────────────────────────────────────────────────────────
  describe('canUserRetryAssessment', () => {
    it('36.5a: allows retry when under max attempts', () => {
      const lastAttempt = {
        attemptNumber: 1,
        canRetryAt: new Date(Date.now() - 1000), // Cooldown passed
      };

      const result = canUserRetryAssessment(lastAttempt, 3, true);
      expect(result.canRetry).toBe(true);
    });

    it('36.5b: blocks retry when max attempts reached', () => {
      const lastAttempt = {
        attemptNumber: 3,
      };

      const result = canUserRetryAssessment(lastAttempt, 3, false);
      expect(result.canRetry).toBe(false);
      expect(result.reason).toContain('Max attempts');
    });

    it('36.5c: blocks retry during cooldown', () => {
      const lastAttempt = {
        attemptNumber: 1,
        canRetryAt: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours from now
      };

      const result = canUserRetryAssessment(lastAttempt, 3, true);
      expect(result.canRetry).toBe(false);
      expect(result.reason).toContain('cooldown');
    });

    it('36.5d: allows retry after cooldown expires', () => {
      const lastAttempt = {
        attemptNumber: 1,
        canRetryAt: new Date(Date.now() - 1000), // Cooldown passed
      };

      const result = canUserRetryAssessment(lastAttempt, 3, true);
      expect(result.canRetry).toBe(true);
    });

    it('36.5e: allows first attempt when no previous attempt', () => {
      const result = canUserRetryAssessment(null, 3, true);
      expect(result.canRetry).toBe(true);
    });
  });

  // ────────────────────────────────────────────────────────────────────────────
  // Task 36.6: canUserRetakeDiagnostic
  // ────────────────────────────────────────────────────────────────────────────
  describe('canUserRetakeDiagnostic', () => {
    it('36.6a: checks 7-day cooldown (default)', () => {
      const lastAttempt = {
        createdAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000), // 8 days ago
      };

      const result = canUserRetakeDiagnostic(lastAttempt, 7);
      expect(result.canRetake).toBe(true);
      expect(result.daysRemaining).toBe(0);
    });

    it('36.6b: blocks retake within cooldown period', () => {
      const lastAttempt = {
        createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
      };

      const result = canUserRetakeDiagnostic(lastAttempt, 7);
      expect(result.canRetake).toBe(false);
      expect(result.daysRemaining).toBeGreaterThan(0);
    });

    it('36.6c: allows retake on exact cooldown boundary', () => {
      const lastAttempt = {
        createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Exactly 7 days ago
      };

      const result = canUserRetakeDiagnostic(lastAttempt, 7);
      expect(result.canRetake).toBe(true);
    });

    it('36.6d: allows first retake when no previous attempt', () => {
      const result = canUserRetakeDiagnostic(null, 7);
      expect(result.canRetake).toBe(true);
      expect(result.daysRemaining).toBe(0);
    });

    it('36.6e: supports custom cooldown periods', () => {
      const lastAttempt = {
        createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000), // 15 days ago
      };

      // 14-day cooldown
      const result = canUserRetakeDiagnostic(lastAttempt, 14);
      expect(result.canRetake).toBe(true);
    });
  });

  // ────────────────────────────────────────────────────────────────────────────
  // Task 36.7: scoreMultipleChoiceQuestion
  // ────────────────────────────────────────────────────────────────────────────
  describe('scoreMultipleChoiceQuestion', () => {
    it('36.7a: returns 1 for correct answer', () => {
      const score = scoreMultipleChoiceQuestion('B', 'B');
      expect(score).toBe(1);
    });

    it('36.7b: returns 0 for incorrect answer', () => {
      const score = scoreMultipleChoiceQuestion('A', 'B');
      expect(score).toBe(0);
    });

    it('36.7c: case-insensitive comparison', () => {
      expect(scoreMultipleChoiceQuestion('a', 'A')).toBe(1);
      expect(scoreMultipleChoiceQuestion('API', 'api')).toBe(1);
    });

    it('36.7d: ignores whitespace', () => {
      expect(scoreMultipleChoiceQuestion('  A  ', 'A')).toBe(1);
      expect(scoreMultipleChoiceQuestion(' Yes ', 'yes')).toBe(1);
    });

    it('36.7e: returns 0 for empty or null answers', () => {
      expect(scoreMultipleChoiceQuestion('', 'A')).toBe(0);
      expect(scoreMultipleChoiceQuestion('A', '')).toBe(0);
    });

    it('36.7f: handles numeric answers', () => {
      expect(scoreMultipleChoiceQuestion('42', '42')).toBe(1);
      expect(scoreMultipleChoiceQuestion('42', '43')).toBe(0);
    });
  });

  // ────────────────────────────────────────────────────────────────────────────
  // Additional validation tests
  // ────────────────────────────────────────────────────────────────────────────
  describe('evaluateMasteryRule', () => {
    it('evaluates simple >= rule correctly', () => {
      const rule = 'score >= 70';
      expect(evaluateMasteryRule(rule, { score: 75 })).toBe(true);
      expect(evaluateMasteryRule(rule, { score: 70 })).toBe(true);
      expect(evaluateMasteryRule(rule, { score: 65 })).toBe(false);
    });

    it('evaluates combined AND rules correctly', () => {
      const rule = 'score >= 70 AND rubric_score >= 8';
      expect(evaluateMasteryRule(rule, { score: 75, rubric_score: 8 })).toBe(true);
      expect(evaluateMasteryRule(rule, { score: 75, rubric_score: 7 })).toBe(false);
      expect(evaluateMasteryRule(rule, { score: 65, rubric_score: 8 })).toBe(false);
    });

    it('evaluates OR rules correctly', () => {
      const rule = 'score >= 80 OR project_score >= 90';
      expect(evaluateMasteryRule(rule, { score: 85, project_score: 0 })).toBe(true);
      expect(evaluateMasteryRule(rule, { score: 0, project_score: 95 })).toBe(true);
      expect(evaluateMasteryRule(rule, { score: 75, project_score: 80 })).toBe(false);
    });
  });
});
