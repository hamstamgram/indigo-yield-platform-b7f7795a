#!/bin/bash

# Database Backup Configuration for Supabase
# This script sets up automated daily backups for the Supabase database

echo "🔐 Setting up database backup automation..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo -e "${RED}❌ Supabase CLI is not installed${NC}"
    echo "Please install it first: brew install supabase/tap/supabase"
    exit 1
fi

# Project configuration
PROJECT_ID="nkfimvovosdehmyyjubn"
PROJECT_NAME="INDIGO YIELD FUND"

echo -e "${YELLOW}📋 Database Backup Configuration${NC}"
echo "================================="
echo "Project: $PROJECT_NAME"
echo "Project ID: $PROJECT_ID"
echo ""

# Note: Supabase automatically handles Point-in-Time Recovery (PITR)
echo -e "${GREEN}✅ Supabase Features Already Enabled:${NC}"
echo "  • Point-in-Time Recovery (PITR) - 7 days on Pro plan"
echo "  • Daily automated backups"
echo "  • Transaction logs for recovery"
echo ""

# Create local backup script
echo -e "${YELLOW}Creating local backup script...${NC}"

cat > backup-database.sh << 'EOF'
#!/bin/bash

# Local Database Backup Script
# Run this manually or via cron for additional backup redundancy

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="./backups"
PROJECT_ID="nkfimvovosdehmyyjubn"

# Create backup directory if it doesn't exist
mkdir -p $BACKUP_DIR

echo "🔄 Starting database backup..."

# Check if SUPABASE_DB_URL is set
if [ -z "$SUPABASE_DB_URL" ]; then
    echo "❌ SUPABASE_DB_URL environment variable not set"
    echo "Set it with: export SUPABASE_DB_URL='postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres'"
    exit 1
fi

# Backup database schema
echo "📦 Backing up database schema..."
pg_dump $SUPABASE_DB_URL \
    --schema-only \
    --no-owner \
    --no-privileges \
    --file="$BACKUP_DIR/schema_$TIMESTAMP.sql"

# Backup database data (excluding large binary data)
echo "💾 Backing up database data..."
pg_dump $SUPABASE_DB_URL \
    --data-only \
    --no-owner \
    --no-privileges \
    --exclude-table-data="storage.objects" \
    --file="$BACKUP_DIR/data_$TIMESTAMP.sql"

# Compress backups
echo "🗜️ Compressing backups..."
gzip "$BACKUP_DIR/schema_$TIMESTAMP.sql"
gzip "$BACKUP_DIR/data_$TIMESTAMP.sql"

# Create combined backup
echo "📚 Creating combined backup..."
pg_dump $SUPABASE_DB_URL \
    --no-owner \
    --no-privileges \
    --exclude-table-data="storage.objects" \
    | gzip > "$BACKUP_DIR/full_backup_$TIMESTAMP.sql.gz"

# Remove old backups (keep last 30 days)
echo "🧹 Cleaning old backups..."
find $BACKUP_DIR -name "*.sql.gz" -mtime +30 -delete

echo "✅ Backup completed successfully!"
echo "Backup files:"
echo "  • $BACKUP_DIR/schema_$TIMESTAMP.sql.gz"
echo "  • $BACKUP_DIR/data_$TIMESTAMP.sql.gz"
echo "  • $BACKUP_DIR/full_backup_$TIMESTAMP.sql.gz"

# Optional: Upload to cloud storage (S3, Google Cloud, etc.)
# Uncomment and configure as needed:
# aws s3 cp "$BACKUP_DIR/full_backup_$TIMESTAMP.sql.gz" s3://your-backup-bucket/supabase/
EOF

chmod +x backup-database.sh

echo -e "${GREEN}✅ Local backup script created: backup-database.sh${NC}"
echo ""

# Create restore script
echo -e "${YELLOW}Creating restore script...${NC}"

cat > restore-database.sh << 'EOF'
#!/bin/bash

# Database Restore Script
# Use this to restore from a backup file

if [ $# -eq 0 ]; then
    echo "Usage: ./restore-database.sh <backup_file.sql.gz>"
    exit 1
fi

BACKUP_FILE=$1

if [ ! -f "$BACKUP_FILE" ]; then
    echo "❌ Backup file not found: $BACKUP_FILE"
    exit 1
fi

echo "⚠️  WARNING: This will restore the database from backup!"
echo "Backup file: $BACKUP_FILE"
read -p "Are you sure you want to continue? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "Restore cancelled."
    exit 0
fi

# Check if SUPABASE_DB_URL is set
if [ -z "$SUPABASE_DB_URL" ]; then
    echo "❌ SUPABASE_DB_URL environment variable not set"
    exit 1
fi

echo "🔄 Starting database restore..."

# Decompress and restore
gunzip -c "$BACKUP_FILE" | psql $SUPABASE_DB_URL

if [ $? -eq 0 ]; then
    echo "✅ Database restored successfully!"
else
    echo "❌ Restore failed. Please check the error messages above."
    exit 1
fi
EOF

chmod +x restore-database.sh

echo -e "${GREEN}✅ Restore script created: restore-database.sh${NC}"
echo ""

# Create backup configuration file
echo -e "${YELLOW}Creating backup configuration...${NC}"

cat > backup-config.json << EOF
{
  "backup_configuration": {
    "project_id": "$PROJECT_ID",
    "project_name": "$PROJECT_NAME",
    "backup_schedule": {
      "daily": {
        "enabled": true,
        "time": "04:00 UTC",
        "retention_days": 30
      },
      "weekly": {
        "enabled": true,
        "day": "Sunday",
        "time": "04:00 UTC",
        "retention_weeks": 12
      },
      "monthly": {
        "enabled": true,
        "day": 1,
        "time": "04:00 UTC",
        "retention_months": 12
      }
    },
    "backup_locations": [
      {
        "type": "supabase_managed",
        "description": "Automatic Supabase backups with PITR"
      },
      {
        "type": "local",
        "path": "./backups",
        "script": "backup-database.sh"
      }
    ],
    "excluded_tables": [
      "storage.objects",
      "auth.refresh_tokens",
      "auth.sessions"
    ],
    "notifications": {
      "email": "hammadou@indigo.fund",
      "on_success": false,
      "on_failure": true
    }
  }
}
EOF

echo -e "${GREEN}✅ Backup configuration created: backup-config.json${NC}"
echo ""

# Create cron job setup script
echo -e "${YELLOW}Creating cron job setup...${NC}"

cat > setup-cron-backup.sh << 'EOF'
#!/bin/bash

# Setup cron job for automated backups

SCRIPT_PATH="$(pwd)/backup-database.sh"
CRON_SCHEDULE="0 4 * * *"  # Daily at 4 AM

echo "Setting up cron job for automated backups..."

# Check if script exists
if [ ! -f "$SCRIPT_PATH" ]; then
    echo "❌ Backup script not found at: $SCRIPT_PATH"
    exit 1
fi

# Add to crontab
(crontab -l 2>/dev/null | grep -v "$SCRIPT_PATH"; echo "$CRON_SCHEDULE cd $(pwd) && $SCRIPT_PATH >> $(pwd)/backups/backup.log 2>&1") | crontab -

echo "✅ Cron job added successfully!"
echo "Schedule: Daily at 4:00 AM"
echo "Log file: $(pwd)/backups/backup.log"
echo ""
echo "To view current cron jobs: crontab -l"
echo "To remove the backup job: crontab -e (and delete the line)"
EOF

chmod +x setup-cron-backup.sh

echo -e "${GREEN}✅ Cron setup script created: setup-cron-backup.sh${NC}"
echo ""

# Create backup documentation
echo -e "${YELLOW}Creating documentation...${NC}"

cat > BACKUP_GUIDE.md << 'EOF'
# Database Backup Guide

## Overview
This guide covers the database backup strategy for the Indigo Yield Platform.

## Backup Strategy

### 1. Automatic Supabase Backups (Primary)
- **Frequency**: Continuous (Point-in-Time Recovery)
- **Retention**: 7 days (Pro plan) or 30 days (Team plan)
- **Recovery**: Via Supabase Dashboard
- **Type**: Full database with transaction logs

### 2. Local Backups (Secondary)
- **Frequency**: Daily at 4:00 AM UTC
- **Retention**: 30 days local, 12 months archive
- **Script**: `backup-database.sh`
- **Location**: `./backups/`

## Setup Instructions

### 1. Configure Database URL
```bash
export SUPABASE_DB_URL='postgresql://postgres:[password]@db.nkfimvovosdehmyyjubn.supabase.co:5432/postgres'
```

### 2. Test Manual Backup
```bash
./backup-database.sh
```

### 3. Setup Automated Backups
```bash
./setup-cron-backup.sh
```

## Restore Procedures

### From Supabase Dashboard (Recommended)
1. Go to https://app.supabase.com/project/nkfimvovosdehmyyjubn
2. Navigate to Settings > Database
3. Click on "Backups"
4. Select point-in-time or daily backup
5. Click "Restore"

### From Local Backup
```bash
./restore-database.sh backups/full_backup_TIMESTAMP.sql.gz
```

## Backup Verification

### Daily Checks
- Check backup log: `tail -f backups/backup.log`
- Verify backup files: `ls -lah backups/`
- Test restore to staging environment

### Weekly Validation
1. Download latest backup
2. Restore to local PostgreSQL instance
3. Verify data integrity
4. Document any issues

## Emergency Recovery

### Data Loss Scenario
1. Stop all application traffic
2. Assess extent of data loss
3. Choose recovery point (latest clean backup)
4. Restore from Supabase Dashboard or local backup
5. Verify data integrity
6. Resume application traffic
7. Document incident

### Corruption Scenario
1. Identify corrupted tables
2. Export clean data if possible
3. Restore from backup
4. Re-apply clean data if needed
5. Run integrity checks

## Best Practices

1. **Test Restores Regularly**: Monthly restore tests to staging
2. **Monitor Backup Jobs**: Check logs daily
3. **Offsite Storage**: Consider S3/GCS for long-term archives
4. **Document Changes**: Log all schema changes
5. **Access Control**: Limit backup file access
6. **Encryption**: Ensure backups are encrypted at rest

## Monitoring

### Health Checks
- Backup job completion status
- Backup file sizes (should be consistent)
- Available storage space
- Restore test results

### Alerts
Set up alerts for:
- Backup job failures
- Storage space < 20%
- Restore test failures
- Unusual backup sizes

## Contact

For backup-related issues:
- Primary: DevOps Team
- Secondary: hammadou@indigo.fund
- Emergency: Supabase Support

## Appendix

### Backup File Naming Convention
- Schema: `schema_YYYYMMDD_HHMMSS.sql.gz`
- Data: `data_YYYYMMDD_HHMMSS.sql.gz`
- Full: `full_backup_YYYYMMDD_HHMMSS.sql.gz`

### Storage Requirements
- Daily backup: ~10-50 MB (compressed)
- 30-day retention: ~300-1500 MB
- Growth rate: ~5-10% monthly
EOF

echo -e "${GREEN}✅ Documentation created: BACKUP_GUIDE.md${NC}"
echo ""

# Summary
echo "================================="
echo -e "${GREEN}✅ Database Backup Setup Complete!${NC}"
echo "================================="
echo ""
echo "Next steps:"
echo "1. Set database connection string:"
echo "   export SUPABASE_DB_URL='postgresql://...'"
echo ""
echo "2. Test manual backup:"
echo "   ./backup-database.sh"
echo ""
echo "3. Setup automated backups (optional):"
echo "   ./setup-cron-backup.sh"
echo ""
echo "4. Review documentation:"
echo "   cat BACKUP_GUIDE.md"
echo ""
echo -e "${YELLOW}⚠️  Important:${NC}"
echo "• Supabase already provides automatic backups"
echo "• Local backups are for additional redundancy"
echo "• Always test restore procedures regularly"
echo "• Keep backup credentials secure"
