# Indigo Yield Platform

A secure, professional-grade investment management platform for cryptocurrency yield generation, built with React, TypeScript, and Supabase.

## 🚀 Features

### For Limited Partners (LPs)
- Real-time portfolio tracking with multi-asset support
- Secure authentication with 2FA
- Transaction history and performance analytics
- Monthly statement generation and access
- Withdrawal request management
- Document vault with secure storage

### For Administrators
- Comprehensive investor management dashboard
- Portfolio administration and balance adjustments
- Statement generation with PDF export
- Withdrawal approval workflow
- Yield settings and fee configuration
- Audit trail and compliance reporting

## 🛠 Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS + shadcn/ui components
- **Backend**: Supabase (PostgreSQL + Auth + Storage + Edge Functions)
- **Authentication**: Supabase Auth with RLS
- **State Management**: React Context + Hooks
- **Deployment**: Vercel
- **Font**: Space Grotesk

## 📋 Prerequisites

- Node.js 18+ and npm 9+
- Supabase CLI (optional for local development)
- Git

## 🔧 Installation & Setup

### 1. Clone the Repository
```bash
git clone https://github.com/hamstamgram/indigo-yield-platform-v01
cd indigo-yield-platform-v01
```

### 2. Install Dependencies
```bash
npm ci  # Use ci for reproducible builds
```

### 3. Environment Variables

Create a `.env.local` file with the following required variables:

```bash
# Supabase Configuration (Required)
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Portfolio Dashboard Supabase (Optional)
VITE_PORTFOLIO_SUPABASE_URL=your_portfolio_supabase_url
VITE_PORTFOLIO_SUPABASE_ANON_KEY=your_portfolio_anon_key

# Analytics (Optional)
VITE_POSTHOG_KEY=your_posthog_key
VITE_SENTRY_DSN=your_sentry_dsn

# Preview Mode (Optional)
VITE_PREVIEW_ADMIN=false  # Set to true for admin preview mode
```

**⚠️ IMPORTANT**: Never commit `.env.local` or any file containing service role keys!

### 4. Database Setup

#### Apply Migrations

All database changes are managed through migrations in `supabase/migrations/`:

```bash
# Using Supabase CLI (recommended)
supabase db push

# Or apply manually via Supabase Dashboard SQL Editor
```

#### Key Migrations
- `20250109_admin_investor_functions.sql` - RPC functions for investor management
- `20250109_comprehensive_rls_policies.sql` - Row Level Security policies
- `20250109_statements_storage_bucket.sql` - Storage bucket for PDF statements
- `20250109_add_thomas_puech_test_investor.sql` - Test data (dev only)

### 5. Run Development Server
```bash
npm run dev
# App will be available at http://localhost:8082
```

## 🧪 Testing

### Run Unit Tests
```bash
npm test
```

### Run RLS/RPC Database Tests
```sql
-- Execute in Supabase SQL Editor
-- File: tests/rls-rpc-tests.sql
```

### Test Coverage
```bash
npm run test:coverage
```

## 🚢 Deployment

### Vercel Deployment (Production)

1. **Install Vercel CLI**
```bash
npm i -g vercel
```

2. **Deploy to Production**
```bash
vercel --prod
```

3. **Configure Environment Variables in Vercel Dashboard**
- Go to Project Settings → Environment Variables
- Add all required `VITE_*` variables
- Redeploy after adding variables

### Deployment Workflow

```bash
# 1. Create feature branch
git checkout -b feature/your-feature

# 2. Make changes and test locally
npm run dev
npm test

# 3. Commit and push
git add .
git commit -m "feat: your feature description"
git push origin feature/your-feature

# 4. Create PR to main branch
# 5. After review and merge, auto-deploy to Vercel
```

## 🔒 Security

### Key Security Features
- **Row Level Security (RLS)**: All tables protected with policies
- **Admin-only Operations**: Deposits, withdrawals, interest entries
- **Signed URLs**: All document access via time-limited signed URLs
- **No Service Keys in Frontend**: Only anon key used in client
- **Audit Logging**: All sensitive operations logged

### RLS Policy Summary
- **Profiles**: LPs see own, admins see all
- **Transactions**: Admin-only writes, LPs read own
- **Portfolios**: Owner-based access, admin-only writes
- **Statements**: Admin-only creation, signed URL access

## 📁 Project Structure

```
indigo-yield-platform-v01/
├── src/
│   ├── components/     # React components
│   ├── pages/          # Page components
│   ├── services/       # API services
│   ├── hooks/          # Custom React hooks
│   ├── context/        # React context providers
│   ├── utils/          # Utility functions
│   └── integrations/   # Third-party integrations
├── supabase/
│   └── migrations/     # Database migrations
├── tests/              # Test files
├── docs/               # Documentation
└── public/             # Static assets
```

## 🔑 Admin Functions

### Available RPC Functions
- `is_admin_for_jwt()` - Check if current user is admin
- `get_all_non_admin_profiles()` - List all investors (admin only)
- `get_profile_by_id(uuid)` - Get specific profile
- `get_investor_portfolio_summary(uuid)` - Get portfolio totals
- `get_all_investors_with_summary()` - List investors with AUM

## 📊 Current Status

- **Live URL**: https://indigo-yield-platform-v01.vercel.app
- **Design Score**: 92/100
- **Pages Audited**: 73 (all functional)
- **RLS Coverage**: 100% on critical tables
- **Test Investors**: Thomas Puech, Marie Dubois, Jean Martin

## 🐛 Troubleshooting

### Common Issues

1. **"Missing environment variables" error**
   - Ensure all `VITE_SUPABASE_*` variables are set in `.env.local`

2. **"RLS policy violation" errors**
   - Check user authentication status
   - Verify admin status in profiles table

3. **Migrations not applying**
   - Check Supabase connection
   - Verify migration syntax
   - Check for conflicting policies

## 📚 Documentation

- [Admin Investors Guide](docs/admin_investors.md)
- [Page Audit Report](docs/pages_audit.md)
- [Design Audit](VERCEL_DESIGN_AUDIT.md)
- [Progress Report](PROGRESS_REPORT_8_OF_16.md)

## 🤝 Contributing

1. Follow the Git workflow described above
2. Ensure all tests pass
3. Update documentation as needed
4. Follow existing code style and patterns
5. Add tests for new features

## 📄 License

This project is proprietary and confidential. All rights reserved.

## 🆘 Support

For technical issues, please contact the development team or create an issue in the repository.

---

**Last Updated**: January 9, 2025
**Version**: 1.0.0
**Status**: Production Ready
