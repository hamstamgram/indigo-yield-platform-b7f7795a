# Indigo Yield Platform - Design System Documentation

**Version:** 1.0.0
**Last Updated:** November 22, 2025
**Maintainer:** Design & Engineering Team

---

## Table of Contents

1. [Introduction](#introduction)
2. [Design Principles](#design-principles)
3. [Color System](#color-system)
4. [Typography](#typography)
5. [Spacing & Layout](#spacing--layout)
6. [Component Library](#component-library)
7. [Interaction Patterns](#interaction-patterns)
8. [Accessibility](#accessibility)
9. [Dark Mode](#dark-mode)
10. [Usage Guidelines](#usage-guidelines)

---

## Introduction

The Indigo Yield Platform design system provides a comprehensive set of design tokens, components, and patterns to ensure consistency across all user interfaces. Built on **shadcn/ui** and **Tailwind CSS**, our design system emphasizes clarity, accessibility, and professional financial aesthetics.

### Goals

- **Consistency**: Unified visual language across web and mobile platforms
- **Accessibility**: WCAG 2.1 AA compliance for all components
- **Scalability**: Modular architecture supporting rapid feature development
- **Maintainability**: Clear documentation and design tokens for easy updates
- **Performance**: Optimized components with minimal runtime overhead

### Technology Stack

- **UI Framework**: React 18 + TypeScript
- **Styling**: Tailwind CSS 3.4
- **Component Library**: shadcn/ui (Radix UI primitives)
- **Typography**: Montserrat (Google Fonts)
- **Icons**: Heroicons, Lucide React

---

## Design Principles

### 1. Clarity First
Financial data demands precision. Every component prioritizes readability and clear information hierarchy.

**Implementation:**
- Minimum 4.5:1 contrast ratio for all text
- Clear visual separation between interactive elements
- Consistent spacing for visual rhythm

### 2. Trust Through Design
Professional aesthetics that inspire confidence in financial management.

**Implementation:**
- Muted color palette with strategic accent colors
- Consistent brand presence without overwhelming users
- Polished micro-interactions and transitions

### 3. Responsive by Default
Seamless experience across desktop, tablet, and mobile devices.

**Implementation:**
- Mobile-first design approach
- Flexible grid system
- Touch-friendly interaction targets (minimum 44×44px)

### 4. Accessible to All
Universal design ensuring usability for all users.

**Implementation:**
- Keyboard navigation support
- Screen reader optimization
- Focus indicators on all interactive elements
- Color not used as sole indicator of meaning

---

## Color System

### Design Token Architecture

Our color system uses CSS custom properties (variables) for dynamic theming. All colors are defined in HSL format for easier manipulation and better dark mode support.

### Foundation Colors

#### Light Mode

**Background Colors**
```css
--background: 0 0% 100%;           /* #FFFFFF - Main background */
--foreground: 222.2 84% 4.9%;      /* #020817 - Main text */
--card: 0 0% 100%;                 /* #FFFFFF - Card backgrounds */
--card-foreground: 222.2 84% 4.9%; /* #020817 - Card text */
--popover: 0 0% 100%;              /* #FFFFFF - Popover backgrounds */
--popover-foreground: 222.2 84% 4.9%; /* #020817 - Popover text */
```

**Usage Example:**
```tsx
<div className="bg-background text-foreground">
  <Card className="bg-card text-card-foreground">
    Content here
  </Card>
</div>
```

**Brand Colors**
```css
--primary: 222.2 47.4% 11.2%;      /* #0F172A - Primary brand */
--primary-foreground: 210 40% 98%; /* #F8FAFC - Text on primary */
--secondary: 210 40% 96.1%;        /* #F1F5F9 - Secondary brand */
--secondary-foreground: 222.2 47.4% 11.2%; /* #0F172A - Text on secondary */
--accent: 210 40% 96.1%;           /* #F1F5F9 - Accent highlights */
--accent-foreground: 222.2 47.4% 11.2%; /* #0F172A - Text on accent */
```

**Usage Example:**
```tsx
<Button variant="default">Primary Action</Button>
<Button variant="secondary">Secondary Action</Button>
<Button variant="outline">Outline Action</Button>
```

**Functional Colors**
```css
--muted: 210 40% 96.1%;            /* #F1F5F9 - Subtle backgrounds */
--muted-foreground: 215.4 16.3% 40%; /* #64748B - Muted text (WCAG AA) */
--destructive: 0 84.2% 60.2%;      /* #EF4444 - Error/danger states */
--destructive-foreground: 210 40% 98%; /* #F8FAFC - Text on destructive */
--border: 214.3 31.8% 85%;         /* #E2E8F0 - Border color (enhanced) */
--input: 214.3 31.8% 91.4%;        /* #E2E8F0 - Input borders */
--ring: 222.2 84% 4.9%;            /* #020817 - Focus rings */
```

**Usage Example:**
```tsx
<Alert variant="destructive">
  <AlertDescription>Error message</AlertDescription>
</Alert>

<Input className="border-input focus-visible:ring-ring" />
```

**Sidebar Colors**
```css
--sidebar-background: 0 0% 98%;    /* #FAFAFA - Sidebar bg */
--sidebar-foreground: 240 5.3% 26.1%; /* #3F3F46 - Sidebar text */
--sidebar-primary: 240 5.9% 10%;   /* #18181B - Active items */
--sidebar-primary-foreground: 0 0% 98%; /* #FAFAFA - Active text */
--sidebar-accent: 240 4.8% 95.9%;  /* #F4F4F5 - Hover states */
--sidebar-accent-foreground: 240 5.9% 10%; /* #18181B - Hover text */
--sidebar-border: 220 13% 91%;     /* #E4E4E7 - Dividers */
--sidebar-ring: 217.2 91.2% 59.8%; /* #3B82F6 - Focus indicator */
```

#### Dark Mode

All color tokens automatically switch in dark mode using `.dark` class:

```css
.dark {
  --background: 222.2 84% 4.9%;      /* #020817 */
  --foreground: 210 40% 98%;         /* #F8FAFC */
  --primary: 210 40% 98%;            /* #F8FAFC */
  --primary-foreground: 222.2 47.4% 11.2%; /* #0F172A */
  /* ... additional tokens */
}
```

### Color Usage Guidelines

#### Do's
- Use semantic tokens (`primary`, `destructive`) instead of raw colors
- Maintain consistent contrast ratios (min 4.5:1 for text)
- Test in both light and dark modes
- Use `muted` for disabled states
- Use `destructive` for errors, warnings, and dangerous actions

#### Don'ts
- Don't use hardcoded hex values in components
- Don't rely on color alone to convey information
- Don't use low-contrast color combinations
- Don't override CSS variables without design system approval

### Accessibility Requirements

All color combinations meet **WCAG 2.1 Level AA** standards:
- **Normal text**: Minimum 4.5:1 contrast ratio
- **Large text** (18px+ or 14px+ bold): Minimum 3:1 contrast ratio
- **UI components**: Minimum 3:1 contrast ratio

**Testing Tools:**
- Chrome DevTools Lighthouse
- axe DevTools
- Playwright accessibility tests

---

## Typography

### Font Family

**Primary Font**: **Montserrat** (sans-serif)

```css
@import '@fontsource/montserrat/400.css';
@import '@fontsource/montserrat/500.css';
@import '@fontsource/montserrat/600.css';
@import '@fontsource/montserrat/700.css';
```

**Weights Available:**
- 400 (Regular) - Body text
- 500 (Medium) - Emphasized text
- 600 (Semi-Bold) - Headings, buttons
- 700 (Bold) - Primary headings

### Type Scale

Our type scale uses a modular scale for consistent visual hierarchy:

#### Desktop Type Scale

```tsx
// Heading 1 - Page titles
<h1 className="scroll-m-20 text-4xl font-bold tracking-tight lg:text-5xl">
  Page Title
</h1>

// Heading 2 - Section titles
<h2 className="scroll-m-20 border-b pb-2 text-3xl font-semibold tracking-tight first:mt-0">
  Section Title
</h2>

// Heading 3 - Subsection titles
<h3 className="scroll-m-20 text-2xl font-semibold tracking-tight">
  Subsection Title
</h3>

// Heading 4 - Card titles
<h4 className="scroll-m-20 text-xl font-semibold tracking-tight">
  Card Title
</h4>

// Body Large
<p className="leading-7 [&:not(:first-child)]:mt-6">
  Large body text for emphasis
</p>

// Body Regular (Default)
<p className="text-base leading-relaxed">
  Standard body text
</p>

// Body Small - Captions, labels
<p className="text-sm text-muted-foreground">
  Small text for metadata
</p>

// Caption - Timestamps, footnotes
<p className="text-xs text-muted-foreground">
  Extra small text
</p>
```

#### Mobile Type Scale

Responsive adjustments automatically apply:
- H1: 2.5rem (mobile) → 3rem (desktop)
- H2: 2rem (mobile) → 2.25rem (desktop)
- H3: 1.5rem (mobile) → 1.875rem (desktop)
- Body: 1rem (consistent across devices)

### Typography Components

#### Inline Text

```tsx
// Emphasized text
<strong className="font-semibold">Important information</strong>

// Code snippets
<code className="relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm font-semibold">
  inline code
</code>

// Links
<a className="font-medium text-primary underline underline-offset-4 hover:text-primary/80">
  Link text
</a>
```

#### Lists

```tsx
// Unordered lists
<ul className="my-6 ml-6 list-disc [&>li]:mt-2">
  <li>List item one</li>
  <li>List item two</li>
</ul>

// Ordered lists
<ol className="my-6 ml-6 list-decimal [&>li]:mt-2">
  <li>First item</li>
  <li>Second item</li>
</ol>
```

### Line Height Guidelines

- **Headings**: `1.2` (tight) - Maximizes visual impact
- **Body text**: `1.6` (relaxed) - Enhances readability
- **Captions**: `1.4` (normal) - Compact but readable

### Letter Spacing

```tsx
// Tight tracking for headings
className="tracking-tight"    // -0.025em

// Normal tracking for body (default)
className="tracking-normal"   // 0em

// Wide tracking for uppercase labels
className="tracking-wide uppercase text-xs"  // 0.025em
```

### Typography Best Practices

#### Do's
- Use semantic HTML elements (`<h1>`, `<p>`, etc.)
- Maintain consistent hierarchy (don't skip heading levels)
- Use `text-muted-foreground` for secondary text
- Keep line lengths between 50-75 characters for readability
- Use font weights purposefully (Regular for body, Semi-Bold for emphasis)

#### Don'ts
- Don't use multiple font families
- Don't create custom font sizes outside the type scale
- Don't use ALL CAPS for long text (use `uppercase` class sparingly)
- Don't set line-height below 1.2 or above 2.0

---

## Spacing & Layout

### Spacing Scale

Our spacing system uses Tailwind's default 4px base unit:

```
4px   → space-1   (0.25rem)
8px   → space-2   (0.5rem)
12px  → space-3   (0.75rem)
16px  → space-4   (1rem)     ← Base unit
20px  → space-5   (1.25rem)
24px  → space-6   (1.5rem)
32px  → space-8   (2rem)
40px  → space-10  (2.5rem)
48px  → space-12  (3rem)
64px  → space-16  (4rem)
80px  → space-20  (5rem)
96px  → space-24  (6rem)
```

### Layout Components

#### Container

```tsx
// Max-width container with responsive padding
<div className="container mx-auto px-4 sm:px-6 lg:px-8">
  Content
</div>
```

**Breakpoints:**
- `sm`: 640px
- `md`: 768px
- `lg`: 1024px
- `xl`: 1280px
- `2xl`: 1536px

#### Grid System

```tsx
// Responsive grid
<div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
  <Card>Column 1</Card>
  <Card>Column 2</Card>
  <Card>Column 3</Card>
</div>
```

#### Flexbox Layouts

```tsx
// Horizontal layout with spacing
<div className="flex items-center gap-4">
  <Button>Action 1</Button>
  <Button>Action 2</Button>
</div>

// Vertical stack
<div className="flex flex-col gap-6">
  <Section>Content 1</Section>
  <Section>Content 2</Section>
</div>
```

### Border Radius

```css
--radius: 0.5rem;  /* 8px - Default corner radius */
```

**Usage:**
```tsx
// Default radius
className="rounded"       // 8px

// Specific corners
className="rounded-t"     // Top corners only
className="rounded-lg"    // 12px
className="rounded-full"  // Pill/circular
```

### Spacing Best Practices

#### Component Internal Spacing
- **Buttons**: `px-4 py-2` (horizontal 16px, vertical 8px)
- **Cards**: `p-6` (24px padding)
- **Inputs**: `px-3 py-2` (horizontal 12px, vertical 8px)
- **Modals**: `p-6` or `p-8` depending on size

#### Layout Spacing
- **Section gaps**: `space-y-8` or `space-y-12` (32-48px)
- **Component gaps**: `gap-4` or `gap-6` (16-24px)
- **List items**: `space-y-2` or `space-y-4` (8-16px)

---

## Component Library

### Button

**File**: `/src/components/ui/button.tsx`

#### Variants

```tsx
import { Button } from '@/components/ui/button';

// Default (Primary)
<Button variant="default">Primary Action</Button>

// Secondary
<Button variant="secondary">Secondary Action</Button>

// Destructive
<Button variant="destructive">Delete Account</Button>

// Outline
<Button variant="outline">Cancel</Button>

// Ghost (subtle)
<Button variant="ghost">View Details</Button>

// Link (no background)
<Button variant="link">Learn More</Button>
```

#### Sizes

```tsx
// Small
<Button size="sm">Small Button</Button>

// Default
<Button size="default">Default Button</Button>

// Large
<Button size="lg">Large Button</Button>

// Icon only
<Button size="icon">
  <ChevronRightIcon className="h-4 w-4" />
</Button>
```

#### States

```tsx
// Disabled
<Button disabled>Disabled Button</Button>

// Loading (custom implementation)
<Button disabled>
  <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
  Loading...
</Button>
```

### Card

**File**: `/src/components/ui/card.tsx`

```tsx
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';

<Card>
  <CardHeader>
    <CardTitle>Card Title</CardTitle>
    <CardDescription>Optional description</CardDescription>
  </CardHeader>
  <CardContent>
    Main content area
  </CardContent>
  <CardFooter>
    <Button>Action</Button>
  </CardFooter>
</Card>
```

### Input

**File**: `/src/components/ui/input.tsx`

```tsx
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

<div className="space-y-2">
  <Label htmlFor="email">Email</Label>
  <Input
    id="email"
    type="email"
    placeholder="you@example.com"
    aria-describedby="email-error"
  />
</div>
```

### Form Components

**File**: `/src/components/ui/form.tsx` (React Hook Form integration)

```tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';

const formSchema = z.object({
  username: z.string().min(2, 'Username must be at least 2 characters'),
});

function MyForm() {
  const form = useForm({
    resolver: zodResolver(formSchema),
  });

  return (
    <Form {...form}>
      <FormField
        control={form.control}
        name="username"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Username</FormLabel>
            <FormControl>
              <Input placeholder="Enter username" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </Form>
  );
}
```

### Dialog/Modal

**File**: `/src/components/ui/dialog.tsx`

```tsx
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';

<Dialog>
  <DialogTrigger asChild>
    <Button>Open Dialog</Button>
  </DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Dialog Title</DialogTitle>
      <DialogDescription>
        Description of the dialog purpose
      </DialogDescription>
    </DialogHeader>
    <div>Dialog content goes here</div>
    <DialogFooter>
      <Button variant="outline">Cancel</Button>
      <Button>Confirm</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

### Alert

**File**: `/src/components/ui/alert.tsx`

```tsx
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { InfoIcon } from 'lucide-react';

// Info alert
<Alert>
  <InfoIcon className="h-4 w-4" />
  <AlertTitle>Information</AlertTitle>
  <AlertDescription>
    This is an informational message.
  </AlertDescription>
</Alert>

// Destructive alert
<Alert variant="destructive">
  <AlertCircleIcon className="h-4 w-4" />
  <AlertTitle>Error</AlertTitle>
  <AlertDescription>
    An error occurred. Please try again.
  </AlertDescription>
</Alert>
```

### Toast Notifications

**File**: `/src/components/ui/sonner.tsx` (using Sonner library)

```tsx
import { toast } from 'sonner';

// Success toast
toast.success('Portfolio updated successfully');

// Error toast
toast.error('Failed to update portfolio');

// Info toast
toast.info('New statement available');

// Custom toast
toast('Custom message', {
  description: 'Additional details',
  action: {
    label: 'Undo',
    onClick: () => console.log('Undo'),
  },
});
```

### Complete Component List

58 UI components available:

- **Layout**: Card, Separator, Scroll Area, Resizable, Sheet, Drawer
- **Forms**: Input, Textarea, Select, Checkbox, Radio Group, Switch, Slider, Calendar, Date Picker
- **Feedback**: Alert, Toast (Sonner), Progress, Loading Spinner, Loading Skeletons, Empty State
- **Overlays**: Dialog, Alert Dialog, Popover, Tooltip, Hover Card, Context Menu, Dropdown Menu
- **Navigation**: Tabs, Accordion, Breadcrumb, Navigation Menu, Command (Command Palette)
- **Data Display**: Table, Optimized Table, Badge, Avatar, Chart (Chart.js wrapper)
- **Interactive**: Button, Toggle, Toggle Group, Carousel, Collapsible
- **Utility**: Label, Aspect Ratio, Input OTP, Form (React Hook Form)

See [Component Reference](/docs/COMPONENT_REFERENCE.md) for detailed documentation of each component.

---

## Interaction Patterns

### Hover States

All interactive elements provide visual feedback on hover:

```tsx
// Button hover (automatic)
<Button>Hover me</Button>

// Card hover
<Card className="hover:shadow-lg transition-shadow cursor-pointer">
  Clickable card
</Card>

// Link hover
<a className="hover:text-primary/80 transition-colors">
  Link
</a>
```

### Focus States

**Keyboard navigation** is fully supported with visible focus indicators:

```tsx
// Default focus ring (automatic on interactive elements)
className="focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"

// Custom focus color
className="focus-visible:ring-primary"
```

**Testing Focus States:**
- Tab through all interactive elements
- Verify focus ring visibility in both themes
- Ensure logical tab order

### Loading States

```tsx
// Button loading
<Button disabled>
  <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
  Processing...
</Button>

// Skeleton loaders
import { Skeleton } from '@/components/ui/loading-skeletons';

<div className="space-y-2">
  <Skeleton className="h-4 w-[250px]" />
  <Skeleton className="h-4 w-[200px]" />
</div>

// Loading spinner
import { LoadingSpinner } from '@/components/ui/loading-spinner';

<LoadingSpinner size="lg" />
```

### Empty States

```tsx
import { EmptyState } from '@/components/ui/empty-state';

<EmptyState
  icon={InboxIcon}
  title="No transactions yet"
  description="Your transaction history will appear here once you make your first investment."
  action={
    <Button>
      <PlusIcon className="mr-2 h-4 w-4" />
      New Transaction
    </Button>
  }
/>
```

### Error States

```tsx
// Form field errors
<FormMessage>This field is required</FormMessage>

// Alert errors
<Alert variant="destructive">
  <AlertCircleIcon className="h-4 w-4" />
  <AlertTitle>Error</AlertTitle>
  <AlertDescription>
    Unable to process request. Please try again.
  </AlertDescription>
</Alert>

// Toast errors
toast.error('Operation failed', {
  description: 'Please check your connection and retry.',
});
```

### Animations

Subtle animations enhance user experience without distraction:

```tsx
// Fade in/out
className="animate-in fade-in duration-200"
className="animate-out fade-out duration-200"

// Slide animations
className="animate-in slide-in-from-bottom-4"
className="animate-in slide-in-from-right-4"

// Custom shimmer effect (for image loading)
className="animate-shimmer"
```

**Performance Guidelines:**
- Prefer CSS transitions over JavaScript animations
- Use `transform` and `opacity` for smooth 60fps animations
- Keep animation duration under 300ms for UI interactions
- Respect `prefers-reduced-motion` media query

---

## Accessibility

### ARIA Labels

All interactive components include proper ARIA attributes:

```tsx
// Button with icon only
<Button size="icon" aria-label="Close dialog">
  <XIcon className="h-4 w-4" />
</Button>

// Input with error
<Input
  aria-invalid={hasError}
  aria-describedby="error-message"
/>
{hasError && <span id="error-message" className="text-destructive text-sm">Error message</span>}

// Dialog
<Dialog>
  <DialogContent aria-describedby="dialog-description">
    <DialogTitle>Confirm Action</DialogTitle>
    <DialogDescription id="dialog-description">
      This action cannot be undone.
    </DialogDescription>
  </DialogContent>
</Dialog>
```

### Keyboard Navigation

**Supported Interactions:**
- **Tab/Shift+Tab**: Navigate between focusable elements
- **Enter/Space**: Activate buttons, toggle checkboxes
- **Escape**: Close modals, cancel operations
- **Arrow keys**: Navigate menus, select options

**Implementation:**
```tsx
// Ensure all interactive elements are keyboard accessible
<div
  role="button"
  tabIndex={0}
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      handleClick();
    }
  }}
>
  Custom interactive element
</div>
```

### Screen Reader Support

```tsx
// Visually hidden text for screen readers
<span className="sr-only">
  Additional context for screen readers
</span>

// Live regions for dynamic content
<div aria-live="polite" aria-atomic="true">
  {statusMessage}
</div>

// Loading state announcement
<div role="status" aria-live="polite" className="sr-only">
  {isLoading ? 'Loading data...' : 'Data loaded successfully'}
</div>
```

### Color Contrast

All text meets **WCAG AA** standards:
- **Normal text** (< 18px): 4.5:1 contrast ratio
- **Large text** (≥ 18px): 3:1 contrast ratio
- **UI components**: 3:1 contrast ratio

**Testing:**
```bash
# Run automated accessibility tests
npm run test:e2e -- --grep "@a11y"

# Playwright accessibility audit
npm run audit:playwright
```

### Focus Management

```tsx
// Trap focus within modal
import { FocusTrap } from '@/components/ui/focus-trap';

<Dialog>
  <FocusTrap>
    <DialogContent>
      Modal content
    </DialogContent>
  </FocusTrap>
</Dialog>

// Restore focus after modal closes (automatic with Radix UI)
```

---

## Dark Mode

### Implementation

Dark mode is implemented using `next-themes` with automatic system preference detection:

```tsx
// app/layout.tsx
import { ThemeProvider } from 'next-themes';

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
```

### Theme Toggle

```tsx
import { useTheme } from 'next-themes';
import { MoonIcon, SunIcon } from 'lucide-react';

function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
    >
      <SunIcon className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <MoonIcon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}
```

### Design Considerations

When designing for dark mode:

**Do's:**
- Use semantic color tokens (automatically theme-aware)
- Test all components in both modes
- Ensure sufficient contrast in both themes
- Use `dark:` prefix for dark mode-specific styles

**Don'ts:**
- Don't use pure black (#000000) - use `--background` token
- Don't use pure white (#FFFFFF) in dark mode
- Don't invert colors mechanically - adjust for readability
- Don't forget to test images/icons in dark mode

### Custom Dark Mode Styles

```tsx
// Conditional styling
<div className="bg-white dark:bg-slate-800 text-black dark:text-white">
  Content
</div>

// Border adjustments
<div className="border-gray-200 dark:border-gray-700">
  Bordered content
</div>
```

---

## Usage Guidelines

### Component Selection

**When to use each component:**

- **Button vs Link**: Use `<Button>` for actions, `<Link>` for navigation
- **Dialog vs Drawer**: Use `Dialog` for desktop, `Drawer` for mobile-first experiences
- **Select vs Radio Group**: Use `Select` for 5+ options, `Radio Group` for 2-4 options
- **Toast vs Alert**: Use `Toast` for temporary notifications, `Alert` for persistent messages

### Responsive Design

**Mobile-First Approach:**

```tsx
// Base styles are mobile, add breakpoints for larger screens
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
  {/* Responsive grid */}
</div>

<div className="text-sm md:text-base lg:text-lg">
  {/* Responsive typography */}
</div>
```

**Touch Target Sizes:**
- Minimum 44×44px for all interactive elements on mobile
- Add padding to small icons to meet touch target requirements

### Performance Best Practices

**Code Splitting:**
```tsx
// Lazy load heavy components
import dynamic from 'next/dynamic';

const Chart = dynamic(() => import('@/components/ui/chart'), {
  loading: () => <Skeleton className="h-[300px]" />,
  ssr: false,
});
```

**Optimize Images:**
```tsx
import Image from 'next/image';

<Image
  src="/logo.png"
  alt="Indigo Yield"
  width={200}
  height={50}
  priority // For above-the-fold images
/>
```

### Validation & Error Handling

**Form Validation:**
```tsx
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

const schema = z.object({
  amount: z.number().positive('Amount must be positive'),
  email: z.string().email('Invalid email address'),
});

const form = useForm({
  resolver: zodResolver(schema),
});
```

**Error Display:**
```tsx
// Inline field errors
<FormMessage>
  {form.formState.errors.email?.message}
</FormMessage>

// Page-level errors
<Alert variant="destructive">
  <AlertTitle>Submission Failed</AlertTitle>
  <AlertDescription>
    {errorMessage}
  </AlertDescription>
</Alert>
```

---

## Resources

### Design Files
- **Figma**: [Design System Specification](../FIGMA_DESIGN_SYSTEM_SPEC.md)
- **Component Library**: [Component Reference](./COMPONENT_REFERENCE.md)
- **Storybook**: Run `npm run storybook` to explore components interactively

### External Documentation
- [shadcn/ui Documentation](https://ui.shadcn.com)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [Radix UI Primitives](https://www.radix-ui.com/primitives)
- [Next.js Documentation](https://nextjs.org/docs)

### Related Guides
- [Internationalization Guide](./I18N_GUIDE.md)
- [API Documentation](./API_REFERENCE.md)
- [Developer Onboarding](./DEVELOPER_ONBOARDING.md)
- [Accessibility Testing](./ACCESSIBILITY_TESTING.md)

---

**Last Updated:** November 22, 2025
**Maintained By:** Design & Engineering Team
**Version:** 1.0.0

For questions or contributions, please refer to [CONTRIBUTING.md](../CONTRIBUTING.md).
