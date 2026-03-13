import { describe, it, expect } from "vitest";
import { INDIGO_FEES_ACCOUNT_ID } from "@/constants/fees";

/**
 * Issue 2: Can't deposit to Indigo Fees account
 * The fix removed the explicit block that prevented deposits to INDIGO_FEES_ACCOUNT_ID.
 * We verify that the INDIGO_FEES_ACCOUNT_ID constant exists and is a valid UUID,
 * and that no blocking logic prevents deposits to this account.
 */
describe("useTransactionSubmit - Indigo Fees deposit (Issue 2)", () => {
  it("INDIGO_FEES_ACCOUNT_ID is a valid UUID", () => {
    expect(INDIGO_FEES_ACCOUNT_ID).toBeDefined();
    expect(INDIGO_FEES_ACCOUNT_ID).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    );
  });

  it("does not block deposits to fees account in the submission logic", async () => {
    // Read the source file and verify no INDIGO_FEES_ACCOUNT_ID blocking logic exists
    // This is a structural test — if someone re-adds the block, this test should be updated
    const fs = await import("fs");
    const source = fs.readFileSync(
      "src/features/admin/transactions/hooks/useTransactionSubmit.ts",
      "utf-8"
    );

    // Should NOT contain logic that blocks deposits to INDIGO_FEES
    expect(source).not.toMatch(/INDIGO_FEES_ACCOUNT_ID.*DEPOSIT/);
    expect(source).not.toMatch(/INDIGO_FEES_ACCOUNT_ID.*FIRST_INVESTMENT/);
  });
});
