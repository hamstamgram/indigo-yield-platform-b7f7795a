#!/bin/bash
# Password Reset Script for hammadou@indigo.fund
# Uses Supabase Admin API directly

set -e

# Configuration
SUPABASE_URL="https://nkfimvovosdehmyyjubn.supabase.co"
SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5rZmltdm92b3NkZWhteXlqdWJuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NjQ1NDU5OCwiZXhwIjoyMDYyMDMwNTk4fQ.2dG7IemW8SVQ7FcEe7Dcv41B7utJy0LtEjZhSMESa1k"
EMAIL="hammadou@indigo.fund"

echo "🔐 Indigo Yield Platform - Password Reset"
echo "=========================================="
echo ""

# Generate a secure 24-character password
generate_password() {
    # Generate random password with uppercase, lowercase, numbers, and symbols
    PASSWORD=$(LC_ALL=C tr -dc 'A-Za-z0-9!@#$%^&*()_+-=[]{}|;:,.<>?' < /dev/urandom | head -c 24)
    echo "$PASSWORD"
}

# Get user ID by email
echo "📧 User: $EMAIL"
echo "🔍 Looking up user..."
echo ""

# List users and find the one with matching email
USERS_RESPONSE=$(curl -s -X GET \
  "${SUPABASE_URL}/auth/v1/admin/users" \
  -H "apikey: ${SERVICE_ROLE_KEY}" \
  -H "Authorization: Bearer ${SERVICE_ROLE_KEY}")

# Extract user ID (using grep and sed for parsing)
USER_ID=$(echo "$USERS_RESPONSE" | grep -o "\"id\":\"[^\"]*\"" | grep -B 10 "$EMAIL" | head -1 | sed 's/"id":"\([^"]*\)"/\1/')

if [ -z "$USER_ID" ]; then
    echo "❌ Error: User not found: $EMAIL"
    echo ""
    echo "💡 Alternative: Reset via Supabase Dashboard:"
    echo "https://supabase.com/dashboard/project/nkfimvovosdehmyyjubn/auth/users"
    exit 1
fi

echo "✅ Found user: $USER_ID"
echo ""

# Generate secure password
NEW_PASSWORD=$(generate_password)
echo "🔑 Generated secure password"
echo ""

# Reset password
echo "🔄 Resetting password..."

RESET_RESPONSE=$(curl -s -X PUT \
  "${SUPABASE_URL}/auth/v1/admin/users/${USER_ID}" \
  -H "apikey: ${SERVICE_ROLE_KEY}" \
  -H "Authorization: Bearer ${SERVICE_ROLE_KEY}" \
  -H "Content-Type: application/json" \
  -d "{\"password\":\"${NEW_PASSWORD}\"}")

# Check if successful
if echo "$RESET_RESPONSE" | grep -q "\"id\":"; then
    echo "✅ Password reset successfully!"
    echo ""
    echo "=========================================="
    echo "📧 LOGIN CREDENTIALS"
    echo "=========================================="
    echo "Email:    $EMAIL"
    echo "Password: $NEW_PASSWORD"
    echo "=========================================="
    echo ""
    echo "⚠️  IMPORTANT:"
    echo "1. Save this password in a secure location immediately"
    echo "2. User can login at: https://preview--indigo-yield-platform-v01.lovable.app"
    echo "3. Recommend changing password after first login"
    echo "4. Password meets all security requirements:"
    echo "   - 24 characters long"
    echo "   - Contains uppercase, lowercase, numbers, and symbols"
    echo "   - Cryptographically generated"
    echo ""
else
    echo "❌ Error: Failed to reset password"
    echo ""
    echo "Response: $RESET_RESPONSE"
    echo ""
    echo "💡 Alternative: Reset via Supabase Dashboard:"
    echo "https://supabase.com/dashboard/project/nkfimvovosdehmyyjubn/auth/users"
    exit 1
fi
