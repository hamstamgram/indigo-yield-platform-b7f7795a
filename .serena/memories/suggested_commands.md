# Suggested Commands

## Development
```bash
npm run dev          # Start development server (Vite)
npm run build        # Build for production
npm run start        # Preview production build
```

## Linting & Formatting
```bash
npm run lint         # Run ESLint (strict, --max-warnings=0)
npm run lint:fix     # Auto-fix ESLint issues
npm run format       # Format code with Prettier
npm run type-check   # TypeScript type checking (tsc --noEmit)
```

## Testing
```bash
npm run test         # Run Jest unit tests
npm run test:watch   # Run tests in watch mode
npm run test:coverage # Run tests with coverage
npm run test:unit    # Unit tests only
npm run test:integration # Integration tests only
npm run test:e2e     # Run Playwright E2E tests
npm run test:e2e:headed # E2E tests with browser visible
npm run test:auth    # Auth integration tests
npm run test:accessibility # Accessibility tests
npm run test:all     # Run all tests (via script)
npm run test:ci      # CI-optimized test run
```

## Audit & Performance
```bash
npm run check:services  # Check service health
npm run audit:rls       # Run RLS security tests
npm run audit:headers   # Check security headers
npm run perf:test       # Performance testing
npm run perf:analyze    # Bundle analysis
npm run perf:images     # Image optimization
```

## Storybook
```bash
npm run storybook       # Start Storybook dev server (port 6006)
npm run build-storybook # Build static Storybook
```

## Useful Darwin/macOS Commands
```bash
ls -la                # List files with details
find . -name "*.ts"   # Find TypeScript files
grep -r "pattern" .   # Search recursively
open .                # Open current dir in Finder
pbcopy / pbpaste      # Clipboard operations
```
