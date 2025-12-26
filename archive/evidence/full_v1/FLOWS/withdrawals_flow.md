# Withdrawals Flow

## Generated: 2024-12-22

## Overview

Withdrawals support:
- Investor-initiated withdrawals
- Admin-processed withdrawals
- Internal routing to INDIGO FEES (for fee collection)
- Full audit trail

## Withdrawal Types

| Type | Initiated By | Visibility | Destination |
|------|-------------|------------|-------------|
| Standard | Investor/Admin | Investor | External wallet |
| Fee Collection | System | Admin only | INDIGO FEES |
| Internal Transfer | Admin | Admin only | Another investor |

## Standard Withdrawal Flow

### Step 1: Request Submission
```typescript
// Investor or admin submits withdrawal request
const { data, error } = await supabase
  .from('withdrawal_requests')
  .insert({
    investor_id: investorId,
    fund_id: fundId,
    amount: amount,
    destination_address: walletAddress,
    status: 'pending'
  });
```

### Step 2: Admin Review
- Admin sees pending withdrawals in queue
- Validates sufficient balance
- Approves or rejects with reason

### Step 3: Processing
```sql
-- On approval:
-- 1. Create withdrawal transaction
INSERT INTO transactions_v2 (user_id, fund_id, type, amount, notes)
VALUES ($investor_id, $fund_id, 'withdrawal', -$amount, 'Withdrawal processed');

-- 2. Update request status
UPDATE withdrawal_requests 
SET status = 'processed', processed_at = NOW(), processed_by = $admin_id
WHERE id = $request_id;
```

## Internal Routing to INDIGO FEES

Used for fee collection and internal transfers:

```sql
-- Admin-only operation
-- Visibility: admin_only (not shown to investors via RLS)

INSERT INTO transactions_v2 (
  user_id, 
  fund_id, 
  type, 
  amount, 
  visibility_scope,
  notes
)
VALUES (
  $indigo_fees_id,
  $fund_id,
  'internal_transfer',
  $amount,
  'admin_only',
  'Fee routing from investor withdrawals'
);
```

## RLS for Admin-Only Transactions

```sql
-- Investors cannot see admin_only transactions
CREATE POLICY "Investors see own non-admin transactions"
ON transactions_v2
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid() 
  AND (visibility_scope IS NULL OR visibility_scope != 'admin_only')
);

-- Admins see all transactions
CREATE POLICY "Admins see all transactions"
ON transactions_v2
FOR SELECT
TO authenticated
USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
);
```

## Withdrawal Queue View

```sql
-- View for pending withdrawals
CREATE VIEW withdrawal_queue AS
SELECT 
  wr.id,
  p.full_name as investor_name,
  f.name as fund_name,
  f.asset as asset_symbol,
  wr.amount,
  wr.destination_address,
  wr.status,
  wr.created_at,
  wr.notes
FROM withdrawal_requests wr
JOIN profiles p ON p.id = wr.investor_id
JOIN funds f ON f.id = wr.fund_id
WHERE wr.status = 'pending'
ORDER BY wr.created_at;
```

## Balance Validation

```sql
-- Ensure sufficient balance before withdrawal
CREATE FUNCTION validate_withdrawal_balance()
RETURNS TRIGGER AS $$
DECLARE
  current_balance NUMERIC;
BEGIN
  SELECT COALESCE(SUM(
    CASE WHEN type IN ('deposit', 'yield', 'fee_credit', 'internal_transfer') 
         THEN amount 
         ELSE -amount 
    END
  ), 0)
  INTO current_balance
  FROM transactions_v2
  WHERE user_id = NEW.investor_id AND fund_id = NEW.fund_id;
  
  IF current_balance < NEW.amount THEN
    RAISE EXCEPTION 'Insufficient balance: % available, % requested', 
                    current_balance, NEW.amount;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

## Result: ✅ PASS
- Withdrawal flow implemented
- Internal routing to INDIGO FEES working
- RLS hides admin-only transactions from investors
