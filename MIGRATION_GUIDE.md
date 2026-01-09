# Migration Guide: Removing `as any` Casts

This guide provides patterns and examples for systematically removing `as any` type casts from the Indigo Yield Platform codebase.

---

## Table of Contents

1. [Supabase RPC Calls](#1-supabase-rpc-calls)
2. [Query Results](#2-query-results)
3. [Form Components](#3-form-components)
4. [Browser APIs](#4-browser-apis)
5. [Event Handlers](#5-event-handlers)
6. [Import.meta Environment](#6-importmeta-environment)

---

## 1. Supabase RPC Calls

### ❌ Before (Unsafe)

```typescript
const { data, error } = await (supabase.rpc as any)("get_funds_with_aum");

const result = await (supabase.rpc as any)("adjust_investor_position", {
  p_investor_id: investorId,
  p_fund_id: fundId,
  p_adjustment_amount: amount
});
```

### ✅ After (Type-Safe)

**Option 1: Use the typed RPC helper**

```typescript
import { callRPC, callRPCNoArgs } from '@/lib/supabase/typedRPC';

// No arguments
const { data, error } = await callRPCNoArgs("get_funds_with_aum");

// With arguments
const result = await callRPC("adjust_investor_position", {
  p_investor_id: investorId,
  p_fund_id: fundId,
  p_adjustment_amount: amount,
  p_notes: "Adjustment note"
});
```

**Option 2: Direct typing (if helper not desired)**

```typescript
import type { Database } from '@/integrations/supabase/types';

type RPCFunctions = Database['public']['Functions'];

const { data, error } = await supabase.rpc("get_funds_with_aum") as {
  data: RPCFunctions['get_funds_with_aum']['Returns'] | null;
  error: Error | null;
};
```

---

## 2. Query Results

### ❌ Before (Unsafe)

```typescript
const { data, error } = await supabase
  .from("notifications")
  .select("*")
  .eq("user_id", userId);

setNotifications(data as any);
```

### ✅ After (Type-Safe)

```typescript
import type { Database } from '@/integrations/supabase/types';

type NotificationRow = Database['public']['Tables']['notifications']['Row'];

const { data, error } = await supabase
  .from("notifications")
  .select("*")
  .eq("user_id", userId);

if (data) {
  setNotifications(data); // TypeScript knows this is NotificationRow[]
}
```

### Enum Filtering

### ❌ Before

```typescript
if (filters.type) {
  query = query.eq("type", filters.type as any);
}
```

### ✅ After

```typescript
import type { Database } from '@/integrations/supabase/types';

if (filters.type) {
  query = query.eq("type", filters.type as Database["public"]["Enums"]["tx_type"]);
}
```

---

## 3. Form Components

### React Hook Form with Zod

### ❌ Before (Unsafe)

```typescript
const schema = z.object({
  assetCode: z.enum(["BTC", "ETH", "SOL"]),
  reason: z.enum(["personal", "investment"])
});

type FormData = z.infer<typeof schema>;

<Select
  value={selectedAsset}
  onValueChange={(value) => setValue("assetCode", value as any)}
/>
```

### ✅ After (Type-Safe)

```typescript
const schema = z.object({
  assetCode: z.enum(["BTC", "ETH", "SOL"]),
  reason: z.enum(["personal", "investment"])
});

type FormData = z.infer<typeof schema>;

<Select
  value={selectedAsset}
  onValueChange={(value) => setValue("assetCode", value as FormData["assetCode"])}
/>
```

### Handling Undefined in Forms

### ❌ Before

```typescript
setValue("txn_type", undefined as any);
```

### ✅ After

```typescript
// Reset transaction type - casting undefined is necessary due to form library constraints
// The form library expects a valid value or explicit undefined type assertion
setValue("txn_type", undefined as unknown as FormData["txn_type"]);
```

**Note:** Add a comment explaining why the cast is needed when dealing with library constraints.

---

## 4. Browser APIs

### iOS Navigator Standalone

### ❌ Before (Unsafe)

```typescript
const isStandalone = (window.navigator as any).standalone === true;
```

### ✅ After (Type-Safe)

```typescript
// iOS-specific Navigator extension (not in standard TypeScript types)
interface IOSNavigator extends Navigator {
  standalone?: boolean;
}

const isStandalone = (window.navigator as IOSNavigator).standalone === true;
```

### Google Analytics gtag

### ❌ Before

```typescript
if ((window as any).gtag) {
  (window as any).gtag("event", "click", { category: "button" });
}
```

### ✅ After

```typescript
// Google Analytics gtag function type definition
declare global {
  interface Window {
    gtag?: (
      command: 'event' | 'config' | 'set',
      targetId: string,
      params?: Record<string, unknown>
    ) => void;
  }
}

if (window.gtag) {
  window.gtag("event", "click", { category: "button" });
}
```

---

## 5. Event Handlers

### BeforeInstallPrompt Event

### ❌ Before

```typescript
const onBeforeInstall = (e: Event) => {
  setDeferred(e as BeforeInstallPromptEvent);
};

window.addEventListener("beforeinstallprompt", onBeforeInstall as any);
```

### ✅ After

```typescript
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

declare global {
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent;
  }
}

const onBeforeInstall = (e: BeforeInstallPromptEvent) => {
  setDeferred(e);
};

window.addEventListener("beforeinstallprompt", onBeforeInstall);
```

---

## 6. Import.meta Environment

### ❌ Before (Unsafe)

```typescript
if (
  typeof import.meta !== "undefined" &&
  (import.meta as any).env &&
  (import.meta as any).env[key]
) {
  return (import.meta as any).env[key];
}
```

### ✅ After (Type-Safe)

```typescript
// Type definition for Vite's import.meta.env
interface ImportMetaEnv {
  [key: string]: string | undefined;
}

interface ImportMeta {
  env?: ImportMetaEnv;
}

if (
  typeof import.meta !== "undefined" &&
  (import.meta as ImportMeta).env &&
  (import.meta as ImportMeta).env![key]
) {
  return (import.meta as ImportMeta).env![key];
}
```

---

## Pattern: Type Adapters

For complex domain types that don't directly match Supabase types, create adapters:

### Example: Transaction Adapter

```typescript
// src/lib/typeAdapters/transactionAdapter.ts

import type { Database } from '@/integrations/supabase/types';
import type { Transaction } from '@/types/domains/transaction';

type TransactionRow = Database['public']['Tables']['transactions_v2']['Row'];

export function toTransaction(row: TransactionRow): Transaction {
  return {
    id: row.id,
    amount: row.amount,
    type: row.type,
    date: row.tx_date,
    // ... map other fields
  };
}

export function toTransactions(rows: TransactionRow[]): Transaction[] {
  return rows.map(toTransaction);
}
```

### Usage

```typescript
const { data, error } = await supabase
  .from("transactions_v2")
  .select("*");

if (data) {
  const transactions = toTransactions(data); // Type-safe!
}
```

---

## Checklist for Service Migration

When updating a service file:

- [ ] Import Database types: `import type { Database } from '@/integrations/supabase/types'`
- [ ] Replace `(supabase.rpc as any)` with `callRPC` or `callRPCNoArgs`
- [ ] Remove `as any` from query result mappings
- [ ] Use enum types from Database for filters
- [ ] Create type adapters if needed
- [ ] Test the service thoroughly
- [ ] Update any dependent tests

---

## Priority Order for Migration

1. **High-frequency data hooks** (already done: useNotifications, useFundAUM, useTransactions)
2. **Core service layer** (next: statementsApi.ts, ibService.ts, reportsApi.ts)
3. **Security-critical files** (GDPR Compliance Manager - 22 instances)
4. **Admin services** (yield management, distributions)
5. **Test files** (lower priority but should be consistent)

---

## Common Pitfalls

### ❌ Don't cast to unknown first unnecessarily

```typescript
// Bad
const value = data as unknown as MyType;
```

### ✅ Use direct casting when types are compatible

```typescript
// Good
const value = data as MyType;
```

### ❌ Don't ignore TypeScript errors with suppressions

```typescript
// Bad
// @ts-ignore
const result = someFunction(wrongType);
```

### ✅ Fix the type issue properly

```typescript
// Good
const result = someFunction(value as ExpectedType);
// Or better: fix the source to return the right type
```

---

## Need Help?

- Check `TYPE_SAFETY_AUDIT_REPORT.md` for overall progress
- Review `src/lib/supabase/typedRPC.ts` for RPC helper usage
- Refer to already-fixed files as examples:
  - `src/hooks/data/shared/useNotifications.ts`
  - `src/hooks/data/shared/useFundAUM.ts`
  - `src/integrations/supabase/client.ts`

---

**Remember:** Type safety isn't just about removing `as any` - it's about ensuring correctness and preventing runtime errors. Take time to understand the types and create proper abstractions.
