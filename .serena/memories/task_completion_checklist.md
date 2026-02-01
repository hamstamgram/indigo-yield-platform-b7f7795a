# Task Completion Checklist

## Before Committing Code

### 1. Type Check
```bash
npm run type-check
```
Ensure no TypeScript errors.

### 2. Lint
```bash
npm run lint
```
Must pass with zero warnings (--max-warnings=0).

### 3. Format
```bash
npm run format
```
Or let the pre-commit hook handle it via lint-staged.

### 4. Run Relevant Tests
```bash
npm run test           # Unit tests
npm run test:e2e       # If UI changes
npm run test:auth      # If auth-related changes
```

## Pre-commit Hook
The project uses Husky with lint-staged. On commit:
- Runs `npx lint-staged` automatically
- This formats and lints staged files

## Security Considerations
- **Never log PII** (this is a financial platform)
- KYC/AML checks are critical
- Test RLS policies if modifying database access
- Run `npm run audit:rls` for security tests

## Documentation
- Update relevant docs in `docs/` if changing workflows
- Check `docs/flows/` for workflow documentation
- ERD available in `docs/erd.md`

## Deployment
- Deployed via Lovable (auto-deploys from git push to main)
- Production URL: https://indigo-yield-platform-v01.lovable.app/
- Review `PRODUCTION_DEPLOYMENT_CHECKLIST.md` before production deploys
