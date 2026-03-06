# Friday Launch Checklist

**Launch Date:** Friday, February 14, 2026
**Investors:** 50 (existing, data migrated)
**Support:** Email

---

## Context Scope
- **Skills:** backend-patterns, security-review
- **MCP:** supabase
- **Project:** ~/indigo-yield-platform-v01/CLAUDE.md

---

## Pre-Launch Tasks (Must Complete by Thursday)

### 1. Uptime Monitoring
- [ ] Set up UptimeRobot (free tier) - **YOU DO THIS** (5 min)
  1. Go to https://uptimerobot.com (free account)
  2. Add New Monitor > HTTP(s)
  3. URL: your production URL
  4. Interval: 5 minutes
  5. Alert contacts: your email
- **Status:** INSTRUCTIONS PROVIDED

### 2. Error Alerting (Sentry)
- [ ] Set up Sentry - **YOU DO THIS** (10 min)
  1. Go to https://sentry.io (free tier)
  2. Create project > React
  3. Copy the DSN (looks like https://xxx@sentry.io/123)
  4. Add to your deployment environment: `VITE_SENTRY_DSN=your-dsn`
  5. Redeploy
- **Note:** Code is already wired up, just needs the DSN
- **Status:** INSTRUCTIONS PROVIDED

### 3. Daily Integrity Check
- [x] Cron job created: `indigo-daily-integrity`
- [x] Runs at 6:00 AM Lisbon time
- [x] Calls `run_invariant_checks()` RPC
- [x] Alerts Discord #code-review if violations
- **Status:** DONE

### 4. Backup Verification
- [x] Documentation created: `docs/DISASTER_RECOVERY.md`
- [x] Restore procedures documented
- [x] Communication templates included
- [ ] **YOU DO:** Log into Supabase, verify backups exist (Settings > Database > Backups)
- **Status:** DONE (verify backup exists)

---

## Launch Day (Friday)

### Morning
- [ ] Run integrity check manually
- [ ] Verify all funds show correct AUM
- [ ] Test one investor login flow

### Investor Onboarding
- [ ] Create investor profiles in admin
- [ ] Send invite emails
- [ ] Monitor for login issues

### Monitoring
- [ ] Watch Sentry for errors
- [ ] Check email for uptime alerts
- [ ] Be available for investor questions

---

## Post-Launch (Next Week)

- [ ] Rate limiting on auth endpoints
- [ ] Session timeout configuration
- [ ] Custom error pages
- [ ] Load testing
- [ ] Security audit

---

## Emergency Contacts

- **Platform issues:** [your email]
- **Supabase support:** support@supabase.io
- **Hosting (Lovable):** [support channel]

---

## Rollback Plan

If critical issues discovered:
1. Communicate to investors immediately (email)
2. Take platform offline if data integrity at risk
3. Restore from Supabase backup if needed
4. Fix issue in development
5. Redeploy and verify
6. Bring platform back online
7. Communicate resolution to investors
