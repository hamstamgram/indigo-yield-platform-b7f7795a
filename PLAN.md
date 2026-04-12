# Expert Plan Request: Full Fund Lifecycle Validation

## Goal

Analyze the Accounting Yield Funds (6).xlsx Excel file to map all fund lifecycles (BTC, USDT, ETH, SOL, XRP) and validate the financial engine produces exact decimal parity with the source-of-truth Excel calculations.

## Requirements

1. Parse Excel file to extract all transactions for each fund
2. Replay each fund's complete lifecycle through the financial engine
3. Validate engine outputs match Excel calculations to exact decimal precision
4. Verify fee conservation, IB distributions, and yield calculations
5. Test edge cases: withdrawals, same-day transactions, crystallization events

## Deliverables

- Comprehensive test suite validating all 5 funds
- Decimal-precision verification report
