# Indigo Yield Platform - Project Overview

## Purpose
Multi-platform investment management system for financial/investment portfolio tracking and reporting. Features:
- Monthly reporting with PDF/HTML generation
- Asset management (BTC, ETH, SOL, USDC, USDT, EURC)
- Role-based access (Admin Portal + Investor Dashboard)
- KYC/AML compliance workflows
- Real-time notifications and email tracking

## Tech Stack
- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS + Radix UI components
- **State Management**: Zustand + TanStack React Query
- **Backend**: Supabase (PostgreSQL + Edge Functions)
- **Forms**: React Hook Form + Zod validation
- **Charts**: Recharts + Chart.js
- **Testing**: Jest (unit), Playwright (E2E), Vitest
- **Deployment**: Vercel
- **Analytics**: PostHog

## Project Structure
```
src/
├── components/     # React components
├── hooks/          # Custom React hooks
├── lib/            # Core libraries (auth, etc.)
├── pages/          # Page components
├── services/       # API/business logic services
├── utils/          # Utility functions
├── types/          # TypeScript type definitions
├── schemas/        # Zod validation schemas
├── routing/        # React Router configuration
├── design-system/  # Design system components
└── integrations/   # Third-party integrations

supabase/           # Database migrations and Edge Functions
tests/              # Test files (unit, integration, e2e)
docs/               # Project documentation
```

## Key Dependencies
- `@supabase/supabase-js` - Database client
- `@tanstack/react-query` - Server state management
- `zustand` - Client state management
- `zod` - Schema validation
- `lucide-react` - Icons
- `framer-motion` - Animations
- `recharts` - Charts
