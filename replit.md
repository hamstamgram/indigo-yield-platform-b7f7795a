# Indigo Yield Platform - Replit Setup

## Project Overview
This is the Indigo Yield Platform, a secure, professional-grade investment management platform for cryptocurrency yield generation, built with React, TypeScript, and Supabase.

## Setup Status
✅ **Successfully imported and configured for Replit environment**

### Configuration Changes Made:
1. **Vite Configuration**: Updated to bind to `0.0.0.0:5000` for Replit proxy support
2. **File Watching**: Configured polling-based file watching to avoid ENOSPC errors
3. **Ignored Directories**: Optimized file watching by ignoring unnecessary directories (mobile, backend, docs, etc.)
4. **Workflow Setup**: Configured development server workflow on port 5000
5. **Deployment**: Configured for autoscale deployment using Vercel

### Current Architecture:
- **Frontend**: React 18 + TypeScript + Vite (Port 5000)
- **Styling**: Tailwind CSS + shadcn/ui components
- **Backend**: Supabase (PostgreSQL + Auth + Storage + Edge Functions)
- **Authentication**: Supabase Auth with RLS
- **State Management**: React Context + Hooks
- **Environment**: Production-ready .env configuration with Supabase credentials

### Environment Variables:
The project includes pre-configured Supabase environment variables:
- Main Supabase instance for core functionality
- Portfolio dashboard Supabase instance
- Sentry error tracking
- MailerLite integration

### Running the Project:
- **Development**: `npm run dev` (automatically configured in workflow)
- **Build**: `npm run build`
- **Preview**: `npm run preview`

### Recent Changes:
- December 24, 2025: Successfully imported from GitHub and configured for Replit environment
- Fixed file watcher issues with large project structure
- Configured optimal Vite settings for cloud development environment

### User Preferences:
- No specific preferences documented yet

### Project Architecture:
- Modern React application with comprehensive investment management features
- Secure authentication with 2FA support
- Real-time portfolio tracking
- Admin dashboard for investor management
- PDF statement generation
- Document management system
- Mobile-responsive design

## Development Notes:
- The project has extensive file structure with mobile apps (iOS/Android) and backend scripts
- Only the web frontend is configured to run in Replit
- All other directories (mobile/, backend/, ios/) are excluded from file watching for performance