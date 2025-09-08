/**
 * PDF generation and Supabase Storage service
 * Handles secure statement distribution with signed URLs
 */

import puppeteer from 'puppeteer';
import { createServiceClient } from './supabaseClient.js';
import { sanitizeInput } from './validation.js';

const supabase = createServiceClient();

/**
 * Generate PDF from HTML content
 * @param {string} html - HTML content to convert to PDF
 * @param {object} options - PDF generation options
 * @returns {Buffer} PDF buffer
 */
export async function generatePDF(html, options = {}) {
  const {
    format = 'A4',
    margin = {
      top: '20mm',
      right: '20mm',
      bottom: '20mm',
      left: '20mm'
    },
    printBackground = true,
    preferCSSPageSize = true
  } = options;

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });

    // Generate PDF buffer
    const pdfBuffer = await page.pdf({
      format,
      margin,
      printBackground,
      preferCSSPageSize
    });

    return pdfBuffer;

  } catch (error) {
    throw new Error(`PDF generation failed: ${error.message}`);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

/**
 * Upload file to Supabase Storage with proper security
 * @param {Buffer} fileBuffer - File content as buffer
 * @param {string} fileName - Name for the file
 * @param {string} bucket - Storage bucket name
 * @param {object} metadata - File metadata
 * @returns {object} Upload result with path and signed URL
 */
export async function uploadToStorage(fileBuffer, fileName, bucket = 'statements', metadata = {}) {
  try {
    // Sanitize filename to prevent path traversal
    const sanitizedFileName = sanitizeInput(fileName.replace(/[^a-zA-Z0-9._-]/g, '_'), 100);
    
    if (!sanitizedFileName) {
      throw new Error('Invalid filename after sanitization');
    }

    // Create folder structure by date for organization
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const folderPath = `${year}/${month}`;
    const fullPath = `${folderPath}/${sanitizedFileName}`;

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(fullPath, fileBuffer, {
        contentType: 'application/pdf',
        metadata: {
          ...metadata,
          uploadedAt: now.toISOString(),
          version: '1.0'
        }
      });

    if (error) {
      throw new Error(`Storage upload failed: ${error.message}`);
    }

    // Generate signed URL for secure access (valid for 7 days)
    const { data: signedUrlData, error: urlError } = await supabase.storage
      .from(bucket)
      .createSignedUrl(fullPath, 604800); // 7 days in seconds

    if (urlError) {
      console.warn('Warning: Failed to generate signed URL:', urlError.message);
      return {
        success: true,
        path: fullPath,
        publicUrl: null,
        signedUrl: null
      };
    }

    return {
      success: true,
      path: fullPath,
      publicUrl: data?.fullPath,
      signedUrl: signedUrlData?.signedUrl
    };

  } catch (error) {
    throw new Error(`File upload failed: ${error.message}`);
  }
}

/**
 * Generate and upload statement as PDF
 * @param {string} html - Statement HTML content
 * @param {object} investor - Investor data
 * @param {string} period - Statement period
 * @returns {object} Upload result with signed URL
 */
export async function generateAndUploadStatement(html, investor, period) {
  try {
    // Generate PDF from HTML
    const pdfBuffer = await generatePDF(html, {
      format: 'A4',
      margin: {
        top: '15mm',
        right: '15mm',
        bottom: '15mm',
        left: '15mm'
      }
    });

    // Create filename
    const sanitizedName = `${investor.first_name}_${investor.last_name}`.replace(/\s+/g, '_');
    const fileName = `${sanitizedName}_statement_${period.replace(/\s+/g, '_')}.pdf`;

    // Upload to storage
    const uploadResult = await uploadToStorage(pdfBuffer, fileName, 'statements', {
      investorId: investor.id,
      investorName: `${investor.first_name} ${investor.last_name}`,
      period: period,
      type: 'monthly_statement'
    });

    return {
      ...uploadResult,
      fileName,
      fileSize: pdfBuffer.length
    };

  } catch (error) {
    throw new Error(`Statement upload failed: ${error.message}`);
  }
}

/**
 * Generate signed URL for existing file
 * @param {string} filePath - Path to file in storage
 * @param {string} bucket - Storage bucket name
 * @param {number} expiresIn - URL expiry time in seconds (default: 7 days)
 * @returns {string} Signed URL
 */
export async function generateSignedUrl(filePath, bucket = 'statements', expiresIn = 604800) {
  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(filePath, expiresIn);

    if (error) {
      throw new Error(`Failed to generate signed URL: ${error.message}`);
    }

    return data.signedUrl;

  } catch (error) {
    throw new Error(`Signed URL generation failed: ${error.message}`);
  }
}

/**
 * List files in storage bucket
 * @param {string} bucket - Storage bucket name
 * @param {string} folder - Folder path to list
 * @param {object} options - List options
 * @returns {array} List of files
 */
export async function listStorageFiles(bucket = 'statements', folder = '', options = {}) {
  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .list(folder, {
        limit: options.limit || 100,
        offset: options.offset || 0,
        sortBy: { column: 'created_at', order: 'desc' }
      });

    if (error) {
      throw new Error(`Failed to list files: ${error.message}`);
    }

    return data || [];

  } catch (error) {
    throw new Error(`File listing failed: ${error.message}`);
  }
}

/**
 * Delete file from storage
 * @param {string} filePath - Path to file in storage
 * @param {string} bucket - Storage bucket name
 * @returns {boolean} Success status
 */
export async function deleteStorageFile(filePath, bucket = 'statements') {
  try {
    const { error } = await supabase.storage
      .from(bucket)
      .remove([filePath]);

    if (error) {
      throw new Error(`Failed to delete file: ${error.message}`);
    }

    return true;

  } catch (error) {
    throw new Error(`File deletion failed: ${error.message}`);
  }
}

/**
 * Check if storage bucket exists and is accessible
 * @param {string} bucket - Storage bucket name
 * @returns {boolean} Accessibility status
 */
export async function checkStorageAccess(bucket = 'statements') {
  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .list('', { limit: 1 });

    return !error;

  } catch (error) {
    console.warn(`Storage access check failed for bucket '${bucket}':`, error.message);
    return false;
  }
}
