# Indigo Platform Documentation Index

> **Last Updated**: 2026-01-19  
> **Owner**: Engineering  
> **Next Review**: 2026-04-19

## Quick Links

| Category | Document | Description |
|----------|----------|-------------|
| 🏗️ Architecture | [ARCHITECTURE.md](./ARCHITECTURE.md) | System architecture, tech stack, patterns |
| 📊 Schema | [PLATFORM_INVENTORY.md](./PLATFORM_INVENTORY.md) | Tables, RPCs, views, enums - THE source of truth |
| 💰 Finance | [CFO_ACCOUNTING_GUIDE.md](./CFO_ACCOUNTING_GUIDE.md) | Yield, fees, AUM, reporting logic |
| 👨‍💼 Admin | [ADMIN_GUIDE.md](./ADMIN_GUIDE.md) | Admin workflows and operations |
| 🔧 Operations | [OPERATIONS_MANUAL.md](./OPERATIONS_MANUAL.md) | Day-to-day operational procedures |
| 🚨 Incidents | [INCIDENT_PLAYBOOK.md](./INCIDENT_PLAYBOOK.md) | Incident response procedures |
| 🧩 Patterns | [patterns/](./patterns/) | Function architecture and canonical RPCs |

## Detailed Documentation

### Engineering
- [ARCHITECTURE.md](./ARCHITECTURE.md) - System design and patterns
- [ARCHITECTURE_VERIFICATION.md](./ARCHITECTURE_VERIFICATION.md) - Architecture verification checklist
- [CROSS_REFERENCE_MAP.md](./CROSS_REFERENCE_MAP.md) - UI-to-DB mapping

### Data & Schema
- [PLATFORM_INVENTORY.md](./PLATFORM_INVENTORY.md) - Complete schema reference
- [invariants.md](./invariants.md) - Data integrity invariants
- [MIGRATION_HYGIENE.md](./MIGRATION_HYGIENE.md) - Migration policies

### Finance & Accounting
- [CFO_ACCOUNTING_GUIDE.md](./CFO_ACCOUNTING_GUIDE.md) - Accounting logic
- [FLOW_MATRIX.md](./FLOW_MATRIX.md) - Transaction flow matrix

### Operations
- [ADMIN_GUIDE.md](./ADMIN_GUIDE.md) - Admin procedures
- [OPERATIONS_MANUAL.md](./OPERATIONS_MANUAL.md) - Ops runbook
- [INCIDENT_PLAYBOOK.md](./INCIDENT_PLAYBOOK.md) - Incident response

### Security & Compliance
- [SECURITY_REVIEW.md](./SECURITY_REVIEW.md) - Security review findings
- [KNOWN_LIMITATIONS.md](./KNOWN_LIMITATIONS.md) - Known limitations and accepted risks

### QA & Release
- [SIGN_OFF_PACK.md](./SIGN_OFF_PACK.md) - Go-live checklist
- [REGRESSION_PREVENTION.md](./REGRESSION_PREVENTION.md) - Regression prevention measures
- [TEST_RUNBOOK.md](./TEST_RUNBOOK.md) - Test procedures
- [PRODUCTION_DEPLOYMENT_CHECKLIST.md](./PRODUCTION_DEPLOYMENT_CHECKLIST.md) - Deployment checklist

### Flows & Contracts
- [flows/](./flows/) - Mermaid flow diagrams
- [page-contracts/](./page-contracts/) - Page-level contracts
- [contracts/](./contracts/) - API contracts

### Function Patterns
- [patterns/FEE_FUNCTIONS.md](./patterns/FEE_FUNCTIONS.md) - Fee calculation and resolution hierarchy
- [patterns/YIELD_FUNCTIONS.md](./patterns/YIELD_FUNCTIONS.md) - Yield distribution canonical RPCs
- [patterns/TRANSACTION_FUNCTIONS.md](./patterns/TRANSACTION_FUNCTIONS.md) - Transaction mutation lifecycle
- [patterns/ADMIN_FUNCTIONS.md](./patterns/ADMIN_FUNCTIONS.md) - Admin RBAC and guard patterns

## Archived Documentation

Historical and superseded documentation is in `_archive/`:
- `_archive/ai_artifacts/` - AI-generated work session artifacts
- `_archive/audit_reports/` - One-time audit reports
- `_archive/completed_plans/` - Completed implementation plans
- `_archive/legacy_schema/` - Superseded schema docs
- `_archive/audit_data/` - Audit query data
- `_archive/legacy/` - Other legacy docs

⚠️ **Do not use archived docs as authoritative sources** - they are historical records only.

## Contributing

1. All new docs go in the appropriate category above
2. Update this index when adding new docs
3. Archive (don't delete) superseded docs
4. Add ownership header to all canonical docs:
   ```markdown
   > **Owner**: [Team]  
   > **Last Updated**: YYYY-MM-DD  
   > **Next Review**: YYYY-MM-DD
   ```
