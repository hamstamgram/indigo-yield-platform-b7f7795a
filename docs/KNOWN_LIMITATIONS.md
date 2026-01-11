# Known Limitations

> **Last Updated:** 2026-01-11
> **Source:** Ground Truth Verification Protocol

---

## 1. TypeScript Financial Type Precision

**Status:** Accepted Risk (Mitigated)

**Issue:** TypeScript interfaces use `number` type for financial values in:
- `src/types/asset.ts` - balance, principal, totalEarned, yields
- `src/types/domains/yieldDistributionRecord.ts` - recordedAum, grossYield, totals
- `src/types/domains/fund.ts` - aum, fee_bps values

**Risk:** JavaScript `number` (IEEE 754 double-precision float) has ~15-17 significant digits. Values beyond this precision may experience rounding errors.

**Example:**
```javascript
// IEEE 754 precision loss
const value = 12345678901234567890.1234567890;
console.log(value); // 12345678901234567000 (precision lost)
```

**Mitigation (Currently Implemented):**
1. All financial calculations occur in PostgreSQL using `NUMERIC(28,10)`
2. UI display uses `Decimal.js` for formatting (`src/components/ui/FinancialValue.tsx`)
3. Values are stored and computed server-side, never in JavaScript
4. Zod transforms ensure proper type handling at API boundary

**Why This Is Acceptable:**
- The platform's financial operations (yield calculation, fee distribution, balance computation) all execute in PostgreSQL with full precision
- JavaScript only handles display formatting, not calculations
- Maximum expected values (~$10B) are well within IEEE 754 safe integer range

**Future Improvement:** Consider migrating API transport layer to use `string` types for financial values, parsing with `Decimal.js` on receipt:

```typescript
// Future pattern
export interface YieldDistributionRecord {
  /** @precision NUMERIC(28,10) - parse with Decimal.js */
  recordedAum: string;
  /** @precision NUMERIC(28,10) - parse with Decimal.js */
  grossYield: string;
}

// Usage
import Decimal from 'decimal.js';
const aum = new Decimal(record.recordedAum);
```

---

## 2. Legacy Table Precision

**Status:** Documented (Not In Active Use)

**Issue:** Tables from `001_initial_schema.sql` use `NUMERIC(38,18)` instead of standard `NUMERIC(28,10)`:
- `positions.principal`, `positions.total_earned`, `positions.current_balance`
- `transactions.amount`
- `statements.*` (begin_balance, additions, redemptions, etc.)
- `fees.amount`
- `portfolio_history.*`

**Risk:** Inconsistent precision across system.

**Mitigation:** These legacy tables are not used in v2 operations. All active tables (`transactions_v2`, `investor_positions`, `yield_distributions`) use the correct `NUMERIC(28,10)` precision.

**Resolution:** No action required unless legacy tables are reactivated.

---

## 3. Legacy Primary Key Types

**Status:** Documented (Low Risk)

**Issue:** Two legacy tables use `SERIAL` instead of `UUID` primary keys:
- `assets.id` - Uses `SERIAL` (001_initial_schema.sql:31)
- `benchmarks.id` - Uses `SERIAL` (004_phase3_additional_tables.sql:143)

**Risk:** Inconsistent ID patterns; potential collision in distributed scenarios.

**Mitigation:** These tables are not foreign key targets in the v2 schema. All critical entities (investors, funds, transactions, positions) use UUID.

**Resolution:** If these tables become critical, create a migration to add UUID columns and migrate references.

---

## 4. SystemHealthPage Integrity View Usage

**Status:** Enhancement Opportunity

**Issue:** `SystemHealthPage.tsx` performs integrity checks via direct queries and JavaScript functions rather than utilizing the 8 database integrity views:
- `v_ledger_reconciliation`
- `v_orphaned_positions`
- `v_yield_conservation_check`
- `v_fee_allocation_orphans`
- `v_ib_allocation_orphans`
- `fund_aum_mismatch`
- `v_duplicate_transactions`
- `v_security_definer_audit`

**Risk:** Code duplication; potential for drift between JS and SQL logic.

**Future Improvement:** Refactor SystemHealthPage to call these views directly:
```typescript
const { data: orphans } = await supabase
  .from('v_orphaned_positions')
  .select('*');
```

---

## Revision History

| Date | Change | Author |
|------|--------|--------|
| 2026-01-11 | Initial creation from Ground Truth Verification | Claude Code |
