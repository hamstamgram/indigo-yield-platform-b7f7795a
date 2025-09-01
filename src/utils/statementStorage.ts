import { createClient } from '@supabase/supabase-js';
import { generateStatementFilename } from './statementPdfGenerator';

// Create a Supabase client with the service role key for admin operations
const supabaseAdmin = createClient(
  'https://nkfimvovosdehmyyjubn.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5rZmltdm92b3NkZWhteXlqdWJuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NjQ1NDU5OCwiZXhwIjoyMDYyMDMwNTk4fQ.2dG7IemW8SVQ7FcEe7Dcv41B7utJy0LtEjZhSMESa1k',
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

export async function uploadStatementToStorage(
  pdfBlob: Blob,
  investor_id: string,
  period_year: number,
  period_month: number
): Promise<{ storage_path: string; signed_url: string } | null> {
  try {
    const filename = generateStatementFilename(investor_id, period_year, period_month);
    const storagePath = `statements/${investor_id}/${period_year}/${filename}`;

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from('statements')
      .upload(storagePath, pdfBlob, {
        contentType: 'application/pdf',
        upsert: true // Overwrite if exists
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      
      // If bucket doesn't exist, create it
      if (uploadError.message?.includes('Bucket not found')) {
        const { error: createError } = await supabaseAdmin.storage.createBucket('statements', {
          public: false, // Private bucket
          fileSizeLimit: 10485760, // 10MB limit
          allowedMimeTypes: ['application/pdf']
        });

        if (createError) {
          console.error('Bucket creation error:', createError);
          return null;
        }

        // Retry upload
        const { data: retryData, error: retryError } = await supabaseAdmin.storage
          .from('statements')
          .upload(storagePath, pdfBlob, {
            contentType: 'application/pdf',
            upsert: true
          });

        if (retryError) {
          console.error('Retry upload error:', retryError);
          return null;
        }
      } else {
        return null;
      }
    }

    // Generate a signed URL (valid for 5 minutes)
    const { data: signedUrlData, error: signedUrlError } = await supabaseAdmin.storage
      .from('statements')
      .createSignedUrl(storagePath, 300); // 5 minutes expiry

    if (signedUrlError) {
      console.error('Signed URL error:', signedUrlError);
      return null;
    }

    return {
      storage_path: storagePath,
      signed_url: signedUrlData.signedUrl
    };
  } catch (error) {
    console.error('Storage error:', error);
    return null;
  }
}

export async function getStatementSignedUrl(storage_path: string): Promise<string | null> {
  try {
    const { data, error } = await supabaseAdmin.storage
      .from('statements')
      .createSignedUrl(storage_path, 300); // 5 minutes expiry

    if (error) {
      console.error('Error creating signed URL:', error);
      return null;
    }

    return data.signedUrl;
  } catch (error) {
    console.error('Error:', error);
    return null;
  }
}

export async function deleteStatement(storage_path: string): Promise<boolean> {
  try {
    const { error } = await supabaseAdmin.storage
      .from('statements')
      .remove([storage_path]);

    if (error) {
      console.error('Delete error:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error:', error);
    return false;
  }
}
