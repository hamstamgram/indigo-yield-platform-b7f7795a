-- Fix orphaned fund_aum_events records using correct canonical flag bypass
DO $$
BEGIN
  -- Enable canonical mutation flag using the correct namespace (indigo.canonical_rpc)
  PERFORM set_config('indigo.canonical_rpc', 'true', true);

  -- Void any fund_aum_events that reference voided transactions
  UPDATE fund_aum_events fae
  SET 
    is_voided = true,
    voided_at = now(),
    void_reason = 'Data fix: referenced transaction was voided before RPC fix was deployed'
  WHERE fae.is_voided = false
    AND EXISTS (
      SELECT 1 FROM transactions_v2 t
      WHERE t.is_voided = true
        AND fae.trigger_reference LIKE '%' || t.id::text || '%'
    );

  -- Also directly void the specific known orphan record if not caught above
  UPDATE fund_aum_events
  SET 
    is_voided = true,
    voided_at = now(),
    void_reason = 'Data fix: orphaned record from transaction voided before RPC fix'
  WHERE id = 'b1fd1b8f-7414-4171-97a0-f2d9f51f94d5'
    AND is_voided = false;

  RAISE NOTICE 'Orphaned fund_aum_events records have been voided';
END;
$$;