-- Phase 4: Move remaining extensions from public to extensions schema
-- This improves security by isolating extension functions from user-defined code

-- Move pg_trgm extension to extensions schema
ALTER EXTENSION pg_trgm SET SCHEMA extensions;

-- Move btree_gin extension to extensions schema  
ALTER EXTENSION btree_gin SET SCHEMA extensions;

-- Grant usage on extensions schema to authenticated users (required for extension functions)
GRANT USAGE ON SCHEMA extensions TO authenticated;
GRANT USAGE ON SCHEMA extensions TO anon;

-- Add comment documenting the schema purpose
COMMENT ON SCHEMA extensions IS 'Dedicated schema for PostgreSQL extensions to isolate them from user-defined objects in public schema';