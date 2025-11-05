# Component Library Blueprint

**Comprehensive guide to all reusable components for the Indigo Yield Platform**

---

## Component Architecture Overview

```
Total Components: ~180
├── UI Primitives (Shadcn/ui): 40
├── Layout Components: 12
├── Form Components: 25
├── Data Display: 30
├── Navigation: 15
├── Feedback: 18
├── Domain-Specific: 40
```

---

## 1. UI Primitives (Shadcn/ui Base)

### Core Components (40 components)

```typescript
// components/ui/
├── accordion.tsx          // Collapsible content
├── alert.tsx             // Alert messages
├── alert-dialog.tsx      // Confirmation dialogs
├── avatar.tsx            // User avatars
├── badge.tsx             // Status badges
├── button.tsx            // Buttons
├── calendar.tsx          // Date picker calendar
├── card.tsx              // Content cards
├── checkbox.tsx          // Checkboxes
├── collapsible.tsx       // Collapsible sections
├── command.tsx           // Command palette
├── context-menu.tsx      // Right-click menus
├── dialog.tsx            // Modal dialogs
├── dropdown-menu.tsx     // Dropdown menus
├── form.tsx              // Form wrapper
├── hover-card.tsx        // Hover tooltips
├── input.tsx             // Text inputs
├── label.tsx             // Form labels
├── menubar.tsx           // Menu bar
├── navigation-menu.tsx   // Navigation menu
├── popover.tsx           // Popovers
├── progress.tsx          // Progress bars
├── radio-group.tsx       // Radio buttons
├── scroll-area.tsx       // Scrollable areas
├── select.tsx            // Select dropdowns
├── separator.tsx         // Dividers
├── sheet.tsx             // Side sheets
├── skeleton.tsx          // Loading skeletons
├── slider.tsx            // Range sliders
├── switch.tsx            // Toggle switches
├── table.tsx             // Data tables
├── tabs.tsx              // Tab navigation
├── textarea.tsx          // Multi-line inputs
├── toast.tsx             // Toast notifications
├── toggle.tsx            // Toggle buttons
├── toggle-group.tsx      // Toggle button groups
├── tooltip.tsx           // Tooltips
└── sonner.tsx            // Toast notifications (Sonner)
```

### Custom UI Extensions

```typescript
// components/ui/custom/
├── currency-input.tsx         // Currency input with formatting
├── password-input.tsx         // Password with show/hide
├── phone-input.tsx           // Phone number input
├── date-range-picker.tsx     // Date range selector
├── multi-select.tsx          // Multi-select dropdown
├── file-upload.tsx           // File upload with preview
├── color-picker.tsx          // Color picker
├── rich-text-editor.tsx      // WYSIWYG editor
└── code-editor.tsx           // Code editor
```

---

## 2. Layout Components

### Main Layouts

```typescript
// components/layouts/AppLayout.tsx
export function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
      <Footer />
    </div>
  );
}

// components/layouts/DashboardLayout.tsx
export function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen">
      <DashboardHeader />
      <div className="flex">
        <DashboardSidebar />
        <main className="flex-1 p-8 bg-gray-50">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

// components/layouts/AdminLayout.tsx
export function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-100">
      <AdminHeader />
      <div className="flex">
        <AdminSidebar />
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  );
}

// components/layouts/AuthLayout.tsx
export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex">
      <div className="flex-1 flex items-center justify-center p-8">
        {children}
      </div>
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-600 to-indigo-700">
        <AuthBranding />
      </div>
    </div>
  );
}
```

### Layout Parts

```typescript
// components/layouts/
├── Header.tsx              // Main header
├── DashboardHeader.tsx     // Dashboard header
├── AdminHeader.tsx         // Admin header
├── Sidebar.tsx             // Main sidebar
├── DashboardSidebar.tsx    // Dashboard sidebar
├── AdminSidebar.tsx        // Admin sidebar
├── Footer.tsx              // Footer
├── MobileNav.tsx           // Mobile navigation
├── UserMenu.tsx            // User dropdown menu
├── NotificationBell.tsx    // Notification icon
├── SearchCommand.tsx       // Global search
└── Breadcrumbs.tsx         // Breadcrumb navigation
```

---

## 3. Form Components

### Form Building Blocks

```typescript
// components/forms/FormField.tsx
interface FormFieldProps {
  name: string;
  label: string;
  description?: string;
  required?: boolean;
  error?: string;
  children: ReactNode;
}

export function FormField({
  name,
  label,
  description,
  required,
  error,
  children,
}: FormFieldProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor={name}>
        {label}
        {required && <span className="text-destructive ml-1">*</span>}
      </Label>
      {description && (
        <p className="text-sm text-muted-foreground">{description}</p>
      )}
      {children}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}

// components/forms/FormSection.tsx
export function FormSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">{title}</h3>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      <div className="space-y-4">{children}</div>
    </div>
  );
}
```

### Specialized Form Components

```typescript
// components/forms/
├── LoginForm.tsx              // Login form
├── RegisterForm.tsx           // Registration form
├── DepositForm.tsx           // Deposit form
├── WithdrawalForm.tsx        // Withdrawal form
├── TransferForm.tsx          // Transfer form
├── ProfileForm.tsx           // Profile edit form
├── KycForm.tsx               // KYC submission form
├── BankAccountForm.tsx       // Bank account form
├── CardForm.tsx              // Credit card form
├── AddressForm.tsx           // Address form
├── ContactForm.tsx           // Contact form
├── PasswordChangeForm.tsx    // Password change
├── TwoFactorSetupForm.tsx    // 2FA setup
├── SearchForm.tsx            // Search form
├── FilterForm.tsx            // Filter form
└── ReportConfigForm.tsx      // Report configuration
```

### Form Validation Schemas

```typescript
// lib/validations/
├── auth.schemas.ts           // Auth validations
├── transaction.schemas.ts    // Transaction validations
├── profile.schemas.ts        // Profile validations
├── kyc.schemas.ts           // KYC validations
└── common.schemas.ts        // Common validations

// Example: auth.schemas.ts
import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  rememberMe: z.boolean().optional(),
});

export const registerSchema = z.object({
  firstName: z.string().min(2, 'First name is required'),
  lastName: z.string().min(2, 'Last name is required'),
  email: z.string().email('Invalid email address'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Must contain uppercase')
    .regex(/[a-z]/, 'Must contain lowercase')
    .regex(/[0-9]/, 'Must contain number')
    .regex(/[^A-Za-z0-9]/, 'Must contain special character'),
  confirmPassword: z.string(),
  phone: z.string().optional(),
  acceptTerms: z.boolean().refine(val => val === true, {
    message: 'You must accept the terms',
  }),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

export const depositSchema = z.object({
  amount: z.number()
    .min(100, 'Minimum deposit is $100')
    .max(1000000, 'Maximum deposit is $1,000,000'),
  method: z.enum(['bank_transfer', 'card', 'wire', 'crypto']),
  currency: z.string().default('USD'),
  notes: z.string().max(500, 'Notes too long').optional(),
});
```

---

## 4. Data Display Components

### Tables

```typescript
// components/data/DataTable.tsx
import { ColumnDef } from '@tanstack/react-table';

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  searchable?: boolean;
  filterable?: boolean;
  pagination?: boolean;
  onRowClick?: (row: TData) => void;
}

// components/data/TransactionTable.tsx
export function TransactionTable({ transactions }: { transactions: Transaction[] }) {
  const columns: ColumnDef<Transaction>[] = [
    {
      accessorKey: 'date',
      header: 'Date',
      cell: ({ row }) => formatDate(row.original.date),
    },
    {
      accessorKey: 'type',
      header: 'Type',
      cell: ({ row }) => <TransactionTypeBadge type={row.original.type} />,
    },
    {
      accessorKey: 'amount',
      header: 'Amount',
      cell: ({ row }) => formatCurrency(row.original.amount),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
  ];

  return <DataTable columns={columns} data={transactions} />;
}

// components/data/
├── DataTable.tsx             // Generic data table
├── TransactionTable.tsx      // Transaction table
├── UserTable.tsx            // User table
├── PortfolioTable.tsx       // Portfolio table
├── HoldingsTable.tsx        // Holdings table
├── DocumentTable.tsx        // Document table
├── AuditLogTable.tsx        // Audit log table
└── ReportTable.tsx          // Report table
```

### Cards

```typescript
// components/cards/
├── StatCard.tsx              // Statistic card
├── PortfolioCard.tsx        // Portfolio summary card
├── AssetCard.tsx            // Asset card
├── TransactionCard.tsx      // Transaction card
├── UserCard.tsx             // User profile card
├── NotificationCard.tsx     // Notification card
├── DocumentCard.tsx         // Document card
├── ActivityCard.tsx         // Activity card
└── MetricCard.tsx           // Metric card

// Example: StatCard.tsx
interface StatCardProps {
  title: string;
  value: string | number;
  change?: number;
  changeType?: 'increase' | 'decrease';
  icon?: ReactNode;
  trend?: number[];
}

export function StatCard({
  title,
  value,
  change,
  changeType,
  icon,
  trend,
}: StatCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {change !== undefined && (
          <p className={cn(
            'text-xs',
            changeType === 'increase' ? 'text-green-600' : 'text-red-600'
          )}>
            {changeType === 'increase' ? '+' : ''}{change}% from last month
          </p>
        )}
        {trend && <MiniChart data={trend} />}
      </CardContent>
    </Card>
  );
}
```

### Lists

```typescript
// components/lists/
├── TransactionList.tsx       // Transaction list
├── ActivityList.tsx          // Activity feed list
├── NotificationList.tsx      // Notification list
├── DocumentList.tsx          // Document list
├── UserList.tsx             // User list
├── CommentList.tsx          // Comment list
└── HistoryList.tsx          // History list

// Example: ActivityList.tsx
export function ActivityList({ activities }: { activities: Activity[] }) {
  return (
    <div className="space-y-4">
      {activities.map((activity) => (
        <div key={activity.id} className="flex items-start gap-4">
          <Avatar>
            <AvatarImage src={activity.user.avatar} />
            <AvatarFallback>{activity.user.initials}</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <p className="text-sm">
              <span className="font-medium">{activity.user.name}</span>
              {' '}
              {activity.action}
            </p>
            <p className="text-xs text-muted-foreground">
              {formatRelativeTime(activity.timestamp)}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
```

---

## 5. Charts & Visualizations

```typescript
// components/charts/
├── LineChart.tsx             // Line chart
├── BarChart.tsx             // Bar chart
├── PieChart.tsx             // Pie chart
├── AreaChart.tsx            // Area chart
├── DonutChart.tsx           // Donut chart
├── CandlestickChart.tsx     // Candlestick chart
├── SparklineChart.tsx       // Sparkline mini chart
├── HeatmapChart.tsx         // Heatmap
├── GaugeChart.tsx           // Gauge/radial chart
└── TreemapChart.tsx         // Treemap chart

// Example: PerformanceChart.tsx
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface PerformanceChartProps {
  data: { date: string; value: number }[];
  height?: number;
}

export function PerformanceChart({ data, height = 300 }: PerformanceChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" />
        <YAxis />
        <Tooltip />
        <Line
          type="monotone"
          dataKey="value"
          stroke="#3b82f6"
          strokeWidth={2}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

// Example: AllocationPieChart.tsx
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

interface AllocationData {
  name: string;
  value: number;
  color: string;
}

export function AllocationPieChart({ data }: { data: AllocationData[] }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
          outerRadius={80}
          fill="#8884d8"
          dataKey="value"
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}
```

---

## 6. Navigation Components

```typescript
// components/navigation/
├── Sidebar.tsx               // Main sidebar
├── NavItem.tsx              // Navigation item
├── NavGroup.tsx             // Navigation group
├── MobileNav.tsx            // Mobile navigation
├── Breadcrumbs.tsx          // Breadcrumbs
├── TabNavigation.tsx        // Tab navigation
├── StepNavigation.tsx       // Step wizard navigation
├── Pagination.tsx           // Pagination
└── BackButton.tsx           // Back button

// Example: Sidebar.tsx
const navigationItems = [
  {
    title: 'Dashboard',
    icon: LayoutDashboard,
    href: '/dashboard',
  },
  {
    title: 'Portfolio',
    icon: Briefcase,
    href: '/dashboard/portfolio',
  },
  {
    title: 'Transactions',
    icon: Receipt,
    href: '/transactions',
  },
  // ... more items
];

export function Sidebar() {
  return (
    <aside className="w-64 bg-white border-r">
      <div className="p-4">
        <Logo />
      </div>
      <nav className="p-4 space-y-2">
        {navigationItems.map((item) => (
          <NavItem key={item.href} {...item} />
        ))}
      </nav>
    </aside>
  );
}

// Example: StepNavigation.tsx
interface Step {
  id: string;
  title: string;
  description?: string;
}

interface StepNavigationProps {
  steps: Step[];
  currentStep: number;
  onStepClick?: (step: number) => void;
}

export function StepNavigation({ steps, currentStep, onStepClick }: StepNavigationProps) {
  return (
    <nav className="flex items-center justify-between">
      {steps.map((step, index) => (
        <div key={step.id} className="flex items-center">
          <button
            onClick={() => onStepClick?.(index)}
            className={cn(
              'flex items-center justify-center w-10 h-10 rounded-full',
              index === currentStep
                ? 'bg-primary text-primary-foreground'
                : index < currentStep
                ? 'bg-green-500 text-white'
                : 'bg-gray-200 text-gray-500'
            )}
          >
            {index < currentStep ? <Check className="w-5 h-5" /> : index + 1}
          </button>
          <span className="ml-2 text-sm font-medium">{step.title}</span>
          {index < steps.length - 1 && (
            <div className="w-20 h-0.5 bg-gray-200 mx-4" />
          )}
        </div>
      ))}
    </nav>
  );
}
```

---

## 7. Feedback Components

```typescript
// components/feedback/
├── Alert.tsx                 // Alert message
├── AlertDialog.tsx          // Alert dialog
├── ConfirmDialog.tsx        // Confirmation dialog
├── LoadingSpinner.tsx       // Loading spinner
├── LoadingSkeleton.tsx      // Loading skeleton
├── EmptyState.tsx           // Empty state
├── ErrorState.tsx           // Error state
├── SuccessMessage.tsx       // Success message
├── ErrorMessage.tsx         // Error message
├── Toast.tsx                // Toast notification
├── ProgressBar.tsx          // Progress bar
├── StatusBadge.tsx          // Status badge
├── VerificationBadge.tsx    // Verification badge
└── Tooltip.tsx              // Tooltip

// Example: EmptyState.tsx
interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center">
      {icon && (
        <div className="w-16 h-16 mb-4 text-muted-foreground">
          {icon}
        </div>
      )}
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      {description && (
        <p className="text-sm text-muted-foreground mb-4 max-w-md">
          {description}
        </p>
      )}
      {action && (
        <Button onClick={action.onClick}>{action.label}</Button>
      )}
    </div>
  );
}

// Example: StatusBadge.tsx
type Status = 'pending' | 'approved' | 'rejected' | 'completed' | 'failed';

interface StatusBadgeProps {
  status: Status;
}

const statusConfig: Record<Status, { label: string; variant: string; className: string }> = {
  pending: {
    label: 'Pending',
    variant: 'secondary',
    className: 'bg-yellow-100 text-yellow-800',
  },
  approved: {
    label: 'Approved',
    variant: 'success',
    className: 'bg-green-100 text-green-800',
  },
  rejected: {
    label: 'Rejected',
    variant: 'destructive',
    className: 'bg-red-100 text-red-800',
  },
  completed: {
    label: 'Completed',
    variant: 'success',
    className: 'bg-blue-100 text-blue-800',
  },
  failed: {
    label: 'Failed',
    variant: 'destructive',
    className: 'bg-red-100 text-red-800',
  },
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = statusConfig[status];
  return (
    <Badge className={config.className}>
      {config.label}
    </Badge>
  );
}

// Example: ConfirmDialog.tsx
interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  variant?: 'default' | 'destructive';
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  variant = 'default',
}: ConfirmDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{cancelLabel}</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className={variant === 'destructive' ? 'bg-destructive' : ''}
          >
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
```

---

## 8. Domain-Specific Components

### Transaction Components

```typescript
// components/transactions/
├── TransactionCard.tsx       // Transaction display card
├── TransactionList.tsx       // Transaction list
├── TransactionFilters.tsx    // Filter controls
├── TransactionSearch.tsx     // Search bar
├── TransactionTypeBadge.tsx  // Type badge
├── TransactionActions.tsx    // Action buttons
└── TransactionTimeline.tsx   // Timeline view

// Example: TransactionCard.tsx
export function TransactionCard({ transaction }: { transaction: Transaction }) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between p-6">
        <div className="flex items-center gap-4">
          <div className={cn(
            'w-12 h-12 rounded-full flex items-center justify-center',
            transaction.type === 'deposit' ? 'bg-green-100' : 'bg-red-100'
          )}>
            {transaction.type === 'deposit' ? (
              <ArrowDownCircle className="text-green-600" />
            ) : (
              <ArrowUpCircle className="text-red-600" />
            )}
          </div>
          <div>
            <p className="font-medium">{transaction.description}</p>
            <p className="text-sm text-muted-foreground">
              {formatDate(transaction.date)}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-lg font-semibold">
            {formatCurrency(transaction.amount)}
          </p>
          <StatusBadge status={transaction.status} />
        </div>
      </CardContent>
    </Card>
  );
}
```

### Portfolio Components

```typescript
// components/portfolio/
├── PortfolioCard.tsx         // Portfolio summary
├── PortfolioList.tsx         // Portfolio list
├── PortfolioSelector.tsx     // Portfolio dropdown
├── AssetAllocation.tsx       // Allocation chart
├── HoldingsList.tsx         // Holdings table
├── PerformanceChart.tsx     // Performance graph
└── RiskIndicator.tsx        // Risk meter

// Example: AssetAllocation.tsx
export function AssetAllocation({ holdings }: { holdings: Holding[] }) {
  const allocationData = holdings.map(h => ({
    name: h.asset.name,
    value: h.value,
    color: h.asset.color,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Asset Allocation</CardTitle>
      </CardHeader>
      <CardContent>
        <AllocationPieChart data={allocationData} />
        <div className="mt-4 space-y-2">
          {holdings.map(holding => (
            <div key={holding.id} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: holding.asset.color }}
                />
                <span className="text-sm">{holding.asset.name}</span>
              </div>
              <span className="text-sm font-medium">
                {((holding.value / totalValue) * 100).toFixed(1)}%
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
```

### Admin Components

```typescript
// components/admin/
├── UserRow.tsx              // User table row
├── UserActions.tsx          // User action buttons
├── ApprovalQueue.tsx        // Approval queue
├── ApprovalCard.tsx         // Approval card
├── AuditLogEntry.tsx        // Audit log entry
├── SystemMetrics.tsx        // System metrics
└── AdminStats.tsx           // Admin statistics

// Example: ApprovalCard.tsx
export function ApprovalCard({ item }: { item: ApprovalItem }) {
  const { approveItem, rejectItem } = useApprovals();

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>{item.title}</CardTitle>
          <Badge>{item.type}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <p className="text-sm">{item.description}</p>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <User className="w-4 h-4" />
            <span>{item.submittedBy}</span>
            <span>•</span>
            <Clock className="w-4 h-4" />
            <span>{formatRelativeTime(item.submittedAt)}</span>
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex gap-2">
        <Button
          variant="outline"
          onClick={() => rejectItem(item.id)}
        >
          Reject
        </Button>
        <Button onClick={() => approveItem(item.id)}>
          Approve
        </Button>
      </CardFooter>
    </Card>
  );
}
```

---

## 9. Widget Components

```typescript
// components/widgets/
├── BalanceWidget.tsx         // Balance display
├── ReturnsWidget.tsx        // Returns display
├── ActivityWidget.tsx       // Recent activity
├── MarketWidget.tsx         // Market data
├── NewsWidget.tsx           // News feed
├── CalendarWidget.tsx       // Calendar widget
├── WeatherWidget.tsx        // Weather (if needed)
└── QuickActionsWidget.tsx   // Quick actions

// Example: BalanceWidget.tsx
export function BalanceWidget({ balance, change }: {
  balance: number;
  change: number;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Total Balance</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold">
          {formatCurrency(balance)}
        </div>
        <div className={cn(
          'text-sm mt-2',
          change >= 0 ? 'text-green-600' : 'text-red-600'
        )}>
          {change >= 0 ? '+' : ''}{change.toFixed(2)}% today
        </div>
      </CardContent>
    </Card>
  );
}
```

---

## 10. Utility Components

```typescript
// components/common/
├── PageHeader.tsx           // Page header
├── PageSkeleton.tsx        // Page loading skeleton
├── SearchBar.tsx           // Search bar
├── FilterBar.tsx           // Filter bar
├── SortDropdown.tsx        // Sort dropdown
├── DateRangePicker.tsx     // Date range picker
├── ExportButton.tsx        // Export button
├── RefreshButton.tsx       // Refresh button
├── CopyButton.tsx          // Copy to clipboard
├── ShareButton.tsx         // Share button
├── PrintButton.tsx         // Print button
└── BackToTop.tsx           // Back to top button

// Example: PageHeader.tsx
interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  breadcrumbs?: { label: string; href?: string }[];
}

export function PageHeader({
  title,
  description,
  actions,
  breadcrumbs,
}: PageHeaderProps) {
  return (
    <div className="mb-8">
      {breadcrumbs && <Breadcrumbs items={breadcrumbs} />}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{title}</h1>
          {description && (
            <p className="text-muted-foreground mt-2">{description}</p>
          )}
        </div>
        {actions && <div className="flex gap-2">{actions}</div>}
      </div>
    </div>
  );
}
```

---

## Component Usage Examples

### Building a Page with Components

```typescript
// pages/dashboard/PortfolioPage.tsx
export function PortfolioPage() {
  const { portfolios, isLoading } = usePortfolios();
  const { openModal } = useModal();

  if (isLoading) return <PageSkeleton />;

  if (portfolios.length === 0) {
    return (
      <EmptyState
        icon={<Briefcase className="w-16 h-16" />}
        title="No portfolios yet"
        description="Create your first portfolio to start investing"
        action={{
          label: 'Create Portfolio',
          onClick: () => openModal('create-portfolio'),
        }}
      />
    );
  }

  return (
    <DashboardLayout>
      <PageHeader
        title="Portfolios"
        description="Manage your investment portfolios"
        actions={
          <Button onClick={() => openModal('create-portfolio')}>
            <Plus className="w-4 h-4 mr-2" />
            New Portfolio
          </Button>
        }
      />

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {portfolios.map(portfolio => (
          <PortfolioCard key={portfolio.id} portfolio={portfolio} />
        ))}
      </div>

      <CreatePortfolioModal />
    </DashboardLayout>
  );
}
```

---

## Component Testing

```typescript
// __tests__/components/StatCard.test.tsx
import { render, screen } from '@testing-library/react';
import { StatCard } from '@/components/cards/StatCard';

describe('StatCard', () => {
  it('renders stat information correctly', () => {
    render(
      <StatCard
        title="Total Balance"
        value="$10,000"
        change={5.2}
        changeType="increase"
      />
    );

    expect(screen.getByText('Total Balance')).toBeInTheDocument();
    expect(screen.getByText('$10,000')).toBeInTheDocument();
    expect(screen.getByText('+5.2% from last month')).toBeInTheDocument();
  });
});
```

---

## Component Storybook Stories

```typescript
// stories/StatCard.stories.tsx
import type { Meta, StoryObj } from '@storybook/react';
import { StatCard } from '@/components/cards/StatCard';

const meta: Meta<typeof StatCard> = {
  title: 'Components/Cards/StatCard',
  component: StatCard,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof StatCard>;

export const Default: Story = {
  args: {
    title: 'Total Balance',
    value: '$10,000',
  },
};

export const WithIncrease: Story = {
  args: {
    title: 'Total Balance',
    value: '$10,000',
    change: 5.2,
    changeType: 'increase',
  },
};

export const WithDecrease: Story = {
  args: {
    title: 'Total Balance',
    value: '$10,000',
    change: -2.3,
    changeType: 'decrease',
  },
};
```

---

**Last Updated:** 2025-11-04
**Component Count:** ~180 components
**Coverage:** All 125 pages
