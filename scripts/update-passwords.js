#!/usr/bin/env node

/**
 * Script to update user passwords using the set-user-password edge function
 */

const fetch = require('node-fetch');

const SUPABASE_URL = 'https://nkfimvovosdehmyyjubn.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5rZmltdm92b3NkZWhteXlqdWJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY0NTQ1OTgsImV4cCI6MjA2MjAzMDU5OH0.pZrIyCCd7dlvvNMGdW8-71BxSVfoKhxs9a5Ezbkmjgg';

async function updatePassword(email, password) {
  console.log(`Updating password for ${email}...`);
  
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/set-user-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify({
        email: email,
        password: password
      })
    });

    const result = await response.json();
    
    if (response.ok) {
      console.log(`✅ Success for ${email}:`, result.message);
      return true;
    } else {
      console.error(`❌ Error for ${email}:`, result.error);
      return false;
    }
  } catch (error) {
    console.error(`❌ Network error for ${email}:`, error.message);
    return false;
  }
}

async function main() {
  console.log('🔐 Updating user passwords...\n');
  
  const users = [
    { email: 'h.monoja@protonmail.com', password: 'Indigo555!' },
    { email: 'hammadou@indigo.fund', password: 'Indigo555!' }
  ];

  const results = await Promise.all(
    users.map(user => updatePassword(user.email, user.password))
  );

  const successCount = results.filter(r => r).length;
  console.log(`\n📊 Summary: ${successCount}/${users.length} passwords updated successfully`);
  
  if (successCount === users.length) {
    console.log('🎉 All passwords updated successfully!');
    process.exit(0);
  } else {
    console.log('⚠️  Some password updates failed');
    process.exit(1);
  }
}

main().catch(error => {
  console.error('💥 Script failed:', error);
  process.exit(1);
});