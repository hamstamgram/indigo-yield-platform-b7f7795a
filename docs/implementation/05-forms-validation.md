# Form Handling & Validation Strategies
## Indigo Yield Platform - React Hook Form + Zod

---

## 1. Form Architecture Overview

### 1.1 Form Stack

```
┌─────────────────────────────────────────────────────┐
│  React Hook Form                                     │
│  - Form state management                             │
│  - Performance optimization (uncontrolled inputs)    │
│  - Built-in validation                               │
├─────────────────────────────────────────────────────┤
│  Zod                                                 │
│  - Type-safe schema validation                       │
│  - Runtime type checking                             │
│  - Error message customization                       │
├─────────────────────────────────────────────────────┤
│  @hookform/resolvers                                 │
│  - Bridge between RHF and Zod                        │
└─────────────────────────────────────────────────────┘
```

---

## 2. Form Setup & Configuration

### 2.1 Base Form Hook

```typescript
// hooks/useBaseForm.ts
import { useForm, type UseFormProps, type FieldValues } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import type { ZodSchema } from 'zod'

export function useBaseForm<T extends FieldValues>(
  schema: ZodSchema<T>,
  options?: Omit<UseFormProps<T>, 'resolver'>
) {
  return useForm<T>({
    resolver: zodResolver(schema),
    mode: 'onBlur', // Validate on blur for better UX
    reValidateMode: 'onChange', // Re-validate on change after first validation
    ...options,
  })
}
```

### 2.2 Form Component Wrapper

```typescript
// components/forms/Form.tsx
import { type FormHTMLAttributes } from 'react'
import { FormProvider, type UseFormReturn, type FieldValues } from 'react-hook-form'
import { cn } from '@/lib/utils'

interface FormProps<T extends FieldValues> extends FormHTMLAttributes<HTMLFormElement> {
  form: UseFormReturn<T>
  onSubmit: (data: T) => void | Promise<void>
  children: React.ReactNode
}

export function Form<T extends FieldValues>({
  form,
  onSubmit,
  children,
  className,
  ...props
}: FormProps<T>) {
  return (
    <FormProvider {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className={cn('space-y-6', className)}
        {...props}
      >
        {children}
      </form>
    </FormProvider>
  )
}
```

---

## 3. Validation Schemas

### 3.1 Common Validation Patterns

```typescript
// lib/validation/schemas.ts
import { z } from 'zod'

// Email validation
export const emailSchema = z
  .string()
  .email('Please enter a valid email address')
  .min(1, 'Email is required')

// Password validation
export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character')

// Phone number validation (US)
export const phoneSchema = z
  .string()
  .regex(/^\+?1?\d{10}$/, 'Please enter a valid US phone number')
  .transform((val) => val.replace(/\D/g, '')) // Strip non-digits

// SSN validation
export const ssnSchema = z
  .string()
  .regex(/^\d{3}-?\d{2}-?\d{4}$/, 'Please enter a valid SSN')
  .transform((val) => val.replace(/-/g, ''))

// Currency amount
export const currencySchema = z
  .number()
  .positive('Amount must be positive')
  .multipleOf(0.01, 'Amount cannot have more than 2 decimal places')

// Date validation
export const futureDateSchema = z
  .date()
  .refine((date) => date > new Date(), {
    message: 'Date must be in the future',
  })

export const pastDateSchema = z
  .date()
  .refine((date) => date < new Date(), {
    message: 'Date must be in the past',
  })

// Age validation (18+)
export const dateOfBirthSchema = z
  .date()
  .refine((date) => {
    const age = new Date().getFullYear() - date.getFullYear()
    return age >= 18
  }, {
    message: 'You must be at least 18 years old',
  })

// File upload validation
export const fileSchema = z
  .instanceof(File)
  .refine((file) => file.size <= 5 * 1024 * 1024, {
    message: 'File size must be less than 5MB',
  })
  .refine(
    (file) => ['image/jpeg', 'image/png', 'application/pdf'].includes(file.type),
    {
      message: 'File must be a JPEG, PNG, or PDF',
    }
  )
```

### 3.2 Feature-Specific Schemas

```typescript
// features/authentication/validation/schemas.ts
import { z } from 'zod'
import { emailSchema, passwordSchema, phoneSchema } from '@/lib/validation/schemas'

// Login schema
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().optional(),
})

export type LoginFormData = z.infer<typeof loginSchema>

// Registration schema
export const registrationSchema = z
  .object({
    firstName: z.string().min(2, 'First name must be at least 2 characters'),
    lastName: z.string().min(2, 'Last name must be at least 2 characters'),
    email: emailSchema,
    phone: phoneSchema,
    password: passwordSchema,
    confirmPassword: z.string(),
    acceptTerms: z.literal(true, {
      errorMap: () => ({ message: 'You must accept the terms and conditions' }),
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

export type RegistrationFormData = z.infer<typeof registrationSchema>

// KYC schema
export const kycSchema = z.object({
  // Personal information
  firstName: z.string().min(2),
  middleName: z.string().optional(),
  lastName: z.string().min(2),
  dateOfBirth: dateOfBirthSchema,
  ssn: ssnSchema,

  // Address
  address: z.object({
    street: z.string().min(5, 'Please enter a valid street address'),
    city: z.string().min(2),
    state: z.string().length(2, 'Please use 2-letter state code'),
    zipCode: z.string().regex(/^\d{5}(-\d{4})?$/, 'Invalid ZIP code'),
  }),

  // Employment
  employmentStatus: z.enum(['employed', 'self_employed', 'retired', 'unemployed']),
  employer: z.string().optional(),
  occupation: z.string().optional(),

  // Financial information
  annualIncome: z.enum([
    'under_50k',
    '50k_100k',
    '100k_250k',
    '250k_500k',
    'over_500k',
  ]),
  netWorth: z.enum([
    'under_100k',
    '100k_500k',
    '500k_1m',
    '1m_5m',
    'over_5m',
  ]),

  // Accreditation
  isAccredited: z.boolean(),
  accreditationMethod: z.enum([
    'income',
    'net_worth',
    'professional',
    'entity',
  ]).optional(),

  // Documents
  idDocument: fileSchema,
  proofOfAddress: fileSchema,
  accreditationDocument: fileSchema.optional(),
})

export type KYCFormData = z.infer<typeof kycSchema>

// Investment schema
export const investmentSchema = z.object({
  opportunityId: z.string().uuid(),
  amount: currencySchema
    .min(1000, 'Minimum investment is $1,000')
    .max(1000000, 'Maximum investment is $1,000,000'),
  paymentMethod: z.enum(['bank', 'crypto', 'wire']),

  // Bank transfer details
  bankAccount: z.string().optional(),

  // Crypto details
  cryptoWallet: z.string().optional(),
  cryptocurrency: z.enum(['BTC', 'ETH', 'USDC']).optional(),

  // Agreement
  agreedToTerms: z.literal(true),
  agreedToRiskDisclosure: z.literal(true),
  electronicSignature: z.string().min(2, 'Please provide your electronic signature'),
})
  .refine(
    (data) => {
      if (data.paymentMethod === 'bank') return !!data.bankAccount
      if (data.paymentMethod === 'crypto') return !!data.cryptoWallet && !!data.cryptocurrency
      return true
    },
    {
      message: 'Please provide payment details',
      path: ['paymentMethod'],
    }
  )

export type InvestmentFormData = z.infer<typeof investmentSchema>

// Withdrawal schema
export const withdrawalSchema = z.object({
  investmentId: z.string().uuid(),
  amount: currencySchema.refine(
    async (amount) => {
      // Async validation example
      const available = await checkAvailableBalance(investmentId)
      return amount <= available
    },
    {
      message: 'Insufficient funds',
    }
  ),
  withdrawalMethod: z.enum(['bank', 'crypto', 'check']),
  bankAccount: z.string().optional(),
  cryptoAddress: z.string().optional(),
  mailingAddress: z.string().optional(),
  reason: z.string().max(500, 'Reason must be less than 500 characters').optional(),
})

export type WithdrawalFormData = z.infer<typeof withdrawalSchema>
```

---

## 4. Form Components

### 4.1 Field Components with Validation

```typescript
// components/forms/FormField.tsx
import { useFormContext } from 'react-hook-form'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

interface FormFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  name: string
  label: string
  description?: string
  required?: boolean
}

export function FormField({
  name,
  label,
  description,
  required,
  className,
  ...props
}: FormFieldProps) {
  const {
    register,
    formState: { errors },
  } = useFormContext()

  const error = errors[name]

  return (
    <div className="space-y-2">
      <Label htmlFor={name} className={cn(required && 'required')}>
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </Label>

      {description && (
        <p className="text-sm text-gray-500">{description}</p>
      )}

      <Input
        id={name}
        {...register(name)}
        className={cn(error && 'border-red-500', className)}
        aria-invalid={!!error}
        aria-describedby={error ? `${name}-error` : undefined}
        {...props}
      />

      {error && (
        <p id={`${name}-error`} className="text-sm text-red-500">
          {error.message as string}
        </p>
      )}
    </div>
  )
}
```

### 4.2 Select Field

```typescript
// components/forms/FormSelect.tsx
import { useFormContext, Controller } from 'react-hook-form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'

interface FormSelectProps {
  name: string
  label: string
  options: Array<{ value: string; label: string }>
  placeholder?: string
  required?: boolean
}

export function FormSelect({
  name,
  label,
  options,
  placeholder,
  required,
}: FormSelectProps) {
  const {
    control,
    formState: { errors },
  } = useFormContext()

  const error = errors[name]

  return (
    <div className="space-y-2">
      <Label htmlFor={name}>
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </Label>

      <Controller
        name={name}
        control={control}
        render={({ field }) => (
          <Select onValueChange={field.onChange} defaultValue={field.value}>
            <SelectTrigger className={error && 'border-red-500'}>
              <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent>
              {options.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      />

      {error && (
        <p className="text-sm text-red-500">{error.message as string}</p>
      )}
    </div>
  )
}
```

### 4.3 File Upload Field

```typescript
// components/forms/FormFileUpload.tsx
import { useFormContext, Controller } from 'react-hook-form'
import { useState } from 'react'
import { Upload, X } from 'lucide-react'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'

interface FormFileUploadProps {
  name: string
  label: string
  accept?: string
  maxSize?: number // in MB
  required?: boolean
}

export function FormFileUpload({
  name,
  label,
  accept = 'image/*,.pdf',
  maxSize = 5,
  required,
}: FormFileUploadProps) {
  const {
    control,
    formState: { errors },
  } = useFormContext()

  const [preview, setPreview] = useState<string | null>(null)
  const error = errors[name]

  return (
    <div className="space-y-2">
      <Label htmlFor={name}>
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </Label>

      <Controller
        name={name}
        control={control}
        render={({ field: { onChange, value, ...field } }) => (
          <div>
            <div className="flex items-center gap-4">
              <input
                type="file"
                id={name}
                accept={accept}
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) {
                    onChange(file)

                    // Create preview for images
                    if (file.type.startsWith('image/')) {
                      const reader = new FileReader()
                      reader.onloadend = () => {
                        setPreview(reader.result as string)
                      }
                      reader.readAsDataURL(file)
                    }
                  }
                }}
                className="hidden"
                {...field}
              />

              <label
                htmlFor={name}
                className="flex items-center gap-2 px-4 py-2 border rounded-md cursor-pointer hover:bg-gray-50"
              >
                <Upload className="w-4 h-4" />
                Choose File
              </label>

              {value && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">
                    {(value as File).name}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      onChange(null)
                      setPreview(null)
                    }}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>

            {preview && (
              <div className="mt-2">
                <img src={preview} alt="Preview" className="w-32 h-32 object-cover rounded" />
              </div>
            )}

            <p className="text-xs text-gray-500 mt-1">
              Max size: {maxSize}MB. Accepted formats: {accept}
            </p>
          </div>
        )}
      />

      {error && (
        <p className="text-sm text-red-500">{error.message as string}</p>
      )}
    </div>
  )
}
```

### 4.4 Currency Input

```typescript
// components/forms/FormCurrencyInput.tsx
import { useFormContext, Controller } from 'react-hook-form'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { formatCurrency, parseCurrency } from '@/utils/currency'

interface FormCurrencyInputProps {
  name: string
  label: string
  required?: boolean
  min?: number
  max?: number
}

export function FormCurrencyInput({
  name,
  label,
  required,
  min,
  max,
}: FormCurrencyInputProps) {
  const {
    control,
    formState: { errors },
  } = useFormContext()

  const error = errors[name]

  return (
    <div className="space-y-2">
      <Label htmlFor={name}>
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </Label>

      <Controller
        name={name}
        control={control}
        render={({ field: { onChange, value, ...field } }) => (
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
              $
            </span>
            <Input
              type="text"
              inputMode="decimal"
              className={cn('pl-7', error && 'border-red-500')}
              value={value ? formatCurrency(value, false) : ''}
              onChange={(e) => {
                const numericValue = parseCurrency(e.target.value)
                onChange(numericValue)
              }}
              {...field}
            />
          </div>
        )}
      />

      {(min || max) && (
        <p className="text-xs text-gray-500">
          {min && max
            ? `Amount must be between ${formatCurrency(min)} and ${formatCurrency(max)}`
            : min
            ? `Minimum: ${formatCurrency(min)}`
            : `Maximum: ${formatCurrency(max)}`}
        </p>
      )}

      {error && (
        <p className="text-sm text-red-500">{error.message as string}</p>
      )}
    </div>
  )
}
```

---

## 5. Multi-Step Forms

### 5.1 Multi-Step Form Pattern

```typescript
// components/forms/MultiStepForm.tsx
import { useState } from 'react'
import { useForm, FormProvider } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'

interface Step {
  title: string
  description?: string
  component: React.ComponentType
  schema: z.ZodSchema
}

interface MultiStepFormProps {
  steps: Step[]
  onComplete: (data: any) => void | Promise<void>
}

export function MultiStepForm({ steps, onComplete }: MultiStepFormProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [formData, setFormData] = useState<Record<string, any>>({})

  const step = steps[currentStep]
  const isLastStep = currentStep === steps.length - 1
  const progress = ((currentStep + 1) / steps.length) * 100

  const form = useForm({
    resolver: zodResolver(step.schema),
    defaultValues: formData,
  })

  const handleNext = async (data: any) => {
    // Save current step data
    setFormData((prev) => ({ ...prev, ...data }))

    if (isLastStep) {
      // Complete form
      await onComplete({ ...formData, ...data })
    } else {
      // Go to next step
      setCurrentStep((prev) => prev + 1)
      form.reset(formData)
    }
  }

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1)
      form.reset(formData)
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Progress bar */}
      <div className="mb-8">
        <div className="flex justify-between mb-2">
          <span className="text-sm font-medium">
            Step {currentStep + 1} of {steps.length}
          </span>
          <span className="text-sm text-gray-500">{Math.round(progress)}%</span>
        </div>
        <Progress value={progress} />
      </div>

      {/* Step header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold">{step.title}</h2>
        {step.description && (
          <p className="text-gray-600 mt-2">{step.description}</p>
        )}
      </div>

      {/* Step content */}
      <FormProvider {...form}>
        <form onSubmit={form.handleSubmit(handleNext)}>
          <step.component />

          {/* Navigation */}
          <div className="flex justify-between mt-8">
            <Button
              type="button"
              variant="outline"
              onClick={handleBack}
              disabled={currentStep === 0}
            >
              Back
            </Button>

            <Button type="submit" disabled={form.formState.isSubmitting}>
              {isLastStep ? 'Submit' : 'Next'}
            </Button>
          </div>
        </form>
      </FormProvider>
    </div>
  )
}
```

### 5.2 KYC Multi-Step Form Example

```typescript
// features/onboarding/components/KYCForm.tsx
import { MultiStepForm } from '@/components/forms/MultiStepForm'
import { PersonalInfoStep } from './steps/PersonalInfoStep'
import { AddressStep } from './steps/AddressStep'
import { EmploymentStep } from './steps/EmploymentStep'
import { FinancialStep } from './steps/FinancialStep'
import { DocumentsStep } from './steps/DocumentsStep'
import {
  personalInfoSchema,
  addressSchema,
  employmentSchema,
  financialSchema,
  documentsSchema,
} from '../validation/schemas'

export function KYCForm() {
  const handleComplete = async (data: any) => {
    try {
      await submitKYC(data)
      toast.success('KYC submitted successfully')
      router.push('/dashboard')
    } catch (error) {
      toast.error('Failed to submit KYC')
    }
  }

  const steps = [
    {
      title: 'Personal Information',
      description: 'Tell us about yourself',
      component: PersonalInfoStep,
      schema: personalInfoSchema,
    },
    {
      title: 'Address',
      description: 'Where do you live?',
      component: AddressStep,
      schema: addressSchema,
    },
    {
      title: 'Employment',
      description: 'Your employment details',
      component: EmploymentStep,
      schema: employmentSchema,
    },
    {
      title: 'Financial Information',
      description: 'Help us understand your financial situation',
      component: FinancialStep,
      schema: financialSchema,
    },
    {
      title: 'Documents',
      description: 'Upload required documents',
      component: DocumentsStep,
      schema: documentsSchema,
    },
  ]

  return <MultiStepForm steps={steps} onComplete={handleComplete} />
}
```

---

## 6. Form State Management

### 6.1 Auto-Save Draft

```typescript
// hooks/useAutoSave.ts
import { useEffect } from 'react'
import { useFormContext } from 'react-hook-form'
import { useDebouncedCallback } from 'use-debounce'

export function useAutoSave(key: string, delay: number = 2000) {
  const { watch } = useFormContext()

  const saveToLocalStorage = useDebouncedCallback((data) => {
    localStorage.setItem(key, JSON.stringify(data))
    console.log('Draft saved')
  }, delay)

  useEffect(() => {
    const subscription = watch((data) => {
      saveToLocalStorage(data)
    })

    return () => subscription.unsubscribe()
  }, [watch, saveToLocalStorage])

  // Load draft on mount
  useEffect(() => {
    const saved = localStorage.getItem(key)
    if (saved) {
      const data = JSON.parse(saved)
      // Reset form with saved data
    }
  }, [])
}
```

### 6.2 Confirmation Dialog on Exit

```typescript
// hooks/useUnsavedChanges.ts
import { useEffect } from 'react'
import { useFormContext } from 'react-hook-form'
import { useBlocker } from 'react-router-dom'

export function useUnsavedChanges(message: string = 'You have unsaved changes. Are you sure you want to leave?') {
  const { formState } = useFormContext()

  // Block navigation if form is dirty
  const blocker = useBlocker(formState.isDirty)

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (formState.isDirty) {
        e.preventDefault()
        e.returnValue = message
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [formState.isDirty, message])

  return blocker
}
```

---

## 7. Form Testing

### 7.1 Form Validation Tests

```typescript
// features/authentication/components/__tests__/LoginForm.test.tsx
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LoginForm } from '../LoginForm'

describe('LoginForm', () => {
  it('displays validation errors for empty fields', async () => {
    render(<LoginForm />)
    const user = userEvent.setup()

    const submitButton = screen.getByRole('button', { name: /log in/i })
    await user.click(submitButton)

    expect(await screen.findByText(/email is required/i)).toBeInTheDocument()
    expect(await screen.findByText(/password is required/i)).toBeInTheDocument()
  })

  it('displays error for invalid email', async () => {
    render(<LoginForm />)
    const user = userEvent.setup()

    const emailInput = screen.getByLabelText(/email/i)
    await user.type(emailInput, 'invalid-email')
    await user.tab() // Trigger blur

    expect(await screen.findByText(/valid email address/i)).toBeInTheDocument()
  })

  it('submits form with valid data', async () => {
    const onSubmit = jest.fn()
    render(<LoginForm onSubmit={onSubmit} />)
    const user = userEvent.setup()

    await user.type(screen.getByLabelText(/email/i), 'user@example.com')
    await user.type(screen.getByLabelText(/password/i), 'ValidPassword123!')
    await user.click(screen.getByRole('button', { name: /log in/i }))

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        email: 'user@example.com',
        password: 'ValidPassword123!',
      })
    })
  })
})
```

---

## Success Metrics

1. **Form Validation**: 100% client-side validation before submission
2. **Error Rate**: <5% submission errors due to validation
3. **Completion Rate**: >80% for multi-step forms
4. **Auto-save**: 0 data loss from unexpected exits
5. **Accessibility**: 100% WCAG 2.2 compliant forms

---

**Next Document**: Routing, Navigation & Build/Deployment
