

# Fix: `column "gross" does not exist` -- Yield Preview and Apply Both Broken

## Root Cause

The `calculate_yield_allocations()` helper function returns columns named:
- `gross_amount`, `fee_amount`, `ib_amount`, `net_amount`

But both `preview_segmented_yield_distribution_v5` and `apply_segmented_yield_distribution_v5` reference:
- `v_alloc.gross`, `v_alloc.fee`, `v_alloc.ib`, `v_alloc.net`

This column name mismatch causes the PostgreSQL error `column "gross" does not exist` whenever either function is called. **Both yield preview AND yield apply are completely broken.**

## Evidence

Database logs from the last 24 hours show:
```
ERROR: column "gross" does not exist
```
Triggered when clicking "Preview Yield" in the UI.

## Fix: Single SQL Migration

Recreate `calculate_yield_allocations()` with renamed output columns to match what both callers expect:

| Current Output Column | New Output Column |
|----------------------|-------------------|
| `gross_amount` | `gross` |
| `fee_amount` | `fee` |
| `ib_amount` | `ib` |
| `net_amount` | `net` |

All other columns (`investor_id`, `investor_name`, `investor_email`, `account_type`, `ib_parent_id`, `current_value`, `share`, `fee_pct`, `ib_rate`, `fee_credit`, `ib_credit`) remain unchanged since they already match.

The internal SQL logic stays identical -- only the RETURNS TABLE column names change in the function signature and the final SELECT aliases.

## Why Fix the Helper (Not the Callers)

- 2 callers reference `gross/fee/ib/net` (preview + apply)
- 1 helper defines `gross_amount/fee_amount/ib_amount/net_amount`
- Fixing 1 function is safer than fixing 2
- The short names (`gross`, `fee`, `ib`, `net`) match the JSON keys already emitted by both callers, keeping everything consistent end-to-end

## What This Unblocks

- Yield preview (currently broken -- the button does nothing / shows error)
- Yield apply (currently broken -- would fail with the same column error)
- All downstream features dependent on yield distribution

## No Frontend Changes Needed

The frontend already maps the JSON keys correctly (`d.gross`, `d.fee`, `d.ib`, `d.net` in `yieldPreviewService.ts`). The JSON output from the RPC already uses these short names. Only the internal SQL column references are broken.

