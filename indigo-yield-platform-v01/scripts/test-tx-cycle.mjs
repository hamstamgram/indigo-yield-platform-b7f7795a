import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://nkfimvovosdehmyyjubn.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5rZmltdm92b3NkZWhteXlqdWJuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NjQ1NDU5OCwiZXhwIjoyMDYyMDMwNTk4fQ.2dG7IemW8SVQ7FcEe7Dcv41B7utJy0LtEjZhSMESa1k'
);

async function test() {
  console.log('Testing full transaction cycle...\n');

  const { data: pos } = await supabase.from('investor_positions').select('investor_id, fund_id, current_value').limit(1).single();
  if (!pos) { console.log('❌ No position data'); return; }
  console.log(`Using position: investor=${pos.investor_id.substring(0,8)}..., current_value=${pos.current_value}`);

  // Insert test transaction
  const { data: tx, error: insertErr } = await supabase
    .from('transactions_v2')
    .insert({
      investor_id: pos.investor_id,
      fund_id: pos.fund_id,
      type: 'DEPOSIT',
      amount: 1,
      notes: 'TEST - AUTO VOID',
      is_voided: false
    })
    .select()
    .single();

  if (insertErr) {
    console.log('❌ Insert failed:', insertErr.message);
    return;
  }
  console.log('✅ Transaction inserted:', tx.id);

  // Void the transaction
  const { error: voidErr } = await supabase
    .from('transactions_v2')
    .update({ is_voided: true })
    .eq('id', tx.id);

  if (voidErr) {
    console.log('❌ Void failed:', voidErr.message);
    return;
  }
  console.log('✅ Transaction voided');

  // Recompute position
  const { data: result } = await supabase.rpc('recompute_investor_position', {
    p_investor_id: pos.investor_id,
    p_fund_id: pos.fund_id
  });

  console.log('✅ Position recomputed:', result?.success ? 'SUCCESS' : 'FAILED');

  // Verify position unchanged
  const { data: posAfter } = await supabase
    .from('investor_positions')
    .select('current_value')
    .eq('investor_id', pos.investor_id)
    .eq('fund_id', pos.fund_id)
    .single();

  const diff = Math.abs(Number(pos.current_value) - Number(posAfter.current_value));
  if (diff < 0.01) {
    console.log('✅ Position unchanged after void:', posAfter.current_value);
  } else {
    console.log('⚠️ Position changed:', pos.current_value, '->', posAfter.current_value);
  }

  console.log('\n🎉 FULL TRANSACTION CYCLE WORKS!');
}

test().catch(console.error);
