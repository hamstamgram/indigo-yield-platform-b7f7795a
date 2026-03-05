import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
);

async function run() {
  const { data: funds } = await supabase.from('funds').select('id, asset').eq('asset', 'XRP');
  const fundId = funds[0].id;
  
  const { data: investors } = await supabase.from('profiles').select('id').eq('email', 'sam.johnson@indigo.fund');
  const invId = investors[0].id;
  
  console.log("Adding TX for", invId, "in", fundId);
  
  const { data, error } = await supabase.rpc('create_investor_transaction', {
    p_investor_id: invId,
    p_fund_id: fundId,
    p_type: 'DEPOSIT',
    p_amount: 135003,
    p_asset: 'XRP',
    p_tx_date: '2025-11-17',
    p_event_ts: '2025-11-17T00:00:00.000Z',
    p_full_withdrawal: false
  });
  
  console.log("Result:", data);
  console.log("Error:", error);
}
run();
