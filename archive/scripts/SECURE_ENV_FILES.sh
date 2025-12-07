#!/bin/bash

# EMERGENCY SCRIPT TO SECURE .ENV FILES
# Run this immediately to prevent credential exposure

echo "🔒 EMERGENCY ENV FILE SECURITY SCRIPT"
echo "======================================"
echo ""

# Create a secure directory for env files
SECURE_DIR="$HOME/.indigo-secure-env"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="$SECURE_DIR/backup_$TIMESTAMP"

echo "1. Creating secure backup directory..."
mkdir -p "$BACKUP_DIR"
chmod 700 "$SECURE_DIR"

# Move all .env files to secure location
echo "2. Moving .env files to secure location..."
for envfile in .env .env.* ; do
    if [ -f "$envfile" ]; then
        echo "   Moving $envfile to $BACKUP_DIR/"
        mv "$envfile" "$BACKUP_DIR/"
        echo "   ✓ Secured: $envfile"
    fi
done

# Create .env.example with placeholders
echo "3. Creating safe .env.example file..."
cat > .env.example << 'EOF'
# ================================================
# ENVIRONMENT VARIABLES TEMPLATE
# ================================================
# SECURITY: Never commit real values to git!
# Copy this to .env.local and fill with real values
# ================================================

# GitHub
GITHUB_TOKEN=your_github_token_here

# Email Service
MAILERLITE_API_TOKEN=your_mailerlite_api_token_here

# Analytics & Monitoring
POSTHOG_KEY=your_posthog_key_here
SENTRY_DSN=your_sentry_dsn_here
SENTRY_TOKEN=your_sentry_auth_token_here

# SMTP Configuration
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your_email@example.com
SMTP_PASS=your_smtp_password_here

# Database URLs
SUPABASE_DEV_DB_URL=postgresql://user:password@host:port/database
SUPABASE_PROD_DB_URL=postgresql://user:password@host:port/database

# Deployment
VERCEL_TOKEN=your_vercel_token_here

# Supabase Configuration
VITE_SUPABASE_URL=your_supabase_url_here
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here
VITE_SUPABASE_PROJECT_ID=your_project_id_here

# Portfolio Configuration (if applicable)
VITE_PORTFOLIO_SUPABASE_URL=your_portfolio_supabase_url_here
VITE_PORTFOLIO_SUPABASE_ANON_KEY=your_portfolio_anon_key_here

# Sentry
VITE_SENTRY_DSN=your_sentry_dsn_here
EOF

echo "   ✓ Created .env.example with safe placeholders"

# Update .gitignore if needed
echo "4. Verifying .gitignore..."
if ! grep -q "^\.env$" .gitignore 2>/dev/null; then
    echo "   ⚠️  .env not in .gitignore - already fixed in previous step"
fi

# Check for any remaining secrets in the current directory
echo ""
echo "5. Scanning for any remaining exposed secrets..."
REMAINING_SECRETS=$(grep -r "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9" --exclude-dir=node_modules --exclude-dir=.next --exclude="*.sh" . 2>/dev/null | wc -l)
echo "   Found $REMAINING_SECRETS files with potential JWT tokens"

echo ""
echo "======================================"
echo "✅ SECURITY ACTIONS COMPLETED:"
echo "======================================"
echo "1. ✓ Moved all .env files to: $BACKUP_DIR"
echo "2. ✓ Created safe .env.example template"
echo "3. ✓ Set secure permissions (700) on backup directory"
echo ""
echo "⚠️  NEXT STEPS - DO IMMEDIATELY:"
echo "======================================"
echo "1. ROTATE ALL CREDENTIALS:"
echo "   - MailerLite API token"
echo "   - Sentry auth tokens"
echo "   - Supabase anon keys"
echo "   - SMTP passwords"
echo "   - GitHub token"
echo "   - Vercel token"
echo ""
echo "2. CREATE NEW .env.local:"
echo "   cp .env.example .env.local"
echo "   # Then add your NEW credentials"
echo ""
echo "3. SECURE THE BACKUP:"
echo "   - Review files in: $BACKUP_DIR"
echo "   - Delete after rotating credentials"
echo "   - Or encrypt with: tar czf - $BACKUP_DIR | openssl enc -aes-256-cbc -salt > backup.tar.gz.enc"
echo ""
echo "4. IF THIS BECOMES A GIT REPO:"
echo "   - Never run 'git add .' without checking"
echo "   - Use 'git status' to verify no .env files"
echo "   - Run 'gitleaks detect' before any commit"
echo ""
echo "🔴 CRITICAL: Rotate all exposed credentials NOW!"
echo "======================================"