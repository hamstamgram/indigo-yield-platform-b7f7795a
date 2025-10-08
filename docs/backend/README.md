# Backend Documentation

> Supabase backend configuration, database schema, and Edge Functions

[← Back to Main Documentation](../../README.md)

## 📚 Available Documentation

### Database & Schema
- [Database Optimization Guide](./DATABASE_OPTIMIZATION_GUIDE.md) - Performance tuning, indexing strategies
- [Backend Build Summary](./BACKEND_BUILD_SUMMARY.md) - Database schema, RLS policies, Edge Functions

### Supabase Configuration
- **Authentication**: Email/password, OAuth providers, 2FA
- **Row Level Security (RLS)**: Multi-tenant isolation policies
- **Storage**: Document uploads with signed URLs
- **Realtime**: Live portfolio updates via WebSockets
- **Edge Functions**: Server-side processing

## 🗄️ Database Schema

### Core Tables
- `profiles` - User profiles with role-based access
- `portfolios` - Portfolio holdings and valuations
- `transactions` - Transaction history with audit trail
- `statements` - Financial statements and documents
- `withdrawal_requests` - Withdrawal management workflow
- `audit_logs` - Complete system audit trail

### Security Policies
All tables implement RLS policies for:
- Multi-tenant data isolation
- Role-based access control (LP vs Admin)
- Admin override capabilities
- Audit logging

## 🔧 Edge Functions

Located in `supabase/functions/`:
- `calculate-portfolio-value` - Real-time portfolio calculations
- `process-withdrawal` - Withdrawal request processing
- `generate-statement` - PDF statement generation
- `send-notifications` - Email/SMS notifications

## 🚀 Deployment

See [Deployment Documentation](../deployment/) for:
- Supabase project setup
- Database migrations
- Edge Function deployment
- Environment configuration

## 🔐 Environment Variables

Required for backend operations:
```bash
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-key

# Email (for notifications)
SMTP_HOST=smtp.sendgrid.net
SMTP_USER=apikey
SMTP_PASSWORD=your-sendgrid-key

# Optional
SENTRY_DSN=your-sentry-dsn
```

## 📖 Related Documentation

- [Web Integration](../../web/README.md)
- [iOS Integration](../../ios/README.md)
- [Deployment Guide](../deployment/DEPLOYMENT_GUIDE.md)
