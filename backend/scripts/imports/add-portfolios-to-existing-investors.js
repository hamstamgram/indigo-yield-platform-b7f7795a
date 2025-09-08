#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import XLSX from 'xlsx';
import path from 'path';

// Supabase configuration
const SUPABASE_URL = 'https://nkfimvovosdehmyyjubn.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_SERVICE_KEY) {
  console.error('❌ Please set SUPABASE_SERVICE_ROLE_KEY environment variable');
  process.exit(1);
}

// Create Supabase client with service role key (has admin privileges)
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function addPortfoliosToExistingInvestors() {
  console.log('📊 Adding Portfolios to Existing Investors\n');
  
  try {
    // Read the Excel file
    const filePath = path.join(process.cwd(), 'ops/import/first_run.xlsx');
    console.log('📁 Reading Excel file:', filePath);
    
    const workbook = XLSX.readFile(filePath);
    const investmentsSheet = workbook.Sheets['Investments'];
    
    if (!investmentsSheet) {
      console.error('❌ Could not find "Investments" sheet in Excel file');
      return;
    }
    
    const investmentData = XLSX.utils.sheet_to_json(investmentsSheet);
    console.log(`✅ Found ${investmentData.length} investment records\n`);

    // Get all existing profiles
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .eq('is_admin', false);

    if (profilesError) {
      console.error('❌ Failed to fetch profiles:', profilesError.message);
      return;
    }

    console.log(`📦 Found ${profiles.length} existing investor profiles\n`);

    // Group investments by investor name
    const investmentsByName = {};
    
    for (const row of investmentData) {
      const investorName = row['Investor Name'];
      const currency = row['Currency']?.toUpperCase();
      const amount = parseFloat(row['Amount']) || 0;
      
      if (!investorName || !currency || amount <= 0) {
        continue;
      }
      
      if (!investmentsByName[investorName.toLowerCase()]) {
        investmentsByName[investorName.toLowerCase()] = {};
      }
      
      if (!investmentsByName[investorName.toLowerCase()][currency]) {
        investmentsByName[investorName.toLowerCase()][currency] = 0;
      }
      investmentsByName[investorName.toLowerCase()][currency] += amount;
    }

    // Match profiles to investments and create positions
    let successCount = 0;
    let errorCount = 0;
    
    for (const profile of profiles) {
      // Try to match by name
      const fullName = `${profile.first_name} ${profile.last_name}`.toLowerCase();
      const firstName = profile.first_name?.toLowerCase() || '';
      
      // Try different name matching strategies
      let investments = null;
      let matchedName = null;
      
      // Try full name
      if (investmentsByName[fullName]) {
        investments = investmentsByName[fullName];
        matchedName = fullName;
      }
      // Try just first name for single-name investors
      else if (investmentsByName[firstName]) {
        investments = investmentsByName[firstName];
        matchedName = firstName;
      }
      // Try finding partial matches
      else {
        for (const [name, data] of Object.entries(investmentsByName)) {
          if (name.includes(firstName) || firstName.includes(name.split(' ')[0])) {
            investments = data;
            matchedName = name;
            break;
          }
        }
      }
      
      if (!investments) {
        console.log(`⚠️  No investments found for ${profile.first_name} ${profile.last_name} (${profile.email})`);
        continue;
      }
      
      console.log(`\n📝 Processing ${profile.first_name} ${profile.last_name}`);
      console.log(`   Matched to: ${matchedName}`);
      console.log(`   Portfolio:`, investments);
      
      // Add positions for each asset
      for (const [currency, amount] of Object.entries(investments)) {
        try {
          // Map currency to asset_code enum
          const assetCode = currency;
          
          // Check if position already exists
          const { data: existingPosition } = await supabase
            .from('positions')
            .select('*')
            .eq('investor_id', profile.id)
            .eq('asset_code', assetCode)
            .single();
          
          if (existingPosition) {
            // Update existing position
            const newBalance = existingPosition.current_balance + amount;
            const { error: updateError } = await supabase
              .from('positions')
              .update({
                current_balance: newBalance,
                principal: existingPosition.principal + amount,
                updated_at: new Date().toISOString()
              })
              .eq('id', existingPosition.id);
            
            if (updateError) {
              console.error(`   ❌ Failed to update ${assetCode} position:`, updateError.message);
              errorCount++;
            } else {
              console.log(`   ✅ Updated ${assetCode}: ${existingPosition.current_balance} → ${newBalance}`);
              successCount++;
            }
          } else {
            // Create new position
            const { error: insertError } = await supabase
              .from('positions')
              .insert({
                investor_id: profile.id,
                asset_code: assetCode,
                principal: amount,
                total_earned: 0,
                current_balance: amount,
                updated_at: new Date().toISOString()
              });
            
            if (insertError) {
              console.error(`   ❌ Failed to create ${assetCode} position:`, insertError.message);
              errorCount++;
            } else {
              console.log(`   ✅ Created ${assetCode} position: ${amount}`);
              successCount++;
            }
          }
        } catch (error) {
          console.error(`   ❌ Error processing ${currency}:`, error);
          errorCount++;
        }
      }
    }
    
    console.log('\n========================================');
    console.log('📊 Portfolio Update Summary:');
    console.log(`✅ Successful operations: ${successCount}`);
    console.log(`❌ Failed operations: ${errorCount}`);
    console.log('========================================\n');
    
    // Show final summary
    console.log('\n📋 Final Investor Summary:');
    console.log('========================================');
    
    const { data: finalPositions } = await supabase
      .from('positions')
      .select(`
        investor_id,
        asset_code,
        current_balance,
        profiles!positions_investor_id_fkey (
          first_name,
          last_name,
          email
        )
      `)
      .order('investor_id');
    
    if (finalPositions) {
      const investorSummary = {};
      
      for (const position of finalPositions) {
        const investorId = position.investor_id;
        const profile = position.profiles;
        
        if (!profile) continue;
        
        if (!investorSummary[investorId]) {
          investorSummary[investorId] = {
            name: `${profile.first_name} ${profile.last_name}`,
            email: profile.email,
            positions: {}
          };
        }
        
        investorSummary[investorId].positions[position.asset_code] = position.current_balance;
      }
      
      // Display summary
      let totalsByAsset = {};
      for (const [id, investor] of Object.entries(investorSummary)) {
        console.log(`\n👤 ${investor.name}`);
        console.log(`   📧 ${investor.email}`);
        
        for (const [asset, balance] of Object.entries(investor.positions)) {
          console.log(`   💰 ${asset}: ${parseFloat(balance).toFixed(4)}`);
          
          if (!totalsByAsset[asset]) {
            totalsByAsset[asset] = 0;
          }
          totalsByAsset[asset] += parseFloat(balance);
        }
      }
      
      console.log('\n========================================');
      console.log('📊 Platform Totals:');
      console.log(`👥 Total Investors with Positions: ${Object.keys(investorSummary).length}`);
      console.log('\n💰 Total Holdings by Asset:');
      for (const [asset, total] of Object.entries(totalsByAsset)) {
        console.log(`   ${asset}: ${total.toFixed(4)}`);
      }
      console.log('========================================\n');
    }
    
  } catch (error) {
    console.error('❌ Fatal error:', error);
  }
}

// Run the script
addPortfoliosToExistingInvestors();
