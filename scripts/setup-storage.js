#!/usr/bin/env node

/**
 * Storage Buckets Setup Script
 * Creates and configures all required storage buckets for IndigoInvestor
 */

import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

// Load environment variables
dotenv.config({ path: ".env.production" });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error("❌ Missing required environment variables:");
  console.error("   SUPABASE_URL:", SUPABASE_URL ? "✅" : "❌");
  console.error("   SUPABASE_SERVICE_ROLE_KEY:", SUPABASE_SERVICE_KEY ? "✅" : "❌");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

/**
 * Bucket configurations
 */
const buckets = [
  {
    name: "documents",
    public: false,
    policies: [
      {
        name: "Users can upload their own documents",
        definition: `
          CREATE POLICY "Users can upload documents"
          ON storage.objects FOR INSERT
          WITH CHECK (
            bucket_id = 'documents' AND
            auth.uid()::text = (storage.foldername(name))[1]
          );
        `,
      },
      {
        name: "Users can view their own documents",
        definition: `
          CREATE POLICY "Users can view own documents"
          ON storage.objects FOR SELECT
          USING (
            bucket_id = 'documents' AND
            auth.uid()::text = (storage.foldername(name))[1]
          );
        `,
      },
      {
        name: "Users can delete their own documents",
        definition: `
          CREATE POLICY "Users can delete own documents"
          ON storage.objects FOR DELETE
          USING (
            bucket_id = 'documents' AND
            auth.uid()::text = (storage.foldername(name))[1]
          );
        `,
      },
      {
        name: "Admins can manage all documents",
        definition: `
          CREATE POLICY "Admins can manage all documents"
          ON storage.objects FOR ALL
          USING (
            bucket_id = 'documents' AND
            EXISTS (
              SELECT 1 FROM profiles
              WHERE profiles.id = auth.uid()
              AND profiles.role = 'admin'
            )
          );
        `,
      },
    ],
  },
  {
    name: "statements",
    public: false,
    policies: [
      {
        name: "Users can view their own statements",
        definition: `
          CREATE POLICY "Users can view own statements"
          ON storage.objects FOR SELECT
          USING (
            bucket_id = 'statements' AND
            auth.uid()::text = (storage.foldername(name))[1]
          );
        `,
      },
      {
        name: "Only admins can upload statements",
        definition: `
          CREATE POLICY "Admins can upload statements"
          ON storage.objects FOR INSERT
          WITH CHECK (
            bucket_id = 'statements' AND
            EXISTS (
              SELECT 1 FROM profiles
              WHERE profiles.id = auth.uid()
              AND profiles.role = 'admin'
            )
          );
        `,
      },
    ],
  },
  {
    name: "profile-images",
    public: true,
    policies: [
      {
        name: "Users can upload their own profile image",
        definition: `
          CREATE POLICY "Users can upload profile image"
          ON storage.objects FOR INSERT
          WITH CHECK (
            bucket_id = 'profile-images' AND
            auth.uid()::text = (storage.foldername(name))[1]
          );
        `,
      },
      {
        name: "Users can update their own profile image",
        definition: `
          CREATE POLICY "Users can update profile image"
          ON storage.objects FOR UPDATE
          USING (
            bucket_id = 'profile-images' AND
            auth.uid()::text = (storage.foldername(name))[1]
          );
        `,
      },
      {
        name: "Anyone can view profile images",
        definition: `
          CREATE POLICY "Anyone can view profile images"
          ON storage.objects FOR SELECT
          USING (bucket_id = 'profile-images');
        `,
      },
    ],
  },
  {
    name: "branding-assets",
    public: true,
    policies: [
      {
        name: "Only admins can manage branding assets",
        definition: `
          CREATE POLICY "Admins manage branding"
          ON storage.objects FOR ALL
          USING (
            bucket_id = 'branding-assets' AND
            EXISTS (
              SELECT 1 FROM profiles
              WHERE profiles.id = auth.uid()
              AND profiles.role = 'admin'
            )
          );
        `,
      },
      {
        name: "Public can view branding assets",
        definition: `
          CREATE POLICY "Public view branding"
          ON storage.objects FOR SELECT
          USING (bucket_id = 'branding-assets');
        `,
      },
    ],
  },
  {
    name: "pdf-fonts",
    public: false,
    policies: [
      {
        name: "Only system can access fonts",
        definition: `
          CREATE POLICY "System access fonts"
          ON storage.objects FOR SELECT
          USING (
            bucket_id = 'pdf-fonts' AND
            auth.uid() IS NOT NULL
          );
        `,
      },
    ],
  },
];

/**
 * Create a storage bucket
 */
async function createBucket(bucket) {
  console.log(`\n📦 Creating bucket: ${bucket.name}`);

  try {
    // Check if bucket exists
    const { data: existingBuckets, error: listError } = await supabase.storage.listBuckets();

    if (listError) {
      throw listError;
    }

    const exists = existingBuckets?.some((b) => b.name === bucket.name);

    if (exists) {
      console.log(`   ⚠️  Bucket '${bucket.name}' already exists`);
    } else {
      // Create bucket
      const { data, error } = await supabase.storage.createBucket(bucket.name, {
        public: bucket.public,
        fileSizeLimit: 52428800, // 50MB
        allowedMimeTypes:
          bucket.name === "profile-images"
            ? ["image/jpeg", "image/png", "image/webp"]
            : bucket.name === "pdf-fonts"
              ? ["font/ttf", "font/otf", "font/woff", "font/woff2"]
              : ["application/pdf", "image/jpeg", "image/png"],
      });

      if (error) {
        throw error;
      }

      console.log(`   ✅ Bucket '${bucket.name}' created successfully`);
    }

    // Note: Policies should be applied via SQL migrations
    console.log(`   📋 Policies should be applied via SQL migrations`);

    return true;
  } catch (error) {
    console.error(`   ❌ Failed to create bucket '${bucket.name}':`, error.message);
    return false;
  }
}

/**
 * Main setup function
 */
async function setupStorage() {
  console.log("🚀 IndigoInvestor Storage Setup");
  console.log("================================");
  console.log(`📍 Supabase URL: ${SUPABASE_URL}`);

  let successCount = 0;
  let failCount = 0;

  for (const bucket of buckets) {
    const success = await createBucket(bucket);
    if (success) {
      successCount++;
    } else {
      failCount++;
    }
  }

  console.log("\n📊 Summary");
  console.log("==========");
  console.log(`✅ Successful: ${successCount}`);
  console.log(`❌ Failed: ${failCount}`);

  if (failCount === 0) {
    console.log("\n🎉 All storage buckets configured successfully!");

    // Print SQL for policies
    console.log("\n📋 SQL Policies to Apply:");
    console.log("========================");

    for (const bucket of buckets) {
      console.log(`\n-- Policies for bucket: ${bucket.name}`);
      for (const policy of bucket.policies) {
        console.log(`-- ${policy.name}`);
        console.log(policy.definition);
      }
    }
  } else {
    console.log("\n⚠️  Some buckets failed to create. Please check the errors above.");
    process.exit(1);
  }
}

// Run setup
setupStorage().catch((error) => {
  console.error("❌ Setup failed:", error);
  process.exit(1);
});
