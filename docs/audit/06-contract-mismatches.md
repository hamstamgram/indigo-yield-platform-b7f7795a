# Contract Mismatches

**Status**: FRAMEWORK CREATED — Requires detailed code inspection
**Next Step**: Deep dive code review with hooks/services/RPC implementations

## Known Mismatches (From Schema Analysis)

### Critical Issues

| Component | Expected | Actual | Severity | Evidence |
|-----------|----------|--------|----------|----------|
| Fund Status | Enum: active/inactive | SQL: varchar | P1 | schema dump |
| Yield Distribution | Single canonical function | Multiple v3/v4/v5 | P1 | migrations |
| Void Transaction | Single void logic | 4 separate functions | P1 | functions list |
| Position Access | Clear auth rules | 8 helper functions | P2 | schema functions |

### Suspected Mismatches

From hook/service analysis:
- `useAvailableBalance` vs `useFinalizedPortfolio` — Unclear contract difference
- `investorPortalService` aggregation — Return shape not documented
- Real-time notifications — Two different hooks with unclear separation
- Statement generation — Multiple services touch same data

## Process for Full Analysis

### Step 1: Document All RPC Signatures
- [ ] Extract `CREATE OR REPLACE FUNCTION` definitions
- [ ] Parse parameter types and return shapes
- [ ] Create reference table

### Step 2: Extract Hook/Service Call Sites
- [ ] Find all RPC invocations
- [ ] Extract expected parameter types
- [ ] Extract expected return types
- [ ] Compare vs. RPC signatures

### Step 3: Categorize Findings
- [ ] Mismatched parameter names
- [ ] Wrong nullability expectations
- [ ] Stale return fields
- [ ] Dead mutation endpoints

### Step 4: Evidence & Severity
- [ ] Code locations
- [ ] Test evidence
- [ ] Impact on business logic
- [ ] P0/P1/P2/P3 classification

## Preliminary Flow Map

### Deposit Flow
```
Investor → depositForm (hook)
         → depositService (service)
         → apply_deposit_with_crystallization() (RPC)
         → Ledger + AUM updates
         → depositNotifications (service)
         → Email/SMS notification

Questions:
- Does hook expect crystallization to happen?
- What if crystallization date hasn't passed?
- Error handling at each stage?
```

### Yield Distribution Flow
```
Admin → statementsService
      → process_yield_distribution() (RPC)
      → yield_distributions table
      → sync_yield_to_investor_yield_events (trigger)
      → yieldNotifications (service)

Questions:
- Which RPC is called? (v3, v5, preview vs apply?)
- When are lookups populated?
- Does service handle all error states?
```

### Withdrawal Flow
```
Investor → withdrawalForm
         → depositService.createWithdrawal() (service)
         → create_withdrawal_request() (RPC)
         → admin approval (manual)
         → approve_and_complete_withdrawal() (RPC)
         → Ledger update
         → withdrawalNotifications

Questions:
- How long does approval take?
- What if RPC fails mid-approval?
- Are state transitions atomic?
```

## Template for Detailed Analysis

Once code inspection completes, populate:

```markdown
### Flow: [Name]
**Participants**: [components]
**Data Path**: [frontend → hook → service → RPC → table]

**Hook Contract**:
- Input: [types]
- Output: [types]
- Errors: [error types]

**RPC Contract**:
- Signature: [PostgreSQL definition]
- Input validation: [checks]
- Output shape: [fields]
- Side effects: [tables modified]

**Mismatch Evidence**:
- File: [path]
- Line: [number]
- Issue: [description]

**Severity**: [P0/P1/P2/P3]
**Fix**: [recommended action]
```

## Placeholder: To Be Completed

This document requires:
1. RPC signature extraction
2. Hook implementation inspection
3. Service method signatures
4. Call site analysis
5. Type comparison
6. Error handling review

**Estimated effort**: 4-6 hours detailed code review
