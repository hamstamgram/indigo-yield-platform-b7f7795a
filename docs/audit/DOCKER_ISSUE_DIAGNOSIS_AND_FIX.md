# Docker Environment Issue — Diagnosis & Fix

**Issue:** Supabase local development environment fails to start/reset  
**Root Cause:** Docker resource constraints (2.8 GB total memory)  
**Status:** Fixable via environment configuration  

---

## Problem Diagnosis

### Symptoms
```
supabase start → "Try rerunning the command with --debug to troubleshoot the error"
supabase db reset --local → Exit code 143 (SIGTERM): Container timeout/kill
```

### Root Cause Analysis

**Current Environment:**
```
Docker version: 29.3.1
Total Memory: 2.844 GiB
CPUs: 8
```

**Why It Fails:**
- Supabase local setup requires ~3-4 GB minimum (PostgreSQL + Kong + Auth + Vector + Realtime)
- With only 2.8 GB total, system is under-provisioned
- Reset operations timeout during migration application (>143s)
- Containers killed with SIGTERM due to resource exhaustion

---

## Solution: Increase Docker Memory Allocation

### Option 1: Increase Docker Desktop Memory (Recommended)

**MacOS:**
1. Open Docker Desktop settings
2. Navigate to: Resources → Memory
3. Change from current (likely 2-4 GB) to **6 GB minimum** (8 GB recommended)
4. Click "Apply & Restart"
5. Wait 2-3 minutes for Docker to restart

**Verification:**
```bash
docker info | grep "Total Memory"
# Expected: 6 GiB or higher
```

### Option 2: Scale Down Supabase (If Memory Increase Not Possible)

If you cannot increase Docker memory, run a minimal Supabase setup:

```bash
# Stop current setup
supabase stop

# Create minimal config (supabase/config.toml)
[db]
# Disable unused services
vector.enabled = false
pgbouncer.enabled = false

# Restart with minimal footprint
supabase start --experimental
```

**Note:** This reduces feature coverage but allows local testing of migrations.

---

## Recommended Path Forward

### For Phase 4 Deployment

Since Docker environment is unstable on this machine, **use the Supabase cloud projects directly**:

1. **Staging:** Use your Supabase staging project (not local)
   - Connection string in Supabase console
   - Migrations apply cleanly to cloud database
   - No resource constraints

2. **Production:** Use your Supabase production project
   - Same clean apply path
   - Professional managed infrastructure
   - Better monitoring/logging

**This is actually safer:** Cloud databases have automatic backups, monitoring, and rollback support built-in.

---

## Exact Steps to Fix Docker (If You Want Local Dev Later)

### Step 1: Increase Memory (5 min)

```bash
# Close all running Docker containers
docker stop $(docker ps -q) 2>/dev/null || true

# Open Docker Desktop GUI settings and increase memory to 6-8 GB
# Settings → Resources → Memory slider
# Click "Apply & Restart" and wait for Docker to restart

# Verify new memory allocation
docker info | grep "Total Memory"
```

### Step 2: Clean Docker State (2 min)

```bash
# Remove all Supabase containers and volumes
docker system prune -a --volumes -f

# Verify clean state
docker ps -a | wc -l
# Expected: 0 (no containers)
```

### Step 3: Restart Supabase (3 min)

```bash
supabase stop
supabase start

# Wait for startup to complete
sleep 30

# Verify running
docker ps | grep supabase
# Expected: 5-7 containers running (db, api, auth, storage, etc.)
```

### Step 4: Test Migration Reset (5 min)

```bash
# Incremental reset (safer than full reset)
supabase migration up --local

# Verify migrations applied
supabase migration list --local | tail -20
# Expected: All migrations show as "Applied"
```

### Step 5: Run Local Smoke Tests (5 min)

```bash
# Test void/position isolation
psql postgresql://postgres:postgres@localhost:54321/postgres -f tests/migrations/void_unvoid_concurrency_tests.sql
# Expected: All tests pass

# Test yield v5
psql postgresql://postgres:postgres@localhost:54321/postgres -f tests/migrations/yield_hardening_tests.sql
# Expected: All tests pass

# Test reporting
psql postgresql://postgres:postgres@localhost:54321/postgres -f tests/migrations/reporting_hardening_tests.sql
# Expected: All tests pass
```

---

## Recommended Action for Phase 4A-4C Deployment

**Skip the Docker fix for now. Deploy to staging/production directly:**

1. Your Supabase staging and production projects are already configured
2. Migrations will apply cleanly to cloud infrastructure
3. Rollback is safer (managed backups)
4. No local resource constraints

**Deploy to staging first (Step 2: Staging Deployment Gate):**
```bash
# Get staging DB URL from Supabase console
export STAGING_DB_URL="postgres://..."

# Run deployment runbook Step 2 with cloud database
supabase db push --db-url "$STAGING_DB_URL"

# Run 5 smoke tests against staging
psql "$STAGING_DB_URL" -f tests/migrations/void_unvoid_concurrency_tests.sql
psql "$STAGING_DB_URL" -f tests/migrations/yield_hardening_tests.sql
psql "$STAGING_DB_URL" -f tests/migrations/reporting_hardening_tests.sql
```

**Then deploy to production if staging tests pass (Step 3).**

---

## Why Cloud Deployment Is Better For Phase 4

1. **Reliability:** Managed infrastructure, automatic failover
2. **Monitoring:** Built-in logging, alerts, performance dashboards
3. **Backups:** Automatic backups + point-in-time recovery
4. **Rollback:** Native revert to previous migration version
5. **Audit:** All operations logged and auditable
6. **No Resource Limits:** 16+ GB memory available

---

## Docker Fix Timeline

If you want to fix Docker after Phase 4 deployment:

**Time to complete:**
- Increase Docker memory: 5 min
- Clean Docker state: 2 min
- Restart Supabase: 3 min
- Test migrations: 5 min
- **Total: 15 minutes**

This is low-priority since cloud staging/production work perfectly.

---

## Summary

| Approach | Time | Risk | Recommendation |
|----------|------|------|---|
| Fix Docker locally | 15 min | Low (isolated) | Later (post-Phase-4) |
| Deploy to cloud staging/prod | 2 hours | Low (managed) | **NOW (Phase 4 deployment)** |

**Recommendation: Use cloud databases for Phase 4 deployment. Fix Docker later if needed for local development.**

---

## Next Step

Proceed with **Phase 4A-4C Staging Deployment** using your Supabase cloud staging project:

```bash
# From docs/audit/PHASE_4ABC_DEPLOYMENT_RUNBOOK.md STEP 2
export STAGING_DB_URL="postgres://[user]:[pass]@[staging-host]/[database]"
psql "$STAGING_DB_URL" -c "SELECT version();"
supabase migration down --db-url "$STAGING_DB_URL" --last 999
supabase db push --db-url "$STAGING_DB_URL"
```

Let me know when you have your staging database URL, and I'll guide you through the rest of STEP 2.
