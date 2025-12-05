import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TestUserConfig {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  isAdmin: boolean;
}

const TEST_USERS: TestUserConfig[] = [
  {
    email: 'testadmin@indigo.fund',
    password: 'TestAdmin123!',
    firstName: 'Test',
    lastName: 'Admin',
    isAdmin: true,
  },
  {
    email: 'testinvestor@indigo.fund',
    password: 'TestInvestor123!',
    firstName: 'Test',
    lastName: 'Investor',
    isAdmin: false,
  },
];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    const results: { email: string; success: boolean; userId?: string; error?: string }[] = [];

    for (const userConfig of TEST_USERS) {
      console.log(`Processing user: ${userConfig.email}`);

      try {
        // Check if user already exists
        const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
        const existingUser = existingUsers?.users?.find(u => u.email === userConfig.email);

        let userId: string;

        if (existingUser) {
          console.log(`User ${userConfig.email} already exists with ID: ${existingUser.id}`);
          userId = existingUser.id;
        } else {
          // Create auth user
          const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
            email: userConfig.email,
            password: userConfig.password,
            email_confirm: true,
            user_metadata: {
              first_name: userConfig.firstName,
              last_name: userConfig.lastName,
              is_admin: userConfig.isAdmin,
            }
          });

          if (createError) {
            throw new Error(`Auth user creation failed: ${createError.message}`);
          }

          userId = newUser.user.id;
          console.log(`Created auth user: ${userId}`);
        }

        // Create/update profile
        const { error: profileError } = await supabaseAdmin
          .from('profiles')
          .upsert({
            id: userId,
            email: userConfig.email,
            first_name: userConfig.firstName,
            last_name: userConfig.lastName,
            is_admin: userConfig.isAdmin,
            status: 'Active',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }, { onConflict: 'id' });

        if (profileError) {
          console.warn(`Profile upsert warning for ${userConfig.email}:`, profileError.message);
        }

        // If investor, create investor record
        if (!userConfig.isAdmin) {
          const { error: investorError } = await supabaseAdmin
            .from('investors')
            .upsert({
              name: `${userConfig.firstName} ${userConfig.lastName}`,
              email: userConfig.email,
              profile_id: userId,
              status: 'Active',
              entity_type: 'individual',
              accredited: true,
              kyc_status: 'approved',
              aml_status: 'approved',
              onboarding_date: new Date().toISOString().split('T')[0],
            }, { onConflict: 'email' });

          if (investorError) {
            console.warn(`Investor upsert warning for ${userConfig.email}:`, investorError.message);
          }
        }

        results.push({
          email: userConfig.email,
          success: true,
          userId: userId,
        });

        console.log(`Successfully processed: ${userConfig.email}`);

      } catch (userError) {
        const errorMessage = userError instanceof Error ? userError.message : String(userError);
        console.error(`Error processing ${userConfig.email}:`, errorMessage);
        results.push({
          email: userConfig.email,
          success: false,
          error: errorMessage,
        });
      }
    }

    // Generate summary
    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    return new Response(
      JSON.stringify({
        success: failCount === 0,
        message: `Created/updated ${successCount} user(s), ${failCount} failed`,
        results,
        credentials: TEST_USERS.map(u => ({
          email: u.email,
          password: u.password,
          role: u.isAdmin ? 'Admin' : 'Investor',
        })),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Error in setup-test-users:', errorMessage);
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
