# Investor Creation Flow

## Generated: 2024-12-22

## Flow Overview

The investor creation process follows a multi-step wizard pattern ensuring data consistency and proper role assignment.

## Steps

### Step 1: Basic Information
- **Fields**: Full Name, Email, Phone (optional)
- **Validation**: Email must be unique, Name required
- **Component**: `InvestorCreateWizard.tsx`

### Step 2: IB Assignment (Optional)
- **Options**: 
  - No IB (direct investor)
  - Select existing IB from dropdown
  - Create new IB inline
- **If IB selected**: IB percentage is captured (default 10%)
- **Dual Role Assignment**: If creating as IB, both `ib` and `investor` roles are assigned

### Step 3: Initial Fund Positions
- **For each active fund**:
  - Enter initial balance (token amount, NOT USD)
  - Enter fee percentage override (optional, default from fund)
- **Zero handling**: Assets not provided are treated as 0 balance
- **Transaction Creation**: Initial balance creates a DEPOSIT transaction in ledger

### Step 4: Review & Confirm
- **Preview**: Shows all entered data
- **Confirmation**: Typed confirmation for creation
- **Audit**: Creation logged in `audit_log` table

## Database Operations

```sql
-- 1. Create profile
INSERT INTO profiles (id, full_name, email, phone, fee_percentage)
VALUES (gen_random_uuid(), $name, $email, $phone, $fee_pct);

-- 2. Assign roles
INSERT INTO user_roles (user_id, role)
VALUES ($user_id, 'investor');

-- If IB:
INSERT INTO user_roles (user_id, role)
VALUES ($user_id, 'ib');

-- 3. Create initial positions via transactions
INSERT INTO transactions_v2 (user_id, fund_id, type, amount, effective_date)
VALUES ($user_id, $fund_id, 'deposit', $amount, $date);
```

## Constraints Enforced

| Constraint | Enforcement |
|------------|-------------|
| Unique email | `profiles.email` UNIQUE index |
| Valid fund | FK to `funds.id` |
| Positive amounts | CHECK constraint on transactions |
| Role validity | `app_role` enum type |

## Error Handling

- **Duplicate email**: Shows validation error, prevents submission
- **Invalid fund**: Dropdown only shows active funds
- **Network failure**: Retry button with error message

## Result: ✅ PASS
All creation flows tested and working correctly.
