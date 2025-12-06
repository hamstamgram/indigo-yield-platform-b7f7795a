const fs = require("fs");

// Mapping from UUID to Email (Sanitized for @example.com as per seed-master-users/index.ts)
const uuidToEmail = {
  "1b5bc810-c737-5406-8590-68f495bf50e5": "jose.molla@example.com",
  "0116835a-b1ef-52fe-bffc-a93a23859d15": "kyle.gulamerian@example.com",
  "5effb696-9d8e-56e2-bf10-05f1a9a2ccba": "matthias@example.com",
  "a839e2e2-32a6-50b3-8222-2e42a4477564": "thomas.puech@example.com",
  "62de504b-ef46-55d0-8b53-2166ddb61883": "danielle@example.com",
  "faaa9b08-c545-5b67-9e4a-6f83f599423b": "nathanael.cohen@example.com",
  "0e8a1ee8-8276-5c5a-9a21-8a75846a0434": "blondish@example.com",
  "5836c530-b8f1-5e57-93e5-af65ab618593": "tac.program@example.com",
  "5e835847-27eb-58ff-ad59-995b958fe23d": "babak.eftekhari@example.com",
  "35d59f82-9730-5010-ba48-c97f612fa3a5": "indigo.lp@example.com",
  "898b6c24-71d3-5a75-a29f-3ac8ec3bf2af": "h.kabbaj@example.com",
  "a3221ae4-df69-562a-8a1c-160d24c73f8a": "julien.grunebaum@example.com",
  "39678d51-7ec4-5d38-bb27-8fdb51b05366": "daniele.francilia@example.com",
  "2c9c2933-801a-5ac8-97f7-f39c8eee8cdf": "pib@example.com",
  "fba6a3f3-775d-5249-88e1-769ed2e38a0f": "matthew@example.com",
  "cbae1f0b-3497-5e1b-b60d-fd68d62ced4b": "bokriek@example.com",
  "e2c558e9-7d21-5770-89a3-2f4c16a8f150": "dario.deiana@example.com",
  "2270d947-2225-5227-a56d-d9c68d470781": "alain.bensimon@example.com",
  "0e70705b-c94b-5f08-be01-c1f0b7c8f276": "anne.cecile.noique@example.com",
  "5015794b-9db8-589d-a426-08e16d7d7038": "terance.chen@example.com",
  "b8681135-43f8-5432-832c-93848a66ef4d": "oliver.loisel@example.com",
  "2dd8daed-8ca6-5b36-90a9-d461d95c0ab2": "advantage.blockchain@example.com",
  "aaefd32d-9886-51b6-ba23-1ba0f1a5ae2b": "indigo.ventures@example.com",
  "464b743a-a1e7-5772-8ca6-bb4a87ebab17": "paul.johnson@example.com",
  "812f13e6-4175-5a7e-bf2f-84cd19619805": "tomer.zur@example.com",
  "c43810ab-af49-5b99-98e7-eb9e58087a6d": "sacha.oshry@example.com",
  "d80d08f7-c61e-5d78-b915-1b55851f11e3": "halley86@example.com",
  "e086ccaf-7a07-5ba9-b5b7-4359983ccfa2": "indigo.fees@example.com",
  "a8db5b60-6cb2-5cf6-aa1f-d22fe6dd0887": "monica.levy.chicheportiche@example.com",
  "2df91c31-573b-524f-a5ba-69b663e56a64": "nath.thomas@example.com",
  "048cb62d-f5ee-5157-82b6-c90115173517": "sam.johnson@example.com",
  "997c46c9-775e-57bc-b081-0004e1731a30": "valeria.cruz@example.com",
  "a51c6009-de6c-500b-a3e9-e25cad07831b": "rabih.mokbel@example.com",
  "4d0f7e52-89f7-5abd-bdc8-3547f1c0eb3e": "vivie.liana@example.com",
  "467c3ca9-c4ba-5129-91c2-dbed66f9171c": "brandon.hood@example.com",
};

const masterFile = fs.readFileSync("./master_data_import.sql", "utf8");

// Generate New SQL
let newSql = `-- Smart Master Data Import (Sanitized)
-- Uses Email lookups to link transactions/statements to investors
-- Requires 'seed-master-users' Edge Function to be run first!

DO $$
DECLARE
    v_investor_id UUID;
BEGIN
`;

// Extract Transactions
const transactionRegex =
  /INSERT INTO public\.transactions \(investor_id, asset_code, amount, type, status, created_at\) VALUES \('([a-f0-9-]+)', '([^']+)', ([0-9.-]+), '([^']+)', '([^']+)', '([^']+)'\)/g;
let match;

while ((match = transactionRegex.exec(masterFile)) !== null) {
  const [full, uuid, asset, amount, type, status, createdAt] = match;
  const email = uuidToEmail[uuid];
  if (email) {
    newSql += `
    -- Transaction for ${email}
    SELECT id INTO v_investor_id FROM public.investors WHERE email = '${email}';
    IF v_investor_id IS NOT NULL THEN
        INSERT INTO public.transactions (investor_id, asset_code, amount, type, status, created_at, confirmed_at)
        VALUES (v_investor_id, '${asset}', ${amount}, '${type}', '${status}', '${createdAt}', '${createdAt}')
        ON CONFLICT DO NOTHING;
    END IF;
`;
  }
}

const statementRegex =
  /INSERT INTO public\.statements \(id, investor_id, period_year, period_month, asset_code, begin_balance, additions, redemptions, net_income, end_balance, storage_path\) VALUES \('([^']+)', '([a-f0-9-]+)', ([0-9]+), ([0-9]+), '([^']+)', ([0-9.]+), ([0-9.]+), ([0-9.]+), ([0-9.]+), ([0-9.]+), '([^']+)'\)/g;

while ((match = statementRegex.exec(masterFile)) !== null) {
  const [full, id, uuid, year, month, asset, start, add, red, net, end, path] = match;
  const email = uuidToEmail[uuid];
  if (email) {
    newSql += `
    -- Statement for ${email}
    SELECT id INTO v_investor_id FROM public.investors WHERE email = '${email}';
    IF v_investor_id IS NOT NULL THEN
        INSERT INTO public.statements (id, investor_id, period_year, period_month, asset_code, begin_balance, additions, redemptions, net_income, end_balance, storage_path)
        VALUES ('${id}', v_investor_id, ${year}, ${month}, '${asset}', ${start}, ${add}, ${red}, ${net}, ${end}, '${path}')
        ON CONFLICT (investor_id, period_year, period_month, asset_code) DO UPDATE SET storage_path = EXCLUDED.storage_path;
    END IF;
`;
  }
}

newSql += `
    RAISE NOTICE 'Smart Import Complete.';
END $$;
`;

// Backfill Block (Standard)
newSql += `
DO $$
DECLARE
    curr_date DATE;
    end_date DATE := CURRENT_DATE;
    start_date DATE;
    month_start DATE;
    month_end DATE;
BEGIN
    SELECT MIN(created_at)::DATE INTO start_date FROM public.transactions;
    IF start_date IS NULL THEN start_date := '2024-01-01'; END IF;
    curr_date := start_date;
    RAISE NOTICE 'Re-Running Backfill...';
    WHILE curr_date <= end_date LOOP
        INSERT INTO public.daily_nav (fund_id, nav_date, aum, total_inflows, total_outflows, created_at)
        SELECT f.id, curr_date, 
        COALESCE((SELECT SUM(amount) FROM public.transactions t_all WHERE ((f.code = 'IND-USDT' AND t_all.asset_code IN ('USDT', 'USDC')) OR (f.code != 'IND-USDT' AND t_all.asset_code::text = f.asset)) AND t_all.created_at::DATE <= curr_date), 0),
        COALESCE((SELECT SUM(amount) FROM public.transactions t_in WHERE ((f.code = 'IND-USDT' AND t_in.asset_code IN ('USDT', 'USDC')) OR (f.code != 'IND-USDT' AND t_in.asset_code::text = f.asset)) AND t_in.created_at::DATE = curr_date AND t_in.type = 'DEPOSIT'), 0),
        ABS(COALESCE((SELECT SUM(amount) FROM public.transactions t_out WHERE ((f.code = 'IND-USDT' AND t_out.asset_code IN ('USDT', 'USDC')) OR (f.code != 'IND-USDT' AND t_out.asset_code::text = f.asset)) AND t_out.created_at::DATE = curr_date AND t_out.type = 'WITHDRAWAL'), 0)),
        NOW()
        FROM public.funds f GROUP BY f.id
        ON CONFLICT (fund_id, nav_date) DO UPDATE SET aum = EXCLUDED.aum, total_inflows = EXCLUDED.total_inflows, total_outflows = EXCLUDED.total_outflows;
        curr_date := curr_date + 1;
    END LOOP;
    
    curr_date := start_date;
    WHILE curr_date <= end_date LOOP
        month_start := DATE_TRUNC('month', curr_date);
        month_end := (DATE_TRUNC('month', curr_date) + INTERVAL '1 month' - INTERVAL '1 day')::DATE;
        INSERT INTO public.investor_monthly_reports (investor_id, report_month, asset_code, opening_balance, additions, withdrawals, closing_balance, yield_earned, created_at, updated_at)
        SELECT i.id, month_start, t.asset_code,
        COALESCE((SELECT SUM(amount) FROM public.transactions t2 WHERE t2.investor_id = t.investor_id AND t2.asset_code = t.asset_code AND t2.created_at < month_start), 0),
        COALESCE((SELECT SUM(amount) FROM public.transactions t3 WHERE t3.investor_id = t.investor_id AND t3.asset_code = t.asset_code AND t3.created_at >= month_start AND t3.created_at <= month_end + INTERVAL '1 day' AND t3.type = 'DEPOSIT'), 0),
        ABS(COALESCE((SELECT SUM(amount) FROM public.transactions t4 WHERE t4.investor_id = t.investor_id AND t4.asset_code = t.asset_code AND t4.created_at >= month_start AND t4.created_at <= month_end + INTERVAL '1 day' AND t4.type = 'WITHDRAWAL'), 0)),
        0, 0, NOW(), NOW()
        FROM public.transactions t JOIN public.investors i ON i.id = t.investor_id
        WHERE t.created_at <= month_end + INTERVAL '1 day'
        GROUP BY t.investor_id, t.asset_code, i.id
        ON CONFLICT (investor_id, report_month, asset_code) DO UPDATE SET opening_balance = EXCLUDED.opening_balance, additions = EXCLUDED.additions, withdrawals = EXCLUDED.withdrawals, closing_balance = EXCLUDED.opening_balance + EXCLUDED.additions - EXCLUDED.withdrawals + investor_monthly_reports.yield_earned, updated_at = NOW();
        curr_date := curr_date + INTERVAL '1 month';
    END LOOP;
    
    DELETE FROM public.investor_positions;
    INSERT INTO public.investor_positions (investor_id, fund_id, shares, current_value, cost_basis, unrealized_pnl, realized_pnl, updated_at, last_transaction_date)
    SELECT imr.investor_id, f.id, imr.closing_balance, imr.closing_balance, (imr.closing_balance - COALESCE(imr.yield_earned, 0)), COALESCE(imr.yield_earned, 0), 0, NOW(), imr.report_month
    FROM public.investor_monthly_reports imr JOIN public.funds f ON f.asset = imr.asset_code
    INNER JOIN (SELECT investor_id, asset_code, MAX(report_month) as max_month FROM public.investor_monthly_reports GROUP BY investor_id, asset_code) latest ON imr.investor_id = latest.investor_id AND imr.asset_code = latest.asset_code AND imr.report_month = latest.max_month
    WHERE imr.closing_balance > 0;
END $$;
`;

fs.writeFileSync("supabase/migrations/20251206000000_import_master_transactions_smart.sql", newSql);
console.log("Generated smart migration.");
