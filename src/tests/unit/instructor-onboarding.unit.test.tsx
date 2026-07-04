import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen, act } from "@testing-library/react";
import { canReapply } from "@/routes/apply";
import { isValidPortfolioUrl, validateApplicationForm } from "@/routes/onboarding";
import { PendingState, RejectedState, ApprovedState, ApplyPage } from "@/routes/apply";

// Mock SiteHeader and SiteFooter to avoid rendering complex layout stuff
vi.mock("@/components/site-chrome", () => ({
  SiteHeader: () => <header data-testid="mock-header">Header</header>,
  SiteFooter: () => <footer data-testid="mock-footer">Footer</footer>,
}));

// Mock @tanstack/react-router
const mockNavigate = vi.fn();
vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, to }: any) => <a href={to}>{children}</a>,
  useNavigate: () => mockNavigate,
  createFileRoute: () => () => ({}),
}));

// Mock hooks
const mockUseAuth = vi.fn();
const mockUseRoles = vi.fn();
const mockUseApplicationStatus = vi.fn();

vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => mockUseAuth(),
  useRoles: () => mockUseRoles(),
  useApplicationStatus: () => mockUseApplicationStatus(),
}));

describe("instructor-onboarding-and-screening unit tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  // ─── 11.1 unit tests for `canReapply` ──────────────────────────────────────
  describe("canReapply logic", () => {
    const rejectionDateStr = "2026-07-01T12:00:00.000Z"; // Base rejection date
    const rejectionMs = new Date(rejectionDateStr).getTime();

    it("should return false on the same instant as rejection", () => {
      // 0 ms after rejection
      const now = new Date(rejectionMs);
      expect(canReapply(rejectionDateStr, now)).toBe(false);
    });

    it("should return false at exactly 29d 23h 59m 59s after rejection", () => {
      const ms29d = 29 * 24 * 60 * 60 * 1000;
      const ms23h = 23 * 60 * 60 * 1000;
      const ms59m = 59 * 60 * 1000;
      const ms59s = 59 * 1000;
      const now = new Date(rejectionMs + ms29d + ms23h + ms59m + ms59s);
      expect(canReapply(rejectionDateStr, now)).toBe(false);
    });

    it("should return true at exactly 30 days after rejection", () => {
      const ms30d = 30 * 24 * 60 * 60 * 1000;
      const now = new Date(rejectionMs + ms30d);
      expect(canReapply(rejectionDateStr, now)).toBe(true);
    });

    it("should return true at exactly 30 days + 1 second after rejection", () => {
      const ms30d1s = 30 * 24 * 60 * 60 * 1000 + 1000;
      const now = new Date(rejectionMs + ms30d1s);
      expect(canReapply(rejectionDateStr, now)).toBe(true);
    });
  });

  // ─── 11.2 unit tests for `isValidPortfolioUrl` ──────────────────────────────
  describe("isValidPortfolioUrl", () => {
    it("should return true for an empty string", () => {
      expect(isValidPortfolioUrl("")).toBe(true);
    });

    it("should return true for valid HTTPS URL", () => {
      expect(isValidPortfolioUrl("https://linkedin.com/in/john-doe")).toBe(true);
    });

    it("should return false for URL without protocol", () => {
      expect(isValidPortfolioUrl("linkedin.com/in/john-doe")).toBe(false);
    });

    it("should return false for ftp:// URL", () => {
      expect(isValidPortfolioUrl("ftp://linkedin.com")).toBe(false);
    });

    it("should return false for localhost URL without protocol", () => {
      expect(isValidPortfolioUrl("localhost:3000")).toBe(false);
    });

    it("should return false for random alphanumeric string", () => {
      expect(isValidPortfolioUrl("randomAlphanumeric123")).toBe(false);
    });
  });

  // ─── 11.3 unit tests for application form validation logic ──────────────────
  describe("validateApplicationForm", () => {
    const validForm = {
      expertise: "Fullstack Web Development",
      background: "10 years of software engineering at Google.",
      portfolioUrl: "https://github.com/johndoe",
      statement: "I want to share my knowledge. Programming is a superpower and anyone can learn it if guided properly. Teaching statement should be long enough.",
    };

    it("should return errors when all fields are empty", () => {
      const errors = validateApplicationForm({
        expertise: "",
        background: "",
        portfolioUrl: "",
        statement: "",
      });
      expect(errors.expertise).toBeDefined();
      expect(errors.background).toBeDefined();
      expect(errors.statement).toBeDefined();
      expect(errors.portfolioUrl).toBeUndefined(); // optional
    });

    it("should return error when one required field is empty", () => {
      const errors = validateApplicationForm({
        ...validForm,
        expertise: "",
      });
      expect(errors.expertise).toBeDefined();
      expect(errors.background).toBeUndefined();
      expect(errors.statement).toBeUndefined();
    });

    it("should return error when teaching statement is under 50 characters", () => {
      const errors = validateApplicationForm({
        ...validForm,
        statement: "Too short",
      });
      expect(errors.statement).toContain("at least 50 characters");
    });

    it("should return error when teaching statement is over 2000 characters", () => {
      const longStatement = "a".repeat(2001);
      const errors = validateApplicationForm({
        ...validForm,
        statement: longStatement,
      });
      expect(errors.statement).toContain("2000 characters or fewer");
    });

    it("should return error for invalid portfolio URL during form validation", () => {
      const errors = validateApplicationForm({
        ...validForm,
        portfolioUrl: "ftp://invalid-url",
      });
      expect(errors.portfolioUrl).toBeDefined();
    });

    it("should pass when form is completely valid", () => {
      const errors = validateApplicationForm(validForm);
      expect(Object.keys(errors).length).toBe(0);
    });
  });

  // ─── 11.4 unit tests for the `/apply` route component ──────────────────────
  describe("/apply route component and page states", () => {
    it("pending state renders submission date and review-timeline messages", () => {
      const dateStr = "2026-07-02T10:00:00.000Z";
      render(<PendingState createdAt={dateStr} />);

      expect(screen.getByText(/Application under review/i)).toBeDefined();
      // Formatted date should be in the page
      const formattedDate = new Date(dateStr).toLocaleDateString(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
      expect(screen.getAllByText(new RegExp(formattedDate, "i")).length).toBeGreaterThan(0);
      expect(screen.getByText(/Our team reviews applications within 3–5 business days/i)).toBeDefined();
    });

    it("rejected state renders reason, early reapply date, and countdown", () => {
      // Setup mock timers
      vi.useFakeTimers();
      const mockRejectionTime = new Date("2026-07-01T12:00:00.000Z");
      vi.setSystemTime(mockRejectionTime);

      const rejectionReason = "Please provide a more detailed professional background.";
      render(
        <RejectedState
          rejectedAt={mockRejectionTime.toISOString()}
          reason={rejectionReason}
        />
      );

      expect(screen.getByText(/Application not approved/i)).toBeDefined();
      expect(screen.getByText(rejectionReason)).toBeDefined();

      // Earliest reapplication is +30 days, which is July 31 2026
      const expectedReapplyDate = new Date(mockRejectionTime);
      expectedReapplyDate.setDate(expectedReapplyDate.getDate() + 30);
      const expectedStr = expectedReapplyDate.toLocaleDateString(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
      expect(screen.getAllByText(new RegExp(expectedStr, "i")).length).toBeGreaterThan(0);
      expect(screen.getByText(/in 30d 0h/i)).toBeDefined();
    });

    it("approved state renders success messages", () => {
      render(<ApprovedState />);
      expect(screen.getByText(/You're approved!/i)).toBeDefined();
      expect(screen.getByText(/Redirecting you to your Studio/i)).toBeDefined();
    });

    it("approved state triggers redirect after 2 seconds inside ApplyPage", () => {
      vi.useFakeTimers();
      mockUseAuth.mockReturnValue({ user: { id: "test-user-id" }, loading: false });
      mockUseRoles.mockReturnValue({ roles: [], loading: false, isInstructor: false });
      mockUseApplicationStatus.mockReturnValue({
        applicationStatus: {
          id: "app-id",
          status: "approved",
          created_at: new Date().toISOString(),
          reviewed_at: new Date().toISOString(),
          rejection_reason: null,
        },
        loading: false,
      });

      render(<ApplyPage />);

      expect(mockNavigate).not.toHaveBeenCalled();

      // Fast-forward time by 2 seconds
      act(() => {
        vi.advanceTimersByTime(2000);
      });

      expect(mockNavigate).toHaveBeenCalledWith({ to: "/instructor" });
    });
  });
});

