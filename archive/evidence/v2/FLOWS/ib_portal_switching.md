# IB Portal Dual-Role Switching Flow

## Overview

Introducing Brokers (IBs) may also be investors in the fund. This creates a dual-role scenario where a single user needs access to both:
- **IB Portal** (`/ib/*`) - Manage referred clients, view commissions
- **Investor Portal** (`/investor/*`) - View their own investments

## User Roles

| Role | Portal Access | Routes |
|------|---------------|--------|
| Investor Only | Investor Portal | `/investor/*` |
| IB Only | IB Portal | `/ib/*` |
| Dual Role (IB + Investor) | Both Portals | `/ib/*` + `/investor/*` |
| Admin | Admin Portal | `/admin/*` |

## Switching Mechanism

### Navigation-Based Switching
Users with dual roles see navigation links to both portals:

```
┌─────────────────────────────────────┐
│  INDIGO Platform                    │
├─────────────────────────────────────┤
│  📊 Dashboard (current)             │
│  👥 My Clients                      │
│  💰 Commissions                     │
│  ─────────────────────────────────  │
│  🔄 Switch to Investor Portal →     │
└─────────────────────────────────────┘
```

### State Persistence
- Current portal preference stored in local session
- Refreshing page maintains current portal
- Deep links work for both portals

## Technical Implementation

### Role Detection
```typescript
// Check user roles from profile
const isIB = profile?.role === 'ib' || profile?.is_ib === true;
const isInvestor = profile?.role === 'investor' || profile?.has_investments === true;
const isDualRole = isIB && isInvestor;
```

### Route Guards
```typescript
// IB routes require IB role
<Route path="/ib/*" element={
  <RequireRole roles={['ib', 'admin']}>
    <IBLayout />
  </RequireRole>
} />

// Investor routes require investor status
<Route path="/investor/*" element={
  <RequireRole roles={['investor', 'admin']}>
    <InvestorLayout />
  </RequireRole>
} />
```

### Portal Context
```typescript
// Track current portal for UI/navigation
const [currentPortal, setCurrentPortal] = useState<'ib' | 'investor'>('ib');

// Persist preference
useEffect(() => {
  localStorage.setItem('preferred_portal', currentPortal);
}, [currentPortal]);
```

## Data Isolation

Each portal shows only relevant data:

| Data | IB Portal | Investor Portal |
|------|-----------|-----------------|
| Own Investments | ❌ Hidden | ✅ Shown |
| Client Investments | ✅ Shown | ❌ Hidden |
| Own Commissions | ✅ Shown | ❌ Hidden |
| Client Commissions | ❌ Hidden | ❌ Hidden |
| Own Statements | ❌ Hidden | ✅ Shown |
| Client Statements | ✅ Shown (summary) | ❌ Hidden |

## Security Considerations

1. **RLS Enforcement** - Database policies ensure data access matches role
2. **Route Protection** - Frontend guards prevent unauthorized access
3. **API Validation** - Edge functions verify role before returning data
4. **Audit Logging** - Portal switches are logged for compliance

## Testing Scenarios

### E2E Test Cases
1. IB user can access `/ib/dashboard`
2. Dual-role user can switch to `/investor/dashboard`
3. State persists after page refresh
4. Deep links work for authorized portals
5. Unauthorized portal access redirects appropriately

### Unit Test Cases
1. Role detection correctly identifies dual-role users
2. Navigation shows correct links based on roles
3. Portal context updates correctly
4. Persistence layer works correctly

## Flow Diagram

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Login     │────▶│ Role Check  │────▶│  Redirect   │
└─────────────┘     └─────────────┘     └─────────────┘
                           │
              ┌────────────┼────────────┐
              ▼            ▼            ▼
        ┌─────────┐  ┌─────────┐  ┌─────────┐
        │ IB Only │  │  Dual   │  │Investor │
        │         │  │  Role   │  │  Only   │
        └────┬────┘  └────┬────┘  └────┬────┘
             │            │            │
             ▼            ▼            ▼
        ┌─────────┐  ┌─────────┐  ┌─────────┐
        │/ib/dash │  │ Choose  │  │/investor│
        │         │  │ Portal  │  │/dash    │
        └─────────┘  └────┬────┘  └─────────┘
                          │
                 ┌────────┴────────┐
                 ▼                 ▼
           ┌─────────┐       ┌─────────┐
           │/ib/dash │◀─────▶│/investor│
           │         │ Switch │/dash    │
           └─────────┘       └─────────┘
```
