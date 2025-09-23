import { supabase } from '../src/integrations/supabase/client';

/**
 * Update passwords for specific users
 */
async function updateUserPasswords() {
  console.log('🔐 Updating user passwords...\n');

  const users = [
    { email: 'h.monoja@protonmail.com', password: 'Indigo555!' },
    { email: 'hammadou@indigo.fund', password: 'Indigo555!' }
  ];

  for (const user of users) {
    console.log(`Updating password for ${user.email}...`);
    
    try {
      const { data, error } = await supabase.functions.invoke('set-user-password', {
        body: {
          email: user.email,
          password: user.password
        }
      });

      if (error) {
        console.error(`❌ Error for ${user.email}:`, error);
      } else {
        console.log(`✅ Success for ${user.email}:`, data);
      }
    } catch (error) {
      console.error(`❌ Exception for ${user.email}:`, error);
    }
  }

  console.log('\n✨ Password update process completed');
}

// Run the function
updateUserPasswords().catch(console.error);