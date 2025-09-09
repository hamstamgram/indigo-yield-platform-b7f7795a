#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL?.replace(/\\n/g, '');
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY?.replace(/\\n/g, '');

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('Missing Supabase configuration in .env.local');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function createTestUsers() {
  console.log('Creating test users for design audit...\n');

  const testUsers = [
    {
      email: 'test.investor.audit@gmail.com',
      password: 'AuditTest123!',
      options: {
        data: {
          first_name: 'Test',
          last_name: 'Investor',
          role: 'investor'
        }
      }
    },
    {
      email: 'test.admin.audit@gmail.com',
      password: 'AuditAdmin123!',
      options: {
        data: {
          first_name: 'Test',
          last_name: 'Admin',
          role: 'admin'
        }
      }
    }
  ];

  for (const user of testUsers) {
    try {
      console.log(`Creating ${user.email}...`);
      
      // Try to sign up the user
      const { data, error } = await supabase.auth.signUp({
        email: user.email,
        password: user.password,
        options: user.options
      });

      if (error) {
        if (error.message.includes('already registered')) {
          console.log(`✓ ${user.email} already exists`);
          
          // Try to update the user's metadata
          const { error: signInError } = await supabase.auth.signInWithPassword({
            email: user.email,
            password: user.password
          });
          
          if (!signInError) {
            console.log(`✓ Verified ${user.email} can sign in`);
          } else {
            console.error(`× Cannot sign in as ${user.email}: ${signInError.message}`);
          }
        } else {
          console.error(`× Error creating ${user.email}: ${error.message}`);
        }
      } else {
        console.log(`✓ Created ${user.email}`);
        
        // Update profile
        if (data.user) {
          const { error: profileError } = await supabase
            .from('profiles')
            .upsert({
              id: data.user.id,
              email: user.email,
              first_name: user.options.data.first_name,
              last_name: user.options.data.last_name,
              role: user.options.data.role,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            });
            
          if (profileError) {
            console.error(`× Error updating profile for ${user.email}: ${profileError.message}`);
          } else {
            console.log(`✓ Profile updated for ${user.email}`);
          }
          
          // Create portfolio for investor
          if (user.options.data.role === 'investor') {
            const { error: portfolioError } = await supabase
              .from('portfolios')
              .upsert({
                investor_id: data.user.id,
                total_invested: 10000.00,
                current_value: 10500.00,
                total_returns: 500.00,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              });
              
            if (portfolioError) {
              console.error(`× Error creating portfolio: ${portfolioError.message}`);
            } else {
              console.log(`✓ Portfolio created for investor`);
            }
          }
        }
      }
    } catch (err) {
      console.error(`× Failed to process ${user.email}: ${err.message}`);
    }
  }

  console.log('\n========================================');
  console.log('Test User Credentials:');
  console.log('========================================');
  console.log('\nInvestor Account:');
  console.log('Email: test.investor.audit@gmail.com');
  console.log('Password: AuditTest123!');
  console.log('\nAdmin Account:');
  console.log('Email: test.admin.audit@gmail.com');
  console.log('Password: AuditAdmin123!');
  console.log('\n✓ Test users are ready for audit testing');
  console.log('\nNote: If users already existed, try signing in with the credentials above.');
  
  process.exit(0);
}

createTestUsers().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
