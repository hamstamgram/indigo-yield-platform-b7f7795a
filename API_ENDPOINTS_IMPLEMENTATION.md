# API Endpoints Implementation Guide

**Phase 1: Production Hardening**
**Priority:** P1 - HIGH
**Time:** 40 hours

This guide provides complete implementation examples for all API endpoints with:
- Zod validation
- Rate limiting
- Authentication/Authorization
- Audit logging
- Error handling
- Decimal.js for financial calculations

---

## Table of Contents

1. [Setup & Middleware](#setup--middleware)
2. [Authentication Endpoints](#authentication-endpoints)
3. [Portfolio Endpoints](#portfolio-endpoints)
4. [Transaction Endpoints](#transaction-endpoints)
5. [Withdrawal Request Endpoints](#withdrawal-request-endpoints)
6. [Admin Endpoints](#admin-endpoints)
7. [Statement Endpoints](#statement-endpoints)

---

## Setup & Middleware

### Rate Limiting Middleware

```typescript
// src/middleware/rateLimiter.ts
import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import { Redis } from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

export const createRateLimiter = (options: {
  windowMs: number;
  max: number;
  message?: string;
}) => {
  return rateLimit({
    store: new RedisStore({
      client: redis,
      prefix: 'rl:',
    }),
    windowMs: options.windowMs,
    max: options.max,
    message: options.message || 'Too many requests',
    standardHeaders: true,
    legacyHeaders: false,
  });
};

// Preset limiters
export const rateLimiters = {
  // Authentication: 5 requests per 15 minutes
  auth: createRateLimiter({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: 'Too many authentication attempts, please try again later',
  }),

  // Standard API: 100 requests per 15 minutes
  api: createRateLimiter({
    windowMs: 15 * 60 * 1000,
    max: 100,
  }),

  // Financial transactions: 10 requests per hour
  transactions: createRateLimiter({
    windowMs: 60 * 60 * 1000,
    max: 10,
    message: 'Transaction limit exceeded, please try again later',
  }),

  // Withdrawals: 3 requests per day
  withdrawals: createRateLimiter({
    windowMs: 24 * 60 * 60 * 1000,
    max: 3,
    message: 'Withdrawal request limit exceeded for today',
  }),
};
```

### Authentication Middleware

```typescript
// src/middleware/auth.ts
import { Request, Response, NextFunction } from 'express';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export interface AuthRequest extends Request {
  user: {
    id: string;
    email: string;
    is_admin: boolean;
  };
}

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Verify JWT token
    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data.user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Get user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, email, is_admin')
      .eq('id', data.user.id)
      .single();

    if (!profile) {
      return res.status(401).json({ error: 'User not found' });
    }

    (req as AuthRequest).user = profile;
    next();
  } catch (error) {
    console.error('Auth error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const authReq = req as AuthRequest;

  if (!authReq.user?.is_admin) {
    return res.status(403).json({ error: 'Forbidden: Admin access required' });
  }

  next();
}
```

### Validation Middleware

```typescript
// src/middleware/validation.ts
import { Request, Response, NextFunction } from 'express';
import { z, ZodError } from 'zod';
import { validateAndSanitize } from '@/lib/validation/schemas';

export function validateRequest(schema: z.ZodSchema) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { success, data, errors } = await validateAndSanitize(
        schema,
        req.body
      );

      if (!success) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors?.errors.map(e => ({
            path: e.path.join('.'),
            message: e.message,
          })),
        });
      }

      req.body = data;
      next();
    } catch (error) {
      console.error('Validation error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };
}
```

### Audit Logging Middleware

```typescript
// src/middleware/audit.ts
import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from './auth';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export function auditLog(action: string, resourceType: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const authReq = req as AuthRequest;

    // Store original res.json
    const originalJson = res.json.bind(res);

    // Override res.json
    res.json = function (body: any) {
      // Log to audit_log table
      supabase
        .from('audit_log')
        .insert({
          user_id: authReq.user?.id,
          actor_email: authReq.user?.email,
          action,
          resource_type: resourceType,
          resource_id: body?.id || body?.data?.id,
          ip_address: req.ip,
          user_agent: req.headers['user-agent'],
          metadata: {
            request_body: req.body,
            response_status: res.statusCode,
          },
          severity: res.statusCode >= 400 ? 'ERROR' : 'INFO',
        })
        .then(({ error }) => {
          if (error) console.error('Audit log error:', error);
        });

      // Call original json
      return originalJson(body);
    };

    next();
  };
}
```

---

## Authentication Endpoints

### POST /api/auth/login

```typescript
// src/routes/auth.ts
import { Router } from 'express';
import { loginSchema } from '@/lib/validation/schemas';
import { validateRequest } from '@/middleware/validation';
import { rateLimiters } from '@/middleware/rateLimiter';
import { auditLog } from '@/middleware/audit';
import { createClient } from '@supabase/supabase-js';

const router = Router();
const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

router.post(
  '/login',
  rateLimiters.auth,
  validateRequest(loginSchema),
  auditLog('USER_LOGIN', 'auth'),
  async (req, res) => {
    try {
      const { email, password, totpCode } = req.body;

      // Authenticate with Supabase
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return res.status(401).json({
          error: 'Invalid credentials',
        });
      }

      // Verify TOTP if provided
      if (totpCode) {
        const { data: factors } = await supabase.auth.mfa.listFactors();

        if (factors && factors.length > 0) {
          const { data: verifyData, error: verifyError } =
            await supabase.auth.mfa.challengeAndVerify({
              factorId: factors[0].id,
              code: totpCode,
            });

          if (verifyError) {
            return res.status(401).json({
              error: 'Invalid 2FA code',
            });
          }
        }
      }

      // Get user profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .single();

      res.json({
        user: {
          id: data.user.id,
          email: data.user.email,
          ...profile,
        },
        session: data.session,
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

export default router;
```

---

## Portfolio Endpoints

### GET /api/portfolio

```typescript
// src/routes/portfolio.ts
import { Router } from 'express';
import { requireAuth, AuthRequest } from '@/middleware/auth';
import { rateLimiters } from '@/middleware/rateLimiter';
import { calculatePortfolioValue, toDecimal, toDbFormat } from '@/utils/financial';
import { createClient } from '@supabase/supabase-js';

const router = Router();
const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

router.get(
  '/',
  requireAuth,
  rateLimiters.api,
  async (req, res) => {
    try {
      const authReq = req as AuthRequest;

      // Get positions with latest prices
      const { data: positions, error } = await supabase
        .from('positions')
        .select(`
          *,
          asset_prices!inner(price_usd, updated_at)
        `)
        .eq('user_id', authReq.user.id);

      if (error) {
        throw error;
      }

      // Calculate total portfolio value using Decimal.js
      const portfolioValue = calculatePortfolioValue(
        positions.map(p => ({
          amount: p.amount,
          priceUsd: p.asset_prices.price_usd,
        }))
      );

      // Calculate position values
      const positionsWithValue = positions.map(p => {
        const amount = toDecimal(p.amount);
        const price = toDecimal(p.asset_prices.price_usd);
        const value = amount.times(price);

        return {
          id: p.id,
          asset_symbol: p.asset_symbol,
          amount: toDbFormat(amount),
          price_usd: toDbFormat(price),
          value_usd: toDbFormat(value),
          percentage: portfolioValue.isZero()
            ? '0'
            : value.dividedBy(portfolioValue).times(100).toFixed(2),
          price_updated_at: p.asset_prices.updated_at,
        };
      });

      res.json({
        total_value_usd: toDbFormat(portfolioValue),
        positions: positionsWithValue,
        last_updated: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Portfolio error:', error);
      res.status(500).json({ error: 'Failed to fetch portfolio' });
    }
  }
);

export default router;
```

---

## Transaction Endpoints

### GET /api/transactions

```typescript
// src/routes/transactions.ts
import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, AuthRequest } from '@/middleware/auth';
import { validateRequest } from '@/middleware/validation';
import { rateLimiters } from '@/middleware/rateLimiter';
import { toDbFormat } from '@/utils/financial';
import { createClient } from '@supabase/supabase-js';

const router = Router();
const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const transactionQuerySchema = z.object({
  limit: z.coerce.number().min(1).max(100).default(50),
  offset: z.coerce.number().min(0).default(0),
  type: z.enum(['DEPOSIT', 'WITHDRAWAL', 'YIELD', 'FEE']).optional(),
  asset_symbol: z.string().optional(),
  start_date: z.string().datetime().optional(),
  end_date: z.string().datetime().optional(),
});

router.get(
  '/',
  requireAuth,
  rateLimiters.api,
  async (req, res) => {
    try {
      const authReq = req as AuthRequest;

      // Validate query params
      const query = transactionQuerySchema.parse(req.query);

      // Build query
      let supabaseQuery = supabase
        .from('transactions')
        .select('*', { count: 'exact' })
        .eq('user_id', authReq.user.id)
        .order('created_at', { ascending: false })
        .range(query.offset, query.offset + query.limit - 1);

      // Apply filters
      if (query.type) {
        supabaseQuery = supabaseQuery.eq('type', query.type);
      }
      if (query.asset_symbol) {
        supabaseQuery = supabaseQuery.eq('asset_symbol', query.asset_symbol);
      }
      if (query.start_date) {
        supabaseQuery = supabaseQuery.gte('created_at', query.start_date);
      }
      if (query.end_date) {
        supabaseQuery = supabaseQuery.lte('created_at', query.end_date);
      }

      const { data: transactions, error, count } = await supabaseQuery;

      if (error) {
        throw error;
      }

      // Format amounts with Decimal.js
      const formattedTransactions = transactions.map(t => ({
        ...t,
        amount: toDbFormat(t.amount),
      }));

      res.json({
        data: formattedTransactions,
        pagination: {
          total: count || 0,
          limit: query.limit,
          offset: query.offset,
          has_more: (count || 0) > query.offset + query.limit,
        },
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: 'Invalid query parameters',
          details: error.errors,
        });
      }
      console.error('Transactions error:', error);
      res.status(500).json({ error: 'Failed to fetch transactions' });
    }
  }
);

export default router;
```

---

## Withdrawal Request Endpoints

### POST /api/withdrawals/request

```typescript
// src/routes/withdrawals.ts
import { Router } from 'express';
import { withdrawalRequestSchema } from '@/lib/validation/schemas';
import { requireAuth, AuthRequest } from '@/middleware/auth';
import { validateRequest } from '@/middleware/validation';
import { rateLimiters } from '@/middleware/rateLimiter';
import { auditLog } from '@/middleware/audit';
import { toDecimal, validatePositiveAmount, toDbFormat } from '@/utils/financial';
import { createClient } from '@supabase/supabase-js';

const router = Router();
const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

router.post(
  '/request',
  requireAuth,
  rateLimiters.withdrawals,
  validateRequest(withdrawalRequestSchema),
  auditLog('WITHDRAWAL_REQUEST_CREATED', 'withdrawal_requests'),
  async (req, res) => {
    try {
      const authReq = req as AuthRequest;
      const { amount, assetCode, destinationAddress, reason, notes } = req.body;

      // Validate amount is positive
      const requestedAmount = validatePositiveAmount(amount, 'Withdrawal amount');

      // Check available balance
      const { data: position } = await supabase
        .from('positions')
        .select('amount')
        .eq('user_id', authReq.user.id)
        .eq('asset_symbol', assetCode)
        .single();

      if (!position) {
        return res.status(400).json({
          error: 'Asset not found in portfolio',
        });
      }

      const availableBalance = toDecimal(position.amount);

      if (requestedAmount.greaterThan(availableBalance)) {
        return res.status(400).json({
          error: 'Insufficient balance',
          details: {
            requested: toDbFormat(requestedAmount),
            available: toDbFormat(availableBalance),
          },
        });
      }

      // Create withdrawal request
      const { data: request, error } = await supabase
        .from('withdrawal_requests')
        .insert({
          user_id: authReq.user.id,
          asset_symbol: assetCode,
          amount: toDbFormat(requestedAmount),
          destination: destinationAddress,
          destination_type: 'WALLET',
          status: 'PENDING',
          notes,
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      // Send notification email
      await supabase.from('email_queue').insert({
        user_id: authReq.user.id,
        to_email: authReq.user.email,
        template: 'withdrawal_request_received',
        subject: 'Withdrawal Request Received',
        variables: {
          amount: toDbFormat(requestedAmount),
          asset: assetCode,
          destination: destinationAddress,
          request_id: request.id,
        },
        priority: 5,
      });

      res.status(201).json({
        id: request.id,
        status: request.status,
        amount: request.amount,
        asset_symbol: request.asset_symbol,
        requested_at: request.requested_at,
      });
    } catch (error) {
      console.error('Withdrawal request error:', error);
      res.status(500).json({ error: 'Failed to create withdrawal request' });
    }
  }
);

export default router;
```

---

## Admin Endpoints

### POST /api/admin/withdrawals/:id/approve

```typescript
// src/routes/admin/withdrawals.ts
import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, requireAdmin, AuthRequest } from '@/middleware/auth';
import { validateRequest } from '@/middleware/validation';
import { rateLimiters } from '@/middleware/rateLimiter';
import { auditLog } from '@/middleware/audit';
import { toDecimal, toDbFormat } from '@/utils/financial';
import { createClient } from '@supabase/supabase-js';

const router = Router();
const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const approveSchema = z.object({
  tx_hash: z.string().min(1, 'Transaction hash is required'),
  admin_notes: z.string().optional(),
});

router.post(
  '/:id/approve',
  requireAuth,
  requireAdmin,
  rateLimiters.transactions,
  validateRequest(approveSchema),
  auditLog('WITHDRAWAL_APPROVED', 'withdrawal_requests'),
  async (req, res) => {
    try {
      const authReq = req as AuthRequest;
      const { id } = req.params;
      const { tx_hash, admin_notes } = req.body;

      // Get withdrawal request
      const { data: request, error: fetchError } = await supabase
        .from('withdrawal_requests')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError || !request) {
        return res.status(404).json({ error: 'Withdrawal request not found' });
      }

      if (request.status !== 'PENDING') {
        return res.status(400).json({
          error: `Cannot approve request with status: ${request.status}`,
        });
      }

      // Check balance one more time
      const { data: position } = await supabase
        .from('positions')
        .select('amount')
        .eq('user_id', request.user_id)
        .eq('asset_symbol', request.asset_symbol)
        .single();

      if (!position) {
        return res.status(400).json({
          error: 'Asset not found in investor portfolio',
        });
      }

      const requestedAmount = toDecimal(request.amount);
      const availableBalance = toDecimal(position.amount);

      if (requestedAmount.greaterThan(availableBalance)) {
        return res.status(400).json({
          error: 'Insufficient balance to complete withdrawal',
        });
      }

      // Start transaction
      const { error: approveError } = await supabase.rpc('approve_withdrawal', {
        p_request_id: id,
        p_admin_id: authReq.user.id,
        p_tx_hash: tx_hash,
        p_admin_notes: admin_notes,
      });

      if (approveError) {
        throw approveError;
      }

      // Send notification email
      const { data: profile } = await supabase
        .from('profiles')
        .select('email')
        .eq('id', request.user_id)
        .single();

      if (profile) {
        await supabase.from('email_queue').insert({
          user_id: request.user_id,
          to_email: profile.email,
          template: 'withdrawal_approved',
          subject: 'Withdrawal Approved',
          variables: {
            amount: request.amount,
            asset: request.asset_symbol,
            tx_hash,
          },
          priority: 3,
        });
      }

      res.json({
        message: 'Withdrawal approved successfully',
        tx_hash,
      });
    } catch (error) {
      console.error('Withdrawal approval error:', error);
      res.status(500).json({ error: 'Failed to approve withdrawal' });
    }
  }
);

export default router;
```

---

## Testing

### Example Test for Withdrawal Endpoint

```typescript
// src/routes/__tests__/withdrawals.test.ts
import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '@/app';
import { toDbFormat } from '@/utils/financial';

describe('POST /api/withdrawals/request', () => {
  let authToken: string;

  beforeAll(async () => {
    // Login to get auth token
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'test@example.com',
        password: 'Test123!@#',
      });

    authToken = response.body.session.access_token;
  });

  it('creates withdrawal request with valid data', async () => {
    const response = await request(app)
      .post('/api/withdrawals/request')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        amount: 0.5,
        assetCode: 'BTC',
        destinationAddress: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
        reason: 'personal',
        totpCode: '123456',
      });

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('id');
    expect(response.body.status).toBe('PENDING');
    expect(response.body.amount).toBe(toDbFormat(0.5));
  });

  it('rejects withdrawal with insufficient balance', async () => {
    const response = await request(app)
      .post('/api/withdrawals/request')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        amount: 999999,
        assetCode: 'BTC',
        destinationAddress: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
        reason: 'personal',
        totpCode: '123456',
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Insufficient balance');
  });

  it('rejects withdrawal without authentication', async () => {
    const response = await request(app)
      .post('/api/withdrawals/request')
      .send({
        amount: 0.5,
        assetCode: 'BTC',
        destinationAddress: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
        reason: 'personal',
        totpCode: '123456',
      });

    expect(response.status).toBe(401);
  });
});
```

---

## Deployment Checklist

Before deploying these endpoints:

- [ ] All validation schemas defined
- [ ] Rate limiting configured
- [ ] Authentication middleware tested
- [ ] Audit logging working
- [ ] All endpoints have tests
- [ ] Error handling comprehensive
- [ ] Financial calculations using Decimal.js
- [ ] RLS policies enabled on all tables
- [ ] Environment variables set
- [ ] Redis configured (for rate limiting)
- [ ] Email queue functioning

---

## Next Steps

After implementing these endpoints:

1. **Phase 2:** Implement withdrawal UI components (completed above)
2. **Phase 2:** Implement statement generation
3. **Phase 3:** Add React Query for caching
4. **Phase 3:** Optimize bundle size
5. **Phase 4:** Beta testing with real users

---

**Created:** November 3, 2025
**Status:** Ready for implementation
**Priority:** P1 - HIGH
