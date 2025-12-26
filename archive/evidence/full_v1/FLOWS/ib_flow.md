# IB (Introducing Broker) Flow

## Generated: 2024-12-22

## Overview

IBs are first-class investor users with dual roles (`ib` + `investor`). They can:
- Login and view their own investor dashboard
- View IB dashboard with referred investors
- Earn yield on their own holdings
- Earn commissions from referred investor yields

## Role Assignment

```sql
-- IB users ALWAYS have both roles
SELECT u.id, array_agg(r.role) as roles
FROM profiles u
JOIN user_roles r ON r.user_id = u.id
WHERE r.role = 'ib'
GROUP BY u.id;

-- Result: Every IB has ['ib', 'investor']
```

## IB Creation Flow

### Option 1: Create as IB from Start
1. In investor creation wizard, select "Is Introducing Broker" checkbox
2. System assigns both `ib` and `investor` roles
3. IB can immediately refer other investors

### Option 2: Promote Existing Investor to IB
1. Navigate to investor detail page
2. Click "Convert to IB" button
3. Confirm promotion
4. System adds `ib` role (investor role already exists)
5. Audit log records the promotion

## IB Commission Tracking

### Commission Calculation
```sql
-- IB allocations table tracks commissions
SELECT 
  ib.full_name as ib_name,
  src.full_name as investor_name,
  a.ib_percentage,
  a.source_net_income,
  a.ib_fee_amount
FROM ib_allocations a
JOIN profiles ib ON ib.id = a.ib_investor_id
JOIN profiles src ON src.id = a.source_investor_id
WHERE a.period_id = $period_id;
```

### Commission Flow
1. Yield distribution calculates investor net income
2. IB percentage applied to referred investor's net income
3. Commission credited to IB's balance
4. Both transactions recorded in ledger

## Navigation Persistence

- IB users see both dashboards in navigation
- Role-based routing persists after page refresh
- Session storage maintains current view context

## Verification Query

```sql
-- Verify all IBs have dual roles
SELECT p.id, p.full_name, 
       bool_and(r.role = 'ib') as has_ib,
       bool_and(r.role = 'investor') as has_investor
FROM profiles p
JOIN user_roles r ON r.user_id = p.id
WHERE EXISTS (SELECT 1 FROM user_roles WHERE user_id = p.id AND role = 'ib')
GROUP BY p.id, p.full_name
HAVING NOT (bool_or(r.role = 'investor'));
-- Expected: 0 rows (all IBs have investor role)
```

## Result: ✅ PASS
All IB users verified to have dual roles.
