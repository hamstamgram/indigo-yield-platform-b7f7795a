# Code Style & Conventions

## TypeScript
- Path alias: `@/*` maps to `./src/*`
- Target: ES2020
- Module: ESNext with bundler resolution
- JSX: react-jsx (no React import needed)
- Strict mode: disabled (be careful with types)

## Prettier Configuration
- Semi-colons: required
- Quotes: double quotes (not single)
- Trailing commas: ES5 style
- Print width: 100 characters
- Tab width: 2 spaces
- Arrow parens: always `(x) => x`

## ESLint Rules
- Extends: eslint:recommended + @typescript-eslint/recommended + prettier
- Unused vars: warn (prefix with `_` to ignore)
- Explicit any: allowed (off)
- React: no prop-types (TypeScript used)
- Accessibility rules: mostly relaxed

## Component Patterns
- Functional components with hooks
- Named exports preferred
- ErrorBoundary for error handling
- Providers: Auth → Security → Query
- Focus management hooks for accessibility
- SkipLink for accessibility navigation

## State Management
- Zustand for client state
- TanStack Query for server state
- React Hook Form for forms
- Zod for validation schemas

## File Organization
- Components in `src/components/`
- Pages in `src/pages/`
- Hooks in `src/hooks/`
- Types in `src/types/`
- Schemas in `src/schemas/`

## Import Order (implied)
1. React/external libraries
2. Internal utilities/hooks
3. Components
4. Types
5. Styles
