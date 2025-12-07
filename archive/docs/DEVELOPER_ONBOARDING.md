# Developer Onboarding Guide

**Welcome to the Indigo Yield Platform Development Team!**

**Version:** 1.0.0
**Last Updated:** November 22, 2025
**Est. Setup Time:** 2-3 hours

---

## Table of Contents

1. [Welcome](#welcome)
2. [Quick Start (30 minutes)](#quick-start-30-minutes)
3. [Development Environment Setup](#development-environment-setup)
4. [Project Structure](#project-structure)
5. [Development Workflow](#development-workflow)
6. [Code Quality & Standards](#code-quality--standards)
7. [Testing Guidelines](#testing-guidelines)
8. [Git Workflow](#git-workflow)
9. [Common Tasks](#common-tasks)
10. [Troubleshooting](#troubleshooting)
11. [Resources & Support](#resources--support)

---

## Welcome

You're joining a team building a cutting-edge investment platform with:
- **Modern Stack**: Next.js 14, TypeScript, Tailwind CSS, Supabase
- **Best Practices**: Type safety, automated testing, CI/CD
- **Financial Focus**: Precision, security, and compliance

### Team Structure

| Role | Responsibility |
|------|---------------|
| **Tech Lead** | Architecture decisions, code reviews |
| **Frontend Developers** | UI/UX implementation, client-side logic |
| **Backend Developers** | API development, database design |
| **DevOps Engineer** | CI/CD, deployment, infrastructure |
| **QA Engineers** | Testing strategy, automation |

### Communication Channels

- **Slack**: `#engineering` - General discussion
- **Slack**: `#deployments` - Deployment notifications
- **GitHub**: Issue tracking, code reviews
- **Notion**: Documentation, meeting notes
- **Weekly Standups**: Mondays 10 AM

---

## Quick Start (30 minutes)

### 1. Clone Repository

```bash
# SSH (recommended)
git clone git@github.com:your-org/indigo-yield-platform-v01.git

# HTTPS
git clone https://github.com/your-org/indigo-yield-platform-v01.git

cd indigo-yield-platform-v01
```

### 2. Install Dependencies

```bash
# Install Node.js dependencies
npm install

# Verify installation
npm run type-check
```

### 3. Setup Environment Variables

```bash
# Copy example environment file
cp .env.example .env.local

# Edit with your credentials
nano .env.local
```

**Required Variables:**
```bash
# Supabase (get from team lead or Supabase dashboard)
NEXT_PUBLIC_SUPABASE_URL=YOUR_SUPABASE_PROJECT_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY

# ⚠️ SECURITY: Never commit real credentials. Get actual values from your team lead or secure credential store.

# App Configuration
NEXT_PUBLIC_APP_ENV=development

# Optional: Analytics (leave blank for development)
NEXT_PUBLIC_POSTHOG_KEY=
SENTRY_DSN=
```

### 4. Start Development Server

```bash
# Start Next.js dev server
npm run dev

# Open in browser
open http://localhost:3000
```

**Expected Output:**
```
▲ Next.js 14.1.0
- Local:        http://localhost:3000
- Environments: .env.local

✓ Ready in 2.3s
```

### 5. Verify Setup

**Test these URLs:**
- ✓ Homepage: http://localhost:3000
- ✓ Login: http://localhost:3000/en/login
- ✓ Dashboard: http://localhost:3000/en/dashboard (requires login)

**Run Tests:**
```bash
# Unit tests
npm run test

# Type check
npm run type-check

# Lint
npm run lint
```

**Success:** All tests pass, no type errors, no lint errors ✓

---

## Development Environment Setup

### Required Software

#### 1. Node.js & npm

```bash
# Install via nvm (recommended)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Install Node.js 20.x
nvm install 20
nvm use 20

# Verify
node --version  # v20.x.x
npm --version   # v10.x.x
```

#### 2. Git

```bash
# macOS
brew install git

# Ubuntu/Debian
sudo apt install git

# Verify
git --version  # v2.x.x
```

#### 3. Visual Studio Code (recommended)

Download from https://code.visualstudio.com/

**Required Extensions:**
- ESLint (`dbaeumer.vscode-eslint`)
- Prettier (`esbenp.prettier-vscode`)
- TypeScript Error Translator (`mattpocock.ts-error-translator`)
- Tailwind CSS IntelliSense (`bradlc.vscode-tailwindcss`)
- GitLens (`eamodio.gitlens`)
- Error Lens (`usernamehw.errorlens`)

**Install Extensions:**
```bash
code --install-extension dbaeumer.vscode-eslint
code --install-extension esbenp.prettier-vscode
code --install-extension mattpocock.ts-error-translator
code --install-extension bradlc.vscode-tailwindcss
code --install-extension eamodio.gitlens
code --install-extension usernamehw.errorlens
```

**VS Code Settings:** `.vscode/settings.json`
```json
{
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "typescript.tsdk": "node_modules/typescript/lib",
  "tailwindCSS.experimental.classRegex": [
    ["cva\\(([^)]*)\\)", "[\"'`]([^\"'`]*).*?[\"'`]"]
  ]
}
```

#### 4. Supabase CLI

```bash
# Install
npm install -g supabase

# Login
supabase login

# Link to project
supabase link --project-ref mdngruhkxlrsgwwlfqru
```

#### 5. Database GUI (optional but recommended)

**Option A: Supabase Studio** (browser-based)
- URL: https://app.supabase.com/project/mdngruhkxlrsgwwlfqru

**Option B: TablePlus** (desktop app)
- Download: https://tableplus.com
- Connection: PostgreSQL
- Host: `db.mdngruhkxlrsgwwlfqru.supabase.co`
- Port: `5432`
- User: `postgres`
- Password: (get from team lead)

---

## Project Structure

```
indigo-yield-platform-v01/
├── .github/                    # GitHub Actions workflows
│   └── workflows/
│       ├── web-ci-cd.yml      # Web deployment
│       └── supabase-deploy.yml # Backend deployment
├── .storybook/                # Storybook configuration
├── docs/                      # Documentation
│   ├── API_DOCUMENTATION.md
│   ├── DESIGN_SYSTEM.md
│   ├── I18N_GUIDE.md
│   └── DEPLOYMENT_GUIDE.md
├── public/                    # Static assets
│   ├── fonts/
│   ├── images/
│   └── favicon.ico
├── src/                       # Source code
│   ├── app/                   # Next.js App Router
│   │   ├── [locale]/         # Internationalized routes
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx
│   │   │   ├── login/
│   │   │   ├── dashboard/
│   │   │   └── portfolio/
│   │   └── api/              # API routes (if any)
│   ├── components/           # React components
│   │   ├── ui/              # shadcn/ui components
│   │   ├── features/        # Feature-specific components
│   │   └── layout/          # Layout components
│   ├── lib/                 # Utility functions
│   │   ├── supabase.ts     # Supabase client
│   │   ├── utils.ts        # General utilities
│   │   └── validations.ts  # Zod schemas
│   ├── hooks/              # Custom React hooks
│   ├── types/              # TypeScript types
│   ├── i18n/               # Internationalization
│   │   ├── config.ts
│   │   └── navigation.ts
│   ├── messages/           # Translation files
│   │   ├── en.json
│   │   ├── es.json
│   │   └── ...
│   └── styles/            # Global styles
├── supabase/              # Supabase backend
│   ├── functions/        # Edge Functions
│   │   ├── generate-report/
│   │   ├── process-deposit/
│   │   └── ...
│   └── migrations/       # Database migrations
├── tests/                # Tests
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── .env.example          # Example environment variables
├── .eslintrc.json       # ESLint configuration
├── .prettierrc          # Prettier configuration
├── jest.config.js       # Jest configuration
├── next.config.js       # Next.js configuration
├── package.json         # Dependencies
├── tailwind.config.ts   # Tailwind CSS configuration
└── tsconfig.json        # TypeScript configuration
```

### Key Directories

**`src/app/[locale]/`**
- Next.js 14 App Router with internationalization
- Each subfolder represents a route
- `layout.tsx` defines shared layout
- `page.tsx` is the route component

**`src/components/ui/`**
- 58 reusable UI components
- Built on shadcn/ui (Radix UI primitives)
- Fully typed with TypeScript
- Documented in Storybook

**`src/components/features/`**
- Feature-specific components
- Example: `PortfolioOverview`, `TransactionHistory`
- Business logic lives here

**`supabase/functions/`**
- Serverless Deno functions
- REST API endpoints
- File structure: `function-name/index.ts`

---

## Development Workflow

### Daily Workflow

**1. Start Your Day**
```bash
# Pull latest changes
git checkout main
git pull origin main

# Create feature branch
git checkout -b feature/your-feature-name

# Start dev server
npm run dev
```

**2. Make Changes**
- Write code following [Code Quality Standards](#code-quality--standards)
- Write tests for new features
- Update documentation if needed

**3. Test Locally**
```bash
# Run all checks
npm run lint
npm run type-check
npm run test

# Or use the comprehensive check
npm run validate
```

**4. Commit Changes**
```bash
# Stage changes
git add .

# Commit with conventional commit message
git commit -m "feat: add portfolio performance chart"

# Push to remote
git push origin feature/your-feature-name
```

**5. Create Pull Request**
- Go to GitHub repository
- Click "New Pull Request"
- Fill in PR template
- Request reviews from team members
- Address feedback
- Merge when approved

---

### Hot Reload & Fast Refresh

Next.js provides **Fast Refresh** for instant feedback:

**What triggers Fast Refresh:**
- ✓ Component file changes (`.tsx`, `.ts`)
- ✓ CSS changes (`.css`)
- ✓ Environment variable changes (requires restart)

**What requires full restart:**
- ✗ `next.config.js` changes
- ✗ `tailwind.config.ts` changes
- ✗ `.env.local` changes

**Restart server:**
```bash
# Stop: Ctrl+C
# Restart: npm run dev
```

---

### Working with Supabase

**Start Local Supabase (optional):**
```bash
# Start local Supabase instance (Docker required)
supabase start

# View local Studio
open http://localhost:54323

# Stop local instance
supabase stop
```

**Connect to Development Database:**
```bash
# Use local Supabase
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321

# Or connect to shared development database
NEXT_PUBLIC_SUPABASE_URL=https://dev-ref.supabase.co
```

**Run Migrations:**
```bash
# Apply pending migrations
supabase db push

# Create new migration
supabase migration new add_new_table
```

**View Database:**
```bash
# Open Supabase Studio
open https://app.supabase.com/project/mdngruhkxlrsgwwlfqru/editor
```

---

## Code Quality & Standards

### TypeScript Guidelines

**✓ Do's:**
```typescript
// Use explicit types for function parameters
function calculateROI(invested: number, returned: number): number {
  return ((returned - invested) / invested) * 100;
}

// Use interfaces for objects
interface Portfolio {
  id: string;
  name: string;
  totalValue: number;
  assets: Asset[];
}

// Use enums for fixed sets of values
enum TransactionType {
  DEPOSIT = 'deposit',
  WITHDRAWAL = 'withdrawal',
  DIVIDEND = 'dividend',
}

// Use type guards
function isPortfolio(obj: unknown): obj is Portfolio {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'id' in obj &&
    'totalValue' in obj
  );
}
```

**✗ Don'ts:**
```typescript
// Don't use 'any'
function process(data: any) { } // ✗ BAD

// Don't use implicit types
function calculate(a, b) { }    // ✗ BAD

// Don't ignore errors
// @ts-ignore                    // ✗ BAD
const value = obj.property;
```

---

### Component Guidelines

**✓ Functional Components with TypeScript:**
```typescript
import { FC } from 'react';

interface ButtonProps {
  variant?: 'primary' | 'secondary';
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}

export const Button: FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  onClick,
  disabled = false,
  children,
}) => {
  return (
    <button
      className={cn(
        'rounded font-semibold transition-colors',
        variants[variant],
        sizes[size],
        disabled && 'opacity-50 cursor-not-allowed'
      )}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
};
```

**✓ Custom Hooks:**
```typescript
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export function usePortfolio(investorId: string) {
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function fetchPortfolio() {
      try {
        const { data, error } = await supabase
          .from('portfolios')
          .select('*')
          .eq('investor_id', investorId)
          .single();

        if (error) throw error;
        setPortfolio(data);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    }

    fetchPortfolio();
  }, [investorId]);

  return { portfolio, loading, error };
}
```

---

### File Naming Conventions

| Type | Convention | Example |
|------|-----------|---------|
| Components | PascalCase | `PortfolioCard.tsx` |
| Hooks | camelCase with `use` prefix | `usePortfolio.ts` |
| Utilities | camelCase | `formatCurrency.ts` |
| Types | PascalCase | `Portfolio.ts` |
| Constants | UPPER_SNAKE_CASE | `API_ENDPOINTS.ts` |

---

### CSS & Styling

**Use Tailwind CSS Utility Classes:**
```tsx
<div className="flex items-center justify-between p-4 bg-card rounded-lg shadow-sm">
  <h2 className="text-xl font-semibold text-foreground">Portfolio Value</h2>
  <span className="text-2xl font-bold text-primary">$10,000</span>
</div>
```

**Use CSS Variables for Theme Tokens:**
```tsx
// Use semantic tokens
className="bg-background text-foreground"

// Not raw colors
className="bg-white text-black" // ✗ BAD
```

**Extract Complex Styles with cva:**
```typescript
import { cva } from 'class-variance-authority';

const buttonVariants = cva(
  'rounded font-semibold transition-colors',
  {
    variants: {
      variant: {
        primary: 'bg-primary text-primary-foreground hover:bg-primary/90',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
      },
      size: {
        sm: 'px-3 py-1.5 text-sm',
        md: 'px-4 py-2 text-base',
        lg: 'px-6 py-3 text-lg',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  }
);
```

---

## Testing Guidelines

### Test Structure

```
tests/
├── unit/                  # Unit tests
│   ├── components/
│   │   └── Button.test.tsx
│   ├── hooks/
│   │   └── usePortfolio.test.ts
│   └── lib/
│       └── formatCurrency.test.ts
├── integration/          # Integration tests
│   └── portfolio-api.test.ts
└── e2e/                  # End-to-end tests (Playwright)
    └── user-flows.spec.ts
```

### Writing Tests

**Unit Test Example:**
```typescript
// tests/unit/lib/formatCurrency.test.ts
import { formatCurrency } from '@/lib/formatCurrency';

describe('formatCurrency', () => {
  it('formats USD correctly', () => {
    expect(formatCurrency(10000, 'USD')).toBe('$10,000.00');
  });

  it('handles zero', () => {
    expect(formatCurrency(0, 'USD')).toBe('$0.00');
  });

  it('handles negative values', () => {
    expect(formatCurrency(-500, 'USD')).toBe('-$500.00');
  });
});
```

**Component Test Example:**
```typescript
// tests/unit/components/Button.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from '@/components/ui/button';

describe('Button', () => {
  it('renders children', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('calls onClick handler', () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Click me</Button>);

    fireEvent.click(screen.getByText('Click me'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('disables button when disabled prop is true', () => {
    render(<Button disabled>Click me</Button>);
    expect(screen.getByText('Click me')).toBeDisabled();
  });
});
```

**E2E Test Example:**
```typescript
// tests/e2e/login.spec.ts
import { test, expect } from '@playwright/test';

test.describe('User Login', () => {
  test('successful login redirects to dashboard', async ({ page }) => {
    await page.goto('/en/login');

    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL(/\/en\/dashboard/);
    await expect(page.locator('h1')).toContainText('Dashboard');
  });

  test('invalid credentials show error', async ({ page }) => {
    await page.goto('/en/login');

    await page.fill('input[name="email"]', 'wrong@example.com');
    await page.fill('input[name="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');

    await expect(page.locator('[role="alert"]')).toContainText('Invalid credentials');
  });
});
```

### Running Tests

```bash
# All tests
npm run test

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage

# E2E tests
npm run test:e2e

# Specific test file
npm run test -- formatCurrency.test.ts
```

### Test Coverage Goals

- **Overall**: 80% minimum
- **Critical paths**: 100% (authentication, financial transactions)
- **UI components**: 70% minimum
- **Utilities**: 90% minimum

---

## Git Workflow

### Branch Naming

```bash
# Features
feature/add-portfolio-chart
feature/user-authentication

# Bug fixes
fix/broken-transaction-display
fix/login-redirect-issue

# Hotfixes (production)
hotfix/critical-security-patch

# Chores (non-functional)
chore/update-dependencies
chore/improve-documentation
```

### Commit Messages

**Convention:** Conventional Commits

```bash
# Format
<type>(<scope>): <subject>

# Types
feat:     New feature
fix:      Bug fix
docs:     Documentation only
style:    Code style (formatting, no logic change)
refactor: Code restructuring (no feature/fix)
perf:     Performance improvement
test:     Adding/updating tests
chore:    Maintenance tasks

# Examples
feat(portfolio): add performance chart component
fix(auth): resolve login redirect issue
docs(api): update API documentation
refactor(utils): simplify currency formatting logic
test(portfolio): add unit tests for PortfolioCard
```

### Pull Request Process

**1. Create PR**
- Use PR template (auto-populated)
- Fill in description
- Link related issues
- Add screenshots for UI changes

**2. Request Reviews**
- Assign at least 2 reviewers
- Tag relevant team members

**3. Address Feedback**
- Respond to all comments
- Make requested changes
- Re-request review

**4. Merge**
- Squash and merge (preferred)
- Delete branch after merge

**PR Checklist:**
- [ ] Tests passing
- [ ] No type errors
- [ ] No lint errors
- [ ] Documentation updated
- [ ] No console.log() statements
- [ ] Screenshots added (for UI changes)

---

## Common Tasks

### Adding a New Page

```bash
# 1. Create page file
touch src/app/[locale]/new-page/page.tsx

# 2. Implement page component
cat > src/app/[locale]/new-page/page.tsx << 'EOF'
import { useTranslations } from 'next-intl';

export default function NewPage() {
  const t = useTranslations('new_page');

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold">{t('title')}</h1>
      <p>{t('description')}</p>
    </div>
  );
}
EOF

# 3. Add translations
# Edit messages/en.json, add:
{
  "new_page": {
    "title": "New Page",
    "description": "Page description"
  }
}

# 4. Update navigation (if needed)
# Edit src/components/layout/Navigation.tsx
```

### Adding a New Component

```bash
# 1. Create component file
touch src/components/features/MyComponent.tsx

# 2. Implement component
cat > src/components/features/MyComponent.tsx << 'EOF'
import { FC } from 'react';

interface MyComponentProps {
  title: string;
  description?: string;
}

export const MyComponent: FC<MyComponentProps> = ({ title, description }) => {
  return (
    <div className="p-4 bg-card rounded-lg">
      <h2 className="text-xl font-semibold">{title}</h2>
      {description && <p className="text-muted-foreground mt-2">{description}</p>}
    </div>
  );
};
EOF

# 3. Create test file
touch tests/unit/components/MyComponent.test.tsx

# 4. Create Storybook story
touch src/components/features/MyComponent.stories.tsx
```

### Running Database Migrations

```bash
# Create new migration
supabase migration new add_new_column

# Edit migration file
nano supabase/migrations/20251122_add_new_column.sql

# Apply migration locally
supabase db push

# Verify migration
supabase db reset
```

### Updating Dependencies

```bash
# Check outdated packages
npm outdated

# Update all packages (careful!)
npm update

# Update specific package
npm install package-name@latest

# Update major version
npm install package-name@next
```

---

## Troubleshooting

### Common Issues

#### "Module not found" Error

```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

#### TypeScript Errors After Update

```bash
# Rebuild TypeScript cache
rm -rf .next
npm run type-check
```

#### Supabase Connection Issues

```bash
# Verify environment variables
echo $NEXT_PUBLIC_SUPABASE_URL
echo $NEXT_PUBLIC_SUPABASE_ANON_KEY

# Test connection
curl https://mdngruhkxlrsgwwlfqru.supabase.co/rest/v1/
```

#### Port Already in Use

```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9

# Or use different port
PORT=3001 npm run dev
```

---

## Resources & Support

### Documentation

- **Internal Docs**: `/docs` directory
- **API Reference**: [API_DOCUMENTATION.md](./API_DOCUMENTATION.md)
- **Design System**: [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md)
- **Deployment**: [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)

### External Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Supabase Documentation](https://supabase.com/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [shadcn/ui Components](https://ui.shadcn.com)

### Getting Help

**Slack Channels:**
- `#engineering` - General engineering discussion
- `#frontend` - Frontend-specific questions
- `#backend` - Backend-specific questions
- `#help` - General help requests

**GitHub:**
- Use GitHub Issues for bugs
- Use GitHub Discussions for questions
- Tag appropriate team members

**Pair Programming:**
- Schedule with team lead
- Screen sharing via Slack/Zoom

---

## Your First Week

### Day 1: Setup
- [ ] Clone repository
- [ ] Install dependencies
- [ ] Setup development environment
- [ ] Run application locally
- [ ] Meet team members

### Day 2: Codebase Exploration
- [ ] Read architecture documentation
- [ ] Explore project structure
- [ ] Review component library
- [ ] Understand data flow

### Day 3: Small PR
- [ ] Pick "good first issue" from GitHub
- [ ] Create feature branch
- [ ] Implement fix
- [ ] Create pull request
- [ ] Address review feedback

### Day 4: Testing
- [ ] Write unit tests for your changes
- [ ] Run test suite
- [ ] Learn E2E testing workflow

### Day 5: Code Review
- [ ] Review peer's pull request
- [ ] Provide constructive feedback
- [ ] Merge your first PR

---

**Welcome aboard! We're excited to have you on the team.**

For questions or feedback on this guide, contact the Tech Lead or open a GitHub Discussion.

---

**Last Updated:** November 22, 2025
**Maintained By:** Engineering Team
**Version:** 1.0.0
