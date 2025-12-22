# src/lib Directory Structure

This directory contains **infrastructure and framework integrations**. These are typically wrappers around third-party libraries or cross-cutting concerns.

## Guidelines

### What belongs in `src/lib/`:
- Authentication framework (`auth/`) - React context, providers
- Security utilities (`security/`) - CSRF, headers, encryption wrappers
- PDF generation (`pdf/`) - jsPDF wrappers and generators
- Statement generation (`statements/`) - Email/report templates
- Validation schemas (`validation/`) - Zod schemas for forms/APIs
- Supabase helpers (`supabase/`) - Edge function invocation utilities
- Type adapters (`typeAdapters/`) - DB ↔ App type transformations

### What belongs in `src/utils/`:
- Pure utility functions (formatters, calculators)
- Asset helpers
- Financial calculations
- Performance tracking
- General-purpose helpers

### Migration Notes
- `lib/validations/` has been consolidated into `lib/validation/`
- Unused directories (`cache/`, `export/`, `documents/`, `reports/`) can be removed or moved to `utils/` if needed