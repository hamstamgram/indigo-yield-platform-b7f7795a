# Database Entity Relationship Diagram

> Last updated: 2026-01-10

## Core Ledger Entities

```mermaid
erDiagram
    profiles ||--o{ investor_positions : "has positions"
    profiles ||--o{ withdrawal_requests : "requests"
    profiles ||--o{ transactions_v2 : "owns transactions"
    profiles ||--o{ user_roles : "has roles"
    
    funds ||--o{ investor_positions : "contains"
    funds ||--o{ withdrawal_requests : "from"
    funds ||--o{ transactions_v2 : "in"
    funds ||--o{ yield_distributions : "distributes"
    funds ||--o{ fund_daily_aum : "tracks AUM"
    
    yield_distributions ||--o{ transactions_v2 : "creates"
    yield_distributions ||--o{ fee_allocations : "allocates fees"
    yield_distributions ||--o{ ib_allocations : "allocates IB"
    
    profiles {
        uuid id PK
        text first_name
        text last_name
        text email
        text account_type "investor|admin|fees_account"
        boolean is_ib
        uuid ib_parent_id FK
        decimal ib_fee_percentage
        timestamp created_at
    }
    
    funds {
        uuid id PK
        text name
        text code
        text asset "BTC|ETH|SOL|USDC|USDT"
        text fund_class
        text status "active|inactive|closed"
        date inception_date
        decimal mgmt_fee_bps
        decimal perf_fee_bps
    }
    
    transactions_v2 {
        uuid id PK
        uuid investor_id FK
        uuid fund_id FK
        text type "DEPOSIT|WITHDRAWAL|YIELD|FEE"
        decimal amount
        date tx_date
        date value_date
        text asset
        text reference_id UK "Idempotency key"
        text source "manual_admin|yield_distribution"
        boolean is_voided
        timestamp voided_at
        uuid voided_by FK
    }
    
    investor_positions {
        uuid investor_id PK_FK
        uuid fund_id PK_FK
        decimal current_value
        decimal shares
        decimal cost_basis
        decimal high_water_mark
        timestamp updated_at
    }
    
    withdrawal_requests {
        uuid id PK
        uuid investor_id FK
        uuid fund_id FK
        decimal requested_amount
        text status "pending|approved|processing|completed|rejected|cancelled"
        text withdrawal_type "partial|full"
        timestamp request_date
        text notes
    }
    
    yield_distributions {
        uuid id PK
        uuid fund_id FK
        date effective_date
        decimal recorded_aum
        boolean is_month_end
        text distribution_type "daily|monthly"
        text status "applied|voided"
        timestamp created_at
    }
    
    fund_daily_aum {
        uuid id PK
        uuid fund_id FK
        date aum_date
        decimal total_aum
        decimal nav_per_share
        decimal total_shares
        text source
        boolean is_voided
    }
```

## Fee & IB Allocation Entities

```mermaid
erDiagram
    yield_distributions ||--o{ fee_allocations : "creates"
    yield_distributions ||--o{ ib_allocations : "creates"
    profiles ||--o{ fee_allocations : "receives fees"
    profiles ||--o{ ib_allocations : "IB parent"
    profiles ||--o{ ib_allocations : "source investor"
    
    fee_allocations {
        uuid id PK
        uuid distribution_id FK
        uuid fund_id FK
        uuid investor_id FK
        uuid fees_account_id FK "INDIGO Fees account"
        decimal base_net_income
        decimal fee_percentage
        decimal fee_amount
        date period_start
        date period_end
        text purpose "live|backtest"
        boolean is_voided
    }
    
    ib_allocations {
        uuid id PK
        uuid distribution_id FK
        uuid fund_id FK
        uuid source_investor_id FK
        uuid ib_investor_id FK "IB parent"
        decimal source_net_income
        decimal ib_percentage
        decimal ib_fee_amount
        date period_start
        date period_end
        text payout_status "pending|paid"
        boolean is_voided
    }
```

## Audit & Security Entities

```mermaid
erDiagram
    profiles ||--o{ audit_log : "performs actions"
    profiles ||--o{ access_logs : "logs access"
    profiles ||--o{ data_edit_audit : "edits data"
    profiles ||--o{ user_roles : "has roles"
    
    audit_log {
        uuid id PK
        uuid actor_user FK
        text entity "profiles|transactions|withdrawals"
        uuid entity_id
        text action "create|update|delete|void"
        jsonb old_values
        jsonb new_values
        jsonb meta
        timestamp created_at
    }
    
    access_logs {
        uuid id PK
        uuid user_id FK
        text event "login|logout|password_reset"
        inet ip
        text user_agent
        text device_label
        boolean success
        timestamp created_at
    }
    
    user_roles {
        uuid id PK
        uuid user_id FK
        text role "admin|super_admin|investor|ib"
        timestamp created_at
    }
    
    data_edit_audit {
        uuid id PK
        text table_name
        uuid record_id
        text operation "INSERT|UPDATE|DELETE"
        jsonb old_data
        jsonb new_data
        text[] changed_fields
        uuid edited_by FK
        timestamp edited_at
    }
```

## Key Relationships

### Primary Keys (Composite)

| Table | Primary Key |
|-------|-------------|
| `investor_positions` | `(investor_id, fund_id)` |
| `daily_nav` | `(fund_id, nav_date, purpose)` |

### Unique Constraints

| Table | Constraint | Purpose |
|-------|------------|---------|
| `transactions_v2` | `reference_id` | Idempotency |
| `profiles` | `email` | Unique identity |
| `funds` | `code` | Fund identifier |

### Foreign Key Cascades

| Parent | Child | On Delete |
|--------|-------|-----------|
| `profiles` | `investor_positions` | CASCADE |
| `profiles` | `transactions_v2` | RESTRICT |
| `funds` | `investor_positions` | RESTRICT |

---

## Void-Recompute Chain

When voiding a transaction, the system maintains integrity:

```mermaid
sequenceDiagram
    participant A as Admin
    participant VT as void_transaction()
    participant T as transactions_v2
    participant RIP as recompute_investor_position()
    participant IP as investor_positions
    participant AL as audit_log
    
    A->>VT: void(transaction_id, reason)
    VT->>T: UPDATE SET is_voided=true, voided_at=now()
    VT->>AL: INSERT audit record
    VT->>RIP: Trigger position recompute
    RIP->>T: SELECT SUM(amount) WHERE NOT is_voided
    RIP->>IP: UPDATE current_value, shares
    RIP-->>A: Position recalculated
```

### Data Flow

1. **Void Transaction**: Sets `is_voided = true`, `voided_at = now()`, `voided_by = auth.uid()`
2. **Audit Log**: Creates immutable record of the void action
3. **Recompute Position**: Recalculates position from ALL non-voided transactions
4. **Result**: Position reflects true ledger state

---

## Integrity Monitoring Views

### `investor_position_ledger_mismatch`

Detects when `investor_positions.current_value` diverges from the sum of non-voided transactions:

```sql
SELECT 
  ip.investor_id,
  ip.fund_id,
  ip.current_value AS position_value,
  COALESCE(SUM(t.amount), 0) AS ledger_value,
  ip.current_value - COALESCE(SUM(t.amount), 0) AS mismatch
FROM investor_positions ip
LEFT JOIN transactions_v2 t ON t.investor_id = ip.investor_id 
  AND t.fund_id = ip.fund_id 
  AND NOT t.is_voided
GROUP BY ip.investor_id, ip.fund_id, ip.current_value
HAVING ABS(ip.current_value - COALESCE(SUM(t.amount), 0)) > 0.01;
```

### `fund_aum_mismatch`

Detects when fund AUM doesn't match sum of investor positions:

```sql
SELECT
  f.id AS fund_id,
  f.name,
  fda.total_aum AS recorded_aum,
  COALESCE(SUM(ip.current_value), 0) AS position_sum,
  fda.total_aum - COALESCE(SUM(ip.current_value), 0) AS mismatch
FROM funds f
JOIN fund_daily_aum fda ON fda.fund_id = f.id
LEFT JOIN investor_positions ip ON ip.fund_id = f.id
WHERE fda.aum_date = CURRENT_DATE AND NOT fda.is_voided
GROUP BY f.id, f.name, fda.total_aum
HAVING ABS(fda.total_aum - COALESCE(SUM(ip.current_value), 0)) > 0.01;
```

---

## Asset Codes (Enum)

```sql
CREATE TYPE asset_code AS ENUM (
  'BTC', 'ETH', 'SOL', 'USDC', 'USDT', 'EURC', 'XAUT', 'XRP'
);
```

## Transaction Types (Enum)

```sql
CREATE TYPE transaction_type AS ENUM (
  'DEPOSIT', 'WITHDRAWAL', 'YIELD', 'FEE', 'TRANSFER', 'ADJUSTMENT'
);
```

## Withdrawal Status (Enum)

```sql
CREATE TYPE withdrawal_status AS ENUM (
  'pending', 'approved', 'processing', 'completed', 'rejected', 'cancelled'
);
```
