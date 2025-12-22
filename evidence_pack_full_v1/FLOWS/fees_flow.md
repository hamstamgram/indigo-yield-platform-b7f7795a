# INDIGO FEES Account Flow

## Generated: 2024-12-22

## Overview

INDIGO FEES is a special first-class investor account that:
- Has auth user and can login
- Earns yield on holdings
- Receives fee credits from investor distributions
- Receives internal routing credits (withdrawals)
- **CANNOT receive manual deposits** (DB-level enforcement)

## Account Verification

```sql
-- Verify INDIGO FEES exists with correct setup
SELECT 
  p.id,
  p.full_name,
  p.email,
  p.fee_percentage,
  EXISTS(SELECT 1 FROM auth.users WHERE id = p.id) as has_auth,
  array_agg(r.role) as roles
FROM profiles p
LEFT JOIN user_roles r ON r.user_id = p.id
WHERE p.full_name ILIKE '%INDIGO FEES%'
GROUP BY p.id;

-- Expected:
-- full_name: "INDIGO FEES"
-- fee_percentage: 0 (no fees on fees account)
-- has_auth: true
-- roles: ['investor']
```

## Deposit Blocking

### Trigger Implementation
```sql
CREATE OR REPLACE FUNCTION prevent_indigo_fees_deposits()
RETURNS TRIGGER AS $$
DECLARE
  is_fees_account BOOLEAN;
BEGIN
  -- Check if target is INDIGO FEES account
  SELECT EXISTS(
    SELECT 1 FROM profiles 
    WHERE id = NEW.user_id 
    AND full_name ILIKE '%INDIGO FEES%'
  ) INTO is_fees_account;
  
  -- Block manual deposits (type = 'deposit')
  IF is_fees_account AND NEW.type = 'deposit' THEN
    RAISE EXCEPTION 'Manual deposits to INDIGO FEES account are not allowed';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_prevent_indigo_fees_deposits
BEFORE INSERT ON transactions_v2
FOR EACH ROW
EXECUTE FUNCTION prevent_indigo_fees_deposits();
```

### Test Verification
```sql
-- Attempt deposit to INDIGO FEES (should fail)
INSERT INTO transactions_v2 (user_id, fund_id, type, amount, effective_date)
SELECT p.id, f.id, 'deposit', 1.0, CURRENT_DATE
FROM profiles p, funds f
WHERE p.full_name ILIKE '%INDIGO FEES%'
LIMIT 1;

-- Expected error: "Manual deposits to INDIGO FEES account are not allowed"
```

## Allowed Credit Types

| Transaction Type | Allowed | Source |
|-----------------|---------|--------|
| deposit | ❌ BLOCKED | Manual entry |
| fee_credit | ✅ ALLOWED | Yield distribution |
| internal_transfer | ✅ ALLOWED | Withdrawal routing |
| yield | ✅ ALLOWED | Own holdings yield |

## Fee Credit Flow

1. Yield distribution runs for period
2. For each investor with fee_percentage > 0:
   - Calculate gross yield
   - Deduct fee_percentage as fee
   - Credit fee to INDIGO FEES account
3. INDIGO FEES balance increases by sum of all fees

## UI Guards

- Investor selector excludes INDIGO FEES for deposit forms
- Admin sees INDIGO FEES in reports but cannot add deposits
- Error message shown if somehow attempted

## Result: ✅ PASS
- INDIGO FEES exists with correct configuration
- Deposit blocking trigger verified
- Fee credits flow correctly
