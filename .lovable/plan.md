

# Withdrawal Audit — Findings & Fix Plan

## Audit Results

### Bug Found: Full Exit Ignores User-Entered Amount (REGRESSION)

When you enter 331,500 for a full exit, the `approve_and_complete_withdrawal` RPC ignores your input and withdraws `TRUNC(balance, 3)` = 331,500.420 instead. The dust is then only 0.000586... instead of the expected 0.42.

**Root cause:** Migration `20260327173212` (line 229-231) regressed the fix from `20260324125841`. The older migration correctly checked:
```sql
IF p_processed_amount IS NOT NULL AND p_processed_amount > 0 THEN
  v_final_amount := p_processed_amount;  -- Respect user input
ELSE
  v_final_amount := TRUNC(v_balance, p_send_precision);  -- Auto
END IF;
v_dust := v_balance - v_final_amount;
```
The newer migration replaced it with:
```sql
v_final_amount := TRUNC(v_balance, p_send_precision);  -- Always ignores input
```

The frontend (`withdrawalService.ts` line 255) correctly sends `p_processed_amount`, but it's thrown away.

### All Other Withdrawals: Clean

- **11 completed withdrawals** audited — no orphaned transactions
- **All dust pairs balanced** — where investor-side dust sweep exists, fees-side credit exists (or both voided)
- **No position-vs-ledger mismatches** on any active position
- **Sam Johnson XRP residual** (0.000586762400) is from your test session — dust sweep was voided while main withdrawal stayed active. This is consistent with the ledger (position = ledger sum). It's test data, not a production bug.

### Reconciliation Dust on Indigo Fees SOL

One manual correction transaction (`reconcile-dust-fees-sol-2026-04-08`, -1.644638572700) exists. Position matches ledger — no integrity issue.

## Fix: 1 Migration

Rebuild `approve_and_complete_withdrawal` to restore the `p_processed_amount` respect logic from migration `20260324125841`:

- When `p_is_full_exit = true` AND `p_processed_amount` is provided → use that exact amount, sweep remainder as dust
- When `p_is_full_exit = true` AND no amount provided → use `TRUNC(v_balance, p_send_precision)` (current behavior)
- Safety cap: if `p_processed_amount > v_balance`, cap at balance

This ensures:
- User enters 331,500 → withdraws exactly 331,500, dust = 0.420586762400 → swept to Indigo Fees
- User leaves amount blank → auto-truncates balance (legacy behavior preserved)

No frontend changes needed — the service already passes `p_processed_amount`.

