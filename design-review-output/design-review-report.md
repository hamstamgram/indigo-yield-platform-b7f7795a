# 🎨 Design Review Report

**Generated:** 2025-10-08T16:01:27.374Z
**URL:** http://localhost:8080

## 📊 Summary

- 🔴 Critical Issues: 2
- 🟡 Warnings: 1
- 🟢 Passed: 0

## 📸 Screenshots Captured

### Home

- iPhone SE (375×667): `design-review-output/screenshots/home/iPhone_SE_375x667.png`
- iPhone 12/13 (390×844): `design-review-output/screenshots/home/iPhone_12_13_390x844.png`
- iPhone 14 Pro Max (430×932): `design-review-output/screenshots/home/iPhone_14_Pro_Max_430x932.png`
- iPad Mini (768×1024): `design-review-output/screenshots/home/iPad_Mini_768x1024.png`
- iPad Pro 11" (834×1194): `design-review-output/screenshots/home/iPad_Pro_11__834x1194.png`
- Laptop (1280×720): `design-review-output/screenshots/home/Laptop_1280x720.png`
- Desktop HD (1920×1080): `design-review-output/screenshots/home/Desktop_HD_1920x1080.png`
- Desktop 4K (2560×1440): `design-review-output/screenshots/home/Desktop_4K_2560x1440.png`

## Accessibility

### 🔴 Buttons without accessible names

**Count:** 1

## Performance

### 🟡 High number of resources

**Count:** 103

**Recommendation:** Consider bundling, lazy loading, or using HTTP/2

## JavaScript

### 🔴 Console errors detected

**Count:** 83

**Details:**
```json
[
  {
    "type": "error",
    "message": "X-Frame-Options may only be set via an HTTP header sent along with a document. It may not be set inside <meta>."
  },
  {
    "type": "error",
    "message": "Sentry: Failed to initialize Error: Multiple Sentry Session Replay instances are not supported\n    at new Replay (http://localhost:8080/node_modules/.vite/deps/@sentry_react.js?v=502a7c65:22538:13)\n    at Module.replayIntegration (http://localhost:8080/node_modules/.vite/deps/@sentry_react.js?v=502a7c65:22421:10)\n    at initSentry (http://localhost:8080/src/utils/monitoring/sentry.ts:18:24)\n    at http://localhost:8080/src/App.tsx:174:9\n    at commitHookEffectListMount (http://localhost:8080/node_modules/.vite/deps/chunk-OR6547GA.js?v=2a8798f6:16915:34)\n    at commitPassiveMountOnFiber (http://localhost:8080/node_modules/.vite/deps/chunk-OR6547GA.js?v=2a8798f6:18156:19)\n    at commitPassiveMountEffects_complete (http://localhost:8080/node_modules/.vite/deps/chunk-OR6547GA.js?v=2a8798f6:18129:17)\n    at commitPassiveMountEffects_begin (http://localhost:8080/node_modules/.vite/deps/chunk-OR6547GA.js?v=2a8798f6:18119:15)\n    at commitPassiveMountEffects (http://localhost:8080/node_modules/.vite/deps/chunk-OR6547GA.js?v=2a8798f6:18109:11)\n    at flushPassiveEffectsImpl (http://localhost:8080/node_modules/.vite/deps/chunk-OR6547GA.js?v=2a8798f6:19490:11)\n    at flushPassiveEffects (http://localhost:8080/node_modules/.vite/deps/chunk-OR6547GA.js?v=2a8798f6:19447:22)\n    at http://localhost:8080/node_modules/.vite/deps/chunk-OR6547GA.js?v=2a8798f6:19328:17\n    at workLoop (http://localhost:8080/node_modules/.vite/deps/chunk-OR6547GA.js?v=2a8798f6:197:42)\n    at flushWork (http://localhost:8080/node_modules/.vite/deps/chunk-OR6547GA.js?v=2a8798f6:176:22)\n    at MessagePort.performWorkUntilDeadline (http://localhost:8080/node_modules/.vite/deps/chunk-OR6547GA.js?v=2a8798f6:384:29)"
  },
  {
    "type": "error",
    "message": "Failed to load resource: the server responded with a status of 404 ()"
  },
  {
    "type": "error",
    "message": "Refused to load the font 'https://fonts.gstatic.com/s/montserrat/v26/JTUSjIg1_i6t8kCHKm459WlhyyTh89Y.woff2' because it violates the following Content Security Policy directive: \"font-src 'self' data:\".\n"
  },
  {
    "type": "error",
    "message": "Refused to load the font 'https://fonts.gstatic.com/s/montserrat/v26/JTUSjIg1_i6t8kCHKm459WRhyyTh89Y.woff2' because it violates the following Content Security Policy directive: \"font-src 'self' data:\".\n"
  },
  {
    "type": "error",
    "message": "Refused to load the font 'https://fonts.gstatic.com/s/montserrat/v26/JTUSjIg1_i6t8kCHKm459W1hyyTh89Y.woff2' because it violates the following Content Security Policy directive: \"font-src 'self' data:\".\n"
  },
  {
    "type": "error",
    "message": "Refused to load the font 'https://fonts.gstatic.com/s/montserrat/v26/JTUSjIg1_i6t8kCHKm459WxhyyTh89Y.woff2' because it violates the following Content Security Policy directive: \"font-src 'self' data:\".\n"
  },
  {
    "type": "error",
    "message": "Refused to load the font 'https://fonts.gstatic.com/s/montserrat/v26/JTUSjIg1_i6t8kCHKm459W1hyyTh89Y.woff2' because it violates the following Content Security Policy directive: \"font-src 'self' data:\".\n"
  },
  {
    "type": "error",
    "message": "Refused to load the font 'https://fonts.gstatic.com/s/montserrat/v26/JTUSjIg1_i6t8kCHKm459W1hyyTh89Y.woff2' because it violates the following Content Security Policy directive: \"font-src 'self' data:\".\n"
  },
  {
    "type": "error",
    "message": "Refused to load the font 'https://fonts.gstatic.com/s/montserrat/v26/JTUSjIg1_i6t8kCHKm459W1hyyTh89Y.woff2' because it violates the following Content Security Policy directive: \"font-src 'self' data:\".\n"
  },
  {
    "type": "error",
    "message": "Refused to load the font 'https://fonts.gstatic.com/s/montserrat/v26/JTUSjIg1_i6t8kCHKm459W1hyyTh89Y.woff2' because it violates the following Content Security Policy directive: \"font-src 'self' data:\".\n"
  },
  {
    "type": "error",
    "message": "X-Frame-Options may only be set via an HTTP header sent along with a document. It may not be set inside <meta>."
  },
  {
    "type": "error",
    "message": "Sentry: Failed to initialize Error: Multiple Sentry Session Replay instances are not supported\n    at new Replay (http://localhost:8080/node_modules/.vite/deps/@sentry_react.js?v=502a7c65:22538:13)\n    at Module.replayIntegration (http://localhost:8080/node_modules/.vite/deps/@sentry_react.js?v=502a7c65:22421:10)\n    at initSentry (http://localhost:8080/src/utils/monitoring/sentry.ts:18:24)\n    at http://localhost:8080/src/App.tsx:174:9\n    at commitHookEffectListMount (http://localhost:8080/node_modules/.vite/deps/chunk-OR6547GA.js?v=2a8798f6:16915:34)\n    at commitPassiveMountOnFiber (http://localhost:8080/node_modules/.vite/deps/chunk-OR6547GA.js?v=2a8798f6:18156:19)\n    at commitPassiveMountEffects_complete (http://localhost:8080/node_modules/.vite/deps/chunk-OR6547GA.js?v=2a8798f6:18129:17)\n    at commitPassiveMountEffects_begin (http://localhost:8080/node_modules/.vite/deps/chunk-OR6547GA.js?v=2a8798f6:18119:15)\n    at commitPassiveMountEffects (http://localhost:8080/node_modules/.vite/deps/chunk-OR6547GA.js?v=2a8798f6:18109:11)\n    at flushPassiveEffectsImpl (http://localhost:8080/node_modules/.vite/deps/chunk-OR6547GA.js?v=2a8798f6:19490:11)\n    at flushPassiveEffects (http://localhost:8080/node_modules/.vite/deps/chunk-OR6547GA.js?v=2a8798f6:19447:22)\n    at http://localhost:8080/node_modules/.vite/deps/chunk-OR6547GA.js?v=2a8798f6:19328:17\n    at workLoop (http://localhost:8080/node_modules/.vite/deps/chunk-OR6547GA.js?v=2a8798f6:197:42)\n    at flushWork (http://localhost:8080/node_modules/.vite/deps/chunk-OR6547GA.js?v=2a8798f6:176:22)\n    at MessagePort.performWorkUntilDeadline (http://localhost:8080/node_modules/.vite/deps/chunk-OR6547GA.js?v=2a8798f6:384:29)"
  },
  {
    "type": "error",
    "message": "Refused to load the font 'https://fonts.gstatic.com/s/montserrat/v26/JTUSjIg1_i6t8kCHKm459WxhyyTh89Y.woff2' because it violates the following Content Security Policy directive: \"font-src 'self' data:\".\n"
  },
  {
    "type": "error",
    "message": "X-Frame-Options may only be set via an HTTP header sent along with a document. It may not be set inside <meta>."
  },
  {
    "type": "error",
    "message": "Sentry: Failed to initialize Error: Multiple Sentry Session Replay instances are not supported\n    at new Replay (http://localhost:8080/node_modules/.vite/deps/@sentry_react.js?v=502a7c65:22538:13)\n    at Module.replayIntegration (http://localhost:8080/node_modules/.vite/deps/@sentry_react.js?v=502a7c65:22421:10)\n    at initSentry (http://localhost:8080/src/utils/monitoring/sentry.ts:18:24)\n    at http://localhost:8080/src/App.tsx:174:9\n    at commitHookEffectListMount (http://localhost:8080/node_modules/.vite/deps/chunk-OR6547GA.js?v=2a8798f6:16915:34)\n    at commitPassiveMountOnFiber (http://localhost:8080/node_modules/.vite/deps/chunk-OR6547GA.js?v=2a8798f6:18156:19)\n    at commitPassiveMountEffects_complete (http://localhost:8080/node_modules/.vite/deps/chunk-OR6547GA.js?v=2a8798f6:18129:17)\n    at commitPassiveMountEffects_begin (http://localhost:8080/node_modules/.vite/deps/chunk-OR6547GA.js?v=2a8798f6:18119:15)\n    at commitPassiveMountEffects (http://localhost:8080/node_modules/.vite/deps/chunk-OR6547GA.js?v=2a8798f6:18109:11)\n    at flushPassiveEffectsImpl (http://localhost:8080/node_modules/.vite/deps/chunk-OR6547GA.js?v=2a8798f6:19490:11)\n    at flushPassiveEffects (http://localhost:8080/node_modules/.vite/deps/chunk-OR6547GA.js?v=2a8798f6:19447:22)\n    at http://localhost:8080/node_modules/.vite/deps/chunk-OR6547GA.js?v=2a8798f6:19328:17\n    at workLoop (http://localhost:8080/node_modules/.vite/deps/chunk-OR6547GA.js?v=2a8798f6:197:42)\n    at flushWork (http://localhost:8080/node_modules/.vite/deps/chunk-OR6547GA.js?v=2a8798f6:176:22)\n    at MessagePort.performWorkUntilDeadline (http://localhost:8080/node_modules/.vite/deps/chunk-OR6547GA.js?v=2a8798f6:384:29)"
  },
  {
    "type": "error",
    "message": "Refused to load the font 'https://fonts.gstatic.com/s/montserrat/v26/JTUSjIg1_i6t8kCHKm459WxhyyTh89Y.woff2' because it violates the following Content Security Policy directive: \"font-src 'self' data:\".\n"
  },
  {
    "type": "error",
    "message": "X-Frame-Options may only be set via an HTTP header sent along with a document. It may not be set inside <meta>."
  },
  {
    "type": "error",
    "message": "Sentry: Failed to initialize Error: Multiple Sentry Session Replay instances are not supported\n    at new Replay (http://localhost:8080/node_modules/.vite/deps/@sentry_react.js?v=502a7c65:22538:13)\n    at Module.replayIntegration (http://localhost:8080/node_modules/.vite/deps/@sentry_react.js?v=502a7c65:22421:10)\n    at initSentry (http://localhost:8080/src/utils/monitoring/sentry.ts:18:24)\n    at http://localhost:8080/src/App.tsx:174:9\n    at commitHookEffectListMount (http://localhost:8080/node_modules/.vite/deps/chunk-OR6547GA.js?v=2a8798f6:16915:34)\n    at commitPassiveMountOnFiber (http://localhost:8080/node_modules/.vite/deps/chunk-OR6547GA.js?v=2a8798f6:18156:19)\n    at commitPassiveMountEffects_complete (http://localhost:8080/node_modules/.vite/deps/chunk-OR6547GA.js?v=2a8798f6:18129:17)\n    at commitPassiveMountEffects_begin (http://localhost:8080/node_modules/.vite/deps/chunk-OR6547GA.js?v=2a8798f6:18119:15)\n    at commitPassiveMountEffects (http://localhost:8080/node_modules/.vite/deps/chunk-OR6547GA.js?v=2a8798f6:18109:11)\n    at flushPassiveEffectsImpl (http://localhost:8080/node_modules/.vite/deps/chunk-OR6547GA.js?v=2a8798f6:19490:11)\n    at flushPassiveEffects (http://localhost:8080/node_modules/.vite/deps/chunk-OR6547GA.js?v=2a8798f6:19447:22)\n    at http://localhost:8080/node_modules/.vite/deps/chunk-OR6547GA.js?v=2a8798f6:19328:17\n    at workLoop (http://localhost:8080/node_modules/.vite/deps/chunk-OR6547GA.js?v=2a8798f6:197:42)\n    at flushWork (http://localhost:8080/node_modules/.vite/deps/chunk-OR6547GA.js?v=2a8798f6:176:22)\n    at MessagePort.performWorkUntilDeadline (http://localhost:8080/node_modules/.vite/deps/chunk-OR6547GA.js?v=2a8798f6:384:29)"
  },
  {
    "type": "error",
    "message": "Refused to load the font 'https://fonts.gstatic.com/s/montserrat/v26/JTUSjIg1_i6t8kCHKm459WxhyyTh89Y.woff2' because it violates the following Content Security Policy directive: \"font-src 'self' data:\".\n"
  },
  {
    "type": "error",
    "message": "Refused to load the font 'https://fonts.gstatic.com/s/montserrat/v26/JTUSjIg1_i6t8kCHKm459WlhyyTh89Y.woff2' because it violates the following Content Security Policy directive: \"font-src 'self' data:\".\n"
  },
  {
    "type": "error",
    "message": "Refused to load the font 'https://fonts.gstatic.com/s/montserrat/v26/JTUSjIg1_i6t8kCHKm459WRhyyTh89Y.woff2' because it violates the following Content Security Policy directive: \"font-src 'self' data:\".\n"
  },
  {
    "type": "error",
    "message": "Refused to load the font 'https://fonts.gstatic.com/s/montserrat/v26/JTUSjIg1_i6t8kCHKm459W1hyyTh89Y.woff2' because it violates the following Content Security Policy directive: \"font-src 'self' data:\".\n"
  },
  {
    "type": "error",
    "message": "Refused to load the font 'https://fonts.gstatic.com/s/montserrat/v26/JTUSjIg1_i6t8kCHKm459WxhyyTh89Y.woff2' because it violates the following Content Security Policy directive: \"font-src 'self' data:\".\n"
  },
  {
    "type": "error",
    "message": "Refused to load the font 'https://fonts.gstatic.com/s/montserrat/v26/JTUSjIg1_i6t8kCHKm459W1hyyTh89Y.woff2' because it violates the following Content Security Policy directive: \"font-src 'self' data:\".\n"
  },
  {
    "type": "error",
    "message": "Refused to load the font 'https://fonts.gstatic.com/s/montserrat/v26/JTUSjIg1_i6t8kCHKm459W1hyyTh89Y.woff2' because it violates the following Content Security Policy directive: \"font-src 'self' data:\".\n"
  },
  {
    "type": "error",
    "message": "Refused to load the font 'https://fonts.gstatic.com/s/montserrat/v26/JTUSjIg1_i6t8kCHKm459W1hyyTh89Y.woff2' because it violates the following Content Security Policy directive: \"font-src 'self' data:\".\n"
  },
  {
    "type": "error",
    "message": "Refused to load the font 'https://fonts.gstatic.com/s/montserrat/v26/JTUSjIg1_i6t8kCHKm459W1hyyTh89Y.woff2' because it violates the following Content Security Policy directive: \"font-src 'self' data:\".\n"
  },
  {
    "type": "error",
    "message": "X-Frame-Options may only be set via an HTTP header sent along with a document. It may not be set inside <meta>."
  },
  {
    "type": "error",
    "message": "Sentry: Failed to initialize Error: Multiple Sentry Session Replay instances are not supported\n    at new Replay (http://localhost:8080/node_modules/.vite/deps/@sentry_react.js?v=502a7c65:22538:13)\n    at Module.replayIntegration (http://localhost:8080/node_modules/.vite/deps/@sentry_react.js?v=502a7c65:22421:10)\n    at initSentry (http://localhost:8080/src/utils/monitoring/sentry.ts:18:24)\n    at http://localhost:8080/src/App.tsx:174:9\n    at commitHookEffectListMount (http://localhost:8080/node_modules/.vite/deps/chunk-OR6547GA.js?v=2a8798f6:16915:34)\n    at commitPassiveMountOnFiber (http://localhost:8080/node_modules/.vite/deps/chunk-OR6547GA.js?v=2a8798f6:18156:19)\n    at commitPassiveMountEffects_complete (http://localhost:8080/node_modules/.vite/deps/chunk-OR6547GA.js?v=2a8798f6:18129:17)\n    at commitPassiveMountEffects_begin (http://localhost:8080/node_modules/.vite/deps/chunk-OR6547GA.js?v=2a8798f6:18119:15)\n    at commitPassiveMountEffects (http://localhost:8080/node_modules/.vite/deps/chunk-OR6547GA.js?v=2a8798f6:18109:11)\n    at flushPassiveEffectsImpl (http://localhost:8080/node_modules/.vite/deps/chunk-OR6547GA.js?v=2a8798f6:19490:11)\n    at flushPassiveEffects (http://localhost:8080/node_modules/.vite/deps/chunk-OR6547GA.js?v=2a8798f6:19447:22)\n    at http://localhost:8080/node_modules/.vite/deps/chunk-OR6547GA.js?v=2a8798f6:19328:17\n    at workLoop (http://localhost:8080/node_modules/.vite/deps/chunk-OR6547GA.js?v=2a8798f6:197:42)\n    at flushWork (http://localhost:8080/node_modules/.vite/deps/chunk-OR6547GA.js?v=2a8798f6:176:22)\n    at MessagePort.performWorkUntilDeadline (http://localhost:8080/node_modules/.vite/deps/chunk-OR6547GA.js?v=2a8798f6:384:29)"
  },
  {
    "type": "error",
    "message": "Refused to load the font 'https://fonts.gstatic.com/s/montserrat/v26/JTUSjIg1_i6t8kCHKm459WxhyyTh89Y.woff2' because it violates the following Content Security Policy directive: \"font-src 'self' data:\".\n"
  },
  {
    "type": "error",
    "message": "Refused to load the font 'https://fonts.gstatic.com/s/montserrat/v26/JTUSjIg1_i6t8kCHKm459WlhyyTh89Y.woff2' because it violates the following Content Security Policy directive: \"font-src 'self' data:\".\n"
  },
  {
    "type": "error",
    "message": "Refused to load the font 'https://fonts.gstatic.com/s/montserrat/v26/JTUSjIg1_i6t8kCHKm459WRhyyTh89Y.woff2' because it violates the following Content Security Policy directive: \"font-src 'self' data:\".\n"
  },
  {
    "type": "error",
    "message": "Refused to load the font 'https://fonts.gstatic.com/s/montserrat/v26/JTUSjIg1_i6t8kCHKm459W1hyyTh89Y.woff2' because it violates the following Content Security Policy directive: \"font-src 'self' data:\".\n"
  },
  {
    "type": "error",
    "message": "Refused to load the font 'https://fonts.gstatic.com/s/montserrat/v26/JTUSjIg1_i6t8kCHKm459WxhyyTh89Y.woff2' because it violates the following Content Security Policy directive: \"font-src 'self' data:\".\n"
  },
  {
    "type": "error",
    "message": "Refused to load the font 'https://fonts.gstatic.com/s/montserrat/v26/JTUSjIg1_i6t8kCHKm459W1hyyTh89Y.woff2' because it violates the following Content Security Policy directive: \"font-src 'self' data:\".\n"
  },
  {
    "type": "error",
    "message": "Refused to load the font 'https://fonts.gstatic.com/s/montserrat/v26/JTUSjIg1_i6t8kCHKm459W1hyyTh89Y.woff2' because it violates the following Content Security Policy directive: \"font-src 'self' data:\".\n"
  },
  {
    "type": "error",
    "message": "Refused to load the font 'https://fonts.gstatic.com/s/montserrat/v26/JTUSjIg1_i6t8kCHKm459W1hyyTh89Y.woff2' because it violates the following Content Security Policy directive: \"font-src 'self' data:\".\n"
  },
  {
    "type": "error",
    "message": "Refused to load the font 'https://fonts.gstatic.com/s/montserrat/v26/JTUSjIg1_i6t8kCHKm459W1hyyTh89Y.woff2' because it violates the following Content Security Policy directive: \"font-src 'self' data:\".\n"
  },
  {
    "type": "error",
    "message": "X-Frame-Options may only be set via an HTTP header sent along with a document. It may not be set inside <meta>."
  },
  {
    "type": "error",
    "message": "Sentry: Failed to initialize Error: Multiple Sentry Session Replay instances are not supported\n    at new Replay (http://localhost:8080/node_modules/.vite/deps/@sentry_react.js?v=502a7c65:22538:13)\n    at Module.replayIntegration (http://localhost:8080/node_modules/.vite/deps/@sentry_react.js?v=502a7c65:22421:10)\n    at initSentry (http://localhost:8080/src/utils/monitoring/sentry.ts:18:24)\n    at http://localhost:8080/src/App.tsx:174:9\n    at commitHookEffectListMount (http://localhost:8080/node_modules/.vite/deps/chunk-OR6547GA.js?v=2a8798f6:16915:34)\n    at commitPassiveMountOnFiber (http://localhost:8080/node_modules/.vite/deps/chunk-OR6547GA.js?v=2a8798f6:18156:19)\n    at commitPassiveMountEffects_complete (http://localhost:8080/node_modules/.vite/deps/chunk-OR6547GA.js?v=2a8798f6:18129:17)\n    at commitPassiveMountEffects_begin (http://localhost:8080/node_modules/.vite/deps/chunk-OR6547GA.js?v=2a8798f6:18119:15)\n    at commitPassiveMountEffects (http://localhost:8080/node_modules/.vite/deps/chunk-OR6547GA.js?v=2a8798f6:18109:11)\n    at flushPassiveEffectsImpl (http://localhost:8080/node_modules/.vite/deps/chunk-OR6547GA.js?v=2a8798f6:19490:11)\n    at flushPassiveEffects (http://localhost:8080/node_modules/.vite/deps/chunk-OR6547GA.js?v=2a8798f6:19447:22)\n    at http://localhost:8080/node_modules/.vite/deps/chunk-OR6547GA.js?v=2a8798f6:19328:17\n    at workLoop (http://localhost:8080/node_modules/.vite/deps/chunk-OR6547GA.js?v=2a8798f6:197:42)\n    at flushWork (http://localhost:8080/node_modules/.vite/deps/chunk-OR6547GA.js?v=2a8798f6:176:22)\n    at MessagePort.performWorkUntilDeadline (http://localhost:8080/node_modules/.vite/deps/chunk-OR6547GA.js?v=2a8798f6:384:29)"
  },
  {
    "type": "error",
    "message": "Refused to load the font 'https://fonts.gstatic.com/s/montserrat/v26/JTUSjIg1_i6t8kCHKm459WxhyyTh89Y.woff2' because it violates the following Content Security Policy directive: \"font-src 'self' data:\".\n"
  },
  {
    "type": "error",
    "message": "Refused to load the font 'https://fonts.gstatic.com/s/montserrat/v26/JTUSjIg1_i6t8kCHKm459WlhyyTh89Y.woff2' because it violates the following Content Security Policy directive: \"font-src 'self' data:\".\n"
  },
  {
    "type": "error",
    "message": "Refused to load the font 'https://fonts.gstatic.com/s/montserrat/v26/JTUSjIg1_i6t8kCHKm459WRhyyTh89Y.woff2' because it violates the following Content Security Policy directive: \"font-src 'self' data:\".\n"
  },
  {
    "type": "error",
    "message": "Refused to load the font 'https://fonts.gstatic.com/s/montserrat/v26/JTUSjIg1_i6t8kCHKm459W1hyyTh89Y.woff2' because it violates the following Content Security Policy directive: \"font-src 'self' data:\".\n"
  },
  {
    "type": "error",
    "message": "Refused to load the font 'https://fonts.gstatic.com/s/montserrat/v26/JTUSjIg1_i6t8kCHKm459WxhyyTh89Y.woff2' because it violates the following Content Security Policy directive: \"font-src 'self' data:\".\n"
  },
  {
    "type": "error",
    "message": "Refused to load the font 'https://fonts.gstatic.com/s/montserrat/v26/JTUSjIg1_i6t8kCHKm459W1hyyTh89Y.woff2' because it violates the following Content Security Policy directive: \"font-src 'self' data:\".\n"
  },
  {
    "type": "error",
    "message": "Refused to load the font 'https://fonts.gstatic.com/s/montserrat/v26/JTUSjIg1_i6t8kCHKm459W1hyyTh89Y.woff2' because it violates the following Content Security Policy directive: \"font-src 'self' data:\".\n"
  },
  {
    "type": "error",
    "message": "Refused to load the font 'https://fonts.gstatic.com/s/montserrat/v26/JTUSjIg1_i6t8kCHKm459W1hyyTh89Y.woff2' because it violates the following Content Security Policy directive: \"font-src 'self' data:\".\n"
  },
  {
    "type": "error",
    "message": "Refused to load the font 'https://fonts.gstatic.com/s/montserrat/v26/JTUSjIg1_i6t8kCHKm459W1hyyTh89Y.woff2' because it violates the following Content Security Policy directive: \"font-src 'self' data:\".\n"
  },
  {
    "type": "error",
    "message": "X-Frame-Options may only be set via an HTTP header sent along with a document. It may not be set inside <meta>."
  },
  {
    "type": "error",
    "message": "Sentry: Failed to initialize Error: Multiple Sentry Session Replay instances are not supported\n    at new Replay (http://localhost:8080/node_modules/.vite/deps/@sentry_react.js?v=502a7c65:22538:13)\n    at Module.replayIntegration (http://localhost:8080/node_modules/.vite/deps/@sentry_react.js?v=502a7c65:22421:10)\n    at initSentry (http://localhost:8080/src/utils/monitoring/sentry.ts:18:24)\n    at http://localhost:8080/src/App.tsx:174:9\n    at commitHookEffectListMount (http://localhost:8080/node_modules/.vite/deps/chunk-OR6547GA.js?v=2a8798f6:16915:34)\n    at commitPassiveMountOnFiber (http://localhost:8080/node_modules/.vite/deps/chunk-OR6547GA.js?v=2a8798f6:18156:19)\n    at commitPassiveMountEffects_complete (http://localhost:8080/node_modules/.vite/deps/chunk-OR6547GA.js?v=2a8798f6:18129:17)\n    at commitPassiveMountEffects_begin (http://localhost:8080/node_modules/.vite/deps/chunk-OR6547GA.js?v=2a8798f6:18119:15)\n    at commitPassiveMountEffects (http://localhost:8080/node_modules/.vite/deps/chunk-OR6547GA.js?v=2a8798f6:18109:11)\n    at flushPassiveEffectsImpl (http://localhost:8080/node_modules/.vite/deps/chunk-OR6547GA.js?v=2a8798f6:19490:11)\n    at flushPassiveEffects (http://localhost:8080/node_modules/.vite/deps/chunk-OR6547GA.js?v=2a8798f6:19447:22)\n    at http://localhost:8080/node_modules/.vite/deps/chunk-OR6547GA.js?v=2a8798f6:19328:17\n    at workLoop (http://localhost:8080/node_modules/.vite/deps/chunk-OR6547GA.js?v=2a8798f6:197:42)\n    at flushWork (http://localhost:8080/node_modules/.vite/deps/chunk-OR6547GA.js?v=2a8798f6:176:22)\n    at MessagePort.performWorkUntilDeadline (http://localhost:8080/node_modules/.vite/deps/chunk-OR6547GA.js?v=2a8798f6:384:29)"
  },
  {
    "type": "error",
    "message": "Refused to load the font 'https://fonts.gstatic.com/s/montserrat/v26/JTUSjIg1_i6t8kCHKm459WxhyyTh89Y.woff2' because it violates the following Content Security Policy directive: \"font-src 'self' data:\".\n"
  },
  {
    "type": "error",
    "message": "Refused to load the font 'https://fonts.gstatic.com/s/montserrat/v26/JTUSjIg1_i6t8kCHKm459WlhyyTh89Y.woff2' because it violates the following Content Security Policy directive: \"font-src 'self' data:\".\n"
  },
  {
    "type": "error",
    "message": "Refused to load the font 'https://fonts.gstatic.com/s/montserrat/v26/JTUSjIg1_i6t8kCHKm459WRhyyTh89Y.woff2' because it violates the following Content Security Policy directive: \"font-src 'self' data:\".\n"
  },
  {
    "type": "error",
    "message": "Refused to load the font 'https://fonts.gstatic.com/s/montserrat/v26/JTUSjIg1_i6t8kCHKm459W1hyyTh89Y.woff2' because it violates the following Content Security Policy directive: \"font-src 'self' data:\".\n"
  },
  {
    "type": "error",
    "message": "Refused to load the font 'https://fonts.gstatic.com/s/montserrat/v26/JTUSjIg1_i6t8kCHKm459WxhyyTh89Y.woff2' because it violates the following Content Security Policy directive: \"font-src 'self' data:\".\n"
  },
  {
    "type": "error",
    "message": "Refused to load the font 'https://fonts.gstatic.com/s/montserrat/v26/JTUSjIg1_i6t8kCHKm459W1hyyTh89Y.woff2' because it violates the following Content Security Policy directive: \"font-src 'self' data:\".\n"
  },
  {
    "type": "error",
    "message": "Refused to load the font 'https://fonts.gstatic.com/s/montserrat/v26/JTUSjIg1_i6t8kCHKm459W1hyyTh89Y.woff2' because it violates the following Content Security Policy directive: \"font-src 'self' data:\".\n"
  },
  {
    "type": "error",
    "message": "Refused to load the font 'https://fonts.gstatic.com/s/montserrat/v26/JTUSjIg1_i6t8kCHKm459W1hyyTh89Y.woff2' because it violates the following Content Security Policy directive: \"font-src 'self' data:\".\n"
  },
  {
    "type": "error",
    "message": "Refused to load the font 'https://fonts.gstatic.com/s/montserrat/v26/JTUSjIg1_i6t8kCHKm459W1hyyTh89Y.woff2' because it violates the following Content Security Policy directive: \"font-src 'self' data:\".\n"
  },
  {
    "type": "error",
    "message": "X-Frame-Options may only be set via an HTTP header sent along with a document. It may not be set inside <meta>."
  },
  {
    "type": "error",
    "message": "Sentry: Failed to initialize Error: Multiple Sentry Session Replay instances are not supported\n    at new Replay (http://localhost:8080/node_modules/.vite/deps/@sentry_react.js?v=502a7c65:22538:13)\n    at Module.replayIntegration (http://localhost:8080/node_modules/.vite/deps/@sentry_react.js?v=502a7c65:22421:10)\n    at initSentry (http://localhost:8080/src/utils/monitoring/sentry.ts:18:24)\n    at http://localhost:8080/src/App.tsx:174:9\n    at commitHookEffectListMount (http://localhost:8080/node_modules/.vite/deps/chunk-OR6547GA.js?v=2a8798f6:16915:34)\n    at commitPassiveMountOnFiber (http://localhost:8080/node_modules/.vite/deps/chunk-OR6547GA.js?v=2a8798f6:18156:19)\n    at commitPassiveMountEffects_complete (http://localhost:8080/node_modules/.vite/deps/chunk-OR6547GA.js?v=2a8798f6:18129:17)\n    at commitPassiveMountEffects_begin (http://localhost:8080/node_modules/.vite/deps/chunk-OR6547GA.js?v=2a8798f6:18119:15)\n    at commitPassiveMountEffects (http://localhost:8080/node_modules/.vite/deps/chunk-OR6547GA.js?v=2a8798f6:18109:11)\n    at flushPassiveEffectsImpl (http://localhost:8080/node_modules/.vite/deps/chunk-OR6547GA.js?v=2a8798f6:19490:11)\n    at flushPassiveEffects (http://localhost:8080/node_modules/.vite/deps/chunk-OR6547GA.js?v=2a8798f6:19447:22)\n    at http://localhost:8080/node_modules/.vite/deps/chunk-OR6547GA.js?v=2a8798f6:19328:17\n    at workLoop (http://localhost:8080/node_modules/.vite/deps/chunk-OR6547GA.js?v=2a8798f6:197:42)\n    at flushWork (http://localhost:8080/node_modules/.vite/deps/chunk-OR6547GA.js?v=2a8798f6:176:22)\n    at MessagePort.performWorkUntilDeadline (http://localhost:8080/node_modules/.vite/deps/chunk-OR6547GA.js?v=2a8798f6:384:29)"
  },
  {
    "type": "error",
    "message": "Refused to load the font 'https://fonts.gstatic.com/s/montserrat/v26/JTUSjIg1_i6t8kCHKm459WxhyyTh89Y.woff2' because it violates the following Content Security Policy directive: \"font-src 'self' data:\".\n"
  },
  {
    "type": "error",
    "message": "Refused to load the font 'https://fonts.gstatic.com/s/montserrat/v26/JTUSjIg1_i6t8kCHKm459WlhyyTh89Y.woff2' because it violates the following Content Security Policy directive: \"font-src 'self' data:\".\n"
  },
  {
    "type": "error",
    "message": "Refused to load the font 'https://fonts.gstatic.com/s/montserrat/v26/JTUSjIg1_i6t8kCHKm459WRhyyTh89Y.woff2' because it violates the following Content Security Policy directive: \"font-src 'self' data:\".\n"
  },
  {
    "type": "error",
    "message": "Refused to load the font 'https://fonts.gstatic.com/s/montserrat/v26/JTUSjIg1_i6t8kCHKm459W1hyyTh89Y.woff2' because it violates the following Content Security Policy directive: \"font-src 'self' data:\".\n"
  },
  {
    "type": "error",
    "message": "Refused to load the font 'https://fonts.gstatic.com/s/montserrat/v26/JTUSjIg1_i6t8kCHKm459WxhyyTh89Y.woff2' because it violates the following Content Security Policy directive: \"font-src 'self' data:\".\n"
  },
  {
    "type": "error",
    "message": "Refused to load the font 'https://fonts.gstatic.com/s/montserrat/v26/JTUSjIg1_i6t8kCHKm459W1hyyTh89Y.woff2' because it violates the following Content Security Policy directive: \"font-src 'self' data:\".\n"
  },
  {
    "type": "error",
    "message": "Refused to load the font 'https://fonts.gstatic.com/s/montserrat/v26/JTUSjIg1_i6t8kCHKm459W1hyyTh89Y.woff2' because it violates the following Content Security Policy directive: \"font-src 'self' data:\".\n"
  },
  {
    "type": "error",
    "message": "Refused to load the font 'https://fonts.gstatic.com/s/montserrat/v26/JTUSjIg1_i6t8kCHKm459W1hyyTh89Y.woff2' because it violates the following Content Security Policy directive: \"font-src 'self' data:\".\n"
  },
  {
    "type": "error",
    "message": "Refused to load the font 'https://fonts.gstatic.com/s/montserrat/v26/JTUSjIg1_i6t8kCHKm459W1hyyTh89Y.woff2' because it violates the following Content Security Policy directive: \"font-src 'self' data:\".\n"
  },
  {
    "type": "error",
    "message": "X-Frame-Options may only be set via an HTTP header sent along with a document. It may not be set inside <meta>."
  },
  {
    "type": "error",
    "message": "Sentry: Failed to initialize Error: Multiple Sentry Session Replay instances are not supported\n    at new Replay (http://localhost:8080/node_modules/.vite/deps/@sentry_react.js?v=502a7c65:22538:13)\n    at Module.replayIntegration (http://localhost:8080/node_modules/.vite/deps/@sentry_react.js?v=502a7c65:22421:10)\n    at initSentry (http://localhost:8080/src/utils/monitoring/sentry.ts:18:24)\n    at http://localhost:8080/src/App.tsx:174:9\n    at commitHookEffectListMount (http://localhost:8080/node_modules/.vite/deps/chunk-OR6547GA.js?v=2a8798f6:16915:34)\n    at commitPassiveMountOnFiber (http://localhost:8080/node_modules/.vite/deps/chunk-OR6547GA.js?v=2a8798f6:18156:19)\n    at commitPassiveMountEffects_complete (http://localhost:8080/node_modules/.vite/deps/chunk-OR6547GA.js?v=2a8798f6:18129:17)\n    at commitPassiveMountEffects_begin (http://localhost:8080/node_modules/.vite/deps/chunk-OR6547GA.js?v=2a8798f6:18119:15)\n    at commitPassiveMountEffects (http://localhost:8080/node_modules/.vite/deps/chunk-OR6547GA.js?v=2a8798f6:18109:11)\n    at flushPassiveEffectsImpl (http://localhost:8080/node_modules/.vite/deps/chunk-OR6547GA.js?v=2a8798f6:19490:11)\n    at flushPassiveEffects (http://localhost:8080/node_modules/.vite/deps/chunk-OR6547GA.js?v=2a8798f6:19447:22)\n    at http://localhost:8080/node_modules/.vite/deps/chunk-OR6547GA.js?v=2a8798f6:19328:17\n    at workLoop (http://localhost:8080/node_modules/.vite/deps/chunk-OR6547GA.js?v=2a8798f6:197:42)\n    at flushWork (http://localhost:8080/node_modules/.vite/deps/chunk-OR6547GA.js?v=2a8798f6:176:22)\n    at MessagePort.performWorkUntilDeadline (http://localhost:8080/node_modules/.vite/deps/chunk-OR6547GA.js?v=2a8798f6:384:29)"
  },
  {
    "type": "error",
    "message": "Refused to load the font 'https://fonts.gstatic.com/s/montserrat/v26/JTUSjIg1_i6t8kCHKm459WxhyyTh89Y.woff2' because it violates the following Content Security Policy directive: \"font-src 'self' data:\".\n"
  },
  {
    "type": "error",
    "message": "Refused to load the font 'https://fonts.gstatic.com/s/montserrat/v26/JTUSjIg1_i6t8kCHKm459WlhyyTh89Y.woff2' because it violates the following Content Security Policy directive: \"font-src 'self' data:\".\n"
  },
  {
    "type": "error",
    "message": "Refused to load the font 'https://fonts.gstatic.com/s/montserrat/v26/JTUSjIg1_i6t8kCHKm459WRhyyTh89Y.woff2' because it violates the following Content Security Policy directive: \"font-src 'self' data:\".\n"
  },
  {
    "type": "error",
    "message": "Refused to load the font 'https://fonts.gstatic.com/s/montserrat/v26/JTUSjIg1_i6t8kCHKm459W1hyyTh89Y.woff2' because it violates the following Content Security Policy directive: \"font-src 'self' data:\".\n"
  },
  {
    "type": "error",
    "message": "Refused to load the font 'https://fonts.gstatic.com/s/montserrat/v26/JTUSjIg1_i6t8kCHKm459WxhyyTh89Y.woff2' because it violates the following Content Security Policy directive: \"font-src 'self' data:\".\n"
  },
  {
    "type": "error",
    "message": "Refused to load the font 'https://fonts.gstatic.com/s/montserrat/v26/JTUSjIg1_i6t8kCHKm459W1hyyTh89Y.woff2' because it violates the following Content Security Policy directive: \"font-src 'self' data:\".\n"
  },
  {
    "type": "error",
    "message": "Refused to load the font 'https://fonts.gstatic.com/s/montserrat/v26/JTUSjIg1_i6t8kCHKm459W1hyyTh89Y.woff2' because it violates the following Content Security Policy directive: \"font-src 'self' data:\".\n"
  },
  {
    "type": "error",
    "message": "Refused to load the font 'https://fonts.gstatic.com/s/montserrat/v26/JTUSjIg1_i6t8kCHKm459W1hyyTh89Y.woff2' because it violates the following Content Security Policy directive: \"font-src 'self' data:\".\n"
  },
  {
    "type": "error",
    "message": "Refused to load the font 'https://fonts.gstatic.com/s/montserrat/v26/JTUSjIg1_i6t8kCHKm459W1hyyTh89Y.woff2' because it violates the following Content Security Policy directive: \"font-src 'self' data:\".\n"
  }
]
```

## ⚡ Performance Metrics

- **First Contentful Paint:** 88ms
- **DOM Content Loaded:** 0ms
- **Resources Loaded:** 103

## 🐛 Console Errors

- **[error]** X-Frame-Options may only be set via an HTTP header sent along with a document. It may not be set inside <meta>.
- **[error]** Sentry: Failed to initialize Error: Multiple Sentry Session Replay instances are not supported
    at new Replay (http://localhost:8080/node_modules/.vite/deps/@sentry_react.js?v=502a7c65:22538:13)
    at Module.replayIntegration (http://localhost:8080/node_modules/.vite/deps/@sentry_react.js?v=502a7c65:22421:10)
    at initSentry (http://localhost:8080/src/utils/monitoring/sentry.ts:18:24)
    at http://localhost:8080/src/App.tsx:174:9
    at commitHookEffectListMount (http://localhost:8080/node_modules/.vite/deps/chunk-OR6547GA.js?v=2a8798f6:16915:34)
    at commitPassiveMountOnFiber (http://localhost:8080/node_modules/.vite/deps/chunk-OR6547GA.js?v=2a8798f6:18156:19)
    at commitPassiveMountEffects_complete (http://localhost:8080/node_modules/.vite/deps/chunk-OR6547GA.js?v=2a8798f6:18129:17)
    at commitPassiveMountEffects_begin (http://localhost:8080/node_modules/.vite/deps/chunk-OR6547GA.js?v=2a8798f6:18119:15)
    at commitPassiveMountEffects (http://localhost:8080/node_modules/.vite/deps/chunk-OR6547GA.js?v=2a8798f6:18109:11)
    at flushPassiveEffectsImpl (http://localhost:8080/node_modules/.vite/deps/chunk-OR6547GA.js?v=2a8798f6:19490:11)
    at flushPassiveEffects (http://localhost:8080/node_modules/.vite/deps/chunk-OR6547GA.js?v=2a8798f6:19447:22)
    at http://localhost:8080/node_modules/.vite/deps/chunk-OR6547GA.js?v=2a8798f6:19328:17
    at workLoop (http://localhost:8080/node_modules/.vite/deps/chunk-OR6547GA.js?v=2a8798f6:197:42)
    at flushWork (http://localhost:8080/node_modules/.vite/deps/chunk-OR6547GA.js?v=2a8798f6:176:22)
    at MessagePort.performWorkUntilDeadline (http://localhost:8080/node_modules/.vite/deps/chunk-OR6547GA.js?v=2a8798f6:384:29)
- **[error]** Failed to load resource: the server responded with a status of 404 ()
- **[error]** Refused to load the font 'https://fonts.gstatic.com/s/montserrat/v26/JTUSjIg1_i6t8kCHKm459WlhyyTh89Y.woff2' because it violates the following Content Security Policy directive: "font-src 'self' data:".

- **[error]** Refused to load the font 'https://fonts.gstatic.com/s/montserrat/v26/JTUSjIg1_i6t8kCHKm459WRhyyTh89Y.woff2' because it violates the following Content Security Policy directive: "font-src 'self' data:".

- **[error]** Refused to load the font 'https://fonts.gstatic.com/s/montserrat/v26/JTUSjIg1_i6t8kCHKm459W1hyyTh89Y.woff2' because it violates the following Content Security Policy directive: "font-src 'self' data:".

- **[error]** Refused to load the font 'https://fonts.gstatic.com/s/montserrat/v26/JTUSjIg1_i6t8kCHKm459WxhyyTh89Y.woff2' because it violates the following Content Security Policy directive: "font-src 'self' data:".

- **[error]** Refused to load the font 'https://fonts.gstatic.com/s/montserrat/v26/JTUSjIg1_i6t8kCHKm459W1hyyTh89Y.woff2' because it violates the following Content Security Policy directive: "font-src 'self' data:".

- **[error]** Refused to load the font 'https://fonts.gstatic.com/s/montserrat/v26/JTUSjIg1_i6t8kCHKm459W1hyyTh89Y.woff2' because it violates the following Content Security Policy directive: "font-src 'self' data:".

- **[error]** Refused to load the font 'https://fonts.gstatic.com/s/montserrat/v26/JTUSjIg1_i6t8kCHKm459W1hyyTh89Y.woff2' because it violates the following Content Security Policy directive: "font-src 'self' data:".

- **[error]** Refused to load the font 'https://fonts.gstatic.com/s/montserrat/v26/JTUSjIg1_i6t8kCHKm459W1hyyTh89Y.woff2' because it violates the following Content Security Policy directive: "font-src 'self' data:".

- **[error]** X-Frame-Options may only be set via an HTTP header sent along with a document. It may not be set inside <meta>.
- **[error]** Sentry: Failed to initialize Error: Multiple Sentry Session Replay instances are not supported
    at new Replay (http://localhost:8080/node_modules/.vite/deps/@sentry_react.js?v=502a7c65:22538:13)
    at Module.replayIntegration (http://localhost:8080/node_modules/.vite/deps/@sentry_react.js?v=502a7c65:22421:10)
    at initSentry (http://localhost:8080/src/utils/monitoring/sentry.ts:18:24)
    at http://localhost:8080/src/App.tsx:174:9
    at commitHookEffectListMount (http://localhost:8080/node_modules/.vite/deps/chunk-OR6547GA.js?v=2a8798f6:16915:34)
    at commitPassiveMountOnFiber (http://localhost:8080/node_modules/.vite/deps/chunk-OR6547GA.js?v=2a8798f6:18156:19)
    at commitPassiveMountEffects_complete (http://localhost:8080/node_modules/.vite/deps/chunk-OR6547GA.js?v=2a8798f6:18129:17)
    at commitPassiveMountEffects_begin (http://localhost:8080/node_modules/.vite/deps/chunk-OR6547GA.js?v=2a8798f6:18119:15)
    at commitPassiveMountEffects (http://localhost:8080/node_modules/.vite/deps/chunk-OR6547GA.js?v=2a8798f6:18109:11)
    at flushPassiveEffectsImpl (http://localhost:8080/node_modules/.vite/deps/chunk-OR6547GA.js?v=2a8798f6:19490:11)
    at flushPassiveEffects (http://localhost:8080/node_modules/.vite/deps/chunk-OR6547GA.js?v=2a8798f6:19447:22)
    at http://localhost:8080/node_modules/.vite/deps/chunk-OR6547GA.js?v=2a8798f6:19328:17
    at workLoop (http://localhost:8080/node_modules/.vite/deps/chunk-OR6547GA.js?v=2a8798f6:197:42)
    at flushWork (http://localhost:8080/node_modules/.vite/deps/chunk-OR6547GA.js?v=2a8798f6:176:22)
    at MessagePort.performWorkUntilDeadline (http://localhost:8080/node_modules/.vite/deps/chunk-OR6547GA.js?v=2a8798f6:384:29)
- **[error]** Refused to load the font 'https://fonts.gstatic.com/s/montserrat/v26/JTUSjIg1_i6t8kCHKm459WxhyyTh89Y.woff2' because it violates the following Content Security Policy directive: "font-src 'self' data:".

- **[error]** X-Frame-Options may only be set via an HTTP header sent along with a document. It may not be set inside <meta>.
- **[error]** Sentry: Failed to initialize Error: Multiple Sentry Session Replay instances are not supported
    at new Replay (http://localhost:8080/node_modules/.vite/deps/@sentry_react.js?v=502a7c65:22538:13)
    at Module.replayIntegration (http://localhost:8080/node_modules/.vite/deps/@sentry_react.js?v=502a7c65:22421:10)
    at initSentry (http://localhost:8080/src/utils/monitoring/sentry.ts:18:24)
    at http://localhost:8080/src/App.tsx:174:9
    at commitHookEffectListMount (http://localhost:8080/node_modules/.vite/deps/chunk-OR6547GA.js?v=2a8798f6:16915:34)
    at commitPassiveMountOnFiber (http://localhost:8080/node_modules/.vite/deps/chunk-OR6547GA.js?v=2a8798f6:18156:19)
    at commitPassiveMountEffects_complete (http://localhost:8080/node_modules/.vite/deps/chunk-OR6547GA.js?v=2a8798f6:18129:17)
    at commitPassiveMountEffects_begin (http://localhost:8080/node_modules/.vite/deps/chunk-OR6547GA.js?v=2a8798f6:18119:15)
    at commitPassiveMountEffects (http://localhost:8080/node_modules/.vite/deps/chunk-OR6547GA.js?v=2a8798f6:18109:11)
    at flushPassiveEffectsImpl (http://localhost:8080/node_modules/.vite/deps/chunk-OR6547GA.js?v=2a8798f6:19490:11)
    at flushPassiveEffects (http://localhost:8080/node_modules/.vite/deps/chunk-OR6547GA.js?v=2a8798f6:19447:22)
    at http://localhost:8080/node_modules/.vite/deps/chunk-OR6547GA.js?v=2a8798f6:19328:17
    at workLoop (http://localhost:8080/node_modules/.vite/deps/chunk-OR6547GA.js?v=2a8798f6:197:42)
    at flushWork (http://localhost:8080/node_modules/.vite/deps/chunk-OR6547GA.js?v=2a8798f6:176:22)
    at MessagePort.performWorkUntilDeadline (http://localhost:8080/node_modules/.vite/deps/chunk-OR6547GA.js?v=2a8798f6:384:29)
- **[error]** Refused to load the font 'https://fonts.gstatic.com/s/montserrat/v26/JTUSjIg1_i6t8kCHKm459WxhyyTh89Y.woff2' because it violates the following Content Security Policy directive: "font-src 'self' data:".

- **[error]** X-Frame-Options may only be set via an HTTP header sent along with a document. It may not be set inside <meta>.
- **[error]** Sentry: Failed to initialize Error: Multiple Sentry Session Replay instances are not supported
    at new Replay (http://localhost:8080/node_modules/.vite/deps/@sentry_react.js?v=502a7c65:22538:13)
    at Module.replayIntegration (http://localhost:8080/node_modules/.vite/deps/@sentry_react.js?v=502a7c65:22421:10)
    at initSentry (http://localhost:8080/src/utils/monitoring/sentry.ts:18:24)
    at http://localhost:8080/src/App.tsx:174:9
    at commitHookEffectListMount (http://localhost:8080/node_modules/.vite/deps/chunk-OR6547GA.js?v=2a8798f6:16915:34)
    at commitPassiveMountOnFiber (http://localhost:8080/node_modules/.vite/deps/chunk-OR6547GA.js?v=2a8798f6:18156:19)
    at commitPassiveMountEffects_complete (http://localhost:8080/node_modules/.vite/deps/chunk-OR6547GA.js?v=2a8798f6:18129:17)
    at commitPassiveMountEffects_begin (http://localhost:8080/node_modules/.vite/deps/chunk-OR6547GA.js?v=2a8798f6:18119:15)
    at commitPassiveMountEffects (http://localhost:8080/node_modules/.vite/deps/chunk-OR6547GA.js?v=2a8798f6:18109:11)
    at flushPassiveEffectsImpl (http://localhost:8080/node_modules/.vite/deps/chunk-OR6547GA.js?v=2a8798f6:19490:11)
    at flushPassiveEffects (http://localhost:8080/node_modules/.vite/deps/chunk-OR6547GA.js?v=2a8798f6:19447:22)
    at http://localhost:8080/node_modules/.vite/deps/chunk-OR6547GA.js?v=2a8798f6:19328:17
    at workLoop (http://localhost:8080/node_modules/.vite/deps/chunk-OR6547GA.js?v=2a8798f6:197:42)
    at flushWork (http://localhost:8080/node_modules/.vite/deps/chunk-OR6547GA.js?v=2a8798f6:176:22)
    at MessagePort.performWorkUntilDeadline (http://localhost:8080/node_modules/.vite/deps/chunk-OR6547GA.js?v=2a8798f6:384:29)
- **[error]** Refused to load the font 'https://fonts.gstatic.com/s/montserrat/v26/JTUSjIg1_i6t8kCHKm459WxhyyTh89Y.woff2' because it violates the following Content Security Policy directive: "font-src 'self' data:".

- **[error]** Refused to load the font 'https://fonts.gstatic.com/s/montserrat/v26/JTUSjIg1_i6t8kCHKm459WlhyyTh89Y.woff2' because it violates the following Content Security Policy directive: "font-src 'self' data:".

- **[error]** Refused to load the font 'https://fonts.gstatic.com/s/montserrat/v26/JTUSjIg1_i6t8kCHKm459WRhyyTh89Y.woff2' because it violates the following Content Security Policy directive: "font-src 'self' data:".

- **[error]** Refused to load the font 'https://fonts.gstatic.com/s/montserrat/v26/JTUSjIg1_i6t8kCHKm459W1hyyTh89Y.woff2' because it violates the following Content Security Policy directive: "font-src 'self' data:".

- **[error]** Refused to load the font 'https://fonts.gstatic.com/s/montserrat/v26/JTUSjIg1_i6t8kCHKm459WxhyyTh89Y.woff2' because it violates the following Content Security Policy directive: "font-src 'self' data:".

- **[error]** Refused to load the font 'https://fonts.gstatic.com/s/montserrat/v26/JTUSjIg1_i6t8kCHKm459W1hyyTh89Y.woff2' because it violates the following Content Security Policy directive: "font-src 'self' data:".

- **[error]** Refused to load the font 'https://fonts.gstatic.com/s/montserrat/v26/JTUSjIg1_i6t8kCHKm459W1hyyTh89Y.woff2' because it violates the following Content Security Policy directive: "font-src 'self' data:".

- **[error]** Refused to load the font 'https://fonts.gstatic.com/s/montserrat/v26/JTUSjIg1_i6t8kCHKm459W1hyyTh89Y.woff2' because it violates the following Content Security Policy directive: "font-src 'self' data:".

- **[error]** Refused to load the font 'https://fonts.gstatic.com/s/montserrat/v26/JTUSjIg1_i6t8kCHKm459W1hyyTh89Y.woff2' because it violates the following Content Security Policy directive: "font-src 'self' data:".

- **[error]** X-Frame-Options may only be set via an HTTP header sent along with a document. It may not be set inside <meta>.
- **[error]** Sentry: Failed to initialize Error: Multiple Sentry Session Replay instances are not supported
    at new Replay (http://localhost:8080/node_modules/.vite/deps/@sentry_react.js?v=502a7c65:22538:13)
    at Module.replayIntegration (http://localhost:8080/node_modules/.vite/deps/@sentry_react.js?v=502a7c65:22421:10)
    at initSentry (http://localhost:8080/src/utils/monitoring/sentry.ts:18:24)
    at http://localhost:8080/src/App.tsx:174:9
    at commitHookEffectListMount (http://localhost:8080/node_modules/.vite/deps/chunk-OR6547GA.js?v=2a8798f6:16915:34)
    at commitPassiveMountOnFiber (http://localhost:8080/node_modules/.vite/deps/chunk-OR6547GA.js?v=2a8798f6:18156:19)
    at commitPassiveMountEffects_complete (http://localhost:8080/node_modules/.vite/deps/chunk-OR6547GA.js?v=2a8798f6:18129:17)
    at commitPassiveMountEffects_begin (http://localhost:8080/node_modules/.vite/deps/chunk-OR6547GA.js?v=2a8798f6:18119:15)
    at commitPassiveMountEffects (http://localhost:8080/node_modules/.vite/deps/chunk-OR6547GA.js?v=2a8798f6:18109:11)
    at flushPassiveEffectsImpl (http://localhost:8080/node_modules/.vite/deps/chunk-OR6547GA.js?v=2a8798f6:19490:11)
    at flushPassiveEffects (http://localhost:8080/node_modules/.vite/deps/chunk-OR6547GA.js?v=2a8798f6:19447:22)
    at http://localhost:8080/node_modules/.vite/deps/chunk-OR6547GA.js?v=2a8798f6:19328:17
    at workLoop (http://localhost:8080/node_modules/.vite/deps/chunk-OR6547GA.js?v=2a8798f6:197:42)
    at flushWork (http://localhost:8080/node_modules/.vite/deps/chunk-OR6547GA.js?v=2a8798f6:176:22)
    at MessagePort.performWorkUntilDeadline (http://localhost:8080/node_modules/.vite/deps/chunk-OR6547GA.js?v=2a8798f6:384:29)
- **[error]** Refused to load the font 'https://fonts.gstatic.com/s/montserrat/v26/JTUSjIg1_i6t8kCHKm459WxhyyTh89Y.woff2' because it violates the following Content Security Policy directive: "font-src 'self' data:".

- **[error]** Refused to load the font 'https://fonts.gstatic.com/s/montserrat/v26/JTUSjIg1_i6t8kCHKm459WlhyyTh89Y.woff2' because it violates the following Content Security Policy directive: "font-src 'self' data:".

- **[error]** Refused to load the font 'https://fonts.gstatic.com/s/montserrat/v26/JTUSjIg1_i6t8kCHKm459WRhyyTh89Y.woff2' because it violates the following Content Security Policy directive: "font-src 'self' data:".

- **[error]** Refused to load the font 'https://fonts.gstatic.com/s/montserrat/v26/JTUSjIg1_i6t8kCHKm459W1hyyTh89Y.woff2' because it violates the following Content Security Policy directive: "font-src 'self' data:".

- **[error]** Refused to load the font 'https://fonts.gstatic.com/s/montserrat/v26/JTUSjIg1_i6t8kCHKm459WxhyyTh89Y.woff2' because it violates the following Content Security Policy directive: "font-src 'self' data:".

- **[error]** Refused to load the font 'https://fonts.gstatic.com/s/montserrat/v26/JTUSjIg1_i6t8kCHKm459W1hyyTh89Y.woff2' because it violates the following Content Security Policy directive: "font-src 'self' data:".

- **[error]** Refused to load the font 'https://fonts.gstatic.com/s/montserrat/v26/JTUSjIg1_i6t8kCHKm459W1hyyTh89Y.woff2' because it violates the following Content Security Policy directive: "font-src 'self' data:".

- **[error]** Refused to load the font 'https://fonts.gstatic.com/s/montserrat/v26/JTUSjIg1_i6t8kCHKm459W1hyyTh89Y.woff2' because it violates the following Content Security Policy directive: "font-src 'self' data:".

- **[error]** Refused to load the font 'https://fonts.gstatic.com/s/montserrat/v26/JTUSjIg1_i6t8kCHKm459W1hyyTh89Y.woff2' because it violates the following Content Security Policy directive: "font-src 'self' data:".

- **[error]** X-Frame-Options may only be set via an HTTP header sent along with a document. It may not be set inside <meta>.
- **[error]** Sentry: Failed to initialize Error: Multiple Sentry Session Replay instances are not supported
    at new Replay (http://localhost:8080/node_modules/.vite/deps/@sentry_react.js?v=502a7c65:22538:13)
    at Module.replayIntegration (http://localhost:8080/node_modules/.vite/deps/@sentry_react.js?v=502a7c65:22421:10)
    at initSentry (http://localhost:8080/src/utils/monitoring/sentry.ts:18:24)
    at http://localhost:8080/src/App.tsx:174:9
    at commitHookEffectListMount (http://localhost:8080/node_modules/.vite/deps/chunk-OR6547GA.js?v=2a8798f6:16915:34)
    at commitPassiveMountOnFiber (http://localhost:8080/node_modules/.vite/deps/chunk-OR6547GA.js?v=2a8798f6:18156:19)
    at commitPassiveMountEffects_complete (http://localhost:8080/node_modules/.vite/deps/chunk-OR6547GA.js?v=2a8798f6:18129:17)
    at commitPassiveMountEffects_begin (http://localhost:8080/node_modules/.vite/deps/chunk-OR6547GA.js?v=2a8798f6:18119:15)
    at commitPassiveMountEffects (http://localhost:8080/node_modules/.vite/deps/chunk-OR6547GA.js?v=2a8798f6:18109:11)
    at flushPassiveEffectsImpl (http://localhost:8080/node_modules/.vite/deps/chunk-OR6547GA.js?v=2a8798f6:19490:11)
    at flushPassiveEffects (http://localhost:8080/node_modules/.vite/deps/chunk-OR6547GA.js?v=2a8798f6:19447:22)
    at http://localhost:8080/node_modules/.vite/deps/chunk-OR6547GA.js?v=2a8798f6:19328:17
    at workLoop (http://localhost:8080/node_modules/.vite/deps/chunk-OR6547GA.js?v=2a8798f6:197:42)
    at flushWork (http://localhost:8080/node_modules/.vite/deps/chunk-OR6547GA.js?v=2a8798f6:176:22)
    at MessagePort.performWorkUntilDeadline (http://localhost:8080/node_modules/.vite/deps/chunk-OR6547GA.js?v=2a8798f6:384:29)
- **[error]** Refused to load the font 'https://fonts.gstatic.com/s/montserrat/v26/JTUSjIg1_i6t8kCHKm459WxhyyTh89Y.woff2' because it violates the following Content Security Policy directive: "font-src 'self' data:".

- **[error]** Refused to load the font 'https://fonts.gstatic.com/s/montserrat/v26/JTUSjIg1_i6t8kCHKm459WlhyyTh89Y.woff2' because it violates the following Content Security Policy directive: "font-src 'self' data:".

- **[error]** Refused to load the font 'https://fonts.gstatic.com/s/montserrat/v26/JTUSjIg1_i6t8kCHKm459WRhyyTh89Y.woff2' because it violates the following Content Security Policy directive: "font-src 'self' data:".

- **[error]** Refused to load the font 'https://fonts.gstatic.com/s/montserrat/v26/JTUSjIg1_i6t8kCHKm459W1hyyTh89Y.woff2' because it violates the following Content Security Policy directive: "font-src 'self' data:".

- **[error]** Refused to load the font 'https://fonts.gstatic.com/s/montserrat/v26/JTUSjIg1_i6t8kCHKm459WxhyyTh89Y.woff2' because it violates the following Content Security Policy directive: "font-src 'self' data:".

- **[error]** Refused to load the font 'https://fonts.gstatic.com/s/montserrat/v26/JTUSjIg1_i6t8kCHKm459W1hyyTh89Y.woff2' because it violates the following Content Security Policy directive: "font-src 'self' data:".

- **[error]** Refused to load the font 'https://fonts.gstatic.com/s/montserrat/v26/JTUSjIg1_i6t8kCHKm459W1hyyTh89Y.woff2' because it violates the following Content Security Policy directive: "font-src 'self' data:".

- **[error]** Refused to load the font 'https://fonts.gstatic.com/s/montserrat/v26/JTUSjIg1_i6t8kCHKm459W1hyyTh89Y.woff2' because it violates the following Content Security Policy directive: "font-src 'self' data:".

- **[error]** Refused to load the font 'https://fonts.gstatic.com/s/montserrat/v26/JTUSjIg1_i6t8kCHKm459W1hyyTh89Y.woff2' because it violates the following Content Security Policy directive: "font-src 'self' data:".

- **[error]** X-Frame-Options may only be set via an HTTP header sent along with a document. It may not be set inside <meta>.
- **[error]** Sentry: Failed to initialize Error: Multiple Sentry Session Replay instances are not supported
    at new Replay (http://localhost:8080/node_modules/.vite/deps/@sentry_react.js?v=502a7c65:22538:13)
    at Module.replayIntegration (http://localhost:8080/node_modules/.vite/deps/@sentry_react.js?v=502a7c65:22421:10)
    at initSentry (http://localhost:8080/src/utils/monitoring/sentry.ts:18:24)
    at http://localhost:8080/src/App.tsx:174:9
    at commitHookEffectListMount (http://localhost:8080/node_modules/.vite/deps/chunk-OR6547GA.js?v=2a8798f6:16915:34)
    at commitPassiveMountOnFiber (http://localhost:8080/node_modules/.vite/deps/chunk-OR6547GA.js?v=2a8798f6:18156:19)
    at commitPassiveMountEffects_complete (http://localhost:8080/node_modules/.vite/deps/chunk-OR6547GA.js?v=2a8798f6:18129:17)
    at commitPassiveMountEffects_begin (http://localhost:8080/node_modules/.vite/deps/chunk-OR6547GA.js?v=2a8798f6:18119:15)
    at commitPassiveMountEffects (http://localhost:8080/node_modules/.vite/deps/chunk-OR6547GA.js?v=2a8798f6:18109:11)
    at flushPassiveEffectsImpl (http://localhost:8080/node_modules/.vite/deps/chunk-OR6547GA.js?v=2a8798f6:19490:11)
    at flushPassiveEffects (http://localhost:8080/node_modules/.vite/deps/chunk-OR6547GA.js?v=2a8798f6:19447:22)
    at http://localhost:8080/node_modules/.vite/deps/chunk-OR6547GA.js?v=2a8798f6:19328:17
    at workLoop (http://localhost:8080/node_modules/.vite/deps/chunk-OR6547GA.js?v=2a8798f6:197:42)
    at flushWork (http://localhost:8080/node_modules/.vite/deps/chunk-OR6547GA.js?v=2a8798f6:176:22)
    at MessagePort.performWorkUntilDeadline (http://localhost:8080/node_modules/.vite/deps/chunk-OR6547GA.js?v=2a8798f6:384:29)
- **[error]** Refused to load the font 'https://fonts.gstatic.com/s/montserrat/v26/JTUSjIg1_i6t8kCHKm459WxhyyTh89Y.woff2' because it violates the following Content Security Policy directive: "font-src 'self' data:".

- **[error]** Refused to load the font 'https://fonts.gstatic.com/s/montserrat/v26/JTUSjIg1_i6t8kCHKm459WlhyyTh89Y.woff2' because it violates the following Content Security Policy directive: "font-src 'self' data:".

- **[error]** Refused to load the font 'https://fonts.gstatic.com/s/montserrat/v26/JTUSjIg1_i6t8kCHKm459WRhyyTh89Y.woff2' because it violates the following Content Security Policy directive: "font-src 'self' data:".

- **[error]** Refused to load the font 'https://fonts.gstatic.com/s/montserrat/v26/JTUSjIg1_i6t8kCHKm459W1hyyTh89Y.woff2' because it violates the following Content Security Policy directive: "font-src 'self' data:".

- **[error]** Refused to load the font 'https://fonts.gstatic.com/s/montserrat/v26/JTUSjIg1_i6t8kCHKm459WxhyyTh89Y.woff2' because it violates the following Content Security Policy directive: "font-src 'self' data:".

- **[error]** Refused to load the font 'https://fonts.gstatic.com/s/montserrat/v26/JTUSjIg1_i6t8kCHKm459W1hyyTh89Y.woff2' because it violates the following Content Security Policy directive: "font-src 'self' data:".

- **[error]** Refused to load the font 'https://fonts.gstatic.com/s/montserrat/v26/JTUSjIg1_i6t8kCHKm459W1hyyTh89Y.woff2' because it violates the following Content Security Policy directive: "font-src 'self' data:".

- **[error]** Refused to load the font 'https://fonts.gstatic.com/s/montserrat/v26/JTUSjIg1_i6t8kCHKm459W1hyyTh89Y.woff2' because it violates the following Content Security Policy directive: "font-src 'self' data:".

- **[error]** Refused to load the font 'https://fonts.gstatic.com/s/montserrat/v26/JTUSjIg1_i6t8kCHKm459W1hyyTh89Y.woff2' because it violates the following Content Security Policy directive: "font-src 'self' data:".

- **[error]** X-Frame-Options may only be set via an HTTP header sent along with a document. It may not be set inside <meta>.
- **[error]** Sentry: Failed to initialize Error: Multiple Sentry Session Replay instances are not supported
    at new Replay (http://localhost:8080/node_modules/.vite/deps/@sentry_react.js?v=502a7c65:22538:13)
    at Module.replayIntegration (http://localhost:8080/node_modules/.vite/deps/@sentry_react.js?v=502a7c65:22421:10)
    at initSentry (http://localhost:8080/src/utils/monitoring/sentry.ts:18:24)
    at http://localhost:8080/src/App.tsx:174:9
    at commitHookEffectListMount (http://localhost:8080/node_modules/.vite/deps/chunk-OR6547GA.js?v=2a8798f6:16915:34)
    at commitPassiveMountOnFiber (http://localhost:8080/node_modules/.vite/deps/chunk-OR6547GA.js?v=2a8798f6:18156:19)
    at commitPassiveMountEffects_complete (http://localhost:8080/node_modules/.vite/deps/chunk-OR6547GA.js?v=2a8798f6:18129:17)
    at commitPassiveMountEffects_begin (http://localhost:8080/node_modules/.vite/deps/chunk-OR6547GA.js?v=2a8798f6:18119:15)
    at commitPassiveMountEffects (http://localhost:8080/node_modules/.vite/deps/chunk-OR6547GA.js?v=2a8798f6:18109:11)
    at flushPassiveEffectsImpl (http://localhost:8080/node_modules/.vite/deps/chunk-OR6547GA.js?v=2a8798f6:19490:11)
    at flushPassiveEffects (http://localhost:8080/node_modules/.vite/deps/chunk-OR6547GA.js?v=2a8798f6:19447:22)
    at http://localhost:8080/node_modules/.vite/deps/chunk-OR6547GA.js?v=2a8798f6:19328:17
    at workLoop (http://localhost:8080/node_modules/.vite/deps/chunk-OR6547GA.js?v=2a8798f6:197:42)
    at flushWork (http://localhost:8080/node_modules/.vite/deps/chunk-OR6547GA.js?v=2a8798f6:176:22)
    at MessagePort.performWorkUntilDeadline (http://localhost:8080/node_modules/.vite/deps/chunk-OR6547GA.js?v=2a8798f6:384:29)
- **[error]** Refused to load the font 'https://fonts.gstatic.com/s/montserrat/v26/JTUSjIg1_i6t8kCHKm459WxhyyTh89Y.woff2' because it violates the following Content Security Policy directive: "font-src 'self' data:".

- **[error]** Refused to load the font 'https://fonts.gstatic.com/s/montserrat/v26/JTUSjIg1_i6t8kCHKm459WlhyyTh89Y.woff2' because it violates the following Content Security Policy directive: "font-src 'self' data:".

- **[error]** Refused to load the font 'https://fonts.gstatic.com/s/montserrat/v26/JTUSjIg1_i6t8kCHKm459WRhyyTh89Y.woff2' because it violates the following Content Security Policy directive: "font-src 'self' data:".

- **[error]** Refused to load the font 'https://fonts.gstatic.com/s/montserrat/v26/JTUSjIg1_i6t8kCHKm459W1hyyTh89Y.woff2' because it violates the following Content Security Policy directive: "font-src 'self' data:".

- **[error]** Refused to load the font 'https://fonts.gstatic.com/s/montserrat/v26/JTUSjIg1_i6t8kCHKm459WxhyyTh89Y.woff2' because it violates the following Content Security Policy directive: "font-src 'self' data:".

- **[error]** Refused to load the font 'https://fonts.gstatic.com/s/montserrat/v26/JTUSjIg1_i6t8kCHKm459W1hyyTh89Y.woff2' because it violates the following Content Security Policy directive: "font-src 'self' data:".

- **[error]** Refused to load the font 'https://fonts.gstatic.com/s/montserrat/v26/JTUSjIg1_i6t8kCHKm459W1hyyTh89Y.woff2' because it violates the following Content Security Policy directive: "font-src 'self' data:".

- **[error]** Refused to load the font 'https://fonts.gstatic.com/s/montserrat/v26/JTUSjIg1_i6t8kCHKm459W1hyyTh89Y.woff2' because it violates the following Content Security Policy directive: "font-src 'self' data:".

- **[error]** Refused to load the font 'https://fonts.gstatic.com/s/montserrat/v26/JTUSjIg1_i6t8kCHKm459W1hyyTh89Y.woff2' because it violates the following Content Security Policy directive: "font-src 'self' data:".

- **[error]** X-Frame-Options may only be set via an HTTP header sent along with a document. It may not be set inside <meta>.
- **[error]** Sentry: Failed to initialize Error: Multiple Sentry Session Replay instances are not supported
    at new Replay (http://localhost:8080/node_modules/.vite/deps/@sentry_react.js?v=502a7c65:22538:13)
    at Module.replayIntegration (http://localhost:8080/node_modules/.vite/deps/@sentry_react.js?v=502a7c65:22421:10)
    at initSentry (http://localhost:8080/src/utils/monitoring/sentry.ts:18:24)
    at http://localhost:8080/src/App.tsx:174:9
    at commitHookEffectListMount (http://localhost:8080/node_modules/.vite/deps/chunk-OR6547GA.js?v=2a8798f6:16915:34)
    at commitPassiveMountOnFiber (http://localhost:8080/node_modules/.vite/deps/chunk-OR6547GA.js?v=2a8798f6:18156:19)
    at commitPassiveMountEffects_complete (http://localhost:8080/node_modules/.vite/deps/chunk-OR6547GA.js?v=2a8798f6:18129:17)
    at commitPassiveMountEffects_begin (http://localhost:8080/node_modules/.vite/deps/chunk-OR6547GA.js?v=2a8798f6:18119:15)
    at commitPassiveMountEffects (http://localhost:8080/node_modules/.vite/deps/chunk-OR6547GA.js?v=2a8798f6:18109:11)
    at flushPassiveEffectsImpl (http://localhost:8080/node_modules/.vite/deps/chunk-OR6547GA.js?v=2a8798f6:19490:11)
    at flushPassiveEffects (http://localhost:8080/node_modules/.vite/deps/chunk-OR6547GA.js?v=2a8798f6:19447:22)
    at http://localhost:8080/node_modules/.vite/deps/chunk-OR6547GA.js?v=2a8798f6:19328:17
    at workLoop (http://localhost:8080/node_modules/.vite/deps/chunk-OR6547GA.js?v=2a8798f6:197:42)
    at flushWork (http://localhost:8080/node_modules/.vite/deps/chunk-OR6547GA.js?v=2a8798f6:176:22)
    at MessagePort.performWorkUntilDeadline (http://localhost:8080/node_modules/.vite/deps/chunk-OR6547GA.js?v=2a8798f6:384:29)
- **[error]** Refused to load the font 'https://fonts.gstatic.com/s/montserrat/v26/JTUSjIg1_i6t8kCHKm459WxhyyTh89Y.woff2' because it violates the following Content Security Policy directive: "font-src 'self' data:".

- **[error]** Refused to load the font 'https://fonts.gstatic.com/s/montserrat/v26/JTUSjIg1_i6t8kCHKm459WlhyyTh89Y.woff2' because it violates the following Content Security Policy directive: "font-src 'self' data:".

- **[error]** Refused to load the font 'https://fonts.gstatic.com/s/montserrat/v26/JTUSjIg1_i6t8kCHKm459WRhyyTh89Y.woff2' because it violates the following Content Security Policy directive: "font-src 'self' data:".

- **[error]** Refused to load the font 'https://fonts.gstatic.com/s/montserrat/v26/JTUSjIg1_i6t8kCHKm459W1hyyTh89Y.woff2' because it violates the following Content Security Policy directive: "font-src 'self' data:".

- **[error]** Refused to load the font 'https://fonts.gstatic.com/s/montserrat/v26/JTUSjIg1_i6t8kCHKm459WxhyyTh89Y.woff2' because it violates the following Content Security Policy directive: "font-src 'self' data:".

- **[error]** Refused to load the font 'https://fonts.gstatic.com/s/montserrat/v26/JTUSjIg1_i6t8kCHKm459W1hyyTh89Y.woff2' because it violates the following Content Security Policy directive: "font-src 'self' data:".

- **[error]** Refused to load the font 'https://fonts.gstatic.com/s/montserrat/v26/JTUSjIg1_i6t8kCHKm459W1hyyTh89Y.woff2' because it violates the following Content Security Policy directive: "font-src 'self' data:".

- **[error]** Refused to load the font 'https://fonts.gstatic.com/s/montserrat/v26/JTUSjIg1_i6t8kCHKm459W1hyyTh89Y.woff2' because it violates the following Content Security Policy directive: "font-src 'self' data:".

- **[error]** Refused to load the font 'https://fonts.gstatic.com/s/montserrat/v26/JTUSjIg1_i6t8kCHKm459W1hyyTh89Y.woff2' because it violates the following Content Security Policy directive: "font-src 'self' data:".


