# Montserrat Font Migration Plan

## Executive Summary
Migrate from Space Grotesk (web) and SF Pro (iOS) to Montserrat across all platforms to achieve brand consistency.

## Status: APPROVED ✅
**Decision Date:** January 9, 2025  
**Stakeholder:** Design Audit Team  
**Target Completion:** 1 week

## Migration Steps Completed ✅

### Web Platform - COMPLETED
1. ✅ **Font Loading** (index.html)
   - Replaced Space Grotesk with Montserrat in Google Fonts link
   - Added all required weights: 300, 400, 500, 600, 700, 800, 900
   - Using `display=swap` for optimal loading

2. ✅ **Tailwind Configuration** (tailwind.config.ts)
   - Updated `fontFamily.sans` from Space Grotesk to Montserrat
   - All components using `font-sans` class now use Montserrat

### iOS Platform - PENDING
1. **Download Font Files**
   ```bash
   # Download Montserrat font files
   mkdir -p ios/IndigoInvestor/Resources/Fonts
   # Download from: https://fonts.google.com/specimen/Montserrat
   # Required files:
   - Montserrat-Light.ttf (300)
   - Montserrat-Regular.ttf (400)
   - Montserrat-Medium.ttf (500)
   - Montserrat-SemiBold.ttf (600)
   - Montserrat-Bold.ttf (700)
   - Montserrat-ExtraBold.ttf (800)
   - Montserrat-Black.ttf (900)
   ```

2. **Register Fonts in Info.plist**
   ```xml
   <key>UIAppFonts</key>
   <array>
       <string>Montserrat-Light.ttf</string>
       <string>Montserrat-Regular.ttf</string>
       <string>Montserrat-Medium.ttf</string>
       <string>Montserrat-SemiBold.ttf</string>
       <string>Montserrat-Bold.ttf</string>
       <string>Montserrat-ExtraBold.ttf</string>
       <string>Montserrat-Black.ttf</string>
   </array>
   ```

3. **Create Typography System**
   ```swift
   // ios/IndigoInvestor/Core/Theme/Typography.swift
   import SwiftUI

   enum Typography {
       static let largeTitle = Font.custom("Montserrat-Bold", size: 34)
       static let title1 = Font.custom("Montserrat-SemiBold", size: 28)
       static let title2 = Font.custom("Montserrat-SemiBold", size: 22)
       static let title3 = Font.custom("Montserrat-SemiBold", size: 20)
       static let headline = Font.custom("Montserrat-Medium", size: 17)
       static let body = Font.custom("Montserrat-Regular", size: 17)
       static let callout = Font.custom("Montserrat-Regular", size: 16)
       static let subheadline = Font.custom("Montserrat-Regular", size: 15)
       static let footnote = Font.custom("Montserrat-Regular", size: 13)
       static let caption1 = Font.custom("Montserrat-Regular", size: 12)
       static let caption2 = Font.custom("Montserrat-Regular", size: 11)
   }
   ```

4. **Update All Text Views**
   - Replace `.font(.system(size: X))` with appropriate Typography enum
   - Estimated 65 locations to update

## Rollback Strategy

### Web Rollback (< 5 minutes)
```typescript
// tailwind.config.ts - revert this line
fontFamily: {
  sans: ['Space Grotesk', 'sans-serif'], // rollback to this
}
```
```html
<!-- index.html - revert this line -->
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&display=swap" rel="stylesheet">
```

### iOS Rollback (< 10 minutes)
- Remove font files from Resources/Fonts
- Remove UIAppFonts entries from Info.plist
- Revert Typography.swift changes
- Text views will automatically fall back to system font

## Testing Checklist

### Web Testing
- [ ] Font loads correctly on all browsers (Chrome, Safari, Firefox, Edge)
- [ ] No FOUT (Flash of Unstyled Text) or layout shift
- [ ] All text weights render correctly
- [ ] Dark mode maintains readability
- [ ] Mobile responsive text scaling works

### iOS Testing
- [ ] Fonts embed correctly in app bundle
- [ ] Dynamic Type scaling works
- [ ] All weights render correctly
- [ ] No performance degradation
- [ ] Memory usage acceptable

## Performance Metrics

### Web Impact
- **Before:** Space Grotesk ~45KB (5 weights)
- **After:** Montserrat ~60KB (7 weights)
- **Delta:** +15KB (acceptable)

### iOS Impact
- **Before:** 0KB (system font)
- **After:** ~280KB (7 font files)
- **Delta:** +280KB (acceptable for app bundle)

## Verification Steps

1. **Visual QA**
   - Compare screenshots before/after migration
   - Check all breakpoints and screen sizes
   - Verify dark mode appearance

2. **Automated Testing**
   - Run Lighthouse (maintain >90 performance score)
   - Run axe-core (no new accessibility issues)
   - Visual regression tests if available

3. **User Testing**
   - Deploy to staging for stakeholder review
   - Gather feedback from design team
   - A/B test if needed for user preference

## Sign-off

- [x] **Design Team:** Approved - Montserrat aligns with brand guidelines
- [x] **Engineering:** Approved - Implementation feasible within timeline
- [ ] **Product:** Pending - Awaiting staging review
- [ ] **QA:** Pending - Testing after implementation

## Timeline

| Date | Milestone | Status |
|------|-----------|--------|
| Jan 9, 2025 | Web migration | ✅ COMPLETE |
| Jan 10-11, 2025 | iOS migration | 🔄 IN PROGRESS |
| Jan 12, 2025 | Testing & QA | ⏳ PENDING |
| Jan 13, 2025 | Production deployment | ⏳ PENDING |

## Notes

- Montserrat chosen for professional appearance and excellent readability
- Variable font considered but not implemented due to iOS limitations
- Subset fonts for Latin characters only to reduce size
- Consider CDN hosting for web fonts in production
