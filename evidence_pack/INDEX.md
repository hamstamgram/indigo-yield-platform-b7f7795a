# Evidence Pack Index
**Generated:** 2024-12-20

This folder contains verification and evidence files for the regulated token-denominated investment platform.

## Evidence Files

### Section 0 - Inventory
| File | Description |
|------|-------------|
| `INDEX.md` | This file - master index of all evidence |
| `routes.json` | Complete route inventory extracted from source code |
| `button_map.md` | UI action map with file paths and line ranges |

### Section B - Report Uniqueness Enforcement
| File | Description |
|------|-------------|
| `sql/unique_constraints.sql` | Query showing unique constraints on generated_statements |
| `sql/unique_constraints_output.txt` | Expected output showing the constraint |

### Section C - Purpose Model
| File | Description |
|------|-------------|
| `sql/purpose_null_counts.sql` | Queries to verify no null purpose values |
| `sql/purpose_null_counts_output.txt` | Expected results (all zeros) |
| `code_excerpts/investor_statement_filtering.md` | Code excerpts showing purpose filtering |

### Section D - RLS & Permissions
| File | Description |
|------|-------------|
| `sql/rls_matrix.sql` | Query to show all RLS policies |
| `sql/rls_matrix_output.txt` | Expected policy listing |
| `sql/rls_simulation_tests.sql` | JWT simulation tests for role-based access |
| `sql/rls_simulation_tests_output.txt` | Expected simulation results |

### Section E - Reconciliation
| File | Description |
|------|-------------|
| `sql/reconciliation_query.sql` | Token-denominated reconciliation query |
| `sql/seed_minimal_dataset.sql` | Seed script for test data |
| `reconciliation.csv` | Sample reconciliation output |

### Section F - Idempotency
| File | Description |
|------|-------------|
| `sql/idempotency_test.sql` | Test script for yield distribution idempotency |
| `sql/idempotency_constraints.txt` | List of idempotency constraints |

### Section G - Audit Events
| File | Description |
|------|-------------|
| `audit_events.md` | Audit event types with triggers and file paths |
| `sql/audit_sample_queries.sql` | Sample queries for audit log categories |

### Section H - No USD Proof
| File | Description |
|------|-------------|
| `no_usd_grep.txt` | Grep results for USD-related patterns |

## Code Changes Made
- `src/services/core/reportUpsertService.ts` - Modified to REJECT (throw error) when statement already exists instead of updating
- Added `strictInsertStatement()` function that enforces one-report-per-period rule
