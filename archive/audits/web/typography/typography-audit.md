# Typography Audit Report

## Executive Summary

**Critical Finding**: The design baseline specifies **Montserrat** as the primary font, but the current implementation uses **Space Grotesk** across the web platform.

## Current State

### Web Platform
- **Configured Font**: Space Grotesk (in tailwind.config.ts)
- **Font Loading**: Likely via Google Fonts or local assets
- **Usage**: Applied globally via `font-sans` utility class

### iOS Platform  
- **System Font**: SF Pro (Apple's system font)
- **Custom Fonts**: None detected in initial scan
- **Dynamic Type**: Partial support detected

## Baseline Requirements vs Reality

| Aspect | Baseline Requirement | Current Web | Current iOS | Severity |
|--------|---------------------|-------------|-------------|----------|
| Primary Font | Montserrat | Space Grotesk | SF Pro | **HIGH** |
| Font Weights | 300, 400, 500, 600, 700 | Unknown | System defaults | MEDIUM |
| Line Heights | Design scale | Tailwind defaults | System defaults | MEDIUM |
| Size Scale | Design tokens | Tailwind scale | System scale | LOW |

## Impact Assessment

### Brand Consistency
- **Issue**: Different fonts create inconsistent brand experience
- **Impact**: Users experience different typography across platforms
- **Severity**: HIGH - Core brand element misaligned

### Technical Debt
- **Web**: Requires updating Tailwind config, font loading, and potential CSS adjustments
- **iOS**: Requires embedding Montserrat font files and updating all text styles

## Recommended Actions

### Immediate (Week 1)
1. **Decision Point**: Confirm Montserrat as the baseline or accept Space Grotesk
2. **Audit**: Complete inventory of all text styles across both platforms
3. **Documentation**: Create typography token matrix

### Short-term (Week 2-3)
1. **Web Migration**:
   ```typescript
   // tailwind.config.ts
   fontFamily: {
     sans: ['Montserrat', 'sans-serif'],
   }
   ```
   - Add Montserrat to font loading strategy
   - Implement font-display: swap for performance
   - Test all components for layout shifts

2. **iOS Migration**:
   - Add Montserrat .ttf/.otf files to iOS bundle
   - Create Typography enum with Montserrat weights
   - Update all Text views to use custom font modifier

### Long-term (Month 2)
1. Create shared design token system
2. Implement typography scale testing in CI/CD
3. Add visual regression tests for typography

## Files Requiring Updates

### Web
- `/tailwind.config.ts` - Update fontFamily
- `/src/index.css` - Add @font-face or import
- `/index.html` - Add font preload tags
- All component files using custom font classes

### iOS  
- `/ios/IndigoInvestor/Resources/Fonts/` - Add font files
- `/ios/IndigoInvestor/Info.plist` - Register fonts
- `/ios/IndigoInvestor/Core/Theme/Typography.swift` - Create typography system
- All SwiftUI views with Text components

## Performance Considerations

### Web
- Montserrat adds ~40-60KB per weight (estimate)
- Consider variable fonts to reduce payload
- Implement subsetting for Latin characters only

### iOS
- Montserrat adds ~200-300KB to app bundle
- No runtime download needed (embedded)
- Consider using system font for non-critical text

## Accessibility Impact
- Montserrat has good readability at small sizes
- Ensure minimum font sizes: 14px web, 11pt iOS
- Test with Dynamic Type on iOS
- Verify contrast ratios remain WCAG AA compliant

## Next Steps
1. Get stakeholder approval for font standardization
2. Create migration plan with rollback strategy
3. Set up A/B testing to measure user impact
4. Document final typography scale in design system
