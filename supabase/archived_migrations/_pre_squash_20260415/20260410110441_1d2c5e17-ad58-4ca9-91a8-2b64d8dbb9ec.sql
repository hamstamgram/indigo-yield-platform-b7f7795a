
-- Reversal: Un-void the Jan 5 deposits that ARE in the Excel

DO $$
DECLARE
  v_admin_id uuid := 'd7f936ee-768b-4d93-83e8-f88a6cf10ae9';
  v_fund_id uuid := '2c123c4f-76b4-4504-867e-059649855417';
  v_indigo_id uuid := 'b464a3f7-60d5-4bc0-9833-7b413bcc6cae';
  v_ryan_id uuid := 'f462d9e5-7363-4c82-a144-4e694d2b55da';
BEGIN
  PERFORM set_config('indigo.canonical_rpc', 'true', true);
  PERFORM set_config('app.canonical_rpc', 'true', true);

  -- Un-void Indigo's 253.136 deposit
  UPDATE transactions_v2
  SET is_voided = false,
      voided_at = NULL,
      voided_by = NULL,
      void_reason = NULL,
      voided_by_profile_id = NULL,
      notes = COALESCE(notes, '') || E'\n[Unvoided: deposit IS in Excel — fee payout on Sam exit]'
  WHERE id = '370bec96-660f-45c0-b7b2-7f956a925a85';

  INSERT INTO audit_log (entity, entity_id, action, actor_user, old_values, new_values, meta)
  VALUES ('transactions_v2', '370bec96-660f-45c0-b7b2-7f956a925a85', 'UNVOID', v_admin_id,
    jsonb_build_object('is_voided', true),
    jsonb_build_object('is_voided', false),
    jsonb_build_object('reason', 'Reversal: deposit confirmed in Excel as fee payout'));

  -- Un-void Ryan's 63.284 deposit
  UPDATE transactions_v2
  SET is_voided = false,
      voided_at = NULL,
      voided_by = NULL,
      void_reason = NULL,
      voided_by_profile_id = NULL,
      notes = COALESCE(notes, '') || E'\n[Unvoided: deposit IS in Excel — IB payout on Sam exit]'
  WHERE id = '091b51b5-b867-4ea7-9786-198a8260204b';

  INSERT INTO audit_log (entity, entity_id, action, actor_user, old_values, new_values, meta)
  VALUES ('transactions_v2', '091b51b5-b867-4ea7-9786-198a8260204b', 'UNVOID', v_admin_id,
    jsonb_build_object('is_voided', true),
    jsonb_build_object('is_voided', false),
    jsonb_build_object('reason', 'Reversal: deposit confirmed in Excel as IB payout'));

  -- Recompute positions
  PERFORM recompute_investor_position(v_indigo_id, v_fund_id);
  PERFORM recompute_investor_position(v_ryan_id, v_fund_id);
  PERFORM recalculate_fund_aum_for_date(v_fund_id, CURRENT_DATE);

  RAISE NOTICE 'Reversed: Jan 5 deposits un-voided and positions recomputed';
END;
$$;
