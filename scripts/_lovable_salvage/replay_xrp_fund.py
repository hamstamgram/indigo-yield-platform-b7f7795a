#!/usr/bin/env python3
"""
XRP Fund Replay Script
Replays the fund lifecycle to validate yield calculations against expected results.
"""

from decimal import Decimal
from datetime import datetime
from typing import List, Dict, Tuple
import re

class Transaction:
    def __init__(self, date: str, investor: str, amount: Decimal,
                 ib_name: str = None, ib_pct: Decimal = None,
                 fees_pct: Decimal = None):
        self.date = datetime.strptime(date, "%d/%m/%Y")
        self.investor = investor
        self.amount = amount
        self.ib_name = ib_name
        self.ib_pct = ib_pct or Decimal('0')
        self.fees_pct = fees_pct or Decimal('0')

    def __repr__(self):
        return f"Transaction({self.date.strftime('%d/%m/%Y')}, {self.investor}, {self.amount})"

class YieldRecord:
    def __init__(self, date: str, aum_total: Decimal):
        self.date = datetime.strptime(date, "%d/%m/%Y")
        self.aum_total = aum_total

    def __repr__(self):
        return f"YieldRecord({self.date.strftime('%d/%m/%Y')}, AUM={self.aum_total})"

def parse_xrp_fund_data() -> Tuple[List[Transaction], List[YieldRecord]]:
    """
    Parse the XRP fund data from the cleaned markdown file.
    Focused on the specific example provided in the query.
    """

    # Transactions from your specific example
    transactions = [
        # Format: (date, investor, amount, ib_name, ib_pct, fees_pct)
        Transaction("17/11/2025", "Sam Johnson", Decimal('135003'),
                   "Ryan Van Der Wall", Decimal('0.04'), Decimal('0.16')),
        Transaction("25/11/2025", "Sam Johnson", Decimal('49000'),
                   "Ryan Van Der Wall", Decimal('0.04'), Decimal('0.16')),
        # Note: Based on your example, there's a third transaction mentioned
        # in the comments but not used in the first yield calculation
        # Transaction("30/11/2025", "Sam Johnson", Decimal('45000')),
        #            "Ryan Van Der Wall", Decimal('0.04'), Decimal('0.16')),
    ]

    # Yield records (AUM snapshots) from your specific example
    # These represent the reported AUM at specific dates
    # Important: The yield is calculated BETWEEN transactions
    yield_records = [
        YieldRecord("17/11/2025", Decimal('135003')),  # After 1st deposit, no yield yet (same day)
        YieldRecord("30/11/2025", Decimal('184358')),  # Reporting date: after 2nd deposit + yield earned
        # Note: The 08/12/2025 date is from the second yield record in your example
        # YieldRecord("08/12/2025", Decimal('229731')),
    ]

    return transactions, yield_records

def calculate_yield_allocation(yield_amount: Decimal,
                             ib_pct: Decimal,
                             fees_pct: Decimal) -> Dict[str, Decimal]:
    """
    Calculate yield allocation based on fee template.
    Returns allocations to investor, IB, and fees.
    """
    investor_pct = Decimal('1') - ib_pct - fees_pct

    return {
        'investor': yield_amount * investor_pct,
        'ib': yield_amount * ib_pct,
        'fees': yield_amount * fees_pct
    }

def replay_fund_lifecycle(transactions: List[Transaction],
                         yield_records: List[YieldRecord]) -> None:
    """
    Replay the fund lifecycle and validate calculations.
    Properly handles timing: yield is earned between transaction dates.
    """
    print("=== XRP Fund Lifecycle Replay ===\n")

    # Sort transactions and records by date
    transactions.sort(key=lambda t: t.date)
    yield_records.sort(key=lambda y: y.date)

    # Track cumulative state
    cumulative_deposits = Decimal('0')
    cumulative_investor_balance = Decimal('0')
    cumulative_ib_balance = Decimal('0')
    cumulative_fees_balance = Decimal('0')

    print(f"{'Date':<12} {'Event':<25} {'AUM':<12} {'Yield':<10} {'Inv Yield':<12} {'IB Yield':<10} {'Fees Yield':<12} {'Running Total'}")
    print("-" * 120)

    # Process each yield record period
    for i, record in enumerate(yield_records):
        # Calculate baseline (sum of all transactions WITH STRICTLY EARLIER dates)
        # Yield is earned on funds that have been invested for the full period
        baseline = Decimal('0')
        for tx in transactions:
            if tx.date < record.date:  # Strictly earlier - same day deposits don't earn yield
                baseline += tx.amount

        # Calculate yield for this period
        yield_amount = record.aum_total - baseline

        # Get fee template from the most recent transaction BEFORE this date
        fee_template = None
        for tx in reversed(transactions):
            if tx.date < record.date and tx.ib_pct > 0:  # Strictly earlier
                fee_template = tx
                break

        # If no earlier transaction with fees, use the earliest transaction
        if fee_template is None:
            for tx in transactions:
                if tx.date < record.date:
                    fee_template = tx
                    break

        # Fallback to first transaction if still none found
        if fee_template is None and transactions:
            fee_template = transactions[0]

        # Calculate yield allocations (if we have a fee template)
        allocations = {'investor': Decimal('0'), 'ib': Decimal('0'), 'fees': Decimal('0')}
        if fee_template is not None:
            allocations = calculate_yield_allocation(
                yield_amount,
                fee_template.ib_pct,
                fee_template.fees_pct
            )

        # Update cumulative balances from transactions WITH STRICTLY EARLIER OR SAME DATE
        period_investor_deposits = Decimal('0')
        period_ib_deposits = Decimal('0')
        period_fees_deposits = Decimal('0')

        for tx in transactions:
            if tx.date <= record.date:  # Same day or earlier - funds are invested
                # Only count new deposits since last period
                if i == 0 or tx.date > yield_records[i-1].date:
                    period_investor_deposits += tx.amount * (Decimal('1') - tx.ib_pct - tx.fees_pct)
                    period_ib_deposits += tx.amount * tx.ib_pct
                    period_fees_deposits += tx.amount * tx.fees_pct

        # Update cumulative balances
        cumulative_investor_balance += period_investor_deposits + allocations['investor']
        cumulative_ib_balance += period_ib_deposits + allocations['ib']
        cumulative_fees_balance += period_fees_deposits + allocations['fees']
        cumulative_deposits = sum(tx.amount for tx in transactions if tx.date <= record.date)

        # Format output
        date_str = record.date.strftime("%d/%m/%Y")
        event_desc = ""
        if i == 0:
            event_desc = "Initial Deposit"
        elif i == 1:
            event_desc = "2nd Deposit + Yield"
        elif i == 2:
            event_desc = "3rd Deposit + Yield"
        else:
            event_desc = f"Period {i+1}"

        aum_str = f"{record.aum_total:,.0f}"
        yield_str = f"{yield_amount:,.0f}" if yield_amount != 0 else "-"
        inv_yield_str = f"{allocations['investor']:,.2f}" if allocations['investor'] != 0 else "-"
        ib_yield_str = f"{allocations['ib']:,.2f}" if allocations['ib'] != 0 else "-"
        fees_yield_str = f"{allocations['fees']:,.2f}" if allocations['fees'] != 0 else "-"
        total_str = f"{cumulative_investor_balance + cumulative_ib_balance + cumulative_fees_balance:,.0f}"

        print(f"{date_str:<12} {event_desc:<25} {aum_str:<12} {yield_str:<10} {inv_yield_str:<12} {ib_yield_str:<10} {fees_yield_str:<12} {total_str}")

    print("-" * 120)
    print("\n=== Final Fund State ===")
    print(f"Total Deposits (Baseline): {cumulative_deposits:,.0f} XRP")
    print(f"Sam Johnson (Investor): {cumulative_investor_balance:,.2f} XRP")
    print(f"Ryan Van Der Wall (IB): {cumulative_ib_balance:,.2f} XRP")
    print(f"INDIGO Fees: {cumulative_fees_balance:,.2f} XRP")
    print(f"Fund Total: {cumulative_investor_balance + cumulative_ib_balance + cumulative_fees_balance:,.0f} XRP")
    print(f"Expected AUM: {yield_records[-1].aum_total:,.0f} XRP")

    # Validation
    expected_aum = yield_records[-1].aum_total
    actual_total = cumulative_investor_balance + cumulative_ib_balance + cumulative_fees_balance

    if abs(expected_aum - actual_total) < Decimal('0.01'):
        print("\n✅ SUCCESS: Fund state reconciles correctly!")
    else:
        print(f"\n❌ ERROR: Reconciliation failed!")
        print(f"   Expected: {expected_aum:,.0f}")
        print(f"   Actual:   {actual_total:,.0f}")
        print(f"   Difference: {expected_aum - actual_total:,.2f}")

def validate_against_example() -> None:
    """
    Validate calculations against the specific example provided.
    """
    print("\n\n=== Validation Against Provided Example ===\n")

    # Example data from your description
    # First transaction: Sam Johnson: +135,003 XRP le 17/11/2025 (IB 4%, Fees 16%)
    # Second transaction: Sam Johnson: +49,000 XRP le 25/11/2025
    # Reporting: 184,358 XRP le 30/11/2025
    # Expected: Sam Johnson +284 XRP, Ryan Van Der Wall +14.20 XRP, INDIGO Fees +56.80 XRP

    first_deposit = Decimal('135003')
    second_deposit = Decimal('49000')
    reported_aum = Decimal('184358')

    ib_pct = Decimal('0.04')
    fees_pct = Decimal('0.16')
    investor_pct = Decimal('0.80')

    # Calculate baseline and yield
    baseline = first_deposit + second_deposit
    yield_amount = reported_aum - baseline

    print(f"Baseline (Total Invested): {baseline:,.0f} XRP")
    print(f"Reported AUM: {reported_aum:,.0f} XRP")
    print(f"Yield Amount: {yield_amount:,.0f} XRP")

    # Calculate allocations
    allocations = calculate_yield_allocation(yield_amount, ib_pct, fees_pct)

    print(f"\nYield Allocations:")
    print(f"  Sam Johnson (Investor): {allocations['investor']:,.2f} XRP")
    print(f"  Ryan Van Der Wall (IB): {allocations['ib']:,.2f} XRP")
    print(f"  INDIGO Fees: {allocations['fees']:,.2f} XRP")

    # Expected values from your example
    expected_sam = Decimal('284')
    expected_ryan = Decimal('14.20')
    expected_fees = Decimal('56.80')

    print(f"\nExpected Values (from your example):")
    print(f"  Sam Johnson (Investor): {expected_sam:,.2f} XRP")
    print(f"  Ryan Van Der Wall (IB): {expected_ryan:,.2f} XRP")
    print(f"  INDIGO Fees: {expected_fees:,.2f} XRP")

    # Check if calculations match expectations
    sam_match = abs(allocations['investor'] - expected_sam) < Decimal('0.01')
    ryan_match = abs(allocations['ib'] - expected_ryan) < Decimal('0.01')
    fees_match = abs(allocations['fees'] - expected_fees) < Decimal('0.01')

    if sam_match and ryan_match and fees_match:
        print("\n✅ SUCCESS: Yield allocations match the provided example!")
    else:
        print("\n❌ ERROR: Yield allocations do NOT match the example!")
        if not sam_match:
            print(f"   Sam Johnson mismatch: got {allocations['investor']:.2f}, expected {expected_sam:.2f}")
        if not ryan_match:
            print(f"   Ryan Van Der Wall mismatch: got {allocations['ib']:.2f}, expected {expected_ryan:.2f}")
        if not fees_match:
            print(f"   INDIGO Fees mismatch: got {allocations['fees']:.2f}, expected {expected_fees:.2f}")

if __name__ == "__main__":
    # Parse the fund data
    transactions, yield_records = parse_xrp_fund_data()

    print(f"Parsed {len(transactions)} transactions and {len(yield_records)} yield records")

    # Replay the lifecycle
    replay_fund_lifecycle(transactions, yield_records)

    # Validate against the specific example
    validate_against_example()