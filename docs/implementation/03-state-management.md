# State Management Patterns & Examples
## Indigo Yield Platform - Global vs Local State Strategy

---

## 1. State Management Architecture Overview

### 1.1 State Types & Storage Solutions

```
┌─────────────────────────────────────────────────────────────┐
│                    State Management Layers                   │
├─────────────────────────────────────────────────────────────┤
│ 1. Server State        → React Query / TanStack Query        │
│    - API data                                                │
│    - Cache management                                        │
│    - Background updates                                      │
├─────────────────────────────────────────────────────────────┤
│ 2. Global Client State → Zustand                            │
│    - User session                                            │
│    - UI preferences                                          │
│    - Cross-feature data                                      │
├─────────────────────────────────────────────────────────────┤
│ 3. Local Component State → React useState/useReducer        │
│    - Form inputs                                             │
│    - UI toggles                                              │
│    - Component-specific data                                 │
├─────────────────────────────────────────────────────────────┤
│ 4. URL State          → React Router                         │
│    - Query parameters                                        │
│    - Route parameters                                        │
│    - Navigation state                                        │
├─────────────────────────────────────────────────────────────┤
│ 5. Persistent State   → LocalStorage / IndexedDB            │
│    - User preferences                                        │
│    - Draft forms                                             │
│    - Offline data                                            │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 State Management Decision Tree

```
Is this data from an API?
├─ YES → Use React Query
│   └─ Configure appropriate cache & refetch strategies
│
└─ NO → Is this data needed across multiple features?
    ├─ YES → Use Zustand (Global Store)
    │   └─ Examples: auth, user preferences, theme
    │
    └─ NO → Is this data needed across multiple components?
        ├─ YES → Use Context + useState/useReducer
        │   └─ Examples: multi-step form, wizard
        │
        └─ NO → Use local component state (useState)
            └─ Examples: toggle, input field
```

---

## 2. Server State Management (React Query)

### 2.1 Query Client Configuration

```typescript
// lib/react-query/client.ts
import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Global query defaults
      staleTime: 5 * 60 * 1000,           // 5 minutes
      cacheTime: 10 * 60 * 1000,          // 10 minutes
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      refetchOnMount: true,

      // Error handling
      onError: (error) => {
        console.error('Query error:', error)
        // Could send to Sentry here
      },
    },
    mutations: {
      // Global mutation defaults
      retry: 1,
      onError: (error) => {
        console.error('Mutation error:', error)
        // Show toast notification
      },
    },
  },
})
```

### 2.2 Query Patterns & Examples

```typescript
// features/investments/api/queries.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Investment, InvestmentOpportunity } from '../types'

// Query Keys Factory
export const investmentKeys = {
  all: ['investments'] as const,
  lists: () => [...investmentKeys.all, 'list'] as const,
  list: (filters: string) => [...investmentKeys.lists(), filters] as const,
  details: () => [...investmentKeys.all, 'detail'] as const,
  detail: (id: string) => [...investmentKeys.details(), id] as const,
  opportunities: () => [...investmentKeys.all, 'opportunities'] as const,
  opportunity: (id: string) => [...investmentKeys.opportunities(), id] as const,
}

// Fetchers
async function fetchInvestmentOpportunities() {
  const { data, error } = await supabase
    .from('investment_opportunities')
    .select('*')
    .eq('status', 'active')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data as InvestmentOpportunity[]
}

async function fetchInvestmentDetails(id: string) {
  const { data, error } = await supabase
    .from('investment_opportunities')
    .select(`
      *,
      fund:funds(*),
      documents:investment_documents(*)
    `)
    .eq('id', id)
    .single()

  if (error) throw error
  return data
}

// Query Hooks
export function useInvestmentOpportunities() {
  return useQuery({
    queryKey: investmentKeys.opportunities(),
    queryFn: fetchInvestmentOpportunities,
    staleTime: 2 * 60 * 1000, // 2 minutes
  })
}

export function useInvestmentDetails(id: string) {
  return useQuery({
    queryKey: investmentKeys.opportunity(id),
    queryFn: () => fetchInvestmentDetails(id),
    enabled: !!id, // Only run if id exists
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

// Prefetching for better UX
export function usePrefetchInvestmentDetails() {
  const queryClient = useQueryClient()

  return (id: string) => {
    queryClient.prefetchQuery({
      queryKey: investmentKeys.opportunity(id),
      queryFn: () => fetchInvestmentDetails(id),
    })
  }
}
```

### 2.3 Mutation Patterns

```typescript
// features/investments/api/mutations.ts
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { investmentKeys } from './queries'
import type { CreateInvestmentInput } from '../types'

async function createInvestment(input: CreateInvestmentInput) {
  const { data, error } = await supabase
    .from('investments')
    .insert({
      user_id: input.userId,
      opportunity_id: input.opportunityId,
      amount: input.amount,
      status: 'pending',
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export function useCreateInvestment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createInvestment,

    // Optimistic update
    onMutate: async (newInvestment) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: investmentKeys.lists() })

      // Snapshot previous value
      const previousInvestments = queryClient.getQueryData(investmentKeys.lists())

      // Optimistically update
      queryClient.setQueryData(investmentKeys.lists(), (old: any) => [
        ...old,
        { ...newInvestment, id: 'temp-id', status: 'pending' },
      ])

      return { previousInvestments }
    },

    // On success, invalidate and refetch
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: investmentKeys.lists() })
      queryClient.invalidateQueries({ queryKey: investmentKeys.opportunities() })

      // Show success toast
      toast.success('Investment created successfully!')
    },

    // On error, rollback
    onError: (error, variables, context) => {
      if (context?.previousInvestments) {
        queryClient.setQueryData(investmentKeys.lists(), context.previousInvestments)
      }
      toast.error('Failed to create investment')
    },
  })
}
```

### 2.4 Infinite Query Pattern (Pagination)

```typescript
// features/transactions/api/queries.ts
import { useInfiniteQuery } from '@tanstack/react-query'

interface TransactionPage {
  transactions: Transaction[]
  nextCursor: string | null
}

async function fetchTransactions({ pageParam = 0 }) {
  const pageSize = 20
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .order('created_at', { ascending: false })
    .range(pageParam, pageParam + pageSize - 1)

  if (error) throw error

  return {
    transactions: data,
    nextCursor: data.length === pageSize ? pageParam + pageSize : null,
  } as TransactionPage
}

export function useTransactionHistory() {
  return useInfiniteQuery({
    queryKey: ['transactions', 'history'],
    queryFn: fetchTransactions,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  })
}

// Usage in component
function TransactionHistory() {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useTransactionHistory()

  return (
    <div>
      {data?.pages.map((page) =>
        page.transactions.map((tx) => (
          <TransactionRow key={tx.id} transaction={tx} />
        ))
      )}
      {hasNextPage && (
        <Button onClick={() => fetchNextPage()} disabled={isFetchingNextPage}>
          {isFetchingNextPage ? 'Loading...' : 'Load More'}
        </Button>
      )}
    </div>
  )
}
```

---

## 3. Global Client State (Zustand)

### 3.1 Auth Store

```typescript
// stores/auth.store.ts
import { create } from 'zustand'
import { persist, devtools } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import type { User, Session } from '@supabase/supabase-js'

interface AuthState {
  // State
  user: User | null
  session: Session | null
  isAuthenticated: boolean
  isLoading: boolean

  // Actions
  setUser: (user: User | null) => void
  setSession: (session: Session | null) => void
  signOut: () => void
  updateProfile: (updates: Partial<User['user_metadata']>) => void
}

export const useAuthStore = create<AuthState>()(
  devtools(
    persist(
      immer((set) => ({
        // Initial state
        user: null,
        session: null,
        isAuthenticated: false,
        isLoading: true,

        // Actions
        setUser: (user) =>
          set((state) => {
            state.user = user
            state.isAuthenticated = !!user
            state.isLoading = false
          }),

        setSession: (session) =>
          set((state) => {
            state.session = session
          }),

        signOut: () =>
          set((state) => {
            state.user = null
            state.session = null
            state.isAuthenticated = false
          }),

        updateProfile: (updates) =>
          set((state) => {
            if (state.user?.user_metadata) {
              state.user.user_metadata = {
                ...state.user.user_metadata,
                ...updates,
              }
            }
          }),
      })),
      {
        name: 'auth-storage',
        partialize: (state) => ({
          // Only persist these fields
          user: state.user,
          session: state.session,
        }),
      }
    ),
    { name: 'AuthStore' }
  )
)

// Selectors for better performance
export const useUser = () => useAuthStore((state) => state.user)
export const useIsAuthenticated = () => useAuthStore((state) => state.isAuthenticated)
```

### 3.2 Portfolio Store

```typescript
// stores/portfolio.store.ts
import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'

interface PortfolioState {
  // State
  selectedAssets: string[]
  viewMode: 'grid' | 'list'
  sortBy: 'name' | 'value' | 'return'
  sortOrder: 'asc' | 'desc'
  filters: {
    assetType: string[]
    status: string[]
    dateRange: [Date, Date] | null
  }

  // Actions
  toggleAssetSelection: (assetId: string) => void
  selectAllAssets: (assetIds: string[]) => void
  clearSelection: () => void
  setViewMode: (mode: 'grid' | 'list') => void
  setSorting: (by: string, order: 'asc' | 'desc') => void
  setFilters: (filters: Partial<PortfolioState['filters']>) => void
  resetFilters: () => void
}

export const usePortfolioStore = create<PortfolioState>()(
  devtools(
    immer((set) => ({
      // Initial state
      selectedAssets: [],
      viewMode: 'grid',
      sortBy: 'value',
      sortOrder: 'desc',
      filters: {
        assetType: [],
        status: [],
        dateRange: null,
      },

      // Actions
      toggleAssetSelection: (assetId) =>
        set((state) => {
          const index = state.selectedAssets.indexOf(assetId)
          if (index > -1) {
            state.selectedAssets.splice(index, 1)
          } else {
            state.selectedAssets.push(assetId)
          }
        }),

      selectAllAssets: (assetIds) =>
        set((state) => {
          state.selectedAssets = assetIds
        }),

      clearSelection: () =>
        set((state) => {
          state.selectedAssets = []
        }),

      setViewMode: (mode) =>
        set((state) => {
          state.viewMode = mode
        }),

      setSorting: (by, order) =>
        set((state) => {
          state.sortBy = by
          state.sortOrder = order
        }),

      setFilters: (filters) =>
        set((state) => {
          state.filters = { ...state.filters, ...filters }
        }),

      resetFilters: () =>
        set((state) => {
          state.filters = {
            assetType: [],
            status: [],
            dateRange: null,
          }
        }),
    })),
    { name: 'PortfolioStore' }
  )
)
```

### 3.3 UI Store

```typescript
// stores/ui.store.ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface UIState {
  // Theme
  theme: 'light' | 'dark' | 'system'
  setTheme: (theme: 'light' | 'dark' | 'system') => void

  // Sidebar
  isSidebarOpen: boolean
  sidebarWidth: number
  toggleSidebar: () => void
  setSidebarWidth: (width: number) => void

  // Modals
  openModals: Set<string>
  openModal: (id: string) => void
  closeModal: (id: string) => void
  closeAllModals: () => void

  // Notifications
  unreadCount: number
  setUnreadCount: (count: number) => void
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      // Theme
      theme: 'system',
      setTheme: (theme) => set({ theme }),

      // Sidebar
      isSidebarOpen: true,
      sidebarWidth: 256,
      toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
      setSidebarWidth: (width) => set({ sidebarWidth: width }),

      // Modals
      openModals: new Set(),
      openModal: (id) =>
        set((state) => ({
          openModals: new Set(state.openModals).add(id),
        })),
      closeModal: (id) =>
        set((state) => {
          const newSet = new Set(state.openModals)
          newSet.delete(id)
          return { openModals: newSet }
        }),
      closeAllModals: () => set({ openModals: new Set() }),

      // Notifications
      unreadCount: 0,
      setUnreadCount: (count) => set({ unreadCount: count }),
    }),
    {
      name: 'ui-storage',
      partialize: (state) => ({
        theme: state.theme,
        sidebarWidth: state.sidebarWidth,
      }),
    }
  )
)
```

### 3.4 Store Composition Pattern

```typescript
// stores/index.ts - Combined store pattern
import { create } from 'zustand'
import { createAuthSlice, type AuthSlice } from './slices/auth'
import { createUISlice, type UISlice } from './slices/ui'
import { createPortfolioSlice, type PortfolioSlice } from './slices/portfolio'

type StoreState = AuthSlice & UISlice & PortfolioSlice

export const useStore = create<StoreState>()((...a) => ({
  ...createAuthSlice(...a),
  ...createUISlice(...a),
  ...createPortfolioSlice(...a),
}))

// Selective subscriptions for performance
export const useAuth = () => useStore((state) => ({
  user: state.user,
  isAuthenticated: state.isAuthenticated,
  signOut: state.signOut,
}))
```

---

## 4. Local Component State

### 4.1 useState for Simple State

```typescript
// Simple toggle
function NotificationToggle() {
  const [isEnabled, setIsEnabled] = useState(false)

  return (
    <Switch
      checked={isEnabled}
      onCheckedChange={setIsEnabled}
    />
  )
}

// Form input
function SearchBar() {
  const [query, setQuery] = useState('')

  const handleSearch = () => {
    // Perform search with query
  }

  return (
    <Input
      value={query}
      onChange={(e) => setQuery(e.target.value)}
      onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
    />
  )
}
```

### 4.2 useReducer for Complex State

```typescript
// Multi-step form state
type FormState = {
  step: number
  data: {
    personal: PersonalInfo
    financial: FinancialInfo
    documents: Document[]
  }
  errors: Record<string, string>
}

type FormAction =
  | { type: 'NEXT_STEP' }
  | { type: 'PREV_STEP' }
  | { type: 'UPDATE_FIELD'; payload: { field: string; value: any } }
  | { type: 'SET_ERROR'; payload: { field: string; error: string } }
  | { type: 'RESET' }

function formReducer(state: FormState, action: FormAction): FormState {
  switch (action.type) {
    case 'NEXT_STEP':
      return { ...state, step: state.step + 1 }

    case 'PREV_STEP':
      return { ...state, step: Math.max(0, state.step - 1) }

    case 'UPDATE_FIELD':
      return {
        ...state,
        data: {
          ...state.data,
          [action.payload.field]: action.payload.value,
        },
      }

    case 'SET_ERROR':
      return {
        ...state,
        errors: {
          ...state.errors,
          [action.payload.field]: action.payload.error,
        },
      }

    case 'RESET':
      return initialState

    default:
      return state
  }
}

// Usage
function MultiStepForm() {
  const [state, dispatch] = useReducer(formReducer, initialState)

  return (
    <form>
      {state.step === 0 && (
        <PersonalInfoStep
          data={state.data.personal}
          onChange={(field, value) =>
            dispatch({ type: 'UPDATE_FIELD', payload: { field, value } })
          }
        />
      )}
      {/* Other steps */}
      <Button onClick={() => dispatch({ type: 'NEXT_STEP' })}>
        Next
      </Button>
    </form>
  )
}
```

---

## 5. Context for Feature-Scoped State

### 5.1 Investment Flow Context

```typescript
// features/investments/context/InvestmentFlowContext.tsx
import { createContext, useContext, useReducer } from 'react'

interface InvestmentFlowState {
  opportunityId: string
  amount: number
  paymentMethod: 'bank' | 'crypto' | null
  agreedToTerms: boolean
  currentStep: number
}

type InvestmentFlowAction =
  | { type: 'SET_OPPORTUNITY'; payload: string }
  | { type: 'SET_AMOUNT'; payload: number }
  | { type: 'SET_PAYMENT_METHOD'; payload: 'bank' | 'crypto' }
  | { type: 'AGREE_TO_TERMS' }
  | { type: 'NEXT_STEP' }
  | { type: 'PREV_STEP' }
  | { type: 'RESET' }

const InvestmentFlowContext = createContext<{
  state: InvestmentFlowState
  dispatch: React.Dispatch<InvestmentFlowAction>
} | null>(null)

export function InvestmentFlowProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(investmentFlowReducer, initialState)

  return (
    <InvestmentFlowContext.Provider value={{ state, dispatch }}>
      {children}
    </InvestmentFlowContext.Provider>
  )
}

export function useInvestmentFlow() {
  const context = useContext(InvestmentFlowContext)
  if (!context) {
    throw new Error('useInvestmentFlow must be used within InvestmentFlowProvider')
  }
  return context
}

// Custom hooks for specific actions
export function useInvestmentFlowActions() {
  const { dispatch } = useInvestmentFlow()

  return {
    setOpportunity: (id: string) =>
      dispatch({ type: 'SET_OPPORTUNITY', payload: id }),
    setAmount: (amount: number) =>
      dispatch({ type: 'SET_AMOUNT', payload: amount }),
    nextStep: () => dispatch({ type: 'NEXT_STEP' }),
    prevStep: () => dispatch({ type: 'PREV_STEP' }),
    reset: () => dispatch({ type: 'RESET' }),
  }
}
```

---

## 6. URL State Management

### 6.1 Search Params for Filters

```typescript
// features/investments/hooks/useInvestmentFilters.ts
import { useSearchParams } from 'react-router-dom'
import { useMemo } from 'react'

export function useInvestmentFilters() {
  const [searchParams, setSearchParams] = useSearchParams()

  const filters = useMemo(() => ({
    type: searchParams.get('type') || 'all',
    minAmount: Number(searchParams.get('minAmount')) || 0,
    maxAmount: Number(searchParams.get('maxAmount')) || Infinity,
    sortBy: searchParams.get('sortBy') || 'created_at',
  }), [searchParams])

  const setFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams)
    if (value) {
      params.set(key, value)
    } else {
      params.delete(key)
    }
    setSearchParams(params)
  }

  const clearFilters = () => {
    setSearchParams({})
  }

  return { filters, setFilter, clearFilters }
}

// Usage in component
function InvestmentList() {
  const { filters, setFilter } = useInvestmentFilters()
  const { data } = useInvestmentOpportunities(filters)

  return (
    <div>
      <Select
        value={filters.type}
        onValueChange={(value) => setFilter('type', value)}
      >
        <option value="all">All Types</option>
        <option value="equity">Equity</option>
        <option value="debt">Debt</option>
      </Select>

      {data?.map((opportunity) => (
        <OpportunityCard key={opportunity.id} opportunity={opportunity} />
      ))}
    </div>
  )
}
```

---

## 7. Persistent State (LocalStorage/IndexedDB)

### 7.1 Draft Form Persistence

```typescript
// hooks/useDraftForm.ts
import { useState, useEffect } from 'react'

export function useDraftForm<T>(key: string, initialValue: T) {
  const [value, setValue] = useState<T>(() => {
    const saved = localStorage.getItem(key)
    return saved ? JSON.parse(saved) : initialValue
  })

  // Auto-save to localStorage
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      localStorage.setItem(key, JSON.stringify(value))
    }, 1000) // Debounce 1 second

    return () => clearTimeout(timeoutId)
  }, [key, value])

  const clearDraft = () => {
    localStorage.removeItem(key)
    setValue(initialValue)
  }

  return [value, setValue, clearDraft] as const
}

// Usage
function InvestmentForm() {
  const [draft, setDraft, clearDraft] = useDraftForm('investment-draft', {
    amount: 0,
    paymentMethod: null,
  })

  const handleSubmit = async () => {
    await submitInvestment(draft)
    clearDraft() // Clear after successful submission
  }

  return (
    <form>
      <Input
        value={draft.amount}
        onChange={(e) => setDraft({ ...draft, amount: Number(e.target.value) })}
      />
    </form>
  )
}
```

### 7.2 IndexedDB for Large Data

```typescript
// lib/indexeddb.ts
import { openDB, type IDBPDatabase } from 'idb'

const DB_NAME = 'indigo-yield'
const DB_VERSION = 1

export async function getDB() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // Documents store
      if (!db.objectStoreNames.contains('documents')) {
        const store = db.createObjectStore('documents', { keyPath: 'id' })
        store.createIndex('type', 'type')
        store.createIndex('date', 'date')
      }

      // Offline transactions
      if (!db.objectStoreNames.contains('offlineTransactions')) {
        db.createObjectStore('offlineTransactions', { keyPath: 'id' })
      }
    },
  })
}

export async function saveDocument(document: Document) {
  const db = await getDB()
  await db.put('documents', document)
}

export async function getDocuments() {
  const db = await getDB()
  return db.getAll('documents')
}

// Hook for documents
export function useOfflineDocuments() {
  const [documents, setDocuments] = useState<Document[]>([])

  useEffect(() => {
    getDocuments().then(setDocuments)
  }, [])

  return documents
}
```

---

## 8. Real-time State Synchronization

### 8.1 Supabase Realtime Integration

```typescript
// hooks/useRealtimePortfolio.ts
import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { portfolioKeys } from '@/features/portfolio/api/queries'

export function useRealtimePortfolio(userId: string) {
  const queryClient = useQueryClient()

  useEffect(() => {
    const channel = supabase
      .channel('portfolio-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'investments',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          console.log('Portfolio update:', payload)

          // Invalidate relevant queries
          queryClient.invalidateQueries({
            queryKey: portfolioKeys.summary(userId),
          })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId, queryClient])
}
```

---

## 9. State Management Best Practices

### 9.1 State Colocation

```typescript
// ❌ Bad: Lifting state too high
function App() {
  const [searchQuery, setSearchQuery] = useState('') // Used only in SearchPage

  return (
    <Routes>
      <Route path="/search" element={<SearchPage query={searchQuery} />} />
    </Routes>
  )
}

// ✅ Good: State close to where it's used
function SearchPage() {
  const [searchQuery, setSearchQuery] = useState('')

  return <SearchBar value={searchQuery} onChange={setSearchQuery} />
}
```

### 9.2 Derived State

```typescript
// ❌ Bad: Storing derived state
function Portfolio() {
  const { data: investments } = useInvestments()
  const [totalValue, setTotalValue] = useState(0)

  useEffect(() => {
    setTotalValue(investments?.reduce((sum, inv) => sum + inv.value, 0) || 0)
  }, [investments])

  return <div>Total: {totalValue}</div>
}

// ✅ Good: Computing derived state
function Portfolio() {
  const { data: investments } = useInvestments()

  const totalValue = useMemo(
    () => investments?.reduce((sum, inv) => sum + inv.value, 0) || 0,
    [investments]
  )

  return <div>Total: {totalValue}</div>
}
```

### 9.3 Avoiding Prop Drilling

```typescript
// ❌ Bad: Prop drilling
<Dashboard>
  <PortfolioSection user={user} theme={theme}>
    <PortfolioCard user={user} theme={theme}>
      <PortfolioActions user={user} theme={theme} />
    </PortfolioCard>
  </PortfolioSection>
</Dashboard>

// ✅ Good: Context/Store
const user = useUser()
const theme = useTheme()

<Dashboard>
  <PortfolioSection>
    <PortfolioCard>
      <PortfolioActions />
    </PortfolioCard>
  </PortfolioSection>
</Dashboard>
```

---

## 10. Performance Optimization

### 10.1 Selective Subscriptions

```typescript
// ❌ Bad: Re-renders on any store change
const store = useStore()

// ✅ Good: Subscribe only to what you need
const user = useStore((state) => state.user)
const theme = useStore((state) => state.theme)

// ✅ Better: Custom selector with shallow comparison
const userData = useStore(
  (state) => ({
    name: state.user?.name,
    email: state.user?.email,
  }),
  shallow
)
```

### 10.2 Query Stale Time Configuration

```typescript
// Different stale times for different data types
export const queryConfig = {
  // Frequently changing data
  transactions: {
    staleTime: 1 * 60 * 1000, // 1 minute
  },

  // Moderately changing data
  portfolio: {
    staleTime: 5 * 60 * 1000, // 5 minutes
  },

  // Rarely changing data
  userProfile: {
    staleTime: 30 * 60 * 1000, // 30 minutes
  },

  // Static data
  fundDetails: {
    staleTime: Infinity, // Never refetch unless explicitly invalidated
  },
}
```

---

## Success Metrics

1. **State Updates**: <100ms for UI state changes
2. **API Response**: <500ms for cached data
3. **Re-renders**: Minimize unnecessary re-renders (<5% waste)
4. **Memory**: Store size <10MB for typical session
5. **Hydration**: LocalStorage <5MB, IndexedDB <50MB

---

**Next Document**: API Design & Integration Patterns
