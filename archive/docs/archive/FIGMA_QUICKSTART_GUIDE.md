# Figma Quick Start Guide - Indigo Yield Platform

## 🚀 Getting Started in 30 Minutes

This guide will help you create a Figma design file for the Indigo Yield Platform quickly and efficiently.

---

## Step 1: Set Up Your Figma File (5 minutes)

### 1.1 Create New File
1. Go to Figma → New Design File
2. Name it: `Indigo Yield Platform - Design System`
3. Set up pages:
   - Cover
   - Foundation
   - Components
   - Patterns
   - Templates

### 1.2 Install Plugins (Recommended)
- **Figma Tokens** - For design token management
- **Color Blind** - For accessibility testing
- **Stark** - For contrast checking
- **Auto Layout** - Already built-in, but familiarize yourself

---

## Step 2: Set Up Color Variables (10 minutes)

### 2.1 Create Variable Collections
1. Click **Variables** in the right sidebar
2. Create a new collection: `Semantic Colors`
3. Add two modes: `Light` and `Dark`

### 2.2 Add Core Colors

**Quick Copy-Paste Format for Figma:**

```
Light Mode Colors:
primary: #0F172A
primary-foreground: #F8FAFC
secondary: #F1F5F9
secondary-foreground: #0F172A
background: #FFFFFF
foreground: #020817
card: #FFFFFF
card-foreground: #020817
muted: #F1F5F9
muted-foreground: #64748B
accent: #F1F5F9
accent-foreground: #0F172A
destructive: #EF4444
destructive-foreground: #F8FAFC
border: #E2E8F0
input: #E2E8F0
ring: #020817

Dark Mode Colors:
primary: #F8FAFC
primary-foreground: #0F172A
secondary: #1E293B
secondary-foreground: #F8FAFC
background: #020817
foreground: #F8FAFC
card: #020817
card-foreground: #F8FAFC
muted: #1E293B
muted-foreground: #94A3B8
accent: #1E293B
accent-foreground: #F8FAFC
destructive: #991B1B
destructive-foreground: #F8FAFC
border: #1E293B
input: #1E293B
ring: #CBD5E1
```

### 2.3 Create Color Styles
1. For each color above, create a **Color Style**
2. Name them using the token name (e.g., `primary`, `secondary`)
3. Link them to your variables

---

## Step 3: Set Up Typography (5 minutes)

### 3.1 Import Montserrat Font
1. Install from Google Fonts: https://fonts.google.com/specimen/Montserrat
2. Download weights: 400, 500, 600, 700
3. Install on your system
4. Restart Figma if needed

### 3.2 Create Text Styles

**Quick Reference:**

```
Headings:
H1: Montserrat / Bold 700 / 32px / Line 1.25
H2: Montserrat / SemiBold 600 / 24px / Line 1.3
H3: Montserrat / SemiBold 600 / 20px / Line 1.4
H4: Montserrat / SemiBold 600 / 18px / Line 1.4

Body:
Body Large: Montserrat / Regular 400 / 16px / Line 1.5
Body: Montserrat / Regular 400 / 14px / Line 1.5
Body Small: Montserrat / Regular 400 / 12px / Line 1.5

UI:
Button: Montserrat / Medium 500 / 14px / Line 1
Label: Montserrat / Medium 500 / 14px / Line 1
```

Create a Text Style for each of these in Figma.

---

## Step 4: Create Your First Component - Button (5 minutes)

### 4.1 Create Base Button
1. Draw a rectangle: 40px height
2. Apply auto-layout:
   - Horizontal direction
   - Padding: 16px horizontal, 8px vertical
   - Gap: 8px (for icon + text)
3. Border radius: 6px
4. Add text: "Button" (Button text style)

### 4.2 Add Variants
1. Convert to component (Ctrl/Cmd + Alt + K)
2. Add property: **Variant**
   - default
   - destructive
   - outline
   - secondary
   - ghost
   - link
3. Add property: **Size**
   - sm (36px height)
   - default (40px height)
   - lg (44px height)
   - icon (40×40 square)

### 4.3 Style Each Variant
Apply colors using your color variables:
- **Default**: primary bg, primary-foreground text
- **Destructive**: destructive bg, destructive-foreground text
- **Outline**: background bg, border (1px input), foreground text
- **Secondary**: secondary bg, secondary-foreground text
- **Ghost**: transparent bg, foreground text
- **Link**: transparent bg, primary text, underline

---

## Step 5: Create Card Component (5 minutes)

### 5.1 Create Card Container
1. Draw rectangle: Width 400px (auto height)
2. Apply auto-layout:
   - Vertical direction
   - Padding: 24px all around
   - Gap: 16px
3. Border radius: 8px
4. Border: 1px, color `border`
5. Background: `card`
6. Shadow: shadow-sm (0 1px 2px 0 rgba(0,0,0,0.05))

### 5.2 Add Card Elements
Inside the card, add:
1. **Header** (auto-layout vertical, gap 6px)
   - Title (H2 text style, card-foreground color)
   - Description (Body Small, muted-foreground)
2. **Content** area (placeholder rectangle or text)
3. **Footer** (auto-layout horizontal, gap 8px)
   - Add buttons (use your button component)

### 5.3 Make it a Component
1. Select all layers
2. Create component (Ctrl/Cmd + Alt + K)
3. Name it: `Card`
4. Add variants for:
   - With header
   - With footer
   - Simple (no header/footer)

---

## Quick Tips for Faster Design

### Using Auto Layout Efficiently
- **Keyboard shortcut**: Shift + A
- Always set proper padding and gaps
- Use "Hug contents" for buttons
- Use "Fill container" for full-width elements

### Creating Consistent Spacing
Use the 8pt grid:
- 8, 16, 24, 32, 48, 64 for major spacing
- 4, 12 for minor adjustments
- Snap to pixel grid: Always on

### Color Mode Switching
1. Create a frame for testing
2. Add components inside
3. Switch between Light/Dark mode using variables
4. Check contrast with Stark plugin

---

## Essential Components Priority List

Build in this order for maximum impact:

1. ✅ **Button** (already done above)
2. ✅ **Card** (already done above)
3. **Input** - Text input with label
4. **Badge** - Small pill-shaped labels
5. **Avatar** - User profile pictures
6. **Alert** - Warning/info/success messages
7. **Dialog** - Modal overlays
8. **Sidebar** - Navigation panel
9. **Table** - Data display
10. **Navigation Menu** - Top nav bar

---

## Time-Saving Figma Shortcuts

```
Component Management:
Ctrl/Cmd + Alt + K        Create component
Ctrl/Cmd + Alt + B        Create component set
Alt + Drag                Duplicate (hold Alt while dragging)
Ctrl/Cmd + D              Duplicate in place

Auto Layout:
Shift + A                 Add auto layout
Ctrl/Cmd + Shift + A      Remove auto layout
Ctrl/Cmd + Alt + P        Toggle padding view

Colors & Styles:
Ctrl/Cmd + /              Quick actions
Ctrl/Cmd + Alt + C        Copy style
Ctrl/Cmd + Alt + V        Paste style
I                         Eyedropper tool

View:
Cmd/Ctrl + \\             Show/hide UI
Cmd/Ctrl + Y              Show multiplayer cursors
Cmd/Ctrl + '              Show pixel grid
Z                         Zoom tool
```

---

## Figma-to-Code Workflow

### For Developers
1. Use **Inspect** panel (right sidebar)
2. Copy CSS values directly
3. Use Figma plugins:
   - **Anima** - Export to React
   - **html.to.design** - Import from HTML
   - **Design Tokens** - Export tokens

### Design Tokens Export
1. Install "Design Tokens" plugin
2. Export as JSON
3. Import into Tailwind config
4. Use with Style Dictionary for cross-platform

---

## Testing Your Design

### Accessibility Checklist
- [ ] All text meets WCAG AA contrast (4.5:1 for body, 3:1 for large)
- [ ] Focus states are visible
- [ ] Interactive elements are at least 44×44px
- [ ] Color is not the only indicator (use icons too)

### Responsive Design
Create frames for:
- Mobile: 375px (iPhone SE)
- Tablet: 768px (iPad)
- Desktop: 1440px (standard)
- Large: 1920px (full HD)

Test your components at each breakpoint.

---

## Common Pitfalls to Avoid

1. ❌ **Inconsistent spacing** → Use 8pt grid always
2. ❌ **Too many color variations** → Stick to the semantic tokens
3. ❌ **Missing hover/focus states** → Every interactive element needs them
4. ❌ **Forgetting dark mode** → Test both modes continuously
5. ❌ **Not using variables** → Hard-coded colors are difficult to update
6. ❌ **Over-complicating components** → Keep variants simple and logical

---

## Resources & References

### Official Documentation
- **Figma Learn**: https://help.figma.com/
- **shadcn-ui**: https://ui.shadcn.com/
- **Tailwind CSS**: https://tailwindcss.com/docs

### Design System Examples
- **Radix UI**: https://www.radix-ui.com/
- **Material Design**: https://m3.material.io/
- **Fluent 2**: https://fluent2.microsoft.design/

### Figma Community Files
Search Figma Community for:
- "shadcn-ui design system"
- "Tailwind CSS components"
- "React component library"

### Color Tools
- **Coolors**: https://coolors.co/
- **Contrast Checker**: https://webaim.org/resources/contrastchecker/
- **HSL Color Picker**: https://hslpicker.com/

---

## Next Steps After Quick Start

1. **Build remaining components** (Input, Select, Checkbox, etc.)
2. **Create page templates** (Dashboard, Settings, Profile)
3. **Set up component documentation** (Usage guidelines, do's and don'ts)
4. **Publish as team library** (Share with developers)
5. **Create a design system handbook** (More detailed than this guide)

---

## Need Help?

### Figma Community
- **Figma Forum**: https://forum.figma.com/
- **Discord**: Join Figma's Discord server
- **YouTube**: Figma's official channel has great tutorials

### Design System Communities
- **Design Systems Slack**: designsystems.slack.com
- **r/FigmaDesign**: Reddit community
- **Twitter**: Follow @figma and #DesignSystems

---

**Happy Designing!** 🎨

This guide should get you started with your Figma design system in about 30 minutes. Refer to the full `FIGMA_DESIGN_SYSTEM_SPEC.md` for complete details on all 59 components.
