# Disaster Recovery Guide

## 1. Supabase Backups

### Automatic Backups
Supabase automatically creates daily backups of your database. On the Pro plan:
- **Point-in-time recovery (PITR)** up to 7 days
- **Daily backups** retained for 7 days

### How to Restore from Backup

#### Option A: Point-in-Time Recovery (Recommended)
1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Navigate to **Settings > Database > Backups**
4. Click **"Restore"** next to the desired backup point
5. Confirm the restoration
6. Wait for restoration to complete (can take 10-30 minutes)

**Warning:** This restores the ENTIRE database. All data after the backup point will be lost.

#### Option B: Download and Manual Restore
1. Go to **Settings > Database > Backups**
2. Click **"Download"** on your desired backup
3. Use `pg_restore` to restore to a new database:
   ```bash
   pg_restore --verbose --clean --no-acl --no-owner \
     -h your-new-db-host \
     -U postgres \
     -d your_database \
     backup_file.dump
   ```

### Verify Backup Exists
1. Go to Supabase Dashboard > Settings > Database > Backups
2. Confirm you see recent daily backups
3. Note the timestamp of the latest backup

**Recommended:** Screenshot or note the backup timestamp before launch.

---

## 2. Recovery Time Objectives

| Scenario | Target Recovery Time |
|----------|---------------------|
| Minor bug (cosmetic) | Fix forward, no rollback |
| Data display error | 1-2 hours to investigate and fix |
| Financial calculation error | 4 hours to investigate, may need backup |
| Complete data loss | 2-4 hours (restore from backup) |
| Platform down (hosting) | 1 hour (Lovable support or redeploy) |

---

## 3. Rollback Procedures

### Application Rollback (Bad Code Deploy)

If a deployment causes issues:

1. **Lovable Cloud:**
   - Go to Lovable dashboard
   - Find previous successful deployment
   - Click "Redeploy" on that version

2. **Git-based:**
   ```bash
   # Find last known good commit
   git log --oneline -10
   
   # Revert to that commit
   git revert HEAD~1  # or specific commit
   git push origin main
   ```

### Database Rollback (Bad Data)

For specific bad data (not full restore):

1. **Void the bad transaction:**
   ```sql
   SELECT void_transaction('transaction-uuid-here', 'admin-uuid', 'Reason for void');
   ```

2. **Void a yield distribution:**
   ```sql
   SELECT void_yield_distribution('admin-uuid', 'distribution-uuid');
   ```

3. **Recompute positions:**
   ```sql
   SELECT recompute_investor_position('fund-uuid', 'investor-uuid');
   ```

---

## 4. Communication Templates

### Platform Down
```
Subject: Indigo Platform - Temporary Maintenance

Dear Investor,

Our platform is currently undergoing emergency maintenance. 
We expect to be back online within [X hours].

Your funds and data are secure. This is a technical issue only.

We will notify you when the platform is available again.

Best regards,
Indigo Team
```

### Data Issue Discovered
```
Subject: Indigo Platform - Data Correction Notice

Dear Investor,

We identified a display issue affecting [describe issue].
Your actual balance and earnings are unaffected.

We are correcting the display and you may see temporary 
changes in your dashboard.

If you have questions, please reply to this email.

Best regards,
Indigo Team
```

---

## 5. Emergency Contacts

| Issue | Contact |
|-------|---------|
| Platform hosting (Lovable) | support@lovable.dev |
| Database (Supabase) | support@supabase.io |
| Domain/DNS | [your registrar] |
| Internal escalation | [your phone/signal] |

---

## 6. Daily Health Check Procedure

Run daily at 6:00 AM (automated via cron):

1. **Integrity Check:**
   - `run_invariant_checks()` RPC runs automatically
   - Alerts sent to Discord #code-review if violations

2. **Manual Quick Check (2 min):**
   - [ ] Platform loads (check production URL)
   - [ ] Can log in as admin
   - [ ] Dashboard shows data
   - [ ] No error toasts visible

---

## 7. Incident Response Checklist

When something goes wrong:

1. [ ] **Assess severity** - Is data at risk? Is platform down?
2. [ ] **Communicate** - Post in internal channel, notify affected users if critical
3. [ ] **Investigate** - Check Sentry errors, check database integrity views
4. [ ] **Fix or rollback** - Deploy fix or restore from backup
5. [ ] **Verify** - Run integrity checks, test affected flows
6. [ ] **Document** - Write post-mortem for learning

---

## 8. Pre-Launch Backup Verification

Before Friday launch:

1. [ ] Logged into Supabase dashboard
2. [ ] Verified backups exist (Settings > Database > Backups)
3. [ ] Noted latest backup timestamp: _______________
4. [ ] Understand how to trigger restore
5. [ ] Have Supabase support contact ready
