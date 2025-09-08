#!/usr/bin/env node

/**
 * Enhanced statement generator with PDF and storage upload
 * Generates both HTML and PDF statements, uploads to Supabase Storage with signed URLs
 */

import fs from 'fs/promises';
import path from 'path';
import { createServiceClient } from '../../utils/supabaseClient.js';
import { generateStatementHTML } from '../../templates/statementTemplate.js';
import { parseInvestorData, generateStatementFilename, formatStatementDate } from '../../parsers/statementParser.js';
import { validateRequiredFields } from '../../utils/validation.js';
import { 
  generateAndUploadStatement, 
  checkStorageAccess,
  listStorageFiles 
} from '../../utils/storageService.js';

// Initialize secure Supabase client
const supabase = createServiceClient();

/**
 * Fetch investor data from database with error handling
 * @returns {array} Array of investor records
 */
async function fetchInvestors() {
  const { data: investors, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('is_admin', false)
    .order('first_name');
  
  if (error) {
    throw new Error(`Failed to fetch investors: ${error.message}`);
  }
  
  return investors || [];
}

/**
 * Fetch position data for a specific investor
 * @param {string} investorId - Investor ID
 * @returns {array} Array of position records
 */
async function fetchInvestorPositions(investorId) {
  const { data: positions, error } = await supabase
    .from('positions')
    .select('*')
    .eq('investor_id', investorId);
  
  if (error) {
    throw new Error(`Failed to fetch positions: ${error.message}`);
  }
  
  return positions || [];
}

/**
 * Save statement record to database for tracking
 * @param {object} statementData - Statement metadata
 * @returns {object} Created statement record
 */
async function saveStatementRecord(statementData) {
  const { data, error } = await supabase
    .from('statements')
    .insert({
      investor_id: statementData.investorId,
      period: statementData.period,
      file_path: statementData.filePath,
      signed_url: statementData.signedUrl,
      file_size: statementData.fileSize,
      generated_at: new Date().toISOString(),
      status: 'generated'
    })
    .select()
    .single();

  if (error) {
    console.warn(`Failed to save statement record: ${error.message}`);
    return null;
  }

  return data;
}

/**
 * Main function to generate statements with storage upload
 */
async function generateStatementsWithStorage() {
  console.log('📊 Generating Investor Statements with PDF & Storage Upload\n');
  
  try {
    // Check storage access first
    console.log('🔍 Checking storage access...');
    const storageAccessible = await checkStorageAccess('statements');
    
    if (!storageAccessible) {
      console.warn('⚠️  Storage access check failed - will generate HTML only');
    } else {
      console.log('✅ Storage access confirmed');
    }
    
    // Fetch all investors
    const investors = await fetchInvestors();
    console.log(`📦 Found ${investors.length} investors\n`);
    
    if (investors.length === 0) {
      console.log('⚠️  No investors found');
      return;
    }
    
    // Create local statements directory for HTML backup
    const statementsDir = path.join(process.cwd(), 'statements');
    const monthDir = path.join(statementsDir, '2025_09');
    await fs.mkdir(monthDir, { recursive: true });
    
    // Generate period end date
    const currentDate = new Date();
    const periodEnd = formatStatementDate(currentDate);
    const periodKey = `2025-09`; // Used for database storage
    
    let generatedCount = 0;
    let uploadedCount = 0;
    const errors = [];
    const uploadResults = [];
    
    console.log('📄 Processing statements...\n');
    
    for (const investor of investors) {
      try {
        // Validate investor data
        const validation = validateRequiredFields(investor, ['id', 'first_name', 'last_name']);
        if (!validation.isValid) {
          console.log(`⚠️  Skipping ${investor.first_name || 'Unknown'} ${investor.last_name || 'Investor'}: ${validation.error}`);
          continue;
        }
        
        // Fetch positions for this investor
        const positions = await fetchInvestorPositions(investor.id);
        
        if (!positions || positions.length === 0) {
          console.log(`⚠️  No positions for ${investor.first_name} ${investor.last_name}`);
          continue;
        }
        
        // Parse and process data
        const statementData = parseInvestorData(investor, positions);
        
        // Generate HTML statement
        const html = generateStatementHTML(investor, positions, periodEnd);
        
        // Save HTML backup locally
        const htmlFileName = generateStatementFilename(investor, generatedCount + 1);
        const htmlFilePath = path.join(monthDir, htmlFileName);
        await fs.writeFile(htmlFilePath, html, 'utf-8');
        
        console.log(`✅ HTML: ${htmlFileName}`);
        generatedCount++;
        
        // Generate PDF and upload to storage (if accessible)
        if (storageAccessible) {
          try {
            const uploadResult = await generateAndUploadStatement(html, investor, periodKey);
            
            if (uploadResult.success && uploadResult.signedUrl) {
              console.log(`📤 PDF: ${uploadResult.fileName} (${Math.round(uploadResult.fileSize / 1024)}KB)`);
              console.log(`🔗 URL: ${uploadResult.signedUrl.substring(0, 60)}...`);
              
              // Save statement record to database
              const statementRecord = await saveStatementRecord({
                investorId: investor.id,
                period: periodKey,
                filePath: uploadResult.path,
                signedUrl: uploadResult.signedUrl,
                fileSize: uploadResult.fileSize
              });
              
              uploadResults.push({
                investor: `${investor.first_name} ${investor.last_name}`,
                fileName: uploadResult.fileName,
                signedUrl: uploadResult.signedUrl,
                recordId: statementRecord?.id
              });
              
              uploadedCount++;
            } else {
              console.log(`⚠️  PDF upload failed for ${investor.first_name} ${investor.last_name}`);
            }
          } catch (uploadError) {
            console.error(`❌ PDF upload error for ${investor.first_name} ${investor.last_name}: ${uploadError.message}`);
            errors.push(`PDF upload failed for ${investor.first_name} ${investor.last_name}: ${uploadError.message}`);
          }
        }
        
        console.log(); // Add spacing between investors
        
      } catch (error) {
        const errorMsg = `Failed to generate statement for ${investor.first_name} ${investor.last_name}: ${error.message}`;
        console.error(`❌ ${errorMsg}`);
        errors.push(errorMsg);
      }
    }
    
    // Summary
    console.log('========================================');
    console.log('📊 Statement Generation Summary:');
    console.log(`✅ Generated ${generatedCount} HTML statements`);
    if (storageAccessible) {
      console.log(`📤 Uploaded ${uploadedCount} PDF statements to storage`);
    }
    if (errors.length > 0) {
      console.log(`❌ Failed ${errors.length} statements`);
    }
    console.log(`📁 HTML saved to: ${monthDir}`);
    console.log('========================================\n');
    
    // Display upload results for admin reference
    if (uploadResults.length > 0) {
      console.log('🔗 Generated Signed URLs (valid for 7 days):');
      console.log('='.repeat(50));
      
      for (const result of uploadResults.slice(0, 5)) { // Show first 5 for brevity
        console.log(`📄 ${result.investor}`);
        console.log(`   File: ${result.fileName}`);
        console.log(`   URL:  ${result.signedUrl.substring(0, 80)}...`);
        console.log();
      }
      
      if (uploadResults.length > 5) {
        console.log(`... and ${uploadResults.length - 5} more statements`);
      }
      
      console.log('\n⚠️  SECURITY: These URLs contain sensitive financial data.');
      console.log('   • Only share URLs directly with the respective investor');
      console.log('   • URLs expire in 7 days for security');
      console.log('   • Never include URLs in emails - use them in secure portals only');
    }
    
    // Show instructions for HTML viewing
    if (generatedCount > 0) {
      console.log('\n📝 To view HTML statements:');
      console.log(`   1. Open finder: open ${monthDir}`);
      console.log('   2. Double-click any HTML file to view in browser');
      console.log('   3. Use browser Print → Save as PDF for manual PDF generation');
    }
    
    // Show errors if any
    if (errors.length > 0) {
      console.log('\n❌ Errors encountered:');
      errors.forEach(error => console.log(`   • ${error}`));
    }
    
  } catch (error) {
    console.error('❌ Fatal error:', error.message);
    process.exit(1);
  }
}

// Run the enhanced generator
generateStatementsWithStorage();
