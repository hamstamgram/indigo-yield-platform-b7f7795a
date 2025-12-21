-- Add 'withdrawal' to notification_type enum
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'withdrawal';

-- Add index for paginated withdrawals queries
CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_status_date 
ON withdrawal_requests(status, request_date DESC);

CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_investor_date 
ON withdrawal_requests(investor_id, request_date DESC);