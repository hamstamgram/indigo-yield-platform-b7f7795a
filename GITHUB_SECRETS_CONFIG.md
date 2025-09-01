# GitHub Actions Secrets Configuration
# =====================================
# Add these secrets to your GitHub repository settings:
# Settings -> Secrets and variables -> Actions -> New repository secret

## Supabase Configuration (Production/Staging)
## --------------------------------------------
# These values are from your INDIGO YIELD FUND Supabase project

# Supabase Project URL (same for dev and staging for now)
STAGING_SUPABASE_URL=https://nkfimvovosdehmyyjubn.supabase.co
VITE_SUPABASE_URL=https://nkfimvovosdehmyyjubn.supabase.co

# Supabase Anonymous Key (public, safe to expose)
STAGING_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5rZmltdm92b3NkZWhteXlqdWJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY0NTQ1OTgsImV4cCI6MjA2MjAzMDU5OH0.pZrIyCCd7dlvvNMGdW8-71BxSVfoKhxs9a5Ezbkmjgg
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5rZmltdm92b3NkZWhteXlqdWJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY0NTQ1OTgsImV4cCI6MjA2MjAzMDU5OH0.pZrIyCCd7dlvvNMGdW8-71BxSVfoKhxs9a5Ezbkmjgg

# Supabase Service Role Key (secret, never expose in client)
SUPABASE_STAGING_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5rZmltdm92b3NkZWhteXlqdWJuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NjQ1NDU5OCwiZXhwIjoyMDYyMDMwNTk4fQ.2dG7IemW8SVQ7FcEe7Dcv41B7utJy0LtEjZhSMESa1k
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5rZmltdm92b3NkZWhteXlqdWJuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NjQ1NDU5OCwiZXhwIjoyMDYyMDMwNTk4fQ.2dG7IemW8SVQ7FcEe7Dcv41B7utJy0LtEjZhSMESa1k

# Supabase Database URL
# Database password retrieved from Supabase Dashboard
SUPABASE_STAGING_DB_URL=postgresql://postgres.nkfimvovosdehmyyjubn:Douentza2067@@aws-0-us-east-2.pooler.supabase.com:6543/postgres
SUPABASE_DEV_DB_URL=postgresql://postgres.nkfimvovosdehmyyjubn:Douentza2067@@aws-0-us-east-2.pooler.supabase.com:6543/postgres

## Vercel Configuration
## --------------------
# You need to get these from your Vercel account

# Vercel Token for deployments
VERCEL_TOKEN=l2nyQB0XXF43oAUFvEwL4dCY

# 2. Get your Organization ID and Project ID:
#    - Install Vercel CLI: npm i -g vercel
#    - Run: vercel link (in this project directory)
#    - This will create .vercel/project.json with orgId and projectId
#    - Or find them in Vercel Dashboard -> Project Settings
VERCEL_ORG_ID=[YOUR_VERCEL_ORG_ID]
VERCEL_PROJECT_ID=[YOUR_VERCEL_PROJECT_ID]

## Sentry Error Tracking (Optional but recommended)
## ------------------------------------------------
# From your .env file
SENTRY_AUTH_TOKEN=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
SENTRY_TOKEN=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

# You need to create a Sentry project:
# 1. Go to https://sentry.io
# 2. Create new project (React)
# 3. Get the DSN from Project Settings -> Client Keys
SENTRY_DSN=[YOUR_SENTRY_DSN]
VITE_SENTRY_DSN=[YOUR_SENTRY_DSN]

# Get from Sentry Settings
SENTRY_ORG=[YOUR_SENTRY_ORG_SLUG]
SENTRY_PROJECT=[YOUR_SENTRY_PROJECT_SLUG]

## PostHog Analytics (Optional)
## ----------------------------
# If you want analytics, sign up at https://posthog.com
# Get your API key from Project Settings
POSTHOG_API_KEY=[YOUR_POSTHOG_KEY]
VITE_POSTHOG_API_KEY=[YOUR_POSTHOG_KEY]

## Email Configuration (MailerLite)
## --------------------------------
# From your .env file
MAILERLITE_API_TOKEN=eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJhdWQiOiI0IiwianRpIjoiZjU4OGJmMDk4Y2QyZWM4ZDRhYTI5NzA1MmFhMTg3NTExOGQ2MTQzOTdmMjQ2NGU2YTc0Y2Q0OTVkZTU2YTJkZjk4ZWE0MWI4NjI2OTg1ZjQiLCJpYXQiOjE3NTY3MzA2NDcuODY5MDkzLCJuYmYiOjE3NTY3MzA2NDcuODY5MDk1LCJleHAiOjQ5MTI0MDQyNDcuODY1NTk1LCJzdWIiOiI4NjUyNDYiLCJzY29wZXMiOltdfQ.EhrR6IkV99fntVGgChpW1cuS2I2s6n5rw11KrK0X0gzXMh2e5zXyx90gDc99xI-jMt5jrRJK08EjAR0_DqgvvYU8ip3EvgZ9cH2IrEePUaB3SFhl4cf8KN8KmED71odr9e_VO6t5dfWGc3LjhsRNIMWHHRsdUw8W3mMhIJ-Wm5htR58AQQO1jV5PbIwLFiaPzH_Itw50alOXNP0CGGA15SPpfiiS2y9mm_tAgOuJN2GDkld1H5lkI_Vgu1-0dr04zusPaVwNo_5qMiMyxlukv6i2Sq8SwsdhNJDGXBOi-dqpo9uxmcNOi1v5wPfHenr8oVEvV3j2eG1iYVjmpzfSgPZCFdRF2GpICc96Q3tkf_IhKGiLxVYoS4YcR8-jYFyJjqLoVobZPFrchMsLP_UQXZ2Y8X4829lCLdHUKutyUdi-Iy_0yPHwso7evY3HcuHlsRb-5y-bFRhOssBfiDzyPwAZFL3zs-WFof5uLfZGZbtLgFn_rpX5fVQHZE0ce0XQOaVMh3UyBYgECECDWXXgqgsCYSh3vz9arnc8Tpz4fPaBRE4QK-ROdTvKtCPEsBi9H9I2iZ9VNhLeg6pHzggxwpBTiMPnDWX0i6TUrba2ZVlaJYI4nu5sg4Z4avBvbuUwaplPiEJ1QpM4Q5tdmFaoGZA4l_aeNWesXKYkwXj_qSw
VITE_MAILERLITE_API_TOKEN=eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJhdWQiOiI0IiwianRpIjoiZjU4OGJmMDk4Y2QyZWM4ZDRhYTI5NzA1MmFhMTg3NTExOGQ2MTQzOTdmMjQ2NGU2YTc0Y2Q0OTVkZTU2YTJkZjk4ZWE0MWI4NjI2OTg1ZjQiLCJpYXQiOjE3NTY3MzA2NDcuODY5MDkzLCJuYmYiOjE3NTY3MzA2NDcuODY5MDk1LCJleHAiOjQ5MTI0MDQyNDcuODY1NTk1LCJzdWIiOiI4NjUyNDYiLCJzY29wZXMiOltdfQ.EhrR6IkV99fntVGgChpW1cuS2I2s6n5rw11KrK0X0gzXMh2e5zXyx90gDc99xI-jMt5jrRJK08EjAR0_DqgvvYU8ip3EvgZ9cH2IrEePUaB3SFhl4cf8KN8KmED71odr9e_VO6t5dfWGc3LjhsRNIMWHHRsdUw8W3mMhIJ-Wm5htR58AQQO1jV5PbIwLFiaPzH_Itw50alOXNP0CGGA15SPpfiiS2y9mm_tAgOuJN2GDkld1H5lkI_Vgu1-0dr04zusPaVwNo_5qMiMyxlukv6i2Sq8SwsdhNJDGXBOi-dqpo9uxmcNOi1v5wPfHenr8oVEvV3j2eG1iYVjmpzfSgPZCFdRF2GpICc96Q3tkf_IhKGiLxVYoS4YcR8-jYFyJjqLoVobZPFrchMsLP_UQXZ2Y8X4829lCLdHUKutyUdi-Iy_0yPHwso7evY3HcuHlsRb-5y-bFRhOssBfiDzyPwAZFL3zs-WFof5uLfZGZbtLgFn_rpX5fVQHZE0ce0XQOaVMh3UyBYgECECDWXXgqgsCYSh3vz9arnc8Tpz4fPaBRE4QK-ROdTvKtCPEsBi9H9I2iZ9VNhLeg6pHzggxwpBTiMPnDWX0i6TUrba2ZVlaJYI4nu5sg4Z4avBvbuUwaplPiEJ1QpM4Q5tdmFaoGZA4l_aeNWesXKYkwXj_qSw

## GitHub Configuration
## --------------------
# GitHub Personal Access Token for releases and advanced features
GITHUB_TOKEN=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

# =====================================
# STEPS TO CONFIGURE:
# =====================================

1. **Get Supabase Database Password:**
   - Go to https://supabase.com/dashboard
   - Select your project (INDIGO YIELD FUND)
   - Go to Settings -> Database
   - Copy the database password
   - Replace [YOUR_DB_PASSWORD] in the URLs above

2. **Setup Vercel:**
   - Install Vercel CLI: `npm i -g vercel`
   - Run `vercel link` in this directory
   - Select your Vercel account/team
   - Link to existing project or create new
   - This creates .vercel/project.json with orgId and projectId

3. **Create Sentry Project (Optional):**
   - Go to https://sentry.io
   - Create new React project
   - Get DSN from Project Settings -> Client Keys
   - Get org and project slugs from URL

4. **Setup PostHog (Optional):**
   - Sign up at https://posthog.com
   - Create project
   - Get API key from Project Settings

5. **Add to GitHub:**
   - Go to your GitHub repository
   - Settings -> Secrets and variables -> Actions
   - Click "New repository secret"
   - Add each secret from this file

# =====================================
# ENVIRONMENT VARIABLES FOR VERCEL:
# =====================================
# These should be added in Vercel Dashboard -> Project Settings -> Environment Variables

VITE_SUPABASE_URL=https://nkfimvovosdehmyyjubn.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5rZmltdm92b3NkZWhteXlqdWJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY0NTQ1OTgsImV4cCI6MjA2MjAzMDU5OH0.pZrIyCCd7dlvvNMGdW8-71BxSVfoKhxs9a5Ezbkmjgg
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5rZmltdm92b3NkZWhteXlqdWJuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NjQ1NDU5OCwiZXhwIjoyMDYyMDMwNTk4fQ.2dG7IemW8SVQ7FcEe7Dcv41B7utJy0LtEjZhSMESa1k
VITE_MAILERLITE_API_TOKEN=eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJhdWQiOiI0IiwianRpIjoiZjU4OGJmMDk4Y2QyZWM4ZDRhYTI5NzA1MmFhMTg3NTExOGQ2MTQzOTdmMjQ2NGU2YTc0Y2Q0OTVkZTU2YTJkZjk4ZWE0MWI4NjI2OTg1ZjQiLCJpYXQiOjE3NTY3MzA2NDcuODY5MDkzLCJuYmYiOjE3NTY3MzA2NDcuODY5MDk1LCJleHAiOjQ5MTI0MDQyNDcuODY1NTk1LCJzdWIiOiI4NjUyNDYiLCJzY29wZXMiOltdfQ.EhrR6IkV99fntVGgChpW1cuS2I2s6n5rw11KrK0X0gzXMh2e5zXyx90gDc99xI-jMt5jrRJK08EjAR0_DqgvvYU8ip3EvgZ9cH2IrEePUaB3SFhl4cf8KN8KmED71odr9e_VO6t5dfWGc3LjhsRNIMWHHRsdUw8W3mMhIJ-Wm5htR58AQQO1jV5PbIwLFiaPzH_Itw50alOXNP0CGGA15SPpfiiS2y9mm_tAgOuJN2GDkld1H5lkI_Vgu1-0dr04zusPaVwNo_5qMiMyxlukv6i2Sq8SwsdhNJDGXBOi-dqpo9uxmcNOi1v5wPfHenr8oVEvV3j2eG1iYVjmpzfSgPZCFdRF2GpICc96Q3tkf_IhKGiLxVYoS4YcR8-jYFyJjqLoVobZPFrchMsLP_UQXZ2Y8X4829lCLdHUKutyUdi-Iy_0yPHwso7evY3HcuHlsRb-5y-bFRhOssBfiDzyPwAZFL3zs-WFof5uLfZGZbtLgFn_rpX5fVQHZE0ce0XQOaVMh3UyBYgECECDWXXgqgsCYSh3vz9arnc8Tpz4fPaBRE4QK-ROdTvKtCPEsBi9H9I2iZ9VNhLeg6pHzggxwpBTiMPnDWX0i6TUrba2ZVlaJYI4nu5sg4Z4avBvbuUwaplPiEJ1QpM4Q5tdmFaoGZA4l_aeNWesXKYkwXj_qSw
VITE_SENTRY_DSN=[YOUR_SENTRY_DSN]
VITE_POSTHOG_API_KEY=[YOUR_POSTHOG_KEY]
