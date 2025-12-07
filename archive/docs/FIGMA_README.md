# Indigo Yield Platform - Figma Design System Documentation

## 📚 Documentation Overview

This folder contains comprehensive documentation for creating a Figma design system that matches the Indigo Yield Platform's React + TypeScript implementation.

---

## 📄 Documentation Files

### 1. **FIGMA_DESIGN_SYSTEM_SPEC.md** (Complete Specification)
The master reference document containing:
- Complete color system (Light + Dark modes)
- Typography scale with Montserrat font
- Spacing and layout guidelines
- 59 component specifications
- Effects, shadows, and animations
- Responsive breakpoints
- Recommended Figma file structure

**Use this for**: Complete technical specifications and design tokens

---

### 2. **FIGMA_QUICKSTART_GUIDE.md** (30-Minute Setup)
A fast-track guide to get started:
- Set up Figma file in 5 minutes
- Create color variables in 10 minutes
- Set up typography in 5 minutes
- Build first components (Button, Card) in 10 minutes
- Essential Figma shortcuts
- Time-saving tips

**Use this for**: Quick onboarding and immediate productivity

---

### 3. **FIGMA_COMPONENT_REFERENCE.md** (Complete Component Library)
Detailed breakdown of all 59 components:
- Component specifications with props
- Figma layer structure
- Variants and states
- Priority matrix (what to build first)
- Design patterns
- Best practices

**Use this for**: Building individual components systematically

---

## 🚀 Getting Started Workflow

### For Designers (New to Project)
```
1. Read: FIGMA_QUICKSTART_GUIDE.md (30 min)
2. Follow: Quick Start steps to create file
3. Reference: FIGMA_DESIGN_SYSTEM_SPEC.md as you build
4. Build: Components using FIGMA_COMPONENT_REFERENCE.md
```

### For Design System Leads
```
1. Read: FIGMA_DESIGN_SYSTEM_SPEC.md (Complete understanding)
2. Plan: Component priorities from FIGMA_COMPONENT_REFERENCE.md
3. Delegate: Assign components to team using priorities
4. Review: Ensure consistency with spec
```

### For Developers
```
1. Read: FIGMA_DESIGN_SYSTEM_SPEC.md (Design tokens section)
2. Extract: Color, typography, spacing tokens
3. Sync: With tailwind.config.ts and index.css
4. Inspect: Individual components in Figma for implementation
```

---

## 🎨 Design System Summary

### Foundation
- **Colors**: 26 semantic tokens (Light + Dark modes)
- **Typography**: 12 text styles (Montserrat, 4 weights)
- **Spacing**: 24 values (8pt grid system)
- **Border Radius**: 4 sizes (sm, md, lg, full)
- **Shadows**: 6 levels (sm to 2xl)

### Components
- **Total**: 59 components
- **Essential**: 12 (Phase 1)
- **Important**: 12 (Phase 2)
- **Complete**: 35 (Phase 3)

### Categories
1. **Form** (14): Button, Input, Select, Checkbox, etc.
2. **Navigation** (9): Sidebar, Tabs, Breadcrumb, etc.
3. **Display** (14): Card, Badge, Avatar, Table, etc.
4. **Overlay** (7): Dialog, Sheet, Popover, Tooltip, etc.
5. **Utility** (8): Separator, Scroll Area, Skeleton, etc.
6. **Custom** (7): App-specific components

---

## 🎯 Component Build Priority

### Phase 1: MVP Essentials (Week 1)
Build these 12 components first for immediate usability:

```
✓ Button       - Primary interaction
✓ Card         - Content container
✓ Input        - Form field
✓ Label        - Field labels
✓ Form         - Form structure
✓ Badge        - Status indicators
✓ Avatar       - User representation
✓ Alert        - Notifications
✓ Dialog       - Modals
✓ Sidebar      - Navigation
✓ Tabs         - Content switching
✓ Breadcrumb   - Navigation context
```

### Phase 2: Full Experience (Week 2)
Add these 12 for complete functionality:

```
□ Select       - Dropdown selection
□ Checkbox     - Multiple choice
□ Radio        - Single choice
□ Textarea     - Long text input
□ Table        - Data display
□ Nav Menu     - Top navigation
□ Sheet        - Side panels
□ Popover      - Context panels
□ Toast        - Feedback messages
□ Skeleton     - Loading states
□ Separator    - Visual breaks
□ Scroll Area  - Custom scrolling
```

### Phase 3: Complete System (Week 3-4)
Finish remaining 35 components for comprehensive coverage.

---

## 🔄 Design-to-Code Workflow

### 1. Design Phase (Figma)
```
Designer creates component
    ↓
Apply design tokens (colors, typography, spacing)
    ↓
Add variants and states
    ↓
Document usage guidelines
    ↓
Publish to team library
```

### 2. Handoff Phase
```
Developer inspects component in Figma
    ↓
Extract CSS properties (spacing, colors, etc.)
    ↓
Reference existing shadcn-ui component
    ↓
Match visual design to code
```

### 3. Implementation Phase
```
Use existing shadcn-ui component as base
    ↓
Apply custom styles from Figma
    ↓
Test with design tokens
    ↓
Verify in Light & Dark modes
    ↓
Get design review
```

### 4. Sync Phase
```
Code changes → Update Figma
Figma changes → Update Code
Maintain single source of truth
```

---

## 🎨 Figma File Structure

Recommended page organization:

```
📄 Indigo Yield Platform Design System
│
├─ 📄 00 - Cover
│   └─ Title, version, team, last updated
│
├─ 📄 01 - Foundation
│   ├─ Color Palette (Light Mode)
│   ├─ Color Palette (Dark Mode)
│   ├─ Typography Scale
│   ├─ Spacing System
│   ├─ Border Radius
│   └─ Shadows & Effects
│
├─ 📄 02 - Components / Inputs
│   ├─ Button (all variants)
│   ├─ Input
│   ├─ Checkbox
│   ├─ Radio
│   ├─ Select
│   ├─ Textarea
│   ├─ Switch
│   └─ Slider
│
├─ 📄 03 - Components / Display
│   ├─ Card
│   ├─ Badge
│   ├─ Avatar
│   ├─ Alert
│   ├─ Table
│   └─ Charts
│
├─ 📄 04 - Components / Navigation
│   ├─ Sidebar
│   ├─ Tabs
│   ├─ Breadcrumb
│   ├─ Navigation Menu
│   └─ Pagination
│
├─ 📄 05 - Components / Overlays
│   ├─ Dialog
│   ├─ Sheet
│   ├─ Popover
│   ├─ Tooltip
│   └─ Dropdown
│
├─ 📄 06 - Patterns
│   ├─ Forms
│   ├─ Data Tables
│   ├─ Empty States
│   └─ Loading States
│
├─ 📄 07 - Layouts
│   ├─ Dashboard Layout
│   ├─ Settings Layout
│   ├─ Detail View
│   └─ List View
│
└─ 📄 08 - Templates
    ├─ Dashboard Page
    ├─ Portfolio View
    ├─ Transactions
    └─ Profile
```

---

## 🔧 Tools & Plugins

### Essential Figma Plugins
1. **Figma Tokens** - Design token management
2. **Stark** - Accessibility & contrast checking
3. **Color Blind** - Simulate color blindness
4. **Anima** - Export to React code
5. **Autoflow** - Create flow diagrams
6. **Content Reel** - Populate with realistic data

### Design Token Export
- Export tokens as JSON
- Use Style Dictionary for transformation
- Import into Tailwind config
- Keep tokens synced

### Code Export
- Use Figma Inspect panel
- Copy CSS values directly
- Match to Tailwind classes
- Verify with developer tools

---

## ✅ Quality Checklist

### Before Publishing Components

#### Accessibility
- [ ] All text meets WCAG AA contrast (4.5:1)
- [ ] Focus states are visible (2px ring)
- [ ] Interactive elements ≥ 44×44px
- [ ] Color is not the only indicator
- [ ] Screen reader considerations

#### Responsiveness
- [ ] Works at 375px (mobile)
- [ ] Works at 768px (tablet)
- [ ] Works at 1440px (desktop)
- [ ] Works at 1920px (large)
- [ ] Text doesn't overflow

#### Consistency
- [ ] Uses design tokens (not hard-coded)
- [ ] Follows 8pt grid
- [ ] Matches existing components
- [ ] Same naming conventions
- [ ] Proper auto-layout setup

#### Dark Mode
- [ ] Tested in dark mode
- [ ] All colors use variables
- [ ] Proper contrast maintained
- [ ] Shadows are visible

#### States
- [ ] Default state defined
- [ ] Hover state (if interactive)
- [ ] Focus state (if interactive)
- [ ] Disabled state (if applicable)
- [ ] Error state (if form field)

---

## 🎓 Learning Resources

### Figma Official
- **Figma Learn**: https://help.figma.com/
- **Best Practices**: https://www.figma.com/best-practices/
- **YouTube Channel**: Figma official tutorials

### Design Systems
- **Design Systems Handbook**: https://www.designsystems.com/
- **Brad Frost's Atomic Design**: https://atomicdesign.bradfrost.com/
- **Style Guide Guide**: http://styleguides.io/

### shadcn-ui & Tailwind
- **shadcn-ui Docs**: https://ui.shadcn.com/
- **Tailwind CSS**: https://tailwindcss.com/docs
- **Radix UI**: https://www.radix-ui.com/

### Accessibility
- **WCAG Guidelines**: https://www.w3.org/WAI/WCAG21/quickref/
- **WebAIM**: https://webaim.org/
- **A11y Project**: https://www.a11yproject.com/

---

## 📊 Project Metrics

### Design System Scope
- **Components**: 59 total
- **Color Tokens**: 26 (13 pairs for light/dark)
- **Text Styles**: 12
- **Spacing Values**: 24
- **Documentation Pages**: 3

### Estimated Timeline
- **Phase 1** (MVP): 1 week (12 components)
- **Phase 2** (Full): 2 weeks (24 components)
- **Phase 3** (Complete): 4 weeks (59 components)
- **Polish & Documentation**: 1 week

### Team Requirements
- **1 Designer** (full-time): 4-6 weeks
- **2 Designers** (full-time): 2-3 weeks
- **Design + Dev pair**: Ideal for faster iteration

---

## 🤝 Collaboration Guidelines

### For Designers Working in Team

#### File Organization
- Use **branches** for work-in-progress
- Merge to **main** when reviewed
- Create **projects** for different workstreams
- Use **team libraries** for published components

#### Naming Conventions
```
Components:     Button, Card, InputField
Variants:       default, primary, destructive
Frames:         Dashboard - Desktop 1440px
Sections:       // Header, // Navigation
```

#### Version Control
- **Document changes** in version history
- **Tag releases** (v1.0.0, v1.1.0)
- **Notify team** of breaking changes
- **Keep changelog** updated

---

## 🐛 Common Issues & Solutions

### Issue: Colors don't match code
**Solution**: Ensure using HSL format, check variables are applied

### Issue: Text looks different
**Solution**: Verify font weights, line-height, letter-spacing

### Issue: Spacing inconsistent
**Solution**: Always use 8pt grid, apply auto-layout

### Issue: Components too rigid
**Solution**: Use proper auto-layout constraints (hug/fill)

### Issue: Dark mode broken
**Solution**: Use variables instead of direct colors

---

## 📞 Support & Questions

### Internal
- **Design Lead**: Review component designs
- **Dev Lead**: Sync design with code
- **Product**: Validate user flows

### External Resources
- **Figma Community**: https://forum.figma.com/
- **shadcn Discord**: Community support
- **Stack Overflow**: Technical questions

---

## 🎯 Success Criteria

A successful Figma design system should:

1. ✅ **Match the code** - 100% visual parity
2. ✅ **Be maintainable** - Easy to update and scale
3. ✅ **Support both modes** - Light & Dark work perfectly
4. ✅ **Be accessible** - WCAG AA compliant
5. ✅ **Be documented** - Every component has usage notes
6. ✅ **Be responsive** - Works on all screen sizes
7. ✅ **Be efficient** - Designers can work quickly
8. ✅ **Be consistent** - Every element follows system

---

## 📝 Changelog

### Version 1.0.0 (October 10, 2025)
- Initial design system documentation
- Complete component specifications
- Color system with light/dark modes
- Typography scale defined
- Quick start guide created
- Component reference completed

---

## 🚀 Next Steps

1. **Immediate** (Today)
   - [ ] Review all documentation
   - [ ] Set up Figma file structure
   - [ ] Import Montserrat font
   - [ ] Create color variables

2. **Week 1**
   - [ ] Build Phase 1 components (12 essentials)
   - [ ] Test in both color modes
   - [ ] Get developer review
   - [ ] Publish first version

3. **Week 2-3**
   - [ ] Build Phase 2 & 3 components
   - [ ] Create page templates
   - [ ] Document patterns
   - [ ] Conduct accessibility audit

4. **Week 4**
   - [ ] Polish and refinement
   - [ ] Complete documentation
   - [ ] Team training
   - [ ] Launch design system v1.0

---

## 📚 File Reference Quick Links

| Document | Purpose | Best For |
|----------|---------|----------|
| **FIGMA_DESIGN_SYSTEM_SPEC.md** | Complete specifications | Technical reference, design tokens |
| **FIGMA_QUICKSTART_GUIDE.md** | 30-minute setup | New designers, fast start |
| **FIGMA_COMPONENT_REFERENCE.md** | All 59 components | Building individual components |
| **FIGMA_README.md** | Overview & workflow | Understanding the system |

---

**Maintained by**: Indigo Yield Platform Design Team
**Version**: 1.0.0
**Last Updated**: October 10, 2025
**License**: Internal Use Only

---

## 🎉 Ready to Start?

Begin with the **FIGMA_QUICKSTART_GUIDE.md** to get your Figma file set up in 30 minutes!

For complete specifications, refer to **FIGMA_DESIGN_SYSTEM_SPEC.md**.

For individual component details, use **FIGMA_COMPONENT_REFERENCE.md**.

**Happy designing!** 🎨✨
