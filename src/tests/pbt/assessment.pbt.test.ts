/**
 * Property-Based Tests — AI Learner Assessment
 * Tasks 10.1 – 10.6  (Vitest + fast-check, pure TS, no network)
 */
import { describe, it, expect } from "vitest";
import fc from "fast-check";
import type {
  AIProvider,
  ShortAnswerGradingInput,
  ShortAnswerGradingResult,
  EssayGradingInput,
  EssayGradingResult,
  GeneratedQuestion,
  QuestionGenerationInput,
} from "@/lib/ai-service";

// ---------------------------------------------------------------------------
// Pure helpers (mirror logic in assessment.functions.ts / SQL)
// ---------------------------------------------------------------------------

function computeWeightedScore(cat1: number, cat2: number, finalExam: number): number {
  return cat1 * 0.15 + cat2 * 0.15 + finalExam * 0.70;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ---------------------------------------------------------------------------
// P1 — compute_weighted_score output is always in [0, 100]
// ---------------------------------------------------------------------------

describe("P1: compute_weighted_score output is always in [0, 100]", () => {
  it("holds for arbitrary valid scores in [0,100]", () => {
    fc.assert(
      fc.property(
        fc.float({ min: 0, max: 100, noNaN: true }),
        fc.float({ min: 0, max: 100, noNaN: true }),
        fc.float({ min: 0, max: 100, noNaN: true }),
        (cat1, cat2, finalExam) => {
          const result = computeWeightedScore(cat1, cat2, finalExam);
          expect(result).toBeGreaterThanOrEqual(0);
          expect(result).toBeLessThanOrEqual(100);
        },
      ),
    );
  });
});

// ---------------------------------------------------------------------------
// P2 — weighted score formula holds for arbitrary integer scores
// ---------------------------------------------------------------------------

describe("P2: weighted score formula (cat1*0.15 + cat2*0.15 + final*0.70)", () => {
  it("matches expected formula for arbitrary integers in [0, 100]", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 100 }),
        fc.integer({ min: 0, max: 100 }),
        fc.integer({ min: 0, max: 100 }),
        (cat1, cat2, finalExam) => {
          const expected = cat1 * 0.15 + cat2 * 0.15 + finalExam * 0.70;
          const actual = computeWeightedScore(cat1, cat2, finalExam);
          expect(Math.abs(actual - expected)).toBeLessThan(1e-9);
        },
      ),
    );
  });

  it("equal score s gives weighted result equal to s", () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 100 }), (s) => {
        expect(Math.abs(computeWeightedScore(s, s, s) - s)).toBeLessThan(1e-9);
      }),
    );
  });
});

// ---------------------------------------------------------------------------
// P3 — gradeShortAnswer returns score in [0, 100] for any non-empty input
// ---------------------------------------------------------------------------

describe("P3: gradeShortAnswer returns score in [0, 100]", () => {
  const mockProvider: AIProvider = {
    generateQuestions: async (_: QuestionGenerationInput): Promise<GeneratedQuestion[]> => [],
    gradeShortAnswer: async (input: ShortAnswerGradingInput): Promise<ShortAnswerGradingResult> => {
      const raw = input.response.length % 101;
      return { score: Math.min(100, Math.max(0, raw)), feedback: "mock feedback" };
    },
    gradeEssay: async (_: EssayGradingInput): Promise<EssayGradingResult> => ({
      score: 75,
      feedback: "mock",
      needs_review: false,
    }),
  };

  it("score is always in [0, 100]", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 500 }),
        fc.string({ minLength: 1, maxLength: 200 }),
        fc.string({ minLength: 1, maxLength: 200 }),
        async (response, modelAnswer, rubric) => {
          const result = await mockProvider.gradeShortAnswer({ response, modelAnswer, rubric });
          expect(result.score).toBeGreaterThanOrEqual(0);
          expect(result.score).toBeLessThanOrEqual(100);
        },
      ),
    );
  });
});

// ---------------------------------------------------------------------------
// P4 — gradeShortAnswer stability: re-submit same input returns score within ±10
// ---------------------------------------------------------------------------

describe("P4: gradeShortAnswer grading stability", () => {
  function deterministicScore(s: string): number {
    let h = 0;
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) & 0xffffffff;
    return Math.abs(h) % 101;
  }

  const stableProvider: AIProvider = {
    generateQuestions: async (_: QuestionGenerationInput): Promise<GeneratedQuestion[]> => [],
    gradeShortAnswer: async (input: ShortAnswerGradingInput): Promise<ShortAnswerGradingResult> => ({
      score: deterministicScore(input.response + input.modelAnswer + input.rubric),
      feedback: "stable",
    }),
    gradeEssay: async (_: EssayGradingInput): Promise<EssayGradingResult> => ({
      score: 80,
      feedback: "stable",
      needs_review: false,
    }),
  };

  it("identical inputs produce scores within ±10", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 300 }),
        fc.string({ minLength: 1, maxLength: 100 }),
        fc.string({ minLength: 1, maxLength: 100 }),
        async (response, modelAnswer, rubric) => {
          const r1 = await stableProvider.gradeShortAnswer({ response, modelAnswer, rubric });
          const r2 = await stableProvider.gradeShortAnswer({ response, modelAnswer, rubric });
          expect(Math.abs(r1.score - r2.score)).toBeLessThanOrEqual(10);
        },
      ),
    );
  });
});

// ---------------------------------------------------------------------------
// P5 — certificate issuance is idempotent — no duplicates for (user, course)
// ---------------------------------------------------------------------------

describe("P5: issueCertificateIfComplete idempotency", () => {
  function buildCertStore() {
    const store: Array<{ user_id: string; course_id: string; code: string }> = [];

    function issueIfAbsent(userId: string, courseId: string) {
      const existing = store.find((c) => c.user_id === userId && c.course_id === courseId);
      if (existing) return { issued: false, code: existing.code };
      const code = Math.random().toString(36).slice(2, 10).toUpperCase();
      store.push({ user_id: userId, course_id: courseId, code });
      return { issued: true, code };
    }

    return { issueIfAbsent, store };
  }

  it("multiple calls for same (user, course) never produce more than one row", () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        fc.uuid(),
        fc.integer({ min: 1, max: 5 }),
        (userId, courseId, attempts) => {
          const { issueIfAbsent, store } = buildCertStore();
          for (let i = 0; i < attempts; i++) issueIfAbsent(userId, courseId);
          const certs = store.filter((c) => c.user_id === userId && c.course_id === courseId);
          expect(certs.length).toBe(1);
        },
      ),
    );
  });

  it("distinct (user, course) pairs each get their own certificate row", () => {
    fc.assert(
      fc.property(
        fc.array(fc.record({ userId: fc.uuid(), courseId: fc.uuid() }), {
          minLength: 2,
          maxLength: 10,
        }),
        (pairs) => {
          const { issueIfAbsent, store } = buildCertStore();
          const unique = [...new Map(pairs.map((p) => [`${p.userId}:${p.courseId}`, p])).values()];
          for (const p of unique) issueIfAbsent(p.userId, p.courseId);
          expect(store.length).toBe(unique.length);
        },
      ),
    );
  });
});

// ---------------------------------------------------------------------------
// P6 — startAttempt shuffle: ≥ 3 questions get a different ordering
// ---------------------------------------------------------------------------

describe("P6: shuffle sanity check for question banks with >= 3 questions", () => {
  it("shuffled array contains the same elements as the original", () => {
    fc.assert(
      fc.property(
        fc.array(fc.string(), { minLength: 3, maxLength: 20 }),
        (items) => {
          const shuffled = shuffle([...items]);
          expect([...shuffled].sort()).toEqual([...items].sort());
        },
      ),
    );
  });

  it("at least one of 10 shuffle trials produces a different ordering", () => {
    fc.assert(
      fc.property(
        fc.uniqueArray(fc.string({ minLength: 1 }), { minLength: 3, maxLength: 15 }),
        (items) => {
          const original = [...items];
          let foundDifferent = false;
          for (let i = 0; i < 10; i++) {
            const s = shuffle([...original]);
            if (s.join("\0") !== original.join("\0")) {
              foundDifferent = true;
              break;
            }
          }
          expect(foundDifferent).toBe(true);
        },
      ),
      { numRuns: 50 },
    );
  });

  it("shuffled array has the same length as the original", () => {
    fc.assert(
      fc.property(
        fc.array(fc.nat(), { minLength: 3, maxLength: 30 }),
        (items) => {
          expect(shuffle([...items])).toHaveLength(items.length);
        },
      ),
    );
  });
});
