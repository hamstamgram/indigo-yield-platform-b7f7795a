-- Phase 3: Database Cleanup - Deprecate Legacy Tables
-- Mark legacy tables as deprecated and add migration tracking

-- Add deprecation notice to legacy positions table
COMMENT ON TABLE positions IS 'DEPRECATED: This table is deprecated in favor of investor_positions for native token fund management. Use investor_positions for all new development.';

-- Add deprecation notice to legacy yield_sources table  
COMMENT ON TABLE yield_sources IS 'DEPRECATED: This table is deprecated. Yield calculation is now handled through the investor_positions and daily_yield_applications tables.';

-- Create a migration tracking table to document the transition
CREATE TABLE IF NOT EXISTS legacy_system_migration (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name TEXT NOT NULL,
    migration_status TEXT NOT NULL DEFAULT 'deprecated',
    deprecated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    migration_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on migration tracking table
ALTER TABLE legacy_system_migration ENABLE ROW LEVEL SECURITY;

-- Add RLS policy for admins only
CREATE POLICY "Admins can manage migration tracking"
ON legacy_system_migration
FOR ALL
USING (is_admin_v2())
WITH CHECK (is_admin_v2());

-- Record the deprecation of legacy tables
INSERT INTO legacy_system_migration (table_name, migration_status, migration_notes) VALUES
('positions', 'deprecated', 'Legacy USD-based position tracking. Replaced by investor_positions with native token support.'),
('yield_sources', 'deprecated', 'Legacy yield calculation data. Replaced by daily_yield_applications and fund-based yield distribution.');

-- Add helpful views for migration tracking
CREATE OR REPLACE VIEW legacy_migration_status AS
SELECT 
    table_name,
    migration_status,
    deprecated_at,
    migration_notes,
    CASE 
        WHEN table_name = 'positions' THEN (SELECT COUNT(*) FROM positions)
        WHEN table_name = 'yield_sources' THEN (SELECT COUNT(*) FROM yield_sources)
        ELSE 0 
    END as record_count
FROM legacy_system_migration
ORDER BY deprecated_at DESC;