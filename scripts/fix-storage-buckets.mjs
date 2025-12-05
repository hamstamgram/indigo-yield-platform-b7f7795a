import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://nkfimvovosdehmyyjubn.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5rZmltdm92b3NkZWhteXlqdWJuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NjQ1NDU5OCwiZXhwIjoyMDYyMDMwNTk4fQ.2dG7IemW8SVQ7FcEe7Dcv41B7utJy0LtEjZhSMESa1k'
);

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
}

fixStorageBuckets();
