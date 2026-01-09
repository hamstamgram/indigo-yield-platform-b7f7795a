-- Add missing indexes for optimized querying
-- Recommended indexes from codebase audit

-- Index for filtering yield_distributions by fund and date
CREATE INDEX IF NOT EXISTS idx_yield_distributions_fund_date 
ON yield_distributions(fund_id, period_end DESC);

-- Partial index for filtering pending withdrawal requests
CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_pending 
ON withdrawal_requests(status) 
WHERE status = 'pending';

-- Index for yield distributions status filtering
CREATE INDEX IF NOT EXISTS idx_yield_distributions_status
ON yield_distributions(status)
WHERE status != 'finalized';