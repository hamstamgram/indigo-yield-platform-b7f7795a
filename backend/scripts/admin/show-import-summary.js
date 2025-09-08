#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';

import { createServiceClient } from '../../utils/supabaseClient.js';

// Initialize secure Supabase client
const supabase = createServiceClient();

async function showImportSummary() {
  console.log('\n🎉 ========================================');
  console.log('📊 INVESTOR IMPORT FINAL SUMMARY');
  console.log('========================================\n');
  
  try {
    // Get all positions with investor details
    const { data: positions, error: posError } = await supabase
      .from('positions')
      .select('*');
    
    if (posError) {
      console.error('❌ Failed to fetch positions:', posError.message);
      return;
    }
    
    // Get all profiles
    const { data: profiles, error: profError } = await supabase
      .from('profiles')
      .select('*');
    
    if (profError) {
      console.error('❌ Failed to fetch profiles:', profError.message);
      return;
    }
    
    // Create profile map
    const profileMap = {};
    for (const profile of profiles) {
      profileMap[profile.id] = profile;
    }
    
    // Merge positions with profiles
    for (const position of positions) {
      position.profiles = profileMap[position.investor_id];
    }
    
    // Group by investor
    const investorMap = {};
    const assetTotals = {};
    let totalInvestors = 0;
    
    for (const position of positions) {
      const profile = position.profiles;
      if (!profile) continue;
      
      const investorId = position.investor_id;
      
      if (!investorMap[investorId]) {
        investorMap[investorId] = {
          name: `${profile.first_name} ${profile.last_name}`,
          email: profile.email,
          createdAt: profile.created_at,
          positions: [],
          totalValue: 0
        };
      }
      
      investorMap[investorId].positions.push({
        asset: position.asset_code,
        balance: parseFloat(position.current_balance),
        principal: parseFloat(position.principal),
        earned: parseFloat(position.total_earned)
      });
      
      investorMap[investorId].totalValue += parseFloat(position.current_balance);
      
      // Track asset totals
      if (!assetTotals[position.asset_code]) {
        assetTotals[position.asset_code] = {
          total: 0,
          count: 0
        };
      }
      assetTotals[position.asset_code].total += parseFloat(position.current_balance);
      assetTotals[position.asset_code].count++;
    }
    
    totalInvestors = Object.keys(investorMap).length;
    
    // Display individual investors
    console.log('👥 INDIVIDUAL INVESTORS');
    console.log('----------------------------------------');
    
    const sortedInvestors = Object.values(investorMap).sort((a, b) => 
      a.name.localeCompare(b.name)
    );
    
    for (const investor of sortedInvestors) {
      console.log(`\n📍 ${investor.name}`);
      console.log(`   📧 Email: ${investor.email}`);
      console.log(`   📅 Created: ${new Date(investor.createdAt).toLocaleDateString()}`);
      console.log(`   💼 Portfolio:`);
      
      for (const pos of investor.positions) {
        const earnedText = pos.earned > 0 ? ` (+${pos.earned.toFixed(4)} earned)` : '';
        console.log(`      • ${pos.asset}: ${pos.balance.toFixed(4)}${earnedText}`);
      }
    }
    
    // Display platform summary
    console.log('\n\n========================================');
    console.log('📈 PLATFORM OVERVIEW');
    console.log('========================================');
    
    console.log(`\n👥 Total Investors: ${totalInvestors}`);
    
    console.log('\n💰 TOTAL HOLDINGS BY ASSET:');
    console.log('----------------------------------------');
    
    // Sort assets by total value (assuming rough USD equivalents)
    const assetValues = {
      'BTC': 95000,    // Approximate USD values for sorting
      'ETH': 3500,
      'SOL': 200,
      'USDT': 1,
      'USDC': 1,
      'EURC': 1.05
    };
    
    const sortedAssets = Object.entries(assetTotals)
      .sort((a, b) => {
        const valueA = a[1].total * (assetValues[a[0]] || 1);
        const valueB = b[1].total * (assetValues[b[0]] || 1);
        return valueB - valueA;
      });
    
    let totalUSDValue = 0;
    
    for (const [asset, data] of sortedAssets) {
      const usdValue = data.total * (assetValues[asset] || 1);
      totalUSDValue += usdValue;
      
      console.log(`   ${asset}:`);
      console.log(`      Amount: ${data.total.toFixed(4)}`);
      console.log(`      Investors: ${data.count}`);
      console.log(`      Est. USD Value: $${usdValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
    }
    
    console.log('\n----------------------------------------');
    console.log(`📊 TOTAL PLATFORM VALUE (Est.): $${totalUSDValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
    
    // Get admin users
    const { data: admins } = await supabase
      .from('profiles')
      .select('first_name, last_name, email')
      .eq('is_admin', true);
    
    if (admins && admins.length > 0) {
      console.log('\n\n👨‍💼 ADMIN USERS:');
      console.log('----------------------------------------');
      for (const admin of admins) {
        console.log(`   • ${admin.first_name} ${admin.last_name} (${admin.email})`);
      }
    }
    
    // Import statistics
    console.log('\n\n📊 IMPORT STATISTICS:');
    console.log('----------------------------------------');
    console.log(`   ✅ Successfully imported: ${totalInvestors} investors`);
    console.log(`   📈 Total asset positions: ${positions.length}`);
    console.log(`   🏦 Unique assets: ${Object.keys(assetTotals).length}`);
    
    // Show largest holdings
    console.log('\n\n🏆 TOP 5 LARGEST HOLDINGS:');
    console.log('----------------------------------------');
    
    const largestHoldings = Object.values(investorMap)
      .sort((a, b) => b.totalValue - a.totalValue)
      .slice(0, 5);
    
    for (let i = 0; i < largestHoldings.length; i++) {
      const investor = largestHoldings[i];
      const usdValue = investor.positions.reduce((sum, pos) => {
        return sum + (pos.balance * (assetValues[pos.asset] || 1));
      }, 0);
      
      console.log(`   ${i + 1}. ${investor.name}`);
      console.log(`      Portfolio: ${investor.positions.map(p => `${p.balance.toFixed(2)} ${p.asset}`).join(', ')}`);
      console.log(`      Est. Value: $${usdValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
    }
    
    console.log('\n========================================');
    console.log('✅ IMPORT COMPLETED SUCCESSFULLY!');
    console.log('========================================\n');
    
    console.log('📝 Next Steps:');
    console.log('   1. Update temporary email addresses with real investor emails');
    console.log('   2. Send password reset links to investors');
    console.log('   3. Complete KYC information for each investor');
    console.log('   4. Begin tracking daily yields and generating statements');
    console.log('\n');
    
  } catch (error) {
    console.error('❌ Fatal error:', error);
  }
}

// Run the summary
showImportSummary();
