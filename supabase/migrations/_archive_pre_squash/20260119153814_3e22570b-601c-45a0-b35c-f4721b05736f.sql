-- Add composite index for investor yield event date-range queries
-- Supports: getInvestorYieldHistory(), investor dashboard yield lookups
CREATE INDEX IF NOT EXISTS idx_iye_investor_date 
ON investor_yield_events(investor_id, event_date);