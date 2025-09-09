# Cross-Platform Design Token Matrix

## Color Tokens Mapping

### Primary Palette

| Token Purpose | Web (HSL) | iOS Current | iOS Target | Notes |
|---------------|-----------|-------------|------------|-------|
| **Primary** | `222.2 47.4% 11.2%` | `IndigoBrand` | Match HSL | Brand indigo |
| **Primary Foreground** | `210 40% 98%` | White | Match HSL | Text on primary |
| **Background** | `0 0% 100%` / `222.2 84% 4.9%` | `systemBackground` | Match HSL | Light/Dark adaptive |
| **Foreground** | `222.2 84% 4.9%` / `210 40% 98%` | `label` | Match HSL | Primary text |
| **Card** | `0 0% 100%` / `222.2 84% 4.9%` | Custom | Match HSL | Card backgrounds |
| **Muted** | `210 40% 96.1%` / `217.2 32.6% 17.5%` | `secondarySystemBackground` | Match HSL | Subtle backgrounds |
| **Accent** | `210 40% 96.1%` / `217.2 32.6% 17.5%` | `appAccent` | Match HSL | Interactive accents |
| **Destructive** | `0 84.2% 60.2%` / `0 62.8% 30.6%` | `.red` | Match HSL | Error/danger states |
| **Border** | `214.3 31.8% 91.4%` / `217.2 32.6% 17.5%` | `.gray.opacity(0.2)` | Match HSL | Borders/dividers |

### Semantic Colors

| Purpose | Web Token | iOS Current | Alignment Needed |
|---------|-----------|-------------|------------------|
| Success | `.green` (hardcoded) | `.green` | Create token |
| Warning | `.orange` (hardcoded) | `.orange` | Create token |
| Info | `.blue` (hardcoded) | `.blue` | Create token |
| Link | Primary color | `.blue` | Use primary |

## Typography Scale

### Font Family Requirements

| Platform | Current | Target | Impact |
|----------|---------|--------|--------|
| Web | Space Grotesk | **Montserrat** | Full migration needed |
| iOS | SF Pro (System) | **Montserrat** | Custom font integration |

### Size Scale Mapping

| Level | Web (Tailwind) | Web px | iOS pt | Semantic Name |
|-------|---------------|---------|---------|---------------|
| Display | `text-6xl` | 60px | 34pt | `largeTitle` |
| H1 | `text-5xl` | 48px | 28pt | `title1` |
| H2 | `text-4xl` | 36px | 22pt | `title2` |
| H3 | `text-3xl` | 30px | 20pt | `title3` |
| H4 | `text-2xl` | 24px | 17pt | `headline` |
| H5 | `text-xl` | 20px | 17pt | `body` |
| H6 | `text-lg` | 18px | 16pt | `callout` |
| Body | `text-base` | 16px | 15pt | `subheadline` |
| Small | `text-sm` | 14px | 13pt | `footnote` |
| XSmall | `text-xs` | 12px | 12pt | `caption1` |
| XXSmall | `text-xs` | 12px | 11pt | `caption2` |

### Font Weight Mapping

| Weight | CSS | iOS | Montserrat File |
|--------|-----|-----|-----------------|
| Thin | 100 | `.ultraLight` | Montserrat-Thin |
| Light | 300 | `.light` | Montserrat-Light |
| Regular | 400 | `.regular` | Montserrat-Regular |
| Medium | 500 | `.medium` | Montserrat-Medium |
| Semibold | 600 | `.semibold` | Montserrat-SemiBold |
| Bold | 700 | `.bold` | Montserrat-Bold |
| Black | 900 | `.black` | Montserrat-Black |

## Spacing Scale

### Grid System (4px base)

| Token | Web (Tailwind) | Web px | iOS pt | Usage |
|-------|---------------|---------|---------|-------|
| `xxs` | `space-0.5` | 2px | 2pt | Micro spacing |
| `xs` | `space-1` | 4px | 4pt | Tight spacing |
| `sm` | `space-2` | 8px | 8pt | Small gaps |
| `md` | `space-4` | 16px | 16pt | Default spacing |
| `lg` | `space-6` | 24px | 24pt | Section spacing |
| `xl` | `space-8` | 32px | 32pt | Large gaps |
| `2xl` | `space-12` | 48px | 48pt | Major sections |
| `3xl` | `space-16` | 64px | 64pt | Page margins |

## Border Radius

| Token | Web | iOS | Usage |
|-------|-----|-----|-------|
| `none` | `rounded-none` (0) | 0 | Sharp corners |
| `sm` | `rounded-sm` (2px) | 2 | Subtle rounding |
| `md` | `rounded-md` (6px) | 6 | Default radius |
| `lg` | `rounded-lg` (8px) | 8 | Cards, buttons |
| `xl` | `rounded-xl` (12px) | 12 | Modals |
| `2xl` | `rounded-2xl` (16px) | 16 | Large cards |
| `full` | `rounded-full` | `.infinity` | Pills, avatars |

## Shadows

| Level | Web | iOS Equivalent | Usage |
|-------|-----|---------------|-------|
| `none` | `shadow-none` | No shadow | Flat elements |
| `sm` | `shadow-sm` | `.shadow(radius: 2)` | Subtle depth |
| `md` | `shadow-md` | `.shadow(radius: 4)` | Cards |
| `lg` | `shadow-lg` | `.shadow(radius: 8)` | Elevated cards |
| `xl` | `shadow-xl` | `.shadow(radius: 12)` | Modals |

## Component Token Mapping

### Buttons

| Variant | Web Classes | iOS Modifiers | Tokens Used |
|---------|------------|---------------|-------------|
| Primary | `bg-primary text-primary-foreground` | `.buttonStyle(PrimaryButton())` | primary, primary-foreground |
| Secondary | `bg-secondary text-secondary-foreground` | `.buttonStyle(SecondaryButton())` | secondary, secondary-foreground |
| Destructive | `bg-destructive text-destructive-foreground` | `.buttonStyle(DestructiveButton())` | destructive, destructive-foreground |
| Ghost | `hover:bg-accent` | `.buttonStyle(GhostButton())` | accent, accent-foreground |

### Cards

| Property | Web | iOS | Token |
|----------|-----|-----|-------|
| Background | `bg-card` | `.background(Color.card)` | card |
| Border | `border border-border` | `.overlay(RoundedRectangle().stroke())` | border |
| Radius | `rounded-lg` | `.cornerRadius(8)` | radius-lg |
| Shadow | `shadow-md` | `.shadow(radius: 4)` | shadow-md |
| Padding | `p-4` | `.padding(16)` | spacing-md |

## Migration Priority

### Phase 1: Critical Tokens (Week 1)
1. ✅ Define Montserrat font stack
2. ✅ Map primary colors exactly
3. ✅ Establish spacing scale
4. ✅ Document border radius scale

### Phase 2: Components (Week 2)
1. Button system alignment
2. Card standardization
3. Form input consistency
4. Navigation patterns

### Phase 3: Polish (Week 3)
1. Shadow system
2. Animation tokens
3. Breakpoint alignment
4. Dark mode refinement

## Implementation Files

### Web Changes Required
- `/tailwind.config.ts` - Add Montserrat, adjust color tokens
- `/src/index.css` - Update CSS variables
- `/src/lib/utils.ts` - Update cn() helper for new tokens

### iOS Changes Required
- `/ios/IndigoInvestor/Core/Theme/Tokens.swift` - Create new file
- `/ios/IndigoInvestor/Core/Theme/Typography.swift` - Create new file
- `/ios/IndigoInvestor/Core/Theme/Spacing.swift` - Create new file
- `/ios/IndigoInvestor/Core/Extensions/Color+Tokens.swift` - Update colors
- All View files - Update to use token system

## Validation Checklist

- [ ] Colors match exactly between platforms
- [ ] Typography scales proportionally
- [ ] Spacing follows 4px grid
- [ ] Components look identical
- [ ] Dark mode works consistently
- [ ] Accessibility maintained
- [ ] Performance not degraded
