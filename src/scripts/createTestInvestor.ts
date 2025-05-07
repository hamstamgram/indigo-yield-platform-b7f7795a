
import { supabase } from "../integrations/supabase/client";

// This is a utility script to create a test investor account for admin testing purposes
// You can run this script to create a test investor account

export async function createTestInvestor() {
  try {
    // Create a test investor user
    const { data: authUser, error: authError } = await supabase.auth.signUp({
      email: 'test.investor@example.com',
      password: 'testinvestor123',
      options: {
        data: {
          first_name: 'Test',
          last_name: 'Investor'
        }
      }
    });

    if (authError) throw authError;

    console.log('Created auth user:', authUser);

    // Ensure the profile has the correct fee_percentage
    if (authUser.user) {
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ 
          fee_percentage: 2.5,
          is_admin: false
        })
        .eq('id', authUser.user.id);

      if (profileError) throw profileError;
    }

    // Add some sample assets to the investor's portfolio
    const { data: assets, error: assetsError } = await supabase
      .from('assets')
      .select('id, symbol')
      .limit(4);

    if (assetsError) throw assetsError;
    
    if (assets && authUser.user) {
      // Create portfolio entries for each asset
      const portfolioEntries = assets.map((asset, index) => ({
        user_id: authUser.user!.id,
        asset_id: asset.id,
        balance: (index + 1) * 0.5, // Different amount for each asset
      }));

      const { error: portfolioError } = await supabase
        .from('portfolios')
        .insert(portfolioEntries);

      if (portfolioError) throw portfolioError;
    }

    return {
      success: true,
      message: 'Test investor created successfully',
      email: 'test.investor@example.com',
      password: 'testinvestor123'
    };
    
  } catch (error) {
    console.error('Error creating test investor:', error);
    return {
      success: false,
      message: 'Failed to create test investor',
      error
    };
  }
}
