import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // Handle OPTIONS request for CORS
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const startTime = Date.now();
  
  // Basic health check response
  const healthStatus = {
    ok: true,
    timestamp: new Date().toISOString(),
    version: process.env.VITE_APP_VERSION || '1.0.0',
    environment: process.env.VERCEL_ENV || 'development',
    buildSha: process.env.VERCEL_GIT_COMMIT_SHA || 'unknown',
    uptime: process.uptime(),
    checks: {
      api: 'healthy',
      environment: 'configured'
    }
  };

  // Optional: Check Supabase connectivity (using anon key, no PII)
  if (process.env.VITE_SUPABASE_URL && process.env.VITE_SUPABASE_ANON_KEY) {
    try {
      const supabaseUrl = process.env.VITE_SUPABASE_URL;
      const response = await fetch(`${supabaseUrl}/rest/v1/`, {
        method: 'HEAD',
        headers: {
          'apikey': process.env.VITE_SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${process.env.VITE_SUPABASE_ANON_KEY}`
        }
      });
      
      healthStatus.checks['database'] = response.ok ? 'healthy' : 'degraded';
    } catch (error) {
      healthStatus.checks['database'] = 'unhealthy';
    }
  } else {
    healthStatus.checks['database'] = 'not-configured';
  }

  const responseTime = Date.now() - startTime;
  healthStatus['responseTime'] = responseTime;

  return res.status(200).json(healthStatus);
}
