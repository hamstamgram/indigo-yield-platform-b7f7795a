# Indigo Yield Platform - Figma Design System Specification

## Overview
This document provides a comprehensive design system specification for creating a Figma design file that matches the Indigo Yield Platform's React + TypeScript implementation with shadcn-ui components and Tailwind CSS.

---

## 🎨 Color System

### Foundation Colors (HSL Format)

#### Light Mode
```
Background Colors:
├─ background: hsl(0, 0%, 100%)           → #FFFFFF
├─ foreground: hsl(222.2, 84%, 4.9%)      → #020817
├─ card: hsl(0, 0%, 100%)                 → #FFFFFF
├─ card-foreground: hsl(222.2, 84%, 4.9%) → #020817
├─ popover: hsl(0, 0%, 100%)              → #FFFFFF
└─ popover-foreground: hsl(222.2, 84%, 4.9%) → #020817

Brand Colors:
├─ primary: hsl(222.2, 47.4%, 11.2%)      → #0F172A
├─ primary-foreground: hsl(210, 40%, 98%) → #F8FAFC
├─ secondary: hsl(210, 40%, 96.1%)        → #F1F5F9
├─ secondary-foreground: hsl(222.2, 47.4%, 11.2%) → #0F172A
├─ accent: hsl(210, 40%, 96.1%)           → #F1F5F9
└─ accent-foreground: hsl(222.2, 47.4%, 11.2%) → #0F172A

Functional Colors:
├─ muted: hsl(210, 40%, 96.1%)            → #F1F5F9
├─ muted-foreground: hsl(215.4, 16.3%, 46.9%) → #64748B
├─ destructive: hsl(0, 84.2%, 60.2%)      → #EF4444
├─ destructive-foreground: hsl(210, 40%, 98%) → #F8FAFC
├─ border: hsl(214.3, 31.8%, 91.4%)       → #E2E8F0
├─ input: hsl(214.3, 31.8%, 91.4%)        → #E2E8F0
└─ ring: hsl(222.2, 84%, 4.9%)            → #020817

Sidebar Colors:
├─ sidebar-background: hsl(0, 0%, 98%)    → #FAFAFA
├─ sidebar-foreground: hsl(240, 5.3%, 26.1%) → #3F3F46
├─ sidebar-primary: hsl(240, 5.9%, 10%)   → #18181B
├─ sidebar-primary-foreground: hsl(0, 0%, 98%) → #FAFAFA
├─ sidebar-accent: hsl(240, 4.8%, 95.9%)  → #F4F4F5
├─ sidebar-accent-foreground: hsl(240, 5.9%, 10%) → #18181B
├─ sidebar-border: hsl(220, 13%, 91%)     → #E4E4E7
└─ sidebar-ring: hsl(217.2, 91.2%, 59.8%) → #3B82F6
```

#### Dark Mode
```
Background Colors:
├─ background: hsl(222.2, 84%, 4.9%)      → #020817
├─ foreground: hsl(210, 40%, 98%)         → #F8FAFC
├─ card: hsl(222.2, 84%, 4.9%)            → #020817
├─ card-foreground: hsl(210, 40%, 98%)    → #F8FAFC
├─ popover: hsl(222.2, 84%, 4.9%)         → #020817
└─ popover-foreground: hsl(210, 40%, 98%) → #F8FAFC

Brand Colors:
├─ primary: hsl(210, 40%, 98%)            → #F8FAFC
├─ primary-foreground: hsl(222.2, 47.4%, 11.2%) → #0F172A
├─ secondary: hsl(217.2, 32.6%, 17.5%)    → #1E293B
├─ secondary-foreground: hsl(210, 40%, 98%) → #F8FAFC
├─ accent: hsl(217.2, 32.6%, 17.5%)       → #1E293B
└─ accent-foreground: hsl(210, 40%, 98%)  → #F8FAFC

Functional Colors:
├─ muted: hsl(217.2, 32.6%, 17.5%)        → #1E293B
├─ muted-foreground: hsl(215, 20.2%, 65.1%) → #94A3B8
├─ destructive: hsl(0, 62.8%, 30.6%)      → #991B1B
├─ destructive-foreground: hsl(210, 40%, 98%) → #F8FAFC
├─ border: hsl(217.2, 32.6%, 17.5%)       → #1E293B
├─ input: hsl(217.2, 32.6%, 17.5%)        → #1E293B
└─ ring: hsl(212.7, 26.8%, 83.9%)         → #CBD5E1

Sidebar Colors:
├─ sidebar-background: hsl(240, 5.9%, 10%) → #18181B
├─ sidebar-foreground: hsl(240, 4.8%, 95.9%) → #F4F4F5
├─ sidebar-primary: hsl(224.3, 76.3%, 48%) → #3B82F6
├─ sidebar-primary-foreground: hsl(0, 0%, 100%) → #FFFFFF
├─ sidebar-accent: hsl(240, 3.7%, 15.9%)  → #27272A
├─ sidebar-accent-foreground: hsl(240, 4.8%, 95.9%) → #F4F4F5
├─ sidebar-border: hsl(240, 3.7%, 15.9%)  → #27272A
└─ sidebar-ring: hsl(217.2, 91.2%, 59.8%) → #3B82F6
```

### Figma Setup Instructions
1. Create **Color Styles** in Figma for each token
2. Use the naming convention: `semantic/context` (e.g., `primary/default`, `sidebar/background`)
3. Create separate color modes: `Light` and `Dark`
4. Enable **Variables** for dynamic color switching

---

## 📝 Typography System

### Font Family
**Montserrat** (Google Fonts)
- Weights: 400 (Regular), 500 (Medium), 600 (Semi-Bold), 700 (Bold)
- Optimized with font-display: swap
- Latin and Extended Latin character sets

### Type Scale

```
Display Styles:
├─ Display Large: 48px / 600 / -0.02em / 1.2 line-height
├─ Display Medium: 36px / 600 / -0.01em / 1.2 line-height
└─ Display Small: 30px / 600 / 0 / 1.2 line-height

Heading Styles:
├─ H1: 32px / 700 / -0.01em / 1.25 line-height
├─ H2: 24px / 600 / 0 / 1.3 line-height (CardTitle default)
├─ H3: 20px / 600 / 0 / 1.4 line-height
├─ H4: 18px / 600 / 0 / 1.4 line-height
├─ H5: 16px / 600 / 0 / 1.5 line-height
└─ H6: 14px / 600 / 0 / 1.5 line-height

Body Styles:
├─ Body Large: 16px / 400 / 0 / 1.5 line-height
├─ Body Medium: 14px / 400 / 0 / 1.5 line-height (Default)
├─ Body Small: 12px / 400 / 0 / 1.5 line-height
└─ Body Caption: 11px / 400 / 0 / 1.5 line-height

Button/UI Styles:
├─ Button Text: 14px / 500 / 0 / 1 line-height
├─ Label: 14px / 500 / 0 / 1 line-height
└─ Small Label: 12px / 500 / 0 / 1 line-height
```

### Figma Setup Instructions
1. Create **Text Styles** for each type scale
2. Use naming: `category/variant/size` (e.g., `heading/bold/h2`)
3. Apply Montserrat font family
4. Set proper weights and line heights

---

## 📏 Spacing & Layout

### Spacing Scale (8pt Grid System)
```
├─ 0: 0px
├─ 0.5: 2px (0.125rem)
├─ 1: 4px (0.25rem)
├─ 1.5: 6px (0.375rem)
├─ 2: 8px (0.5rem)
├─ 2.5: 10px (0.625rem)
├─ 3: 12px (0.75rem)
├─ 3.5: 14px (0.875rem)
├─ 4: 16px (1rem)
├─ 5: 20px (1.25rem)
├─ 6: 24px (1.5rem)      ← Card padding default
├─ 7: 28px (1.75rem)
├─ 8: 32px (2rem)        ← Container padding
├─ 9: 36px (2.25rem)
├─ 10: 40px (2.5rem)
├─ 11: 44px (2.75rem)
├─ 12: 48px (3rem)
├─ 14: 56px (3.5rem)
├─ 16: 64px (4rem)
├─ 20: 80px (5rem)
└─ 24: 96px (6rem)
```

### Border Radius
```
├─ sm: 4px (calc(8px - 4px))
├─ md: 6px (calc(8px - 2px))
├─ lg: 8px (default radius)
├─ full: 9999px (rounded-full)
└─ none: 0px
```

### Container Widths
```
├─ sm: 640px
├─ md: 768px
├─ lg: 1024px
├─ xl: 1280px
└─ 2xl: 1400px (max container width)
```

---

## 🎯 Component Library Specification

### 1. Button Component

**Variants:**
```
Default:
├─ Background: primary
├─ Text: primary-foreground
├─ Hover: primary/90 opacity
├─ Height: 40px (h-10)
├─ Padding: 16px horizontal, 8px vertical
└─ Border Radius: md (6px)

Destructive:
├─ Background: destructive
├─ Text: destructive-foreground
└─ Hover: destructive/90 opacity

Outline:
├─ Background: background
├─ Border: 1px input
├─ Text: foreground
└─ Hover: accent background, accent-foreground text

Secondary:
├─ Background: secondary
├─ Text: secondary-foreground
└─ Hover: secondary/80 opacity

Ghost:
├─ Background: transparent
└─ Hover: accent background, accent-foreground text

Link:
├─ Background: transparent
├─ Text: primary
└─ Hover: underline
```

**Sizes:**
```
Small (sm):   36px height, 12px horizontal padding
Default:      40px height, 16px horizontal padding
Large (lg):   44px height, 32px horizontal padding
Icon:         40px × 40px square
```

**States:**
- Default
- Hover (color/90 or color/80 opacity)
- Focus (ring-2 ring-ring, ring-offset-2)
- Disabled (opacity-50, pointer-events-none)

### 2. Card Component

**Structure:**
```
Card Container:
├─ Background: card
├─ Text: card-foreground
├─ Border: 1px border
├─ Border Radius: lg (8px)
├─ Shadow: sm (0 1px 2px 0 rgba(0,0,0,0.05))
└─ Padding: Applied per section

Card Header:
├─ Padding: 24px (p-6)
└─ Space between elements: 6px (space-y-1.5)

Card Title:
├─ Font Size: 24px (text-2xl)
├─ Font Weight: 600 (semibold)
├─ Line Height: tight (1.25)
└─ Letter Spacing: tight (-0.01em)

Card Description:
├─ Font Size: 14px (text-sm)
└─ Color: muted-foreground

Card Content:
├─ Padding: 24px horizontal, 0 top (p-6 pt-0)
└─ Spacing: Content-dependent

Card Footer:
├─ Display: flex, items-center
└─ Padding: 24px horizontal, 0 top (p-6 pt-0)
```

### 3. Input Component

```
Base:
├─ Background: background
├─ Border: 1px input
├─ Text: foreground
├─ Height: 40px (h-10)
├─ Padding: 12px horizontal, 8px vertical
├─ Border Radius: md (6px)
└─ Font Size: 14px

States:
├─ Focus: ring-2 ring-ring, ring-offset-2
├─ Disabled: opacity-50, cursor-not-allowed
└─ Error: border-destructive, ring-destructive
```

### 4. Badge Component

```
Variants:
├─ Default: primary bg, primary-foreground text
├─ Secondary: secondary bg, secondary-foreground text
├─ Destructive: destructive bg, destructive-foreground text
└─ Outline: border, transparent bg

Styling:
├─ Height: auto (inline)
├─ Padding: 2px 10px (px-2.5 py-0.5)
├─ Border Radius: full (9999px)
├─ Font Size: 12px
└─ Font Weight: 600
```

### 5. Dialog/Modal Component

```
Overlay:
├─ Background: black with 80% opacity
└─ Backdrop blur: Optional

Dialog Container:
├─ Background: background
├─ Max Width: lg (32rem / 512px)
├─ Border Radius: lg (8px)
├─ Shadow: lg
└─ Padding: 24px (p-6)

Dialog Header:
├─ Font Size: 18px
├─ Font Weight: 600
└─ Margin Bottom: 16px

Dialog Footer:
├─ Display: flex, justify-end
└─ Gap: 8px (between buttons)
```

### 6. Sidebar Component

```
Container:
├─ Background: sidebar-background
├─ Text: sidebar-foreground
├─ Width: 256px (default), collapsible to 64px
├─ Border Right: 1px sidebar-border
└─ Padding: 16px vertical

Sidebar Items:
├─ Height: 40px
├─ Padding: 8px 12px
├─ Border Radius: md (6px)
├─ Gap: 8px (icon to text)
└─ Hover: sidebar-accent bg

Sidebar Active State:
├─ Background: sidebar-primary
├─ Text: sidebar-primary-foreground
└─ Focus Ring: 2px sidebar-ring
```

### 7. Table Component

```
Table Container:
├─ Border: 1px border
└─ Border Radius: md (6px)

Table Header:
├─ Background: muted
├─ Font Weight: 500
├─ Height: 48px
├─ Padding: 16px 12px
└─ Border Bottom: 1px border

Table Row:
├─ Height: 52px
├─ Padding: 16px 12px
├─ Border Bottom: 1px border
└─ Hover: muted/50 background

Table Cell:
├─ Font Size: 14px
└─ Vertical Align: middle
```

### 8. Navigation Menu

```
Menu Container:
├─ Display: flex
├─ Gap: 4px
└─ Background: transparent

Menu Item:
├─ Height: 40px
├─ Padding: 8px 16px
├─ Border Radius: md
├─ Font Weight: 500
└─ Hover: accent bg, accent-foreground text

Menu Item Active:
├─ Background: primary
└─ Text: primary-foreground
```

---

## 🎭 Effects & Shadows

### Shadow System
```
shadow-sm:  0 1px 2px 0 rgba(0, 0, 0, 0.05)
shadow:     0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)
shadow-md:  0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)
shadow-lg:  0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)
shadow-xl:  0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)
shadow-2xl: 0 25px 50px -12px rgba(0, 0, 0, 0.25)
```

### Animations
```
Accordion Down/Up:
├─ Duration: 0.2s
├─ Easing: ease-out
└─ Property: height

Shimmer (Image Loading):
├─ Duration: 2s
├─ Easing: linear
├─ Direction: infinite
└─ Transform: background-position from -200% to 200%

Focus Ring:
├─ Duration: 0.15s
├─ Easing: ease-in-out
└─ Property: box-shadow, border-color
```

---

## 📱 Responsive Breakpoints

```
sm:  640px  (min-width)
md:  768px  (min-width)
lg:  1024px (min-width)
xl:  1280px (min-width)
2xl: 1400px (max container, min-width)
```

---

## 🎨 Figma File Structure Recommendation

```
📁 Indigo Yield Platform Design System
├── 📄 Cover Page
│   └── Design system overview, version, last updated
│
├── 📄 Foundation
│   ├── Color Palette (Light Mode)
│   ├── Color Palette (Dark Mode)
│   ├── Typography Scale
│   ├── Spacing Scale
│   ├── Border Radius
│   └── Shadow Styles
│
├── 📄 Components - Inputs
│   ├── Button (all variants & sizes)
│   ├── Input
│   ├── Textarea
│   ├── Select
│   ├── Checkbox
│   ├── Radio
│   ├── Switch
│   └── Slider
│
├── 📄 Components - Display
│   ├── Card
│   ├── Badge
│   ├── Avatar
│   ├── Alert
│   ├── Toast
│   └── Skeleton
│
├── 📄 Components - Navigation
│   ├── Sidebar
│   ├── Navigation Menu
│   ├── Tabs
│   ├── Breadcrumb
│   └── Pagination
│
├── 📄 Components - Overlays
│   ├── Dialog
│   ├── Sheet
│   ├── Popover
│   ├── Dropdown Menu
│   ├── Context Menu
│   └── Tooltip
│
├── 📄 Components - Data Display
│   ├── Table
│   ├── Chart (Recharts style)
│   ├── Calendar
│   ├── Progress
│   └── Separator
│
├── 📄 Patterns - Forms
│   ├── Login Form
│   ├── Registration Form
│   ├── Search Form
│   └── Filter Controls
│
├── 📄 Patterns - Layouts
│   ├── Dashboard Layout
│   ├── Settings Layout
│   ├── Detail View Layout
│   └── List View Layout
│
└── 📄 Templates
    ├── Dashboard Page
    ├── Portfolio View
    ├── Transaction History
    ├── Settings Page
    └── Profile Page
```

---

## 🔧 Implementation Guidelines

### Auto Layout in Figma

1. **Buttons**: Use auto-layout with proper padding
   - Set constraints: hug contents vertically
   - Min width for text buttons

2. **Cards**: Use auto-layout for stacking
   - Vertical distribution with consistent gaps
   - Padding: 24px all around

3. **Forms**: Use auto-layout for field stacking
   - Consistent vertical spacing: 16px between fields
   - Label spacing: 8px above input

### Component Variants

Use Figma variants for:
- Button: variant × size
- Input: state (default/focus/error/disabled)
- Card: with/without header, footer
- Badge: variant (default/secondary/destructive/outline)

### Variables Setup

Create Figma variables for:
- All color tokens (with light/dark modes)
- Spacing values (2, 4, 8, 12, 16, 24, 32, etc.)
- Border radius values
- Font sizes

### Naming Conventions

- Components: PascalCase (e.g., `Button`, `CardTitle`)
- Variants: lowercase with hyphens (e.g., `default`, `primary-foreground`)
- Layers: Descriptive names (e.g., `Background`, `Text Label`, `Icon`)

---

## 📚 Component Count Summary

Current shadcn-ui components in codebase: **59 components**

Key components:
- Accordion, Alert, Alert Dialog, Avatar, Badge
- Breadcrumb, Button, Calendar, Card, Carousel
- Chart, Checkbox, Collapsible, Command, Context Menu
- Date Range Picker, Dialog, Drawer, Dropdown Menu
- Empty State, Form, Hover Card, Input, Input OTP
- Label, Loading States, Menubar, Navigation Menu
- Optimized Image, Pagination, Popover, Progress
- Radio Group, Resizable, Responsive Table, Scroll Area
- Select, Separator, Sheet, Sidebar, Skeleton
- Slider, Sonner, Switch, Table, Tabs
- Textarea, Toast, Toaster, Toggle, Toggle Group
- Tooltip

---

## 🚀 Next Steps

1. **Create Figma File**: Use this spec to build your design system
2. **Set Up Variables**: Configure color modes and design tokens
3. **Build Components**: Start with foundational components (Button, Input, Card)
4. **Create Variants**: Use Figma variants for different states
5. **Test Dark Mode**: Ensure all components work in both themes
6. **Document**: Add annotations and usage guidelines
7. **Share**: Publish the design system as a team library

---

## 📞 Support & Resources

- **shadcn-ui Documentation**: https://ui.shadcn.com/
- **Tailwind CSS**: https://tailwindcss.com/
- **Radix UI**: https://www.radix-ui.com/
- **Figma Variables**: https://help.figma.com/hc/en-us/articles/15339657135383

---

**Version**: 1.0.0
**Last Updated**: October 10, 2025
**Maintained by**: Indigo Yield Platform Team
