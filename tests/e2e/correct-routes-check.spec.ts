import { test, expect } from "@playwright/test";

const BASE = "https://indigo-yield-platform.lovable.app";
const ADMIN_EMAIL = "adriel@indigo.fund";
const ADMIN_PASSWORD = "TestAdmin2026!";

async function loginAdmin(page: any) {
  await page.goto(BASE + "/");
  await page.waitForSelector('input[type="email"]', { timeout: 15000 });
  await page.fill('input[type="email"]', ADMIN_EMAIL);
  await page.fill('input[type="password"]', ADMIN_PASSWORD);
  await page
    .locator('button[type="submit"], button:has-text("Access Portal")')
    .first()
    .click({ force: true });
  await page.waitForURL(/\/admin/, { timeout: 20000 });
}

// Test all ACTUAL current routes
const ROUTES = [
  { path: "/admin", label: "Dashboard" },
  { path: "/admin/investors", label: "Investors" },
  { path: "/admin/ledger", label: "Ledger (Transactions+Withdrawals)" },
  { path: "/admin/revenue", label: "Revenue (Fees+IB)" },
  { path: "/admin/yield-history", label: "Yield History" },
  { path: "/admin/reports", label: "Reports" },
  { path: "/admin/operations", label: "Operations" },
  { path: "/admin/settings", label: "Settings" },
  { path: "/admin/transactions/new", label: "New Transaction" },
  // Redirects
  { path: "/admin/transactions", label: "→ Ledger (redirect)" },
  { path: "/admin/withdrawals", label: "→ Ledger Withdrawals Tab (redirect)" },
  { path: "/admin/fees", label: "→ Revenue (redirect)" },
  { path: "/admin/ib-management", label: "→ Revenue IB Tab (redirect)" },
  { path: "/admin/yield", label: "→ Yield History (redirect)" },
  { path: "/admin/yield-distributions", label: "→ Yield History (redirect)" },
  { path: "/admin/audit-logs", label: "→ Operations Audit Tab (redirect)" },
  { path: "/admin/investor-reports", label: "→ Reports (redirect)" },
  { path: "/admin/funds", label: "→ /admin/dashboard (BROKEN)" },
];

for (const route of ROUTES) {
  test(`Route: ${route.path} [${route.label}]`, async ({ page }) => {
    await loginAdmin(page);
    await page.goto(BASE + route.path);
    await page.waitForTimeout(2000);
    const body = await page.locator("body").innerText();
    const is404 = /\b404\b|Oops! Page not found/i.test(body);
    const finalUrl = page.url();
    console.log(`${route.path} → ${finalUrl} | 404: ${is404} | len: ${body.length}`);
    expect(is404).toBe(false);
  });
}
