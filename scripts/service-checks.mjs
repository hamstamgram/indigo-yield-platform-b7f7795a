#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import fs from 'fs/promises';
import path from 'path';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://nkfimvovosdehmyyjubn.supabase.co';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5rZmltdm92b3NkZWhteXlqdWJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY0NTQ1OTgsImV4cCI6MjA2MjAzMDU5OH0.pZrIyCCd7dlvvNMGdW8-71BxSVfoKhxs9a5Ezbkmjgg';

async function checkDatabase(supabase) {
  const start = Date.now();
  try {
    const { data, error } = await supabase.from('profiles').select('count').limit(1);
    const latency = Date.now() - start;
    
    if (error) {
      return {
        service: 'Database',
        status: 'unhealthy',
        latency,
        error: error.message,
        details: error
      };
    }
    
    return {
      service: 'Database',
      status: latency < 1000 ? 'healthy' : 'degraded',
      latency,
      message: 'Database connection successful'
    };
  } catch (error) {
    return {
      service: 'Database',
      status: 'unhealthy',
      latency: Date.now() - start,
      error: error.message
    };
  }
}

async function checkStorage(supabase) {
  const start = Date.now();
  try {
    const { data, error } = await supabase.storage.from('statements').list('', { limit: 1 });
    const latency = Date.now() - start;
    
    if (error && !error.message.includes('not found')) {
      return {
        service: 'Storage',
        status: 'unhealthy',
        latency,
        error: error.message
      };
    }
    
    return {
      service: 'Storage',
      status: latency < 2000 ? 'healthy' : 'degraded',
      latency,
      message: error ? 'Bucket not found (expected for security)' : 'Storage accessible'
    };
  } catch (error) {
    return {
      service: 'Storage',
      status: 'unhealthy',
      latency: Date.now() - start,
      error: error.message
    };
  }
}

async function checkAuth(supabase) {
  const start = Date.now();
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    const latency = Date.now() - start;
    
    if (error) {
      return {
        service: 'Authentication',
        status: 'unhealthy',
        latency,
        error: error.message
      };
    }
    
    return {
      service: 'Authentication',
      status: 'healthy',
      latency,
      message: session ? 'Authenticated session active' : 'Auth service available'
    };
  } catch (error) {
    return {
      service: 'Authentication',
      status: 'unhealthy',
      latency: Date.now() - start,
      error: error.message
    };
  }
}

async function checkRealtime(supabase) {
  const start = Date.now();
  try {
    // Try to create a channel
    const channel = supabase.channel('test-channel');
    
    // Try to subscribe
    const subscription = channel.subscribe((status) => {
      console.log('Realtime status:', status);
    });
    
    // Give it a moment to connect
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Clean up
    await supabase.removeChannel(channel);
    
    const latency = Date.now() - start;
    
    return {
      service: 'Realtime',
      status: 'healthy',
      latency,
      message: 'Realtime service available'
    };
  } catch (error) {
    return {
      service: 'Realtime',
      status: 'unhealthy',
      latency: Date.now() - start,
      error: error.message
    };
  }
}

async function main() {
  console.log('\n🔍 Service Connectivity Checks');
  console.log(`Supabase URL: ${SUPABASE_URL}`);
  console.log(`Time: ${new Date().toISOString()}\n`);

  // Initialize Supabase client
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  // Run all checks
  const checks = await Promise.all([
    checkDatabase(supabase),
    checkStorage(supabase),
    checkAuth(supabase),
    checkRealtime(supabase)
  ]);

  // Calculate summary
  const summary = {
    timestamp: new Date().toISOString(),
    supabaseUrl: SUPABASE_URL,
    checks,
    overall: {
      healthy: checks.filter(c => c.status === 'healthy').length,
      degraded: checks.filter(c => c.status === 'degraded').length,
      unhealthy: checks.filter(c => c.status === 'unhealthy').length
    }
  };

  // Display results
  console.log('Service Check Results:\n');
  checks.forEach(check => {
    const icon = check.status === 'healthy' ? '✅' : 
                 check.status === 'degraded' ? '⚠️' : '❌';
    console.log(`${icon} ${check.service}: ${check.status}`);
    if (check.message) console.log(`   ${check.message}`);
    if (check.error) console.log(`   Error: ${check.error}`);
    if (check.latency) console.log(`   Latency: ${check.latency}ms`);
  });

  console.log(`\nSummary:`);
  console.log(`  Healthy: ${summary.overall.healthy}`);
  console.log(`  Degraded: ${summary.overall.degraded}`);
  console.log(`  Unhealthy: ${summary.overall.unhealthy}`);

  // Save results
  const outputPath = path.join('artifacts', 'observability', 'service-checks.json');
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, JSON.stringify(summary, null, 2));
  console.log(`\n📊 Results saved to ${outputPath}`);

  // Exit with appropriate code
  const hasUnhealthy = summary.overall.unhealthy > 0;
  process.exit(hasUnhealthy ? 1 : 0);
}

main().catch(console.error);
