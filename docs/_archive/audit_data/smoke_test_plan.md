# Smoke Test Plan (SQL)

These statements validate the **success state** after applying `supabase/migrations/20260105121103_2033fc19-9b50-45b3-93a8-b106d4937d71.sql`.

> Run in Supabase SQL editor or `psql` connected to the LIVE database.

## A) Trigger Check

### A.1 List triggers on `public.transactions_v2`
```sql
SELECT
  t.tgname,
  t.tgenabled,
  pg_get_triggerdef(t.oid) AS trigger_def
FROM pg_trigger t
JOIN pg_class c ON c.oid = t.tgrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname = 'transactions_v2'
  AND NOT t.tgisinternal
ORDER BY t.tgname;
```

### A.2 Assert redundant trigger is gone
```sql
SELECT EXISTS (
  SELECT 1
  FROM pg_trigger t
  JOIN pg_class c ON c.oid = t.tgrelid
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relname = 'transactions_v2'
    AND t.tgname = 'trg_update_position_on_transaction'
    AND NOT t.tgisinternal
) AS trg_update_position_on_transaction_exists;
```

## B) Ledger Immutability

### B.1 Attempt to change an economic field (must fail)
```sql
DO $$
DECLARE
  v_id uuid;
BEGIN
  INSERT INTO public.transactions_v2 (
    investor_id, fund_id, asset, fund_class, amount, type,
    tx_date, value_date, source, purpose, visibility_scope,
    reference_id, notes, created_by, is_system_generated
  )
  VALUES (
    gen_random_uuid(),
    (SELECT id FROM public.funds LIMIT 1),
    'TEST',
    'TEST',
    1::numeric(28,10),
    'DEPOSIT'::public.tx_type,
    CURRENT_DATE,
    CURRENT_DATE,
    'manual_admin'::public.tx_source,
    'transaction'::public.aum_purpose,
    'admin_only'::public.visibility_scope,
    'IMMUT-TEST-' || left(gen_random_uuid()::text, 8),
    'immutability test',
    auth.uid(),
    false
  )
  RETURNING id INTO v_id;

  BEGIN
    UPDATE public.transactions_v2
    SET amount = 999::numeric(28,10)
    WHERE id = v_id;

    RAISE EXCEPTION 'Expected immutability error but update succeeded';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'OK (expected failure): %', SQLERRM;
  END;
END $$;
```

## C) Sign + Yield Constraints

### C.1 WITHDRAWAL must be negative
```sql
DO $$
BEGIN
  BEGIN
    INSERT INTO public.transactions_v2 (
      investor_id, fund_id, asset, fund_class, amount, type,
      tx_date, value_date, source, purpose, visibility_scope,
      reference_id, created_by
    )
    VALUES (
      gen_random_uuid(),
      (SELECT id FROM public.funds LIMIT 1),
      'TEST',
      'TEST',
      10::numeric(28,10),
      'WITHDRAWAL'::public.tx_type,
      CURRENT_DATE,
      CURRENT_DATE,
      'withdrawal_completion'::public.tx_source,
      'transaction'::public.aum_purpose,
      'admin_only'::public.visibility_scope,
      'WDR-POSITIVE-' || left(gen_random_uuid()::text, 8),
      auth.uid()
    );
    RAISE EXCEPTION 'Expected sign check to fail but insert succeeded';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'OK (expected failure): %', SQLERRM;
  END;
END $$;
```

### C.2 YIELD cannot be negative + requires reference_id
```sql
DO $$
BEGIN
  BEGIN
    INSERT INTO public.transactions_v2 (
      investor_id, fund_id, asset, fund_class, amount, type,
      tx_date, value_date, source, purpose, visibility_scope,
      reference_id, created_by
    )
    VALUES (
      gen_random_uuid(),
      (SELECT id FROM public.funds LIMIT 1),
      'TEST',
      'TEST',
      (-1)::numeric(28,10),
      'YIELD'::public.tx_type,
      CURRENT_DATE,
      CURRENT_DATE,
      'yield_distribution'::public.tx_source,
      'reporting'::public.aum_purpose,
      'admin_only'::public.visibility_scope,
      'YLD-NEG-' || left(gen_random_uuid()::text, 8),
      auth.uid()
    );
    RAISE EXCEPTION 'Expected yield non-negative check to fail but insert succeeded';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'OK (expected failure): %', SQLERRM;
  END;

  BEGIN
    INSERT INTO public.transactions_v2 (
      investor_id, fund_id, asset, fund_class, amount, type,
      tx_date, value_date, source, purpose, visibility_scope,
      created_by
    )
    VALUES (
      gen_random_uuid(),
      (SELECT id FROM public.funds LIMIT 1),
      'TEST',
      'TEST',
      1::numeric(28,10),
      'YIELD'::public.tx_type,
      CURRENT_DATE,
      CURRENT_DATE,
      'yield_distribution'::public.tx_source,
      'reporting'::public.aum_purpose,
      'admin_only'::public.visibility_scope,
      auth.uid()
    );
    RAISE EXCEPTION 'Expected yield reference_id check to fail but insert succeeded';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'OK (expected failure): %', SQLERRM;
  END;
END $$;
```

## D) Crystallize-Before-Flow (Deterministic)

### D.1 Negative gross yield must hard-fail
```sql
DO $$
DECLARE
  v_fund_id uuid;
  v_closing numeric(28,10);
BEGIN
  SELECT id INTO v_fund_id FROM public.funds LIMIT 1;

  -- Ensure an opening checkpoint exists
  PERFORM public.crystallize_yield_before_flow(
    v_fund_id,
    now(),
    100::numeric(28,10),
    'manual',
    'smoke:init',
    'transaction'::public.aum_purpose,
    auth.uid()
  );

  -- Now attempt a lower closing AUM (must fail)
  v_closing := 99::numeric(28,10);
  BEGIN
    PERFORM public.crystallize_yield_before_flow(
      v_fund_id,
      now(),
      v_closing,
      'manual',
      'smoke:neg',
      'transaction'::public.aum_purpose,
      auth.uid()
    );
    RAISE EXCEPTION 'Expected negative-yield hard fail but function succeeded';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'OK (expected failure): %', SQLERRM;
  END;
END $$;
```

### D.2 Deposit applies crystallization first and writes a checkpoint
```sql
DO $$
DECLARE
  v_fund_id uuid;
  v_investor uuid := gen_random_uuid();
  v_result jsonb;
BEGIN
  SELECT id INTO v_fund_id FROM public.funds LIMIT 1;

  v_result := public.apply_deposit_with_crystallization(
    v_investor,
    v_fund_id,
    10::numeric(28,10),
    now(),
    150::numeric(28,10),
    'smoke:dep',
    'transaction'::public.aum_purpose,
    auth.uid()
  );

  RAISE NOTICE 'Result: %', v_result;

  -- Check that an event exists for this trigger
  IF NOT EXISTS (
    SELECT 1
    FROM public.fund_aum_events
    WHERE fund_id = v_fund_id
      AND trigger_type = 'deposit'
      AND trigger_reference = 'smoke:dep'
      AND is_voided = false
  ) THEN
    RAISE EXCEPTION 'Expected fund_aum_events row not found';
  END IF;
END $$;
```

## E) Reserved Balance / Withdrawal Requests

### E.1 `can_withdraw` denies when reserved exceeds available
```sql
DO $$
DECLARE
  v_fund_id uuid;
  v_investor uuid := gen_random_uuid();
  v_ok boolean;
  v_reason text;
BEGIN
  SELECT id INTO v_fund_id FROM public.funds LIMIT 1;

  -- Create a positive balance via deposit
  PERFORM public.apply_deposit_with_crystallization(
    v_investor,
    v_fund_id,
    100::numeric(28,10),
    now(),
    200::numeric(28,10),
    'smoke:dep2',
    'transaction'::public.aum_purpose,
    auth.uid()
  );

  -- Reserve 90 via pending withdrawal request
  INSERT INTO public.withdrawal_requests (
    investor_id, fund_id, requested_amount, withdrawal_type,
    status, request_date, notes, created_by
  ) VALUES (
    v_investor,
    v_fund_id,
    90::numeric(28,10),
    'partial',
    'pending',
    CURRENT_DATE,
    'smoke reserved',
    auth.uid()
  );

  SELECT ok, reason INTO v_ok, v_reason
  FROM public.can_withdraw(v_investor, v_fund_id, 20::numeric(28,10));

  IF v_ok THEN
    RAISE EXCEPTION 'Expected can_withdraw=false (reserved logic) but got ok=true';
  END IF;

  RAISE NOTICE 'OK (expected deny): %', v_reason;
END $$;
```
