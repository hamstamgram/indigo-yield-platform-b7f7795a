# Quick Start Guide - Indigo Yield Platform
## Developer Onboarding in 30 Minutes

---

## 1. Prerequisites (5 minutes)

### Required Tools
```bash
# Node.js 20+ and pnpm
node --version  # Should be v20+
pnpm --version  # Install: npm install -g pnpm

# Git
git --version

# Code editor (recommended)
code --version  # VS Code
```

### VS Code Extensions (Install)
- ESLint
- Prettier
- TypeScript Vue Plugin (Volar)
- Tailwind CSS IntelliSense
- Error Lens
- GitLens

---

## 2. Project Setup (10 minutes)

### Clone & Install
```bash
# Clone repository
git clone https://github.com/indigo-yield/platform.git
cd platform

# Install dependencies
pnpm install

# Copy environment file
cp .env.example .env.local
```

### Configure Environment
```bash
# Edit .env.local with your values
nano .env.local
```

Required variables:
```env
# Supabase
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# Stripe (use test keys)
VITE_STRIPE_PUBLIC_KEY=pk_test_...

# App config
VITE_APP_NAME=Indigo Yield
VITE_API_URL=http://localhost:3000/api
```

### Start Development Server
```bash
pnpm dev

# Server will start at http://localhost:3000
```

---

## 3. Project Structure (5 minutes)

```
indigo-yield-platform-v01/
├── src/
│   ├── components/        # Shared components (Atomic Design)
│   │   ├── atoms/
│   │   ├── molecules/
│   │   ├── organisms/
│   │   └── templates/
│   ├── features/          # Feature modules (125 pages)
│   │   ├── authentication/
│   │   ├── dashboard/
│   │   ├── investments/
│   │   ├── portfolio/
│   │   └── ...
│   ├── hooks/             # Custom React hooks
│   ├── lib/               # Third-party integrations
│   ├── services/          # API services
│   ├── stores/            # Global state (Zustand)
│   ├── types/             # TypeScript types
│   └── utils/             # Utility functions
├── docs/                  # Documentation
└── tests/                 # Test suites
```

---

## 4. Key Concepts (5 minutes)

### Component Architecture
```typescript
// Atomic Design Pattern
components/
  atoms/         → Buttons, Inputs (basic building blocks)
  molecules/     → Form fields, Cards (simple combinations)
  organisms/     → Forms, Navigation (complex components)
  templates/     → Page layouts
```

### State Management
```typescript
// Server state (API data)
import { useQuery } from '@tanstack/react-query'

// Global state (UI, auth)
import { useAuthStore } from '@/stores/auth.store'

// Local state (component-specific)
import { useState } from 'react'
```

### Feature Modules
```typescript
// Each feature is self-contained
features/investments/
  ├── api/           # React Query hooks
  ├── components/    # Feature components
  ├── pages/         # Route pages
  ├── hooks/         # Feature hooks
  ├── types/         # Feature types
  └── utils/         # Feature utilities
```

---

## 5. Common Tasks (5 minutes)

### Create a New Component
```bash
# Components follow this structure:
src/components/atoms/Button/
  ├── index.tsx           # Export
  ├── Button.tsx          # Component
  ├── Button.test.tsx     # Tests
  └── Button.stories.tsx  # Storybook
```

Example component:
```typescript
// src/components/atoms/Button/Button.tsx
import { type ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary'
  size?: 'sm' | 'md' | 'lg'
}

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        'rounded-md font-medium',
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
}

const variantStyles = {
  primary: 'bg-indigo-600 text-white hover:bg-indigo-700',
  secondary: 'bg-gray-200 text-gray-900 hover:bg-gray-300',
}

const sizeStyles = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-base',
  lg: 'px-6 py-3 text-lg',
}
```

### Create a New Feature
```bash
# 1. Create feature directory
mkdir -p src/features/my-feature/{api,components,pages,hooks,types}

# 2. Add to router
# Edit src/app/router.tsx

# 3. Create API queries
# src/features/my-feature/api/queries.ts

# 4. Create components
# src/features/my-feature/components/

# 5. Create pages
# src/features/my-feature/pages/
```

### Add a New API Endpoint
```typescript
// 1. Define types
// src/features/my-feature/types/index.ts
export interface MyData {
  id: string
  name: string
}

// 2. Create service
// src/features/my-feature/api/queries.ts
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export function useMyData() {
  return useQuery({
    queryKey: ['my-data'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('my_table')
        .select('*')

      if (error) throw error
      return data as MyData[]
    },
  })
}

// 3. Use in component
function MyComponent() {
  const { data, isLoading } = useMyData()

  if (isLoading) return <Spinner />

  return (
    <div>
      {data?.map(item => (
        <div key={item.id}>{item.name}</div>
      ))}
    </div>
  )
}
```

### Create a Form
```typescript
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Form } from '@/components/forms/Form'
import { FormField } from '@/components/forms/FormField'

// 1. Define schema
const schema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email'),
})

type FormData = z.infer<typeof schema>

// 2. Create form
function MyForm() {
  const form = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: FormData) => {
    console.log(data)
  }

  return (
    <Form form={form} onSubmit={onSubmit}>
      <FormField name="name" label="Name" required />
      <FormField name="email" label="Email" required type="email" />
      <button type="submit">Submit</button>
    </Form>
  )
}
```

---

## 6. Development Commands

### Essential Commands
```bash
# Development
pnpm dev              # Start dev server
pnpm dev:host         # Start with network access

# Building
pnpm build            # Production build
pnpm build:staging    # Staging build
pnpm preview          # Preview production build

# Code Quality
pnpm lint             # Run linter
pnpm lint:fix         # Fix linting issues
pnpm typecheck        # Check TypeScript types

# Testing
pnpm test             # Run unit tests
pnpm test:watch       # Watch mode
pnpm test:coverage    # With coverage
pnpm test:e2e         # E2E tests

# Storybook
pnpm storybook        # Start Storybook
```

### Helpful Scripts
```bash
# Clean build artifacts
pnpm clean

# Analyze bundle size
pnpm analyze

# Check for security vulnerabilities
pnpm audit
```

---

## 7. Coding Standards

### TypeScript
```typescript
// ✅ DO: Use explicit types
function calculateTotal(amount: number, tax: number): number {
  return amount * (1 + tax)
}

// ❌ DON'T: Use any
function process(data: any) { }

// ✅ DO: Use interfaces for objects
interface User {
  id: string
  name: string
  email: string
}

// ✅ DO: Use type for unions/aliases
type Status = 'pending' | 'active' | 'completed'
```

### Component Patterns
```typescript
// ✅ DO: Destructure props
function Component({ title, onClick }: Props) { }

// ❌ DON'T: Use props object
function Component(props) { }

// ✅ DO: Use meaningful names
function InvestmentCard() { }

// ❌ DON'T: Use generic names
function Card1() { }

// ✅ DO: Keep components small
function SmallFocusedComponent() {
  return <div>Single responsibility</div>
}
```

### Import Order
```typescript
// 1. External libraries
import React from 'react'
import { useQuery } from '@tanstack/react-query'

// 2. Internal modules (aliased)
import { Button } from '@/components/atoms'
import { useAuth } from '@/hooks'

// 3. Relative imports
import { helper } from './utils'

// 4. Types
import type { User } from '@/types'

// 5. Styles
import styles from './Component.module.css'
```

---

## 8. Git Workflow

### Branch Naming
```bash
# Feature
git checkout -b feature/IY-123-add-investment-form

# Bug fix
git checkout -b fix/IY-456-calculation-error

# Hotfix
git checkout -b hotfix/critical-security-patch
```

### Commit Messages
```bash
# Format: type(scope): message

git commit -m "feat(investments): add investment opportunity card"
git commit -m "fix(auth): resolve token refresh issue"
git commit -m "docs(readme): update setup instructions"

# Types: feat, fix, docs, style, refactor, test, chore
```

### Pull Request Checklist
- [ ] Code follows project conventions
- [ ] Tests added/updated
- [ ] Types are correct
- [ ] No console.log statements
- [ ] Documentation updated
- [ ] PR description is clear

---

## 9. Debugging Tips

### React DevTools
```bash
# Install extension
# Chrome: React Developer Tools
# Firefox: React Developer Tools
```

### Common Issues

**Port already in use**:
```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9
```

**Dependencies out of sync**:
```bash
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

**Type errors**:
```bash
# Check types
pnpm typecheck

# Restart TypeScript server (VS Code)
# Cmd+Shift+P → "TypeScript: Restart TS Server"
```

---

## 10. Resources

### Documentation
- [Full Implementation Docs](./00-implementation-overview.md)
- [Component Architecture](./01-component-architecture.md)
- [API Integration](./04-api-integration.md)
- [Forms & Validation](./05-forms-validation.md)

### External Resources
- [React Docs](https://react.dev)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [TanStack Query](https://tanstack.com/query)
- [Zustand](https://docs.pmnd.rs/zustand)
- [Zod](https://zod.dev)
- [Tailwind CSS](https://tailwindcss.com)
- [Supabase Docs](https://supabase.com/docs)

### Internal Resources
- Design System: http://localhost:6006 (Storybook)
- API Docs: `/docs/api`
- Slack: #indigo-dev
- Jira: https://indigo.atlassian.net

---

## 11. Getting Help

### In Order of Preference

1. **Documentation**: Check docs/ directory
2. **Storybook**: Browse component examples
3. **Code Examples**: Look at existing features
4. **Team Chat**: Ask in #indigo-dev Slack
5. **Code Review**: Request review from senior dev
6. **Pair Programming**: Schedule pairing session

### Who to Ask

- **Components**: @core-team
- **API/Backend**: @backend-team
- **iOS**: @ios-team
- **DevOps/Deploy**: @devops
- **General**: @tech-lead

---

## 12. First Tasks for New Developers

### Day 1
- [ ] Set up development environment
- [ ] Run project locally
- [ ] Browse Storybook
- [ ] Read architecture docs
- [ ] Join team Slack channels

### Day 2
- [ ] Review codebase structure
- [ ] Pick up first ticket (labeled `good-first-issue`)
- [ ] Create feature branch
- [ ] Make small change
- [ ] Create PR

### Week 1
- [ ] Complete 2-3 small features
- [ ] Participate in code reviews
- [ ] Attend standup meetings
- [ ] Contribute to documentation
- [ ] Pair with team member

---

## Next Steps

1. **Complete setup** above
2. **Read** [Implementation Overview](./00-implementation-overview.md)
3. **Browse** Storybook component examples
4. **Pick** your first ticket from backlog
5. **Ask** questions in team channels

Welcome to the team! 🚀

---

**Last Updated**: 2025-01-04
**Maintained By**: Core Team
**Questions**: #indigo-dev on Slack
