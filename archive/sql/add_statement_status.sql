-- Add status column to statements for workflow control
ALTER TABLE public.statements 
ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'published' 
CHECK (status IN ('draft', 'published', 'archived'));

-- Add index for faster filtering by status
CREATE INDEX IF NOT EXISTS idx_statements_status ON public.statements(status);

-- Verify
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'statements' AND column_name = 'status';
