import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { AlertCircle, CheckCircle, TrendingDown, TrendingUp, Activity } from 'lucide-react';

interface PerformanceMetrics {
  lighthouse: {
    performance: number;
    accessibility: number;
    bestPractices: number;
    seo: number;
    pwa: number;
  };
  webVitals: {
    lcp: number;
    fid: number;
    cls: number;
    fcp: number;
    ttfb: number;
  };
  bundle: {
    size: number;
    chunks: number;
    assets: number;
    cssSize: number;
    jsSize: number;
  };
  api: {
    p50: number;
    p95: number;
    p99: number;
    errorRate: number;
    throughput: number;
  };
  cache: {
    hitRate: number;
    missRate: number;
    evictions: number;
    size: number;
  };
  database: {
    queryTime: number;
    connectionPoolUsage: number;
    slowQueries: number;
    indexHitRate: number;
  };
  images: {
    totalSize: number;
    optimizedSize: number;
    savings: number;
    formats: {
      webp: number;
      avif: number;
      original: number;
    };
  };
  history: Array<{
    timestamp: string;
    lcp: number;
    fid: number;
    cls: number;
    performance: number;
  }>;
}

interface MetricCardProps {
  title: string;
  value: number | string;
  target?: number | string;
  format?: 'ms' | 'kb' | 'mb' | 'percent' | 'score' | 'number';
  trend?: 'up' | 'down' | 'stable';
  status?: 'good' | 'warning' | 'error';
}

const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  target,
  format = 'number',
  trend,
  status,
}) => {
  const formatValue = (val: number | string): string => {
    if (typeof val === 'string') return val;

    switch (format) {
      case 'ms':
        return `${val}ms`;
      case 'kb':
        return `${(val / 1024).toFixed(2)}KB`;
      case 'mb':
        return `${(val / (1024 * 1024)).toFixed(2)}MB`;
      case 'percent':
        return `${val.toFixed(1)}%`;
      case 'score':
        return val.toFixed(0);
      default:
        return val.toString();
    }
  };

  const getStatusColor = () => {
    if (status === 'good') return 'text-green-600';
    if (status === 'warning') return 'text-yellow-600';
    if (status === 'error') return 'text-red-600';
    return 'text-gray-600';
  };

  const getTrendIcon = () => {
    if (trend === 'up') return <TrendingUp className="h-4 w-4 text-green-500" />;
    if (trend === 'down') return <TrendingDown className="h-4 w-4 text-red-500" />;
    return null;
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription>{title}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline justify-between">
          <div className={`text-2xl font-bold ${getStatusColor()}`}>
            {formatValue(value)}
          </div>
          <div className="flex items-center gap-2">
            {getTrendIcon()}
            {target && (
              <span className="text-sm text-muted-foreground">
                Target: {formatValue(target)}
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export const PerformanceDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(30000);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const response = await fetch('/api/analytics/performance');
        const data = await response.json();
        setMetrics(data);
      } catch (error) {
        console.error('Failed to fetch performance metrics:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
    const interval = setInterval(fetchMetrics, refreshInterval);

    return () => clearInterval(interval);
  }, [refreshInterval]);

  if (loading || !metrics) {
    return (
      <div className="flex items-center justify-center h-64">
        <Activity className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const getLighthouseStatus = (score: number) => {
    if (score >= 90) return 'good';
    if (score >= 50) return 'warning';
    return 'error';
  };

  const getVitalStatus = (metric: string, value: number) => {
    const thresholds: Record<string, { good: number; warning: number }> = {
      lcp: { good: 2500, warning: 4000 },
      fid: { good: 100, warning: 300 },
      cls: { good: 0.1, warning: 0.25 },
      fcp: { good: 1800, warning: 3000 },
      ttfb: { good: 600, warning: 1800 },
    };

    const threshold = thresholds[metric];
    if (!threshold) return 'warning';

    if (value <= threshold.good) return 'good';
    if (value <= threshold.warning) return 'warning';
    return 'error';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Performance Dashboard</h1>
          <p className="text-muted-foreground">
            Real-time performance metrics and monitoring
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Badge variant="outline">
            Auto-refresh: {refreshInterval / 1000}s
          </Badge>
          <select
            value={refreshInterval}
            onChange={(e) => setRefreshInterval(Number(e.target.value))}
            className="rounded-md border px-3 py-1"
          >
            <option value={10000}>10s</option>
            <option value={30000}>30s</option>
            <option value={60000}>1m</option>
            <option value={300000}>5m</option>
          </select>
        </div>
      </div>

      {/* Lighthouse Scores */}
      <Card>
        <CardHeader>
          <CardTitle>Lighthouse Scores</CardTitle>
          <CardDescription>
            Overall site quality metrics from latest audit
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {Object.entries(metrics.lighthouse).map(([key, value]) => (
              <div key={key} className="text-center">
                <div className="relative inline-flex">
                  <svg className="w-20 h-20">
                    <circle
                      cx="40"
                      cy="40"
                      r="35"
                      fill="none"
                      stroke="#e5e7eb"
                      strokeWidth="5"
                    />
                    <circle
                      cx="40"
                      cy="40"
                      r="35"
                      fill="none"
                      stroke={
                        value >= 90
                          ? '#10b981'
                          : value >= 50
                          ? '#f59e0b'
                          : '#ef4444'
                      }
                      strokeWidth="5"
                      strokeDasharray={`${(value / 100) * 220} 220`}
                      strokeDashoffset="0"
                      transform="rotate(-90 40 40)"
                    />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center text-lg font-bold">
                    {value}
                  </span>
                </div>
                <div className="mt-2 text-sm font-medium capitalize">
                  {key.replace(/([A-Z])/g, ' $1').trim()}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Core Web Vitals */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MetricCard
          title="Largest Contentful Paint (LCP)"
          value={metrics.webVitals.lcp}
          target={2500}
          format="ms"
          status={getVitalStatus('lcp', metrics.webVitals.lcp)}
        />
        <MetricCard
          title="First Input Delay (FID)"
          value={metrics.webVitals.fid}
          target={100}
          format="ms"
          status={getVitalStatus('fid', metrics.webVitals.fid)}
        />
        <MetricCard
          title="Cumulative Layout Shift (CLS)"
          value={metrics.webVitals.cls}
          target={0.1}
          format="score"
          status={getVitalStatus('cls', metrics.webVitals.cls)}
        />
      </div>

      {/* Tabs for different metric categories */}
      <Tabs defaultValue="bundle" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="bundle">Bundle</TabsTrigger>
          <TabsTrigger value="api">API</TabsTrigger>
          <TabsTrigger value="cache">Cache</TabsTrigger>
          <TabsTrigger value="database">Database</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
        </TabsList>

        <TabsContent value="bundle" className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <MetricCard
              title="Total Bundle Size"
              value={metrics.bundle.size}
              target={200 * 1024}
              format="kb"
            />
            <MetricCard
              title="JavaScript Size"
              value={metrics.bundle.jsSize}
              format="kb"
            />
            <MetricCard
              title="CSS Size"
              value={metrics.bundle.cssSize}
              format="kb"
            />
            <MetricCard
              title="Total Chunks"
              value={metrics.bundle.chunks}
              format="number"
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Image Optimization</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span>Optimization Savings</span>
                  <span className="font-bold text-green-600">
                    {metrics.images.savings}%
                  </span>
                </div>
                <Progress value={metrics.images.savings} className="h-2" />
                <div className="grid grid-cols-3 gap-4 mt-4">
                  <div>
                    <div className="text-sm text-muted-foreground">WebP</div>
                    <div className="font-bold">
                      {(metrics.images.formats.webp / 1024).toFixed(0)}KB
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">AVIF</div>
                    <div className="font-bold">
                      {(metrics.images.formats.avif / 1024).toFixed(0)}KB
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Original</div>
                    <div className="font-bold">
                      {(metrics.images.formats.original / 1024).toFixed(0)}KB
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="api" className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <MetricCard
              title="P50 Response Time"
              value={metrics.api.p50}
              target={100}
              format="ms"
              status={metrics.api.p50 < 100 ? 'good' : 'warning'}
            />
            <MetricCard
              title="P95 Response Time"
              value={metrics.api.p95}
              target={200}
              format="ms"
              status={metrics.api.p95 < 200 ? 'good' : 'warning'}
            />
            <MetricCard
              title="P99 Response Time"
              value={metrics.api.p99}
              target={500}
              format="ms"
              status={metrics.api.p99 < 500 ? 'good' : 'warning'}
            />
            <MetricCard
              title="Error Rate"
              value={metrics.api.errorRate}
              target={1}
              format="percent"
              status={metrics.api.errorRate < 1 ? 'good' : 'error'}
            />
            <MetricCard
              title="Throughput"
              value={`${metrics.api.throughput} req/s`}
              format="number"
            />
          </div>
        </TabsContent>

        <TabsContent value="cache" className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <MetricCard
              title="Cache Hit Rate"
              value={metrics.cache.hitRate}
              target={80}
              format="percent"
              status={metrics.cache.hitRate > 80 ? 'good' : 'warning'}
              trend={metrics.cache.hitRate > 75 ? 'up' : 'down'}
            />
            <MetricCard
              title="Cache Miss Rate"
              value={metrics.cache.missRate}
              format="percent"
            />
            <MetricCard
              title="Cache Size"
              value={metrics.cache.size}
              format="mb"
            />
            <MetricCard
              title="Evictions/Hour"
              value={metrics.cache.evictions}
              format="number"
            />
          </div>
        </TabsContent>

        <TabsContent value="database" className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <MetricCard
              title="Avg Query Time"
              value={metrics.database.queryTime}
              target={50}
              format="ms"
              status={metrics.database.queryTime < 50 ? 'good' : 'warning'}
            />
            <MetricCard
              title="Connection Pool Usage"
              value={metrics.database.connectionPoolUsage}
              target={70}
              format="percent"
              status={metrics.database.connectionPoolUsage < 70 ? 'good' : 'warning'}
            />
            <MetricCard
              title="Slow Queries"
              value={metrics.database.slowQueries}
              target={0}
              format="number"
              status={metrics.database.slowQueries === 0 ? 'good' : 'warning'}
            />
            <MetricCard
              title="Index Hit Rate"
              value={metrics.database.indexHitRate}
              target={95}
              format="percent"
              status={metrics.database.indexHitRate > 95 ? 'good' : 'warning'}
            />
          </div>
        </TabsContent>

        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Performance Trends</CardTitle>
              <CardDescription>
                Core Web Vitals over the last 24 hours
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={metrics.history}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="timestamp"
                    tickFormatter={(value) => new Date(value).toLocaleTimeString()}
                  />
                  <YAxis />
                  <Tooltip
                    labelFormatter={(value) => new Date(value).toLocaleString()}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="lcp"
                    stroke="#8884d8"
                    name="LCP (ms)"
                  />
                  <Line
                    type="monotone"
                    dataKey="fid"
                    stroke="#82ca9d"
                    name="FID (ms)"
                  />
                  <Line
                    type="monotone"
                    dataKey="cls"
                    stroke="#ffc658"
                    name="CLS"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Lighthouse Score Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={metrics.history}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="timestamp"
                    tickFormatter={(value) => new Date(value).toLocaleTimeString()}
                  />
                  <YAxis domain={[0, 100]} />
                  <Tooltip
                    labelFormatter={(value) => new Date(value).toLocaleString()}
                  />
                  <Area
                    type="monotone"
                    dataKey="performance"
                    stroke="#10b981"
                    fill="#10b981"
                    fillOpacity={0.3}
                    name="Performance Score"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};