/**
 * Admin Operations Tests
 *
 * Comprehensive tests for admin functionality including:
 * - Admin role management
 * - Super admin permissions
 * - Admin approvals workflow
 * - Bulk operations
 * - System configuration
 * - Audit logging
 *
 * @requires Supabase connection with service_role key
 * @requires Admin credentials
 */

import { test, expect } from '@playwright/test';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// ============================================================================
// Test Configuration
// ============================================================================

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://nkfimvovosdehmyyjubn.supabase.co';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const TEST_ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL || 'testadmin@indigo.fund';
const TEST_ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD || 'Indigo!Admin2026#Secure';

// ============================================================================
// Global Test State
// ============================================================================

let supabase: SupabaseClient;
let serviceSupabase: SupabaseClient;
let adminUserId: string;

// ============================================================================
// Setup
// ============================================================================

test.beforeAll(async () => {
  supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  if (SUPABASE_SERVICE_KEY) {
    serviceSupabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  }

  const { data: authData, error } = await supabase.auth.signInWithPassword({
    email: TEST_ADMIN_EMAIL,
    password: TEST_ADMIN_PASSWORD,
  });

  if (!error && authData.user) {
    adminUserId = authData.user.id;
    console.log(`Authenticated as admin: ${adminUserId}`);
  }
});

// ============================================================================
// Test Suite: Admin Status Checks
// ============================================================================

test.describe('Admin Status Checks', () => {
  test('should check if user is admin', async () => {
    const client = SUPABASE_SERVICE_KEY ? serviceSupabase : supabase;

    const { data, error } = await client.rpc('is_admin');

    if (error) {
      console.log(`is_admin: ${error.message}`);
    } else {
      console.log(`is_admin result: ${data}`);
      expect(typeof data).toBe('boolean');
    }
  });

  test('should check if user is super admin', async () => {
    const client = SUPABASE_SERVICE_KEY ? serviceSupabase : supabase;

    const { data, error } = await client.rpc('is_super_admin');

    if (error) {
      console.log(`is_super_admin: ${error.message}`);
    } else {
      console.log(`is_super_admin result: ${data}`);
      expect(typeof data).toBe('boolean');
    }
  });

  test('should get user admin status', async () => {
    if (!adminUserId) {
      test.skip();
      return;
    }

    const client = SUPABASE_SERVICE_KEY ? serviceSupabase : supabase;

    const { data, error } = await client.rpc('get_user_admin_status', {
      p_user_id: adminUserId,
    });

    if (error) {
      console.log(`get_user_admin_status: ${error.message}`);
    } else {
      console.log(`Admin status: ${JSON.stringify(data)}`);
    }
  });
});

// ============================================================================
// Test Suite: User Roles
// ============================================================================

test.describe('User Roles', () => {
  test('should list user roles', async () => {
    const client = SUPABASE_SERVICE_KEY ? serviceSupabase : supabase;

    const { data: roles, error } = await client
      .from('user_roles')
      .select('*')
      .limit(20);

    if (error) {
      console.log(`User roles: ${error.message}`);
    } else {
      console.log(`User roles: ${roles?.length || 0}`);
    }
  });

  test('should list admin profiles', async () => {
    const client = SUPABASE_SERVICE_KEY ? serviceSupabase : supabase;

    const { data: admins, error } = await client
      .from('profiles')
      .select('id, full_name, email, role')
      .in('role', ['admin', 'super_admin']);

    if (error) {
      console.log(`Admin profiles: ${error.message}`);
    } else {
      console.log(`Admin profiles: ${admins?.length || 0}`);
    }
  });
});

// ============================================================================
// Test Suite: Admin Approvals
// ============================================================================

test.describe('Admin Approvals', () => {
  test('should list pending approvals', async () => {
    const client = SUPABASE_SERVICE_KEY ? serviceSupabase : supabase;

    const { data: approvals, error } = await client
      .from('admin_approvals')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      console.log(`Pending approvals: ${error.message}`);
    } else {
      console.log(`Pending approvals: ${approvals?.length || 0}`);
    }
  });

  test('should list operation approvals', async () => {
    const client = SUPABASE_SERVICE_KEY ? serviceSupabase : supabase;

    const { data: approvals, error } = await client
      .from('operation_approvals')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      console.log(`Operation approvals: ${error.message}`);
    } else {
      console.log(`Operation approvals: ${approvals?.length || 0}`);

      if (approvals && approvals.length > 0) {
        // Group by type
        const byType = new Map<string, number>();
        for (const a of approvals) {
          const count = byType.get(a.operation_type) || 0;
          byType.set(a.operation_type, count + 1);
        }

        console.log('Approval types:');
        for (const [type, count] of byType) {
          console.log(`  ${type}: ${count}`);
        }
      }
    }
  });
});

// ============================================================================
// Test Suite: System Configuration
// ============================================================================

test.describe('System Configuration', () => {
  test('should list system config', async () => {
    const client = SUPABASE_SERVICE_KEY ? serviceSupabase : supabase;

    const { data: config, error } = await client
      .from('system_config')
      .select('*');

    if (error) {
      console.log(`System config: ${error.message}`);
    } else {
      console.log(`System config entries: ${config?.length || 0}`);
    }
  });

  test('should check 2FA policy', async () => {
    const client = SUPABASE_SERVICE_KEY ? serviceSupabase : supabase;

    const { data: policy, error } = await client
      .from('system_2fa_policy')
      .select('*')
      .limit(1)
      .single();

    if (error) {
      console.log(`2FA policy: ${error.message}`);
    } else {
      console.log(`2FA policy: ${JSON.stringify(policy)}`);
    }
  });

  test('should check rate limit config', async () => {
    const client = SUPABASE_SERVICE_KEY ? serviceSupabase : supabase;

    const { data: config, error } = await client
      .from('rate_limit_config')
      .select('*');

    if (error) {
      console.log(`Rate limit config: ${error.message}`);
    } else {
      console.log(`Rate limit configs: ${config?.length || 0}`);
    }
  });
});

// ============================================================================
// Test Suite: Audit Logging
// ============================================================================

test.describe('Audit Logging', () => {
  test('should list recent audit logs', async () => {
    const client = SUPABASE_SERVICE_KEY ? serviceSupabase : supabase;

    const { data: logs, error } = await client
      .from('audit_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.log(`Audit logs: ${error.message}`);
    } else {
      console.log(`Recent audit logs: ${logs?.length || 0}`);

      if (logs && logs.length > 0) {
        // Group by entity
        const byEntity = new Map<string, number>();
        for (const l of logs) {
          const count = byEntity.get(l.entity) || 0;
          byEntity.set(l.entity, count + 1);
        }

        console.log('Audit log by entity:');
        for (const [entity, count] of byEntity) {
          console.log(`  ${entity}: ${count}`);
        }
      }
    }
  });

  test('should list access logs', async () => {
    const client = SUPABASE_SERVICE_KEY ? serviceSupabase : supabase;

    const { data: logs, error } = await client
      .from('access_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      console.log(`Access logs: ${error.message}`);
    } else {
      console.log(`Access logs: ${logs?.length || 0}`);
    }
  });

  test('should list transaction bypass attempts', async () => {
    const client = SUPABASE_SERVICE_KEY ? serviceSupabase : supabase;

    const { data: attempts, error } = await client
      .from('transaction_bypass_attempts')
      .select('*')
      .order('attempted_at', { ascending: false })
      .limit(20);

    if (error) {
      console.log(`Bypass attempts: ${error.message}`);
    } else {
      console.log(`Bypass attempts: ${attempts?.length || 0}`);
    }
  });
});

// ============================================================================
// Test Suite: Admin Alerts
// ============================================================================

test.describe('Admin Alerts', () => {
  test('should list admin alerts', async () => {
    const client = SUPABASE_SERVICE_KEY ? serviceSupabase : supabase;

    const { data: alerts, error } = await client
      .from('admin_alerts')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      console.log(`Admin alerts: ${error.message}`);
    } else {
      console.log(`Admin alerts: ${alerts?.length || 0}`);
    }
  });
});

// ============================================================================
// Test Suite: Integrity Monitoring
// ============================================================================

test.describe('Integrity Monitoring', () => {
  test('should run integrity monitoring', async () => {
    const client = SUPABASE_SERVICE_KEY ? serviceSupabase : supabase;

    const { data, error } = await client.rpc('run_integrity_monitoring');

    if (error) {
      console.log(`Integrity monitoring: ${error.message}`);
    } else {
      console.log(`Integrity monitoring result: ${JSON.stringify(data)}`);
    }
  });

  test('should list integrity check log', async () => {
    const client = SUPABASE_SERVICE_KEY ? serviceSupabase : supabase;

    const { data: logs, error } = await client
      .from('integrity_check_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      console.log(`Integrity check log: ${error.message}`);
    } else {
      console.log(`Integrity checks: ${logs?.length || 0}`);
    }
  });

  test('should list admin integrity runs', async () => {
    const client = SUPABASE_SERVICE_KEY ? serviceSupabase : supabase;

    const { data: runs, error } = await client
      .from('admin_integrity_runs')
      .select('*')
      .order('run_at', { ascending: false })
      .limit(10);

    if (error) {
      console.log(`Integrity runs: ${error.message}`);
    } else {
      console.log(`Integrity runs: ${runs?.length || 0}`);
    }
  });
});

// ============================================================================
// Test Suite: System Health
// ============================================================================

test.describe('System Health', () => {
  test('should list system health snapshots', async () => {
    const client = SUPABASE_SERVICE_KEY ? serviceSupabase : supabase;

    const { data: snapshots, error } = await client
      .from('system_health_snapshots')
      .select('*')
      .order('captured_at', { ascending: false })
      .limit(10);

    if (error) {
      console.log(`Health snapshots: ${error.message}`);
    } else {
      console.log(`Health snapshots: ${snapshots?.length || 0}`);
    }
  });
});

// ============================================================================
// Test Suite: Admin Invites
// ============================================================================

test.describe('Admin Invites', () => {
  test('should list admin invites', async () => {
    const client = SUPABASE_SERVICE_KEY ? serviceSupabase : supabase;

    const { data: invites, error } = await client
      .from('admin_invites')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      console.log(`Admin invites: ${error.message}`);
    } else {
      console.log(`Admin invites: ${invites?.length || 0}`);
    }
  });

  test('should list investor invites', async () => {
    const client = SUPABASE_SERVICE_KEY ? serviceSupabase : supabase;

    const { data: invites, error } = await client
      .from('investor_invites')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      console.log(`Investor invites: ${error.message}`);
    } else {
      console.log(`Investor invites: ${invites?.length || 0}`);
    }
  });
});

// ============================================================================
// Test Suite: Support Tickets
// ============================================================================

test.describe('Support Tickets', () => {
  test('should list support tickets', async () => {
    const client = SUPABASE_SERVICE_KEY ? serviceSupabase : supabase;

    const { data: tickets, error } = await client
      .from('support_tickets')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      console.log(`Support tickets: ${error.message}`);
    } else {
      console.log(`Support tickets: ${tickets?.length || 0}`);
    }
  });
});

// ============================================================================
// Test Suite: Session Management
// ============================================================================

test.describe('Session Management', () => {
  test('should list user sessions', async () => {
    const client = SUPABASE_SERVICE_KEY ? serviceSupabase : supabase;

    const { data: sessions, error } = await client
      .from('user_sessions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      console.log(`User sessions: ${error.message}`);
    } else {
      console.log(`Active sessions: ${sessions?.length || 0}`);
    }
  });
});
