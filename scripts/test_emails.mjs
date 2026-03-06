import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'http://127.0.0.1:54321';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseServiceKey) {
    console.error("Missing SUPABASE_SERVICE_ROLE_KEY in .env");
    process.exit(1);
}

// Use Service Role to bypass password requirements for local testing scripts
const supabase = createClient(supabaseUrl, supabaseServiceKey);
const targetEmail = 'hammadou@indigo.fund';

async function testEmails() {
    console.log("Using Service Role Key for Admin privileges...\n");

    // 1. Test Admin Invite Email
    console.log(`1. Triggering Send Admin Invite via Edge Function for ${targetEmail}...`);
    const invitePayload = {
        invite: {
            id: 'test-invite-id',
            email: targetEmail,
            invite_code: 'TEST-CODE-1234',
            intended_role: 'super_admin',
            created_at: new Date().toISOString(),
            expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        }
    };

    const { data: inviteData, error: inviteError } = await supabase.functions.invoke('send-admin-invite', {
        body: invitePayload
    });

    if (inviteError) {
        console.error("❌ Failed to send admin invite email:", inviteError.message);
    } else {
        console.log("✅ Admin Invite email sent successfully. Response:", inviteData);
    }

    console.log("\n--------------------------------------------------\n");

    // 2. Test Notification Email (Deposit Confirmed)
    console.log(`2. Triggering Deposit Confirmed Notification for ${targetEmail}...`);
    const notificationPayload = {
        to: targetEmail,
        subject: 'Test: Deposit Received',
        template: 'deposit_confirmed',
        data: {
            name: 'Hammadou (Test)',
            amount: '500.00',
            asset: 'XRP',
            fundName: 'Indigo Premium Fund',
            reference: 'DEP-8849-TX',
            portalLink: 'http://localhost:5173'
        }
    };

    const { data: notificationData, error: notificationError } = await supabase.functions.invoke('send-notification-email', {
        body: notificationPayload
    });

    if (notificationError) {
        console.error("❌ Failed to send notification email:", notificationError.message);
    } else {
        console.log("✅ Notification email sent successfully. Response:", notificationData);
    }
}

testEmails();
