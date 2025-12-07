-- Create statements table for tracking generated PDF statements
CREATE TABLE IF NOT EXISTS statements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  investor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  period VARCHAR(10) NOT NULL, -- Format: YYYY-MM
  file_path TEXT NOT NULL, -- Path in Supabase Storage
  signed_url TEXT, -- Signed URL for secure access
  file_size INTEGER, -- File size in bytes
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ, -- When the signed URL expires
  status VARCHAR(20) DEFAULT 'generated' CHECK (status IN ('generated', 'sent', 'viewed', 'expired')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_statements_investor_id ON statements(investor_id);
CREATE INDEX IF NOT EXISTS idx_statements_period ON statements(period);
CREATE INDEX IF NOT EXISTS idx_statements_generated_at ON statements(generated_at);
CREATE INDEX IF NOT EXISTS idx_statements_status ON statements(status);

-- Create composite index for common queries
CREATE INDEX IF NOT EXISTS idx_statements_investor_period ON statements(investor_id, period);

-- Add RLS policies for security
ALTER TABLE statements ENABLE ROW LEVEL SECURITY;

-- Policy: Admins can access all statements
CREATE POLICY "Admins can manage all statements" ON statements
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.is_admin = true
    )
  );

-- Policy: Investors can only view their own statements
CREATE POLICY "Investors can view their own statements" ON statements
  FOR SELECT USING (
    investor_id = auth.uid()
  );

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_statements_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_statements_updated_at_trigger
  BEFORE UPDATE ON statements
  FOR EACH ROW
  EXECUTE FUNCTION update_statements_updated_at();

-- Add helpful comments
COMMENT ON TABLE statements IS 'Tracks generated investor statements with secure storage links';
COMMENT ON COLUMN statements.period IS 'Statement period in YYYY-MM format';
COMMENT ON COLUMN statements.file_path IS 'Path to PDF file in Supabase Storage';
COMMENT ON COLUMN statements.signed_url IS 'Signed URL for secure access to PDF';
COMMENT ON COLUMN statements.expires_at IS 'When the signed URL expires (typically 7 days)';
COMMENT ON COLUMN statements.status IS 'Status of the statement: generated, sent, viewed, expired';
