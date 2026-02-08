# src/utils Directory Structure

This directory contains **pure utility functions** - stateless helpers that don't depend on React context or external services.

## Guidelines

### What belongs in `src/utils/`:
- Pure functions (formatters, parsers, calculators)
- Asset helpers (`assets.ts`, `assetUtils.ts`, `assetValidation.ts`)
- Financial calculations (`financial.ts`, `kpiCalculations.ts`)
- Statement/PDF generation utilities (`statementCalculations.ts`, etc.)
- Performance utilities (`performance/`)
- Encryption helpers (`encryption.ts`)

### What belongs in `src/lib/`:
- Framework integrations (auth context, providers)
- Third-party library wrappers
- Security infrastructure
- Type adapters

### Usage
Import utilities directly:
```typescript
import { formatTokenAmount } from "@/utils/formatters";
import { calculateMTDReturn } from "@/utils/kpiCalculations";
```