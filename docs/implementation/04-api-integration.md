# API Design & Integration Patterns
## Indigo Yield Platform - Comprehensive API Strategy

---

## 1. API Architecture Overview

### 1.1 API Layers

```
┌────────────────────────────────────────────────────────────┐
│                    Frontend Application                     │
├────────────────────────────────────────────────────────────┤
│  React Query Hooks (useInvestments, useTransactions)       │
├────────────────────────────────────────────────────────────┤
│  Service Layer (investments.service, payments.service)     │
├────────────────────────────────────────────────────────────┤
│  HTTP Client (Axios/Fetch wrapper with interceptors)       │
├────────────────────────────────────────────────────────────┤
│                    API Gateway / BFF                        │
├────────────────────────────────────────────────────────────┤
│  Supabase            Edge Functions         Third-party     │
│  (PostgreSQL,        (Custom Logic)         (Stripe,        │
│   Auth, Storage)                            Plaid, etc)     │
└────────────────────────────────────────────────────────────┘
```

---

## 2. HTTP Client Configuration

### 2.1 Base HTTP Client

```typescript
// lib/api/client.ts
import axios, { type AxiosInstance, type AxiosRequestConfig } from 'axios'
import { useAuthStore } from '@/stores/auth.store'
import { env } from '@/config/env'

// Create axios instance
export const apiClient: AxiosInstance = axios.create({
  baseURL: env.VITE_API_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor
apiClient.interceptors.request.use(
  (config) => {
    // Add auth token
    const session = useAuthStore.getState().session
    if (session?.access_token) {
      config.headers.Authorization = `Bearer ${session.access_token}`
    }

    // Add request ID for tracking
    config.headers['X-Request-ID'] = crypto.randomUUID()

    // Add timestamp
    config.headers['X-Request-Time'] = new Date().toISOString()

    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor
apiClient.interceptors.response.use(
  (response) => {
    // Log successful requests in dev
    if (env.VITE_ENV === 'development') {
      console.log(`[API] ${response.config.method?.toUpperCase()} ${response.config.url}`, {
        status: response.status,
        data: response.data,
      })
    }

    return response
  },
  async (error) => {
    const originalRequest = error.config

    // Handle token refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true

      try {
        const { session } = await refreshToken()
        originalRequest.headers.Authorization = `Bearer ${session.access_token}`
        return apiClient(originalRequest)
      } catch (refreshError) {
        // Redirect to login
        useAuthStore.getState().signOut()
        window.location.href = '/login'
        return Promise.reject(refreshError)
      }
    }

    // Handle rate limiting
    if (error.response?.status === 429) {
      const retryAfter = error.response.headers['retry-after']
      throw new Error(`Rate limited. Retry after ${retryAfter} seconds`)
    }

    // Log errors
    console.error('[API Error]', {
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      message: error.response?.data?.message || error.message,
    })

    return Promise.reject(error)
  }
)

// Helper function for token refresh
async function refreshToken() {
  const { supabase } = await import('@/lib/supabase')
  const { data, error } = await supabase.auth.refreshSession()

  if (error) throw error
  if (!data.session) throw new Error('No session')

  useAuthStore.getState().setSession(data.session)
  return data
}
```

### 2.2 Type-Safe API Client

```typescript
// lib/api/typed-client.ts
import type { AxiosRequestConfig, AxiosResponse } from 'axios'
import { apiClient } from './client'

export interface APIResponse<T> {
  data: T
  message?: string
  meta?: {
    page?: number
    pageSize?: number
    total?: number
  }
}

export interface APIError {
  error: string
  message: string
  statusCode: number
  details?: Record<string, any>
}

class TypedAPIClient {
  async get<T>(url: string, config?: AxiosRequestConfig): Promise<APIResponse<T>> {
    const response = await apiClient.get<APIResponse<T>>(url, config)
    return response.data
  }

  async post<T, D = any>(
    url: string,
    data?: D,
    config?: AxiosRequestConfig
  ): Promise<APIResponse<T>> {
    const response = await apiClient.post<APIResponse<T>>(url, data, config)
    return response.data
  }

  async put<T, D = any>(
    url: string,
    data?: D,
    config?: AxiosRequestConfig
  ): Promise<APIResponse<T>> {
    const response = await apiClient.put<APIResponse<T>>(url, data, config)
    return response.data
  }

  async patch<T, D = any>(
    url: string,
    data?: D,
    config?: AxiosRequestConfig
  ): Promise<APIResponse<T>> {
    const response = await apiClient.patch<APIResponse<T>>(url, data, config)
    return response.data
  }

  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<APIResponse<T>> {
    const response = await apiClient.delete<APIResponse<T>>(url, config)
    return response.data
  }
}

export const api = new TypedAPIClient()
```

---

## 3. Supabase Integration

### 3.1 Supabase Client Setup

```typescript
// lib/supabase/client.ts
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'
import { env } from '@/config/env'

export const supabase = createClient<Database>(
  env.VITE_SUPABASE_URL,
  env.VITE_SUPABASE_ANON_KEY,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      storage: window.localStorage,
    },
    db: {
      schema: 'public',
    },
    global: {
      headers: {
        'X-Client-Info': 'indigo-yield-web',
      },
    },
  }
)

// Type-safe table access
export const db = {
  users: () => supabase.from('users'),
  investments: () => supabase.from('investments'),
  transactions: () => supabase.from('transactions'),
  documents: () => supabase.from('documents'),
  funds: () => supabase.from('funds'),
  // ... more tables
}
```

### 3.2 Supabase Service Layer

```typescript
// services/supabase/investments.service.ts
import { db } from '@/lib/supabase/client'
import type { Investment, InvestmentOpportunity } from '@/types'

export const investmentsService = {
  // Get all opportunities
  async getOpportunities(filters?: {
    type?: string
    minAmount?: number
    status?: string
  }) {
    let query = db
      .investments()
      .select(`
        *,
        fund:funds(*),
        documents:investment_documents(*)
      `)
      .eq('status', 'active')

    if (filters?.type) {
      query = query.eq('type', filters.type)
    }

    if (filters?.minAmount) {
      query = query.gte('min_investment', filters.minAmount)
    }

    const { data, error } = await query

    if (error) throw error
    return data as InvestmentOpportunity[]
  },

  // Get single opportunity
  async getOpportunity(id: string) {
    const { data, error } = await db
      .investments()
      .select(`
        *,
        fund:funds(*),
        documents:investment_documents(*),
        terms:investment_terms(*),
        distributions:distributions(*)
      `)
      .eq('id', id)
      .single()

    if (error) throw error
    return data
  },

  // Create investment
  async createInvestment(investment: {
    opportunity_id: string
    user_id: string
    amount: number
    payment_method: string
  }) {
    const { data, error } = await db
      .investments()
      .insert({
        opportunity_id: investment.opportunity_id,
        user_id: investment.user_id,
        amount: investment.amount,
        payment_method: investment.payment_method,
        status: 'pending',
        created_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) throw error
    return data as Investment
  },

  // Update investment status
  async updateInvestmentStatus(id: string, status: string) {
    const { data, error } = await db
      .investments()
      .update({ status })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  },

  // Get user investments
  async getUserInvestments(userId: string) {
    const { data, error } = await db
      .investments()
      .select(`
        *,
        opportunity:investment_opportunities(*),
        transactions:transactions(*)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data
  },
}
```

### 3.3 Edge Functions Integration

```typescript
// services/edge-functions/index.ts
import { supabase } from '@/lib/supabase/client'

export async function invokeEdgeFunction<T = any>(
  functionName: string,
  payload?: Record<string, any>
): Promise<T> {
  const { data, error } = await supabase.functions.invoke(functionName, {
    body: payload,
  })

  if (error) {
    console.error(`Edge function error (${functionName}):`, error)
    throw error
  }

  return data as T
}

// Specific edge function wrappers
export const edgeFunctions = {
  // KYC verification
  async verifyKYC(userId: string, documents: File[]) {
    const formData = new FormData()
    formData.append('userId', userId)
    documents.forEach((doc, i) => formData.append(`document${i}`, doc))

    return invokeEdgeFunction<{ verified: boolean; score: number }>(
      'verify-kyc',
      formData
    )
  },

  // Investment processing
  async processInvestment(investmentId: string) {
    return invokeEdgeFunction('process-investment', { investmentId })
  },

  // Tax document generation
  async generateTaxDocument(userId: string, year: number) {
    return invokeEdgeFunction<{ documentUrl: string }>(
      'generate-tax-document',
      { userId, year }
    )
  },

  // Portfolio valuation
  async calculatePortfolioValue(userId: string) {
    return invokeEdgeFunction<{ totalValue: number; breakdown: any[] }>(
      'calculate-portfolio-value',
      { userId }
    )
  },
}
```

---

## 4. Third-Party Integrations

### 4.1 Stripe Payment Integration

```typescript
// services/payments/stripe.service.ts
import { loadStripe, type Stripe } from '@stripe/stripe-js'
import { api } from '@/lib/api/typed-client'
import { env } from '@/config/env'

let stripePromise: Promise<Stripe | null>

export const getStripe = () => {
  if (!stripePromise) {
    stripePromise = loadStripe(env.VITE_STRIPE_PUBLIC_KEY)
  }
  return stripePromise
}

export const stripeService = {
  // Create payment intent
  async createPaymentIntent(amount: number, currency = 'usd') {
    const response = await api.post<{ clientSecret: string }>(
      '/payments/stripe/create-intent',
      { amount, currency }
    )
    return response.data
  },

  // Confirm payment
  async confirmPayment(clientSecret: string, paymentMethodId: string) {
    const stripe = await getStripe()
    if (!stripe) throw new Error('Stripe not loaded')

    const result = await stripe.confirmCardPayment(clientSecret, {
      payment_method: paymentMethodId,
    })

    if (result.error) {
      throw new Error(result.error.message)
    }

    return result.paymentIntent
  },

  // Create setup intent (for saving cards)
  async createSetupIntent() {
    const response = await api.post<{ clientSecret: string }>(
      '/payments/stripe/create-setup-intent'
    )
    return response.data
  },

  // Get payment methods
  async getPaymentMethods() {
    const response = await api.get<any[]>('/payments/stripe/payment-methods')
    return response.data
  },

  // Create ACH payment
  async createACHPayment(amount: number, bankAccountId: string) {
    const response = await api.post<{ id: string; status: string }>(
      '/payments/stripe/create-ach-payment',
      { amount, bankAccountId }
    )
    return response.data
  },
}
```

### 4.2 Plaid Bank Linking

```typescript
// services/banking/plaid.service.ts
import { usePlaidLink, type PlaidLinkOptions } from 'react-plaid-link'
import { api } from '@/lib/api/typed-client'
import { env } from '@/config/env'

export const plaidService = {
  // Create link token
  async createLinkToken(userId: string) {
    const response = await api.post<{ linkToken: string }>(
      '/banking/plaid/create-link-token',
      { userId }
    )
    return response.data.linkToken
  },

  // Exchange public token for access token
  async exchangePublicToken(publicToken: string) {
    const response = await api.post<{ accessToken: string; itemId: string }>(
      '/banking/plaid/exchange-token',
      { publicToken }
    )
    return response.data
  },

  // Get accounts
  async getAccounts(userId: string) {
    const response = await api.get<any[]>(`/banking/plaid/accounts/${userId}`)
    return response.data
  },

  // Get account balance
  async getBalance(accountId: string) {
    const response = await api.get<{
      available: number
      current: number
      limit: number | null
    }>(`/banking/plaid/balance/${accountId}`)
    return response.data
  },

  // Get transactions
  async getTransactions(accountId: string, startDate: string, endDate: string) {
    const response = await api.get<any[]>(
      `/banking/plaid/transactions/${accountId}`,
      { params: { startDate, endDate } }
    )
    return response.data
  },
}

// Hook for Plaid Link
export function usePlaidLinkSetup(userId: string, onSuccess: (publicToken: string) => void) {
  const [linkToken, setLinkToken] = useState<string | null>(null)

  useEffect(() => {
    plaidService.createLinkToken(userId).then(setLinkToken)
  }, [userId])

  const config: PlaidLinkOptions = {
    token: linkToken,
    onSuccess: (publicToken, metadata) => {
      onSuccess(publicToken)
    },
    onExit: (error, metadata) => {
      if (error) {
        console.error('Plaid Link error:', error)
      }
    },
  }

  const { open, ready } = usePlaidLink(config)

  return { open, ready }
}
```

### 4.3 DocuSign Integration

```typescript
// services/documents/docusign.service.ts
import { api } from '@/lib/api/typed-client'

export const docusignService = {
  // Create envelope
  async createEnvelope(documentData: {
    documentId: string
    recipientEmail: string
    recipientName: string
    templateId?: string
  }) {
    const response = await api.post<{
      envelopeId: string
      signingUrl: string
    }>('/documents/docusign/create-envelope', documentData)

    return response.data
  },

  // Get envelope status
  async getEnvelopeStatus(envelopeId: string) {
    const response = await api.get<{
      status: 'sent' | 'delivered' | 'signed' | 'completed'
      documents: any[]
    }>(`/documents/docusign/envelope/${envelopeId}`)

    return response.data
  },

  // Download signed document
  async downloadSignedDocument(envelopeId: string, documentId: string) {
    const response = await api.get<{ downloadUrl: string }>(
      `/documents/docusign/download/${envelopeId}/${documentId}`
    )

    return response.data.downloadUrl
  },

  // Create embedded signing view
  async createSigningView(envelopeId: string, returnUrl: string) {
    const response = await api.post<{ url: string }>(
      '/documents/docusign/create-signing-view',
      { envelopeId, returnUrl }
    )

    return response.data.url
  },
}
```

### 4.4 Twilio Communication

```typescript
// services/communication/twilio.service.ts
import { api } from '@/lib/api/typed-client'

export const twilioService = {
  // Send SMS
  async sendSMS(phoneNumber: string, message: string) {
    const response = await api.post<{ messageId: string; status: string }>(
      '/communication/sms/send',
      { phoneNumber, message }
    )
    return response.data
  },

  // Send verification code
  async sendVerificationCode(phoneNumber: string) {
    const response = await api.post<{ verificationId: string }>(
      '/communication/sms/send-verification',
      { phoneNumber }
    )
    return response.data
  },

  // Verify code
  async verifyCode(verificationId: string, code: string) {
    const response = await api.post<{ verified: boolean }>(
      '/communication/sms/verify-code',
      { verificationId, code }
    )
    return response.data.verified
  },

  // Send voice call
  async initiateCall(phoneNumber: string, message: string) {
    const response = await api.post<{ callId: string }>(
      '/communication/voice/initiate',
      { phoneNumber, message }
    )
    return response.data
  },
}
```

### 4.5 SendGrid Email

```typescript
// services/communication/email.service.ts
import { api } from '@/lib/api/typed-client'

export interface EmailTemplate {
  templateId: string
  dynamicData: Record<string, any>
}

export const emailService = {
  // Send email with template
  async sendTemplateEmail(
    to: string,
    template: EmailTemplate,
    from?: string
  ) {
    const response = await api.post<{ messageId: string }>(
      '/communication/email/send-template',
      { to, template, from }
    )
    return response.data
  },

  // Send custom email
  async sendEmail(data: {
    to: string | string[]
    subject: string
    html: string
    text?: string
    from?: string
    attachments?: Array<{
      filename: string
      content: string
      type: string
    }>
  }) {
    const response = await api.post<{ messageId: string }>(
      '/communication/email/send',
      data
    )
    return response.data
  },

  // Common email templates
  templates: {
    welcomeEmail: (userName: string) => ({
      templateId: 'd-welcome123',
      dynamicData: { userName },
    }),

    investmentConfirmation: (investmentDetails: any) => ({
      templateId: 'd-investment456',
      dynamicData: { ...investmentDetails },
    }),

    kycStatusUpdate: (status: string, nextSteps: string) => ({
      templateId: 'd-kyc789',
      dynamicData: { status, nextSteps },
    }),

    monthlyStatement: (statement: any) => ({
      templateId: 'd-statement012',
      dynamicData: { ...statement },
    }),
  },
}
```

### 4.6 PostHog Analytics

```typescript
// services/analytics/posthog.service.ts
import posthog from 'posthog-js'
import { env } from '@/config/env'

export const initPostHog = () => {
  if (typeof window !== 'undefined') {
    posthog.init(env.VITE_POSTHOG_KEY, {
      api_host: env.VITE_POSTHOG_HOST,
      loaded: (posthog) => {
        if (env.VITE_ENV === 'development') {
          posthog.opt_out_capturing()
        }
      },
    })
  }
}

export const analyticsService = {
  // Track page view
  trackPageView: (pageName: string, properties?: Record<string, any>) => {
    posthog.capture('$pageview', {
      $current_url: window.location.href,
      page: pageName,
      ...properties,
    })
  },

  // Track event
  trackEvent: (eventName: string, properties?: Record<string, any>) => {
    posthog.capture(eventName, properties)
  },

  // Identify user
  identifyUser: (userId: string, properties?: Record<string, any>) => {
    posthog.identify(userId, properties)
  },

  // Track conversion
  trackConversion: (conversionType: string, value?: number) => {
    posthog.capture('conversion', {
      type: conversionType,
      value,
    })
  },

  // Common events
  events: {
    investmentStarted: (opportunityId: string) =>
      analyticsService.trackEvent('investment_started', { opportunityId }),

    investmentCompleted: (investmentId: string, amount: number) =>
      analyticsService.trackEvent('investment_completed', {
        investmentId,
        amount,
      }),

    documentSigned: (documentId: string, type: string) =>
      analyticsService.trackEvent('document_signed', { documentId, type }),

    kycStarted: () => analyticsService.trackEvent('kyc_started'),

    kycCompleted: (status: string) =>
      analyticsService.trackEvent('kyc_completed', { status }),
  },
}
```

### 4.7 Sentry Error Tracking

```typescript
// services/monitoring/sentry.service.ts
import * as Sentry from '@sentry/react'
import { BrowserTracing } from '@sentry/tracing'
import { env } from '@/config/env'

export const initSentry = () => {
  Sentry.init({
    dsn: env.VITE_SENTRY_DSN,
    environment: env.VITE_ENV,
    integrations: [
      new BrowserTracing({
        tracingOrigins: [env.VITE_API_URL],
      }),
    ],
    tracesSampleRate: env.VITE_ENV === 'production' ? 0.2 : 1.0,
    beforeSend(event) {
      // Filter out sensitive data
      if (event.request?.data) {
        delete event.request.data.password
        delete event.request.data.ssn
        delete event.request.data.bankAccount
      }
      return event
    },
  })
}

export const sentryService = {
  // Capture exception
  captureException: (error: Error, context?: Record<string, any>) => {
    Sentry.captureException(error, {
      contexts: context,
    })
  },

  // Capture message
  captureMessage: (message: string, level: Sentry.SeverityLevel = 'info') => {
    Sentry.captureMessage(message, level)
  },

  // Set user context
  setUser: (user: { id: string; email?: string; username?: string }) => {
    Sentry.setUser(user)
  },

  // Add breadcrumb
  addBreadcrumb: (breadcrumb: {
    message: string
    level?: Sentry.SeverityLevel
    data?: Record<string, any>
  }) => {
    Sentry.addBreadcrumb(breadcrumb)
  },

  // Create transaction
  startTransaction: (name: string, op: string) => {
    return Sentry.startTransaction({ name, op })
  },
}
```

---

## 5. API Request Patterns

### 5.1 Polling Pattern

```typescript
// hooks/usePolling.ts
import { useQuery } from '@tanstack/react-query'

export function usePolling<T>(
  queryKey: string[],
  fetcher: () => Promise<T>,
  interval: number = 5000,
  enabled: boolean = true
) {
  return useQuery({
    queryKey,
    queryFn: fetcher,
    refetchInterval: interval,
    refetchIntervalInBackground: false,
    enabled,
  })
}

// Usage: Poll transaction status
function TransactionStatus({ transactionId }: { transactionId: string }) {
  const { data: status } = usePolling(
    ['transaction-status', transactionId],
    () => transactionsService.getStatus(transactionId),
    3000, // Poll every 3 seconds
    true
  )

  return <div>Status: {status}</div>
}
```

### 5.2 Retry with Exponential Backoff

```typescript
// lib/api/retry.ts
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error as Error

      if (i < maxRetries - 1) {
        const delay = baseDelay * Math.pow(2, i)
        await new Promise((resolve) => setTimeout(resolve, delay))
      }
    }
  }

  throw lastError!
}

// Usage
const data = await retryWithBackoff(
  () => investmentsService.getOpportunity(id),
  3, // Max 3 retries
  1000 // Start with 1 second delay
)
```

### 5.3 Request Deduplication

```typescript
// lib/api/dedupe.ts
const pendingRequests = new Map<string, Promise<any>>()

export async function dedupeRequest<T>(
  key: string,
  fn: () => Promise<T>
): Promise<T> {
  // Check if request is already pending
  if (pendingRequests.has(key)) {
    return pendingRequests.get(key)!
  }

  // Create new request
  const promise = fn().finally(() => {
    pendingRequests.delete(key)
  })

  pendingRequests.set(key, promise)
  return promise
}

// Usage in service
export const investmentsService = {
  async getOpportunity(id: string) {
    return dedupeRequest(`opportunity-${id}`, async () => {
      const { data, error } = await db
        .investments()
        .select('*')
        .eq('id', id)
        .single()

      if (error) throw error
      return data
    })
  },
}
```

### 5.4 Request Cancellation

```typescript
// hooks/useCancellableQuery.ts
import { useQuery } from '@tanstack/react-query'
import { useEffect, useRef } from 'react'

export function useCancellableQuery<T>(
  queryKey: string[],
  fetcher: (signal: AbortSignal) => Promise<T>
) {
  const abortControllerRef = useRef<AbortController>()

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort()
    }
  }, [])

  return useQuery({
    queryKey,
    queryFn: () => {
      abortControllerRef.current = new AbortController()
      return fetcher(abortControllerRef.current.signal)
    },
  })
}

// Usage
function SearchResults() {
  const [query, setQuery] = useState('')

  const { data } = useCancellableQuery(
    ['search', query],
    async (signal) => {
      const response = await fetch(`/api/search?q=${query}`, { signal })
      return response.json()
    }
  )

  return <div>{/* Results */}</div>
}
```

---

## 6. API Error Handling

### 6.1 Error Types

```typescript
// lib/api/errors.ts
export class APIError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public details?: any
  ) {
    super(message)
    this.name = 'APIError'
  }
}

export class ValidationError extends APIError {
  constructor(message: string, public errors: Record<string, string[]>) {
    super(400, message, errors)
    this.name = 'ValidationError'
  }
}

export class AuthenticationError extends APIError {
  constructor(message: string = 'Authentication required') {
    super(401, message)
    this.name = 'AuthenticationError'
  }
}

export class AuthorizationError extends APIError {
  constructor(message: string = 'Insufficient permissions') {
    super(403, message)
    this.name = 'AuthorizationError'
  }
}

export class NotFoundError extends APIError {
  constructor(resource: string) {
    super(404, `${resource} not found`)
    this.name = 'NotFoundError'
  }
}

export class RateLimitError extends APIError {
  constructor(public retryAfter: number) {
    super(429, 'Rate limit exceeded')
    this.name = 'RateLimitError'
  }
}
```

### 6.2 Error Boundary

```typescript
// components/ErrorBoundary.tsx
import { Component, type ReactNode } from 'react'
import { sentryService } from '@/services/monitoring/sentry.service'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    sentryService.captureException(error, {
      errorInfo,
    })
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="error-container">
            <h2>Something went wrong</h2>
            <p>{this.state.error?.message}</p>
            <button onClick={() => window.location.reload()}>
              Reload Page
            </button>
          </div>
        )
      )
    }

    return this.props.children
  }
}
```

---

## 7. API Testing

### 7.1 Mock Service Worker Setup

```typescript
// tests/mocks/handlers.ts
import { rest } from 'msw'
import { env } from '@/config/env'

export const handlers = [
  // Investments
  rest.get(`${env.VITE_API_URL}/investments`, (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        data: [
          {
            id: '1',
            name: 'Real Estate Fund A',
            type: 'equity',
            min_investment: 10000,
            target_return: 0.12,
          },
        ],
      })
    )
  }),

  // Create investment
  rest.post(`${env.VITE_API_URL}/investments`, (req, res, ctx) => {
    return res(
      ctx.status(201),
      ctx.json({
        data: {
          id: 'new-investment-id',
          status: 'pending',
        },
      })
    )
  }),

  // Error case
  rest.get(`${env.VITE_API_URL}/investments/error`, (req, res, ctx) => {
    return res(
      ctx.status(500),
      ctx.json({
        error: 'Internal server error',
      })
    )
  }),
]
```

### 7.2 API Integration Tests

```typescript
// tests/integration/investments.test.ts
import { renderHook, waitFor } from '@testing-library/react'
import { useInvestmentOpportunities } from '@/features/investments/api/queries'
import { wrapper } from '@/tests/utils'

describe('Investment API Integration', () => {
  it('fetches investment opportunities', async () => {
    const { result } = renderHook(() => useInvestmentOpportunities(), {
      wrapper,
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toHaveLength(1)
    expect(result.current.data?.[0].name).toBe('Real Estate Fund A')
  })

  it('handles API errors gracefully', async () => {
    // Test error handling
  })
})
```

---

## Success Metrics

1. **API Response Time**: <500ms p95
2. **Error Rate**: <1% of all requests
3. **Cache Hit Rate**: >80% for cacheable data
4. **Retry Success**: >90% after retry
5. **Request Deduplication**: >50% reduction in duplicate calls

---

**Next Document**: Form Handling & Validation Strategies
