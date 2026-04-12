import { createClient } from '@supabase/supabase-js';

const LOCAL_URL = 'http://127.0.0.1:54321';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

async function rpc(fnName: string, params: Record<string, unknown> = {}): Promise<unknown> {
  const res = await fetch(`${LOCAL_URL}/rest/v1/rpc/${fnName}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      Prefer: 'return=representation',
    },
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`RPC ${fnName} failed (${res.status}): ${text}`);
  }
  return res.json();
}

async function main() {
  const supabase = createClient(LOCAL_URL, SERVICE_KEY);
  
  // Create a test fund
  const fund = await supabase.from('funds').insert({
    code: 'TEST-XRP',
    name: 'Test Fund',
    asset: 'XRP',
    status: 'active',
    inception_date: '2025-01-01',
    fund_class: 'yield',
  }).select().single();
  
  const fundId = fund.data?.id;
  console.log('Fund ID:', fundId);
  
  // Create a test user
  const email = 'test.position@test.local';
  const userRes = await fetch(`${LOCAL_URL}/auth/v1/admin/users`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
    },
    body: JSON.stringify({ email, password: 'Test1234!', email_confirm: true }),
  });
  const user = await userRes.json();
  const userId = user.id;
  console.log('User ID:', userId);
  
  // Create profile
  await supabase.from('profiles').upsert({
    id: userId,
    email,
    first_name: 'Test',
    last_name: 'User',
    role: 'investor',
  });
  
  // Create position
  await supabase.from('investor_positions').insert({
    investor_id: userId,
    fund_id: fundId,
    current_value: 0,
    cost_basis: 0,
    shares: 0,
    is_active: true,
  });
  
  // Set fee schedule
  await supabase.from('investor_fee_schedule').insert({
    investor_id: userId,
    fund_id: fundId,
    fee_pct: 16,
    effective_date: '2024-01-01',
  });
  
  // Get position before
  const posBefore = await supabase.from('investor_positions')
    .select('*')
    .eq('investor_id', userId)
    .eq('fund_id', fundId)
    .single();
  console.log('\nPosition BEFORE RPC:', posBefore.data);
  
  // Apply transaction
  console.log('\nCalling apply_investor_transaction...');
  const result = await rpc('apply_investor_transaction', {
    p_admin_id: '00000000-0000-0000-0000-000000000001',
    p_amount: 1000,
    p_fund_id: fundId,
    p_investor_id: userId,
    p_reference_id: 'test-tx-1',
    p_tx_date: '2025-01-15',
    p_tx_type: 'deposit',
  });
  console.log('RPC Result:', JSON.stringify(result, null, 2));
  
  // Get position after
  const posAfter = await supabase.from('investor_positions')
    .select('*')
    .eq('investor_id', userId)
    .eq('fund_id', fundId)
    .single();
  console.log('\nPosition AFTER RPC:', posAfter.data);
  
  // Check transactions table
  const txns = await supabase.from('transactions_v2')
    .select('*')
    .eq('investor_id', userId);
  console.log('\nTransactions:', txns.data);
}

main().catch(console.error);
