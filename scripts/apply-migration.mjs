#!/usr/bin/env node
/**
 * Apply migration directly to Supabase using pg package
 */

import pg from 'pg';
import { readFileSync } from 'fs';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Use session mode pooler (port 5432) with database password
// URL-encode special chars in password: @ -> %40
const DATABASE_URL = 'postgresql://postgres.nkfimvovosdehmyyjubn:Douentza2067%40%40@aws-0-us-east-2.pooler.supabase.com:5432/postgres';

const { Client } = pg;

async function applyMigration() {
  const migrationFile = process.argv[2] || 'supabase/migrations/20251206230000_complete_schema_fix.sql';

  console.log(`Reading migration file: ${migrationFile}`);
  const sql = readFileSync(migrationFile, 'utf8');

  // Split into individual statements (simple approach - split on semicolon followed by newline)
  const statements = [];
  let current = '';
  let inDollarQuote = false;
  let dollarTag = '';

  for (const line of sql.split('\n')) {
    const trimmed = line.trim();
    if (trimmed.startsWith('--')) continue; // Skip comments

    // Track dollar-quoted strings (for function bodies)
    const dollarMatch = line.match(/\$([a-zA-Z_]*)\$/);
    if (dollarMatch) {
      if (!inDollarQuote) {
        inDollarQuote = true;
        dollarTag = dollarMatch[0];
      } else if (line.includes(dollarTag)) {
        inDollarQuote = false;
      }
    }

    current += line + '\n';

    // If we're not in a dollar-quoted string and line ends with semicolon
    if (!inDollarQuote && trimmed.endsWith(';')) {
      statements.push(current.trim());
      current = '';
    }
  }
  if (current.trim()) statements.push(current.trim());

  console.log(`Found ${statements.length} statements to execute`);

  console.log('Connecting to database...');
  const client = new Client({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Connected successfully!\n');

    let success = 0;
    let skipped = 0;
    let failed = 0;

    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i];
      if (!stmt || stmt.length < 5) continue;

      const preview = stmt.split('\n')[0].substring(0, 60);

      try {
        await client.query(stmt);
        console.log(`[${i + 1}/${statements.length}] OK: ${preview}...`);
        success++;
      } catch (err) {
        // Handle common "already exists" errors gracefully
        if (err.message.includes('already exists') ||
            err.message.includes('duplicate key') ||
            err.message.includes('does not exist') && stmt.includes('DROP')) {
          console.log(`[${i + 1}/${statements.length}] SKIP (exists): ${preview}...`);
          skipped++;
        } else if (err.message.includes('is not supported for views')) {
          console.log(`[${i + 1}/${statements.length}] SKIP (view): ${preview}...`);
          skipped++;
        } else {
          console.log(`[${i + 1}/${statements.length}] FAIL: ${preview}...`);
          console.log(`   Error: ${err.message}`);
          failed++;
        }
      }
    }

    console.log(`\n=== Summary ===`);
    console.log(`Success: ${success}, Skipped: ${skipped}, Failed: ${failed}`);

    // Mark migration as applied in schema_migrations
    try {
      await client.query(`
        INSERT INTO supabase_migrations.schema_migrations (version, statements_applied)
        VALUES ('20251206230000', ${success})
        ON CONFLICT (version) DO NOTHING
      `);
      console.log('Migration recorded in history.');
    } catch (e) {
      console.log('Note: Could not record in migration history');
    }

    if (failed > 0) {
      console.log('\nWARNING: Some statements failed. Review the output above.');
    } else {
      console.log('\nMigration completed successfully!');
    }

  } catch (err) {
    console.error('Connection error:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

applyMigration().catch(console.error);
