# Production Monitoring & Testing Plan

## Overview

This document outlines the continuous monitoring and testing strategy for the Indigo Yield Platform in production. The goal is to detect and resolve issues before they impact users.

---

## 1. Synthetic Monitoring (24/7 Uptime Checks)

### 1.1 Uptime Monitoring

**Tool:** Pingdom / UptimeRobot / Datadog Synthetics

**Monitored Endpoints:**
| Endpoint | Check Interval | Alert Threshold | Escalation |
|----------|----------------|-----------------|------------|
| https://app.indigo.com | 1 minute | 2 consecutive failures | Page on-call |
| https://api.indigo.com/health | 1 minute | 2 consecutive failures | Page on-call |
| https://app.indigo.com/login | 5 minutes | 3 consecutive failures | Slack alert |
| https://app.indigo.com/dashboard | 5 minutes | 3 consecutive failures | Slack alert |

**Geographic Monitoring:**
- North America (US East, US West)
- Europe (London, Frankfurt)
- Asia (Singapore)

### 1.2 Synthetic User Transactions

**Critical User Journeys (every 5 minutes):**

1. **Login Flow**
   ```javascript
   // Playwright script
   async function syntheticLogin() {
     await page.goto('https://app.indigo.com/login');
     await page.fill('[name="email"]', process.env.SYNTHETIC_USER_EMAIL);
     await page.fill('[name="password"]', process.env.SYNTHETIC_USER_PASSWORD);
     await page.click('button:has-text("Login")');

     // Verify dashboard loads
     await expect(page).toHaveURL('/dashboard');
     await expect(page.locator('[data-testid="portfolio-total-value"]')).toBeVisible();

     // Record metrics
     recordMetric('synthetic_login_success', 1);
     recordMetric('synthetic_login_duration_ms', duration);
   }
   ```

2. **Portfolio View**
   ```javascript
   async function syntheticPortfolioView() {
     // Assumes user is logged in
     await page.goto('https://app.indigo.com/portfolio');

     // Wait for portfolio data to load
     await page.waitForSelector('[data-testid="portfolio-loaded"]');

     // Verify key elements
     await expect(page.locator('[data-testid="total-value"]')).toBeVisible();
     await expect(page.locator('[data-testid="holdings-table"]')).toBeVisible();

     recordMetric('synthetic_portfolio_view_success', 1);
   }
   ```

3. **API Health Check**
   ```javascript
   async function syntheticAPICheck() {
     const endpoints = [
       '/api/portfolio',
       '/api/transactions',
       '/api/user/profile',
     ];

     for (const endpoint of endpoints) {
       const start = Date.now();
       const response = await fetch(`https://api.indigo.com${endpoint}`, {
         headers: { Authorization: `Bearer ${token}` }
       });
       const duration = Date.now() - start;

       recordMetric(`synthetic_api_${endpoint}_duration_ms`, duration);
       recordMetric(`synthetic_api_${endpoint}_status`, response.status);

       if (response.status !== 200) {
         alertOnCall(`API endpoint ${endpoint} returned ${response.status}`);
       }
     }
   }
   ```

**Alert Rules:**
- If synthetic transaction fails 2x in a row → Slack alert
- If synthetic transaction fails 3x in a row → Page on-call engineer
- If response time > 3x baseline → Warning alert
- If response time > 5x baseline → Page on-call engineer

---

## 2. Real User Monitoring (RUM)

### 2.1 Web Vitals Tracking

**Tool:** Google Analytics + PostHog + Sentry

**Tracked Metrics:**

| Metric | Good | Needs Improvement | Poor | Alert Threshold |
|--------|------|-------------------|------|-----------------|
| LCP (Largest Contentful Paint) | < 2.5s | 2.5-4.0s | > 4.0s | p75 > 3.5s |
| FID (First Input Delay) | < 100ms | 100-300ms | > 300ms | p75 > 200ms |
| CLS (Cumulative Layout Shift) | < 0.1 | 0.1-0.25 | > 0.25 | p75 > 0.2 |
| FCP (First Contentful Paint) | < 1.8s | 1.8-3.0s | > 3.0s | p75 > 2.5s |
| TTFB (Time to First Byte) | < 800ms | 800-1800ms | > 1800ms | p75 > 1500ms |
| TBT (Total Blocking Time) | < 200ms | 200-600ms | > 600ms | p75 > 400ms |

**Implementation:**

```typescript
// web-vitals.ts
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';

function sendToAnalytics(metric: Metric) {
  // Send to PostHog
  posthog.capture('web_vitals', {
    metric: metric.name,
    value: metric.value,
    delta: metric.delta,
    id: metric.id,
    page: window.location.pathname,
  });

  // Send to Sentry
  Sentry.setMeasurement(metric.name, metric.value, metric.unit);
}

getCLS(sendToAnalytics);
getFID(sendToAnalytics);
getFCP(sendToAnalytics);
getLCP(sendToAnalytics);
getTTFB(sendToAnalytics);
```

### 2.2 User Session Replay

**Tool:** LogRocket / FullStory / PostHog Session Replay

**Configuration:**
- Record 100% of error sessions
- Sample 5% of successful sessions
- Sanitize all PII (account numbers, SSN, etc.)
- Redact all input fields by default

**Use Cases:**
- Debug user-reported issues
- Understand user behavior leading to errors
- Identify UX friction points
- Validate bug fixes

---

## 3. Application Performance Monitoring (APM)

### 3.1 Backend API Monitoring

**Tool:** Datadog / New Relic / Sentry Performance

**Tracked Endpoints:**

| Endpoint | p50 Target | p95 Target | p99 Target | Error Rate Target |
|----------|------------|------------|------------|-------------------|
| POST /auth/login | < 200ms | < 500ms | < 1000ms | < 0.1% |
| GET /portfolio | < 150ms | < 400ms | < 800ms | < 0.1% |
| GET /transactions | < 200ms | < 500ms | < 1000ms | < 0.1% |
| POST /deposit | < 500ms | < 1000ms | < 2000ms | < 0.5% |
| POST /withdrawal | < 500ms | < 1000ms | < 2000ms | < 0.5% |
| POST /kyc/verify | < 1000ms | < 3000ms | < 5000ms | < 1.0% |

**Alert Rules:**

```yaml
# Datadog Monitor Configuration
- name: "High API Error Rate"
  query: "sum(last_5m):sum:api.errors{env:production}.as_count() > 100"
  message: |
    API error rate is high: {{value}} errors in last 5 minutes

    @slack-engineering @pagerduty

  escalation:
    - delay: 0m
      recipients: ["slack-engineering"]
    - delay: 5m
      recipients: ["pagerduty"]

- name: "Slow API Response Time"
  query: "avg(last_10m):avg:api.response_time{env:production,endpoint:*/portfolio} > 1000"
  message: |
    Portfolio API is slow: {{value}}ms average response time

    @slack-backend-team

  priority: P2

- name: "Database Connection Pool Exhausted"
  query: "max(last_5m):max:database.connections.used{env:production} / max:database.connections.max{env:production} > 0.9"
  message: |
    Database connection pool is 90%+ utilized

    @pagerduty-database

  priority: P1
```

### 3.2 Database Monitoring

**Tool:** Datadog Database Monitoring / Supabase Dashboard

**Monitored Metrics:**

| Metric | Target | Alert Threshold |
|--------|--------|-----------------|
| Query Response Time (p95) | < 50ms | > 200ms |
| Connection Pool Usage | < 70% | > 90% |
| Slow Query Count | < 10/min | > 50/min |
| Deadlock Count | 0 | > 0 |
| Replication Lag | < 1s | > 5s |
| Disk Usage | < 80% | > 90% |

**Slow Query Monitoring:**

```sql
-- Identify slow queries in production
SELECT
  query,
  calls,
  total_time / 1000 as total_time_seconds,
  mean_time / 1000 as mean_time_seconds,
  max_time / 1000 as max_time_seconds
FROM pg_stat_statements
WHERE mean_time > 100  -- Queries averaging > 100ms
ORDER BY total_time DESC
LIMIT 20;
```

**Auto-remediation Scripts:**

```bash
# scripts/database-health-check.sh
#!/bin/bash

# Check for long-running queries
LONG_QUERIES=$(psql -t -c "SELECT COUNT(*) FROM pg_stat_activity WHERE state = 'active' AND now() - query_start > interval '5 minutes'")

if [ "$LONG_QUERIES" -gt 5 ]; then
  echo "Found $LONG_QUERIES long-running queries"
  # Kill queries running > 10 minutes
  psql -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE state = 'active' AND now() - query_start > interval '10 minutes'"

  # Alert
  curl -X POST $SLACK_WEBHOOK -d "{\"text\": \"Killed $LONG_QUERIES long-running database queries\"}"
fi
```

---

## 4. Error Tracking & Logging

### 4.1 Error Monitoring

**Tool:** Sentry

**Configuration:**

```typescript
// sentry.config.ts
import * as Sentry from '@sentry/react';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1, // 10% of transactions

  beforeSend(event, hint) {
    // Redact sensitive data
    if (event.request) {
      delete event.request.cookies;
      delete event.request.headers['Authorization'];
    }

    // Filter out noisy errors
    if (event.exception?.values?.[0]?.value?.includes('ResizeObserver')) {
      return null; // Don't send
    }

    return event;
  },

  integrations: [
    new Sentry.BrowserTracing(),
    new Sentry.Replay({
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],
});
```

**Error Severity Classification:**

| Error Type | Severity | Example | Response |
|------------|----------|---------|----------|
| Financial Calculation Error | Critical | Incorrect portfolio value | Page immediately |
| Payment Processing Error | Critical | Failed deposit/withdrawal | Page immediately |
| Authentication Error | High | Cannot login | Alert team |
| Data Loading Error | Medium | Chart failed to load | Monitor |
| UI Rendering Error | Low | Minor visual glitch | Log only |

**Alert Rules:**

```yaml
# Sentry Alert Rules
- name: "Critical Error in Production"
  conditions:
    - error.level: fatal OR error
    - error.environment: production
    - error.message: contains("portfolio" OR "transaction" OR "payment")
  actions:
    - pagerduty: oncall-engineering
    - slack: "#critical-alerts"

- name: "High Error Rate"
  conditions:
    - event.count: > 100
    - time.window: 5 minutes
    - error.environment: production
  actions:
    - slack: "#engineering"

- name: "New Error Type"
  conditions:
    - error.is_new: true
    - error.level: error OR fatal
    - error.environment: production
  actions:
    - slack: "#engineering"
    - email: engineering-team@indigo.com
```

### 4.2 Structured Logging

**Log Levels:**

| Level | Use Case | Example |
|-------|----------|---------|
| ERROR | System failures, exceptions | "Failed to process payment: {error}" |
| WARN | Potential issues, degraded performance | "API response time exceeded threshold: 2.5s" |
| INFO | Important business events | "User deposited $5000" |
| DEBUG | Detailed diagnostic information | "Query executed: SELECT * FROM..." |

**Logging Best Practices:**

```typescript
// logger.ts
import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: {
    service: 'indigo-api',
    environment: process.env.NODE_ENV,
  },
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
  ],
});

// Usage
logger.info('User deposited funds', {
  userId: user.id,
  amount: 5000,
  transactionId: tx.id,
  timestamp: new Date().toISOString(),
});

logger.error('Payment processing failed', {
  userId: user.id,
  amount: 5000,
  error: error.message,
  stack: error.stack,
  transactionId: tx.id,
});
```

---

## 5. Business Metrics Monitoring

### 5.1 Key Business Metrics

**Tool:** PostHog / Mixpanel + Custom Dashboard

| Metric | Tracking | Alert Condition |
|--------|----------|-----------------|
| New User Signups | Hourly | Drop > 50% from baseline |
| Successful Logins | Real-time | Drop > 30% from baseline |
| Deposits (Count) | Hourly | Drop > 40% from baseline |
| Deposits (Value) | Hourly | Drop > 50% from baseline |
| Withdrawals (Count) | Hourly | Spike > 200% from baseline |
| Portfolio Views | Hourly | Drop > 50% from baseline |
| Transaction Failures | Real-time | > 5% failure rate |
| Support Tickets | Daily | Spike > 150% from baseline |

**Implementation:**

```typescript
// metrics.ts
import { PostHog } from 'posthog-node';

const posthog = new PostHog(process.env.POSTHOG_API_KEY);

// Track business events
export function trackDeposit(userId: string, amount: number, transactionId: string) {
  posthog.capture({
    distinctId: userId,
    event: 'deposit_completed',
    properties: {
      amount,
      transactionId,
      timestamp: new Date().toISOString(),
    },
  });

  // Also send to monitoring dashboard
  sendMetric('deposits.count', 1);
  sendMetric('deposits.value', amount);
}

export function trackError(errorType: string, context: any) {
  posthog.capture({
    distinctId: context.userId || 'anonymous',
    event: 'error_occurred',
    properties: {
      errorType,
      ...context,
      timestamp: new Date().toISOString(),
    },
  });

  sendMetric(`errors.${errorType}`, 1);
}
```

### 5.2 Conversion Funnel Monitoring

**Tracked Funnels:**

1. **Signup Funnel**
   - Land on homepage → Click "Sign Up" → Fill form → Verify email → Login

2. **Deposit Funnel**
   - Login → View dashboard → Click "Deposit" → Fill form → Submit → Success

3. **KYC Funnel**
   - Start KYC → Upload ID → Upload address → Facial verification → Approval

**Alert if drop-off rate exceeds:**
- Signup: > 80% at any step
- Deposit: > 60% at any step
- KYC: > 70% at any step

---

## 6. Security Monitoring

### 6.1 Security Event Monitoring

**Tool:** Datadog Security Monitoring + CloudFlare

**Monitored Events:**

| Event | Detection | Response |
|-------|-----------|----------|
| Brute force attack | > 100 failed logins from same IP in 5 min | Auto-block IP |
| Credential stuffing | > 50 failed logins from different IPs in 5 min | CAPTCHA challenge |
| SQL injection attempt | Malicious SQL patterns in query params | Block & alert |
| XSS attempt | Script tags in user input | Sanitize & alert |
| Unauthorized API access | 401/403 spike | Alert security team |
| Data breach attempt | Mass data export | Block & page security |
| DDoS attack | Traffic spike > 10x baseline | CloudFlare mitigation |

**Alert Configuration:**

```yaml
# Security Alerts
- name: "Potential Brute Force Attack"
  query: "count(last_5m):sum:auth.failed_login{*}.as_count() by {ip_address} > 100"
  message: |
    Potential brute force attack detected from IP: {{ip_address.name}}
    Failed login attempts: {{value}}

    @pagerduty-security @slack-security

  auto_resolve: true
  priority: P1

- name: "Suspicious Data Export"
  query: "count(last_15m):sum:api.data_export{*}.as_count() by {user_id} > 1000"
  message: |
    User {{user_id.name}} exported >1000 records in 15 minutes

    Potential data breach attempt. Investigate immediately.

    @pagerduty-security

  priority: P0
```

### 6.2 Compliance Monitoring

**Audit Trail Monitoring:**

```typescript
// audit-log.ts
export function logAuditEvent(event: AuditEvent) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    userId: event.userId,
    action: event.action,
    resource: event.resource,
    resourceId: event.resourceId,
    ipAddress: event.ipAddress,
    userAgent: event.userAgent,
    result: event.result,
    metadata: event.metadata,
  };

  // Store in audit log database (immutable)
  await db.auditLogs.insert(logEntry);

  // Send to SIEM for analysis
  await siem.sendEvent(logEntry);

  // Alert on sensitive actions
  if (SENSITIVE_ACTIONS.includes(event.action)) {
    alertSecurityTeam(logEntry);
  }
}

// Usage
await logAuditEvent({
  userId: user.id,
  action: 'WITHDRAWAL_APPROVED',
  resource: 'withdrawal',
  resourceId: withdrawal.id,
  ipAddress: req.ip,
  userAgent: req.headers['user-agent'],
  result: 'success',
  metadata: { amount: 10000, destination: '****1234' },
});
```

---

## 7. Alerting & Escalation

### 7.1 Alert Routing

**Channels:**

| Severity | Channel | Recipients | Response Time SLA |
|----------|---------|------------|-------------------|
| P0: Critical | PagerDuty | On-call engineer | < 5 minutes |
| P1: High | PagerDuty + Slack | Backend team | < 15 minutes |
| P2: Medium | Slack | Engineering team | < 1 hour |
| P3: Low | Email | Engineering team | < 24 hours |
| P4: Informational | Dashboard | N/A | N/A |

**On-Call Rotation:**

```
Week 1: Engineer A (Primary), Engineer B (Secondary)
Week 2: Engineer C (Primary), Engineer D (Secondary)
Week 3: Engineer E (Primary), Engineer A (Secondary)
Week 4: Engineer B (Primary), Engineer C (Secondary)
```

### 7.2 Escalation Policy

**Level 1: On-Call Engineer (0-15 minutes)**
- Acknowledge alert within 5 minutes
- Begin investigation
- Provide status update in incident channel

**Level 2: Team Lead (15-30 minutes)**
- If issue not resolved or acknowledged in 15 minutes
- Team lead paged automatically
- Decision to escalate or mobilize additional resources

**Level 3: Engineering Manager + CTO (30-60 minutes)**
- If critical issue not resolved in 30 minutes
- All hands on deck
- Executive communication

**Level 4: Crisis Management (60+ minutes)**
- CEO notified
- Customer communication prepared
- External communication (status page, social media)

---

## 8. Incident Response Playbook

### 8.1 Incident Classification

| Severity | Definition | Examples | Response |
|----------|------------|----------|----------|
| P0 | System down, data loss, security breach | Site unreachable, payment processing failed, database corrupted | All hands, immediate response |
| P1 | Major feature broken, significant user impact | Login not working, portfolio values incorrect, deposits failing | Page on-call, mobilize team |
| P2 | Minor feature broken, limited user impact | Chart not loading, slow page, minor UI bug | Slack alert, fix in next sprint |
| P3 | Cosmetic issue, no functional impact | Typo, color inconsistency | Log ticket, fix when convenient |

### 8.2 Incident Response Steps

**1. Detection & Acknowledgment (0-5 minutes)**
```
- Alert fires
- On-call engineer acknowledges in PagerDuty
- Create incident channel in Slack: #incident-YYYY-MM-DD-brief-description
- Post initial status update
```

**2. Triage & Assessment (5-15 minutes)**
```
- Assess severity and impact
- Identify affected users/systems
- Check recent deployments
- Review monitoring dashboards
- Form initial hypothesis
```

**3. Mitigation (15-60 minutes)**
```
- Implement temporary fix or workaround
- Consider rollback if recent deployment
- Scale resources if load-related
- Isolate affected component if possible
- Monitor error rates and user impact
```

**4. Communication (Ongoing)**
```
- Update incident channel every 15 minutes
- Update status page if user-facing
- Notify customer support team
- Prepare customer communication if needed
```

**5. Resolution (Variable)**
```
- Deploy permanent fix
- Validate fix in production
- Monitor for recurrence
- Update status page
- Send all-clear notification
```

**6. Post-Mortem (Within 48 hours)**
```
- Schedule post-mortem meeting
- Document timeline of events
- Identify root cause
- List action items to prevent recurrence
- Conduct blameless review
- Share learnings with team
```

### 8.3 Incident Templates

**Status Page Update Template:**

```
[INCIDENT] [INVESTIGATING/IDENTIFIED/MONITORING/RESOLVED]

Title: [Brief description]

Status: [Investigating/Identified/Monitoring/Resolved]

Description:
We are currently experiencing [description of issue]. Users may experience [impact description].

Our team is actively investigating and will provide updates every 15 minutes.

Last Update: [Timestamp]
Next Update: [Timestamp + 15 minutes]

Affected Services:
- [Service 1]
- [Service 2]

Thank you for your patience.
```

**Post-Mortem Template:**

```markdown
# Incident Post-Mortem: [Brief Description]

## Incident Details
- **Date:** [YYYY-MM-DD]
- **Duration:** [HH:MM]
- **Severity:** [P0/P1/P2]
- **Incident Commander:** [Name]
- **Responders:** [Names]

## Impact
- **Users Affected:** [Number or percentage]
- **Revenue Impact:** [$ amount if applicable]
- **Service Availability:** [Percentage]

## Timeline
| Time | Event |
|------|-------|
| HH:MM | Alert fired: [Description] |
| HH:MM | Engineer acknowledged |
| HH:MM | Root cause identified |
| HH:MM | Mitigation deployed |
| HH:MM | Incident resolved |

## Root Cause
[Detailed explanation of what caused the incident]

## Resolution
[What was done to resolve the incident]

## Action Items
| Action | Owner | Due Date | Status |
|--------|-------|----------|--------|
| [Action 1] | [Name] | [Date] | Open |
| [Action 2] | [Name] | [Date] | Open |

## Lessons Learned
**What Went Well:**
- [Item 1]
- [Item 2]

**What Could Be Improved:**
- [Item 1]
- [Item 2]

**Preventive Measures:**
- [Measure 1]
- [Measure 2]
```

---

## 9. Continuous Testing in Production

### 9.1 Smoke Tests (Post-Deployment)

**Run immediately after every production deployment:**

```typescript
// smoke-tests.ts
import { test, expect } from '@playwright/test';

test.describe('Production Smoke Tests', () => {
  test('critical paths are working', async ({ page }) => {
    // 1. Homepage loads
    await page.goto('https://app.indigo.com');
    await expect(page).toHaveTitle(/Indigo/);

    // 2. Login works
    await page.goto('https://app.indigo.com/login');
    await page.fill('[name="email"]', process.env.SMOKE_TEST_EMAIL);
    await page.fill('[name="password"]', process.env.SMOKE_TEST_PASSWORD);
    await page.click('button:has-text("Login")');
    await expect(page).toHaveURL('/dashboard');

    // 3. Portfolio loads
    await page.goto('https://app.indigo.com/portfolio');
    await expect(page.locator('[data-testid="portfolio-total-value"]')).toBeVisible();

    // 4. API is responsive
    const response = await page.request.get('https://api.indigo.com/health');
    expect(response.status()).toBe(200);

    // 5. Logout works
    await page.click('[data-testid="logout-button"]');
    await expect(page).toHaveURL('/login');
  });
});
```

**Execution:** Automated in CI/CD pipeline, runs in < 2 minutes

### 9.2 Canary Testing

**Strategy:** Deploy to 10% of users first, monitor for 15 minutes

```yaml
# canary-deployment.yml
apiVersion: v1
kind: Service
metadata:
  name: indigo-app
spec:
  selector:
    app: indigo
  ports:
    - protocol: TCP
      port: 80
      targetPort: 3000

---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: indigo-app-stable
spec:
  replicas: 9
  selector:
    matchLabels:
      app: indigo
      version: stable
  template:
    metadata:
      labels:
        app: indigo
        version: stable
    spec:
      containers:
      - name: indigo
        image: indigo:v1.0.0

---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: indigo-app-canary
spec:
  replicas: 1
  selector:
    matchLabels:
      app: indigo
      version: canary
  template:
    metadata:
      labels:
        app: indigo
        version: canary
    spec:
      containers:
      - name: indigo
        image: indigo:v1.1.0
```

**Canary Success Criteria:**
- Error rate < 0.1%
- Response time < 1.2x baseline
- No critical alerts
- User metrics within expected range

**Auto-Rollback Triggers:**
- Error rate > 1%
- Response time > 2x baseline
- Any P0 alert

---

## 10. Performance Regression Detection

### 10.1 Continuous Performance Monitoring

**Track baseline metrics for every deployment:**

```typescript
// performance-baseline.ts
interface PerformanceBaseline {
  deployment: string;
  timestamp: string;
  metrics: {
    pageLoadTime: { p50: number; p95: number; p99: number };
    apiResponseTime: { [endpoint: string]: { p50: number; p95: number; p99: number } };
    lighthouseScore: number;
    bundleSize: number;
  };
}

// After each deployment, collect metrics
async function recordPerformanceBaseline(deployment: string) {
  const baseline: PerformanceBaseline = {
    deployment,
    timestamp: new Date().toISOString(),
    metrics: {
      pageLoadTime: await measurePageLoadTime(),
      apiResponseTime: await measureAPIResponseTimes(),
      lighthouseScore: await runLighthouse(),
      bundleSize: await getBundleSize(),
    },
  };

  // Store baseline
  await db.performanceBaselines.insert(baseline);

  // Compare with previous deployment
  const previousBaseline = await db.performanceBaselines.findPrevious();
  const regressions = detectRegressions(baseline, previousBaseline);

  if (regressions.length > 0) {
    alertTeam('Performance regression detected', regressions);
  }
}

function detectRegressions(current: PerformanceBaseline, previous: PerformanceBaseline) {
  const regressions = [];

  // Check page load time
  if (current.metrics.pageLoadTime.p95 > previous.metrics.pageLoadTime.p95 * 1.2) {
    regressions.push({
      metric: 'Page Load Time (p95)',
      current: current.metrics.pageLoadTime.p95,
      previous: previous.metrics.pageLoadTime.p95,
      change: ((current.metrics.pageLoadTime.p95 / previous.metrics.pageLoadTime.p95) - 1) * 100,
    });
  }

  // Check Lighthouse score
  if (current.metrics.lighthouseScore < previous.metrics.lighthouseScore - 5) {
    regressions.push({
      metric: 'Lighthouse Score',
      current: current.metrics.lighthouseScore,
      previous: previous.metrics.lighthouseScore,
      change: current.metrics.lighthouseScore - previous.metrics.lighthouseScore,
    });
  }

  // Check bundle size
  if (current.metrics.bundleSize > previous.metrics.bundleSize * 1.1) {
    regressions.push({
      metric: 'Bundle Size',
      current: current.metrics.bundleSize,
      previous: previous.metrics.bundleSize,
      change: ((current.metrics.bundleSize / previous.metrics.bundleSize) - 1) * 100,
    });
  }

  return regressions;
}
```

---

## 11. Monitoring Dashboard

### 11.1 Executive Dashboard

**Displays:**
- System Health (Green/Yellow/Red)
- Current Error Rate
- Current Response Time
- Active Users
- Recent Deployments
- Open Incidents
- Key Business Metrics

**URL:** https://dashboard.indigo.com/executive

### 11.2 Engineering Dashboard

**Displays:**
- Detailed metrics for all services
- Error breakdown by type
- API endpoint performance
- Database query performance
- Recent alerts
- Deployment history
- Test results

**URL:** https://dashboard.indigo.com/engineering

---

**Document Version:** 1.0
**Last Updated:** 2025-01-04
**Owner:** DevOps Team Lead
**Review Frequency:** Monthly
