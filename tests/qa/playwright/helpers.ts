/**
 * Playwright QA Helpers
 *
 * Login utilities, navigation helpers, and assertion helpers
 * for the Indigo Yield Platform QA test suite.
 */

import { type Page, expect } from "@playwright/test";

// ---------------------------------------------------------------------------
// Credentials
// ---------------------------------------------------------------------------

export const QA_CREDENTIALS = {
  admin: {
    email: "qa.admin@indigo.fund",
    password: "QaTest2026!",
  },
  investor: {
    email: "qa.investor@indigo.fund",
    password: "QaTest2026!",
  },
  ib: {
    email: "qa.ib@indigo.fund",
    password: "QaTest2026!",
  },
} as const;

export type QARole = keyof typeof QA_CREDENTIALS;

// ---------------------------------------------------------------------------
// Login
// ---------------------------------------------------------------------------

export async function loginAs(page: Page, role: QARole): Promise<void> {
  const creds = QA_CREDENTIALS[role];

  await page.goto("/login");
  await page.waitForLoadState("networkidle");

  // Fill login form
  await page.fill('input[type="email"], input[name="email"]', creds.email);
  await page.fill('input[type="password"], input[name="password"]', creds.password);

  // Click submit
  await page.click('button[type="submit"]');

  // Wait for navigation away from login
  await page.waitForURL((url) => !url.pathname.includes("/login"), {
    timeout: 15000,
  });

  // Wait for page to settle
  await page.waitForLoadState("networkidle");
}

// ---------------------------------------------------------------------------
// Navigation
// ---------------------------------------------------------------------------

export async function navigateTo(page: Page, path: string): Promise<void> {
  await page.goto(path);
  await page.waitForLoadState("networkidle");
}

export async function waitForToast(page: Page, text?: string): Promise<void> {
  if (text) {
    await page.waitForSelector(`text=${text}`, { timeout: 10000 });
  } else {
    // Wait for any sonner toast
    await page.waitForSelector("[data-sonner-toaster] [data-sonner-toast]", {
      timeout: 10000,
    });
  }
}

// ---------------------------------------------------------------------------
// Assertions
// ---------------------------------------------------------------------------

export async function assertNoConsoleErrors(page: Page): Promise<string[]> {
  const errors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") {
      errors.push(msg.text());
    }
  });
  return errors;
}

export async function assertNoCrash(page: Page): Promise<void> {
  // Check that the page hasn't crashed (no error boundary)
  const errorBoundary = page.locator('[data-testid="error-boundary"], .error-boundary');
  const count = await errorBoundary.count();
  expect(count).toBe(0);
}

export async function assertPageLoaded(page: Page): Promise<void> {
  await assertNoCrash(page);
  // Verify we're not on a blank page
  const body = page.locator("body");
  await expect(body).not.toBeEmpty();
}

// ---------------------------------------------------------------------------
// RPC Interceptor
// ---------------------------------------------------------------------------

interface RPCCall {
  functionName: string;
  params: Record<string, unknown>;
  timestamp: number;
}

export function createRPCInterceptor(page: Page): {
  calls: RPCCall[];
  start: () => Promise<void>;
} {
  const calls: RPCCall[] = [];

  return {
    calls,
    start: async () => {
      await page.route("**/rest/v1/rpc/**", (route) => {
        const url = route.request().url();
        const funcMatch = url.match(/\/rpc\/([^?]+)/);
        if (funcMatch) {
          const postData = route.request().postData();
          calls.push({
            functionName: funcMatch[1],
            params: postData ? JSON.parse(postData) : {},
            timestamp: Date.now(),
          });
        }
        route.continue();
      });
    },
  };
}

// ---------------------------------------------------------------------------
// Screenshot helpers
// ---------------------------------------------------------------------------

export async function takeScreenshot(page: Page, name: string): Promise<void> {
  await page.screenshot({
    path: `tests/qa/screenshots/${name}.png`,
    fullPage: true,
  });
}

// ---------------------------------------------------------------------------
// Admin route list (for surface crawl)
// ---------------------------------------------------------------------------

export const ADMIN_ROUTES = [
  "/admin",
  "/admin/funds",
  "/admin/fees",
  "/admin/investors",
  "/admin/transactions",
  "/admin/transactions/new",
  "/admin/withdrawals",
  "/admin/yield",
  "/admin/yield-distributions",
  "/admin/recorded-yields",
  "/admin/investor-reports",
  "/admin/reports/delivery",
  "/admin/system-health",
  "/admin/integrity",
  "/admin/crystallization",
  "/admin/duplicates",
  "/admin/bypass-attempts",
  "/admin/audit-logs",
  "/admin/maintenance",
  "/admin/settings",
  "/admin/settings/admins",
  "/admin/settings/tools",
  "/admin/settings/invites",
  "/admin/ib-management",
  "/admin/ib-payouts",
  "/admin/operations",
  "/admin/requests-queue",
  "/admin/email-tracking",
  "/admin/onboarding",
  "/admin/statements",
] as const;

export const INVESTOR_ROUTES = [
  "/dashboard",
  "/portfolio",
  "/transactions",
  "/withdrawals",
  "/settings",
] as const;

export const IB_ROUTES = ["/dashboard", "/referrals", "/commissions"] as const;

// ---------------------------------------------------------------------------
// Supabase RPC helpers (for test data verification)
// ---------------------------------------------------------------------------

export interface RPCVerification {
  rpcName: string;
  wasCalled: boolean;
  callCount: number;
  lastParams?: Record<string, unknown>;
}

export function createDetailedRPCInterceptor(page: Page): {
  calls: RPCCall[];
  start: () => Promise<void>;
  verify: (rpcName: string) => RPCVerification;
  getAllRPCs: () => string[];
} {
  const calls: RPCCall[] = [];

  return {
    calls,
    start: async () => {
      await page.route("**/rest/v1/rpc/**", (route) => {
        const url = route.request().url();
        const funcMatch = url.match(/\/rpc\/([^?]+)/);
        if (funcMatch) {
          const postData = route.request().postData();
          calls.push({
            functionName: funcMatch[1],
            params: postData ? JSON.parse(postData) : {},
            timestamp: Date.now(),
          });
        }
        route.continue();
      });
    },
    verify: (rpcName: string): RPCVerification => {
      const matching = calls.filter((c) => c.functionName === rpcName);
      return {
        rpcName,
        wasCalled: matching.length > 0,
        callCount: matching.length,
        lastParams: matching.length > 0 ? matching[matching.length - 1].params : undefined,
      };
    },
    getAllRPCs: (): string[] => {
      return [...new Set(calls.map((c) => c.functionName))];
    },
  };
}

// ---------------------------------------------------------------------------
// Wait helpers
// ---------------------------------------------------------------------------

export async function waitForTableData(page: Page, timeout = 10000): Promise<boolean> {
  try {
    await page.waitForSelector("table tbody tr, [role='row']", { timeout });
    return true;
  } catch {
    return false;
  }
}

export async function waitForLoadingComplete(page: Page, timeout = 10000): Promise<void> {
  // Wait for loading spinners to disappear
  try {
    await page.waitForSelector('[data-testid="loading"], .animate-spin, [role="progressbar"]', {
      state: "hidden",
      timeout,
    });
  } catch {
    // Loading may not be present, that's OK
  }
}

// ---------------------------------------------------------------------------
// Data extraction helpers
// ---------------------------------------------------------------------------

export async function getTableRowCount(page: Page): Promise<number> {
  const rows = page.locator("table tbody tr, [data-testid$='-row']");
  return await rows.count();
}

export async function getVisibleText(page: Page, selector: string): Promise<string[]> {
  const elements = page.locator(selector);
  const count = await elements.count();
  const texts: string[] = [];
  for (let i = 0; i < count; i++) {
    const text = await elements.nth(i).textContent();
    if (text) texts.push(text.trim());
  }
  return texts;
}
