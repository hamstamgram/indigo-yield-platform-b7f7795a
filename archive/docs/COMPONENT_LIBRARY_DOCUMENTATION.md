# Component Library Documentation
## Indigo Yield Platform - React Component System

**Last Updated:** 2025-11-22
**Framework:** Next.js 14 + React 18 + TypeScript
**UI System:** shadcn/ui + Radix UI + Tailwind CSS
**State Management:** TanStack Query + React Hooks

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Component Standards](#component-standards)
3. [UI Component Library](#ui-component-library)
4. [Feature Components](#feature-components)
5. [Performance Patterns](#performance-patterns)
6. [Accessibility Guidelines](#accessibility-guidelines)
7. [Testing Strategy](#testing-strategy)

---

## Architecture Overview

### Technology Stack

```typescript
- Next.js 14.1.0          // React framework with App Router
- React 18.2.0            // UI library
- TypeScript 5.x          // Type safety
- Tailwind CSS 3.x        // Utility-first CSS
- shadcn/ui               // Component library base
- Radix UI                // Headless UI primitives
- Framer Motion 11.x      // Animations
- TanStack Query 5.x      // Server state management
- React Hook Form 7.x     // Form handling
- Zod                     // Schema validation
```

### Project Structure

```
src/
├── components/
│   ├── ui/                    # Base UI components (57 components)
│   │   ├── button.tsx         # Buttons with variants
│   │   ├── card.tsx           # Card layouts
│   │   ├── input.tsx          # Form inputs
│   │   ├── dialog.tsx         # Modal dialogs
│   │   └── ...
│   ├── layout/                # Layout components
│   │   ├── DashboardLayout.tsx
│   │   ├── Header.tsx
│   │   ├── Sidebar.tsx
│   │   └── ContentArea.tsx
│   ├── admin/                 # Admin feature components
│   ├── dashboard/             # Dashboard components
│   ├── auth/                  # Authentication components
│   └── common/                # Shared components
├── hooks/                     # Custom React hooks
├── lib/                       # Utility libraries
├── services/                  # API services
└── types/                     # TypeScript types
```

---

## Component Standards

### Standard Component Pattern

All components follow this standardized structure:

```typescript
import * as React from "react";
import { cn } from "@/lib/utils";

// Props interface with JSDoc
export interface ComponentNameProps
  extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Brief description of the prop
   */
  propName: string;
  /**
   * Optional prop with default
   * @default false
   */
  isActive?: boolean;
}

/**
 * ComponentName - Brief description
 *
 * @example
 * <ComponentName propName="value" />
 */
export const ComponentName = React.forwardRef<
  HTMLDivElement,
  ComponentNameProps
>(({ className, propName, isActive = false, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn("base-classes", className)}
      data-testid="component-name"
      aria-label="Descriptive label"
      {...props}
    >
      {/* Component content */}
    </div>
  );
});

ComponentName.displayName = "ComponentName";
```

### Key Principles

1. **TypeScript First**: All components use TypeScript with proper interfaces
2. **Composition**: Use component composition over prop drilling
3. **Accessibility**: Include ARIA attributes and semantic HTML
4. **Performance**: Implement memoization where beneficial
5. **Testing**: Include data-testid for testing
6. **Documentation**: JSDoc comments for props and usage

---

## UI Component Library

### Base Components (shadcn/ui)

#### Button Component

**Location:** `src/components/ui/button.tsx`

```typescript
import { Button } from "@/components/ui/button";

// Usage
<Button variant="default" size="default">
  Click me
</Button>

// Variants
- default    // Primary action button
- destructive // Dangerous actions
- outline    // Secondary actions
- secondary  // Less prominent actions
- ghost      // Minimal visual weight
- link       // Link styled as button

// Sizes
- default    // 44px height (mobile-optimized)
- sm         // 44px height (mobile-optimized)
- lg         // 48px height
- icon       // 44px square (touch-optimized)
```

**Accessibility:**
- Minimum 44px touch target (WCAG 2.1 Level AAA)
- Focus visible states
- Proper ARIA labels
- Keyboard navigation support

#### Card Component

**Location:** `src/components/ui/card.tsx`

```typescript
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";

// Usage
<Card>
  <CardHeader>
    <CardTitle>Title</CardTitle>
    <CardDescription>Description</CardDescription>
  </CardHeader>
  <CardContent>
    Content goes here
  </CardContent>
  <CardFooter>
    Footer actions
  </CardFooter>
</Card>
```

**Best Practices:**
- Use semantic heading levels (h1-h6)
- Maintain consistent spacing
- Include hover states for interactive cards

#### Input Component

**Location:** `src/components/ui/input.tsx`

```typescript
import { Input } from "@/components/ui/input";

// Usage
<Input
  type="text"
  placeholder="Enter value"
  aria-label="Input field"
  disabled={false}
/>

// Features
- Form validation integration
- Error state styling
- Disabled state
- Focus ring
- Responsive sizing
```

#### Dialog Component

**Location:** `src/components/ui/dialog.tsx`

```typescript
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

// Usage
<Dialog>
  <DialogTrigger asChild>
    <Button>Open Dialog</Button>
  </DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Dialog Title</DialogTitle>
      <DialogDescription>
        Dialog description
      </DialogDescription>
    </DialogHeader>
    {/* Content */}
    <DialogFooter>
      <Button>Confirm</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

**Accessibility:**
- Focus trap within modal
- ESC key to close
- Overlay click to close
- ARIA attributes for screen readers

### Form Components

#### Form with Validation

Uses React Hook Form + Zod for type-safe validation:

```typescript
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const formSchema = z.object({
  email: z.string().email("Invalid email address"),
  amount: z.number().positive("Amount must be positive"),
});

type FormData = z.infer<typeof formSchema>;

function MyForm() {
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      amount: 0,
    },
  });

  const onSubmit = (data: FormData) => {
    console.log(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input {...field} type="email" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit">Submit</Button>
      </form>
    </Form>
  );
}
```

### Data Display Components

#### Table Component

**Location:** `src/components/ui/table.tsx`

```typescript
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// Usage
<Table>
  <TableHeader>
    <TableRow>
      <TableHead>Name</TableHead>
      <TableHead>Status</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    <TableRow>
      <TableCell>John Doe</TableCell>
      <TableCell>Active</TableCell>
    </TableRow>
  </TableBody>
</Table>
```

**Features:**
- Responsive design
- Sortable columns (with TanStack Table)
- Pagination support
- Hover states
- Empty state handling

---

## Feature Components

### Admin Components

Located in `src/components/admin/`

#### AddTransactionDialog

Complex form dialog with validation:

```typescript
import { AddTransactionDialog } from "@/components/admin/AddTransactionDialog";

<AddTransactionDialog
  open={dialogOpen}
  onOpenChange={setDialogOpen}
  investorId={investorId}
  fundId={fundId}
  onSuccess={() => refetch()}
/>
```

**Features:**
- Zod schema validation
- Real-time form validation
- Loading states
- Error handling
- Success notifications via Sonner

#### KPICard

Dashboard metric display:

```typescript
import { KPICard } from "@/components/dashboard/KPICard";

<KPICard
  title="Total Value"
  value="$1,234,567"
  percentage={12.5}
  trend="up"
  icon={<DollarSign />}
/>
```

**Features:**
- Trend indicators
- Icon support
- Percentage change
- Responsive design
- Hover effects

---

## Performance Patterns

### Code Splitting

Implement lazy loading for route-based code splitting:

```typescript
import { lazy, Suspense } from "react";
import { RouteLoadingFallback } from "@/components/ui/RouteLoadingFallback";

// Lazy load pages
const AdminDashboard = lazy(() => import("@/pages/admin/AdminDashboard"));

// Use with Suspense
<Suspense fallback={<RouteLoadingFallback />}>
  <AdminDashboard />
</Suspense>
```

### Component Memoization

Use React.memo for expensive components:

```typescript
import { memo } from "react";

interface ExpensiveComponentProps {
  data: ComplexData[];
  onAction: () => void;
}

export const ExpensiveComponent = memo<ExpensiveComponentProps>(
  ({ data, onAction }) => {
    // Complex rendering logic
    return (
      <div>
        {data.map(item => <Item key={item.id} {...item} />)}
      </div>
    );
  },
  (prevProps, nextProps) => {
    // Custom comparison
    return prevProps.data === nextProps.data;
  }
);

ExpensiveComponent.displayName = "ExpensiveComponent";
```

### useMemo and useCallback

```typescript
import { useMemo, useCallback } from "react";

function Component({ items, onSelect }) {
  // Memoize expensive calculations
  const sortedItems = useMemo(
    () => items.sort((a, b) => a.value - b.value),
    [items]
  );

  // Memoize callback functions
  const handleSelect = useCallback(
    (id: string) => {
      onSelect(id);
    },
    [onSelect]
  );

  return <List items={sortedItems} onSelect={handleSelect} />;
}
```

### TanStack Query Caching

```typescript
import { useQuery } from "@tanstack/react-query";

function useInvestorData(investorId: string) {
  return useQuery({
    queryKey: ["investor", investorId],
    queryFn: () => fetchInvestor(investorId),
    staleTime: 5 * 60 * 1000,  // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
    retry: 3,
  });
}
```

---

## Accessibility Guidelines

### WCAG 2.1 Level AA Compliance

#### Color Contrast

All color combinations meet WCAG AA standards:

```css
/* Minimum contrast ratios */
--muted-foreground: 215.4 16.3% 40%;  /* 7:1 ratio */
--border: 214.3 31.8% 85%;             /* Enhanced visibility */
```

#### Touch Targets

All interactive elements meet minimum size requirements:

```typescript
// Button sizes (44px minimum for mobile)
size: {
  default: "h-11 px-4 py-2",  // 44px
  sm: "h-11 rounded-md px-3", // 44px
  lg: "h-12 rounded-md px-8", // 48px
  icon: "h-11 w-11",          // 44x44px
}
```

#### Keyboard Navigation

```typescript
// Example: Keyboard-accessible dialog
<Dialog>
  <DialogTrigger asChild>
    <Button>Open</Button>
  </DialogTrigger>
  <DialogContent>
    {/* Auto-focus first input */}
    <Input autoFocus aria-label="First input" />
    {/* ESC to close */}
    {/* Tab to navigate */}
  </DialogContent>
</Dialog>
```

#### ARIA Attributes

Required ARIA attributes for all components:

```typescript
// Interactive elements
<button
  aria-label="Close dialog"
  aria-pressed={isPressed}
  aria-expanded={isExpanded}
>
  Close
</button>

// Form inputs
<input
  aria-label="Email address"
  aria-required={true}
  aria-invalid={hasError}
  aria-describedby="email-error"
/>
{hasError && (
  <span id="email-error" role="alert">
    Invalid email
  </span>
)}
```

#### Screen Reader Support

```typescript
// Skip navigation link
<SkipLink href="#main-content">
  Skip to main content
</SkipLink>

// Main content landmark
<main id="main-content" role="main">
  {/* Page content */}
</main>

// Live regions for notifications
<div role="status" aria-live="polite" aria-atomic="true">
  {notification}
</div>
```

---

## Testing Strategy

### Unit Testing with Jest

```typescript
// Component test example
import { render, screen } from "@testing-library/react";
import { KPICard } from "./KPICard";

describe("KPICard", () => {
  it("renders title and value correctly", () => {
    render(
      <KPICard title="Total Value" value="$1,000" />
    );

    expect(screen.getByText("Total Value")).toBeInTheDocument();
    expect(screen.getByText("$1,000")).toBeInTheDocument();
  });

  it("displays trend indicator when percentage provided", () => {
    render(
      <KPICard
        title="Growth"
        value="100"
        percentage={12.5}
        trend="up"
      />
    );

    expect(screen.getByText("+12.50%")).toBeInTheDocument();
  });
});
```

### Integration Testing with Playwright

```typescript
// E2E test example
import { test, expect } from "@playwright/test";

test.describe("Admin Dashboard", () => {
  test("should display investor table", async ({ page }) => {
    await page.goto("/admin/investors");

    // Wait for table to load
    await page.waitForSelector('[data-testid="investors-table"]');

    // Check table headers
    await expect(page.locator('th').first()).toContainText("Name");

    // Check pagination
    await expect(page.locator('[aria-label="Pagination"]')).toBeVisible();
  });
});
```

### Accessibility Testing

```typescript
// Axe accessibility tests
import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test.describe("Accessibility", () => {
  test("should not have accessibility violations", async ({ page }) => {
    await page.goto("/dashboard");

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });
});
```

---

## Component Checklist

When creating new components, ensure:

- [ ] TypeScript interface for props
- [ ] ForwardRef for DOM access
- [ ] DisplayName set
- [ ] Accessibility attributes (aria-*, role)
- [ ] Keyboard navigation support
- [ ] Focus management
- [ ] Responsive design (mobile-first)
- [ ] Error states
- [ ] Loading states
- [ ] Empty states
- [ ] Data-testid for testing
- [ ] JSDoc documentation
- [ ] Unit tests written
- [ ] Storybook story (if applicable)

---

## Resources

### Official Documentation
- [Next.js Docs](https://nextjs.org/docs)
- [React Docs](https://react.dev)
- [shadcn/ui](https://ui.shadcn.com)
- [Radix UI](https://www.radix-ui.com)
- [TanStack Query](https://tanstack.com/query)

### Accessibility
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [MDN ARIA Guide](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA)
- [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)

### Testing
- [React Testing Library](https://testing-library.com/react)
- [Playwright](https://playwright.dev)
- [Jest](https://jestjs.io)

---

**Document Version:** 1.0
**Author:** Frontend Architecture Team
**Next Review:** 2026-01-22
