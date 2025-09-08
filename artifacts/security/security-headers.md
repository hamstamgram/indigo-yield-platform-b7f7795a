# Security Headers Report

**URL**: https://indigo-yield-platform-v01-hamstamgrams-projects.vercel.app
**Date**: 2025-09-07T16:50:48.601Z
**Score**: 83%

## Summary
- Total Headers Checked: 8
- Present: 5
- Valid: 5
- Missing: 1
- Invalid: 0

## Header Details

| Header | Status | Value | Issues |
|--------|--------|-------|--------|
| strict-transport-security | ✅ | max-age=63072000; includeSubDomains; preload... | None |
| x-content-type-options | ✅ | nosniff... | None |
| x-frame-options | ❌ | Missing | Header is missing |
| referrer-policy | ✅ | strict-origin-when-cross-origin... | None |
| permissions-policy | ✅ | geolocation=(), microphone=(), camera=(), payment=... | None |
| content-security-policy | ✅ | default-src 'self'; script-src 'self' 'unsafe-inli... | None |
| cross-origin-opener-policy | ❌ | Missing | None |
| cross-origin-resource-policy | ❌ | Missing | None |

## Recommendations
1. Add missing required headers to vercel.json


3. Consider removing unsafe-inline from CSP

4. Consider removing unsafe-eval from CSP

5. Aim for 100% compliance with required headers
