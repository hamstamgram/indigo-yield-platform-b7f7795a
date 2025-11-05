# Developer Quick Start Guide

**Get started building pages for the Indigo Yield Platform in 5 minutes**

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Setup](#environment-setup)
3. [Project Structure](#project-structure)
4. [Creating Your First Page](#creating-your-first-page)
5. [Common Patterns](#common-patterns)
6. [Code Snippets](#code-snippets)
7. [Troubleshooting](#troubleshooting)

---

## Prerequisites

```bash
Node.js: >= 18.x
npm: >= 9.x
Git: >= 2.x
```

**Required Knowledge:**
- React 18+ (Hooks, Suspense, Error Boundaries)
- TypeScript (Interfaces, Generics, Type Guards)
- Tailwind CSS (Utility classes)
- React Router v6 (Nested routes, Loaders)

---

## Environment Setup

### 1. Install Dependencies

```bash
cd indigo-yield-platform-v01
npm install
```

### 2. Setup Environment Variables

```bash
# Copy example env file
cp .env.example .env.local

# Edit .env.local with your credentials
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

### 3. Start Development Server

```bash
npm run dev
```

Visit: `http://localhost:5173`

### 4. Run Supabase Locally (Optional)

```bash
npx supabase start
```

---

## Project Structure

```
src/
├── pages/                    # All page components (125 files)
│   ├── auth/                # Authentication pages
│   ├── dashboard/           # Dashboard pages
│   ├── transactions/        # Transaction pages
│   └── ...                  # Other modules
├── components/              # Reusable components
│   ├── ui/                  # Shadcn/ui components
│   ├── layouts/             # Layout components
│   ├── forms/               # Form components
│   └── common/              # Common components
├── hooks/                   # Custom React hooks
│   ├── useAuth.ts          # Auth hook
│   ├── usePortfolio.ts     # Portfolio hook
│   └── ...
├── lib/                     # Utility functions
│   ├── utils.ts            # General utilities
│   ├── supabase.ts         # Supabase client
│   └── validations/        # Zod schemas
├── services/                # API services
│   ├── auth.service.ts     # Auth API calls
│   ├── transaction.service.ts
│   └── ...
├── stores/                  # Zustand stores
│   ├── authStore.ts        # Auth state
│   ├── portfolioStore.ts   # Portfolio state
│   └── ...
├── types/                   # TypeScript types
│   ├── auth.types.ts
│   ├── transaction.types.ts
│   └── ...
└── routes/                  # Route configurations
    └── index.tsx           # Main router
```

---

## Creating Your First Page

### Step 1: Create the Page Component

```bash
# Create file: src/pages/dashboard/ExamplePage.tsx
```

```typescript
import { useQuery } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/layouts/DashboardLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export function ExamplePage() {
  // 1. Fetch data
  const { data, isLoading, error } = useQuery({
    queryKey: ['example-data'],
    queryFn: async () => {
      // Your API call here
      return { message: 'Hello World' };
    },
  });

  // 2. Handle loading
  if (isLoading) {
    return <div>Loading...</div>;
  }

  // 3. Handle error
  if (error) {
    return <div>Error: {error.message}</div>;
  }

  // 4. Render page
  return (
    <DashboardLayout>
      <PageHeader
        title="Example Page"
        description="This is an example page"
        actions={
          <Button>Action Button</Button>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Card Title</CardTitle>
        </CardHeader>
        <CardContent>
          <p>{data?.message}</p>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
```

### Step 2: Add Route

```typescript
// src/routes/index.tsx

import { lazy } from 'react';

const ExamplePage = lazy(() => import('@/pages/dashboard/ExamplePage'));

// Add to router configuration
{
  path: '/dashboard/example',
  element: <ExamplePage />,
}
```

### Step 3: Add Navigation Link (Optional)

```typescript
// src/components/layouts/DashboardSidebar.tsx

const navItems = [
  // ... existing items
  {
    title: 'Example',
    href: '/dashboard/example',
    icon: FileText,
  },
];
```

### Step 4: Test Your Page

Visit: `http://localhost:5173/dashboard/example`

---

## Common Patterns

### Pattern 1: Data Fetching with React Query

```typescript
// hooks/useTransactions.ts
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export function useTransactions(userId: string) {
  return useQuery({
    queryKey: ['transactions', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    staleTime: 30000, // 30 seconds
  });
}

// Usage in component
function TransactionsPage() {
  const { user } = useAuthStore();
  const { data: transactions, isLoading } = useTransactions(user.id);

  // ...
}
```

### Pattern 2: Form Handling

```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const schema = z.object({
  amount: z.number().min(100).max(1000000),
  method: z.enum(['bank', 'card']),
});

type FormData = z.infer<typeof schema>;

function DepositForm() {
  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      amount: 0,
      method: 'bank',
    },
  });

  const onSubmit = async (data: FormData) => {
    try {
      // Submit data
      console.log(data);
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        {/* Form fields */}
      </form>
    </Form>
  );
}
```

### Pattern 3: Protected Routes

```typescript
// components/auth/ProtectedRoute.tsx
import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';

export function ProtectedRoute() {
  const { isAuthenticated, isLoading } = useAuthStore();

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
```

### Pattern 4: Modal/Dialog Management

```typescript
// Using Zustand for modal state
import { create } from 'zustand';

interface ModalStore {
  modals: Record<string, boolean>;
  openModal: (id: string) => void;
  closeModal: (id: string) => void;
}

export const useModal = create<ModalStore>((set) => ({
  modals: {},
  openModal: (id) =>
    set((state) => ({
      modals: { ...state.modals, [id]: true },
    })),
  closeModal: (id) =>
    set((state) => ({
      modals: { ...state.modals, [id]: false },
    })),
}));

// Usage
function SomePage() {
  const { openModal, closeModal, modals } = useModal();

  return (
    <>
      <Button onClick={() => openModal('deposit')}>New Deposit</Button>

      <Dialog open={modals.deposit} onOpenChange={() => closeModal('deposit')}>
        <DialogContent>
          <DepositForm />
        </DialogContent>
      </Dialog>
    </>
  );
}
```

### Pattern 5: Error Handling

```typescript
// components/common/ErrorBoundary.tsx
import { Component, ReactNode } from 'react';

export class ErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean; error?: Error }
> {
  state = { hasError: false, error: undefined };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-page">
          <h1>Something went wrong</h1>
          <p>{this.state.error?.message}</p>
          <Button onClick={() => window.location.reload()}>
            Reload Page
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}

// Wrap your app
function App() {
  return (
    <ErrorBoundary>
      <RouterProvider router={router} />
    </ErrorBoundary>
  );
}
```

---

## Code Snippets

### Snippet 1: Page Template

```typescript
// page-template.tsx
import { DashboardLayout } from '@/components/layouts/DashboardLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { Card } from '@/components/ui/card';

export function PageTemplate() {
  return (
    <DashboardLayout>
      <PageHeader title="Page Title" description="Description" />
      <Card>
        {/* Content */}
      </Card>
    </DashboardLayout>
  );
}
```

### Snippet 2: Data Table

```typescript
// table-example.tsx
import { DataTable } from '@/components/common/DataTable';
import { ColumnDef } from '@tanstack/react-table';

const columns: ColumnDef<Transaction>[] = [
  {
    accessorKey: 'date',
    header: 'Date',
    cell: ({ row }) => formatDate(row.original.date),
  },
  {
    accessorKey: 'amount',
    header: 'Amount',
    cell: ({ row }) => formatCurrency(row.original.amount),
  },
];

function TransactionsTable({ data }: { data: Transaction[] }) {
  return <DataTable columns={columns} data={data} />;
}
```

### Snippet 3: Form with Validation

```typescript
// form-example.tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

type FormData = z.infer<typeof schema>;

function LoginForm() {
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = (data: FormData) => {
    console.log(data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Input {...register('email')} error={errors.email?.message} />
      <Input {...register('password')} type="password" error={errors.password?.message} />
      <Button type="submit">Submit</Button>
    </form>
  );
}
```

### Snippet 4: Custom Hook

```typescript
// hooks/useCustomHook.ts
import { useState, useEffect } from 'react';

export function useCustomHook(dependency: string) {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setIsLoading(true);
        const response = await fetch(`/api/${dependency}`);
        const data = await response.json();
        setData(data);
      } catch (err) {
        setError(err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, [dependency]);

  return { data, isLoading, error };
}
```

### Snippet 5: Supabase Query

```typescript
// services/transaction.service.ts
import { supabase } from '@/lib/supabase';

export async function getTransactions(userId: string) {
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

export async function createTransaction(transaction: NewTransaction) {
  const { data, error } = await supabase
    .from('transactions')
    .insert(transaction)
    .select()
    .single();

  if (error) throw error;
  return data;
}
```

---

## VS Code Snippets

Add these to your `.vscode/snippets.json`:

```json
{
  "React Component": {
    "prefix": "rfc",
    "body": [
      "import { DashboardLayout } from '@/components/layouts/DashboardLayout';",
      "import { PageHeader } from '@/components/common/PageHeader';",
      "",
      "export function ${1:ComponentName}() {",
      "  return (",
      "    <DashboardLayout>",
      "      <PageHeader",
      "        title=\"${2:Title}\"",
      "        description=\"${3:Description}\"",
      "      />",
      "      <div>",
      "        ${4:// Content}",
      "      </div>",
      "    </DashboardLayout>",
      "  );",
      "}"
    ]
  },
  "React Query Hook": {
    "prefix": "usequery",
    "body": [
      "const { data, isLoading, error } = useQuery({",
      "  queryKey: ['${1:key}'],",
      "  queryFn: async () => {",
      "    ${2:// Fetch logic}",
      "  },",
      "});"
    ]
  },
  "Form Schema": {
    "prefix": "zod",
    "body": [
      "const ${1:name}Schema = z.object({",
      "  ${2:field}: z.string().min(1, '${3:Error message}'),",
      "});",
      "",
      "type ${1:name}FormData = z.infer<typeof ${1:name}Schema>;"
    ]
  }
}
```

---

## File Naming Conventions

```
Pages:         PascalCase.tsx        (e.g., DashboardPage.tsx)
Components:    PascalCase.tsx        (e.g., TransactionCard.tsx)
Hooks:         camelCase.ts          (e.g., useTransactions.ts)
Services:      camelCase.service.ts  (e.g., auth.service.ts)
Types:         camelCase.types.ts    (e.g., transaction.types.ts)
Stores:        camelCase.ts          (e.g., authStore.ts)
Utils:         camelCase.ts          (e.g., formatters.ts)
```

---

## Git Workflow

```bash
# 1. Create feature branch
git checkout -b feature/page-name

# 2. Make changes
git add .
git commit -m "feat: add page name"

# 3. Push to remote
git push origin feature/page-name

# 4. Create pull request
# Use GitHub/GitLab UI
```

### Commit Message Convention

```
feat: Add new feature
fix: Fix bug
docs: Update documentation
style: Format code
refactor: Refactor code
test: Add tests
chore: Update dependencies
```

---

## Testing Your Page

### Unit Test

```typescript
// __tests__/pages/DashboardPage.test.tsx
import { render, screen } from '@testing-library/react';
import { DashboardPage } from '@/pages/dashboard/DashboardPage';

describe('DashboardPage', () => {
  it('renders page title', () => {
    render(<DashboardPage />);
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });
});
```

### E2E Test

```typescript
// e2e/dashboard.spec.ts
import { test, expect } from '@playwright/test';

test('user can view dashboard', async ({ page }) => {
  await page.goto('/dashboard');
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
});
```

---

## Troubleshooting

### Issue: Module not found

```bash
# Clear node_modules and reinstall
rm -rf node_modules
npm install
```

### Issue: Supabase connection error

```typescript
// Check .env.local file
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=xxx

// Restart dev server
npm run dev
```

### Issue: TypeScript errors

```bash
# Run type check
npm run type-check

# Fix any type errors
```

### Issue: Styles not applying

```bash
# Check Tailwind config
# Restart dev server
npm run dev
```

### Issue: Component not rendering

```typescript
// Check:
// 1. Component is exported
export function MyComponent() { }

// 2. Component is imported correctly
import { MyComponent } from '@/components/MyComponent';

// 3. Component is rendered
<MyComponent />
```

---

## Useful Commands

```bash
# Development
npm run dev                 # Start dev server
npm run build              # Build for production
npm run preview            # Preview production build

# Testing
npm run test               # Run unit tests
npm run test:watch         # Watch mode
npm run test:e2e           # Run E2E tests

# Code Quality
npm run lint               # Lint code
npm run lint:fix           # Fix lint errors
npm run format             # Format code
npm run type-check         # TypeScript check

# Database
npm run db:migrate         # Run migrations
npm run db:seed            # Seed database
npm run db:reset           # Reset database
```

---

## Quick Links

- [Main Implementation Plan](./WEB_PAGES_IMPLEMENTATION_PLAN.md)
- [Routes Reference](./ROUTES_REFERENCE.md)
- [Component Library Blueprint](./COMPONENT_LIBRARY_BLUEPRINT.md)
- [React Documentation](https://react.dev)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Shadcn/ui](https://ui.shadcn.com)
- [TanStack Query](https://tanstack.com/query/latest)
- [Zustand](https://github.com/pmndrs/zustand)
- [React Router](https://reactrouter.com)
- [Supabase Docs](https://supabase.com/docs)

---

## Getting Help

1. **Check Documentation**: Review the implementation plan and component blueprints
2. **Search Codebase**: Look for similar implementations
3. **Ask Team**: Reach out to senior developers
4. **Stack Overflow**: Search for specific issues
5. **Discord/Slack**: Project communication channels

---

## Next Steps

1. ✅ Read this guide
2. ✅ Setup your environment
3. ✅ Create your first page
4. ✅ Review the component library
5. ✅ Start building!

---

**Happy Coding! 🚀**

**Last Updated:** 2025-11-04
