# Fund Validation - UPDATED PLAN

## Problem Statement

The validation framework replays transactions but does NOT record intermediate yield that happens between transactions. Without this, the position values won't match Excel AUM snapshots.

## Root Cause Analysis

### Excel Structure (from XRP Yield Fund sheet)
```
Row 0: AUM Before at each date checkpoint
Row 7: Date headers (Excel serial numbers)
  - 45978 = 2025-11-17 (Sam deposits 135,003)
  - 45986 = 2025-11-25 (Sam deposits 49,000)
  - 45991 = 2025-11-30 (Sam deposits 45,000 + Nov yield=355 distributed)
  - 45999 = 2025-12-08 (Sam deposits 49,500)
  - 46006 = 2025-12-15 (Sam deposits 50,100 + Dec tx yield crystallized)
  - 46023 = 2026-01-01 (Dec month-end yield distributed)
  - 46024 = 2026-01-02 (Sam withdrawal)
  - 46027 = 2026-01-05 (Fees/Ryan deposits + Jan yield)
  - 46054 = 2026-01-31 (Jan month-end)
  - 46081 = 2026-02-28 (Feb month-end)
```

### AUM Snapshot Evidence
- 2025-11-30: AUM Before = 184,358
  - After deposits: 135,003 + 49,000 + 45,000 = 229,003
  - After Nov yield (355): 229,358... wait, that doesn't match
  
Let me recalculate:
- 2025-11-17: Sam deposits 135,003 → AUM = 135,003
- 2025-11-25: Sam deposits 49,000 → AUM = 184,003
- 2025-11-30: AUM Before = 184,358
  - This means yield of 355 was already distributed before this date
  - Actually wait - "AUM Before" is BEFORE the transaction on this date
  - So the 184,358 is the AUM at START of 2025-11-30
  - But Sam deposits 45,000 on 2025-11-30... 
  - Let me check if 184,358 = 184,003 + 355 (yield before deposit)

Actually looking at the E2E test:
- B2: Sam deposits 49,000 (2025-11-25), balance = 184,003
- C1: November yield distribution of 355 XRP (gross)
- D1: Sam deposits 45,000 (2025-11-30)
- Expected after D1: 184,003 + 355 (yield) + 45,000 = 229,358

But the Excel shows AUM Before on 2025-11-30 as 184,358... This suggests:
- The yield (355) was distributed AFTER the 11-30 deposit
- "AUM Before" means the state before ANY activity on that date

So the flow is:
1. 2025-11-30 START: AUM = 184,358 (after Nov yield was distributed on 11-30)
2. 2025-11-30: Sam deposits 45,000 → AUM = 229,358

This means yield distribution happens at the START of month-end dates, not the end.

## Required Changes

### 1. Update ExcelParser to Extract AUM Snapshots

```typescript
interface AumSnapshot {
  date: string;
  aumBefore: number;
  aumAfter?: number;
  comments?: string;
}

// In excelParser.ts, add method:
async parseAumSnapshots(sheetName: string): Promise<AumSnapshot[]>
```

### 2. Update FundReplayer to Call Yield Distribution RPC

The E2E test pattern shows we need to call `apply_segmented_yield_distribution_v5`:
- After deposits that trigger crystallization (purpose: 'transaction')
- At month-end dates (purpose: 'reporting')

```typescript
// In fundReplayer.ts, add:
async applyYieldDistribution(params: {
  periodEnd: string;
  recordedAum: number;
  purpose: 'transaction' | 'reporting';
}): Promise<void>
```

### 3. Add Snapshot Validation

```typescript
// In comparator.ts, add:
interface SnapshotValidation {
  date: string;
  expectedAum: number;
  actualAum: number;
  discrepancy: number;
}

// New validation step:
validateSnapshots(snapshots: AumSnapshot[], actualPositions: FundState): SnapshotValidation[]
```

### 4. Update Excel Parser for All Fund Sheets

Parse each fund sheet to extract:
- AUM snapshots (row 0)
- Investor positions (rows 8-23)
- Comments for transaction mapping

## Implementation Plan

### Phase 1: Parse AUM Snapshots
- [ ] Add `parseAumSnapshots()` method to ExcelParser
- [ ] Test with XRP sheet
- [ ] Apply to all 8 fund sheets

### Phase 2: Integrate Yield Distribution
- [ ] Update FundReplayer to accept yield events from Excel
- [ ] Call `apply_segmented_yield_distribution_v5` at correct points
- [ ] Pass `p_yield_amount` from Excel AUM delta

### Phase 3: Snapshot Validation
- [ ] Add `SnapshotValidation` type to comparator
- [ ] Implement `validateSnapshots()` method
- [ ] Update report generator for snapshot comparisons

### Phase 4: End-to-End Test
- [ ] Run full XRP fund replay with yield distributions
- [ ] Validate AUM matches Excel at each checkpoint
- [ ] Run all 8 funds through validation

## Files to Modify

1. `src/lib/validation/excelParser.ts`
   - Add `parseAumSnapshots()` method
   - Add `AumSnapshot` interface
   - Parse fund sheets for full state data

2. `src/lib/validation/fundReplayer.ts`
   - Accept yield events from Excel
   - Call `apply_segmented_yield_distribution_v5` RPC
   - Record snapshots after each date group

3. `src/lib/validation/comparator.ts`
   - Add `SnapshotValidation` type
   - Implement snapshot comparison logic

4. `src/lib/validation/reportGenerator.ts`
   - Add snapshot section to reports
   - Show discrepancies at each checkpoint

## Decision: Hold vs Expand

Based on CEO review:
- **Hold scope on adding intermediate yield recording feature**
- **Fix position update bug first** (transactions insert but positions stay at 0)
- **If yield data is in Excel, use it directly** - don't add complex yield calculation

The fix is to:
1. Extract yield amounts from Excel AUM deltas
2. Pass them to `apply_segmented_yield_distribution_v5` via `p_yield_amount`
3. Validate AUM matches at each checkpoint

This is NOT expanding scope - it's fixing the validation framework to match Excel reality.
