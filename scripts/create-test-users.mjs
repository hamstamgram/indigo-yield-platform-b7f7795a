import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'http://127.0.0.1:54321';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function createTestUser(email, password, isAdmin = false) {
  console.log(`Creating user: ${email} (Admin: ${isAdmin})...`);

  // 1. Create User in Auth
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  let userId;

  if (authError) {
    if (authError.message.includes('already registered') || authError.status === 422) { // 422 is typical for duplicate
       console.log(`User ${email} already exists. Fetching ID...`);
       // There isn't a direct "getUserByEmail" in admin api that is simple, but listUsers works
       const { data: listData, error: listError } = await supabase.auth.admin.listUsers();
       if (listError) {
         console.error('Error listing users:', listError);
         return;
       }
       const existingUser = listData.users.find(u => u.email === email);
       if (existingUser) {
         userId = existingUser.id;
         console.log(`Found existing user ID: ${userId}`);
       } else {
         console.error(`Could not find existing user ${email} despite 'already registered' error.`);
         return;
       }
    } else {
      console.error(`Error creating user ${email}:`, authError);
      return;
    }
  } else {
    userId = authData.user.id;
    console.log(`User created successfully. ID: ${userId}`);
  }

  // 2. Update Profile (is_admin)
  // Profiles are usually created by a trigger on auth.users.
  // We'll try to update it. If it doesn't exist yet (unlikely if sync), we might need to insert/upsert.
  
  if (userId) {
      if (isAdmin) {
          console.log(`Setting is_admin=true for ${email}...`);
          const { error: updateError } = await supabase
            .from('profiles')
            .update({ is_admin: true })
            .eq('id', userId);

          if (updateError) {
              console.error(`Error updating profile for ${email}:`, updateError);
              // Fallback: Try upsert in case trigger failed or didn't fire
              console.log('Attempting upsert in case profile is missing...');
              const { error: upsertError } = await supabase
                  .from('profiles')
                  .upsert({ id: userId, email: email, is_admin: true });
               
              if (upsertError) {
                  console.error(`Error upserting profile for ${email}:`, upsertError);
              } else {
                  console.log(`Profile upserted for ${email}`);
              }
          } else {
              console.log(`Profile updated successfully for ${email}`);
          }
      } else {
          console.log(`User ${email} is a regular investor. No admin update needed.`);
          // Optional: Ensure profile exists
           const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();
            
           if (!profile && !profileError) {
                console.log(`Profile missing for ${email}, creating...`);
                 await supabase.from('profiles').insert({ id: userId, email: email });
           }
      }
  }
}

async function main() {
  try {
    await createTestUser('test-admin@example.com', 'password123', true);
    await createTestUser('test-investor@example.com', 'password123', false);
    console.log('Done!');
  } catch (err) {
    console.error('Unexpected error:', err);
    process.exit(1);
  }
}

main();
