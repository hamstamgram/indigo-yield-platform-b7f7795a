# Figma Component Reference - Complete Component Library

## 📋 Component Checklist

This document provides a complete reference for all 59 shadcn-ui components that need to be designed in Figma.

---

## ✅ Component Status Legend

- 🟢 **Priority 1**: Essential for MVP (Must have)
- 🟡 **Priority 2**: Important for full experience (Should have)
- 🔵 **Priority 3**: Nice to have (Could have)

---

## 1. Form Components (14 components)

### 🟢 Button
**File**: `button.tsx`
**Variants**: default, destructive, outline, secondary, ghost, link
**Sizes**: sm, default, lg, icon
**States**: default, hover, focus, disabled

```
Props:
- variant: ButtonVariant
- size: ButtonSize
- asChild: boolean
- disabled: boolean
```

**Figma Layers**:
```
Button Component
├─ Background (Rectangle with auto-layout)
├─ Icon (Optional, 16×16px)
└─ Text (Button text style)
```

---

### 🟢 Input
**File**: `input.tsx`
**Types**: text, email, password, number, tel, url
**States**: default, focus, error, disabled

```
Props:
- type: string
- placeholder: string
- disabled: boolean
- error: boolean
```

**Figma Layers**:
```
Input Component
├─ Container (Auto-layout, 40px height)
│   ├─ Leading Icon (Optional)
│   ├─ Input Text
│   └─ Trailing Icon (Optional)
└─ Label (Optional, above input)
```

---

### 🟢 Checkbox
**File**: `checkbox.tsx`
**States**: unchecked, checked, indeterminate, disabled

```
Dimensions: 16×16px
Border: 1px input
Checked: primary background, white checkmark
```

**Figma Layers**:
```
Checkbox Component
├─ Box (16×16px square, 4px border-radius)
├─ Checkmark Icon (when checked)
└─ Label Text (optional, 8px gap)
```

---

### 🟢 Radio Group
**File**: `radio-group.tsx`
**States**: unchecked, checked, disabled

```
Dimensions: 16×16px circle
Selected: primary border (2px), inner dot (8×8px)
```

**Figma Layers**:
```
Radio Component
├─ Outer Circle (16×16px)
├─ Inner Circle (8×8px, when selected)
└─ Label Text (optional, 8px gap)
```

---

### 🟢 Select
**File**: `select.tsx`
**States**: closed, open, disabled
**Trigger height**: 40px

```
Components:
- SelectTrigger (button-like)
- SelectContent (dropdown panel)
- SelectItem (option in list)
- SelectSeparator
- SelectGroup (with label)
```

**Figma Layers**:
```
Select Component
├─ Trigger
│   ├─ Selected Value Text
│   └─ Chevron Icon
└─ Content (Dropdown)
    ├─ SelectItem 1
    ├─ SelectItem 2
    └─ ...
```

---

### 🟢 Textarea
**File**: `textarea.tsx`
**Min height**: 80px
**Resizable**: Yes (vertical)

```
Props:
- placeholder: string
- rows: number
- disabled: boolean
- error: boolean
```

---

### 🟢 Form
**File**: `form.tsx`
**Components**: Form, FormField, FormItem, FormLabel, FormControl, FormDescription, FormMessage

```
Structure:
Form
└─ FormField
    └─ FormItem
        ├─ FormLabel
        ├─ FormControl (wraps input)
        ├─ FormDescription (helper text)
        └─ FormMessage (error text)
```

**Spacing**:
- Label to input: 8px
- Input to helper text: 4px
- Between form fields: 16px

---

### 🟢 Label
**File**: `label.tsx`
**Font**: 14px, medium weight
**Color**: foreground

```
Usage: Paired with all form inputs
Margin bottom: 8px
```

---

### 🟡 Switch
**File**: `switch.tsx`
**Dimensions**: 44×24px
**Thumb**: 20×20px circle

```
States:
- Off: muted background
- On: primary background
- Disabled: opacity 50%
```

**Figma Layers**:
```
Switch Component
├─ Track (44×24px rounded-full)
└─ Thumb (20×20px circle)
    - Position: Left (off), Right (on)
```

---

### 🟡 Slider
**File**: `slider.tsx`
**Track height**: 8px
**Thumb**: 20×20px circle

```
Components:
- Track (full width)
- Range (filled portion)
- Thumb (draggable)
```

---

### 🟡 Calendar
**File**: `calendar.tsx`
**Grid**: 7×6 (weeks)
**Cell size**: 40×40px

```
Components:
- Header (month/year navigation)
- Day cells (current, selected, outside)
- Navigation buttons
```

---

### 🟡 Date Range Picker
**File**: `date-range-picker.tsx`
**Combines**: Input + Popover + Calendar

```
Features:
- Start date selection
- End date selection
- Range highlight
```

---

### 🟡 Input OTP
**File**: `input-otp.tsx`
**Cells**: 4-6 individual boxes
**Cell size**: 40×40px

```
Layout: Horizontal auto-layout with gaps
Focused cell: ring effect
```

---

### 🔵 Toggle
**File**: `toggle.tsx`
**Similar to**: Button
**States**: on/off

```
Off: ghost variant style
On: accent background
```

---

## 2. Navigation Components (9 components)

### 🟢 Sidebar
**File**: `sidebar.tsx`
**Width**: 256px (expanded), 64px (collapsed)
**Background**: sidebar-background

```
Components:
- SidebarProvider
- Sidebar
- SidebarHeader
- SidebarContent
- SidebarGroup
- SidebarGroupLabel
- SidebarGroupContent
- SidebarMenu
- SidebarMenuItem
- SidebarMenuButton
- SidebarFooter
- SidebarTrigger
```

**Item Height**: 40px
**Padding**: 12px horizontal

---

### 🟢 Tabs
**File**: `tabs.tsx`
**Tab height**: 40px

```
Components:
- TabsList (container)
- TabsTrigger (individual tab)
- TabsContent (panel)
```

**Figma Layers**:
```
Tabs Component
├─ TabsList (horizontal auto-layout)
│   ├─ TabsTrigger 1 (default/active)
│   ├─ TabsTrigger 2
│   └─ ...
└─ TabsContent (panel below)
```

---

### 🟢 Breadcrumb
**File**: `breadcrumb.tsx`
**Height**: 32px
**Separator**: / or chevron

```
Components:
- BreadcrumbList
- BreadcrumbItem
- BreadcrumbLink
- BreadcrumbPage (current)
- BreadcrumbSeparator
```

---

### 🟢 Navigation Menu
**File**: `navigation-menu.tsx`
**Height**: 44px
**Trigger padding**: 12px 16px

```
Components:
- NavigationMenu
- NavigationMenuList
- NavigationMenuItem
- NavigationMenuTrigger
- NavigationMenuContent
- NavigationMenuLink
```

---

### 🟡 Pagination
**File**: `pagination.tsx`
**Button size**: 36×36px

```
Components:
- PaginationContent
- PaginationItem
- PaginationLink
- PaginationPrevious
- PaginationNext
- PaginationEllipsis
```

---

### 🟡 Menubar
**File**: `menubar.tsx`
**Height**: 40px
**Similar to**: Navigation menu but horizontal

```
Components:
- Menubar
- MenubarMenu
- MenubarTrigger
- MenubarContent
- MenubarItem
- MenubarSeparator
- MenubarCheckboxItem
- MenubarRadioGroup
```

---

### 🔵 Command
**File**: `command.tsx`
**Palette style**: Full screen overlay
**Search height**: 48px

```
Components:
- Command (container)
- CommandInput (search)
- CommandList (results)
- CommandEmpty (no results)
- CommandGroup (category)
- CommandItem (result)
- CommandSeparator
- CommandShortcut (kbd)
```

---

### 🔵 Context Menu
**File**: `context-menu.tsx`
**Right-click menu**

```
Components:
- ContextMenu
- ContextMenuTrigger
- ContextMenuContent
- ContextMenuItem
- ContextMenuCheckboxItem
- ContextMenuRadioItem
- ContextMenuLabel
- ContextMenuSeparator
- ContextMenuShortcut
- ContextMenuSub
```

---

### 🔵 Dropdown Menu
**File**: `dropdown-menu.tsx`
**Similar to**: Context menu but triggered by button

```
Same structure as Context Menu
Triggered by: Button click
```

---

## 3. Display Components (14 components)

### 🟢 Card
**File**: `card.tsx`
**Border radius**: 8px
**Padding**: 24px

```
Components:
- Card (container)
- CardHeader
- CardTitle (text-2xl, semibold)
- CardDescription (text-sm, muted)
- CardContent
- CardFooter
```

Already covered in Quick Start Guide.

---

### 🟢 Badge
**File**: `badge.tsx`
**Height**: Auto (inline)
**Padding**: 2px 10px

```
Variants:
- default (primary)
- secondary
- destructive
- outline

Border radius: full (pill shape)
```

---

### 🟢 Avatar
**File**: `avatar.tsx`
**Sizes**: 32px, 40px, 48px, 64px

```
Components:
- Avatar (container, circular)
- AvatarImage (img element)
- AvatarFallback (initials)
```

**Figma Layers**:
```
Avatar Component
├─ Circle (mask)
├─ Image (inside mask)
└─ Fallback Text (if no image)
```

---

### 🟢 Alert
**File**: `alert.tsx`
**Min height**: 56px
**Padding**: 16px

```
Variants:
- default (border-border)
- destructive (border-destructive)

Components:
- Alert (container)
- AlertTitle
- AlertDescription
```

**Figma Structure**:
```
Alert Component
├─ Container (auto-layout horizontal)
│   ├─ Icon (20×20px)
│   └─ Content (vertical auto-layout)
│       ├─ AlertTitle
│       └─ AlertDescription
```

---

### 🟢 Toast / Sonner
**Files**: `toast.tsx`, `sonner.tsx`, `toaster.tsx`
**Position**: Bottom-right, top-right, etc.
**Duration**: 3-5 seconds

```
Components:
- Toast (container)
- ToastTitle
- ToastDescription
- ToastAction (button)
- ToastClose
```

**Variants**: success, error, warning, info

---

### 🟢 Skeleton
**File**: `skeleton.tsx`
**Animation**: Shimmer (pulse)

```
Usage: Loading placeholder
Base: muted/50 background
Animation: 2s pulse
```

**Common Patterns**:
- Text line: h-4 w-full
- Avatar: h-12 w-12 rounded-full
- Button: h-10 w-20

---

### 🟡 Table
**File**: `table.tsx`
**Header height**: 48px
**Row height**: 52px

```
Components:
- Table
- TableHeader
- TableBody
- TableFooter
- TableRow
- TableHead (th)
- TableCell (td)
- TableCaption
```

**Styling**:
- Border: 1px border
- Header bg: muted
- Row hover: muted/50

---

### 🟡 Responsive Table
**File**: `responsive-table.tsx`
**Breakpoints**: Stacks vertically on mobile

```
Features:
- Horizontal scroll (desktop)
- Card-like display (mobile)
```

---

### 🟡 Chart
**File**: `chart.tsx`
**Library**: Recharts
**Container**: Responsive

```
Types:
- Line Chart
- Bar Chart
- Area Chart
- Pie Chart
- Radial Chart

Colors: Use theme colors
```

---

### 🟡 Progress
**File**: `progress.tsx`
**Height**: 8px
**Border radius**: full

```
Components:
- Track (full width, muted bg)
- Indicator (filled portion, primary bg)
```

---

### 🔵 Accordion
**File**: `accordion.tsx`
**Item padding**: 16px
**Animation**: 0.2s ease-out

```
Components:
- Accordion (container)
- AccordionItem
- AccordionTrigger (with chevron)
- AccordionContent (collapsible)
```

---

### 🔵 Collapsible
**File**: `collapsible.tsx`
**Similar to**: Accordion but standalone

```
Components:
- Collapsible
- CollapsibleTrigger
- CollapsibleContent
```

---

### 🔵 Carousel
**File**: `carousel.tsx`
**Library**: Embla Carousel

```
Components:
- Carousel
- CarouselContent
- CarouselItem
- CarouselPrevious
- CarouselNext

Controls: Arrows + Dots
```

---

### 🔵 Aspect Ratio
**File**: `aspect-ratio.tsx`
**Common ratios**: 16/9, 4/3, 1/1

```
Usage: Image containers
Maintains ratio responsively
```

---

## 4. Overlay Components (7 components)

### 🟢 Dialog
**File**: `dialog.tsx`
**Max width**: 512px (lg)
**Overlay**: black/80

```
Components:
- Dialog (provider)
- DialogTrigger
- DialogContent
- DialogHeader
- DialogTitle
- DialogDescription
- DialogFooter
- DialogClose
```

**Figma Layers**:
```
Dialog Component
├─ Overlay (full screen, 80% black)
└─ Content (centered card)
    ├─ Close Button (top-right)
    ├─ DialogHeader
    │   ├─ DialogTitle
    │   └─ DialogDescription
    ├─ Content Area
    └─ DialogFooter
        ├─ Cancel Button
        └─ Confirm Button
```

---

### 🟢 Sheet
**File**: `sheet.tsx`
**Slide-in panel**
**Sides**: top, right, bottom, left

```
Similar to Dialog but:
- Slides from edge
- Can be full height
- Common for mobile menus
```

---

### 🟢 Popover
**File**: `popover.tsx`
**Trigger aligned**: Yes
**Arrow**: Optional

```
Components:
- Popover
- PopoverTrigger
- PopoverContent
- PopoverAnchor
```

---

### 🟡 Tooltip
**File**: `tooltip.tsx`
**Padding**: 8px 12px
**Delay**: 700ms

```
Components:
- TooltipProvider
- Tooltip
- TooltipTrigger
- TooltipContent

Background: popover
Max width: 300px
```

---

### 🟡 Hover Card
**File**: `hover-card.tsx`
**Similar to**: Tooltip but richer content

```
Usage: User profile previews
Delay: 700ms
Can contain images, text, buttons
```

---

### 🟡 Alert Dialog
**File**: `alert-dialog.tsx`
**Purpose**: Confirmations, destructive actions

```
Similar to Dialog but:
- More prominent
- Requires action
- Cannot dismiss with overlay click
```

---

### 🔵 Drawer
**File**: `drawer.tsx`
**Mobile-first**: Bottom sheet on mobile

```
Uses: Vaul library
Position: Bottom (mobile), Side (desktop)
```

---

## 5. Utility Components (8 components)

### 🟢 Separator
**File**: `separator.tsx`
**Horizontal**: 1px height, full width
**Vertical**: Full height, 1px width

```
Color: border
Orientation: horizontal | vertical
```

---

### 🟢 Scroll Area
**File**: `scroll-area.tsx`
**Scrollbar**: Custom styled

```
Features:
- Hidden native scrollbar
- Styled custom scrollbar (4px width)
- Smooth scrolling
```

---

### 🟡 Resizable
**File**: `resizable.tsx`
**Handle**: 4px wide

```
Components:
- ResizablePanelGroup
- ResizablePanel
- ResizableHandle

Usage: Split panes
```

---

### 🟡 Toggle Group
**File**: `toggle-group.tsx`
**Similar to**: Button group

```
Types:
- Single (radio behavior)
- Multiple (checkbox behavior)
```

---

### 🔵 Empty State
**File**: `empty-state.tsx`
**Custom component**

```
Structure:
- Icon (large, muted)
- Title (h3)
- Description (muted-foreground)
- Action button (optional)
```

---

### 🔵 Loading Spinner
**File**: `loading-spinner.tsx`
**Sizes**: sm (16px), md (24px), lg (32px)

```
Animation: Spin (1s linear infinite)
Variants: primary, muted
```

---

### 🔵 Loading States
**File**: `loading-states.tsx`
**Combines**: Spinner + Skeleton

---

### 🔵 Loading Skeletons
**File**: `loading-skeletons.tsx`
**Patterns**: List, card, table, form

---

## 6. Custom/App-Specific Components (7 components)

### 🟢 Optimized Image
**File**: `optimized-image.tsx`
**Features**: Lazy loading, blur placeholder

```
States:
- Loading (skeleton + shimmer)
- Loaded (fade-in animation)
- Error (fallback icon)
```

---

### 🟡 Role Gate
**File**: `RoleGate.tsx`
**Purpose**: Conditional rendering

```
Not a visual component
Used for permissions
```

---

### 🟡 Route Loading Fallback
**File**: `RouteLoadingFallback.tsx`
**Full screen loader**

```
Structure:
- Centered container
- Large spinner
- "Loading..." text
```

---

## Component Priority Matrix

### Phase 1 - Essential (Build First)
```
1.  Button ✓
2.  Card ✓
3.  Input
4.  Label
5.  Form
6.  Badge
7.  Avatar
8.  Alert
9.  Dialog
10. Sidebar
11. Tabs
12. Breadcrumb
```

### Phase 2 - Important
```
13. Select
14. Checkbox
15. Radio Group
16. Textarea
17. Table
18. Navigation Menu
19. Sheet
20. Popover
21. Toast
22. Skeleton
23. Separator
24. Scroll Area
```

### Phase 3 - Complete
```
25-59. All remaining components
```

---

## Design Token Summary

### Colors (17 semantic tokens)
- Primary, Secondary, Accent
- Background, Foreground, Card, Popover
- Muted, Destructive
- Border, Input, Ring
- Sidebar (8 tokens)

### Typography (12 styles)
- 4 Headings (H1-H4)
- 3 Body (Large, Medium, Small)
- 2 UI (Button, Label)

### Spacing (24 values)
- 0.5 to 24 (0.125rem to 6rem)

### Shadows (6 levels)
- sm, default, md, lg, xl, 2xl

### Border Radius (4 sizes)
- sm (4px), md (6px), lg (8px), full

---

## Figma Best Practices

### Component Organization
```
📁 Components/
├── 📁 Inputs/
│   ├── Button
│   ├── Input
│   ├── Checkbox
│   └── ...
├── 📁 Display/
│   ├── Card
│   ├── Badge
│   └── ...
├── 📁 Navigation/
│   ├── Sidebar
│   ├── Tabs
│   └── ...
└── 📁 Overlays/
    ├── Dialog
    ├── Sheet
    └── ...
```

### Naming Convention
- Components: **PascalCase** (Button, CardTitle)
- Variants: **lowercase-hyphen** (default, primary-foreground)
- Frames: **Descriptive** (Dashboard - Desktop)

### Version Control
- Use **branches** for major changes
- **Publish** stable versions
- **Document** changes in description

---

**Total Components**: 59
**Essential**: 12
**Important**: 12
**Complete**: 35

This reference should guide you through creating every component systematically!
