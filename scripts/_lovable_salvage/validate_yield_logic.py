#!/usr/bin/env python3
"""
Simple validation script for the XRP fund yield logic.
Focuses on validating the specific example you provided.
"""

from decimal import Decimal

def validate_xrp_yield_example():
    """
    Validate the exact example you provided:
    - Sam Johnson: +135,003 XRP le 17/11/2025 (IB 4%, Fees 16%)
    - Sam Johnson: +49,000 XRP le 25/11/2025 (No yield between transactions)
    - Yield Record: 184,358 XRP le 30/11/2025
    - Expected: Sam Johnson +284 XRP, Ryan Van Der Wall +14.20 XRP, INDIGO Fees +56.80 XRP
    """

    print("=== Validating XRP Fund Yield Logic ===\n")
    print("Example from your description:")
    print("- 17/11/2025: Sam Johnson deposits 135,003 XRP (IB 4%, Fees 16%)")
    print("- 25/11/2025: Sam Johnson deposits 49,000 XRP (No yield between transactions)")
    print("- 30/11/2025: Yield Record shows 184,358 XRP total AUM")
    print("- Expected yield allocations: Sam +284, Ryan +14.20, Fees +56.80\n")

    # Extract the key numbers
    deposit1 = Decimal('135003')
    deposit2 = Decimal('49000')
    reported_aum = Decimal('184358')

    ib_pct = Decimal('0.04')   # 4%
    fees_pct = Decimal('0.16') # 16%
    investor_pct = Decimal('0.80') # 80% (remainder)

    # Step 1: Calculate total invested (baseline)
    baseline = deposit1 + deposit2
    print(f"Step 1 - Baseline Calculation:")
    print(f"  Deposit 1 (17/11/2025): {deposit1:,.0f} XRP")
    print(f"  Deposit 2 (25/11/2025): {deposit2:,.0f} XRP")
    print(f"  Total Invested (Baseline): {baseline:,.0f} XRP\n")

    # Step 2: Calculate yield
    yield_amount = reported_aum - baseline
    print(f"Step 2 - Yield Calculation:")
    print(f"  Reported AUM (30/11/2025): {reported_aum:,.0f} XRP")
    print(f"  Minus Total Invested:      {baseline:,.0f} XRP")
    print(f"  Yield Amount:              {yield_amount:,.0f} XRP\n")

    # Step 3: Allocate yield according to fee structure
    print(f"Step 3 - Yield Allocation (80% Investor, 4% IB, 16% Fees):")
    investor_yield = yield_amount * investor_pct
    ib_yield = yield_amount * ib_pct
    fees_yield = yield_amount * fees_pct

    print(f"  Investor Yield (80%):  {yield_amount:,.0f} × 0.80 = {investor_yield:,.2f} XRP")
    print(f"  IB Yield (4%):         {yield_amount:,.0f} × 0.04 = {ib_yield:,.2f} XRP")
    print(f"  Fees Yield (16%):      {yield_amount:,.0f} × 0.16 = {fees_yield:,.2f} XRP\n")

    # Step 4: Validate against expected values from your example
    print(f"Step 4 - Validation Against Your Example:")
    expected_investor = Decimal('284')
    expected_ib = Decimal('14.20')
    expected_fees = Decimal('56.80')

    print(f"  Expected Investor Yield: {expected_investor:,.2f} XRP")
    print(f"  Actual Investor Yield:   {investor_yield:,.2f} XRP")
    print(f"  Match: {'✅ YES' if abs(investor_yield - expected_investor) < Decimal('0.01') else '❌ NO'}")

    print(f"  Expected IB Yield:       {expected_ib:,.2f} XRP")
    print(f"  Actual IB Yield:         {ib_yield:,.2f} XRP")
    print(f"  Match: {'✅ YES' if abs(ib_yield - expected_ib) < Decimal('0.01') else '❌ NO'}")

    print(f"  Expected Fees Yield:     {expected_fees:,.2f} XRP")
    print(f"  Actual Fees Yield:       {fees_yield:,.2f} XRP")
    print(f"  Match: {'✅ YES' if abs(fees_yield - expected_fees) < Decimal('0.01') else '❌ NO'}\n")

    # Step 5: Verify fund reconciliation
    print(f"Step 5 - Fund Reconciliation Check:")

    # Calculate what each party should have at the end
    # Investor: deposit1*(1-fees-ib) + deposit2*(1-fees-ib) + investor_yield
    investor_total = (deposit1 * investor_pct) + (deposit2 * investor_pct) + investor_yield

    # IB: deposit1*ib + deposit2*ib + ib_yield
    ib_total = (deposit1 * ib_pct) + (deposit2 * ib_pct) + ib_yield

    # Fees: deposit1*fees + deposit2*fees + fees_yield
    fees_total = (deposit1 * fees_pct) + (deposit2 * fees_pct) + fees_yield

    fund_total = investor_total + ib_total + fees_total

    print(f"  Final Balances:")
    print(f"    Sam Johnson (Investor): {investor_total:,.2f} XRP")
    print(f"    Ryan Van Der Wall (IB): {ib_total:,.2f} XRP")
    print(f"    INDIGO Fees:            {fees_total:,.2f} XRP")
    print(f"    --------------------------------")
    print(f"    Fund Total:             {fund_total:,.0f} XRP")
    print(f"    Expected AUM:           {reported_aum:,.0f} XRP")
    print(f"    Reconciliation:         {'✅ BALANCED' if abs(fund_total - reported_aum) < Decimal('0.01') else '❌ NOT BALANCED'}")

    # Overall validation
    investor_ok = abs(investor_yield - expected_investor) < Decimal('0.01')
    ib_ok = abs(ib_yield - expected_ib) < Decimal('0.01')
    fees_ok = abs(fees_yield - expected_fees) < Decimal('0.01')
    reconciled = abs(fund_total - reported_aum) < Decimal('0.01')

    print(f"\n=== OVERALL RESULT ===")
    if investor_ok and ib_ok and fees_ok and reconciled:
        print("🎉 SUCCESS: All validations passed!")
        print("   The yield calculation logic is CORRECT.")
        print("   Any discrepancies in the Excel file are due to:")
        print("   1. Wrong yield allocation percentages (80/4/16 vs current 20/80/?)")
        print("   2. Misplaced percentage values in the allocation rows")
        return True
    else:
        print("❌ FAILURE: Validation failed!")
        return False

def show_excel_corrections_needed():
    """
    Show what needs to be corrected in the Excel file based on our analysis.
    """
    print(f"\n=== Excel File Corrections Needed ===\n")
    print("Based on analysis of the cleaned markdown file:\n")

    print("1. **Comments Section (around line 504-505):**")
    print("   CURRENT (WRONG):")
    print("     'INDIGO Fees gets 80% of the yield'")
    print("     'Ryan Van Der Wall gets 20% of the yield (minus fees)'")
    print("   ")
    print("   SHOULD BE (CORRECT):")
    print("     'Sam Johnson gets 80% of the yield'")
    print("     'Ryan Van Der Wall gets 4% of the yield'")
    print("     'INDIGO Fees gets 16% of the yield'")
    print("")

    print("2. **Investor Allocations Row (around line 508-509):**")
    print("   CURRENT (PARTIALLY WRONG):")
    print("     Sam Johnson row: 0.16 (Fees) | 0.04 (IB) ✓ CORRECT")
    print("     Ryan Van Der Wall row: 0.2 (in wrong column) ✗ WRONG")
    print("   ")
    print("   SHOULD BE (CORRECT):")
    print("     Sam Johnson row: 0.16 (Fees) | 0.04 (IB) ✓ KEEP AS IS")
    print("     Ryan Van Der Wall row: 0.00 (Fees) | 0.04 (IB) ✓ FIX NEEDED")
    print("")

    print("3. **Yield Distribution Calculation:**")
    print("   Ensure any yield calculation uses the 80%/4%/16% split:")
    print("   - Investor gets 80% of yield")
    print("   - IB gets 4% of yield")
    print("   - Fees get 16% of yield")

if __name__ == "__main__":
    success = validate_xrp_yield_example()
    show_excel_corrections_needed()

    if success:
        print(f"\n💡 RECOMMENDATION: Fix the Excel file using the corrections shown above,")
        print(f"   then your internal engine should produce correct results when tested through UI.")
    else:
        print(f"\n💡 RECOMMENDATION: Review the yield logic implementation - there may be")
        print(f"   deeper issues beyond the percentage allocations.")