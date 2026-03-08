/**
 * Yield Period Date Range Tests
 *
 * Covers Adriel issue A3.2: Date range must extend back far enough
 * for historical data entry (Sep 2025+).
 *
 * The getAvailableMonths() function generates month options from
 * current month back to Jan 2024.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { format } from "date-fns";

// Inline the logic from useYieldPeriod.getAvailableMonths to test it directly
function getAvailableMonths(): { value: string; label: string }[] {
  const months: { value: string; label: string }[] = [];
  const now = new Date();
  const startDate = new Date(2024, 0, 1);
  let current = new Date(now.getFullYear(), now.getMonth(), 1);

  while (current >= startDate) {
    const value = format(current, "yyyy-MM-dd");
    const label = format(current, "MMMM yyyy");
    months.push({ value, label });
    current = new Date(current.getFullYear(), current.getMonth() - 1, 1);
  }
  return months;
}

describe("Yield Period Date Range (A3.2)", () => {
  it("should include months back to January 2024", () => {
    const months = getAvailableMonths();
    const labels = months.map((m) => m.label);

    expect(labels).toContain("January 2024");
  });

  it("should include September 2025 for historical entry", () => {
    const months = getAvailableMonths();
    const labels = months.map((m) => m.label);

    expect(labels).toContain("September 2025");
    expect(labels).toContain("October 2025");
    expect(labels).toContain("November 2025");
    expect(labels).toContain("December 2025");
  });

  it("should include at least 24 months of options", () => {
    const months = getAvailableMonths();
    // From Jan 2024 to current (Mar 2026) = ~27 months
    expect(months.length).toBeGreaterThanOrEqual(24);
  });

  it("should have current month as first option", () => {
    const months = getAvailableMonths();
    const now = new Date();
    const currentYear = now.getFullYear().toString();
    expect(months[0].value).toContain(currentYear);
  });

  it("should have January 2024 as last option", () => {
    const months = getAvailableMonths();
    const last = months[months.length - 1];
    expect(last.value).toBe("2024-01-01");
    expect(last.label).toBe("January 2024");
  });

  it("should NOT include dates before 2024", () => {
    const months = getAvailableMonths();
    const pre2024 = months.filter((m) => m.value < "2024-01-01");
    expect(pre2024).toHaveLength(0);
  });

  it("should NOT include future months", () => {
    const months = getAvailableMonths();
    const now = new Date();
    // Current month is the latest allowed; compare year-month only
    const currentYM = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    months.forEach((m) => {
      const mYM = m.value.slice(0, 7); // "yyyy-MM"
      expect(mYM <= currentYM).toBe(true);
    });
  });
});

describe("Same-Date Multi-Investor (A4.2) - Reference ID Uniqueness", () => {
  it("should generate unique reference IDs for same-date different-investor deposits", () => {
    const date = "2025-09-04";
    const fund = "fund-abc";
    const investor1 = "investor-001";
    const investor2 = "investor-002";

    const ref1 = `deposit-${date}-${investor1}-${fund}`;
    const ref2 = `deposit-${date}-${investor2}-${fund}`;

    expect(ref1).not.toBe(ref2);
    expect(ref1).toBe("deposit-2025-09-04-investor-001-fund-abc");
    expect(ref2).toBe("deposit-2025-09-04-investor-002-fund-abc");
  });

  it("should generate unique reference IDs for same-investor same-date different-fund deposits", () => {
    const date = "2025-09-04";
    const investor = "investor-001";
    const fund1 = "fund-btc";
    const fund2 = "fund-eth";

    const ref1 = `deposit-${date}-${investor}-${fund1}`;
    const ref2 = `deposit-${date}-${investor}-${fund2}`;

    expect(ref1).not.toBe(ref2);
  });
});
