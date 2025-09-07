#!/usr/bin/env node

import fetch from 'node-fetch';
import fs from 'fs';

const PROJECT_REF = 'nkfimvovosdehmyyjubn';
const SQL_FILE = 'FIX_RLS_NOW.sql';

// Read the SQL file
const sql = fs.readFileSync(SQL_FILE, 'utf8');

// Get access token from Supabase CLI
const accessToken = fs.readFileSync(`${process.env.HOME}/.supabase/access-token`, 'utf8').trim();

if (!accessToken) {
  console.error('❌ No Supabase access token found. Please run: npx supabase login');
  process.exit(1);
}

console.log('🔧 Executing RLS fix via Supabase Management API...\n');

async function executeSql() {
  try {
    // Use the Supabase Management API to run SQL
    const response = await fetch(
      `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: sql,
          method: 'POST'
        })
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error(`❌ Failed to execute SQL: ${response.status}`);
      console.error(error);
      return false;
    }

    const result = await response.json();
    console.log('✅ SQL executed successfully!');
    console.log('Result:', result);
    return true;

  } catch (error) {
    console.error('❌ Error executing SQL:', error.message);
    return false;
  }
}

// Execute the fix
executeSql().then(success => {
  if (success) {
    console.log('\n🎉 RLS fix applied! Now run: npm run check:services');
  } else {
    console.log('\n❌ Failed to apply fix. You may need to apply it manually in the Supabase dashboard.');
  }
});
