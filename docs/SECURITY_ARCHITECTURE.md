# Security Architecture
**Indigo Yield Platform - Database Security**

## Architecture Overview

<lov-mermaid>
graph TB
    subgraph "Client Layer"
        A[Web Application]
        B[iOS Application]
    end
    
    subgraph "Authentication Layer"
        C[Supabase Auth]
        D[2FA/TOTP]
        E[Session Management]
    end
    
    subgraph "Authorization Layer"
        F[RLS Policies]
        G[Admin Check Functions]
        H[User Context]
    end
    
    subgraph "Data Access Layer"
        I[Public Schema Tables]
        J[SECURITY DEFINER Functions]
        K[Audit Logging]
    end
    
    subgraph "Data Storage Layer"
        L[(PostgreSQL Database)]
        M[Encrypted Secrets]
        N[Foreign Key Constraints]
    end
    
    A --> C
    B --> C
    C --> D
    C --> E
    E --> H
    H --> F
    H --> G
    G --> F
    F --> I
    F --> J
    J --> K
    I --> L
    J --> L
    K --> L
    L --> M
    L --> N
</lov-mermaid>

---

## Security Layers

### 1. Authentication Layer
**Components:**
- Supabase Auth (JWT tokens)
- 2FA/TOTP verification
- Secure session management

**Flow:**
```
User Login → JWT Token → 2FA Check → Session Created → Context Established
```

### 2. Authorization Layer
**Components:**
- Row-Level Security (RLS) policies
- Admin verification functions
- User context (auth.uid())

**Admin Check Architecture:**

<lov-mermaid>
graph LR
    A[RLS Policy] --> B{Check Required?}
    B -->|Admin Only| C[is_admin_v2]
    B -->|User Data| D[auth.uid check]
    C --> E[admin_users table]
    E --> F{Has Active Grant?}
    F -->|Yes| G[Allow Access]
    F -->|No| H[Deny Access]
    D --> I{Matches user_id?}
    I -->|Yes| G
    I -->|No| H
</lov-mermaid>

### 3. Data Access Layer

**RLS Policy Structure:**

<lov-mermaid>
graph TD
    A[Query Request] --> B{Table Has RLS?}
    B -->|Yes| C{Policy Exists?}
    B -->|No| D[Direct Access]
    C -->|Admin Policy| E[Check is_admin_v2]
    C -->|User Policy| F[Check auth.uid]
    E --> G{Is Admin?}
    F --> H{Is Owner?}
    G -->|Yes| I[Full Access]
    G -->|No| J[Filtered Access]
    H -->|Yes| I
    H -->|No| K[No Access]
</lov-mermaid>

---

## SQL Injection Prevention

### Search Path Configuration

**Before (Vulnerable):**
```sql
CREATE FUNCTION public.some_function()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER  -- ❌ No search_path = VULNERABLE
AS $$ ... $$;
```

**After (Secure):**
```sql
CREATE FUNCTION public.some_function()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''  -- ✅ Explicit search_path = SECURE
AS $$ ... $$;
```

**Attack Prevention:**

<lov-mermaid>
sequenceDiagram
    participant Attacker
    participant Function
    participant Database
    
    Note over Attacker: WITHOUT search_path
    Attacker->>Function: Call with malicious search_path
    Function->>Database: Execute with attacker's schema
    Database-->>Attacker: ❌ Malicious code executed
    
    Note over Attacker: WITH search_path
    Attacker->>Function: Call with malicious search_path
    Function->>Database: Execute with locked search_path
    Database-->>Attacker: ✅ Attack blocked
</lov-mermaid>

---

## Investment Data Flow

### Security at Each Layer

<lov-mermaid>
sequenceDiagram
    participant Client
    participant Auth
    participant RLS
    participant Function
    participant DB
    participant Audit
    
    Client->>Auth: Create Investment Request
    Auth->>Auth: Verify JWT Token
    Auth->>RLS: Check Investor Permissions
    RLS->>Function: validate_investment_integrity()
    Function->>DB: Check Foreign Keys
    DB-->>Function: Validation Result
    Function->>DB: INSERT with constraints
    DB->>Audit: Log Investment Creation
    Audit-->>Client: Success + Audit ID
</lov-mermaid>

---

## Admin Access Control

### Dual-Layer Admin Verification

<lov-mermaid>
graph TB
    A[Admin Action Request] --> B[RLS Policy]
    B --> C{Check is_admin_v2}
    C --> D[Query admin_users table]
    D --> E{User in admin_users?}
    E -->|No| F[❌ Access Denied]
    E -->|Yes| G{revoked_at IS NULL?}
    G -->|No| F
    G -->|Yes| H[✅ Access Granted]
    H --> I[Execute Admin Function]
    I --> J[Log to audit_log]
</lov-mermaid>

**Key Security Features:**
1. **Separation of Concerns**: Admin status in dedicated `admin_users` table
2. **Revocation Support**: Can revoke admin access without deleting records
3. **Audit Trail**: All grants/revocations tracked with timestamps
4. **No Client-Side Checks**: All verification server-side via RLS

---

## Data Integrity Architecture

### Foreign Key Enforcement

<lov-mermaid>
graph LR
    subgraph "Core Tables"
        A[investors]
        B[funds]
        C[profiles]
    end
    
    subgraph "Related Tables"
        D[investments]
        E[investor_positions]
        F[fee_calculations]
        G[withdrawals]
    end
    
    D -->|investor_id| A
    D -->|fund_id| B
    E -->|investor_id| A
    E -->|fund_id| B
    F -->|investor_id| A
    F -->|fund_id| B
    G -->|investor_id| A
    G -->|fund_id| B
    A -->|profile_id| C
</lov-mermaid>

**Cascade Behavior:**
- `investors` deleted → Cascade to positions, fees, withdrawals
- `funds` deleted → Restrict if investments exist
- `profiles` deleted → Cascade to investors

---

## Audit Trail System

### Event Logging Flow

<lov-mermaid>
sequenceDiagram
    participant Action
    participant Trigger
    participant Function
    participant AuditLog
    participant AdminDash
    
    Action->>Trigger: Data Modification
    Trigger->>Function: audit_transaction_changes()
    Function->>Function: Capture OLD and NEW values
    Function->>AuditLog: INSERT audit record
    AuditLog->>AuditLog: Record actor_user (auth.uid)
    AdminDash->>AuditLog: Query recent events
    AuditLog-->>AdminDash: Display audit trail
</lov-mermaid>

**Tracked Events:**
- INSERT operations → New record captured
- UPDATE operations → OLD and NEW values stored
- DELETE operations → Deleted record preserved
- Actor identification → Always captured via auth.uid()

---

## Security Best Practices

### ✅ DO

1. **Always use RLS policies** for sensitive tables
2. **Use `SET search_path`** on all SECURITY DEFINER functions
3. **Verify admin with `is_admin_v2()`** not client-side checks
4. **Log security events** to audit_log
5. **Use foreign keys** to enforce referential integrity
6. **Validate inputs** before database operations

### ❌ DON'T

1. **Never bypass RLS** in application code
2. **Never trust client-side** role checks
3. **Never use raw SQL** without parameterization
4. **Never store passwords** in plain text
5. **Never expose `auth.users`** table directly
6. **Never modify Supabase** internal schemas

---

## Testing Security

### Security Test Checklist

```sql
-- 1. Test RLS isolation
-- Switch user context and verify data access

-- 2. Test admin functions
SELECT is_admin_v2();

-- 3. Test investment integrity
SELECT * FROM validate_investment_integrity();

-- 4. Test audit logging
SELECT * FROM audit_log ORDER BY created_at DESC LIMIT 5;

-- 5. Test foreign key constraints
-- Try inserting orphaned records (should fail)
```

---

## Incident Response

### Security Incident Flow

<lov-mermaid>
graph TD
    A[Security Incident Detected] --> B{Severity?}
    B -->|Critical| C[Immediate Action]
    B -->|High| D[Same-Day Action]
    B -->|Medium| E[Next-Day Action]
    
    C --> F[Disable Affected Function]
    C --> G[Review Audit Logs]
    C --> H[Notify Team]
    
    D --> G
    E --> G
    
    G --> I[Identify Attack Vector]
    I --> J[Apply Security Patch]
    J --> K[Run Security Linter]
    K --> L{Issues Resolved?}
    L -->|No| J
    L -->|Yes| M[Deploy Fix]
    M --> N[Document Incident]
    N --> O[Post-Mortem Review]
</lov-mermaid>

---

## Compliance Mapping

### OWASP Top 10 Coverage

| OWASP Risk | Mitigation | Status |
|------------|-----------|---------|
| A01: Broken Access Control | RLS policies + admin_users separation | ✅ Secure |
| A02: Cryptographic Failures | TOTP secret encryption | ✅ Secure |
| A03: Injection | search_path configuration | ✅ Secure |
| A04: Insecure Design | Security-by-default architecture | ✅ Secure |
| A05: Security Misconfiguration | Proper function definitions | ✅ Secure |
| A06: Vulnerable Components | PostgreSQL upgrade pending | ⚠️ Acceptable |
| A07: Authentication Failures | 2FA/TOTP + JWT | ✅ Secure |
| A08: Software/Data Integrity | Foreign keys + validation | ✅ Secure |
| A09: Logging Failures | Comprehensive audit_log | ✅ Secure |
| A10: SSRF | N/A for database layer | N/A |

---

## References

- [Full Security Audit Report](./SECURITY_AUDIT_REPORT.md)
- [Security Summary](./SECURITY_SUMMARY.md)
- [Supabase Security Best Practices](https://supabase.com/docs/guides/database/database-linter)
