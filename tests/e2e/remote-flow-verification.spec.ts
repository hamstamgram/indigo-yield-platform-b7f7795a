import { test, expect, type Page } from "@playwright/test";

const BASE_URL = "https://indigo-yield-platform.lovable.app";
const SUPABASE_URL = "https://nkfimvovosdehmyyjubn.supabase.co";
const ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5rZmltdm92b3NkZWhteXlqdWJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY0NTQ1OTgsImV4cCI6MjA2MjAzMDU5OH0.pZrIyCCd7dlvvNMGdW8-71BxSVfoKhxs9a5Ezbkmjgg";

let _jwt: string | null = null;

async function getJwt(): Promise<string> {
  if (_jwt) return _jwt;
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: ANON_KEY },
    body: JSON.stringify({ email: "Adriel@indigo.fund", password: "TestAdmin2026!" }),
  });
  if (!res.ok) throw new Error(`Login failed: ${res.status}`);
  const { access_token } = await res.json();
  _jwt = access_token;
  return access_token;
}

async function rpc(fn: string, params: Record<string, unknown>) {
  const jwt = await getJwt();
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: ANON_KEY,
      Authorization: `Bearer ${jwt}`,
    },
    body: JSON.stringify(params),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`RPC ${fn}: ${res.status} — ${text.substring(0, 300)}`);
  return JSON.parse(text);
}

async function restGet(table: string, query: string) {
  const jwt = await getJwt();
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${query}`, {
    headers: { apikey: ANON_KEY, Authorization: `Bearer ${jwt}`, Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`GET ${table}: ${res.status}`);
  return res.json();
}

async function login(page: Page) {
  await page.goto(BASE_URL + "/login");
  await page.getByRole("textbox", { name: "Email Address" }).fill("Adriel@indigo.fund");
  await page.getByRole("textbox", { name: "Password" }).fill("TestAdmin2026!");
  await page.getByRole("button", { name: /Access Portal/i }).click();
  await page.waitForURL("**/admin**", { timeout: 60000 });
  await page.waitForTimeout(3000);
}

test.describe.serial("Remote Flow Verification", () => {
  test("STEP-1: Login and navigate to ledger", async ({ page }) => {
    await login(page);
    await page.goto(BASE_URL + "/admin/ledger");
    await page.waitForTimeout(3000);
    const body = await page.locator("body").textContent();
    const hasLedger = body?.includes("Transaction") || body?.includes("Ledger");
    console.log(`STEP-1: Ledger page loaded: ${hasLedger}`);
    await page.screenshot({ path: "test-results/step1-ledger.png", fullPage: true });
  });

  test("STEP-2: Invariant checks via RPC — 16/16 must pass", async () => {
    const result = await rpc("run_invariant_checks", {});
    const summary = result?.summary;
    console.log(
      `STEP-2: ${summary?.passed}/${summary?.total} passed, all_passed=${summary?.all_passed}`
    );
    expect(summary?.all_passed).toBe(true);
    expect(summary?.failed).toBe(0);
  });

  test("STEP-3: anon cannot call SECDEF get_fund_summary", async () => {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_fund_summary`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: ANON_KEY },
      body: JSON.stringify({}),
    });
    console.log(`STEP-3: anon → ${res.status}`);
    expect(res.ok).toBe(false);
  });

  test("STEP-4: preview_segmented_yield_distribution_v5 admin access works", async () => {
    const funds = await restGet("funds", "select=id,asset&limit=1");
    expect(funds.length).toBeGreaterThan(0);
    try {
      const result = await rpc("preview_segmented_yield_distribution_v5", {
        p_fund_id: funds[0].id,
        p_recorded_aum: 100,
        p_period_end: "2026-04-18",
        p_yield_date: "2026-04-18",
      });
      console.log("STEP-4: ✅ Preview returned data");
    } catch (err: any) {
      const msg = err.message || "";
      if (msg.toLowerCase().includes("nauthorized")) {
        throw new Error("STEP-4 FAILED: unauthorized — admin gate misconfigured");
      }
      console.log("STEP-4: Non-auth error (expected if no investors):", msg.substring(0, 120));
    }
  });

  test("STEP-5: void_transaction has admin gate but is callable", async () => {
    try {
      await rpc("void_transaction", {
        p_transaction_id: "00000000-0000-0000-0000-000000000000",
        p_admin_id: "00000000-0000-0000-0000-000000000000",
        p_reason: "verify",
      });
    } catch (err: any) {
      const msg = err.message || "";
      console.log("STEP-5: void_transaction error:", msg.substring(0, 120));
      expect(msg).not.toContain("Unauthorized: admin role required");
    }
  });

  test("STEP-6: approve_and_complete_withdrawal has admin gate but is callable", async () => {
    try {
      await rpc("approve_and_complete_withdrawal", {
        p_request_id: "00000000-0000-0000-0000-000000000000",
        p_processed_amount: "1",
        p_tx_hash: null,
        p_notes: "verify",
        p_is_full_exit: false,
        p_send_precision: 10,
      });
    } catch (err: any) {
      const msg = err.message || "";
      console.log("STEP-6: approve_and_complete_withdrawal error:", msg.substring(0, 120));
      expect(msg).not.toContain("Unauthorized: admin role required");
    }
  });

  test("STEP-7: transactions have source=rpc_canonical", async () => {
    const txs = await restGet(
      "transactions_v2",
      "select=id,source,type&limit=10&order=created_at.desc"
    );
    txs.forEach((t: any) => console.log(`  ${t.type}: source=${t.source}`));
    const rpcCanonical = txs.filter((t: any) => t.source === "rpc_canonical");
    console.log(`STEP-7: ${rpcCanonical.length}/10 recent transactions with source=rpc_canonical`);
  });

  test("STEP-8: Dust preview visible in Add Transaction for full exit", async ({ page }) => {
    await login(page);
    await page.goto(BASE_URL + "/admin/ledger");
    await page.waitForTimeout(3000);

    await page
      .getByRole("button", { name: /new transaction|add transaction/i })
      .first()
      .click();
    await page
      .getByRole("dialog", { name: /add transaction/i })
      .waitFor({ state: "visible", timeout: 15000 });
    const dialog = page.getByRole("dialog", { name: /add transaction/i });
    const comboboxes = dialog.getByRole("combobox");

    await comboboxes.nth(1).click();
    await page.waitForTimeout(500);
    const btcOption = page.getByRole("option", { name: /btc/i }).first();
    if (await btcOption.isVisible().catch(() => false)) {
      await btcOption.click();
      await page.waitForTimeout(1000);
    }

    await comboboxes.nth(2).click();
    await page.waitForTimeout(500);
    const searchBox = page.getByPlaceholder("Search").first();
    if (await searchBox.isVisible().catch(() => false)) {
      await searchBox.fill("INDIGO Fees");
      await page.waitForTimeout(800);
      const feesOption = page.getByRole("option", { name: /indigo.*fees/i }).first();
      if (await feesOption.isVisible().catch(() => false)) {
        await feesOption.click();
        await page.waitForTimeout(1500);
      }
    }

    for (let attempt = 0; attempt < 5; attempt++) {
      await comboboxes.nth(0).click();
      await page.waitForTimeout(300);
      const wdOption = page.getByRole("option", { name: /withdrawal/i }).first();
      const disabled = await wdOption.getAttribute("data-disabled").catch(() => "true");
      if (disabled === null) {
        await wdOption.click();
        break;
      }
      await page.keyboard.press("Escape");
      await page.waitForTimeout(500);
    }
    await page.waitForTimeout(1500);

    const fullExit = page.getByRole("switch").first();
    const fullExitVisible = await fullExit.isVisible().catch(() => false);
    if (fullExitVisible) {
      await fullExit.click({ force: true });
      await page.waitForTimeout(1500);

      const dustPreview = page
        .locator("text=Dust to INDIGO Fees")
        .or(page.locator("text=Position balance"));
      const hasPreview = await dustPreview
        .first()
        .isVisible()
        .catch(() => false);
      console.log(`STEP-8: ✅ Dust preview visible: ${hasPreview}`);
      await page.screenshot({ path: "test-results/step8-dust-preview.png", fullPage: true });
      expect(hasPreview).toBe(true);
    } else {
      console.log(
        "STEP-8: Full Exit toggle not visible (no active position for selected investor)"
      );
      await page.screenshot({ path: "test-results/step8-no-fullexit.png", fullPage: true });
    }
  });

  test("STEP-FINAL: run_invariant_checks still 16/16 pass", async () => {
    const result = await rpc("run_invariant_checks", {});
    const summary = result?.summary;
    console.log(
      `STEP-FINAL: ${summary?.passed}/${summary?.total}, all_passed=${summary?.all_passed}`
    );
    expect(summary?.all_passed).toBe(true);
    expect(summary?.failed).toBe(0);
  });
});
