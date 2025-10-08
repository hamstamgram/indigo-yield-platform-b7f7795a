# Repository Structure Guide

## 📂 Directory Layout

```
indigo-yield-platform-v01/
│
├── 🌐 WEB APPLICATION (Root)
│   ├── src/                        # React source code
│   │   ├── components/             # UI components (shadcn-ui)
│   │   ├── pages/                  # Page components
│   │   ├── hooks/                  # Custom React hooks
│   │   ├── lib/                    # Utilities
│   │   └── integrations/           # Supabase client
│   ├── public/                     # Static assets
│   ├── package.json                # Web dependencies
│   ├── vite.config.ts              # Vite configuration
│   ├── tailwind.config.ts          # Tailwind CSS config
│   └── web/README.md               # Web documentation
│
├── 📱 iOS APPLICATION
│   ├── IndigoInvestor/             # iOS app source
│   │   ├── App/                    # App entry point
│   │   ├── Core/                   # Core services
│   │   │   ├── Security/           # Biometric, Keychain
│   │   │   ├── Network/            # API client
│   │   │   └── Services/           # Business services
│   │   ├── Models/                 # Data models
│   │   ├── ViewModels/             # MVVM ViewModels
│   │   ├── Views/                  # SwiftUI views
│   │   └── Resources/              # Assets, certificates
│   ├── IndigoInvestorTests/        # Unit tests
│   ├── Config/                     # Configuration files
│   │   ├── Secrets.xcconfig.template
│   │   └── Secrets.xcconfig        # (gitignored)
│   ├── docs/                       # iOS-specific docs
│   └── README.md                   # iOS documentation
│
├── 🔧 BACKEND
│   ├── supabase/
│   │   ├── migrations/             # Database migrations
│   │   ├── functions/              # Edge Functions
│   │   └── config.toml             # Supabase config
│   └── docs/backend/               # Backend documentation
│       ├── README.md
│       ├── DATABASE_OPTIMIZATION_GUIDE.md
│       └── BACKEND_BUILD_SUMMARY.md
│
├── 📚 DOCUMENTATION
│   ├── docs/
│   │   ├── backend/                # Backend/database docs
│   │   ├── deployment/             # Deployment guides
│   │   │   ├── README.md
│   │   │   ├── DEPLOYMENT_GUIDE.md
│   │   │   └── DEPLOYMENT_INSTRUCTIONS.md
│   │   └── ios/                    # iOS documentation index
│   ├── README.md                   # Main repository README
│   ├── CONTRIBUTING.md             # Contribution guidelines
│   ├── REPOSITORY_STRUCTURE.md     # This file
│   └── ARCHITECTURAL_ANALYSIS_AND_BUILD_PLAN.md
│
└── 🔄 CI/CD
    └── .github/workflows/
        ├── web-ci-cd.yml           # Web pipeline (triggers on src/, public/, etc.)
        ├── ios-ci-cd.yml           # iOS pipeline (triggers on ios/**)
        ├── staging.yml             # Staging deployments
        └── test.yml                # General tests
```

## 🎯 Platform-Specific Paths

### Web Development
**Location**: Root directory
**Key Files**:
- `src/` - All web source code
- `public/` - Static assets
- `package.json` - Dependencies
- `vite.config.ts` - Build config

**CI/CD Trigger**: Changes to `src/`, `public/`, `package.json`, config files

### iOS Development
**Location**: `ios/` directory
**Key Files**:
- `IndigoInvestor/` - Swift source code
- `IndigoInvestor.xcodeproj` - Xcode project
- `Config/Secrets.xcconfig` - Configuration (gitignored)
- `README.md` - iOS documentation

**CI/CD Trigger**: Changes to `ios/**`

### Backend Development
**Location**: `supabase/` directory
**Key Files**:
- `migrations/` - Database schema changes
- `functions/` - Edge Functions
- `config.toml` - Supabase configuration

**CI/CD Trigger**: Migrations run on web deployment to production

## 📝 Documentation Organization

### Main Documentation Hub
- **README.md** (root) - Navigation hub for entire repository

### Platform-Specific Docs
- **web/README.md** - Web application guide
- **ios/README.md** - iOS application guide
- **ios/docs/** - Detailed iOS documentation (20+ files)

### Shared Documentation
- **docs/backend/** - Database, schema, RLS, Edge Functions
- **docs/deployment/** - CI/CD, infrastructure, deployment guides

## 🔀 Git Workflow Patterns

### Feature Branch Naming
```bash
web/feature-name       # Web features
ios/feature-name       # iOS features
backend/feature-name   # Backend features
fix/issue-description  # Bug fixes
```

### Commit Message Format
```
[platform]: Description

Examples:
web: Add portfolio dashboard
ios: Implement Face ID
backend: Add audit logging
```

## 🚀 Quick Start by Platform

### Web
```bash
npm install
npm run dev
# → http://localhost:5173
```

### iOS
```bash
cd ios
open IndigoInvestor.xcworkspace
# → Xcode opens
```

### Backend
```bash
cd supabase
supabase start
# → Local Supabase instance
```

## 🔍 Finding What You Need

| What You Need | Where To Look |
|---------------|---------------|
| Web components | `src/components/` |
| API integration | `src/integrations/supabase/` |
| iOS views | `ios/IndigoInvestor/Views/` |
| iOS services | `ios/IndigoInvestor/Core/Services/` |
| Database schema | `supabase/migrations/` |
| Edge Functions | `supabase/functions/` |
| Web deployment | `docs/deployment/DEPLOYMENT_GUIDE.md` |
| iOS deployment | `ios/docs/DEPLOYMENT_GUIDE.md` |
| Backend docs | `docs/backend/README.md` |
| Contributing | `CONTRIBUTING.md` |

## 🔐 Configuration Files

### Web Environment
```bash
.env.local              # Local development (gitignored)
.env.production         # Production config (gitignored)
.env.staging            # Staging config (gitignored)
```

### iOS Configuration
```bash
ios/Config/Secrets.xcconfig          # Secrets (gitignored)
ios/Config/Secrets.xcconfig.template # Template (committed)
```

### GitHub Secrets
Set in: **Settings → Secrets and variables → Actions**
- Supabase credentials
- Vercel tokens
- Apple Developer credentials
- Sentry tokens

## 📊 CI/CD Workflow Triggers

### Web CI/CD Triggers
- `src/**` - Source code
- `public/**` - Static assets
- `supabase/**` - Schema types
- `package.json` - Dependencies
- `vite.config.ts` - Build config
- Config files (tailwind, typescript, etc.)

### iOS CI/CD Triggers
- `ios/**` - Any iOS-related changes

### Manual Triggers
- All workflows can be triggered manually via GitHub Actions UI

## 🎨 Design System Locations

### Web Design System
- **Components**: `src/components/ui/` (shadcn-ui)
- **Styles**: `src/index.css` (Tailwind + CSS variables)
- **Config**: `tailwind.config.ts`

### iOS Design System
- **Colors**: `ios/IndigoInvestor/Resources/Colors.xcassets`
- **Design System Doc**: `ios/docs/INDIGO_DESIGN_SYSTEM.md`
- **Components**: SwiftUI views in `ios/IndigoInvestor/Views/Components/`

## 🔗 Cross-Platform Integration

### Shared Backend (Supabase)
Both platforms connect to the same Supabase instance:
- **Authentication**: Shared user accounts
- **Database**: Same schema, RLS ensures proper access
- **Storage**: Shared document storage
- **Realtime**: Live updates across platforms

### Data Synchronization
- User actions on web reflect in iOS (and vice versa)
- Portfolio updates in real-time via Supabase Realtime
- Consistent data models between platforms

## 📈 Scaling Considerations

### Adding New Platforms
To add a new platform (e.g., Android):
1. Create `android/` directory
2. Add `android-ci-cd.yml` workflow with path filter
3. Update main README.md navigation
4. Create `android/README.md`
5. Follow same organizational patterns

### Extracting to Separate Repos (If Needed)
If monorepo becomes unwieldy:
1. Use `git filter-branch` to split history
2. Create separate repos: `indigo-web`, `indigo-ios`
3. Move shared backend to `indigo-backend` repo
4. Update CI/CD to trigger across repos

---

**Last Updated**: 2025-10-08
**Maintained By**: Development Team
