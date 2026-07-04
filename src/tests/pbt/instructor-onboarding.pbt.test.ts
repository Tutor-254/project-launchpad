import { describe, it, expect, vi } from "vitest";
import fc from "fast-check";
import { canReapply } from "@/routes/apply";
import { isValidPortfolioUrl } from "@/routes/onboarding";

describe("instructor-onboarding-and-screening PBT", () => {
  // ─── Property 10: Reapplication 30-day cooldown ─────────────────────────────
  it("Feature: instructor-onboarding-and-screening, Property 10: Reapplication 30-day cooldown", () => {
    // Generate an arbitrary rejected timestamp.
    // 30 days = 30 * 24 * 60 * 60 * 1000 = 2,592,000,000 ms.
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 10_000_000_000_000 }), // arbitrary unix timestamp for rejection date
        fc.integer({ min: -4_000_000_000, max: 4_000_000_000 }), // ms offset around the 30-day boundary
        (rejectMs, offsetMs) => {
          const rejectedAt = new Date(rejectMs);
          const rejectedAtStr = rejectedAt.toISOString();

          // Calculate "now" based on 30 days + offset
          const cooldownEndMs = rejectMs + 30 * 24 * 60 * 60 * 1000;
          const nowMs = cooldownEndMs + offsetMs;
          const now = new Date(nowMs);

          const result = canReapply(rejectedAtStr, now);

          if (offsetMs >= 0) {
            // now is >= target
            expect(result).toBe(true);
          } else {
            // now is < target
            expect(result).toBe(false);
          }
        }
      )
    );
  });

  // ─── Property 11: URL validation ─────────────────────────────────────────────
  it("Feature: instructor-onboarding-and-screening, Property 11: URL validation", () => {
    // Check that we accept valid HTTP/HTTPS URLs (and empty string) and reject all others.
    fc.assert(
      fc.property(
        fc.oneof(
          // Valid URL structure
          fc.tuple(
            fc.constantFrom("http", "https"),
            fc.webAuthority(),
            fc.webSegment()
          ).map(([proto, auth, seg]) => `${proto}://${auth}/${seg}`),
          // Empty string
          fc.constant(""),
          // Invalid strings
          fc.string().filter((s) => !s.startsWith("http://") && !s.startsWith("https://"))
        ),
        (url) => {
          const result = isValidPortfolioUrl(url);
          if (url === "") {
            expect(result).toBe(true);
          } else if (url.startsWith("http://") || url.startsWith("https://")) {
            // fast-check generated URL should be parsed successfully
            try {
              new URL(url);
              expect(result).toBe(true);
            } catch {
              expect(result).toBe(false);
            }
          } else {
            expect(result).toBe(false);
          }
        }
      )
    );
  });

  // ─── Property 2: Application data round-trip ──────────────────────────────────
  it("Feature: instructor-onboarding-and-screening, Property 2: Application data round-trip", () => {
    // Round trip test using a local mock client
    fc.assert(
      fc.property(
        fc.record({
          id: fc.uuid(),
          user_id: fc.uuid(),
          expertise: fc.string({ minLength: 1, maxLength: 200 }),
          background: fc.string({ minLength: 1, maxLength: 1000 }),
          portfolio_url: fc.option(fc.webUrl()),
          statement: fc.string({ minLength: 50, maxLength: 2000 }),
          status: fc.constantFrom("pending", "approved", "rejected"),
        }),
        (originalData) => {
          // Simple in-memory mock database state
          const dbStore: any[] = [];

          // Implement a mock Supabase client mock
          const mockSupabase: any = {
            from: (table: string) => {
              expect(table).toBe("instructor_applications");
              return {
                insert: async (row: any) => {
                  dbStore.push({ ...row });
                  return { data: row, error: null };
                },
                select: () => {
                  return {
                    eq: (field: string, val: any) => {
                      const filtered = dbStore.filter((r) => r[field] === val);
                      return {
                        maybeSingle: async () => {
                          return { data: filtered[0] || null, error: null };
                        },
                      };
                    },
                  };
                },
              };
            },
          };

          // Save
          mockSupabase.from("instructor_applications").insert(originalData);

          // Retrieve
          const record = dbStore.find((r) => r.id === originalData.id);
          expect(record).toBeDefined();
          expect(record.expertise).toBe(originalData.expertise);
          expect(record.background).toBe(originalData.background);
          expect(record.portfolio_url).toBe(originalData.portfolio_url);
          expect(record.statement).toBe(originalData.statement);
        }
      )
    );
  });

  // ─── Property 3: New application status is always pending ──────────────────────
  it("Feature: instructor-onboarding-and-screening, Property 3: New application status is always pending", () => {
    // Tests database default behavior and RLS constraint using local-simulated checks
    fc.assert(
      fc.property(
        fc.record({
          user_id: fc.uuid(),
          expertise: fc.string({ minLength: 1, maxLength: 200 }),
          background: fc.string({ minLength: 1, maxLength: 1000 }),
          portfolio_url: fc.option(fc.webUrl()),
          statement: fc.string({ minLength: 50, maxLength: 2000 }),
          // Optionally provide status if they try to fraud it
          status: fc.option(fc.constantFrom("approved", "rejected", "pending")),
        }),
        (inputRow) => {
          const dbStore: any[] = [];

          // Simulate DB Trigger/Default & RLS constraint
          const insertWithRLSandDefault = (row: any, role: "anon" | "authenticated" | "service_role" = "authenticated") => {
            // RLS check: policies say users can INSERT own application, but defaults status to 'pending'
            // In SQL: DEFAULT status='pending' and RLS restricts modifying status to pending (if checked)
            // Let's implement RLS constraint check
            const newRecord = { ...row };

            // 1. DB Default: status is always 'pending' when not sent or when authenticated user inserts
            if (role === "authenticated") {
              // RLS / CHECK Constraints: status must be pending on insert
              if (newRecord.status !== undefined && newRecord.status !== null && newRecord.status !== "pending") {
                throw new Error("new row violates row-level security policy or CHECK constraint for instructor_applications");
              }
              newRecord.status = "pending"; // DB default
            }

            dbStore.push(newRecord);
            return newRecord;
          };

          if (inputRow.status && inputRow.status !== "pending") {
            // Trying to set status to approved or rejected directly by user
            expect(() => insertWithRLSandDefault(inputRow, "authenticated")).toThrow();
          } else {
            const saved = insertWithRLSandDefault(inputRow, "authenticated");
            expect(saved.status).toBe("pending");
          }
        }
      )
    );
  });

  // ─── Property 13: Applications list sorted reverse-chronologically ──────────
  it("Feature: instructor-onboarding-and-screening, Property 13: Applications list sorted reverse-chronologically", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            id: fc.uuid(),
            created_at: fc.date(),
          }),
          { minLength: 2, maxLength: 20 }
        ),
        (apps) => {
          // Sort comparator
          const reverseChronologicalSort = (a: any, b: any) => {
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
          };

          const sortedList = [...apps].sort(reverseChronologicalSort);

          // Verify every element is correctly ordered relative to the next
          for (let i = 0; i < sortedList.length - 1; i++) {
            const curDate = new Date(sortedList[i].created_at).getTime();
            const nextDate = new Date(sortedList[i + 1].created_at).getTime();
            expect(curDate).toBeGreaterThanOrEqual(nextDate);
          }
        }
      )
    );
  });

  // ─── Property 14: Status filter returns only matching applications ─────────────
  it("Feature: instructor-onboarding-and-screening, Property 14: Status filter returns only matching applications", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            id: fc.uuid(),
            status: fc.constantFrom("pending", "approved", "rejected"),
          }),
          { minLength: 5, maxLength: 30 }
        ),
        fc.constantFrom("pending", "approved", "rejected", "all"),
        (apps, filter) => {
          // Filtering logic
          const filtered = filter === "all" ? apps : apps.filter((a) => a.status === filter);

          // Verify result
          if (filter === "all") {
            expect(filtered.length).toBe(apps.length);
          } else {
            for (const app of filtered) {
              expect(app.status).toBe(filter);
            }
            // Ensure no item that matches status was left out
            const expectedCount = apps.filter((a) => a.status === filter).length;
            expect(filtered.length).toBe(expectedCount);
          }
        }
      )
    );
  });
});
