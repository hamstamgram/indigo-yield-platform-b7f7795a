#!/usr/bin/env python3
"""
Test script to verify XRP fund calculations based on the provided example.
"""

from decimal import Decimal
from datetime import datetime

def test_xrp_fund_calculations():
    """Test the XRP fund calculations as described in the example."""

    print("=== XRP Fund Calculation Test ===\n")

    # First Transaction: Sam Johnson: +135,003 XRP le 17/11/2025
    # (IB de Ryan Van Der Wall 4% et Fees 16%)
    first_deposit = Decimal('135003')
    ib_percent = Decimal('0.04')  # 4%
    fees_percent = Decimal('0.16')  # 16%
    investor_percent = Decimal('0.80')  # 80% (100% - 4% - 16%)

    print(f"First Transaction (17/11/2025):")
    print(f"  Sam Johnson deposit: {first_deposit} XRP")
    print(f"  IB %: {ib_percent * 100}%")
    print(f"  Fees %: {fees_percent * 100}%")
    print(f"  Investor %: {investor_percent * 100}%")

    # Calculate allocations from first transaction
    first_ib_alloc = first_deposit * ib_percent
    first_fees_alloc = first_deposit * fees_percent
    first_investor_alloc = first_deposit * investor_percent

    print(f"\n  First Transaction Allocations:")
    print(f"  Ryan Van Der Wall (IB): {first_ib_alloc} XRP")
    print(f"  INDIGO Fees: {first_fees_alloc} XRP")
    print(f"  Sam Johnson (Investor): {first_investor_alloc} XRP")

    # Second Transaction: Sam Johnson: +49,000 XRP le 25/11/2025
    # (Après le reporting donc pas besoin de record un yield)
    second_deposit = Decimal('49000')
    print(f"\nSecond Transaction (25/11/2025):")
    print(f"  Sam Johnson deposit: {second_deposit} XRP")
    print(f"  (No yield generated between transactions)")

    # Calculate allocations from second transaction (same fee structure)
    second_ib_alloc = second_deposit * ib_percent
    second_fees_alloc = second_deposit * fees_percent
    second_investor_alloc = second_deposit * investor_percent

    print(f"\n  Second Transaction Allocations:")
    print(f"  Ryan Van Der Wall (IB): {second_ib_alloc} XRP")
    print(f"  INDIGO Fees: {second_fees_alloc} XRP")
    print(f"  Sam Johnson (Investor): {second_investor_alloc} XRP")

    # Baseline (sum of all transaction inputs)
    baseline = first_deposit + second_deposit
    print(f"\nBaseline (Total Invested): {baseline} XRP")

    # Reporting date: 184,358 XRP le 30/11/2025
    reported_aum = Decimal('184358')
    print(f"Reported AUM (30/11/2025): {reported_aum} XRP")

    # Yield calculation
    yield_amount = reported_aum - baseline
    print(f"Yield Amount (AUM - Baseline): {yield_amount} XRP")

    # Expected results from your example:
    # Sam Johnson : +284 XRP
    # Ryan Van Der Wall : +14.20 XRP
    # INDIGO Fees : +56.80 XRP

    print(f"\n=== Expected Results (from your example) ===")
    expected_sam_yield = Decimal('284')
    expected_ryan_yield = Decimal('14.20')
    expected_fees_yield = Decimal('56.80')

    print(f"Sam Johnson yield: {expected_sam_yield} XRP")
    print(f"Ryan Van Der Wall yield: {expected_ryan_yield} XRP ({expected_ryan_yield / expected_sam_yield * 100:.2f}% of Sam's yield)")
    print(f"INDIGO Fees yield: {expected_fees_yield} XRP ({expected_fees_yield / expected_sam_yield * 100:.2f}% of Sam's yield)")

    # Calculate what the yield base should be for these percentages
    # If Sam gets 80%, Ryan gets 4%, Fees gets 16% of the yield
    # Then Sam's portion = yield * 0.80
    # So yield = Sam's portion / 0.80
    implied_yield_base = expected_sam_yield / investor_percent
    print(f"\nImplied yield base for expected results: {implied_yield_base} XRP")
    print(f"  Ryan's share (4%): {implied_yield_base * ib_percent} XRP")
    print(f"  Fees share (16%): {implied_yield_base * fees_percent} XRP")
    print(f"  Sam's share (80%): {implied_yield_base * investor_percent} XRP")

    # Actual vs Expected comparison
    print(f"\n=== Comparison ===")
    print(f"Actual yield calculated: {yield_amount} XRP")
    print(f"Expected yield implied: {implied_yield_base} XRP")
    print(f"Difference: {yield_amount - implied_yield_base} XRP")

    # Let's also check what the actual allocations would be with the real yield
    actual_ib_yield = yield_amount * ib_percent
    actual_fees_yield = yield_amount * fees_percent
    actual_investor_yield = yield_amount * investor_percent

    print(f"\nActual yield allocations:")
    print(f"  Sam Johnson (Investor): {actual_investor_yield} XRP")
    print(f"  Ryan Van Der Wall (IB): {actual_ib_yield} XRP")
    print(f"  INDIGO Fees: {actual_fees_yield} XRP")

    print(f"\nExpected yield allocations:")
    print(f"  Sam Johnson (Investor): {expected_sam_yield} XRP")
    print(f"  Ryan Van Der Wall (IB): {expected_ryan_yield} XRP")
    print(f"  INDIGO Fees: {expected_fees_yield} XRP")

    # Fund state at 30/11/2025
    print(f"\n=== Fund State at 30/11/2025 ===")
    print(f"AUM Total: {reported_aum} XRP")

    # Investor balances
    sam_total = first_investor_alloc + second_investor_alloc + actual_investor_yield
    print(f"Sam Johnson Total: {sam_total} XRP")
    print(f"  (Deposits: {first_investor_alloc + second_investor_alloc} + Yield: {actual_investor_yield})")

    # IB balances
    ryan_total = first_ib_alloc + second_ib_alloc + actual_ib_yield
    print(f"Ryan Van Der Wall Total: {ryan_total} XRP")
    print(f"  (IB from transactions: {first_ib_alloc + second_ib_alloc} + IB yield: {actual_ib_yield})")

    # Fees balances
    fees_total = first_fees_alloc + second_fees_alloc + actual_fees_yield
    print(f"INDIGO Fees Total: {fees_total} XRP")
    print(f"  (Fees from transactions: {first_fees_alloc + second_fees_alloc} + Fees yield: {actual_fees_yield})")

    # Verify reconciliation
    calculated_total = sam_total + ryan_total + fees_total
    print(f"\nReconciliation Check:")
    print(f"Sum of all balances: {calculated_total} XRP")
    print(f"Reported AUM: {reported_aum} XRP")
    print(f"Difference: {calculated_total - reported_aum} XRP")

    if abs(calculated_total - reported_aum) < Decimal('0.01'):
        print("✓ Fund state reconciles correctly")
    else:
        print("✗ Fund state does NOT reconcile - there's an error in calculations")

    return {
        'baseline': baseline,
        'reported_aum': reported_aum,
        'yield_amount': yield_amount,
        'expected_yield_base': implied_yield_base,
        'sam_total': sam_total,
        'ryan_total': ryan_total,
        'fees_total': fees_total,
        'calculated_total': calculated_total
    }

if __name__ == "__main__":
    test_xrp_fund_calculations()