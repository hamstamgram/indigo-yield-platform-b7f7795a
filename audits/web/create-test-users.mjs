import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase configuration. Please check your .env.local file.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Test users configuration
const testUsers = [
  {
    email: 'test.investor@audit.indigo.com',
    password: 'AuditTest123!',
    metadata: {
      first_name: 'Test',
      last_name: 'Investor',
      role: 'investor'
    }
  },
  {
    email: 'test.admin@audit.indigo.com',
    password: 'AuditAdmin123!',
    metadata: {
      first_name: 'Test',
      last_name: 'Admin',
      role: 'admin'
    }
  }
];

async function createTestUsers() {
  console.log('Creating test users for audit...\n');
  
  for (const user of testUsers) {
    try {
      console.log(`Creating ${user.email}...`);
      
      // Create user
      const { data, error } = await supabase.auth.admin.createUser({
        email: user.email,
        password: user.password,
        email_confirm: true,
        user_metadata: user.metadata
      });
      
      if (error) {
        console.error(`Error creating ${user.email}:`, error.message);
        continue;
      }
      
      console.log(`✓ Created ${user.email}`);
      
      // Set role in profiles table if needed
      if (data?.user?.id) {
        const { error: profileError } = await supabase
          .from('profiles')
          .upsert({
            id: data.user.id,
            email: user.email,
            first_name: user.metadata.first_name,
            last_name: user.metadata.last_name,
            role: user.metadata.role,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
          
        if (profileError) {
          console.error(`Error updating profile for ${user.email}:`, profileError.message);
        } else {
          console.log(`✓ Profile updated for ${user.email}`);
        }
      }
      
    } catch (err) {
      console.error(`Failed to create ${user.email}:`, err);
    }
  }
  
  console.log('\n========================================');
  console.log('Test Users Created:');
  console.log('========================================');
  testUsers.forEach(user => {
    console.log(`\nEmail: ${user.email}`);
    console.log(`Password: ${user.password}`);
    console.log(`Role: ${user.metadata.role}`);
  });
  console.log('\n✓ Test users ready for audit');
  
  // Save credentials to file for reference
  const fs = await import('fs');
  const credentials = testUsers.map(u => ({
    email: u.email,
    password: u.password,
    role: u.metadata.role
  }));
  
  fs.writeFileSync(
    'audits/web/auth/test-credentials.json',
    JSON.stringify(credentials, null, 2)
  );
  console.log('✓ Credentials saved to audits/web/auth/test-credentials.json');
}

createTestUsers().catch(console.error);
