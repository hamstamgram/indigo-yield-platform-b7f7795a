
# Update Platform Logo

## Overview

Replace the current platform logo with the new uploaded INDIGO white logo across all locations in the application.

---

## Locations to Update

The current logo (`/lovable-uploads/74aa0ccc-22f8-4892-9282-3991b5e10f4c.png`) is used in **10 files**:

| File | Usage |
|------|-------|
| `src/components/AppLogo.tsx` | Main reusable logo component |
| `src/components/layout/Sidebar.tsx` | Sidebar header logo |
| `src/components/layout/Header.tsx` | Mobile header logo |
| `src/components/layout/MobileNav.tsx` | Mobile navigation logo |
| `src/pages/Login.tsx` | Login page branding |
| `src/pages/ForgotPassword.tsx` | Forgot password page branding |
| `src/pages/ResetPassword.tsx` | Reset password page branding |
| `src/pages/InvestorInvite.tsx` | Investor invite page branding |
| `src/pages/Privacy.tsx` | Privacy page header and footer |
| `src/pages/Terms.tsx` | Terms page header and footer |

---

## Implementation Steps

### Step 1: Copy the uploaded logo to the project
Copy the uploaded image to the public folder for direct URL access:
```
user-uploads://INDIGO_logo-white.png → public/lovable-uploads/INDIGO_logo-white.png
```

### Step 2: Update all logo references
Replace the old logo path in all 10 files:

**From:**
```
/lovable-uploads/74aa0ccc-22f8-4892-9282-3991b5e10f4c.png
```

**To:**
```
/lovable-uploads/INDIGO_logo-white.png
```

---

## Files to Modify

1. **`src/components/AppLogo.tsx`** - Line 13
2. **`src/components/layout/Sidebar.tsx`** - Line 226
3. **`src/components/layout/Header.tsx`** - Line 40
4. **`src/components/layout/MobileNav.tsx`** - Line 89
5. **`src/pages/Login.tsx`** - Line 83
6. **`src/pages/ForgotPassword.tsx`** - Line 57
7. **`src/pages/ResetPassword.tsx`** - Line 143
8. **`src/pages/InvestorInvite.tsx`** - Line 103
9. **`src/pages/Privacy.tsx`** - Lines 14 and 146
10. **`src/pages/Terms.tsx`** - Lines 14 and 131

---

## Expected Result

After implementation:
- New INDIGO white logo displays across all pages
- Logo appears in sidebar, header, mobile navigation
- All auth pages (login, forgot password, reset password, invite) show updated branding
- Terms and Privacy pages display the new logo
- Consistent branding throughout the platform
