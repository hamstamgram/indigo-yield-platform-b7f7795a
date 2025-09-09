import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

serve(async (req) => {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // Get email and password from request
    const { email, password } = await req.json()

    // Find existing user
    const { data: users, error: listError } = await supabaseAdmin.auth.admin.listUsers()
    
    if (listError) {
      return new Response(JSON.stringify({ error: listError.message }), {
        headers: { 'Content-Type': 'application/json' },
        status: 400
      })
    }

    const existingUser = users.users.find(u => u.email?.toLowerCase() === email.toLowerCase())

    if (existingUser) {
      // Update existing user's password
      const { data, error } = await supabaseAdmin.auth.admin.updateUserById(
        existingUser.id,
        { 
          password: password,
          email_confirm: true
        }
      )
      
      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          headers: { 'Content-Type': 'application/json' },
          status: 400
        })
      }
      
      return new Response(JSON.stringify({ 
        message: 'Password updated successfully',
        user_id: data.user?.id 
      }), {
        headers: { 'Content-Type': 'application/json' },
        status: 200
      })
    } else {
      // Create new user
      const { data, error } = await supabaseAdmin.auth.admin.createUser({
        email: email,
        password: password,
        email_confirm: true
      })
      
      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          headers: { 'Content-Type': 'application/json' },
          status: 400
        })
      }
      
      return new Response(JSON.stringify({ 
        message: 'User created successfully',
        user_id: data.user?.id 
      }), {
        headers: { 'Content-Type': 'application/json' },
        status: 200
      })
    }
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500
    })
  }
})
