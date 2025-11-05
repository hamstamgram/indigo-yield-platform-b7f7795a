# Indigo Yield Platform - Architecture Diagrams
## Visual System Architecture

---

## 1. High-Level System Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         CLIENT APPLICATIONS                              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  ┌──────────────────────────┐        ┌──────────────────────────┐      │
│  │    Web Application       │        │    iOS Application       │      │
│  │                          │        │                          │      │
│  │  • React 18.3            │        │  • SwiftUI               │      │
│  │  • TypeScript 5          │        │  • Swift 5.9+            │      │
│  │  • Vite 5                │        │  • Combine Framework     │      │
│  │  • Tailwind CSS          │        │  • Swift Concurrency     │      │
│  │  • 125 Pages             │        │  • 85 Screens            │      │
│  │                          │        │                          │      │
│  └────────────┬─────────────┘        └────────────┬─────────────┘      │
│               │                                    │                     │
└───────────────┼────────────────────────────────────┼─────────────────────┘
                │                                    │
                │                                    │
┌───────────────┴────────────────────────────────────┴─────────────────────┐
│                         API GATEWAY / BFF                                 │
├───────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │                    Supabase Backend                               │   │
│  │                                                                    │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │   │
│  │  │ PostgreSQL  │  │    Auth     │  │   Storage   │             │   │
│  │  │  Database   │  │   (JWT)     │  │  (S3-like)  │             │   │
│  │  │             │  │             │  │             │             │   │
│  │  │ • Users     │  │ • Login     │  │ • Documents │             │   │
│  │  │ • Funds     │  │ • Register  │  │ • Images    │             │   │
│  │  │ • Invest.   │  │ • 2FA       │  │ • PDFs      │             │   │
│  │  │ • Docs      │  │ • OAuth     │  │             │             │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘             │   │
│  │                                                                    │   │
│  │  ┌──────────────────────────────────────────────────────────┐   │   │
│  │  │              Edge Functions (Serverless)                  │   │   │
│  │  │                                                            │   │   │
│  │  │  • process-investment    • verify-kyc                     │   │   │
│  │  │  • generate-tax-docs     • calculate-portfolio            │   │   │
│  │  │  • send-notifications    • process-payment                │   │   │
│  │  └──────────────────────────────────────────────────────────┘   │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                           │
└───────────────────────────────────────────────────────────────────────────┘
                                    │
                    ┌───────────────┴───────────────┐
                    │                               │
┌───────────────────▼─────────┐   ┌────────────────▼────────────┐
│   THIRD-PARTY SERVICES      │   │   MONITORING & ANALYTICS    │
├─────────────────────────────┤   ├─────────────────────────────┤
│                             │   │                             │
│  Payment Processing         │   │  • Sentry (Errors)          │
│  ├─ Stripe                  │   │  • PostHog (Analytics)      │
│  ├─ Plaid                   │   │  • Mixpanel (Behavior)      │
│  └─ Crypto Wallets          │   │  • Segment (Data)           │
│                             │   │                             │
│  Identity & Compliance      │   │  Performance                │
│  ├─ Persona/Onfido (KYC)    │   │  ├─ Vercel Analytics        │
│  ├─ DocuSign (E-sign)       │   │  ├─ Lighthouse CI           │
│  └─ TaxBit (Tax)            │   │  └─ Bundle Analyzer         │
│                             │   │                             │
│  Communication              │   │  Security                   │
│  ├─ Twilio (SMS)            │   │  ├─ Snyk (Vuln Scan)        │
│  ├─ SendGrid (Email)        │   │  └─ OWASP Check             │
│  └─ Pusher (Real-time)      │   │                             │
│                             │   │                             │
└─────────────────────────────┘   └─────────────────────────────┘
```

---

## 2. Frontend Architecture (React)

```
┌─────────────────────────────────────────────────────────────────────┐
│                        PRESENTATION LAYER                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                    Pages / Routes                             │  │
│  │  (React Router v6 - Lazy Loaded)                              │  │
│  │                                                                │  │
│  │  /auth/login  /app/dashboard  /app/investments  /admin/*      │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                              │                                       │
│                              ▼                                       │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                  Feature Modules                              │  │
│  │  (Self-contained, independently deployable)                   │  │
│  │                                                                │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐          │  │
│  │  │   Auth      │  │  Dashboard  │  │ Investments │          │  │
│  │  ├─────────────┤  ├─────────────┤  ├─────────────┤          │  │
│  │  │ components/ │  │ components/ │  │ components/ │   ...    │  │
│  │  │ api/        │  │ api/        │  │ api/        │          │  │
│  │  │ hooks/      │  │ hooks/      │  │ hooks/      │          │  │
│  │  │ pages/      │  │ pages/      │  │ pages/      │          │  │
│  │  └─────────────┘  └─────────────┘  └─────────────┘          │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                              │                                       │
└──────────────────────────────┼───────────────────────────────────────┘
                               │
┌──────────────────────────────┼───────────────────────────────────────┐
│                   COMPONENT LIBRARY                                   │
├──────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  Atoms (30+)                                                 │   │
│  │  Button, Input, Icon, Avatar, Badge, Label, etc.            │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                              │                                       │
│                              ▼                                       │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  Molecules (40+)                                             │   │
│  │  FormField, Card, SearchBar, Pagination, Tooltip, etc.      │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                              │                                       │
│                              ▼                                       │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  Organisms (30+)                                             │   │
│  │  Navbar, Sidebar, DataTable, MultiStepForm, etc.            │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                       │
└───────────────────────────────────────────────────────────────────────┘
                               │
┌──────────────────────────────┼───────────────────────────────────────┐
│                      STATE MANAGEMENT                                 │
├──────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐             │
│  │ Server State │  │ Global State │  │ Local State  │             │
│  ├──────────────┤  ├──────────────┤  ├──────────────┤             │
│  │ React Query  │  │   Zustand    │  │   useState   │             │
│  │              │  │              │  │  useReducer  │             │
│  │ • Caching    │  │ • Auth       │  │              │             │
│  │ • Refetch    │  │ • UI State   │  │ • Forms      │             │
│  │ • Mutations  │  │ • Prefs      │  │ • Toggles    │             │
│  └──────────────┘  └──────────────┘  └──────────────┘             │
│                                                                       │
└───────────────────────────────────────────────────────────────────────┘
                               │
┌──────────────────────────────┼───────────────────────────────────────┐
│                      SERVICE LAYER                                    │
├──────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌──────────────────┐  ┌──────────────────┐  ┌─────────────────┐  │
│  │  Supabase Client │  │   HTTP Client    │  │  Third-party    │  │
│  ├──────────────────┤  ├──────────────────┤  ├─────────────────┤  │
│  │ • Auth           │  │ • Axios          │  │ • Stripe        │  │
│  │ • Database       │  │ • Interceptors   │  │ • Plaid         │  │
│  │ • Storage        │  │ • Error Handle   │  │ • DocuSign      │  │
│  │ • Realtime       │  │ • Retry Logic    │  │ • Twilio        │  │
│  └──────────────────┘  └──────────────────┘  └─────────────────┘  │
│                                                                       │
└───────────────────────────────────────────────────────────────────────┘
```

---

## 3. Data Flow Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                         USER ACTION                                   │
└────────────────────────────────┬─────────────────────────────────────┘
                                 │
                                 ▼
┌──────────────────────────────────────────────────────────────────────┐
│                      COMPONENT EVENT                                  │
│  (onClick, onSubmit, etc.)                                            │
└────────────────────────────────┬─────────────────────────────────────┘
                                 │
                ┌────────────────┴────────────────┐
                │                                 │
                ▼                                 ▼
┌─────────────────────────────┐   ┌─────────────────────────────┐
│    REACT QUERY MUTATION     │   │     ZUSTAND ACTION          │
│                             │   │                             │
│  useMutation({              │   │  useStore.setState({        │
│    mutationFn: apiCall,     │   │    isLoading: true          │
│    onSuccess: invalidate    │   │  })                         │
│  })                         │   │                             │
└──────────────┬──────────────┘   └──────────────┬──────────────┘
               │                                  │
               ▼                                  │
┌─────────────────────────────────────────────┐  │
│           API SERVICE LAYER                 │  │
│                                             │  │
│  investmentService.create({                 │  │
│    amount: 10000,                           │  │
│    opportunityId: '123'                     │  │
│  })                                         │  │
└──────────────┬──────────────────────────────┘  │
               │                                  │
               ▼                                  │
┌─────────────────────────────────────────────┐  │
│        HTTP CLIENT / SUPABASE CLIENT        │  │
│                                             │  │
│  • Add auth headers                         │  │
│  • Send request                             │  │
│  • Handle errors                            │  │
│  • Retry on failure                         │  │
└──────────────┬──────────────────────────────┘  │
               │                                  │
               ▼                                  │
┌─────────────────────────────────────────────┐  │
│              BACKEND / API                  │  │
│                                             │  │
│  Supabase:                                  │  │
│  • Validate request                         │  │
│  • Check auth                               │  │
│  • Execute business logic                   │  │
│  • Save to database                         │  │
│  • Return response                          │  │
└──────────────┬──────────────────────────────┘  │
               │                                  │
               ▼                                  │
┌─────────────────────────────────────────────┐  │
│         RESPONSE HANDLING                   │  │
│                                             │  │
│  • Update React Query cache                 │  │
│  • Invalidate related queries               │◄─┘
│  • Update Zustand store                     │
│  • Show success/error toast                 │
│  • Navigate to next page                    │
└──────────────┬──────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────┐
│         UI UPDATE (RE-RENDER)               │
│                                             │
│  • Component re-renders with new data       │
│  • Loading states cleared                   │
│  • Success message shown                    │
└─────────────────────────────────────────────┘
```

---

## 4. Component Communication Patterns

```
┌─────────────────────────────────────────────────────────────────────┐
│                     PARENT-CHILD (Props)                             │
│                                                                       │
│  ┌───────────────────────────────────────────┐                      │
│  │           Parent Component                 │                      │
│  │                                            │                      │
│  │  const [value, setValue] = useState('')    │                      │
│  │                                            │                      │
│  │  ┌────────────────────────────────────┐   │                      │
│  │  │  <Child                             │   │                      │
│  │  │    value={value}                    │   │                      │
│  │  │    onChange={setValue}              │   │                      │
│  │  │  />                                 │   │                      │
│  │  └────────────────────────────────────┘   │                      │
│  └───────────────────────────────────────────┘                      │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                  SIBLING (Lift State Up)                             │
│                                                                       │
│  ┌───────────────────────────────────────────┐                      │
│  │           Parent Component                 │                      │
│  │  const [sharedState, setSharedState]       │                      │
│  │                                            │                      │
│  │  ┌────────────┐        ┌────────────┐    │                      │
│  │  │  Sibling A │        │  Sibling B │    │                      │
│  │  │            │        │            │    │                      │
│  │  │  state ────┼────────┼──> state   │    │                      │
│  │  │  setState ◄┼────────┼─── update  │    │                      │
│  │  └────────────┘        └────────────┘    │                      │
│  └───────────────────────────────────────────┘                      │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│               GLOBAL STATE (Zustand)                                 │
│                                                                       │
│  ┌───────────────────────────────────────────┐                      │
│  │          Global Store                      │                      │
│  │  { user, theme, preferences }              │                      │
│  └────────────┬────────────┬─────────────────┘                      │
│               │            │                                         │
│       ┌───────┴────┐   ┌───┴──────┐                                │
│       │Component A │   │Component B│                                │
│       │            │   │           │                                │
│       │ useAuth()  │   │ useTheme()│                                │
│       └────────────┘   └───────────┘                                │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│              SERVER STATE (React Query)                              │
│                                                                       │
│  ┌───────────────────────────────────────────┐                      │
│  │        React Query Cache                   │                      │
│  │  { investments, portfolio, transactions }  │                      │
│  └────────────┬────────────┬─────────────────┘                      │
│               │            │                                         │
│       ┌───────┴────┐   ┌───┴──────────────┐                        │
│       │Component A │   │Component B        │                        │
│       │            │   │                   │                        │
│       │useInvest() │   │useInvestments()   │                        │
│       └────────────┘   └───────────────────┘                        │
│                                                                       │
│  All components share same cached data, auto-sync                    │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 5. Authentication Flow

```
┌──────────────────────────────────────────────────────────────────────┐
│                      LOGIN FLOW                                       │
└──────────────────────────────────────────────────────────────────────┘

User enters credentials
         │
         ▼
┌────────────────────┐
│  LoginForm         │
│  (React Hook Form) │
└────────┬───────────┘
         │
         ▼
┌────────────────────┐
│  Form Validation   │
│  (Zod Schema)      │
└────────┬───────────┘
         │ Valid
         ▼
┌────────────────────┐
│  API Call          │
│  supabase.auth     │
│  .signInWith       │
│  Password()        │
└────────┬───────────┘
         │
         ▼
┌────────────────────────────────────────┐
│  Supabase Auth                          │
│  • Validate credentials                 │
│  • Generate JWT token                   │
│  • Check 2FA requirement                │
└────────┬───────────────────────────────┘
         │
         ├──── 2FA Required ────┐
         │                       ▼
         │              ┌────────────────────┐
         │              │  2FA Verification  │
         │              │  (OTP/Biometric)   │
         │              └────────┬───────────┘
         │                       │
         ▼◄──────────────────────┘
┌────────────────────┐
│  Success Response  │
│  { user, session } │
└────────┬───────────┘
         │
         ▼
┌────────────────────┐
│  Update Auth Store │
│  setUser(user)     │
│  setSession(...)   │
└────────┬───────────┘
         │
         ▼
┌────────────────────┐
│  Redirect to       │
│  /app/dashboard    │
└────────────────────┘
```

---

## 6. Build & Deployment Pipeline

```
┌──────────────────────────────────────────────────────────────────────┐
│                        DEVELOPER WORKFLOW                             │
└──────────────────────────────────────────────────────────────────────┘

Developer writes code
         │
         ▼
┌────────────────────┐
│  Git Commit        │
│  feat: add feature │
└────────┬───────────┘
         │
         ▼
┌────────────────────┐
│  Git Push          │
│  to feature branch │
└────────┬───────────┘
         │
         ▼
┌────────────────────┐
│  Create PR         │
│  to develop branch │
└────────┬───────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    GITHUB ACTIONS CI/CD                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐             │
│  │    Lint      │  │  Type Check  │  │  Unit Tests  │             │
│  ├──────────────┤  ├──────────────┤  ├──────────────┤             │
│  │ ESLint       │  │ TypeScript   │  │ Jest         │             │
│  │ Prettier     │  │ tsc --noEmit │  │ 80% coverage │             │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘             │
│         │                  │                  │                      │
│         └──────────────────┼──────────────────┘                      │
│                            ▼                                         │
│                   ┌──────────────┐                                  │
│                   │    Build     │                                  │
│                   ├──────────────┤                                  │
│                   │ vite build   │                                  │
│                   │ bundle size  │                                  │
│                   └──────┬───────┘                                  │
│                          │                                           │
│                          ▼                                           │
│                   ┌──────────────┐                                  │
│                   │  E2E Tests   │                                  │
│                   ├──────────────┤                                  │
│                   │ Playwright   │                                  │
│                   └──────┬───────┘                                  │
│                          │                                           │
│                          ▼                                           │
│                   ┌──────────────┐                                  │
│                   │Security Scan │                                  │
│                   ├──────────────┤                                  │
│                   │ Snyk         │                                  │
│                   │ npm audit    │                                  │
│                   └──────┬───────┘                                  │
│                          │                                           │
└──────────────────────────┼──────────────────────────────────────────┘
                           │ All Pass
                           ▼
                   ┌──────────────┐
                   │  Code Review │
                   │  Approval    │
                   └──────┬───────┘
                          │
                          ▼
                   ┌──────────────┐
                   │  Merge to    │
                   │  develop     │
                   └──────┬───────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        AUTO DEPLOY                                   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  develop branch   ──────►  Staging Environment (Vercel)              │
│  main branch      ──────►  Production Environment (Vercel)           │
│  tag v*           ──────►  Production + Sentry Release               │
│                                                                       │
│  Post-Deploy:                                                        │
│  • Run smoke tests                                                   │
│  • Notify Slack                                                      │
│  • Update Sentry                                                     │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 7. Security Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        SECURITY LAYERS                               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  LAYER 1: CLIENT-SIDE SECURITY                               │  │
│  ├──────────────────────────────────────────────────────────────┤  │
│  │  • XSS Prevention (React escaping, CSP headers)              │  │
│  │  • Input Validation (Zod schemas)                            │  │
│  │  • Secure Storage (encrypted localStorage)                   │  │
│  │  • HTTPS Only                                                │  │
│  │  • No sensitive data in URLs                                 │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                              │                                       │
│                              ▼                                       │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  LAYER 2: AUTHENTICATION                                     │  │
│  ├──────────────────────────────────────────────────────────────┤  │
│  │  • JWT Tokens (short-lived)                                  │  │
│  │  • Refresh Token Rotation                                    │  │
│  │  • 2FA (TOTP/SMS)                                            │  │
│  │  • Biometric Authentication (iOS)                            │  │
│  │  • Session Management                                        │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                              │                                       │
│                              ▼                                       │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  LAYER 3: AUTHORIZATION                                      │  │
│  ├──────────────────────────────────────────────────────────────┤  │
│  │  • Role-Based Access Control (RBAC)                          │  │
│  │  • Row-Level Security (Supabase RLS)                         │  │
│  │  • API Rate Limiting                                         │  │
│  │  • Permission Checks                                         │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                              │                                       │
│                              ▼                                       │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  LAYER 4: DATA SECURITY                                      │  │
│  ├──────────────────────────────────────────────────────────────┤  │
│  │  • Encryption at Rest (Database)                             │  │
│  │  • Encryption in Transit (TLS 1.3)                           │  │
│  │  • PII Encryption                                            │  │
│  │  • Secure File Storage                                       │  │
│  │  • Audit Logging                                             │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                              │                                       │
│                              ▼                                       │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  LAYER 5: MONITORING                                         │  │
│  ├──────────────────────────────────────────────────────────────┤  │
│  │  • Error Tracking (Sentry)                                   │  │
│  │  • Security Scanning (Snyk)                                  │  │
│  │  • Anomaly Detection                                         │  │
│  │  • Incident Response                                         │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 8. Performance Optimization Strategy

```
┌─────────────────────────────────────────────────────────────────────┐
│                   PERFORMANCE OPTIMIZATIONS                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  CODE SPLITTING                                              │  │
│  ├──────────────────────────────────────────────────────────────┤  │
│  │  • Route-based splitting (lazy loading)                      │  │
│  │  • Component-based splitting                                 │  │
│  │  • Vendor chunk optimization                                 │  │
│  │  • Dynamic imports                                           │  │
│  │                                                              │  │
│  │  Result: <500KB initial bundle                              │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                       │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  CACHING STRATEGY                                            │  │
│  ├──────────────────────────────────────────────────────────────┤  │
│  │  • React Query (API caching, stale-while-revalidate)        │  │
│  │  • CDN caching (static assets)                              │  │
│  │  • Service Worker (offline support)                         │  │
│  │  • LocalStorage (user preferences)                          │  │
│  │  • IndexedDB (large datasets)                               │  │
│  │                                                              │  │
│  │  Result: <500ms cached data access                          │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                       │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  RENDERING OPTIMIZATIONS                                     │  │
│  ├──────────────────────────────────────────────────────────────┤  │
│  │  • React.memo (prevent re-renders)                          │  │
│  │  • useMemo/useCallback (expensive calculations)             │  │
│  │  • Virtual scrolling (large lists)                          │  │
│  │  • Skeleton screens (perceived performance)                 │  │
│  │  • Progressive loading                                      │  │
│  │                                                              │  │
│  │  Result: 60fps smooth scrolling                             │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                       │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  IMAGE OPTIMIZATIONS                                         │  │
│  ├──────────────────────────────────────────────────────────────┤  │
│  │  • WebP/AVIF formats                                         │  │
│  │  • Lazy loading                                              │  │
│  │  • Responsive images (srcset)                                │  │
│  │  • CDN delivery (Vercel Image)                               │  │
│  │  • Compression                                               │  │
│  │                                                              │  │
│  │  Result: <100KB average image size                          │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘

Core Web Vitals Targets:
├─ LCP (Largest Contentful Paint): <2.5s
├─ FID (First Input Delay): <100ms
├─ CLS (Cumulative Layout Shift): <0.1
└─ TTFB (Time to First Byte): <600ms
```

---

These architecture diagrams provide visual representations of:
1. High-level system architecture
2. Frontend component hierarchy
3. Data flow patterns
4. Communication patterns
5. Authentication flow
6. CI/CD pipeline
7. Security layers
8. Performance strategy

Use these diagrams as reference when implementing features or onboarding new team members.

---

**Last Updated**: 2025-01-04
**Maintained By**: Core Team
