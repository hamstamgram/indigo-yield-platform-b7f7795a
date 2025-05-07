
import { supabase } from "../integrations/supabase/client";

// This is a utility script to create a test investor account for admin testing purposes
export async function createTestInvestor() {
  try {
    // Generate a unique email to avoid conflicts
    const timestamp = new Date().getTime();
    const testEmail = `test.investor${timestamp}@example.com`;
    const testPassword = 'testinvestor123';
    
    console.log(`Creating test investor with email: ${testEmail}`);
    
    // Try to create a new user with the test credentials
    const { data: authUser, error: authError } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword,
      options: {
        data: {
          first_name: 'Test',
          last_name: 'Investor'
        }
      }
    });

    if (authError) {
      console.error('Error creating auth user:', authError);
      throw authError;
    }

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

      if (profileError) {
        console.error('Error updating profile:', profileError);
        throw profileError;
      }
    }

    // Add some sample assets to the investor's portfolio
    const { data: assets, error: assetsError } = await supabase
      .from('assets')
      .select('id, symbol')
      .limit(4);

    if (assetsError) {
      console.error('Error fetching assets:', assetsError);
      throw assetsError;
    }
    
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

      if (portfolioError) {
        console.error('Error creating portfolio entries:', portfolioError);
        throw portfolioError;
      }
    }

    return {
      success: true,
      message: 'Test investor created successfully',
      email: testEmail,
      password: testPassword
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
