-- ============================================================================
-- A5: Create compatibility views for frontend transition
-- Release: A (Additive)
-- ============================================================================

-- Compatibility view for statements (frontend can use either)
CREATE OR REPLACE VIEW v_statements_compat AS
SELECT 
  id,
  investor_profile_id,
  investor_profile_id AS investor_id,  -- Expose canonical as legacy name
  period_year,
  period_month,
  asset_code,
  begin_balance,
  additions,
  redemptions,
  net_income,
  end_balance,
  rate_of_return_mtd,
  rate_of_return_qtd,
  rate_of_return_ytd,
  rate_of_return_itd,
  storage_path,
  created_at
FROM statements;

-- Compatibility view for documents
CREATE OR REPLACE VIEW v_documents_compat AS
SELECT 
  id,
  user_profile_id,
  user_profile_id AS user_id,
  fund_id,
  type,
  title,
  storage_path,
  period_start,
  period_end,
  created_at,
  created_by_profile_id,
  created_by_profile_id AS created_by,
  checksum
FROM documents;