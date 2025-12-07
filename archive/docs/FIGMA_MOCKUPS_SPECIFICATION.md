# Figma Mockups & Visual Specifications
## Detailed Screen Designs for Indigo Yield Platform

**Project:** Indigo Yield Platform UI/UX Redesign
**Date:** October 10, 2025
**Figma File:** [To be created based on this spec]

---

## Table of Contents

1. [Mobile Mockups (375px - iPhone SE)](#1-mobile-mockups)
2. [Tablet Mockups (768px - iPad)](#2-tablet-mockups)
3. [Desktop Mockups (1440px)](#3-desktop-mockups)
4. [Component State Variations](#4-component-states)
5. [Dark Mode Variations](#5-dark-mode)
6. [Interaction Patterns](#6-interactions)

---

## 1. Mobile Mockups (375px - iPhone SE)

### 1.1 Login Screen - Mobile

```
┌─────────────────────────────────────┐
│         [STATUS BAR - 44px]         │ iOS safe area
├─────────────────────────────────────┤
│                                     │
│              [LOGO]                 │ 48px height
│          Indigo Yield               │ 16px margin-top
│                                     │
│  ┌───────────────────────────────┐ │
│  │                               │ │
│  │  ╔═══════════════════════╗   │ │ Card: 343px wide
│  │  ║  Investor Access      ║   │ │ Border-radius: 8px
│  │  ╚═══════════════════════╝   │ │ Shadow: sm
│  │                               │ │ Padding: 20px
│  │  ┌─────────────────────────┐ │ │
│  │  │ 📧 Email Address       │ │ │ Input: 44px height
│  │  └─────────────────────────┘ │ │ Font: 16px
│  │                               │ │ Gap: 16px
│  │  ┌─────────────────────────┐ │ │
│  │  │ 🔒 Password         👁️  │ │ │ Input: 44px
│  │  └─────────────────────────┘ │ │ Toggle: 36×36px
│  │                               │ │
│  │  ┌─────────────────────────┐ │ │
│  │  │      Sign In            │ │ │ Button: 48px height
│  │  └─────────────────────────┘ │ │ Primary color
│  │                               │ │ Font: 16px medium
│  │       Forgot password?        │ │ Link: 16px
│  │                               │ │ Touch area: 44px
│  └───────────────────────────────┘ │
│                                     │
│   Need access? Request Access       │ Link
│                                     │
│  Investor Portal - Invitation Only  │ Small text
│                                     │
└─────────────────────────────────────┘
     375px width × 667px height
```

**Color Specifications:**
- Background: `hsl(0 0% 100%)` #FFFFFF
- Card Background: `hsl(0 0% 100%)` #FFFFFF
- Card Border: `hsl(214.3 31.8% 85%)` #CBD5E1 (NEW - more visible)
- Primary Button: `hsl(222.2 47.4% 11.2%)` #0F172A
- Text (Primary): `hsl(222.2 84% 4.9%)` #020817
- Text (Muted): `hsl(215.4 16.3% 40%)` #64748B (NEW - better contrast)

**Typography:**
- Logo: Montserrat 16px/500
- Card Title: Montserrat 24px/600
- Input: Montserrat 16px/400
- Button: Montserrat 16px/500
- Link: Montserrat 14px/400

**Spacing:**
- Screen padding: 16px
- Card padding: 20px
- Input vertical gap: 16px
- Logo to card: 32px

---

### 1.2 Dashboard - Mobile (Portrait)

```
┌─────────────────────────────────────┐
│  [STATUS BAR - 44px]  🔔 👤        │
├─────────────────────────────────────┤
│ ☰                      [Search] 🔍  │ Header: 56px
├─────────────────────────────────────┤
│                                     │
│ Welcome back, John!                 │ H1: 24px/700
│ Here's an overview...               │ Body: 14px/400
│                                     │ Margin: 24px
│ ┌─────────────────────────────────┐│
│ │ 🪙 Active Assets                ││ Card
│ │                                 ││ Padding: 16px
│ │      5                          ││ Value: 32px/700
│ │ Different cryptocurrencies      ││ Label: 12px/400
│ └─────────────────────────────────┘│
│                                     │ Gap: 16px
│ ┌─────────────────────────────────┐│
│ │ 📈 Portfolio Status             ││
│ │                                 ││
│ │      Active                     ││
│ │ All positions tracked           ││
│ └─────────────────────────────────┘│
│                                     │
│ ╔═════════════════════════════════╗│ Section header
│ ║ Your Portfolio                  ║│ 18px/600
│ ╚═════════════════════════════════╝│
│                                     │
│ ┌─────────────────────────────────┐│
│ │ 🪙 BTC                          ││ Asset Card
│ │    Bitcoin                   ⟩  ││ 72px height
│ │                                 ││ Padding: 16px
│ │ Balance: 0.00245 BTC            ││ Touch area: 72px
│ └─────────────────────────────────┘│
│                                     │ Gap: 12px
│ ┌─────────────────────────────────┐│
│ │ 🪙 ETH                          ││
│ │    Ethereum                  ⟩  ││
│ │                                 ││
│ │ Balance: 1.5 ETH                ││
│ └─────────────────────────────────┘│
│                                     │
│ [Load More]                         │ Button: 44px
│                                     │
└─────────────────────────────────────┘
│ [📊] [💼] [📄] [⚙️]               │ Bottom nav: 64px
└─────────────────────────────────────┘
     375px width × 667px height
```

**Bottom Navigation Bar:**
```
┌─────────────────────────────────────┐
│  📊      💼      📄      ⚙️         │ Icons: 24×24px
│ Home  Portfolio Docs  Settings      │ Labels: 11px
│  ●                                  │ Active indicator
└─────────────────────────────────────┘
    Height: 64px (44px + safe area)
    Background: Card color
    Border-top: 1px border color
    Safe area bottom: 20px (iPhone notch)
```

**Asset Card - Expanded State Specs:**
```
┌─────────────────────────────────────┐
│ 🪙 BTC                          ⟩  │ Top: Icon + Symbol + Chevron
│    Bitcoin                          │ Name (14px muted)
│ ────────────────────────────────── │ Divider (optional)
│ Balance:        0.00245 BTC         │ Key-value pairs
│ Value:          $102,345.67         │ 14px/400
│ 24h Change:     +5.2% ▲             │ Green/Red based on trend
│                                     │
│ [View Details]                      │ Secondary button (40px)
└─────────────────────────────────────┘
    Padding: 16px
    Gap between rows: 12px
```

---

### 1.3 Empty State - Mobile

```
┌─────────────────────────────────────┐
│                                     │
│                                     │
│          ┌─────────────┐           │
│          │             │           │ Circle: 80px
│          │   🪙 Icon  │           │ Background: Muted
│          │             │           │ Icon: 40px
│          └─────────────┘           │
│                                     │ Margin-top: 80px
│         No assets yet               │ H3: 20px/600
│                                     │
│   Your portfolio is empty.          │ P: 14px/400
│   Start by adding your first        │ Muted foreground
│   cryptocurrency holding to         │ Max-width: 280px
│   begin tracking your investments.  │ Line-height: 1.6
│                                     │
│   ┌───────────────────────────┐   │
│   │  + Add Your First Asset   │   │ Button: 48px
│   └───────────────────────────┘   │ Primary
│                                     │ Icon: 20px
│                                     │
└─────────────────────────────────────┘
     Centered vertically
     Padding: 24px horizontal
```

---

## 2. Tablet Mockups (768px - iPad)

### 2.1 Dashboard - Tablet (Landscape)

```
┌───────────────────────────────────────────────────────────────────┐
│ ☰ Indigo Yield              [Search Bar]           🔔 👤          │ 64px
├───────────────────────────────────────────────────────────────────┤
│                                                                   │
│ Welcome back, John!                                               │ 30px/700
│ Here's an overview of your portfolio                             │
│                                                                   │
│ ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐    │
│ │ 🪙 Active       │ │ 📈 Portfolio    │ │ 💰 Total Value  │    │
│ │                 │ │                 │ │                 │    │
│ │      5          │ │     Active      │ │   $245,678.90   │    │
│ │ Cryptocurrencies│ │ All positions   │ │   +12.5% ▲      │    │
│ └─────────────────┘ └─────────────────┘ └─────────────────┘    │
│                                                                   │
│ ╔═══════════════════════════════════════════════════════════════╗│
│ ║ Your Portfolio                                                ║│
│ ╚═══════════════════════════════════════════════════════════════╝│
│                                                                   │
│ ┌──────────────────────┐ ┌──────────────────────┐              │
│ │ 🪙 BTC              │ │ 🪙 ETH              │              │
│ │    Bitcoin       ⟩  │ │    Ethereum      ⟩  │              │
│ │                     │ │                     │              │
│ │ Balance: 0.00245    │ │ Balance: 1.5 ETH    │              │
│ │ Value: $102,345.67  │ │ Value: $4,567.89    │              │
│ └──────────────────────┘ └──────────────────────┘              │
│                                                                   │
│ ┌──────────────────────┐ ┌──────────────────────┐              │
│ │ 🪙 SOL              │ │ 🪙 ADA              │              │
│ │    Solana        ⟩  │ │    Cardano       ⟩  │              │
│ │                     │ │                     │              │
│ │ Balance: 25.5 SOL   │ │ Balance: 1000 ADA   │              │
│ │ Value: $1,234.56    │ │ Value: $890.12      │              │
│ └──────────────────────┘ └──────────────────────┘              │
│                                                                   │
└───────────────────────────────────────────────────────────────────┘
     768px width × 1024px height
     2 column grid (gap: 24px)
     Card height: Auto with min 120px
```

---

### 2.2 Dialog Modal - Tablet

```
    ┌─────────────────────────────────────────┐
    │ Backdrop: rgba(0,0,0,0.8)              │
    │                                         │
    │   ┌───────────────────────────────┐    │
    │   │ Add New Asset              ✕  │    │ Header: 52px
    │   ├───────────────────────────────┤    │
    │   │                               │    │
    │   │ Select the cryptocurrency     │    │ Body: 16px
    │   │ you want to add to your       │    │ Padding: 24px
    │   │ portfolio.                    │    │
    │   │                               │    │
    │   │ ┌───────────────────────────┐│    │
    │   │ │ 🔍 Search assets...       ││    │ Input: 44px
    │   │ └───────────────────────────┘│    │
    │   │                               │    │
    │   │ ┌─────────────────────────┐  │    │
    │   │ │ ○ BTC - Bitcoin         │  │    │ Radio: 48px
    │   │ └─────────────────────────┘  │    │ Gap: 8px
    │   │ ┌─────────────────────────┐  │    │
    │   │ │ ○ ETH - Ethereum        │  │    │
    │   │ └─────────────────────────┘  │    │
    │   │ ┌─────────────────────────┐  │    │
    │   │ │ ○ SOL - Solana          │  │    │
    │   │ └─────────────────────────┘  │    │
    │   │                               │    │
    │   ├───────────────────────────────┤    │
    │   │              [Cancel] [Add]   │    │ Footer: 68px
    │   └───────────────────────────────┘    │ Buttons: 40px
    │                                         │
    └─────────────────────────────────────────┘
        Dialog: 512px width on tablet
        Border-radius: 12px
        Max-height: 80vh
        Overflow: Scroll if needed
```

---

## 3. Desktop Mockups (1440px)

### 3.1 Dashboard - Desktop with Sidebar

```
┌──────┬────────────────────────────────────────────────────────────┐
│      │ Indigo Yield Dashboard       [Search]      🔔 👤          │ 64px
│ Logo ├────────────────────────────────────────────────────────────┤
│      │                                                            │
├──────┤ Welcome back, John Smith!                                 │ 36px/700
│      │ Here's an overview of your portfolio                      │ 16px/400
│ 🏠   │                                                            │
│ Home │ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐     │
│      │ │🪙 Active │ │📈 Status │ │💰 Value  │ │📊 Return │     │
│ 💼   │ │          │ │          │ │          │ │          │     │
│Portfo│ │    5     │ │  Active  │ │$245,678  │ │  +8.2%   │     │
│      │ │   Assets │ │Positions │ │Total     │ │Monthly   │     │
│ 📄   │ └──────────┘ └──────────┘ └──────────┘ └──────────┘     │
│ Docs │                                                            │
│      │ ╔════════════════════════════════════════════════════════╗│
│ ⚙️   │ ║ Your Portfolio                          [Filter] [▼]  ║│
│Settin│ ╚════════════════════════════════════════════════════════╝│
│      │                                                            │
│ ───  │ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐     │
│      │ │🪙 BTC   │ │🪙 ETH   │ │🪙 SOL   │ │🪙 ADA   │     │
│      │ │Bitcoin ⟩│ │Ethereum⟩│ │Solana  ⟩│ │Cardano ⟩│     │
│ 🔍   │ │         │ │         │ │         │ │         │     │
│Admin │ │0.00245  │ │1.5 ETH  │ │25.5 SOL │ │1000 ADA │     │
│      │ │$102,345 │ │$4,567   │ │$1,234   │ │$890     │     │
│ 🚪   │ └──────────┘ └──────────┘ └──────────┘ └──────────┘     │
│Logout│                                                            │
│      │ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐     │
│      │ │🪙 MATIC │ │🪙 DOT   │ │+ Add     │ │          │     │
│ 256px│ │Polygon ⟩│ │Polkadot⟩│ │New Asset │ │          │     │
│      │ │         │ │         │ │          │ │          │     │
│      │ │100 MATIC│ │50 DOT   │ │          │ │          │     │
│      │ │$678     │ │$456     │ │          │ │          │     │
│      │ └──────────┘ └──────────┘ └──────────┘ └──────────┘     │
│      │                                                            │
└──────┴────────────────────────────────────────────────────────────┘
  Sidebar: 256px (collapsible to 64px icon-only)
  Main content: 1184px (1440 - 256)
  Grid: 4 columns × gap 32px
  Card: 272px wide × 160px height
  Hover: Shadow-md + border-primary/20
```

**Sidebar Specifications:**
```
┌────────────────────┐
│ [Logo] Indigo Yield│ Header: 64px
├────────────────────┤
│                    │
│ ◉ Dashboard        │ Active (bg-sidebar-accent)
│                    │ Height: 40px
│ ○ Portfolio        │ Padding: 12px
│                    │ Gap: 4px
│ ○ Transactions     │ Font: 14px/500
│                    │ Border-left: 4px primary (active)
│ ○ Documents        │
│                    │
│ ○ Statements       │
│                    │
│ ───────────        │ Separator
│                    │
│ ○ Settings         │
│                    │
│ ○ Support          │
│                    │
├────────────────────┤
│ 👤 John Smith      │ Footer: 64px
│    john@email.com  │ Padding: 12px
│ ⚙️  🚪             │ Icons: 20px
└────────────────────┘
```

---

## 4. Component State Variations

### 4.1 Button States

**Default Button (Primary):**
```
┌─────────────────────┐
│      Sign In        │ Default
└─────────────────────┘
Background: #0F172A
Text: #F8FAFC
Height: 44px (mobile), 40px (desktop)

┌─────────────────────┐
│      Sign In        │ Hover
└─────────────────────┘
Background: #0F172A opacity 90%
Shadow: sm

┌─────────────────────┐
│      Sign In        │ Focus
└─────────────────────┘
Ring: 2px #020817
Ring-offset: 2px

┌─────────────────────┐
│   ⟳  Processing...  │ Loading
└─────────────────────┘
Spinner: 16px white
Text: same

┌─────────────────────┐
│      Sign In        │ Disabled
└─────────────────────┘
Opacity: 50%
Cursor: not-allowed
```

---

### 4.2 Input States

**Default Input:**
```
┌─────────────────────────────┐
│ email@example.com           │ Default
└─────────────────────────────┘
Border: 1px #CBD5E1
Height: 44px (mobile), 40px (desktop)

┌─────────────────────────────┐
│ email@example.com           │ Focus
└─────────────────────────────┘
Border: 1px #CBD5E1
Ring: 2px #020817
Ring-offset: 2px

┌─────────────────────────────┐
│ invalid@email               │ Error
└─────────────────────────────┘
Border: 1px #EF4444
Ring: 2px #EF4444 (on focus)
⚠️ Please enter a valid email

┌─────────────────────────────┐
│ john@example.com           ✓│ Success
└─────────────────────────────┘
Border: 1px #10B981
Ring: 2px #10B981 (on focus)

┌─────────────────────────────┐
│ Email address               │ Disabled
└─────────────────────────────┘
Opacity: 50%
Cursor: not-allowed
Background: #F1F5F9
```

---

### 4.3 Card States

**Default Card:**
```
┌─────────────────────────────┐
│ 🪙 BTC                     │
│    Bitcoin                  │
│                             │
│ Balance: 0.00245 BTC        │
└─────────────────────────────┘
Border: 1px #CBD5E1
Shadow: sm
Background: #FFFFFF

**Hover (Desktop):**
┌─────────────────────────────┐
│ 🪙 BTC                     │
│    Bitcoin                  │
│                             │
│ Balance: 0.00245 BTC        │
└─────────────────────────────┘
Border: 1px #3B82F6 (20% opacity)
Shadow: md
Background: #F1F5F9 (50% opacity)
Transition: 200ms

**Active/Pressed (Mobile):**
┌─────────────────────────────┐
│ 🪙 BTC                     │
│    Bitcoin                  │
│                             │
│ Balance: 0.00245 BTC        │
└─────────────────────────────┘
Scale: 0.98
Background: #F1F5F9
Shadow: sm (reduced)
Transition: 75ms

**Focus (Keyboard):**
┌─────────────────────────────┐
│ 🪙 BTC                     │
│    Bitcoin                  │
│                             │
│ Balance: 0.00245 BTC        │
└─────────────────────────────┘
Ring: 2px #020817
Ring-offset: 2px
```

---

## 5. Dark Mode Variations

### 5.1 Login Screen - Dark Mode

```
┌─────────────────────────────────────┐
│         [STATUS BAR - 44px]         │ iOS safe area
├─────────────────────────────────────┤
│                                     │ Background: #020817
│              [LOGO]                 │
│          Indigo Yield               │
│                                     │
│  ┌───────────────────────────────┐ │
│  │                               │ │ Card: #020817
│  │  ╔═══════════════════════╗   │ │ Border: #1E293B
│  │  ║  Investor Access      ║   │ │ Text: #F8FAFC
│  │  ╚═══════════════════════╝   │ │
│  │                               │ │
│  │  ┌─────────────────────────┐ │ │ Input bg: #1E293B
│  │  │ 📧 Email Address       │ │ │ Input border: #1E293B
│  │  └─────────────────────────┘ │ │ Input text: #F8FAFC
│  │                               │ │ Placeholder: #94A3B8
│  │  ┌─────────────────────────┐ │ │
│  │  │ 🔒 Password         👁️  │ │ │
│  │  └─────────────────────────┘ │ │
│  │                               │ │
│  │  ┌─────────────────────────┐ │ │ Button bg: #F8FAFC
│  │  │      Sign In            │ │ │ Button text: #0F172A
│  │  └─────────────────────────┘ │ │ (Inverted in dark mode)
│  │                               │ │
│  │       Forgot password?        │ │ Link: #93C5FD (light blue)
│  └───────────────────────────────┘ │
│                                     │
└─────────────────────────────────────┘
```

**Dark Mode Color Palette:**
```css
:root.dark {
  --background: #020817;        /* Very dark blue */
  --foreground: #F8FAFC;         /* Near white */
  --card: #020817;               /* Same as bg */
  --border: #1E293B;             /* Lighter than bg */
  --input: #1E293B;              /* Lighter for inputs */
  --muted: #1E293B;              /* Same as border */
  --muted-foreground: #94A3B8;   /* Light gray-blue */
  --primary: #F8FAFC;            /* Inverted */
  --primary-foreground: #0F172A; /* Inverted */
  --destructive: #EF4444;        /* Lighter red */
}
```

---

### 5.2 Dashboard - Dark Mode

```
┌───────────────────────────────────────────────────────────────────┐
│ ☰ Indigo Yield              [Search Bar]           🔔 👤          │
├───────────────────────────────────────────────────────────────────┤
│                                                                   │ #020817
│ Welcome back, John!                                               │ #F8FAFC
│ Here's an overview of your portfolio                             │ #94A3B8
│                                                                   │
│ ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐    │
│ │ 🪙 Active       │ │ 📈 Portfolio    │ │ 💰 Total Value  │    │ Card: #020817
│ │                 │ │                 │ │                 │    │ Border: #1E293B
│ │      5          │ │     Active      │ │   $245,678.90   │    │ Text: #F8FAFC
│ │ Cryptocurrencies│ │ All positions   │ │   +12.5% ▲      │    │ Muted: #94A3B8
│ └─────────────────┘ └─────────────────┘ └─────────────────┘    │
│                                                                   │
│ ╔═══════════════════════════════════════════════════════════════╗│
│ ║ Your Portfolio                                                ║│
│ ╚═══════════════════════════════════════════════════════════════╝│
│                                                                   │
│ ┌──────────────────────┐ ┌──────────────────────┐              │ Hover: #1E293B
│ │ 🪙 BTC              │ │ 🪙 ETH              │              │ Shadow: none
│ │    Bitcoin       ⟩  │ │    Ethereum      ⟩  │              │ Border: #3B82F6/20
│ │                     │ │                     │              │
│ │ Balance: 0.00245    │ │ Balance: 1.5 ETH    │              │
│ │ Value: $102,345.67  │ │ Value: $4,567.89    │              │
│ └──────────────────────┘ └──────────────────────┘              │
│                                                                   │
└───────────────────────────────────────────────────────────────────┘
```

---

## 6. Interaction Patterns

### 6.1 Touch Feedback (Mobile)

**Asset Card Tap:**
```
Frame 1 (0ms):
┌─────────────────────┐
│ 🪙 BTC             │ Normal state
│    Bitcoin          │
└─────────────────────┘
Scale: 1.0
Opacity: 1.0

Frame 2 (Touch Down):
┌─────────────────────┐
│ 🪙 BTC             │ Pressed
│    Bitcoin          │
└─────────────────────┘
Scale: 0.98
Opacity: 0.9
Background: muted
Duration: 75ms
Easing: ease-out

Frame 3 (Touch Up):
┌─────────────────────┐
│ 🪙 BTC             │ Release
│    Bitcoin          │
└─────────────────────┘
Scale: 1.0
Opacity: 1.0
Background: normal
Duration: 150ms
Easing: ease-in

Frame 4 (Navigation):
[Page transition →]
```

---

### 6.2 Loading Sequence

**Button Loading State:**
```
Step 1: Normal
┌─────────────┐
│   Sign In   │
└─────────────┘

Step 2: Click (transition: 150ms)
┌─────────────┐
│   Sign In   │ Scale: 0.98
└─────────────┘

Step 3: Loading starts
┌─────────────┐
│ ⟳ Processing│ Spinner appears (fade-in: 100ms)
└─────────────┘ Disabled: true

Step 4: Loading (animation)
┌─────────────┐
│ ⟳ Processing│ Spinner rotates (360deg, 1s, linear, infinite)
└─────────────┘ Text stays static

Step 5: Success
┌─────────────┐
│ ✓ Success!  │ Checkmark appears (fade-in: 200ms)
└─────────────┘ Green tint

Step 6: Navigate
[Redirect to dashboard]
```

---

### 6.3 Form Validation Flow

**Email Input Validation:**
```
State 1: Empty
┌─────────────────────────────┐
│ Email address               │ Placeholder
└─────────────────────────────┘
Border: default

State 2: Typing
┌─────────────────────────────┐
│ john@                       │ User input
└─────────────────────────────┘
Border: focus ring (blue)

State 3: Invalid (onBlur)
┌─────────────────────────────┐
│ john@                       │ Invalid email
└─────────────────────────────┘
Border: red
⚠️ Please enter a valid email address
(Appears with slide-down, 200ms)

State 4: Correcting
┌─────────────────────────────┐
│ john@example.com            │ User correcting
└─────────────────────────────┘
Border: focus ring (blue)
Error message fades out (200ms)

State 5: Valid
┌─────────────────────────────┐
│ john@example.com           ✓│ Valid email
└─────────────────────────────┘
Border: green (subtle)
Checkmark appears (fade-in, 200ms)
```

---

## 7. Responsive Grid Specifications

### 7.1 Asset Grid Breakpoints

**Mobile (< 640px):**
```css
.asset-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 12px;
}
```
- 1 column
- Full width cards
- 12px vertical gap

**Tablet (640px - 1024px):**
```css
.asset-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px 24px;
}
```
- 2 columns
- 24px horizontal gap
- 16px vertical gap

**Desktop (> 1024px):**
```css
.asset-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24px 32px;
}
```
- 3 columns
- 32px horizontal gap
- 24px vertical gap

**Wide Desktop (> 1440px):**
```css
.asset-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 32px;
}
```
- 4 columns
- 32px gap all around

---

## 8. Animation Specifications

### 8.1 Page Transitions

**Dashboard → Asset Detail:**
```
From (Dashboard):
- Opacity: 1
- Transform: translateX(0)

To (Asset Detail):
- Opacity: 0 → 1
- Transform: translateX(100%) → translateX(0)
- Duration: 300ms
- Easing: cubic-bezier(0.4, 0, 0.2, 1)
```

**Back Navigation:**
```
From (Asset Detail):
- Opacity: 1
- Transform: translateX(0)

To (Dashboard):
- Opacity: 0 → 1
- Transform: translateX(-100%) → translateX(0)
- Duration: 300ms
- Easing: cubic-bezier(0.4, 0, 0.2, 1)
```

---

### 8.2 Micro-Interactions

**Checkbox Toggle:**
```
Unchecked → Checked:
- Border: #CBD5E1 → #0F172A
- Background: transparent → #0F172A
- Checkmark: scale(0) → scale(1)
- Duration: 150ms
- Easing: ease-out
```

**Toast Notification:**
```
Appear:
- Opacity: 0 → 1
- Transform: translateY(100%) → translateY(0)
- Duration: 300ms
- Easing: cubic-bezier(0.16, 1, 0.3, 1)

Disappear:
- Opacity: 1 → 0
- Transform: translateY(0) → translateY(-20px)
- Duration: 200ms
- Easing: ease-in
```

---

## 9. Figma Setup Guide

### 9.1 Artboard Sizes

Create artboards for each breakpoint:

1. **Mobile - iPhone SE**
   - Width: 375px
   - Height: 667px
   - Device: iPhone SE (3rd gen)

2. **Mobile - iPhone 14 Pro**
   - Width: 393px
   - Height: 852px
   - Device: iPhone 14 Pro
   - Safe areas: Top 59px, Bottom 34px

3. **Tablet - iPad Air**
   - Width: 820px
   - Height: 1180px
   - Device: iPad Air

4. **Desktop - Laptop**
   - Width: 1440px
   - Height: 900px
   - Device: MacBook Pro 14"

5. **Desktop - Wide**
   - Width: 1920px
   - Height: 1080px
   - Device: Desktop monitor

---

### 9.2 Layer Organization

```
📁 Indigo Yield Platform
├─ 📄 🎨 Design System
│  ├─ Colors (Light Mode)
│  ├─ Colors (Dark Mode)
│  ├─ Typography
│  ├─ Spacing
│  └─ Components
│
├─ 📄 📱 Mobile (375px)
│  ├─ Login
│  ├─ Dashboard
│  ├─ Asset Detail
│  ├─ Empty States
│  └─ Modals
│
├─ 📄 📱 Tablet (768px)
│  ├─ Dashboard
│  └─ Dialogs
│
├─ 📄 💻 Desktop (1440px)
│  ├─ Dashboard
│  ├─ With Sidebar
│  └─ Admin Views
│
└─ 📄 🌙 Dark Mode
   ├─ Login (Mobile)
   ├─ Dashboard (Mobile)
   └─ Dashboard (Desktop)
```

---

### 9.3 Component Variants Setup

**Button Component:**
```
Property: Variant
├─ default
├─ destructive
├─ outline
├─ secondary
├─ ghost
└─ link

Property: Size
├─ sm
├─ default
├─ lg
└─ icon

Property: State
├─ default
├─ hover
├─ focus
├─ disabled
└─ loading
```

---

## 10. Export Specifications

### 10.1 Asset Export Settings

**Icons:**
- Format: SVG
- Size: 24×24px (with 2px padding)
- Export: @1x, @2x, @3x for React Native

**Screenshots:**
- Format: PNG
- Resolution: @2x (Retina)
- Compression: 80% quality

**Mockups:**
- Format: PNG
- Background: Transparent or white
- Resolution: @2x

---

## Conclusion

This specification provides complete visual mockups and exact measurements for implementing the Indigo Yield Platform design across all devices. Each screen includes:

✅ Pixel-perfect dimensions
✅ Color specifications (HSL + HEX)
✅ Typography scales
✅ Spacing measurements
✅ Interaction states
✅ Dark mode variants
✅ Animation timings

Use this document alongside:
- UI_UX_DESIGN_AUDIT_REPORT.md (issues and analysis)
- DESIGN_FIXES_IMPLEMENTATION_GUIDE.md (code implementation)

---

*Last Updated: October 10, 2025*
*Version: 1.0*
*Ready for Figma Implementation*
