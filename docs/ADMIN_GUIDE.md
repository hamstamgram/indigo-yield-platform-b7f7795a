# INDIGO Platform - Institutional Administrator Guide

> **Version:** 1.0  
> **Last Updated:** 2026-01-10  
> **Classification:** Internal Operations Manual

This guide provides comprehensive training for administrators operating the INDIGO platform's institutional-grade financial infrastructure.

---

## Table of Contents

1. [Precision-First Philosophy](#1-precision-first-philosophy)
2. [Yield Engine Operations (T-1 Protocol)](#2-yield-engine-operations-t-1-protocol)
3. [Withdrawal Management](#3-withdrawal-management)
4. [Audit Vault Usage](#4-audit-vault-usage)
5. [Security Protocols](#5-security-protocols)
6. [Warning Handling (Butterfly Effect)](#6-warning-handling-butterfly-effect)

---

## 1. Precision-First Philosophy

### The 10-Decimal Ledger

All financial values in the platform are stored with **10 decimal precision** using PostgreSQL's `NUMERIC(28,10)` type. This prevents floating-point errors that could accumulate over thousands of transactions.

**Why 10 decimals?**
- Cryptocurrency assets like BTC can have values as small as 1 satoshi (0.00000001)
- Yield calculations involve division that can create infinite decimals
- 10 decimal precision ensures we never lose value during calculations

### The FinancialValue Component

The UI uses a special `FinancialValue` React component that:

1. Uses **Decimal.js** for all calculations (not JavaScript floats)
2. Displays appropriate decimal places based on asset type
3. Shows a **micro-balance tooltip** when values are too small to display

**Micro-Balance Indicator:**  
When you see `~0` with a tooltip icon, it means:
- The value exists (is greater than zero)
- But it's too small to display at 8 decimal places
- Hover to see the full 10-decimal precision

### Conservation of Value (Dust Handler)

The platform **guarantees** that no value is ever lost to rounding. Every yield distribution satisfies:

```
Investor Interest + Platform Fees + IB Commission + Dust = Gross Yield
```

Any residual "dust" (sub-cent remainders from division) is automatically credited to the Platform Fees account, ensuring the equation always balances perfectly.

---

## 2. Yield Engine Operations (T-1 Protocol)

### Step-by-Step Yield Distribution

#### Step 1: Record AUM Snapshot (T-0)

1. Navigate to **Admin → Yield Operations**
2. Select the target fund
3. Enter the fund's current **Total AUM**
4. Select purpose:
   - **Reporting**: For month-end statements (read-only snapshots)
   - **Transaction**: For yield distribution calculations

#### Step 2: Wait for Temporal Lock (T+1)

⚠️ **CRITICAL CONSTRAINT**

You **cannot** apply yield on the same day as the AUM snapshot. The system enforces:

```
yield_date > snapshot_date
```

**Why wait?**
- Deposits or withdrawals could occur during the day
- Applying yield immediately could compound errors
- Waiting until T+1 ensures a stable end-of-day position

#### Step 3: Preview & Apply Distribution

1. Open the yield preview panel
2. Review calculated allocations:
   - Per-investor interest amounts
   - Platform fee total
   - IB commission totals
3. Verify the **conservation checksum** shows "Balanced"
4. Click **Apply Distribution**

#### Step 4: Confirm with Admin Signature

Your user ID is recorded as the `created_by` actor in the audit log.

### The Yield Waterfall

```
Gross Yield (New AUM - Previous AUM)
├── Platform Fee (% of Gross Yield)
├── IB Commission (% of Gross Yield)
├── Residual Dust → fees_account
└── Investor Interest (remainder after all fees)
```

**Important:** Platform fees and IB commissions are calculated as percentages of the **gross** yield first, then the remainder goes to investors.

---

## 3. Withdrawal Management

### Total Position vs Available Balance

| Metric | Definition |
|--------|------------|
| **Total Position** | Investor's full balance including all deposits, yields, and adjustments |
| **Available Balance** | Total Position minus pending/approved (not completed) withdrawals |

```
Available Balance = Total Position - Pending Withdrawals - Approved Withdrawals
```

### Double-Spend Prevention

When a withdrawal is requested, that amount is immediately "locked" and excluded from the Available Balance.

**System enforces:**
```
requested_amount ≤ available_balance
```

This check happens at:
1. **Request creation** - Investor cannot request more than available
2. **Approval** - Re-verified in case other withdrawals were approved

### Withdrawal States

| Status | Locked? | Description |
|--------|---------|-------------|
| `pending` | ✅ Yes | Awaiting admin review |
| `approved` | ✅ Yes | Approved, awaiting completion |
| `completed` | ❌ No | Funds transferred, position reduced |
| `rejected` | ❌ No | Request denied, lock released |

---

## 4. Audit Vault Usage

### Using the Audit Log Viewer

Navigate to **Admin → Audit Logs** to access the complete history of system changes.

**Filter Options:**
- **Entity**: transactions_v2, investor_positions, withdrawal_requests, etc.
- **Action**: INSERT, UPDATE, VOID, etc.
- **Actor**: The admin user who performed the action
- **Date Range**: When the action occurred

### Reading Delta Updates

The platform uses **delta logging**—only changed fields are recorded, not entire rows.

**Example Delta Entry:**

```json
{
  "status": { "old": "pending", "new": "approved" },
  "approved_at": { "old": null, "new": "2026-01-10T12:00:00Z" },
  "approved_by": { "old": null, "new": "admin-uuid-here" }
}
```

This shows that only `status`, `approved_at`, and `approved_by` changed—not the amount, investor_id, or other fields.

**Benefits:**
- ~80-90% reduction in storage
- Easier to see exactly what changed
- Faster audit investigations

### Common Query Patterns

**Find all voids by a specific admin:**
```sql
SELECT * FROM audit_log 
WHERE action = 'VOID' 
AND actor_user = 'admin-uuid'
ORDER BY created_at DESC;
```

**Find all changes to a specific transaction:**
```sql
SELECT * FROM audit_log 
WHERE entity = 'transactions_v2' 
AND entity_id = 'transaction-uuid'
ORDER BY created_at ASC;
```

---

## 5. Security Protocols

### MFA Reset Flow (Two-Key Protocol)

⚠️ **CRITICAL SECURITY CONSTRAINT**

No single admin can reset a user's MFA. The process requires **two parties**.

#### Step 1: User Initiates Request
- User contacts support
- Verifies identity through secondary channels:
  - Video call with ID verification
  - Security questions
  - Email + phone verification

#### Step 2: Admin Creates Reset Request
- Regular admin creates an MFA reset request in system
- Documents the verification method used
- Request is logged but **not executed**

#### Step 3: Super-Admin Approves
- A **Super Admin** reviews the request
- Verifies the verification was appropriate
- Provides "digital signature" (approval) to execute

**Why Two Keys?**
- Prevents social engineering attacks
- Attacker would need to compromise two admins
- Creates clear audit trail of responsibility

### Financial Error Boundary (Safe Mode)

If the system detects a critical financial error, it activates **Safe Mode**.

**When You See the Safe Mode Banner:**

1. **STOP** all financial operations immediately
2. **REVIEW** the console logs and audit trail
3. **ALERT** the Technical Lead immediately

**Safe Mode Triggers:**
- Yield distribution that doesn't balance
- Position going negative unexpectedly
- Duplicate transaction detection
- Conservation of value violation

Safe Mode prevents any further transactions until the error is resolved.

---

## 6. Warning Handling (Butterfly Effect)

### Yield Dependency Warning

When voiding a transaction, the system checks if any yield distributions occurred **after** that transaction's date.

**Warning Example:**
```
⚠️ Yield Dependency Warning
3 yield distributions occurred after this transaction. 
Voiding may require recalculating subsequent yields.

Affected Distributions: YD-001, YD-002, YD-003
```

**The Butterfly Effect:**  
If you void a deposit from January 5th, all yields calculated on January 6th onwards may have been based on an incorrect investor balance.

### Best Practices for Historical Corrections

#### 1. Review Affected Yields
The void dialog shows which yield distribution IDs are affected. Note these for potential recalculation.

#### 2. Assess Materiality
Calculate the impact relative to total AUM:

| Transaction Size | AUM | Impact |
|-----------------|-----|--------|
| $100 | $10,000,000 | 0.001% (negligible) |
| $50,000 | $1,000,000 | 5% (significant) |

Small impacts may not warrant full recalculation.

#### 3. Document Your Decision
The void reason field should explain:
- Why the transaction is being voided
- Whether recalculation was performed
- If not, why it was deemed unnecessary

**Example void reasons:**
```
Duplicate deposit entry. Recalculation not needed - 
deposited same day as correcting, no yields affected.

Incorrect amount entered. 3 yields affected but 
impact is 0.002% of AUM - no recalculation per 
materiality threshold.
```

---

## Quick Reference

### Key Admin Routes

| Route | Purpose |
|-------|---------|
| `/admin/yields` | Yield distribution operations |
| `/admin/withdrawals` | Withdrawal request management |
| `/admin/transactions` | Transaction history and void operations |
| `/admin/audit-logs` | Complete audit trail viewer |
| `/admin/investors` | Investor management |
| `/admin/settings` | Platform configuration |

### Emergency Contacts

For critical issues involving:
- **Safe Mode activation**: Alert Technical Lead immediately
- **Security breach suspicion**: Alert Security Officer
- **Data inconsistency**: Alert Operations Manager

---

## Certification

Administrators must complete all 6 training modules in the interactive guide (`/admin/onboarding`) before being granted full operational access.

| Module | Topic |
|--------|-------|
| 1 | Precision-First Philosophy |
| 2 | Yield Engine Operations |
| 3 | Withdrawal Management |
| 4 | Audit Vault Usage |
| 5 | Security Protocols |
| 6 | Warning Handling |

---

*This document is maintained by the Platform Operations team. For corrections or additions, contact the Technical Lead.*
