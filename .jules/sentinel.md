## 2024-05-22 - Fix Build and Type Mismatches for Lovable Deployment

**Vulnerability:** The project had multiple broken import paths and missing type definitions following an architecture migration from services to feature-based structure. Additionally, missing Node.js types in `tsconfig.json` caused global variable errors.

**Learning:** Large scale refactoring (like moving services to features) requires shim layers or automated import updates to prevent "cascade failures" in dependent components. Supabase type inference can be fragile when views or complex schemas are involved, often requiring `as any` or explicit interface mapping to maintain build stability.

**Prevention:** Always maintain a set of "bridge" or "shim" files during architectural migrations to ensure backward compatibility until all consumers are updated. Ensure `tsconfig.json` is correctly configured with necessary ambient types (`node`, `vite/client`) from the start.
