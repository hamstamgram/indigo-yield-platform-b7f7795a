# Error State Audit

## Generated: 2024-12-22

## Error Boundary Implementation

### Global Error Boundary
```tsx
// App-level error boundary catches unhandled errors
<ErrorBoundary fallback={<ErrorFallback />}>
  <RouterProvider router={router} />
</ErrorBoundary>
```

### ErrorFallback Component
```tsx
const ErrorFallback = ({ error, resetErrorBoundary }) => (
  <div className="flex flex-col items-center justify-center min-h-screen">
    <AlertCircle className="h-12 w-12 text-destructive" />
    <h2 className="text-xl font-semibold mt-4">Something went wrong</h2>
    <p className="text-muted-foreground mt-2">{error.message}</p>
    <Button onClick={resetErrorBoundary} className="mt-4">
      Try Again
    </Button>
  </div>
);
```

## Query Error Handling

### React Query Error States
```tsx
const { data, error, isError, refetch } = useQuery({
  queryKey: ['investors'],
  queryFn: fetchInvestors,
});

if (isError) {
  return (
    <Alert variant="destructive">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Error loading investors</AlertTitle>
      <AlertDescription>
        {error.message}
        <Button variant="link" onClick={() => refetch()}>
          Retry
        </Button>
      </AlertDescription>
    </Alert>
  );
}
```

## Toast Notifications

### Error Toast Pattern
```typescript
// Using sonner toast
toast.error("Failed to save investor", {
  description: error.message,
  action: {
    label: "Retry",
    onClick: () => mutation.mutate(data),
  },
});
```

### Success Toast Pattern
```typescript
toast.success("Investor created successfully", {
  description: `${investor.full_name} has been added.`,
});
```

## Loading States

### Skeleton Loading
```tsx
if (isLoading) {
  return (
    <div className="space-y-4">
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-12 w-full" />
    </div>
  );
}
```

### Button Loading
```tsx
<Button disabled={isPending}>
  {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
  Save
</Button>
```

## Empty States

### No Data State
```tsx
if (data?.length === 0) {
  return (
    <div className="text-center py-12">
      <Users className="mx-auto h-12 w-12 text-muted-foreground" />
      <h3 className="mt-4 text-lg font-semibold">No investors yet</h3>
      <p className="text-muted-foreground">Get started by adding your first investor.</p>
      <Button className="mt-4" onClick={openCreateModal}>
        Add Investor
      </Button>
    </div>
  );
}
```

## Network Error Handling

### Offline Detection
```tsx
const isOnline = useOnlineStatus();

if (!isOnline) {
  return (
    <Alert>
      <WifiOff className="h-4 w-4" />
      <AlertTitle>You're offline</AlertTitle>
      <AlertDescription>
        Please check your internet connection and try again.
      </AlertDescription>
    </Alert>
  );
}
```

### API Error Mapping
```typescript
const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    // Map known error codes
    if (error.message.includes('PGRST')) {
      return 'Database error. Please try again.';
    }
    if (error.message.includes('JWT')) {
      return 'Session expired. Please log in again.';
    }
    return error.message;
  }
  return 'An unexpected error occurred.';
};
```

## Form Submission Errors

### Mutation Error Handling
```tsx
const mutation = useMutation({
  mutationFn: createInvestor,
  onError: (error) => {
    if (error.message.includes('unique')) {
      form.setError('email', { message: 'Email already exists' });
    } else {
      toast.error('Failed to create investor', {
        description: error.message,
      });
    }
  },
  onSuccess: () => {
    toast.success('Investor created');
    queryClient.invalidateQueries(['investors']);
    onClose();
  },
});
```

## 404 Handling

### Route Not Found
```tsx
// Catch-all route in router
{
  path: "*",
  element: <NotFoundPage />,
}
```

### NotFoundPage Component
```tsx
const NotFoundPage = () => (
  <div className="flex flex-col items-center justify-center min-h-screen">
    <h1 className="text-4xl font-bold">404</h1>
    <p className="text-muted-foreground mt-2">Page not found</p>
    <Button asChild className="mt-4">
      <Link to="/">Go Home</Link>
    </Button>
  </div>
);
```

## Result: ✅ PASS
- Error boundaries prevent blank screens
- All queries have error states with retry
- Toast notifications for user feedback
- Loading states prevent interaction issues
