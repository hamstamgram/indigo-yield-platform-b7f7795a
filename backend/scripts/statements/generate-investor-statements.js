#!/usr/bin/env node

import fs from 'fs/promises';
import path from 'path';
import { createServiceClient } from '../../utils/supabaseClient.js';
import { generateStatementHTML } from '../../templates/statementTemplate.js';
import { parseInvestorData, generateStatementFilename, formatStatementDate } from '../../parsers/statementParser.js';
import { validateRequiredFields } from '../../utils/validation.js';

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
 * Main function to generate investor statements
 */
async function generateStatements() {
  console.log('📊 Generating Investor Statements\n');
  
  try {
    // Fetch all investors
    const investors = await fetchInvestors();
    console.log(`📦 Found ${investors.length} investors\n`);
    
    if (investors.length === 0) {
      console.log('⚠️  No investors found');
      return;
    }
    
    // Create statements directory
    const statementsDir = path.join(process.cwd(), 'statements');
    const monthDir = path.join(statementsDir, '2025_09');
    await fs.mkdir(monthDir, { recursive: true });
    
    // Generate period end date
    const currentDate = new Date();
    const periodEnd = formatStatementDate(currentDate);
    
    let generatedCount = 0;
    const errors = [];
    
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
        
        // Generate HTML statement using template
        const html = generateStatementHTML(investor, positions, periodEnd);
        
        // Generate filename and save
        const fileName = generateStatementFilename(investor, generatedCount + 1);
        const filePath = path.join(monthDir, fileName);
        
        await fs.writeFile(filePath, html, 'utf-8');
        
        console.log(`✅ Generated: ${fileName}`);
        generatedCount++;
        
      } catch (error) {
        const errorMsg = `Failed to generate statement for ${investor.first_name} ${investor.last_name}: ${error.message}`;
        console.error(`❌ ${errorMsg}`);
        errors.push(errorMsg);
      }
    }
    
    // Summary
    console.log('\n========================================')
    console.log('📊 Statement Generation Summary:');
    console.log(`✅ Generated ${generatedCount} statements`);
    if (errors.length > 0) {
      console.log(`❌ Failed ${errors.length} statements`);
    }
    console.log(`📁 Saved to: ${monthDir}`);
    console.log('========================================\n');
    
    // Show instructions for viewing
    if (generatedCount > 0) {
      console.log('📝 To view statements:');
      console.log(`   1. Open finder: open ${monthDir}`);
      console.log('   2. Double-click any HTML file to view in browser');
      console.log('   3. Use Print → Save as PDF to generate PDF versions\n');
    }
    
    // Show errors if any
    if (errors.length > 0) {
      console.log('❌ Errors encountered:');
      errors.forEach(error => console.log(`   • ${error}`));
      console.log();
    }
    
  } catch (error) {
    console.error('❌ Fatal error:', error.message);
    process.exit(1);
  }
}

// Run the generator
generateStatements();
