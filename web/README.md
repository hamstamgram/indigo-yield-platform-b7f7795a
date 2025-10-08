# Indigo Yield Web Application

React + TypeScript web platform for investment management.

## 🚀 Quick Start

```bash
# From repository root
npm install
npm run dev
```

Access at `http://localhost:5173`

## 📁 Project Structure

```
web/ (root of monorepo)
├── src/
│   ├── components/     # Reusable UI components (shadcn-ui)
│   ├── hooks/          # Custom React hooks
│   ├── integrations/   # Supabase client setup
│   ├── lib/            # Utilities and helpers
│   ├── pages/          # Page components
│   ├── App.tsx         # Root component with routing
│   └── main.tsx        # Application entry point
├── public/             # Static assets
├── supabase/           # Supabase types and configuration
└── docs/               # Web-specific documentation
```

## 🛠️ Tech Stack

- **Build Tool**: Vite 5.x
- **Language**: TypeScript 5.x
- **Framework**: React 18.x
- **UI Components**: shadcn-ui (Radix UI primitives)
- **Styling**: Tailwind CSS 3.x
- **Backend**: Supabase
- **State Management**: TanStack Query (React Query)
- **Routing**: React Router DOM
- **Forms**: React Hook Form + Zod
- **Charts**: Recharts

## 📦 Available Scripts

```bash
# Development
npm run dev              # Start dev server (localhost:5173)

# Building
npm run build           # Production build
npm run build:dev       # Development build

# Quality
npm run lint            # Run ESLint
npm run preview         # Preview production build

# Type checking
npm run type-check      # Run TypeScript compiler check
```

## 🎨 UI Components

This project uses [shadcn-ui](https://ui.shadcn.com/), where components are copied into `src/components/ui/` rather than installed as npm packages.

### Adding New Components

```bash
# Using shadcn CLI
npx shadcn-ui@latest add button

# Components are configured in components.json
```

Component configuration:
- **Style**: Default
- **TypeScript**: Enabled
- **Tailwind**: Enabled
- **Path alias**: `@/` → `./src`

## 🎨 Styling

### Tailwind CSS
- Utility-first CSS framework
- Custom theme in `tailwind.config.ts`
- Global styles in `src/index.css`
- CSS variables for theming

### Conditional Classes
Use the `cn()` helper from `lib/utils.ts`:

```typescript
import { cn } from "@/lib/utils"

<div className={cn(
  "base-classes",
  condition && "conditional-classes"
)} />
```

## 🔌 Supabase Integration

Configuration in `src/integrations/supabase/`:

```typescript
import { supabase } from "@/integrations/supabase/client"

// Authentication
const { data, error } = await supabase.auth.signIn(...)

// Database queries
const { data } = await supabase
  .from('table_name')
  .select('*')
```

## 📊 State Management

### Server State (TanStack Query)
```typescript
import { useQuery, useMutation } from '@tanstack/react-query'

const { data, isLoading } = useQuery({
  queryKey: ['key'],
  queryFn: fetchData
})
```

### Form State (React Hook Form + Zod)
```typescript
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

const schema = z.object({
  email: z.string().email()
})

const form = useForm({
  resolver: zodResolver(schema)
})
```

## 🌍 Environment Variables

Create `.env.local` in the root directory:

```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

Access in code:
```typescript
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
```

## 🔧 Configuration Files

- `vite.config.ts` - Vite bundler configuration
- `tsconfig.json` - TypeScript configuration (references app & node configs)
- `tailwind.config.ts` - Tailwind theming and plugins
- `eslint.config.js` - ESLint rules (flat config format)
- `components.json` - shadcn-ui component configuration

## 🚀 Deployment

### Production Build
```bash
npm run build
```

Output in `dist/` directory, ready for static hosting.

### Hosting Options
- **Vercel**: `vercel deploy`
- **Netlify**: `netlify deploy`
- **GitHub Pages**: Configure in repository settings

### Environment Variables
Set in hosting platform:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

## 🧪 Testing

```bash
# Run tests (when configured)
npm test

# Type checking
npm run type-check
```

## 📝 Code Style

- **ESLint**: Configured for React + TypeScript
- **Prettier**: (Add if needed)
- **Import order**: Use path aliases (`@/`)

## 🔗 Integration with Lovable.dev

This project syncs with Lovable platform:
- Changes pushed to GitHub → reflected in Lovable
- Changes in Lovable → auto-committed to GitHub

Project URL: https://lovable.dev/projects/14dab369-c4bf-4ba9-9aa8-49823e706283

## 🐛 Common Issues

### Port Already in Use
```bash
# Kill process on port 5173
lsof -ti:5173 | xargs kill -9

# Or use different port
npm run dev -- --port 3000
```

### Type Errors After Supabase Schema Changes
```bash
# Regenerate types
npm run supabase:gen-types
```

## 📚 Additional Documentation

- [Component Library](./docs/components.md)
- [API Integration](./docs/api.md)
- [Deployment Guide](../docs/deployment/web-deployment.md)
- [Architecture](../ARCHITECTURAL_ANALYSIS_AND_BUILD_PLAN.md)

## 🤝 Contributing

When working on web features:

1. Create feature branch: `git checkout -b web/feature-name`
2. Make changes in `src/` directory
3. Test locally: `npm run dev`
4. Commit with prefix: `git commit -m "web: Add feature"`
5. Push triggers `web-ci-cd.yml` workflow

## 📄 License

Proprietary - All rights reserved
