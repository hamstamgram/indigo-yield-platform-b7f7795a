# Component Architecture Strategy
## Indigo Yield Platform - 210+ Pages/Screens Implementation

---

## 1. Atomic Design System Architecture

### 1.1 Component Hierarchy (100+ Components Target)

```
src/
├── components/
│   ├── atoms/                    # 30+ atomic components
│   │   ├── buttons/
│   │   │   ├── Button.tsx
│   │   │   ├── IconButton.tsx
│   │   │   ├── LoadingButton.tsx
│   │   │   ├── SplitButton.tsx
│   │   │   └── FloatingActionButton.tsx
│   │   ├── inputs/
│   │   │   ├── Input.tsx
│   │   │   ├── TextArea.tsx
│   │   │   ├── Select.tsx
│   │   │   ├── Checkbox.tsx
│   │   │   ├── Radio.tsx
│   │   │   ├── Switch.tsx
│   │   │   ├── DatePicker.tsx
│   │   │   ├── TimePicker.tsx
│   │   │   ├── CurrencyInput.tsx
│   │   │   ├── PercentageInput.tsx
│   │   │   └── PhoneInput.tsx
│   │   ├── typography/
│   │   │   ├── Heading.tsx
│   │   │   ├── Text.tsx
│   │   │   ├── Label.tsx
│   │   │   ├── Caption.tsx
│   │   │   └── Link.tsx
│   │   ├── feedback/
│   │   │   ├── Spinner.tsx
│   │   │   ├── Skeleton.tsx
│   │   │   ├── Progress.tsx
│   │   │   ├── Badge.tsx
│   │   │   └── StatusIndicator.tsx
│   │   └── media/
│   │       ├── Avatar.tsx
│   │       ├── Icon.tsx
│   │       ├── Image.tsx
│   │       └── Logo.tsx
│   │
│   ├── molecules/                # 40+ molecular components
│   │   ├── forms/
│   │   │   ├── FormField.tsx
│   │   │   ├── FormGroup.tsx
│   │   │   ├── SearchBar.tsx
│   │   │   ├── FileUpload.tsx
│   │   │   ├── SignatureField.tsx
│   │   │   └── OTPInput.tsx
│   │   ├── navigation/
│   │   │   ├── Breadcrumb.tsx
│   │   │   ├── Pagination.tsx
│   │   │   ├── Tabs.tsx
│   │   │   ├── Steps.tsx
│   │   │   └── NavItem.tsx
│   │   ├── cards/
│   │   │   ├── Card.tsx
│   │   │   ├── StatsCard.tsx
│   │   │   ├── InfoCard.tsx
│   │   │   ├── ActionCard.tsx
│   │   │   └── MetricCard.tsx
│   │   ├── display/
│   │   │   ├── Alert.tsx
│   │   │   ├── Toast.tsx
│   │   │   ├── Tooltip.tsx
│   │   │   ├── EmptyState.tsx
│   │   │   ├── ErrorState.tsx
│   │   │   └── DataTable.tsx
│   │   └── overlays/
│   │       ├── Modal.tsx
│   │       ├── Drawer.tsx
│   │       ├── Popover.tsx
│   │       └── DropdownMenu.tsx
│   │
│   ├── organisms/                # 30+ organism components
│   │   ├── navigation/
│   │   │   ├── Sidebar.tsx
│   │   │   ├── TopNav.tsx
│   │   │   ├── MobileNav.tsx
│   │   │   └── UserMenu.tsx
│   │   ├── data-display/
│   │   │   ├── DataGrid.tsx
│   │   │   ├── ChartCard.tsx
│   │   │   ├── Dashboard.tsx
│   │   │   ├── Timeline.tsx
│   │   │   └── ActivityFeed.tsx
│   │   ├── forms/
│   │   │   ├── MultiStepForm.tsx
│   │   │   ├── DynamicForm.tsx
│   │   │   ├── InvestmentForm.tsx
│   │   │   ├── KYCForm.tsx
│   │   │   └── WithdrawalForm.tsx
│   │   ├── auth/
│   │   │   ├── LoginForm.tsx
│   │   │   ├── RegisterForm.tsx
│   │   │   ├── TwoFactorAuth.tsx
│   │   │   ├── BiometricAuth.tsx
│   │   │   └── PasswordReset.tsx
│   │   └── features/
│   │       ├── PortfolioSummary.tsx
│   │       ├── TransactionList.tsx
│   │       ├── InvestmentOpportunity.tsx
│   │       ├── DocumentViewer.tsx
│   │       └── PaymentMethod.tsx
│   │
│   └── templates/                # Page-level templates
│       ├── DashboardTemplate.tsx
│       ├── FormPageTemplate.tsx
│       ├── DetailPageTemplate.tsx
│       └── ListPageTemplate.tsx
```

---

## 2. Component Design Patterns

### 2.1 Compound Components Pattern

```typescript
// Example: Multi-step form
export const InvestmentFlow = {
  Root: InvestmentFlowRoot,
  Steps: InvestmentFlowSteps,
  Step: InvestmentFlowStep,
  Navigation: InvestmentFlowNavigation,
  Progress: InvestmentFlowProgress,
}

// Usage:
<InvestmentFlow.Root onComplete={handleComplete}>
  <InvestmentFlow.Progress />
  <InvestmentFlow.Steps>
    <InvestmentFlow.Step id="amount" title="Investment Amount">
      <AmountSelector />
    </InvestmentFlow.Step>
    <InvestmentFlow.Step id="terms" title="Review Terms">
      <TermsReview />
    </InvestmentFlow.Step>
    <InvestmentFlow.Step id="confirm" title="Confirm">
      <ConfirmationSummary />
    </InvestmentFlow.Step>
  </InvestmentFlow.Steps>
  <InvestmentFlow.Navigation />
</InvestmentFlow.Root>
```

### 2.2 Render Props Pattern

```typescript
// Data fetching with loading states
<AsyncData
  fetcher={fetchPortfolio}
  render={({ data, isLoading, error }) => (
    <>
      {isLoading && <PortfolioSkeleton />}
      {error && <ErrorState error={error} />}
      {data && <PortfolioView portfolio={data} />}
    </>
  )}
/>
```

### 2.3 Controlled vs Uncontrolled Components

```typescript
// Controlled (for forms with validation)
const [value, setValue] = useState('')
<Input value={value} onChange={(e) => setValue(e.target.value)} />

// Uncontrolled (for simple inputs)
<Input defaultValue={initialValue} ref={inputRef} />
```

---

## 3. Component Composition Strategy

### 3.1 Feature-Based Modules (125 Web Pages)

```
src/features/
├── authentication/
│   ├── components/
│   ├── hooks/
│   ├── types/
│   └── utils/
├── onboarding/
│   ├── components/
│   │   ├── KYCFlow/
│   │   ├── AccreditationVerification/
│   │   └── DocumentUpload/
│   ├── hooks/
│   └── pages/
├── dashboard/
│   ├── components/
│   │   ├── Overview/
│   │   ├── Portfolio/
│   │   └── QuickActions/
│   └── pages/
├── investments/
│   ├── components/
│   │   ├── OpportunityList/
│   │   ├── OpportunityDetail/
│   │   ├── InvestmentForm/
│   │   └── InvestmentTracking/
│   └── pages/
├── transactions/
│   ├── components/
│   │   ├── TransactionHistory/
│   │   ├── TransactionDetail/
│   │   ├── DepositFlow/
│   │   └── WithdrawalFlow/
│   └── pages/
├── portfolio/
│   ├── components/
│   │   ├── PortfolioOverview/
│   │   ├── AssetAllocation/
│   │   ├── PerformanceCharts/
│   │   └── Holdings/
│   └── pages/
├── documents/
│   ├── components/
│   │   ├── DocumentLibrary/
│   │   ├── DocumentViewer/
│   │   ├── ESignature/
│   │   └── DocumentUpload/
│   └── pages/
├── tax-reporting/
│   ├── components/
│   │   ├── TaxSummary/
│   │   ├── Form1099/
│   │   └── TaxDocuments/
│   └── pages/
├── admin/
│   ├── components/
│   │   ├── UserManagement/
│   │   ├── FundManagement/
│   │   ├── TransactionApproval/
│   │   ├── Reporting/
│   │   └── SystemConfig/
│   └── pages/
├── lp-management/
│   ├── components/
│   │   ├── LPDashboard/
│   │   ├── FundPerformance/
│   │   ├── CapitalCalls/
│   │   └── Distributions/
│   └── pages/
├── compliance/
│   ├── components/
│   │   ├── KYC/
│   │   ├── AML/
│   │   ├── Accreditation/
│   │   └── RegulatoryReporting/
│   └── pages/
└── support/
    ├── components/
    │   ├── TicketSystem/
    │   ├── LiveChat/
    │   ├── FAQ/
    │   └── ContactForm/
    └── pages/
```

### 3.2 Shared Cross-Feature Components

```
src/shared/
├── components/
│   ├── layouts/
│   │   ├── MainLayout.tsx
│   │   ├── DashboardLayout.tsx
│   │   ├── AuthLayout.tsx
│   │   └── AdminLayout.tsx
│   ├── charts/
│   │   ├── LineChart.tsx
│   │   ├── BarChart.tsx
│   │   ├── PieChart.tsx
│   │   ├── AreaChart.tsx
│   │   └── CandlestickChart.tsx
│   ├── data-display/
│   │   ├── DataTable.tsx
│   │   ├── VirtualList.tsx
│   │   ├── InfiniteScroll.tsx
│   │   └── Calendar.tsx
│   └── specialized/
│       ├── CryptoWallet.tsx
│       ├── BankAccountSelector.tsx
│       ├── PaymentMethodPicker.tsx
│       └── SignaturePad.tsx
```

---

## 4. Component Standards & Best Practices

### 4.1 Component Structure Template

```typescript
/**
 * ComponentName - Brief description
 *
 * @feature - Feature it belongs to
 * @complexity - Atomic/Molecular/Organism
 */

import { FC, memo } from 'react'
import { cn } from '@/lib/utils'

// Type definitions
interface ComponentNameProps {
  /** Primary content */
  children?: React.ReactNode
  /** Visual variant */
  variant?: 'default' | 'primary' | 'secondary'
  /** Size variant */
  size?: 'sm' | 'md' | 'lg'
  /** Additional CSS classes */
  className?: string
  /** Disabled state */
  disabled?: boolean
  /** Loading state */
  isLoading?: boolean
  /** Callback functions */
  onClick?: () => void
  /** Accessibility */
  'aria-label'?: string
}

// Component implementation
const ComponentName: FC<ComponentNameProps> = memo(({
  children,
  variant = 'default',
  size = 'md',
  className,
  disabled = false,
  isLoading = false,
  onClick,
  ...props
}) => {
  // Hooks
  // Event handlers
  // Derived state

  return (
    <element
      className={cn(
        'base-classes',
        variantClasses[variant],
        sizeClasses[size],
        disabled && 'opacity-50 cursor-not-allowed',
        className
      )}
      disabled={disabled}
      onClick={!disabled && !isLoading ? onClick : undefined}
      {...props}
    >
      {isLoading ? <Spinner /> : children}
    </element>
  )
})

ComponentName.displayName = 'ComponentName'

export default ComponentName

// Variant definitions
const variantClasses = {
  default: 'bg-white text-gray-900',
  primary: 'bg-indigo-600 text-white',
  secondary: 'bg-gray-200 text-gray-900',
}

const sizeClasses = {
  sm: 'text-sm py-1 px-2',
  md: 'text-base py-2 px-4',
  lg: 'text-lg py-3 px-6',
}
```

### 4.2 Performance Optimization Standards

```typescript
// 1. Memoization for expensive components
export const ExpensiveComponent = memo(({ data }) => {
  // Only re-renders when data changes
  return <div>{/* Expensive render logic */}</div>
}, (prevProps, nextProps) => {
  // Custom comparison
  return prevProps.data.id === nextProps.data.id
})

// 2. Lazy loading for route-based code splitting
const DashboardPage = lazy(() => import('./pages/Dashboard'))
const PortfolioPage = lazy(() => import('./pages/Portfolio'))

// 3. Virtual scrolling for large lists
import { useVirtualizer } from '@tanstack/react-virtual'

// 4. Debouncing for search inputs
const debouncedSearch = useMemo(
  () => debounce((value) => performSearch(value), 300),
  []
)
```

### 4.3 Accessibility Standards (WCAG 2.2 Level AA)

```typescript
// Required for all interactive components:
<Button
  aria-label="Close dialog"
  aria-pressed={isActive}
  aria-disabled={disabled}
  role="button"
  tabIndex={0}
>
  Close
</Button>

// Focus management
useEffect(() => {
  if (isOpen) {
    firstFocusableElement?.focus()
  }
}, [isOpen])

// Keyboard navigation
const handleKeyDown = (e: KeyboardEvent) => {
  if (e.key === 'Escape') handleClose()
  if (e.key === 'Enter' || e.key === ' ') handleAction()
}
```

---

## 5. Component Documentation Strategy

### 5.1 Storybook Configuration

```typescript
// .storybook/main.ts
export default {
  stories: ['../src/**/*.stories.@(ts|tsx)'],
  addons: [
    '@storybook/addon-docs',
    '@storybook/addon-a11y',
    '@storybook/addon-vitest',
  ],
  framework: '@storybook/react-vite',
}

// Component story template
export default {
  title: 'Components/Atoms/Button',
  component: Button,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'primary', 'secondary'],
    },
  },
}

export const Default = {
  args: {
    children: 'Click me',
    variant: 'default',
  },
}

export const AllVariants = () => (
  <div className="space-x-4">
    <Button variant="default">Default</Button>
    <Button variant="primary">Primary</Button>
    <Button variant="secondary">Secondary</Button>
  </div>
)
```

---

## 6. iOS Component Architecture (85 Screens)

### 6.1 SwiftUI Component Structure

```
ios/IndigoYield/
├── Components/
│   ├── Atoms/
│   │   ├── Buttons/
│   │   │   ├── PrimaryButton.swift
│   │   │   ├── SecondaryButton.swift
│   │   │   └── IconButton.swift
│   │   ├── Inputs/
│   │   │   ├── TextField.swift
│   │   │   ├── SecureField.swift
│   │   │   └── CurrencyInput.swift
│   │   └── Typography/
│   │       ├── Heading.swift
│   │       ├── Body.swift
│   │       └── Caption.swift
│   ├── Molecules/
│   │   ├── Forms/
│   │   │   ├── FormField.swift
│   │   │   └── FormSection.swift
│   │   ├── Cards/
│   │   │   ├── StatsCard.swift
│   │   │   └── ActionCard.swift
│   │   └── Navigation/
│   │       ├── TabBar.swift
│   │       └── NavBar.swift
│   └── Organisms/
│       ├── Auth/
│       │   ├── LoginView.swift
│       │   ├── BiometricAuth.swift
│       │   └── TwoFactorView.swift
│       ├── Portfolio/
│       │   ├── PortfolioSummary.swift
│       │   └── AssetList.swift
│       └── Transactions/
│           ├── TransactionList.swift
│           └── TransactionDetail.swift
├── Features/
│   ├── Authentication/
│   ├── Dashboard/
│   ├── Portfolio/
│   ├── Transactions/
│   └── Settings/
└── Shared/
    ├── Views/
    ├── ViewModels/
    └── Utilities/
```

### 6.2 SwiftUI Component Pattern

```swift
// Reusable component with customization
struct PrimaryButton: View {
    let title: String
    let action: () -> Void
    var isLoading: Bool = false
    var isDisabled: Bool = false

    var body: some View {
        Button(action: action) {
            HStack {
                if isLoading {
                    ProgressView()
                        .progressViewStyle(CircularProgressViewStyle(tint: .white))
                } else {
                    Text(title)
                        .font(.system(size: 16, weight: .semibold))
                }
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 16)
            .background(isDisabled ? Color.gray : Color.indigoPrimary)
            .foregroundColor(.white)
            .cornerRadius(12)
        }
        .disabled(isDisabled || isLoading)
    }
}

// Usage with view model
struct InvestmentView: View {
    @StateObject private var viewModel = InvestmentViewModel()

    var body: some View {
        VStack {
            // Component composition
            AmountInput(amount: $viewModel.amount)
            TermsCard(terms: viewModel.terms)
            PrimaryButton(
                title: "Confirm Investment",
                action: viewModel.confirmInvestment,
                isLoading: viewModel.isLoading
            )
        }
    }
}
```

---

## 7. Component Testing Strategy

### 7.1 Unit Testing

```typescript
// Button.test.tsx
import { render, screen, fireEvent } from '@testing-library/react'
import Button from './Button'

describe('Button', () => {
  it('renders children correctly', () => {
    render(<Button>Click me</Button>)
    expect(screen.getByText('Click me')).toBeInTheDocument()
  })

  it('calls onClick when clicked', () => {
    const handleClick = jest.fn()
    render(<Button onClick={handleClick}>Click me</Button>)
    fireEvent.click(screen.getByText('Click me'))
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('does not call onClick when disabled', () => {
    const handleClick = jest.fn()
    render(<Button onClick={handleClick} disabled>Click me</Button>)
    fireEvent.click(screen.getByText('Click me'))
    expect(handleClick).not.toHaveBeenCalled()
  })
})
```

### 7.2 Integration Testing

```typescript
// InvestmentFlow.test.tsx
describe('InvestmentFlow', () => {
  it('completes full investment flow', async () => {
    const { user } = renderWithProviders(<InvestmentFlow />)

    // Step 1: Enter amount
    await user.type(screen.getByLabelText('Investment Amount'), '10000')
    await user.click(screen.getByText('Next'))

    // Step 2: Review terms
    await user.click(screen.getByText('I agree to terms'))
    await user.click(screen.getByText('Next'))

    // Step 3: Confirm
    await user.click(screen.getByText('Confirm Investment'))

    // Verify success
    await waitFor(() => {
      expect(screen.getByText('Investment Successful')).toBeInTheDocument()
    })
  })
})
```

---

## 8. Component Library Versioning

### 8.1 Changelog & Migration Guides

```markdown
# Component Library Changelog

## v2.0.0 (Breaking Changes)
- Button: Renamed `type` prop to `variant`
- Input: Changed default size from `md` to `sm`
- Migration guide: /docs/migration/v1-to-v2.md

## v1.5.0 (New Components)
- Added CurrencyInput component
- Added SignaturePad component
- Enhanced DataTable with sorting
```

---

## 9. Design Tokens & Theming

### 9.1 Token Structure

```typescript
// tokens/colors.ts
export const colors = {
  // Brand colors
  brand: {
    primary: '#4F46E5',      // Indigo 600
    secondary: '#06B6D4',    // Cyan 500
    accent: '#F59E0B',       // Amber 500
  },
  // Semantic colors
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#3B82F6',
  // Neutral palette
  gray: {
    50: '#F9FAFB',
    100: '#F3F4F6',
    // ... through 900
  },
}

// tokens/spacing.ts
export const spacing = {
  xs: '0.25rem',   // 4px
  sm: '0.5rem',    // 8px
  md: '1rem',      // 16px
  lg: '1.5rem',    // 24px
  xl: '2rem',      // 32px
  '2xl': '3rem',   // 48px
}

// tokens/typography.ts
export const typography = {
  fontFamily: {
    sans: 'Montserrat, system-ui, sans-serif',
    mono: 'ui-monospace, monospace',
  },
  fontSize: {
    xs: '0.75rem',
    sm: '0.875rem',
    base: '1rem',
    lg: '1.125rem',
    xl: '1.25rem',
    '2xl': '1.5rem',
    '3xl': '1.875rem',
  },
}
```

### 9.2 Theme Provider

```typescript
// Theme context for runtime theme switching
export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState<'light' | 'dark'>('light')

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      <div className={theme}>
        {children}
      </div>
    </ThemeContext.Provider>
  )
}
```

---

## Implementation Timeline

### Phase 1: Foundation (Weeks 1-2)
- Set up atomic components (30 components)
- Establish design tokens
- Configure Storybook
- Create component templates

### Phase 2: Molecules & Organisms (Weeks 3-4)
- Build 40 molecular components
- Build 30 organism components
- Implement feature modules

### Phase 3: Integration (Weeks 5-6)
- Connect components to API layer
- Implement state management
- Add form validation
- Set up routing

### Phase 4: Testing & Documentation (Weeks 7-8)
- Write unit tests (80%+ coverage)
- Create Storybook stories
- Document component APIs
- Conduct accessibility audits

---

## Success Metrics

1. Component Reusability: 80%+ of UI from shared components
2. Bundle Size: <500KB initial load (gzipped)
3. Performance: <3s First Contentful Paint
4. Accessibility: 100% WCAG 2.2 Level AA compliance
5. Test Coverage: 80%+ for all components
6. Documentation: 100% of public components documented

---

**Next Document**: Module Organization & Code Structure
