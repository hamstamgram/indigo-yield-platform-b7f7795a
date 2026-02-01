import { supabase } from "@/integrations/supabase/client";
import { generateStatementFilename } from "./statementPdfGenerator";
import { logError } from "@/lib/logger";

// IMPORTANT: Statement operations must be done server-side with service role key.
// On Lovable/production, use an Edge Function to generate a signed URL and upload there.

export async function uploadStatementToStorage(
  pdfBlob: Blob,
  investor_id: string,
  period_year: number,
  period_month: number
): Promise<{ storage_path: string; signed_url: string } | null> {
  // Block direct client uploads in production to avoid anon-key misuse.
  if (import.meta.env.PROD) {
    logError(
      "statementStorage.uploadStatementToStorage",
      new Error(
        "Called in production; route this through an Edge Function with the service role key."
      )
    );
    return null;
  }

  try {
    const filename = generateStatementFilename(investor_id, period_year, period_month);
    const storagePath = `statements/${investor_id}/${period_year}/${filename}`;

    // SECURITY: This should be called from a backend/Edge Function only
    // For now, using client with proper RLS policies
    const { error: uploadError } = await supabase.storage
      .from("statements")
      .upload(storagePath, pdfBlob, {
        contentType: "application/pdf",
        upsert: true, // Overwrite if exists
      });

    if (uploadError) {
      logError("statementStorage.uploadStatementToStorage", uploadError);

      // If bucket doesn't exist, create it
      if (uploadError.message?.includes("Bucket not found")) {
        const { error: createError } = await supabase.storage.createBucket("statements", {
          public: false, // Private bucket
          fileSizeLimit: 10485760, // 10MB limit
          allowedMimeTypes: ["application/pdf"],
        });

        if (createError) {
          logError("statementStorage.uploadStatementToStorage", createError, {
            step: "bucketCreation",
          });
          return null;
        }

        // Retry upload
        const { error: retryError } = await supabase.storage
          .from("statements")
          .upload(storagePath, pdfBlob, {
            contentType: "application/pdf",
            upsert: true,
          });

        if (retryError) {
          logError("statementStorage.uploadStatementToStorage", retryError, {
            step: "retryUpload",
          });
          return null;
        }
      } else {
        return null;
      }
    }

    // Generate a signed URL (valid for 5 minutes)
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from("statements")
      .createSignedUrl(storagePath, 300); // 5 minutes expiry

    if (signedUrlError) {
      logError("statementStorage.uploadStatementToStorage", signedUrlError, { step: "signedUrl" });
      return null;
    }

    return {
      storage_path: storagePath,
      signed_url: signedUrlData.signedUrl,
    };
  } catch (error) {
    logError("statementStorage.uploadStatementToStorage", error);
    return null;
  }
}

export async function getStatementSignedUrl(storage_path: string): Promise<string | null> {
  try {
    const { data, error } = await supabase.storage
      .from("statements")
      .createSignedUrl(storage_path, 300); // 5 minutes expiry

    if (error) {
      logError("statementStorage.getStatementSignedUrl", error);
      return null;
    }

    return data.signedUrl;
  } catch (error) {
    logError("statementStorage.getStatementSignedUrl", error);
    return null;
  }
}

export async function deleteStatement(storage_path: string): Promise<boolean> {
  if (import.meta.env.PROD) {
    logError(
      "statementStorage.deleteStatement",
      new Error("Disabled in production; use a backend/Edge Function.")
    );
    return false;
  }

  try {
    const { error } = await supabase.storage.from("statements").remove([storage_path]);

    if (error) {
      logError("statementStorage.deleteStatement", error);
      return false;
    }

    return true;
  } catch (error) {
    logError("statementStorage.deleteStatement", error);
    return false;
  }
}
