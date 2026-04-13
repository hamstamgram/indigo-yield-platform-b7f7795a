# AUTOPLAN REVIEW REPORT

## Executive Summary

**Real Problem**: Migrate DAILY OPERATIONS from Excel to the platform - not testing, but actual ongoing workflow replacement.

**What User Said**: "the goal is to migrate from this excel to the platform by doing exactly what we would do daily or whenever we have transactions"

---

## CEO REVIEW

### Reframe
- **Original**: Validate platform against Excel using E2E tests
- **Actual Need**: Replace Excel workflow with platform - enter transactions daily through the actual UI/API

### Premises Challenged

| Premise | Challenge | Verdict |
|---------|-----------|---------|
| "We need E2E tests to validate" | User doesn't need tests - needs operations workflow | **DISCARD** - Wrong framing |
| "PostgREST bug is blocking" | Yes but it's table-stakes infrastructure | **VALID** - Fix and move on |
| "Validate row-by-row against Excel" | Assumes Excel is source of truth | **REFRAME** - What does Excel actually compute? |
| "One-time migration" | User said "daily or whenever transactions occur" | **VALID** - It's ongoing operations |

### Scope Options

| Option | Effort | Completeness | Recommendation |
|--------|--------|--------------|----------------|
| A: Quick Wedge | 1d | 5/10 | Document daily Excel workflow first |
| B: Full Operations Migration | 1-2w | 8/10 | Build input flow → verify outputs → replace Excel |
| C: Parallel Run | 2w | 7/10 | Run both simultaneously → cutover when confident |

### Recommendation
- **WHAT**: Build Daily Operations workflow that mimics Excel usage
- **WHY**: Operations replacement, not testing - completely different problem
- **MODE**: **SELECTIVE EXPANSION** - Focus on documenting and building daily ops

---

## DESIGN REVIEW

### What Already Exists (Good Foundation)

| Feature | Assessment |
|---------|------------|
| Add Transaction | ✅ Works for DEPOSIT/WITHDRAWAL |
| Yield Distributions | ✅ Functional |
| Transaction History | ✅ View/filter/void |
| Admin Dashboard | ✅ Quick actions |

### Gap Analysis

| Issue | Problem | Fix |
|-------|---------|-----|
| No Daily Operations Hub | Must navigate 3 places for daily work | Create `/admin/daily-ops` |
| No Investor Creation Workflow | Buried in /admin/investors | Quick Add Investor + Deposit combo |
| AUM Checkpoint UX | 5-7 clicks vs expected 1-2 | Monthly Close wizard |
| Yield Purpose Confusion | transaction vs reporting confusing | Simplify labels |

### What a 10 Looks Like
```
┌─────────────────────────────────────────────────────────────┐
│  DAILY OPERATIONS                              Apr 12, 2026  │
├─────────────────────────────────────────────────────────────┤
│  [+ Deposit]  [+ Withdrawal]  [+ Investor]                │
├─────────────────────────────────────────────────────────────┤
│  TODAY'S ACTIVITY                                          │
│  • 3 deposits  • 1 withdrawal  • Month-end: NOT COMPLETE    │
├─────────────────────────────────────────────────────────────┤
│  QUICK ACTIONS                                             │
│  [Apply Mid-Month Yield]  [Run Month-End Close]            │
└─────────────────────────────────────────────────────────────┘
```

### Verdict
STATUS: NEEDS_WORK  
BLOCKERS: No Daily Ops hub, Month-end requires too many clicks, Yield labels confusing

---

## ENGINEERING REVIEW

### Architecture: Daily Transaction Flow

```
apply_investor_transaction (11 params):
  INPUT → Idempotency Check → Advisory Lock → Fund Validation →
  Position Fetch → Balance Calc → INSERT transactions_v2 → 
  UPDATE fund_daily_aum → OUTPUT {success, tx_id, balance}

apply_segmented_yield_distribution_v5 (5 params):
  INPUT: recorded_aum, period_end → Calculate: yield = recorded_aum - opening_aum
  → For each investor: allocate proportionally minus fees/IB →
  INSERT yield_distributions → OUTPUT {distribution_id, allocations}
```

### Prerequisites for Operations

| Entity | Required | How to Get |
|--------|----------|------------|
| fund | YES | Must exist before transactions |
| investor profile | YES | Must exist in profiles table |
| admin session | YES | Need JWT with admin role |
| fee schedule | Optional | Defaults to 0% |

### Edge Cases

| Edge Case | Handling |
|-----------|----------|
| Insufficient balance | Fails with exception |
| Duplicate reference_id | Returns idempotent success |
| Same-day transactions | Allowed, advisory lock prevents race |
| Negative yield | Allowed (AUM < opening) |
| Zero opening AUM | Skips allocation loop |

### Operations Checklist

**Before First Transaction:**
- [ ] Fund exists in `funds` table
- [ ] Investor exists in `profiles`
- [ ] Admin user has admin role

**Daily Workflow:**
1. Enter deposit/withdrawal via `apply_investor_transaction`
2. End of day: optionally enter AUM checkpoint
3. Month-end: enter recorded_aum → run yield distribution

---

## VERDICT

| Phase | Status | Key Finding |
|-------|--------|-------------|
| CEO | ✅ | Problem is DAILY OPERATIONS migration, not testing |
| Design | ⚠️ | Platform has buildblocks, needs Daily Ops wrapper |
| Engineering | ✅ | RPCs work, prerequisite is existing data |

## Taste Decisions (User Approval Needed)

- [ ] **Decision 1**: Build Daily Operations page at `/admin/daily-ops` with quick actions
- [ ] **Decision 2**: Add "Month-End Close" wizard (Select Fund → Enter AUM → Preview → Apply)
- [ ] **Decision 3**: Simplify yield labels (hide "transaction" vs "reporting" from daily users)
- [ ] **Decision 4**: Start with ONE fund (XRP) as proof-of-concept daily ops workflow

## Next Steps

1. **Create Daily Operations page** in the admin frontend
2. **Test ONE fund manually** - enter transactions via admin UI, verify yields calculate correctly
3. **Document the Excel → Platform mapping** - what Excel column = what platform action
4. **Run parallel for 1 month** - both Excel and platform, compare outputs

---

## Summary: What We Actually Need

The user needs to do DAILY what they currently do in Excel:
1. **Input transactions** → Platform has `apply_investor_transaction`
2. **Record AUM** → Platform calculates yield = AUM - opening
3. **Run yield distribution** → Platform has `apply_segmented_yield_distribution_v5`

The issue isn't the ENGINE - it's the DAILY WORKFLOW WRAPPER around it.