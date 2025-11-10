import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://nkfimvovosdehmyyjubn.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5rZmltdm92b3NkZWhteXlqdWJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY0NTQ1OTgsImV4cCI6MjA2MjAzMDU5OH0.pZrIyCCd7dlvvNMGdW8-71BxSVfoKhxs9a5Ezbkmjgg';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function resetPassword() {
  console.log('🔐 Resetting password for hammadou@indigo.fund...\n');

  try {
    const { data, error } = await supabase.functions.invoke('set-user-password', {
      body: {
        email: 'hammadou@indigo.fund',
        password: 'Boboba1967'
      }
    });

    if (error) {
      console.error('❌ Error:', error);
      return;
    }

    console.log('✅ Success:', data);
    console.log('\n🎉 Password has been reset to: Boboba1967');
    console.log('You can now login with:');
    console.log('  Email: hammadou@indigo.fund');
    console.log('  Password: Boboba1967');
  } catch (error) {
    console.error('❌ Exception:', error);
  }
}

resetPassword();
