#!/usr/bin/env node

/**
 * Clean up storage files for fresh testing
 * This removes all files from the statements bucket
 */

import { createServiceClient } from '../utils/supabaseClient.js';

const supabase = createServiceClient();

async function cleanupStorage() {
  console.log('🧹 Cleaning up storage files for fresh testing...');
  
  try {
    // List all files in statements bucket
    const { data: files, error: listError } = await supabase.storage
      .from('statements')
      .list('', { limit: 100 });
    
    if (listError) {
      console.error('❌ Error listing files:', listError);
      return;
    }
    
    if (!files || files.length === 0) {
      console.log('✅ No files to clean up');
      return;
    }
    
    console.log(`📋 Found ${files.length} files to remove`);
    
    // Remove all files
    const filePaths = files.map(file => file.name);
    const { error: deleteError } = await supabase.storage
      .from('statements')
      .remove(filePaths);
    
    if (deleteError) {
      console.error('❌ Error removing files:', deleteError);
    } else {
      console.log(`✅ Removed ${filePaths.length} files from storage`);
    }
    
  } catch (error) {
    console.error('❌ Cleanup error:', error.message);
  }
}

// Run cleanup
cleanupStorage();
