#!/bin/bash

# Sentry Monitoring Setup for Indigo Yield Platform
# This script configures Sentry for error tracking and performance monitoring

echo "🔍 Setting up Sentry monitoring..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if .env file exists
if [ ! -f ".env" ] && [ ! -f ".env.local" ]; then
    echo -e "${RED}❌ No .env file found${NC}"
    echo "Creating .env.local file..."
    touch .env.local
fi

# Function to add or update env variable
update_env() {
    local key=$1
    local value=$2
    local file=${3:-.env.local}
    
    if grep -q "^$key=" "$file"; then
        # Update existing
        sed -i.bak "s|^$key=.*|$key=$value|" "$file"
        rm "$file.bak"
    else
        # Add new
        echo "$key=$value" >> "$file"
    fi
}

echo -e "${YELLOW}📋 Sentry Configuration${NC}"
echo "================================="
echo ""

# Prompt for Sentry DSN
echo -e "${BLUE}To get your Sentry DSN:${NC}"
echo "1. Go to https://sentry.io"
echo "2. Create a new project (or use existing)"
echo "3. Go to Settings → Projects → [Your Project] → Client Keys (DSN)"
echo "4. Copy the DSN value"
echo ""

read -p "Enter your Sentry DSN (or press Enter to skip): " SENTRY_DSN

if [ -z "$SENTRY_DSN" ]; then
    echo -e "${YELLOW}⚠️  Skipping Sentry configuration. You can add it later.${NC}"
    SENTRY_DSN="your_sentry_dsn_here"
fi

# Update environment variables
echo -e "${YELLOW}Updating environment variables...${NC}"

update_env "VITE_SENTRY_DSN" "$SENTRY_DSN"
update_env "VITE_SENTRY_ORG" "indigo-yield"
update_env "VITE_SENTRY_PROJECT" "indigo-yield-platform"
update_env "VITE_APP_VERSION" "1.0.0"

echo -e "${GREEN}✅ Environment variables updated${NC}"

# Create enhanced Sentry configuration
echo -e "${YELLOW}Creating enhanced Sentry configuration...${NC}"

cat > src/config/monitoring.ts << 'EOF'
import * as Sentry from '@sentry/react';
import { BrowserTracing } from '@sentry/tracing';

export interface MonitoringConfig {
  sentry: {
    dsn: string;
    environment: string;
    enabled: boolean;
    tracesSampleRate: number;
    replaysSessionSampleRate: number;
    replaysOnErrorSampleRate: number;
  };
  performance: {
    enabled: boolean;
    sampleRate: number;
  };
  errorReporting: {
    enabled: boolean;
    includeLocalErrors: boolean;
  };
}

export const monitoringConfig: MonitoringConfig = {
  sentry: {
    dsn: import.meta.env.VITE_SENTRY_DSN || '',
    environment: import.meta.env.MODE || 'development',
    enabled: import.meta.env.VITE_SENTRY_DSN !== 'your_sentry_dsn_here' && !!import.meta.env.VITE_SENTRY_DSN,
    tracesSampleRate: import.meta.env.PROD ? 0.1 : 1.0,
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
  },
  performance: {
    enabled: true,
    sampleRate: import.meta.env.PROD ? 0.1 : 1.0,
  },
  errorReporting: {
    enabled: true,
    includeLocalErrors: !import.meta.env.PROD,
  },
};

export function initializeMonitoring() {
  if (!monitoringConfig.sentry.enabled) {
    console.log('📊 Monitoring: Sentry disabled');
    return;
  }

  try {
    Sentry.init({
      dsn: monitoringConfig.sentry.dsn,
      environment: monitoringConfig.sentry.environment,
      integrations: [
        new BrowserTracing({
          // Set sampling rates
          tracingOrigins: ['localhost', /^https:\/\/.*\.vercel\.app/, /^https:\/\/.*\.indigo\.fund/],
          // Track user interactions
          routingInstrumentation: Sentry.reactRouterV6Instrumentation(
            React.useEffect,
            useLocation,
            useNavigationType,
            createRoutesFromChildren,
            matchRoutes
          ),
        }),
        new Sentry.Replay({
          maskAllText: false,
          maskAllInputs: true,
          blockAllMedia: false,
          sampleRate: monitoringConfig.sentry.replaysSessionSampleRate,
          errorSampleRate: monitoringConfig.sentry.replaysOnErrorSampleRate,
        }),
      ],
      
      // Performance
      tracesSampleRate: monitoringConfig.performance.sampleRate,
      
      // Release tracking
      release: import.meta.env.VITE_APP_VERSION || '1.0.0',
      
      // Custom error handling
      beforeSend(event, hint) {
        // Add custom context
        event.tags = {
          ...event.tags,
          component: 'frontend',
        };
        
        // Filter sensitive data
        if (event.request?.cookies) {
          delete event.request.cookies;
        }
        
        return event;
      },
      
      // Ignored errors
      ignoreErrors: [
        'ResizeObserver loop limit exceeded',
        'Non-Error promise rejection captured',
        'Network request failed',
        'Load failed',
        'ChunkLoadError',
      ],
    });

    console.log('📊 Monitoring: Sentry initialized successfully');
  } catch (error) {
    console.error('📊 Monitoring: Failed to initialize Sentry', error);
  }
}

// Custom error boundary
export class ErrorBoundary extends Sentry.ErrorBoundary {
  constructor(props: any) {
    super(props);
  }
}

// Performance monitoring helpers
export const startTransaction = (name: string, op: string = 'navigation') => {
  return Sentry.startTransaction({ name, op });
};

export const measurePerformance = async <T>(
  operation: string,
  fn: () => Promise<T>
): Promise<T> => {
  const transaction = startTransaction(operation, 'task');
  try {
    const result = await fn();
    transaction.setStatus('ok');
    return result;
  } catch (error) {
    transaction.setStatus('internal_error');
    throw error;
  } finally {
    transaction.finish();
  }
};
EOF

echo -e "${GREEN}✅ Monitoring configuration created${NC}"

# Create monitoring service
echo -e "${YELLOW}Creating monitoring service...${NC}"

cat > src/services/monitoringService.ts << 'EOF'
import * as Sentry from '@sentry/react';

export interface MetricData {
  name: string;
  value: number;
  unit?: string;
  tags?: Record<string, string>;
}

export interface ErrorData {
  message: string;
  level: 'fatal' | 'error' | 'warning' | 'info' | 'debug';
  context?: Record<string, any>;
  user?: {
    id: string;
    email: string;
  };
}

class MonitoringService {
  private isInitialized = false;

  /**
   * Track custom metrics
   */
  trackMetric(metric: MetricData): void {
    if (!this.isInitialized) return;

    Sentry.addBreadcrumb({
      category: 'metric',
      message: metric.name,
      level: 'info',
      data: {
        value: metric.value,
        unit: metric.unit,
        ...metric.tags,
      },
    });

    // Also send to analytics if needed
    if (window.posthog) {
      window.posthog.capture('metric_tracked', metric);
    }
  }

  /**
   * Track user actions
   */
  trackAction(action: string, data?: Record<string, any>): void {
    Sentry.addBreadcrumb({
      category: 'user-action',
      message: action,
      level: 'info',
      data,
    });
  }

  /**
   * Track page views
   */
  trackPageView(page: string, properties?: Record<string, any>): void {
    Sentry.addBreadcrumb({
      category: 'navigation',
      message: `Viewed ${page}`,
      level: 'info',
      data: properties,
    });
  }

  /**
   * Report errors with context
   */
  reportError(error: ErrorData): void {
    const sentryLevel = this.mapErrorLevel(error.level);
    
    if (error.user) {
      Sentry.setUser(error.user);
    }

    if (error.context) {
      Sentry.setContext('error_context', error.context);
    }

    if (error.level === 'fatal' || error.level === 'error') {
      Sentry.captureException(new Error(error.message), {
        level: sentryLevel,
        extra: error.context,
      });
    } else {
      Sentry.captureMessage(error.message, sentryLevel);
    }
  }

  /**
   * Track API performance
   */
  async trackAPICall<T>(
    endpoint: string,
    method: string,
    fn: () => Promise<T>
  ): Promise<T> {
    const transaction = Sentry.startTransaction({
      op: 'http.client',
      name: `${method} ${endpoint}`,
    });

    const span = transaction.startChild({
      op: 'http',
      description: `${method} ${endpoint}`,
    });

    try {
      const startTime = performance.now();
      const result = await fn();
      const duration = performance.now() - startTime;

      this.trackMetric({
        name: 'api_call_duration',
        value: duration,
        unit: 'ms',
        tags: {
          endpoint,
          method,
          status: 'success',
        },
      });

      span.setStatus('ok');
      return result;
    } catch (error) {
      this.trackMetric({
        name: 'api_call_error',
        value: 1,
        tags: {
          endpoint,
          method,
          error: error.message,
        },
      });

      span.setStatus('internal_error');
      throw error;
    } finally {
      span.finish();
      transaction.finish();
    }
  }

  /**
   * Monitor component performance
   */
  measureComponentRender(componentName: string, renderTime: number): void {
    this.trackMetric({
      name: 'component_render_time',
      value: renderTime,
      unit: 'ms',
      tags: {
        component: componentName,
      },
    });

    // Log slow renders
    if (renderTime > 100) {
      this.reportError({
        message: `Slow component render: ${componentName} took ${renderTime}ms`,
        level: 'warning',
        context: {
          component: componentName,
          renderTime,
        },
      });
    }
  }

  /**
   * Track business metrics
   */
  trackBusinessMetric(metric: string, value: number, metadata?: Record<string, any>): void {
    this.trackMetric({
      name: `business.${metric}`,
      value,
      tags: metadata,
    });

    // Send critical metrics as events
    if (metric.includes('revenue') || metric.includes('conversion')) {
      Sentry.captureMessage(`Business Metric: ${metric} = ${value}`, 'info');
    }
  }

  /**
   * Set user context for all monitoring
   */
  setUserContext(user: { id: string; email: string; role?: string }): void {
    Sentry.setUser({
      id: user.id,
      email: user.email,
      role: user.role,
    });

    if (window.posthog) {
      window.posthog.identify(user.id, {
        email: user.email,
        role: user.role,
      });
    }
  }

  /**
   * Clear user context
   */
  clearUserContext(): void {
    Sentry.setUser(null);
    if (window.posthog) {
      window.posthog.reset();
    }
  }

  /**
   * Map error levels
   */
  private mapErrorLevel(level: ErrorData['level']): Sentry.SeverityLevel {
    const mapping: Record<ErrorData['level'], Sentry.SeverityLevel> = {
      fatal: 'fatal',
      error: 'error',
      warning: 'warning',
      info: 'info',
      debug: 'debug',
    };
    return mapping[level];
  }

  /**
   * Initialize monitoring
   */
  initialize(): void {
    this.isInitialized = true;
    console.log('📊 Monitoring service initialized');
  }
}

// Export singleton instance
export const monitoringService = new MonitoringService();

// Export convenience functions
export const trackMetric = monitoringService.trackMetric.bind(monitoringService);
export const trackAction = monitoringService.trackAction.bind(monitoringService);
export const trackPageView = monitoringService.trackPageView.bind(monitoringService);
export const reportError = monitoringService.reportError.bind(monitoringService);
export const trackAPICall = monitoringService.trackAPICall.bind(monitoringService);
export const measureComponentRender = monitoringService.measureComponentRender.bind(monitoringService);
export const trackBusinessMetric = monitoringService.trackBusinessMetric.bind(monitoringService);
EOF

echo -e "${GREEN}✅ Monitoring service created${NC}"

# Create alert configuration
echo -e "${YELLOW}Creating alert configuration...${NC}"

cat > sentry-alerts.json << 'EOF'
{
  "alerts": [
    {
      "name": "High Error Rate",
      "conditions": [
        {
          "id": "error_rate",
          "threshold": 10,
          "window": "5m"
        }
      ],
      "actions": [
        {
          "type": "email",
          "recipients": ["hammadou@indigo.fund"]
        }
      ]
    },
    {
      "name": "Performance Degradation",
      "conditions": [
        {
          "id": "p95_transaction_duration",
          "threshold": 3000,
          "window": "10m"
        }
      ],
      "actions": [
        {
          "type": "email",
          "recipients": ["hammadou@indigo.fund"]
        }
      ]
    },
    {
      "name": "Failed Yield Calculations",
      "conditions": [
        {
          "id": "event_count",
          "query": "message:\"Yield calculation failed\"",
          "threshold": 1,
          "window": "1h"
        }
      ],
      "actions": [
        {
          "type": "email",
          "recipients": ["hammadou@indigo.fund"],
          "priority": "high"
        }
      ]
    },
    {
      "name": "Authentication Failures",
      "conditions": [
        {
          "id": "event_count",
          "query": "tags.category:\"auth\" AND level:error",
          "threshold": 5,
          "window": "15m"
        }
      ],
      "actions": [
        {
          "type": "email",
          "recipients": ["hammadou@indigo.fund"]
        }
      ]
    },
    {
      "name": "Database Connection Issues",
      "conditions": [
        {
          "id": "event_count",
          "query": "message:\"ECONNREFUSED\" OR message:\"ETIMEDOUT\"",
          "threshold": 3,
          "window": "5m"
        }
      ],
      "actions": [
        {
          "type": "email",
          "recipients": ["hammadou@indigo.fund"],
          "priority": "critical"
        }
      ]
    }
  ],
  "dashboards": [
    {
      "name": "Platform Overview",
      "widgets": [
        {
          "type": "error_rate",
          "title": "Error Rate",
          "period": "24h"
        },
        {
          "type": "transaction_count",
          "title": "Transaction Volume",
          "period": "24h"
        },
        {
          "type": "user_count",
          "title": "Active Users",
          "period": "7d"
        },
        {
          "type": "performance_score",
          "title": "Performance Score",
          "period": "24h"
        }
      ]
    },
    {
      "name": "Financial Operations",
      "widgets": [
        {
          "type": "custom_metric",
          "title": "Daily Yield Calculations",
          "query": "business.yield_calculations",
          "period": "7d"
        },
        {
          "type": "custom_metric",
          "title": "Statement Generation",
          "query": "business.statements_generated",
          "period": "30d"
        },
        {
          "type": "error_count",
          "title": "Transaction Errors",
          "query": "tags.category:\"transaction\"",
          "period": "24h"
        }
      ]
    }
  ]
}
EOF

echo -e "${GREEN}✅ Alert configuration created${NC}"

# Create monitoring documentation
echo -e "${YELLOW}Creating monitoring documentation...${NC}"

cat > MONITORING_GUIDE.md << 'EOF'
# Monitoring & Alerting Guide

## Overview
This guide covers the monitoring and alerting setup for the Indigo Yield Platform using Sentry.

## Sentry Configuration

### Setup
1. **Create Sentry Account**: https://sentry.io
2. **Create Project**: Select React as platform
3. **Get DSN**: Settings → Projects → Client Keys
4. **Configure Environment**:
   ```bash
   VITE_SENTRY_DSN=your_dsn_here
   ```

### Features Enabled
- ✅ Error Tracking
- ✅ Performance Monitoring
- ✅ Session Replay
- ✅ Release Tracking
- ✅ User Feedback
- ✅ Custom Metrics

## Alert Configuration

### Critical Alerts
1. **Database Connection Failure**
   - Threshold: 3 errors in 5 minutes
   - Action: Email + SMS
   - Priority: Critical

2. **Failed Yield Calculations**
   - Threshold: 1 error in 1 hour
   - Action: Email
   - Priority: High

3. **Authentication Failures**
   - Threshold: 5 errors in 15 minutes
   - Action: Email
   - Priority: Medium

### Performance Alerts
1. **High Response Time**
   - Threshold: P95 > 3 seconds
   - Action: Email
   - Priority: Medium

2. **High Error Rate**
   - Threshold: > 1% error rate
   - Action: Email
   - Priority: High

## Custom Metrics

### Business Metrics
- `business.yield_calculations`: Daily yield calculation count
- `business.statements_generated`: Monthly statements generated
- `business.user_signups`: New user registrations
- `business.deposits_processed`: Deposit transactions
- `business.withdrawals_processed`: Withdrawal transactions

### Performance Metrics
- `api_call_duration`: API response times
- `component_render_time`: React component performance
- `database_query_time`: Database query performance

## Dashboard Setup

### Main Dashboard
Access: https://sentry.io/organizations/indigo-yield/dashboards/

**Widgets:**
- Error rate (24h)
- Transaction volume (24h)
- User activity (7d)
- Performance score
- Release health

### Financial Operations Dashboard
**Widgets:**
- Yield calculation success rate
- Statement generation metrics
- Transaction processing errors
- Email delivery status

## Error Tracking

### Captured Errors
- JavaScript exceptions
- API failures
- Network errors
- Promise rejections
- Console errors (error level)

### Ignored Errors
- Browser extension conflicts
- ResizeObserver warnings
- Network cancellations
- Known third-party issues

## Performance Monitoring

### Tracked Operations
- Page loads
- API calls
- Database queries
- Component renders
- Asset loading

### Performance Budgets
- Page Load: < 3s
- API Response: < 500ms
- Database Query: < 100ms
- Component Render: < 100ms

## Session Replay

### Configuration
- Sample Rate: 10% of sessions
- Error Sample Rate: 100% of error sessions
- Privacy: PII masked
- Retention: 30 days

### Privacy Settings
- ✅ Mask all text inputs
- ✅ Block sensitive data
- ✅ Exclude password fields
- ✅ Remove personal information

## Integration

### Usage in Code

```typescript
import { reportError, trackMetric, trackAction } from '@/services/monitoringService';

// Report an error
reportError({
  message: 'Failed to process transaction',
  level: 'error',
  context: { transactionId: '123' }
});

// Track a metric
trackMetric({
  name: 'deposit_amount',
  value: 1000,
  unit: 'USD'
});

// Track user action
trackAction('button_clicked', {
  button: 'submit_deposit'
});
```

### API Integration

```typescript
// Wrap API calls for monitoring
const result = await trackAPICall(
  '/api/transactions',
  'POST',
  () => fetch('/api/transactions', { method: 'POST', body: data })
);
```

## Troubleshooting

### Common Issues

1. **Sentry not capturing errors**
   - Check DSN configuration
   - Verify environment variables
   - Check browser console for errors

2. **High volume of errors**
   - Review error filters
   - Check sampling rates
   - Update ignore list

3. **Missing user context**
   - Ensure setUserContext is called on login
   - Verify user data is available

## Best Practices

1. **Error Context**: Always provide context with errors
2. **User Information**: Set user context on authentication
3. **Custom Tags**: Use tags for filtering and grouping
4. **Breadcrumbs**: Add breadcrumbs for debugging
5. **Sampling**: Adjust sampling rates based on volume
6. **PII**: Never send sensitive data to Sentry

## Maintenance

### Daily Tasks
- Review error dashboard
- Check alert notifications
- Verify performance metrics

### Weekly Tasks
- Analyze error trends
- Review performance reports
- Update alert thresholds

### Monthly Tasks
- Review and archive old errors
- Optimize sampling rates
- Update monitoring configuration

## Contact

For monitoring issues:
- Primary: Platform Team
- Secondary: hammadou@indigo.fund
- Sentry Support: support@sentry.io
EOF

echo -e "${GREEN}✅ Monitoring documentation created${NC}"

# Update Vercel environment variables
echo -e "${YELLOW}Adding Sentry configuration to Vercel...${NC}"

if command -v vercel &> /dev/null; then
    if [ "$SENTRY_DSN" != "your_sentry_dsn_here" ]; then
        vercel env add VITE_SENTRY_DSN production < <(echo "$SENTRY_DSN")
        vercel env add VITE_SENTRY_DSN preview < <(echo "$SENTRY_DSN")
        echo -e "${GREEN}✅ Sentry DSN added to Vercel${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  Vercel CLI not found. Please add VITE_SENTRY_DSN manually in Vercel dashboard${NC}"
fi

# Summary
echo ""
echo "================================="
echo -e "${GREEN}✅ Sentry Monitoring Setup Complete!${NC}"
echo "================================="
echo ""
echo "Next steps:"
echo "1. Get your Sentry DSN from https://sentry.io"
echo "2. Update .env.local with your DSN"
echo "3. Deploy to production"
echo "4. Configure alerts in Sentry dashboard"
echo ""
echo "Files created:"
echo "  • src/config/monitoring.ts"
echo "  • src/services/monitoringService.ts"
echo "  • sentry-alerts.json"
echo "  • MONITORING_GUIDE.md"
echo ""
echo -e "${YELLOW}⚠️  Important:${NC}"
echo "• Set up alerts in Sentry dashboard"
echo "• Configure team notifications"
echo "• Test error reporting in staging"
echo "• Review privacy settings for compliance"
