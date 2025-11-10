import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://nkfimvovosdehmyyjubn.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing required environment variable: SUPABASE_SERVICE_ROLE_KEY');
  console.error('   Please set this variable before running the script:');
  console.error('   export SUPABASE_SERVICE_ROLE_KEY=your_service_role_key');
  console.error('');
  console.error('   Get your service role key from:');
  console.error('   https://supabase.com/dashboard/project/nkfimvovosdehmyyjubn/settings/api');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function fixStorageBuckets() {
  console.log('🔧 Fixing storage bucket configuration...\n');
  
  // Update profiles bucket to private
  const { data: updateProfiles, error: updateError } = await supabase.storage
    .updateBucket('profiles', { public: false });
  
  if (updateError) {
    console.log('❌ Error updating profiles bucket:', updateError.message);
  } else {
    console.log('✅ Profiles bucket set to private');
  }
  
  // Create profile-photos bucket if missing
  const { data: createPhotos, error: createError } = await supabase.storage
    .createBucket('profile-photos', { public: false });
  
  if (createError && createError.message.includes('already exists')) {
    console.log('✅ Profile-photos bucket already exists');
  } else if (createError) {
    console.log('❌ Error creating profile-photos bucket:', createError.message);
  } else {
    console.log('✅ Profile-photos bucket created');
  }
  
  console.log('\n✅ Storage configuration complete');
  process.exit(0);
}

fixStorageBuckets();
