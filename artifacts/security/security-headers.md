# Security Headers Report

**URL**: http://localhost:8080
**Date**: 2026-01-17T15:37:33.822Z
**Score**: 100%

## Summary
- Total Headers Checked: 8
- Present: 6
- Valid: 6
- Missing: 0
- Invalid: 0

## Header Details

| Header | Status | Value | Issues |
|--------|--------|-------|--------|
| strict-transport-security | ✅ | max-age=63072000; includeSubDomains; preload... | None |
| x-content-type-options | ✅ | nosniff... | None |
| x-frame-options | ✅ | DENY... | None |
| referrer-policy | ✅ | strict-origin-when-cross-origin... | None |
| permissions-policy | ✅ | camera=(), microphone=(), geolocation=(), interest... | None |
| content-security-policy | ✅ | default-src 'self'; script-src 'self' 'unsafe-inli... | None |
| cross-origin-opener-policy | ❌ | Missing | None |
| cross-origin-resource-policy | ❌ | Missing | None |

## Recommendations


3. Consider removing unsafe-inline from CSP

4. Consider removing unsafe-eval from CSP

✅ All required headers are properly configured
