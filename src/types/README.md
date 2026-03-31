# Type System Architecture

This project uses a layered type system to ensure data integrity from the database to the UI.

## Layer Hierarchy

1.  **Level 1: Generated Supabase Types** (`@/integrations/supabase/types`)
    *   Auto-generated from the database schema.
    *   Represents the raw table and RPC shapes.
    *   Should be treated as the foundation but not used directly in complex components.

2.  **Level 2: Database Contracts** (`@/contracts/`)
    *   Curated shapes based on database entities.
    *   Includes `dbSchema.ts`, `dbEnums.ts`, and `rpcSignatures.ts`.
    *   Defines the strict interface between the frontend services and the PostgreSQL backend.

3.  **Level 3: Domain Types** (`@/types/domains/`)
    *   Application-level abstractions.
    *   Combines multiple database entities into logical domain models (e.g., `Investor`, `Portfolio`).
    *   The primary source for component props and service logic.

4.  **Level 4: Utility Types** (`@/types/`)
    *   Generic utilities like `asset.ts`, `auth.ts`, and `dashboard.ts`.
    *   Cross-cutting concerns used throughout the application.

## Core Rules

*   **Native Currency**: All financial values MUST be kept in their native currency string (NUMERIC) to preserve 18-decimal precision.
*   **No Cross-Aggregation**: Never aggregate values across different asset types (e.g., BTC + ETH).
*   **Type Purity**: Domain types should not contain runtime logic. Logic belongs in `utils/` or `services/`.
