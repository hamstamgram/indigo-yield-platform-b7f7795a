# Indigo Yield Platform

> Multi-platform investment platform with web and native iOS applications

## 🏗️ Repository Structure

This is a monorepo containing two separate applications:

```
indigo-yield-platform-v01/
├── web/                    # React + TypeScript web application
│   ├── src/
│   ├── public/
│   ├── package.json
│   └── docs/              # Web-specific documentation
├── ios/                   # Native Swift iOS application
│   ├── IndigoInvestor/
│   ├── IndigoInvestorTests/
│   └── docs/              # iOS-specific documentation
├── docs/                  # Shared documentation
│   ├── backend/          # Backend/Supabase docs
│   └── deployment/       # Deployment guides
└── .github/workflows/    # CI/CD workflows
```

## 🚀 Quick Start

### Web Application
```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```
📖 [Web Documentation](./web/README.md)

### iOS Application
```bash
cd ios

# Install dependencies (if using CocoaPods)
pod install

# Open in Xcode
open IndigoInvestor.xcworkspace
```
📖 [iOS Documentation](./ios/README.md)

## 📚 Documentation

### Platform-Specific
- **Web**: [web/README.md](./web/README.md) - React setup, components, deployment
- **iOS**: [ios/README.md](./ios/README.md) - SwiftUI, architecture, TestFlight

### Shared Resources
- **Backend**: [docs/backend/](./docs/backend/) - Supabase schema, Edge Functions, RLS
- **Deployment**: [docs/deployment/](./docs/deployment/) - Infrastructure, CI/CD, environments
- **Architecture**: [ARCHITECTURAL_ANALYSIS_AND_BUILD_PLAN.md](./ARCHITECTURAL_ANALYSIS_AND_BUILD_PLAN.md)

## 🔄 CI/CD Workflows

- **Web CI/CD**: `.github/workflows/web-ci-cd.yml` - Triggers on changes to `src/`, `public/`, web config files
- **iOS CI/CD**: `.github/workflows/ios-ci-cd.yml` - Triggers on changes to `ios/` directory
- **Staging**: `.github/workflows/staging.yml` - Deploy to staging environments

## 🛠️ Tech Stack

### Web Application
- **Framework**: React 18 + TypeScript
- **Build Tool**: Vite 5
- **UI**: shadcn-ui + Tailwind CSS
- **Backend**: Supabase
- **State**: TanStack Query

### iOS Application
- **Language**: Swift 5.9+
- **UI Framework**: SwiftUI
- **Architecture**: MVVM + Services
- **Backend**: Supabase
- **Target**: iOS 17.0+

## 🔐 Environment Setup

### Web Environment Variables
Create `.env.local`:
```bash
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### iOS Configuration
Create `ios/Config/Secrets.xcconfig`:
```bash
SUPABASE_URL = your_supabase_url
SUPABASE_ANON_KEY = your_supabase_anon_key
```

## 🤝 Contributing

When working on this repository:

1. **Web changes**: Work in root directory, changes trigger `web-ci-cd.yml`
2. **iOS changes**: Work in `ios/` directory, changes trigger `ios-ci-cd.yml`
3. **Backend changes**: Update both platforms to maintain consistency
4. **Commit messages**: Prefix with `web:`, `ios:`, or `backend:` for clarity

## 📦 Deployment

- **Web**: Deployed via GitHub Actions to Vercel/Netlify
- **iOS**: TestFlight builds via Xcode Cloud or manual upload

See [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) for detailed instructions.

## 📄 License

Proprietary - All rights reserved

## 🆘 Support

- Web issues: Tag with `platform:web`
- iOS issues: Tag with `platform:ios`
- Backend issues: Tag with `platform:backend`
