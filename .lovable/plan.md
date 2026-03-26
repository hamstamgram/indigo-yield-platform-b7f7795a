

# Fix: "Fund Not Found" Error on Void Transaction

## Root Cause

The `check_fund_is_active()` trigger fires on **both** `transactions_v2` and `investor_positions` tables (BEFORE INSERT OR UPDATE). When voiding a transaction, this chain occurs:

```text
void_transaction RPC
  -> UPDATE transactions_v2 SET is_voided=true
     -> check_fund_is_active (TG_OP=UPDATE, fund_id unchanged) -> SKIP [OK]
     -> trg_recompute_on_void -> reconcile_investor_position_internal()
        -> INSERT INTO investor_positions ON CONFLICT DO UPDATE
           -> check_fund_is_active (TG_OP=INSERT) -> VALIDATES FUND STATUS [BUG]
           -> trg_validate_position_fund_status (BEFORE INSERT) -> ALSO VALIDATES [BUG]
```

In PostgreSQL, `INSERT ... ON CONFLICT DO UPDATE` fires BEFORE INSERT triggers even when the row already exists (conflict path). The `check_fund_is_active` and `validate_position_fund_status` triggers on `investor_positions` fire as `TG_OP = 'INSERT'`, bypassing the UPDATE skip logic, and validate fund status. If a fund has been deactivated or archived after the transaction was created, the void fails with "Fund not found" or "Cannot use inactive fund".

The `reconcile_investor_position_internal` already sets `indigo.canonical_rpc = true`, and triggers like `enforce_canonical_position_mutation` and `enforce_canonical_position_write` respect this flag. But `check_fund_is_active` and `validate_position_fund_status` do NOT check the canonical RPC flag, creating an inconsistency.

## Fix (Single Migration)

Update `check_fund_is_active()` to skip when running inside a canonical RPC context (already validated upstream):

```sql
CREATE OR REPLACE FUNCTION public.check_fund_is_active()
RETURNS trigger AS $$
DECLARE
  v_fund_status text;
BEGIN
  -- Skip when inside a canonical RPC (void, recompute, yield distribution)
  -- These RPCs already validate their inputs
  IF COALESCE(current_setting('indigo.canonical_rpc', true), 'false') = 'true' THEN
    RETURN NEW;
  END IF;

  -- Skip any UPDATE where fund_id hasn't changed
  IF TG_OP = 'UPDATE' AND NEW.fund_id = OLD.fund_id THEN
    RETURN NEW;
  END IF;

  -- For transactions_v2 only, skip void operations
  IF TG_OP = 'UPDATE' AND TG_TABLE_NAME = 'transactions_v2' THEN
    IF NEW.is_voided = true AND (OLD.is_voided IS NULL OR OLD.is_voided = false) THEN
      RETURN NEW;
    END IF;
  END IF;

  -- Validate fund exists and is active
  SELECT status INTO v_fund_status
  FROM public.funds WHERE id = NEW.fund_id::uuid;
  
  IF v_fund_status IS NULL THEN
    RAISE EXCEPTION 'Fund not found: %', NEW.fund_id;
  ELSIF v_fund_status != 'active' THEN
    RAISE EXCEPTION 'Cannot use inactive fund (status: %): %', v_fund_status, NEW.fund_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public';
```

Update `validate_position_fund_status()` similarly:

```sql
CREATE OR REPLACE FUNCTION public.validate_position_fund_status()
RETURNS trigger AS $$
BEGIN
  -- Skip when inside a canonical RPC
  IF COALESCE(current_setting('indigo.canonical_rpc', true), 'false') = 'true' THEN
    RETURN NEW;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.funds WHERE id = NEW.fund_id AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'Cannot create position on non-active fund. Fund ID: %, Status must be active.', NEW.fund_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public';
```

## Why This Is Safe

- The `indigo.canonical_rpc` flag is only set inside server-side SECURITY DEFINER functions (`void_transaction`, `reconcile_investor_position_internal`, yield RPCs)
- It cannot be set by client-side code (the session variable is transaction-scoped via `set_config(..., true)`)
- All canonical RPCs already validate fund existence before operating
- This aligns with how `enforce_canonical_position_mutation` and `enforce_canonical_position_write` already work

## Files Changed

| File | Change |
|------|--------|
| New migration SQL | Update `check_fund_is_active()` and `validate_position_fund_status()` to skip when `indigo.canonical_rpc = true` |

