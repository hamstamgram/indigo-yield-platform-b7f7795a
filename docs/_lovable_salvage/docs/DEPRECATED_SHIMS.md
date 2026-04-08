# Deprecated Shim Files

> **Target Removal Version:** v2.0

This document tracks deprecated shim files and their migration paths.

## Overview

The `src/hooks/data/` directory previously contained individual shim files that re-exported hooks from their canonical locations. These have been consolidated into barrel exports organized by domain (admin, investor, shared).

## Current Status

All shim files have been **removed**. The canonical import path is now:

```typescript
import { useActiveFunds, useInvestors, useYieldOperations } from "@/hooks/data";
```

## Migration Guide

If you encounter imports from deprecated paths, update them as follows:

| Deprecated Import Path | New Import Path |
|------------------------|-----------------|
| `@/hooks/data/useFunds` | `@/hooks/data` or `@/hooks/data/shared` |
| `@/hooks/data/useInvestors` | `@/hooks/data` or `@/hooks/data/shared` |
| `@/hooks/data/useTransactions` | `@/hooks/data` or `@/hooks/data/shared` |

## Barrel Export Structure

```
src/hooks/data/
├── index.ts          # Main barrel - import from here
├── admin/            # Admin-specific hooks (19 hooks)
│   └── index.ts
├── investor/         # Investor portal hooks (14 hooks)
│   └── index.ts
└── shared/           # Shared domain hooks (27 hooks)
    └── index.ts
```

## Hook Categories

### Admin Hooks
- Operations, yield distribution, fees, reports
- Import: `@/hooks/data/admin`

### Investor Hooks
- Portfolio, balance, withdrawals, statements
- Import: `@/hooks/data/investor`

### Shared Hooks
- Funds, profiles, transactions, documents
- Import: `@/hooks/data/shared`

---

*Last updated: 2026-02-06*
