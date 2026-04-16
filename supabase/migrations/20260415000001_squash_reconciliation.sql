DROP VIEW IF EXISTS "public"."v_fee_calculation_orphans";

ALTER TABLE "public"."fee_allocations" ALTER COLUMN "fee_amount" SET DATA TYPE numeric(28,10) USING "fee_amount"::numeric(28,10);
ALTER TABLE "public"."fee_allocations" ALTER COLUMN "fee_percentage" SET DATA TYPE numeric(28,10) USING "fee_percentage"::numeric(28,10);
ALTER TABLE "public"."investor_positions" ALTER COLUMN "aum_percentage" SET DATA TYPE numeric(28,10) USING "aum_percentage"::numeric(28,10);
ALTER TABLE "public"."investor_positions" ALTER COLUMN "cumulative_yield_earned" SET DATA TYPE numeric(28,10) USING "cumulative_yield_earned"::numeric(28,10);
ALTER TABLE "public"."investor_yield_events" ALTER COLUMN "fee_amount" SET DATA TYPE numeric(28,10) USING "fee_amount"::numeric(28,10);
ALTER TABLE "public"."investor_yield_events" ALTER COLUMN "fee_pct" SET DATA TYPE numeric(28,10) USING "fee_pct"::numeric(28,10);
ALTER TABLE "public"."investor_yield_events" ALTER COLUMN "fund_aum_after" SET DATA TYPE numeric(28,10) USING "fund_aum_after"::numeric(28,10);
ALTER TABLE "public"."investor_yield_events" ALTER COLUMN "fund_aum_before" SET DATA TYPE numeric(28,10) USING "fund_aum_before"::numeric(28,10);
ALTER TABLE "public"."investor_yield_events" ALTER COLUMN "fund_yield_pct" SET DATA TYPE numeric(28,10) USING "fund_yield_pct"::numeric(28,10);
ALTER TABLE "public"."investor_yield_events" ALTER COLUMN "gross_yield_amount" SET DATA TYPE numeric(28,10) USING "gross_yield_amount"::numeric(28,10);
ALTER TABLE "public"."investor_yield_events" ALTER COLUMN "investor_balance" SET DATA TYPE numeric(28,10) USING "investor_balance"::numeric(28,10);
ALTER TABLE "public"."investor_yield_events" ALTER COLUMN "investor_share_pct" SET DATA TYPE numeric(28,10) USING "investor_share_pct"::numeric(28,10);
ALTER TABLE "public"."investor_yield_events" ALTER COLUMN "net_yield_amount" SET DATA TYPE numeric(28,10) USING "net_yield_amount"::numeric(28,10);

CREATE OR REPLACE VIEW "public"."v_fee_calculation_orphans" AS
 SELECT "fa"."id",
    "fa"."distribution_id",
    "fa"."fund_id",
    "fa"."investor_id",
    "fa"."fees_account_id",
    "fa"."period_start",
    "fa"."period_end",
    "fa"."purpose",
    "fa"."base_net_income",
    "fa"."fee_percentage",
    "fa"."fee_amount",
    "fa"."credit_transaction_id",
    "fa"."debit_transaction_id",
    "fa"."created_at",
    "fa"."created_by",
    "fa"."is_voided",
    "fa"."voided_at",
    "fa"."voided_by"
   FROM ("public"."fee_allocations" "fa"
     LEFT JOIN "public"."yield_distributions" "yd" ON (("fa"."distribution_id" = "yd"."id")))
  WHERE (("fa"."is_voided" = false) AND (("yd"."id" IS NULL) OR ("yd"."status" = 'voided'::"text")));

DROP FUNCTION IF EXISTS "public"."apply_investor_transaction"("p_fund_id" "uuid", "p_investor_id" "uuid", "p_tx_type" "public"."tx_type", "p_amount" numeric, "p_tx_date" "date", "p_reference_id" "text", "p_admin_id" "uuid", "p_notes" "text", "p_purpose" "public"."aum_purpose", "p_distribution_id" "uuid");
DROP FUNCTION IF EXISTS "public"."adjust_investor_position"("p_fund_id" "uuid", "p_investor_id" "uuid", "p_amount" numeric, "p_tx_date" "date", "p_reason" "text", "p_admin_id" "uuid");
DROP FUNCTION IF EXISTS "public"."check_aum_reconciliation"("p_as_of_date" "date", "p_fund_id" "uuid", "p_tolerance_pct" numeric);
DROP FUNCTION IF EXISTS "public"."set_account_type_for_ib"("p_user_id" "uuid");
DROP FUNCTION IF EXISTS "public"."qa_fees_account_id"();

DROP TABLE IF EXISTS "public"."qa_entity_manifest" CASCADE;

CREATE OR REPLACE FUNCTION "public"."apply_daily_yield_with_validation"("p_fund_id" "uuid", "p_yield_date" "date", "p_gross_yield_pct" numeric, "p_created_by" "uuid", "p_purpose" "text" DEFAULT 'transaction'::"text", "p_skip_validation" boolean DEFAULT false) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_validation JSONB;
  v_result JSONB;
BEGIN
  IF NOT is_admin(COALESCE(p_created_by, auth.uid())) THEN
    RAISE EXCEPTION 'Unauthorized: admin role required';
  END IF;

  PERFORM set_config('indigo.canonical_rpc', 'true', true);

  IF p_yield_date > CURRENT_DATE THEN
    RAISE EXCEPTION 'FUTURE_DATE_NOT_ALLOWED: Cannot distribute yield for future dates (% > %)', p_yield_date, CURRENT_DATE;
  END IF;

  IF NOT p_skip_validation THEN
    SELECT validate_pre_yield_aum(p_fund_id, 1.0) INTO v_validation;
    IF NOT (v_validation->>'is_valid')::boolean THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'Pre-yield validation failed',
        'validation_errors', v_validation->'errors',
        'validation_warnings', v_validation->'warnings',
        'recorded_aum', v_validation->'recorded_aum',
        'calculated_aum', v_validation->'calculated_aum'
      );
    END IF;
  END IF;

  SELECT apply_daily_yield_to_fund_v3(
    p_fund_id, p_yield_date, p_gross_yield_pct, p_created_by, p_purpose::TEXT
  ) INTO v_result;

  IF v_validation IS NOT NULL THEN
    v_result := v_result || jsonb_build_object('validation', v_validation);
  END IF;

  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION "public"."crystallize_month_end"("p_fund_id" "uuid", "p_month_end_date" "date", "p_closing_aum" numeric, "p_admin_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_result jsonb;
  v_trigger_reference text;
  v_month_end_ts timestamptz;
BEGIN
  IF NOT is_admin(COALESCE(p_admin_id, auth.uid())) THEN
    RAISE EXCEPTION 'Unauthorized: admin role required';
  END IF;

  PERFORM set_config('indigo.canonical_rpc', 'true', true);

  PERFORM pg_advisory_xact_lock(hashtext('month_end'), hashtext(p_fund_id::text));

  v_trigger_reference := 'MONTH_END:' || p_fund_id::text || ':' || to_char(p_month_end_date, 'YYYY-MM');
  v_month_end_ts := (p_month_end_date::timestamp + interval '23 hours 59 minutes 59 seconds')::timestamptz;
  
  v_result := public.crystallize_yield_before_flow(
    p_fund_id, v_month_end_ts, p_closing_aum, 'month_end',
    v_trigger_reference, 'reporting'::public.aum_purpose, p_admin_id
  );
  
  v_result := v_result || jsonb_build_object(
    'month_end_date', p_month_end_date, 'is_month_end', true
  );
  
  RETURN v_result;
END;
$$;