/**
 * Storage Service
 * Handles file uploads to Supabase storage
 */

import { supabase } from "@/integrations/supabase/client";

export interface UploadResult {
  publicUrl: string;
}

/**
 * Upload a fund logo to branding-assets bucket
 */
export async function uploadFundLogo(file: File): Promise<UploadResult> {
  const fileExt = file.name.split(".").pop();
  const fileName = `fund-logo-${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${fileExt}`;
  const filePath = `fund-logos/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from("branding-assets")
    .upload(filePath, file, {
      cacheControl: "3600",
      upsert: false,
    });

  if (uploadError) throw uploadError;

  const {
    data: { publicUrl },
  } = supabase.storage.from("branding-assets").getPublicUrl(filePath);

  return { publicUrl };
}

/**
 * Upload a user avatar to branding-assets bucket
 * Upserts so re-uploading replaces the previous avatar.
 */
export async function uploadAvatar(userId: string, file: File): Promise<UploadResult> {
  const fileExt = file.name.split(".").pop();
  const filePath = `avatars/${userId}.${fileExt}`;

  const { error: uploadError } = await supabase.storage
    .from("branding-assets")
    .upload(filePath, file, {
      cacheControl: "3600",
      upsert: true,
    });

  if (uploadError) throw uploadError;

  const {
    data: { publicUrl },
  } = supabase.storage.from("branding-assets").getPublicUrl(filePath);

  // Append cache-buster so browsers pick up the new image
  return { publicUrl: `${publicUrl}?t=${Date.now()}` };
}

export const storageService = {
  uploadFundLogo,
  uploadAvatar,
};
