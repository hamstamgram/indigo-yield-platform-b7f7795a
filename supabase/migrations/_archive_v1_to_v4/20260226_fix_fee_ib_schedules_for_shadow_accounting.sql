-- Fix fee and IB commission schedules for shadow accounting seed.
--
-- Issues addressed:
-- 1. Jose Molla: global fee was 15%, Excel shows 20% for all funds
-- 2. Paul Johnson BTC: fee was 15% until Oct 2025, Excel shows 13.5% from his deposit (Dec 14, 2024)
--                      IB was 1.5% from Nov 2025, Excel shows from Dec 14, 2024
-- 3. Sam Johnson BTC: fee was 20% until Oct 2025, Excel shows 16% from his deposit (Dec 14, 2024)
--                     IB was 4% from Nov 2025, Excel shows from Dec 14, 2024
-- 4. Date normalization: yield events on 1st of month become last day of prior month.
--    This shifts the Sep 1 boundary → Aug 31, and Jul 1 boundary → Jun 30.
--    All fee/IB schedule effective_date and end_date must be adjusted to match.

-- ============================================================
-- 1. Jose Molla: fix global fee 15% → 20%
-- ============================================================
UPDATE investor_fee_schedule
SET fee_pct = 20
WHERE investor_id = '203caf71-a9ac-4e2a-bbd3-b45dd51758d4'  -- Jose Molla
  AND fund_id IS NULL
  AND effective_date = '2024-07-01';

-- ============================================================
-- 2. Paul Johnson BTC: fix fee schedule
--    Delete the incorrect 15% entry (2024-01-01 to 2025-10-31)
--    Move the 13.5% entry back to his first BTC event (2024-12-14)
-- ============================================================
DELETE FROM investor_fee_schedule
WHERE investor_id = 'd1f8c666-58c5-4a83-a5c6-0f66a380aaf2'  -- Paul Johnson
  AND fund_id = '0a048d9b-c4cf-46eb-b428-59e10307df93'        -- Bitcoin Yield Fund
  AND effective_date = '2024-01-01'
  AND end_date = '2025-10-31';

UPDATE investor_fee_schedule
SET effective_date = '2024-12-14', end_date = NULL
WHERE investor_id = 'd1f8c666-58c5-4a83-a5c6-0f66a380aaf2'  -- Paul Johnson
  AND fund_id = '0a048d9b-c4cf-46eb-b428-59e10307df93'        -- Bitcoin Yield Fund
  AND effective_date = '2025-11-01';

-- ============================================================
-- 3. Sam Johnson BTC: fix fee schedule
--    Delete the incorrect 20% entry (2024-01-01 to 2025-10-31)
--    Move the 16% entry back to his first BTC event (2024-12-14)
-- ============================================================
DELETE FROM investor_fee_schedule
WHERE investor_id = '2f7b8bb2-6a60-4fc9-953d-b9fae44337c1'  -- Sam Johnson
  AND fund_id = '0a048d9b-c4cf-46eb-b428-59e10307df93'        -- Bitcoin Yield Fund
  AND effective_date = '2024-01-01'
  AND end_date = '2025-10-31';

UPDATE investor_fee_schedule
SET effective_date = '2024-12-14', end_date = NULL
WHERE investor_id = '2f7b8bb2-6a60-4fc9-953d-b9fae44337c1'  -- Sam Johnson
  AND fund_id = '0a048d9b-c4cf-46eb-b428-59e10307df93'        -- Bitcoin Yield Fund
  AND effective_date = '2025-11-01';

-- ============================================================
-- 4. Paul Johnson BTC IB: move effective_date from Nov 1, 2025 → Dec 14, 2024
-- ============================================================
UPDATE ib_commission_schedule
SET effective_date = '2024-12-14'
WHERE investor_id = 'd1f8c666-58c5-4a83-a5c6-0f66a380aaf2'  -- Paul Johnson
  AND fund_id = '0a048d9b-c4cf-46eb-b428-59e10307df93'        -- Bitcoin Yield Fund
  AND effective_date = '2025-11-01';

-- ============================================================
-- 5. Sam Johnson BTC IB: move effective_date from Nov 1, 2025 → Dec 14, 2024
-- ============================================================
UPDATE ib_commission_schedule
SET effective_date = '2024-12-14'
WHERE investor_id = '2f7b8bb2-6a60-4fc9-953d-b9fae44337c1'  -- Sam Johnson
  AND fund_id = '0a048d9b-c4cf-46eb-b428-59e10307df93'        -- Bitcoin Yield Fund
  AND effective_date = '2025-11-01';

-- ============================================================
-- DATE NORMALIZATION ADJUSTMENTS
-- Sep 1 boundary → Aug 31: all ETH/USDT(Sep 1) fee + IB schedules
-- Jul 1 boundary → Jun 30: all USDT(Jul 1) fee + IB schedules
-- ============================================================

-- --- ETH: Sep 1 → Aug 31 boundary ---
-- The Sep 1 yield events for ETH are normalized to Aug 31.
-- Fee schedules that split on Sep 1 must split on Aug 31 instead.

-- Babak ETH fee: 20% ends Aug 31 → Aug 30; 18% starts Sep 1 → Aug 31
UPDATE investor_fee_schedule
SET end_date = '2025-08-30'
WHERE investor_id = 'cdcccf6e-32f9-475a-9f88-34272ca3e64b'  -- Babak
  AND fund_id = '717614a2-9e24-4abc-a89d-02209a3a772a'        -- ETH
  AND effective_date = '2024-01-01'
  AND end_date = '2025-08-31';

UPDATE investor_fee_schedule
SET effective_date = '2025-08-31'
WHERE investor_id = 'cdcccf6e-32f9-475a-9f88-34272ca3e64b'  -- Babak
  AND fund_id = '717614a2-9e24-4abc-a89d-02209a3a772a'        -- ETH
  AND effective_date = '2025-09-01';

-- Babak ETH IB: Sep 1 → Aug 31
UPDATE ib_commission_schedule
SET effective_date = '2025-08-31'
WHERE investor_id = 'cdcccf6e-32f9-475a-9f88-34272ca3e64b'  -- Babak
  AND fund_id = '717614a2-9e24-4abc-a89d-02209a3a772a'        -- ETH
  AND effective_date = '2025-09-01';

-- Advantage Blockchain ETH fee: 20% ends Aug 31 → Aug 30; 18% starts Sep 1 → Aug 31
UPDATE investor_fee_schedule
SET end_date = '2025-08-30'
WHERE investor_id = '3a9a5615-d4dd-4b7f-ae20-3d48a7de3dcc'  -- Advantage Blockchain
  AND fund_id = '717614a2-9e24-4abc-a89d-02209a3a772a'        -- ETH
  AND effective_date = '2024-01-01'
  AND end_date = '2025-08-31';

UPDATE investor_fee_schedule
SET effective_date = '2025-08-31'
WHERE investor_id = '3a9a5615-d4dd-4b7f-ae20-3d48a7de3dcc'  -- Advantage Blockchain
  AND fund_id = '717614a2-9e24-4abc-a89d-02209a3a772a'        -- ETH
  AND effective_date = '2025-09-01';

-- Advantage ETH IB: Sep 1 → Aug 31
UPDATE ib_commission_schedule
SET effective_date = '2025-08-31'
WHERE investor_id = '3a9a5615-d4dd-4b7f-ae20-3d48a7de3dcc'  -- Advantage Blockchain
  AND fund_id = '717614a2-9e24-4abc-a89d-02209a3a772a'        -- ETH
  AND effective_date = '2025-09-01';

-- Paul Johnson ETH fee: 15% ends Aug 31 → Aug 30; 13.5% starts Sep 1 → Aug 31
UPDATE investor_fee_schedule
SET end_date = '2025-08-30'
WHERE investor_id = 'd1f8c666-58c5-4a83-a5c6-0f66a380aaf2'  -- Paul Johnson
  AND fund_id = '717614a2-9e24-4abc-a89d-02209a3a772a'        -- ETH
  AND effective_date = '2024-01-01'
  AND end_date = '2025-08-31';

UPDATE investor_fee_schedule
SET effective_date = '2025-08-31'
WHERE investor_id = 'd1f8c666-58c5-4a83-a5c6-0f66a380aaf2'  -- Paul Johnson
  AND fund_id = '717614a2-9e24-4abc-a89d-02209a3a772a'        -- ETH
  AND effective_date = '2025-09-01';

-- Paul Johnson ETH IB: Sep 1 → Aug 31
UPDATE ib_commission_schedule
SET effective_date = '2025-08-31'
WHERE investor_id = 'd1f8c666-58c5-4a83-a5c6-0f66a380aaf2'  -- Paul Johnson
  AND fund_id = '717614a2-9e24-4abc-a89d-02209a3a772a'        -- ETH
  AND effective_date = '2025-09-01';

-- Sam Johnson ETH fee: 20% ends Aug 31 → Aug 30; 16% starts Sep 1 → Aug 31
UPDATE investor_fee_schedule
SET end_date = '2025-08-30'
WHERE investor_id = '2f7b8bb2-6a60-4fc9-953d-b9fae44337c1'  -- Sam Johnson
  AND fund_id = '717614a2-9e24-4abc-a89d-02209a3a772a'        -- ETH
  AND effective_date = '2024-01-01'
  AND end_date = '2025-08-31';

UPDATE investor_fee_schedule
SET effective_date = '2025-08-31'
WHERE investor_id = '2f7b8bb2-6a60-4fc9-953d-b9fae44337c1'  -- Sam Johnson
  AND fund_id = '717614a2-9e24-4abc-a89d-02209a3a772a'        -- ETH
  AND effective_date = '2025-09-01';

-- Sam Johnson ETH IB: Sep 1 → Aug 31
UPDATE ib_commission_schedule
SET effective_date = '2025-08-31'
WHERE investor_id = '2f7b8bb2-6a60-4fc9-953d-b9fae44337c1'  -- Sam Johnson
  AND fund_id = '717614a2-9e24-4abc-a89d-02209a3a772a'        -- ETH
  AND effective_date = '2025-09-01';

-- Paul Johnson SOL fee: 15% ends Aug 31 → Aug 30; 13.5% starts Sep 1 → Aug 31
UPDATE investor_fee_schedule
SET end_date = '2025-08-30'
WHERE investor_id = 'd1f8c666-58c5-4a83-a5c6-0f66a380aaf2'  -- Paul Johnson
  AND fund_id = '7574bc81-aab3-4175-9e7f-803aa6f9eb8f'        -- SOL
  AND effective_date = '2024-01-01'
  AND end_date = '2025-08-31';

UPDATE investor_fee_schedule
SET effective_date = '2025-08-31'
WHERE investor_id = 'd1f8c666-58c5-4a83-a5c6-0f66a380aaf2'  -- Paul Johnson
  AND fund_id = '7574bc81-aab3-4175-9e7f-803aa6f9eb8f'        -- SOL
  AND effective_date = '2025-09-01';

-- Sam Johnson SOL fee: 20% ends Aug 31 → Aug 30; 16% starts Sep 1 → Aug 31
UPDATE investor_fee_schedule
SET end_date = '2025-08-30'
WHERE investor_id = '2f7b8bb2-6a60-4fc9-953d-b9fae44337c1'  -- Sam Johnson
  AND fund_id = '7574bc81-aab3-4175-9e7f-803aa6f9eb8f'        -- SOL
  AND effective_date = '2024-01-01'
  AND end_date = '2025-08-31';

UPDATE investor_fee_schedule
SET effective_date = '2025-08-31'
WHERE investor_id = '2f7b8bb2-6a60-4fc9-953d-b9fae44337c1'  -- Sam Johnson
  AND fund_id = '7574bc81-aab3-4175-9e7f-803aa6f9eb8f'        -- SOL
  AND effective_date = '2025-09-01';

-- --- USDT: Jul 1 → Jun 30 boundary ---
-- The Jul 1 yield events for USDT/ETH are normalized to Jun 30.

-- Babak USDT fee: 20% ends Jun 30 → Jun 29; 18% starts Jul 1 → Jun 30
UPDATE investor_fee_schedule
SET end_date = '2025-06-29'
WHERE investor_id = 'cdcccf6e-32f9-475a-9f88-34272ca3e64b'  -- Babak
  AND fund_id = '8ef9dc49-e76c-4882-84ab-a449ef4326db'        -- USDT
  AND effective_date = '2024-01-01'
  AND end_date = '2025-06-30';

UPDATE investor_fee_schedule
SET effective_date = '2025-06-30'
WHERE investor_id = 'cdcccf6e-32f9-475a-9f88-34272ca3e64b'  -- Babak
  AND fund_id = '8ef9dc49-e76c-4882-84ab-a449ef4326db'        -- USDT
  AND effective_date = '2025-07-01';

-- Babak USDT IB: Jul 1 → Aug 4 (Excel starts IB from 2025-08-04, not Jun 30)
UPDATE ib_commission_schedule
SET effective_date = '2025-08-04'
WHERE investor_id = 'cdcccf6e-32f9-475a-9f88-34272ca3e64b'  -- Babak
  AND fund_id = '8ef9dc49-e76c-4882-84ab-a449ef4326db'        -- USDT
  AND effective_date IN ('2025-07-01', '2025-06-30');

-- Sam Johnson USDT fee: 20% ends Jun 30 → Jun 29; 16% starts Jul 1 → Jun 30
UPDATE investor_fee_schedule
SET end_date = '2025-06-29'
WHERE investor_id = '2f7b8bb2-6a60-4fc9-953d-b9fae44337c1'  -- Sam Johnson
  AND fund_id = '8ef9dc49-e76c-4882-84ab-a449ef4326db'        -- USDT
  AND effective_date = '2024-01-01'
  AND end_date = '2025-06-30';

UPDATE investor_fee_schedule
SET effective_date = '2025-06-30'
WHERE investor_id = '2f7b8bb2-6a60-4fc9-953d-b9fae44337c1'  -- Sam Johnson
  AND fund_id = '8ef9dc49-e76c-4882-84ab-a449ef4326db'        -- USDT
  AND effective_date = '2025-07-01';

-- Sam Johnson USDT IB: Jul 1 → Jun 30
UPDATE ib_commission_schedule
SET effective_date = '2025-06-30'
WHERE investor_id = '2f7b8bb2-6a60-4fc9-953d-b9fae44337c1'  -- Sam Johnson
  AND fund_id = '8ef9dc49-e76c-4882-84ab-a449ef4326db'        -- USDT
  AND effective_date = '2025-07-01';

-- Ventures Life Style USDT fee: 20% ends Jun 30 → Jun 29; 16% starts Jul 1 → Jun 30
UPDATE investor_fee_schedule
SET end_date = '2025-06-29'
WHERE investor_id = '7d049f7f-b77f-4650-b772-6a8806f00103'  -- Ventures Life Style
  AND fund_id = '8ef9dc49-e76c-4882-84ab-a449ef4326db'        -- USDT
  AND effective_date = '2024-01-01'
  AND end_date = '2025-06-30';

UPDATE investor_fee_schedule
SET effective_date = '2025-06-30'
WHERE investor_id = '7d049f7f-b77f-4650-b772-6a8806f00103'  -- Ventures Life Style
  AND fund_id = '8ef9dc49-e76c-4882-84ab-a449ef4326db'        -- USDT
  AND effective_date = '2025-07-01';

-- Ventures Life Style USDT IB: Jul 1 → Jun 30
UPDATE ib_commission_schedule
SET effective_date = '2025-06-30'
WHERE investor_id = '7d049f7f-b77f-4650-b772-6a8806f00103'  -- Ventures Life Style
  AND fund_id = '8ef9dc49-e76c-4882-84ab-a449ef4326db'        -- USDT
  AND effective_date = '2025-07-01';

-- Verify: show all modified entries
SELECT
  'investor_fee_schedule' as tbl,
  p.first_name || ' ' || p.last_name as investor,
  f.name as fund,
  ifs.effective_date,
  ifs.end_date,
  ifs.fee_pct
FROM investor_fee_schedule ifs
JOIN profiles p ON p.id = ifs.investor_id
LEFT JOIN funds f ON f.id = ifs.fund_id
WHERE ifs.investor_id IN (
  '203caf71-a9ac-4e2a-bbd3-b45dd51758d4',  -- Jose
  'd1f8c666-58c5-4a83-a5c6-0f66a380aaf2',  -- Paul
  '2f7b8bb2-6a60-4fc9-953d-b9fae44337c1',  -- Sam
  'cdcccf6e-32f9-475a-9f88-34272ca3e64b',  -- Babak
  '3a9a5615-d4dd-4b7f-ae20-3d48a7de3dcc',  -- Advantage
  '7d049f7f-b77f-4650-b772-6a8806f00103'   -- Ventures
)
ORDER BY investor, fund, ifs.effective_date;
