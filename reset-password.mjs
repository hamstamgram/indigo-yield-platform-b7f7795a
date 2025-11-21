#!/usr/bin/env node
/**
 * Password Reset Script for hammadou@indigo.fund
 * Generates a secure password and resets via Supabase Admin API
 */

import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

// Configuration
const SUPABASE_URL = 'https://nkfimvovosdehmyyjubn.supabase.co'
const EMAIL = 'hammadou@indigo.fund'

// Generate a cryptographically secure password
function generateSecurePassword() {
  const length = 24
  const lowercase = 'abcdefghijklmnopqrstuvwxyz'
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  const numbers = '0123456789'
  const symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?'

  const allChars = lowercase + uppercase + numbers + symbols

  let password = ''

  // Ensure at least one of each type
  password += lowercase[crypto.randomInt(lowercase.length)]
  password += uppercase[crypto.randomInt(uppercase.length)]
  password += numbers[crypto.randomInt(numbers.length)]
  password += symbols[crypto.randomInt(symbols.length)]

  // Fill the rest randomly
  for (let i = password.length; i < length; i++) {
    password += allChars[crypto.randomInt(allChars.length)]
  }

  // Shuffle the password
  return password.split('').sort(() => crypto.randomInt(3) - 1).join('')
}

async function resetPassword() {
  console.log('🔐 Indigo Yield Platform - Password Reset')
  console.log('==========================================\n')

  // Check for service role key
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!serviceRoleKey) {
    console.error('❌ Error: SUPABASE_SERVICE_ROLE_KEY environment variable not set\n')
    console.log('Please get your service role key from:')
    console.log('https://supabase.com/dashboard/project/nkfimvovosdehmyyjubn/settings/api\n')
    console.log('Then run:')
    console.log('export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key-here"')
    console.log('node reset-password.mjs\n')
    process.exit(1)
  }

  // Create admin client
  const supabase = createClient(SUPABASE_URL, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })

  try {
    console.log(`📧 User: ${EMAIL}`)
    console.log('🔍 Looking up user...\n')

    // Get user by email
    const { data: users, error: fetchError } = await supabase.auth.admin.listUsers()

    if (fetchError) {
      throw new Error(`Failed to fetch users: ${fetchError.message}`)
    }

    const user = users.users.find(u => u.email?.toLowerCase() === EMAIL.toLowerCase())

    if (!user) {
      throw new Error(`User not found: ${EMAIL}`)
    }

    console.log(`✅ Found user: ${user.id}`)

    // Generate secure password
    const newPassword = generateSecurePassword()
    console.log('🔑 Generated secure password\n')

    console.log('🔄 Resetting password...')

    // Update password using admin API
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      user.id,
      { password: newPassword }
    )

    if (updateError) {
      throw new Error(`Failed to update password: ${updateError.message}`)
    }

    console.log('✅ Password reset successfully!\n')
    console.log('==========================================')
    console.log('📧 LOGIN CREDENTIALS')
    console.log('==========================================')
    console.log(`Email:    ${EMAIL}`)
    console.log(`Password: ${newPassword}`)
    console.log('==========================================\n')
    console.log('⚠️  IMPORTANT:')
    console.log('1. Save this password in a secure location immediately')
    console.log('2. User can login at: https://preview--indigo-yield-platform-v01.lovable.app')
    console.log('3. Recommend changing password after first login')
    console.log('4. Password meets all security requirements:')
    console.log('   - 24 characters long')
    console.log('   - Contains uppercase, lowercase, numbers, and symbols')
    console.log('   - Cryptographically generated\n')

  } catch (error) {
    console.error(`\n❌ Error: ${error.message}\n`)
    console.log('💡 Alternative: Reset via Supabase Dashboard:')
    console.log('https://supabase.com/dashboard/project/nkfimvovosdehmyyjubn/auth/users\n')
    process.exit(1)
  }
}

resetPassword()
