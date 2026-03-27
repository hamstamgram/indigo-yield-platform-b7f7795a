

# Plan: Create `deepthink_context.md`

Assemble a single Markdown file at the project root containing the full source of the following files, each wrapped in a fenced code block with the file path as header:

## Files to include

### 1. Core Contracts
- `src/contracts/dbSchema.ts` (901 lines)
- `src/contracts/rpcSignatures.ts` (1879 lines)

### 2. Financial Math Utilities
- `src/utils/financial.ts` (471 lines)
- `src/utils/numeric.ts` (125 lines)
- `src/utils/yieldMath.ts` (35 lines)
- `src/utils/statementCalculations.ts` (414 lines)

### 3. Yield Services (`src/services/admin/yields/`)
- `index.ts`
- `yieldDistributionService.ts` (barrel re-exports)
- `yieldApplyService.ts`
- `yieldPreviewService.ts`
- `yieldCrystallizationService.ts`
- `yieldHistoryService.ts`
- `yieldManagementService.ts`
- `yieldReportsService.ts`
- `yieldDistributionsPageService.ts`
- `yieldAumService.ts`

### 4. Withdrawal Services
- `src/features/investor/withdrawals/services/investorWithdrawalService.ts`

### 5. Core SQL Migrations (most recent canonical definitions)
- `20260327113803...sql` -- Hardened `void_yield_distribution`, `approve_and_complete_withdrawal` (numeric(38,18)), `recalculate_fund_aum_for_date` with advisory lock
- `20260327112754...sql` -- Hardened `void_transaction` with dual dust pattern cascade + global AUM heal
- `20260324143540...sql` -- Platform precision upgrade: `recompute_investor_position`, `fn_ledger_drives_position`, `can_withdraw`, `get_available_balance`, `adjust_investor_position`, `approve_and_complete_withdrawal` (initial 38,18 version)

### 6. RPC Gateway
- `src/lib/rpc/index.ts`

## Implementation

One file write creating `deepthink_context.md` in the project root. Each section uses a level-2 heading with the file path, followed by a triple-backtick code fence containing the full file contents. No UI components, CSS, or tests included.

**Estimated size**: ~120KB of pure financial/architectural source code.

