import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, AlertCircle, Clock, Database, Cloud, Shield, Activity, Bug } from 'lucide-react';
import * as Sentry from '@sentry/react';

interface HealthCheck {
  name: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  latency?: number;
  message?: string;
  details?: Record<string, any>;
}

interface SystemStatus {
  status: 'operational' | 'degraded' | 'down';
  timestamp: string;
  version: string;
  environment: string;
  buildSha: string;
  checks: HealthCheck[];
  metrics: {
    uptime: number;
    memory: {
      used: number;
      total: number;
      percentage: number;
    };
    requests: {
      total: number;
      errorRate: number;
    };
  };
}

export default function Status() {
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const checkDatabase = async (): Promise<HealthCheck> => {
    const start = performance.now();
    try {
      const { error } = await supabase.from('profiles').select('count').limit(1);
      const latency = performance.now() - start;
      
      if (error) {
        return {
          name: 'Database',
          status: 'unhealthy',
          latency,
          message: 'Database connection failed',
          details: { error: error.message },
        };
      }
      
      return {
        name: 'Database',
        status: latency < 1000 ? 'healthy' : 'degraded',
        latency,
        message: 'Database connection successful',
      };
    } catch (error) {
      return {
        name: 'Database',
        status: 'unhealthy',
        latency: performance.now() - start,
        message: 'Database check failed',
        details: { error: String(error) },
      };
    }
  };

  const checkStorage = async (): Promise<HealthCheck> => {
    const start = performance.now();
    try {
      // Try to list a bucket to verify storage access
      const { error } = await supabase.storage.from('statements').list('', { limit: 1 });
      const latency = performance.now() - start;
      
      if (error && !error.message.includes('not found')) {
        return {
          name: 'Storage',
          status: 'unhealthy',
          latency,
          message: 'Storage access failed',
          details: { error: error.message },
        };
      }
      
      return {
        name: 'Storage',
        status: latency < 2000 ? 'healthy' : 'degraded',
        latency,
        message: 'Storage access successful',
      };
    } catch (error) {
      return {
        name: 'Storage',
        status: 'unhealthy',
        latency: performance.now() - start,
        message: 'Storage check failed',
        details: { error: String(error) },
      };
    }
  };

  const checkAuth = async (): Promise<HealthCheck> => {
    const start = performance.now();
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const latency = performance.now() - start;
      
      return {
        name: 'Authentication',
        status: 'healthy',
        latency,
        message: session ? 'Authenticated session active' : 'Authentication service available',
      };
    } catch (error) {
      return {
        name: 'Authentication',
        status: 'unhealthy',
        latency: performance.now() - start,
        message: 'Authentication check failed',
        details: { error: String(error) },
      };
    }
  };

  const checkAPI = async (): Promise<HealthCheck> => {
    const start = performance.now();
    try {
      const response = await fetch('/health');
      const latency = performance.now() - start;
      
      if (!response.ok) {
        return {
          name: 'API',
          status: 'unhealthy',
          latency,
          message: `API returned status ${response.status}`,
        };
      }
      
      return {
        name: 'API',
        status: latency < 500 ? 'healthy' : 'degraded',
        latency,
        message: 'API responding normally',
      };
    } catch (error) {
      return {
        name: 'API',
        status: 'unhealthy',
        latency: performance.now() - start,
        message: 'API check failed',
        details: { error: String(error) },
      };
    }
  };

  const performHealthChecks = async () => {
    setLoading(true);
    
    const checks = await Promise.all([
      checkDatabase(),
      checkStorage(),
      checkAuth(),
      checkAPI(),
    ]);

    // Calculate overall status
    const hasUnhealthy = checks.some(c => c.status === 'unhealthy');
    const hasDegraded = checks.some(c => c.status === 'degraded');
    const overallStatus = hasUnhealthy ? 'down' : hasDegraded ? 'degraded' : 'operational';

    // Get runtime metrics
    const uptime = performance.now();
    const memory = (performance as any).memory || {
      usedJSHeapSize: 0,
      totalJSHeapSize: 0,
    };

    const status: SystemStatus = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      version: import.meta.env.VITE_APP_VERSION || '1.0.0',
      environment: import.meta.env.MODE || 'development',
      buildSha: import.meta.env.VITE_BUILD_SHA || 'unknown',
      checks,
      metrics: {
        uptime: Math.floor(uptime / 1000),
        memory: {
          used: memory.usedJSHeapSize,
          total: memory.totalJSHeapSize,
          percentage: memory.totalJSHeapSize ? 
            (memory.usedJSHeapSize / memory.totalJSHeapSize) * 100 : 0,
        },
        requests: {
          total: 0, // Would need to track this
          errorRate: 0, // Would need to track this
        },
      },
    };

    setSystemStatus(status);
    setLastUpdated(new Date());
    setLoading(false);
  };

  useEffect(() => {
    performHealthChecks();
    
    // Refresh every 30 seconds
    const interval = setInterval(performHealthChecks, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'operational':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'degraded':
        return <AlertCircle className="h-5 w-5 text-yellow-500" />;
      case 'unhealthy':
      case 'down':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <AlertCircle className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'success' | 'warning' | 'destructive'> = {
      healthy: 'success',
      operational: 'success',
      degraded: 'warning',
      unhealthy: 'destructive',
      down: 'destructive',
    };
    
    return (
      <Badge variant={variants[status] || 'secondary'}>
        {status.toUpperCase()}
      </Badge>
    );
  };

  if (loading && !systemStatus) {
    return (
      <div className="container mx-auto p-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Activity className="h-8 w-8 animate-pulse mx-auto mb-4" />
            <p>Checking system status...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!systemStatus) {
    return (
      <div className="container mx-auto p-8">
        <Card className="p-6">
          <div className="text-center">
            <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Unable to retrieve system status</h2>
            <p className="text-muted-foreground">Please try refreshing the page</p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-8">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold mb-2">System Status</h1>
            <p className="text-muted-foreground">
              Real-time health monitoring and service status
            </p>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-2 mb-2">
              {getStatusIcon(systemStatus.status)}
              {getStatusBadge(systemStatus.status)}
            </div>
            <p className="text-sm text-muted-foreground">
              Last updated: {lastUpdated.toLocaleTimeString()}
            </p>
          </div>
        </div>
      </div>

      {/* Overall Status Card */}
      <Card className="p-6 mb-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-sm text-muted-foreground mb-1">Environment</p>
            <p className="font-semibold">{systemStatus.environment}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground mb-1">Version</p>
            <p className="font-semibold">{systemStatus.version}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground mb-1">Build SHA</p>
            <p className="font-mono text-sm">{systemStatus.buildSha.substring(0, 8)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground mb-1">Uptime</p>
            <p className="font-semibold">{systemStatus.metrics.uptime}s</p>
          </div>
        </div>
      </Card>

      {/* Service Health Checks */}
      <div className="grid gap-4 mb-6">
        <h2 className="text-xl font-semibold">Service Health</h2>
        {systemStatus.checks.map((check) => (
          <Card key={check.name} className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {check.name === 'Database' && <Database className="h-5 w-5 text-muted-foreground" />}
                {check.name === 'Storage' && <Cloud className="h-5 w-5 text-muted-foreground" />}
                {check.name === 'Authentication' && <Shield className="h-5 w-5 text-muted-foreground" />}
                {check.name === 'API' && <Activity className="h-5 w-5 text-muted-foreground" />}
                <div>
                  <h3 className="font-semibold">{check.name}</h3>
                  <p className="text-sm text-muted-foreground">{check.message}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                {check.latency && (
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {check.latency.toFixed(0)}ms
                  </div>
                )}
                {getStatusBadge(check.status)}
              </div>
            </div>
            {check.details && (
              <div className="mt-3 p-3 bg-muted/50 rounded text-xs font-mono">
                {JSON.stringify(check.details, null, 2)}
              </div>
            )}
          </Card>
        ))}
      </div>

      {/* Sentry Error Tracking Test */}
      <Card className="p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Bug className="h-5 w-5" />
              Error Tracking Test
            </h2>
            <p className="text-sm text-muted-foreground">
              Test Sentry integration by triggering a controlled error
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                console.log('📨 Sending test message to Sentry...');
                Sentry.captureMessage('Test message from Status page', 'info');
                console.log('✅ Test message sent to Sentry');
                alert('✅ Test message sent to Sentry! Check your Sentry dashboard.');
              }}
            >
              Send Test Message
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => {
                console.log('🚀 Triggering test error for Sentry...');
                try {
                  // Force an error that will be caught by Sentry
                  throw new Error('This is your first error!');
                } catch (error) {
                  console.error('💥 Error caught:', error);
                  // Explicitly send to Sentry
                  Sentry.captureException(error);
                  // Also trigger an uncaught error for testing
                  setTimeout(() => {
                    throw error;
                  }, 0);
                }
              }}
            >
              Break the world
            </Button>
          </div>
        </div>
        <div className="text-sm text-muted-foreground">
          <p>• <strong>Send Test Message:</strong> Sends an info message to Sentry</p>
          <p>• <strong>Break the world:</strong> Triggers a test error for Sentry error tracking</p>
          <p>• Check your Sentry dashboard to see the events: <a href="https://sentry.io" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">sentry.io</a></p>
        </div>
      </Card>

      {/* Memory Usage */}
      {systemStatus.metrics.memory.total > 0 && (
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Memory Usage</h2>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Used</span>
              <span>{(systemStatus.metrics.memory.used / 1024 / 1024).toFixed(2)} MB</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Total</span>
              <span>{(systemStatus.metrics.memory.total / 1024 / 1024).toFixed(2)} MB</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-primary h-2 rounded-full"
                style={{ width: `${systemStatus.metrics.memory.percentage}%` }}
              />
            </div>
            <p className="text-sm text-muted-foreground text-right">
              {systemStatus.metrics.memory.percentage.toFixed(1)}% used
            </p>
          </div>
        </Card>
      )}
    </div>
  );
}
