"""
Transaction-Yield Allocation System

Domain: Fund accounting with investor deposits, yield recording, and allocation
Core flow: Transaction → AUM Record → Yield Calculation → Allocation → Fund State
"""

from typing import Optional, Dict, List, Set
from decimal import Decimal
from datetime import datetime
from pydantic import BaseModel, Field


class FeeTemplate(BaseModel):
    """Fee structure template set by first transaction with fees."""

    ib_percent: Decimal = Field(..., description="Intro Broker percentage (e.g., 0.04 for 4%)")
    fees_percent: Decimal = Field(..., description="INDIGO management fee percentage (e.g., 0.16)")
    investor_percent: Decimal = Field(..., description="Investor share percentage (e.g., 0.80)")

    class Config:
        json_encoders = {Decimal: lambda v: str(v)}


class Transaction(BaseModel):
    """Single investor deposit transaction."""

    id: str
    investor_name: str = Field(..., description="Investor name")
    amount: Decimal = Field(..., description="Amount deposited in native token")
    date: datetime = Field(..., description="Deposit date")
    ib_name: Optional[str] = Field(None, description="Intro Broker name (optional)")
    ib_percent: Optional[Decimal] = Field(None, description="Intro Broker allocation % (e.g., 0.04)")
    fees_percent: Optional[Decimal] = Field(None, description="INDIGO fees percentage (e.g., 0.16)")

    class Config:
        json_encoders = {Decimal: lambda v: str(v), datetime: lambda v: v.isoformat()}


class YieldRecord(BaseModel):
    """Month-end AUM snapshot and yield record."""

    date: datetime = Field(..., description="Reporting date (typically month-end)")
    aum_total: Decimal = Field(..., description="Total fund AUM at this date")
    transactions_until_date: List[Transaction] = Field(
        ..., description="All transactions included in this AUM"
    )
    fee_template: FeeTemplate = Field(..., description="Fee template to apply")

    class Config:
        json_encoders = {Decimal: lambda v: str(v), datetime: lambda v: v.isoformat()}


class YieldAllocation(BaseModel):
    """Single yield allocation to one entity."""

    entity_name: str = Field(..., description="Entity name (investor, IB, or INDIGO Fees)")
    allocation_type: str = Field(..., description="Type: 'investor' | 'ib' | 'indigo_fees'")
    allocation_amount: Decimal = Field(..., description="Amount allocated to this entity")
    allocation_percent: Decimal = Field(..., description="Percentage of yield")

    class Config:
        json_encoders = {Decimal: lambda v: str(v)}


class YieldCalculation(BaseModel):
    """Calculated yield result."""

    date: datetime = Field(..., description="Reporting date")
    aum_total: Decimal = Field(..., description="Total AUM")
    prior_baseline: Decimal = Field(..., description="Sum of all transaction inputs")
    yield_amount: Decimal = Field(..., description="Calculated yield: AUM - baseline")
    allocations: List[YieldAllocation] = Field(..., description="Allocations per entity")

    class Config:
        json_encoders = {Decimal: lambda v: str(v), datetime: lambda v: v.isoformat()}


class FundStateBreakdown(BaseModel):
    """Fund state breakdown by entity type."""

    investor_balances: Dict[str, Decimal] = Field(default_factory=dict)
    ib_balances: Dict[str, Decimal] = Field(default_factory=dict)
    indigo_fees_balance: Decimal = Field(default=Decimal(0))

    class Config:
        json_encoders = {Decimal: lambda v: str(v)}


class FundState(BaseModel):
    """Fund balance state at a point in time."""

    date: datetime = Field(..., description="Reporting date")
    aum_total: Decimal = Field(..., description="Total AUM (must reconcile)")
    balances: Dict[str, Decimal] = Field(
        default_factory=dict, description="Cumulative balance per entity"
    )
    breakdown: FundStateBreakdown = Field(..., description="Breakdown by type")

    class Config:
        json_encoders = {Decimal: lambda v: str(v), datetime: lambda v: v.isoformat()}


class FundRecord(BaseModel):
    """Complete fund lifecycle record."""

    fund_id: str = Field(..., description="Fund identifier")
    asset: str = Field(..., description="Asset symbol (e.g., XRP, SOL)")
    fund_name: str = Field(..., description="Fund name")
    transactions: List[Transaction] = Field(default_factory=list)
    yield_records: List[YieldRecord] = Field(default_factory=list)
    current_state: FundState
    fee_template: FeeTemplate

    class Config:
        json_encoders = {Decimal: lambda v: str(v), datetime: lambda v: v.isoformat()}


class Reconciliation(BaseModel):
    """Reconciliation details."""

    balances_sum: Decimal
    reported_aum: Decimal
    difference: Decimal

    class Config:
        json_encoders = {Decimal: lambda v: str(v)}


class ValidationResult(BaseModel):
    """Validation result for fund operations."""

    is_valid: bool
    errors: List[str] = Field(default_factory=list)
    warnings: List[str] = Field(default_factory=list)
    reconciliation: Optional[Reconciliation] = None


def calculate_yield(record: YieldRecord) -> YieldCalculation:
    """Calculate yield and allocations for a month-end record."""
    # Calculate baseline
    baseline = sum((tx.amount for tx in record.transactions_until_date), Decimal(0))
    yield_amount = record.aum_total - baseline

    allocations: List[YieldAllocation] = []

    # IB allocations
    if record.fee_template.ib_percent > 0:
        ib_names: Set[str] = {
            tx.ib_name for tx in record.transactions_until_date if tx.ib_name
        }
        for ib_name in ib_names:
            allocations.append(
                YieldAllocation(
                    entity_name=ib_name,
                    allocation_type="ib",
                    allocation_amount=yield_amount * record.fee_template.ib_percent,
                    allocation_percent=record.fee_template.ib_percent,
                )
            )

    # INDIGO fees allocation
    if record.fee_template.fees_percent > 0:
        allocations.append(
            YieldAllocation(
                entity_name="INDIGO Fees",
                allocation_type="indigo_fees",
                allocation_amount=yield_amount * record.fee_template.fees_percent,
                allocation_percent=record.fee_template.fees_percent,
            )
        )

    # Investor allocations
    investor_names: Set[str] = {tx.investor_name for tx in record.transactions_until_date}
    for investor_name in investor_names:
        allocations.append(
            YieldAllocation(
                entity_name=investor_name,
                allocation_type="investor",
                allocation_amount=yield_amount * record.fee_template.investor_percent,
                allocation_percent=record.fee_template.investor_percent,
            )
        )

    return YieldCalculation(
        date=record.date,
        aum_total=record.aum_total,
        prior_baseline=baseline,
        yield_amount=yield_amount,
        allocations=allocations,
    )


def apply_yield_allocation(state: FundState, calculation: YieldCalculation) -> FundState:
    """Update fund state with new yield allocation."""
    new_balances = dict(state.balances)
    new_investor_balances = dict(state.breakdown.investor_balances)
    new_ib_balances = dict(state.breakdown.ib_balances)
    new_indigo_balance = state.breakdown.indigo_fees_balance

    for alloc in calculation.allocations:
        prior = new_balances.get(alloc.entity_name, Decimal(0))
        new_balances[alloc.entity_name] = prior + alloc.allocation_amount

        if alloc.allocation_type == "investor":
            prior = new_investor_balances.get(alloc.entity_name, Decimal(0))
            new_investor_balances[alloc.entity_name] = prior + alloc.allocation_amount
        elif alloc.allocation_type == "ib":
            prior = new_ib_balances.get(alloc.entity_name, Decimal(0))
            new_ib_balances[alloc.entity_name] = prior + alloc.allocation_amount
        elif alloc.allocation_type == "indigo_fees":
            new_indigo_balance = new_indigo_balance + alloc.allocation_amount

    return FundState(
        date=calculation.date,
        aum_total=calculation.aum_total,
        balances=new_balances,
        breakdown=FundStateBreakdown(
            investor_balances=new_investor_balances,
            ib_balances=new_ib_balances,
            indigo_fees_balance=new_indigo_balance,
        ),
    )


def validate_fund_state(state: FundState) -> ValidationResult:
    """Validate fund state for consistency."""
    errors: List[str] = []
    warnings: List[str] = []

    # Check balance reconciliation
    balances_sum = sum(state.balances.values(), Decimal(0))
    difference = state.aum_total - balances_sum

    if abs(difference) >= Decimal("0.0001"):  # Allow for rounding
        errors.append(
            f"Fund state reconciliation failed: "
            f"AUM {state.aum_total} != Balances sum {balances_sum} "
            f"(diff: {difference})"
        )

    # Check breakdown consistency
    breakdown_sum = (
        sum(state.breakdown.investor_balances.values(), Decimal(0))
        + sum(state.breakdown.ib_balances.values(), Decimal(0))
        + state.breakdown.indigo_fees_balance
    )

    breakdown_diff = state.aum_total - breakdown_sum
    if abs(breakdown_diff) >= Decimal("0.0001"):
        errors.append(
            f"Breakdown reconciliation failed: {breakdown_sum} vs {state.aum_total}"
        )

    return ValidationResult(
        is_valid=len(errors) == 0,
        errors=errors,
        warnings=warnings,
        reconciliation=Reconciliation(
            balances_sum=balances_sum,
            reported_aum=state.aum_total,
            difference=difference,
        ),
    )
