# Quick Reference Card

**One-page cheat sheet for Indigo Yield Platform development**

---

## 📁 Project Structure

```
src/
├── pages/           # 125 page components
├── components/      # ~180 reusable components
├── hooks/           # Custom React hooks
├── lib/             # Utilities & helpers
├── services/        # API services
├── stores/          # Zustand state stores
├── types/           # TypeScript types
└── routes/          # Route configurations
```

---

## 🎯 Essential Commands

```bash
npm run dev              # Start development server
npm run build            # Build for production
npm run test             # Run tests
npm run lint             # Lint code
npm run type-check       # TypeScript check
npm run db:migrate       # Run database migrations
```

---

## 🔗 Quick Links

| Document | Purpose |
|----------|---------|
| [README_IMPLEMENTATION.md](./README_IMPLEMENTATION.md) | Start here - Overview |
| [WEB_PAGES_IMPLEMENTATION_PLAN.md](./WEB_PAGES_IMPLEMENTATION_PLAN.md) | Master blueprint (16 weeks) |
| [ROUTES_REFERENCE.md](./ROUTES_REFERENCE.md) | All 125 routes |
| [COMPONENT_LIBRARY_BLUEPRINT.md](./COMPONENT_LIBRARY_BLUEPRINT.md) | ~180 components |
| [DEVELOPER_QUICK_START.md](./DEVELOPER_QUICK_START.md) | Get started in 5 mins |

---

## 📊 125 Pages by Module

| # | Module | Pages | Priority | Weeks |
|---|--------|-------|----------|-------|
| 1 | Authentication & Onboarding | 8 | P0 | 1-2 |
| 2 | Dashboard & Portfolio | 15 | P0 | 2-6 |
| 3 | Transactions & Deposits | 12 | P0 | 3-6 |
| 4 | Withdrawals & Redemptions | 10 | P1 | 4-7 |
| 5 | Documents & Statements | 8 | P1 | 5-7 |
| 6 | Profile & Settings | 10 | P0-P1 | 2-7 |
| 7 | Reports & Analytics | 12 | P1 | 6-8 |
| 8 | Admin Panel | 20 | P0-P1 | 3-9 |
| 9 | Compliance & KYC | 8 | P0-P2 | 2-8 |
| 10 | Support & Help | 7 | P1-P2 | 4-9 |
| 11 | Notifications | 5 | P1-P2 | 3-7 |
| 12 | Learning Center | 6 | P2 | 8-9 |
| 13 | Referral Program | 4 | P2 | 7-8 |

---

## 🏗️ Page Template

```typescript
import { DashboardLayout } from '@/components/layouts/DashboardLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { Card } from '@/components/ui/card';
import { useQuery } from '@tanstack/react-query';

export function PageName() {
  const { data, isLoading } = useQuery({
    queryKey: ['key'],
    queryFn: fetchData,
  });

  if (isLoading) return <LoadingSkeleton />;

  return (
    <DashboardLayout>
      <PageHeader title="Title" description="Description" />
      <Card>{/* Content */}</Card>
    </DashboardLayout>
  );
}
```

---

## 🎨 Component Categories

| Category | Count | Examples |
|----------|-------|----------|
| UI Primitives | 40 | Button, Input, Card, Dialog |
| Layout | 12 | AppLayout, DashboardLayout, Sidebar |
| Forms | 25 | LoginForm, DepositForm, FormField |
| Data Display | 30 | DataTable, TransactionCard, StatCard |
| Navigation | 15 | Sidebar, Breadcrumbs, Pagination |
| Feedback | 18 | Toast, Alert, EmptyState |
| Charts | 10 | LineChart, PieChart, BarChart |
| Domain-Specific | 40 | TransactionCard, PortfolioCard |

---

## 🔧 Common Patterns

### 1. Data Fetching

```typescript
const { data, isLoading } = useQuery({
  queryKey: ['transactions'],
  queryFn: async () => {
    const { data } = await supabase.from('transactions').select('*');
    return data;
  },
});
```

### 2. Form Handling

```typescript
const form = useForm<FormData>({
  resolver: zodResolver(schema),
});

const onSubmit = (data: FormData) => {
  // Handle submission
};
```

### 3. Route Protection

```typescript
// Wrap routes with ProtectedRoute
<Route element={<ProtectedRoute />}>
  <Route path="/dashboard" element={<Dashboard />} />
</Route>
```

### 4. Modal Management

```typescript
const { openModal, closeModal } = useModal();

<Button onClick={() => openModal('deposit')}>New Deposit</Button>
<Dialog open={isOpen('deposit')} onOpenChange={() => closeModal('deposit')}>
  <DepositForm />
</Dialog>
```

---

## 📝 File Naming

```
Pages:      PascalCase.tsx      (DashboardPage.tsx)
Components: PascalCase.tsx      (TransactionCard.tsx)
Hooks:      camelCase.ts        (useTransactions.ts)
Services:   camelCase.service.ts (auth.service.ts)
Types:      camelCase.types.ts  (transaction.types.ts)
Stores:     camelCaseStore.ts   (authStore.ts)
```

---

## 🎯 Code Quality Standards

```
TypeScript:        Strict mode ✓
Test Coverage:     >80%
Bundle Size:       <500KB (gzipped)
Lighthouse Score:  >90
WCAG Compliance:   AA minimum
ESLint:            0 warnings/errors
```

---

## 🧪 Testing

```typescript
// Unit Test
it('renders component', () => {
  render(<Component />);
  expect(screen.getByText('Text')).toBeInTheDocument();
});

// E2E Test
test('user flow', async ({ page }) => {
  await page.goto('/login');
  await page.fill('[name="email"]', 'test@example.com');
  await page.click('button[type="submit"]');
});
```

---

## 🚀 Git Workflow

```bash
git checkout -b feature/page-name    # Create branch
git add .                            # Stage changes
git commit -m "feat: add page"       # Commit
git push origin feature/page-name    # Push
# Create PR on GitHub
```

**Commit Prefixes:** `feat:`, `fix:`, `docs:`, `style:`, `refactor:`, `test:`, `chore:`

---

## 📦 Key Dependencies

```json
{
  "react": "18.3.x",
  "typescript": "5.3.x",
  "vite": "5.0.x",
  "@tanstack/react-query": "latest",
  "zustand": "latest",
  "react-hook-form": "latest",
  "zod": "latest",
  "tailwindcss": "latest",
  "@supabase/supabase-js": "latest"
}
```

---

## 🔑 Environment Variables

```bash
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_API_URL=https://api.indigo-yield.com
```

---

## 🎨 Tailwind Classes (Common)

```
Layout:     flex, grid, container
Spacing:    p-4, m-4, gap-4, space-y-4
Sizing:     w-full, h-screen, max-w-7xl
Colors:     bg-primary, text-primary
Effects:    shadow-lg, rounded-lg, hover:opacity-80
```

---

## 🚨 Troubleshooting

| Issue | Solution |
|-------|----------|
| Module not found | `rm -rf node_modules && npm install` |
| Supabase error | Check `.env.local`, restart server |
| Type errors | Run `npm run type-check` |
| Styles not working | Restart dev server |

---

## 📞 Getting Help

1. Check documentation
2. Search codebase
3. Ask in team channel
4. Schedule pair programming
5. Escalate to tech lead

---

## 📈 Progress Tracking

```
Total Pages: 125
Completed: ___
In Progress: ___
Not Started: ___

Progress: ____%
```

---

## ⏱️ Timeline

**Phase 1 (Weeks 1-4):** Core Features
**Phase 2 (Weeks 5-8):** Extended Features
**Phase 3 (Weeks 9-12):** Advanced Features
**Phase 4 (Weeks 13-16):** Polish & Launch

---

## 🎓 Learning Resources

- [React Docs](https://react.dev)
- [TypeScript Handbook](https://typescriptlang.org/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Shadcn/ui](https://ui.shadcn.com)
- [TanStack Query](https://tanstack.com/query/latest)

---

## ✅ Pre-Commit Checklist

- [ ] Code follows patterns
- [ ] Types are correct
- [ ] Tests added/updated
- [ ] No lint errors
- [ ] Mobile responsive
- [ ] Accessible
- [ ] Documentation updated

---

## 🎯 Daily Workflow

```
1. Pull latest: git pull origin main
2. Create branch: git checkout -b feature/page-name
3. Start server: npm run dev
4. Build page (follow patterns)
5. Test: npm run test
6. Commit: git commit -m "feat: add page"
7. Push & PR: git push origin feature/page-name
```

---

## 💡 Pro Tips

1. **Use VS Code snippets** for faster development
2. **Reference existing pages** for patterns
3. **Copy component examples** from blueprint
4. **Test as you build** - don't wait
5. **Mobile-first** approach always
6. **Accessibility** from the start
7. **Ask questions** early and often

---

## 🏆 Success Metrics

```
Week 4:  MVP (Core features working)
Week 8:  Beta (Most features complete)
Week 16: Production (All 125 pages done)
```

---

**Print this card and keep it handy! 📋**

**Last Updated:** 2025-11-04
