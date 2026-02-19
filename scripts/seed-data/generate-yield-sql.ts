import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

interface PerformanceEntry {
  month: string;
  fund: string;
  grossPct: number;
  netPct: number;
  openingAum: number;
  closingAum: number;
  flows: number;
}

interface MonthFundYield {
  month: string;
  fund: string;
  totalGrossYield: number;
  segmentCount: number;
}

const FUND_IDS: Record<string, string> = {
  BTC: "0a048d9b-c4cf-46eb-b428-59e10307df93",
  ETH: "717614a2-9e24-4abc-a89d-02209a3a772a",
  SOL: "7574bc81-aab3-4175-9e7f-803aa6f9eb8f",
  USDT: "8ef9dc49-e76c-4882-84ab-a449ef4326db",
  XRP: "2c123c4f-76b4-4504-867e-059649855417",
};

const ADMIN_ID = "a16a7e50-fefd-4bfe-897c-d16279b457c2";

function lastDayOfMonth(yearMonth: string): string {
  const [year, month] = yearMonth.split("-").map(Number);
  const d = new Date(year, month, 0); // day 0 of next month = last day of this month
  return `${year}-${String(month).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function firstDayOfMonth(yearMonth: string): string {
  return `${yearMonth}-01`;
}

function main() {
  const dataPath = join(__dirname, "performance.json");
  const entries: PerformanceEntry[] = JSON.parse(readFileSync(dataPath, "utf-8"));

  // Aggregate by month+fund
  const aggregated = new Map<string, MonthFundYield>();

  for (const entry of entries) {
    const key = `${entry.month}|${entry.fund}`;

    if (!aggregated.has(key)) {
      aggregated.set(key, {
        month: entry.month,
        fund: entry.fund,
        totalGrossYield: 0,
        segmentCount: 0,
      });
    }

    const agg = aggregated.get(key)!;

    // Skip initialization entries (grossPct=100, fund just starting)
    if (entry.grossPct === 100) continue;

    // Skip zero-yield entries
    if (entry.grossPct === 0) continue;

    // Calculate gross yield for this segment
    // grossPct is in percentage form (0.6344 means 0.6344%)
    const segmentYield = (entry.openingAum * entry.grossPct) / 100;
    agg.totalGrossYield += segmentYield;
    agg.segmentCount += 1;
  }

  // Filter out months with 0 total yield
  const yieldsToApply = Array.from(aggregated.values())
    .filter((y) => y.totalGrossYield !== 0)
    .sort((a, b) => {
      if (a.month !== b.month) return a.month.localeCompare(b.month);
      // Process in fund order: BTC, ETH, USDT, SOL, XRP
      const order = ["BTC", "ETH", "USDT", "SOL", "XRP"];
      return order.indexOf(a.fund) - order.indexOf(b.fund);
    });

  console.log(`Found ${yieldsToApply.length} month-fund yield distributions to apply:`);
  for (const y of yieldsToApply) {
    console.log(
      `  ${y.month} ${y.fund}: gross_yield = ${y.totalGrossYield.toFixed(10)} (${y.segmentCount} segments)`
    );
  }

  // Generate SQL
  let sql = `-- Generated yield distribution script
-- Applies ${yieldsToApply.length} month-fund yield distributions via V5 engine
-- Generated at ${new Date().toISOString()}

`;

  for (const y of yieldsToApply) {
    const fundId = FUND_IDS[y.fund];
    if (!fundId) {
      console.error(`Unknown fund: ${y.fund}`);
      continue;
    }

    const periodEnd = lastDayOfMonth(y.month);
    const periodStart = firstDayOfMonth(y.month);

    sql += `-- ${y.month} ${y.fund}: ${y.segmentCount} segments, gross_yield = ${y.totalGrossYield.toFixed(10)}
DO $$
DECLARE
  v_opening numeric;
  v_flows numeric;
  v_balance_sum numeric;
  v_recorded_aum numeric;
  v_result jsonb;
  v_gross_yield numeric := ${y.totalGrossYield.toFixed(10)};
  v_activated integer;
BEGIN
  -- Set auth context
  PERFORM set_config('request.jwt.claim.sub', '${ADMIN_ID}', true);
  PERFORM set_config('request.jwt.claims', '{"sub":"${ADMIN_ID}","role":"authenticated"}', true);
  PERFORM set_config('indigo.canonical_rpc', 'true', true);

  -- Ensure all positions for this fund are active (V5 only processes active positions)
  UPDATE investor_positions SET is_active = true
  WHERE fund_id = '${fundId}'::uuid AND is_active = false;
  GET DIAGNOSTICS v_activated = ROW_COUNT;
  IF v_activated > 0 THEN
    RAISE NOTICE '${y.month} ${y.fund}: Activated % positions', v_activated;
  END IF;

  -- V5-matching balance_sum: per-investor opening through investor_positions
  SELECT COALESCE(SUM(inv_balance), 0) INTO v_opening
  FROM (
    SELECT COALESCE((
      SELECT SUM(t.amount) FROM transactions_v2 t
      WHERE t.investor_id = ip.investor_id
        AND t.fund_id = '${fundId}'::uuid
        AND t.tx_date < '${periodStart}'::date
        AND t.is_voided = false
    ), 0) as inv_balance
    FROM investor_positions ip
    WHERE ip.fund_id = '${fundId}'::uuid AND ip.is_active = true
  ) sub;

  -- V5-matching flows: DEP/WD/ADJ within period for active investors only
  SELECT COALESCE(SUM(t.amount), 0) INTO v_flows
  FROM transactions_v2 t
  WHERE t.fund_id = '${fundId}'::uuid
    AND t.is_voided = false
    AND t.type IN ('DEPOSIT'::tx_type, 'WITHDRAWAL'::tx_type, 'ADJUSTMENT'::tx_type)
    AND t.tx_date >= '${periodStart}'::date
    AND t.tx_date <= '${periodEnd}'::date
    AND t.investor_id IN (
      SELECT ip.investor_id FROM investor_positions ip
      WHERE ip.fund_id = '${fundId}'::uuid AND ip.is_active = true
    );

  v_balance_sum := v_opening + v_flows;
  v_recorded_aum := v_balance_sum + v_gross_yield;

  RAISE NOTICE '${y.month} ${y.fund}: opening=%, flows=%, balance_sum=%, gross_yield=%, recorded_aum=%',
    v_opening, v_flows, v_balance_sum, v_gross_yield, v_recorded_aum;

  -- Call V5 apply
  v_result := apply_segmented_yield_distribution_v5(
    p_fund_id := '${fundId}'::uuid,
    p_period_end := '${periodEnd}'::date,
    p_recorded_aum := v_recorded_aum,
    p_admin_id := '${ADMIN_ID}'::uuid,
    p_purpose := 'reporting'::aum_purpose
  );

  -- Check result
  IF (v_result->>'success')::boolean IS NOT TRUE THEN
    RAISE EXCEPTION '${y.month} ${y.fund} FAILED: %', v_result->>'error';
  END IF;

  -- Re-activate any positions that went inactive from YIELD transactions
  UPDATE investor_positions SET is_active = true
  WHERE fund_id = '${fundId}'::uuid AND is_active = false;

  RAISE NOTICE '${y.month} ${y.fund} SUCCESS: gross=%, net=%, fees=%, ib=%',
    v_result->'summary'->>'total_gross',
    v_result->'summary'->>'total_net',
    v_result->'summary'->>'total_fees',
    v_result->'summary'->>'total_ib';
END;
$$;

`;
  }

  // Write output
  const outPath = join(__dirname, "seed-yields.sql");
  writeFileSync(outPath, sql);
  console.log(`\nSQL written to ${outPath}`);
}

main();
