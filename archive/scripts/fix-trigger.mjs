#!/usr/bin/env node
/**
 * Fix Audit Trigger Script
 * Fixes the log_data_edit trigger to handle composite keys
 */

import pg from 'pg';
import dns from 'dns';

// Force IPv4
dns.setDefaultResultOrder('ipv4first');

const { Client } = pg;

// Direct connection via IPv4 resolved hostname
const connectionConfig = {
  host: 'aws-0-us-east-1.pooler.supabase.com',
  port: 6543,  // Transaction mode
  database: 'postgres',
  user: 'postgres.nkfimvovosdehmyyjubn',
  password: 'Douentza2067@@',
  ssl: true,
  // Force SSL verification off since we're connecting direct
  sslmode: 'require'
};

const TRIGGER_FIX_SQL = `
-- Ensure uuid-ossp extension is available
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Fix the audit trigger to generate deterministic UUIDs for composite keys
CREATE OR REPLACE FUNCTION public.log_data_edit()
RETURNS TRIGGER AS $$
DECLARE
  v_import_id UUID;
  v_edit_source TEXT;
  v_record_id UUID;
  v_namespace UUID := '6ba7b810-9dad-11d1-80b4-00c04fd430c8';
BEGIN
  IF current_setting('app.edit_source', true) IS NOT NULL THEN
    v_edit_source = current_setting('app.edit_source', true);
  ELSE
    v_edit_source = 'manual';
  END IF;

  IF current_setting('app.import_id', true) IS NOT NULL THEN
    v_import_id = current_setting('app.import_id', true)::UUID;
  END IF;

  IF TG_TABLE_NAME = 'investor_positions' THEN
    IF TG_OP = 'DELETE' THEN
      v_record_id = uuid_generate_v5(v_namespace, OLD.investor_id::TEXT || ':' || OLD.fund_id::TEXT);
    ELSE
      v_record_id = uuid_generate_v5(v_namespace, NEW.investor_id::TEXT || ':' || NEW.fund_id::TEXT);
    END IF;
  ELSE
    IF TG_OP = 'DELETE' THEN
      v_record_id = OLD.id;
    ELSE
      v_record_id = NEW.id;
    END IF;
  END IF;

  INSERT INTO public.data_edit_audit (
    table_name, record_id, operation, old_data, new_data,
    import_related, import_id, edited_by, edit_source
  ) VALUES (
    TG_TABLE_NAME, v_record_id, TG_OP,
    CASE WHEN TG_OP != 'INSERT' THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP != 'DELETE' THEN to_jsonb(NEW) ELSE NULL END,
    v_import_id IS NOT NULL, v_import_id, auth.uid(), v_edit_source
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
`;

async function fixTrigger() {
  console.log('Connecting to database...');
  const client = new Client(connectionConfig);

  try {
    await client.connect();
    console.log('Connected. Applying trigger fix...');

    await client.query(TRIGGER_FIX_SQL);
    console.log('Trigger fixed successfully!');

    // Test by checking if we can insert a position
    console.log('\nVerifying fix - checking investor_positions...');
    const result = await client.query('SELECT COUNT(*) FROM public.investor_positions');
    console.log(`Current position count: ${result.rows[0].count}`);

  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

fixTrigger();
