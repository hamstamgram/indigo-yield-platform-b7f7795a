#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';

// Supabase configuration
const SUPABASE_URL = 'https://nkfimvovosdehmyyjubn.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_SERVICE_KEY) {
  console.error('❌ Please set SUPABASE_SERVICE_ROLE_KEY environment variable');
  console.log('\nTo get your service role key:');
  console.log('1. Go to https://supabase.com/dashboard/project/nkfimvovosdehmyyjubn/settings/api');
  console.log('2. Copy the "service_role" key (starts with eyJ...)');
  console.log('3. Run: export SUPABASE_SERVICE_ROLE_KEY="your-key-here"');
  console.log('4. Then run this script again\n');
  console.log('Or run: bash get-service-key.sh for detailed instructions');
  process.exit(1);
}

// Create Supabase client with service role key (has admin privileges)
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Helper to generate a temporary email from investor name
function generateEmail(investorName) {
  const sanitized = investorName.toLowerCase().replace(/\s+/g, '.');
  return `${sanitized}@indigo-temp.fund`;
}

// Helper to convert Excel date serial to JavaScript Date
function excelDateToJSDate(serial) {
  const utc_days  = Math.floor(serial - 25569);
  const utc_value = utc_days * 86400;                                        
  const date_info = new Date(utc_value * 1000);

  const fractional_day = serial - Math.floor(serial) + 0.0000001;
  let total_seconds = Math.floor(86400 * fractional_day);
  const seconds = total_seconds % 60;
  total_seconds -= seconds;
  const hours = Math.floor(total_seconds / (60 * 60));
  const minutes = Math.floor(total_seconds / 60) % 60;

  return new Date(date_info.getFullYear(), date_info.getMonth(), date_info.getDate(), hours, minutes, seconds);
}

async function importInvestors() {
  console.log('📊 Importing Investors from Excel File (Investments Sheet)\n');
  console.log('✅ Using service role key for admin operations\n');
  
  try {
    // Read the Excel file
    const filePath = path.join(process.cwd(), 'ops/import/first_run.xlsx');
    console.log('📁 Reading Excel file:', filePath);
    
    const workbook = XLSX.readFile(filePath);
    
    // Find the Investments sheet
    const investmentsSheet = workbook.Sheets['Investments'];
    if (!investmentsSheet) {
      console.error('❌ Could not find "Investments" sheet in Excel file');
      return;
    }
    
    const investmentData = XLSX.utils.sheet_to_json(investmentsSheet);
    
    console.log(`✅ Found ${investmentData.length} investment records in Excel file\n`);

    // Get available assets for portfolio creation
    const { data: assets, error: assetsError } = await supabase
      .from('assets')
      .select('*');

    if (assetsError) {
      console.error('❌ Failed to fetch assets:', assetsError.message);
      return;
    }

    console.log(`📦 Found ${assets.length} available assets`);
    
    // Create a map of asset symbols to asset records
    const assetMap = {};
    for (const asset of assets) {
      assetMap[asset.symbol.toUpperCase()] = asset;
    }
    console.log('Available assets:', Object.keys(assetMap).join(', '));

    // Group investments by investor
    const investorData = {};
    
    for (const row of investmentData) {
      const investorName = row['Investor Name'];
      const currency = row['Currency']?.toUpperCase();
      const amount = parseFloat(row['Amount']) || 0;
      const investmentDate = row['Investment Date'];
      
      if (!investorName || !currency || amount <= 0) {
        console.log(`⚠️  Skipping invalid row: ${JSON.stringify(row)}`);
        continue;
      }
      
      if (!investorData[investorName]) {
        investorData[investorName] = {
          name: investorName,
          portfolios: {},
          firstInvestmentDate: investmentDate
        };
      }
      
      // Aggregate amounts by currency
      if (!investorData[investorName].portfolios[currency]) {
        investorData[investorName].portfolios[currency] = 0;
      }
      investorData[investorName].portfolios[currency] += amount;
      
      // Track earliest investment date
      if (investmentDate < investorData[investorName].firstInvestmentDate) {
        investorData[investorName].firstInvestmentDate = investmentDate;
      }
    }
    
    console.log(`\n📊 Found ${Object.keys(investorData).length} unique investors\n`);

    // Process each unique investor
    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;
    const createdInvestors = [];
    
    for (const [investorName, data] of Object.entries(investorData)) {
      try {
        // Parse name
        const nameParts = investorName.split(' ');
        const firstName = nameParts[0] || 'Investor';
        const lastName = nameParts.slice(1).join(' ') || 'User';
        const email = generateEmail(investorName);
        
        console.log(`\n📝 Processing investor: ${investorName}`);
        console.log(`   Email: ${email}`);
        console.log(`   Portfolio:`, data.portfolios);

        // Check if investor already exists by checking profiles with similar names
        const { data: existingProfiles } = await supabase
          .from('profiles')
          .select('id, email, first_name, last_name')
          .or(`first_name.ilike.%${firstName}%,last_name.ilike.%${lastName}%`);

        let userId;
        let wasCreated = false;
        
        if (existingProfiles && existingProfiles.length > 0) {
          // Check for exact or close match
          const exactMatch = existingProfiles.find(p => 
            p.first_name?.toLowerCase() === firstName.toLowerCase() && 
            p.last_name?.toLowerCase() === lastName.toLowerCase()
          );
          
          if (exactMatch) {
            console.log(`⏭️  Investor already exists: ${exactMatch.email}`);
            userId = exactMatch.id;
            skipCount++;
          } else {
            console.log(`⚠️  Found similar profile(s), creating new investor anyway`);
          }
        }
        
        // Create new investor if not found
        if (!userId) {
          // Create auth user using admin API with service role key
          const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
            email: email,
            password: `TempPass${Date.now()}!`, // Temporary password
            email_confirm: true,
            user_metadata: {
              first_name: firstName,
              last_name: lastName,
              original_name: investorName // Store original name from Excel
            }
          });

          if (createError) {
            console.error(`❌ Failed to create user ${email}:`, createError.message);
            errorCount++;
            continue;
          }

          userId = newUser.user.id;
          wasCreated = true;

          // Create profile
          const { error: profileError } = await supabase
            .from('profiles')
            .insert({
              id: userId,
              email: email,
              first_name: firstName,
              last_name: lastName,
              is_admin: false,
              fee_percentage: 2.0,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            });

          if (profileError) {
            console.error(`❌ Failed to create profile for ${email}:`, profileError.message);
            // Try to clean up the auth user
            await supabase.auth.admin.deleteUser(userId);
            errorCount++;
            continue;
          }

          console.log(`✅ Created new investor: ${email}`);
          successCount++;
          createdInvestors.push({
            name: investorName,
            email: email,
            userId: userId
          });
        }

        // Add or update portfolios
        const portfolioEntries = [];
        
        for (const [currency, balance] of Object.entries(data.portfolios)) {
          const asset = assetMap[currency];
          
          if (!asset) {
            console.warn(`⚠️  Asset not found for currency: ${currency}`);
            continue;
          }
          
          // Check if portfolio entry already exists
          const { data: existingPortfolio } = await supabase
            .from('portfolios')
            .select('id, balance')
            .eq('user_id', userId)
            .eq('asset_id', asset.id)
            .single();
          
          if (existingPortfolio) {
            // Update existing portfolio
            const newBalance = existingPortfolio.balance + balance;
            const { error: updateError } = await supabase
              .from('portfolios')
              .update({
                balance: newBalance,
                updated_at: new Date().toISOString()
              })
              .eq('id', existingPortfolio.id);
              
            if (updateError) {
              console.error(`⚠️  Failed to update portfolio for ${currency}:`, updateError.message);
            } else {
              console.log(`✅ Updated ${currency} balance: ${existingPortfolio.balance} → ${newBalance}`);
            }
          } else {
            // Create new portfolio entry
            portfolioEntries.push({
              user_id: userId,
              asset_id: asset.id,
              balance: balance,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            });
          }
        }

        if (portfolioEntries.length > 0) {
          const { error: portfolioError } = await supabase
            .from('portfolios')
            .insert(portfolioEntries);

          if (portfolioError) {
            console.error(`⚠️  Failed to create portfolios:`, portfolioError.message);
          } else {
            console.log(`✅ Created ${portfolioEntries.length} new portfolio entries`);
          }
        }

      } catch (error) {
        console.error(`❌ Error processing investor ${investorName}:`, error);
        errorCount++;
      }
    }

    console.log('\n========================================');
    console.log('📊 Import Summary:');
    console.log(`✅ Successfully created: ${successCount} new investors`);
    console.log(`⏭️  Already existed: ${skipCount} investors`);
    console.log(`❌ Errors: ${errorCount} investors`);
    console.log('========================================\n');

    // Show newly created investors
    if (createdInvestors.length > 0) {
      console.log('\n🆕 Newly Created Investors:');
      console.log('------------------------------------');
      for (const investor of createdInvestors) {
        console.log(`Name: ${investor.name}`);
        console.log(`Email: ${investor.email}`);
        console.log(`User ID: ${investor.userId}`);
        console.log(`Default Password: TempPass[timestamp]!`);
        console.log('------------------------------------');
      }
      console.log('\n⚠️  IMPORTANT: These investors have temporary passwords.');
      console.log('They should reset their passwords when they first log in.\n');
    }

    // Show a summary of all investors and their portfolios
    console.log('\n📋 All Investor Portfolio Summary:');
    console.log('========================================');
    const { data: allProfiles } = await supabase
      .from('profiles')
      .select(`
        id,
        email,
        first_name,
        last_name,
        portfolios (
          balance,
          assets (
            symbol,
            name
          )
        )
      `)
      .eq('is_admin', false)
      .order('created_at', { ascending: false });

    if (allProfiles) {
      let totalInvestors = 0;
      const totalsByAsset = {};
      
      for (const profile of allProfiles) {
        totalInvestors++;
        console.log(`\n👤 ${profile.first_name} ${profile.last_name}`);
        console.log(`   📧 ${profile.email}`);
        
        if (profile.portfolios && profile.portfolios.length > 0) {
          for (const portfolio of profile.portfolios) {
            const symbol = portfolio.assets.symbol;
            const balance = portfolio.balance;
            console.log(`   💰 ${symbol}: ${balance.toFixed(4)}`);
            
            // Track totals by asset
            if (!totalsByAsset[symbol]) {
              totalsByAsset[symbol] = 0;
            }
            totalsByAsset[symbol] += balance;
          }
        } else {
          console.log('   ⚠️  No portfolios');
        }
      }
      
      console.log('\n========================================');
      console.log('📊 Platform Totals:');
      console.log(`👥 Total Investors: ${totalInvestors}`);
      console.log('\n💰 Total Holdings by Asset:');
      for (const [symbol, total] of Object.entries(totalsByAsset)) {
        console.log(`   ${symbol}: ${total.toFixed(4)}`);
      }
      console.log('========================================\n');
    }

  } catch (error) {
    console.error('❌ Fatal error:', error);
  }
}

// Run the import
importInvestors();
