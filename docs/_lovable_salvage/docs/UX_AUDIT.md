# Indigo Yield Platform -- Deep UI/UX Audit

**Auditor:** Jack Roberts (AntiGravity Design System)
**Date:** February 19, 2026
**Version:** v3.0.0
**Viewports Tested:** Desktop (1440px), Tablet (768px), Mobile (375px)

---

## 1. Executive Summary

**Overall Design Quality Score: 7.2 / 10**

The Indigo Yield Platform demonstrates a mature, dark-themed financial application with thoughtful design foundations. The design system is well-structured with consistent font families (Inter for UI, Montserrat for display, JetBrains Mono for financial data), proper use of shadcn/ui components, and a cohesive color palette anchored around indigo/purple accent tones against a deep navy/charcoal background.

The platform performs well at desktop viewport and degrades gracefully to tablet. Mobile has several meaningful issues that need attention, particularly around button overflow, filter panel dominance, and table legibility.

### Top 5 Priorities

1. **P0 -- Action Buttons Overflow on Mobile/Tablet Header** (admin dashboard): "Apply Yield" and "New Transaction" buttons are clipped on viewports below 1024px. These are primary financial actions -- they must always be fully visible and tappable.

2. **P1 -- Ledger Filter Panel Dominates Mobile Viewport**: The filter area on `/admin/ledger` consumes the entire mobile screen. Users must scroll past 8+ filter controls before seeing any data. Needs a collapsible filter drawer pattern.

3. **P1 -- No Dedicated Landing Page**: The root `/` route renders the login form. There is no public-facing landing page explaining the platform's value proposition. For a financial product, this undermines trust and professionalism for first-time visitors.

4. **P1 -- 404 Page Lacks Branding and Navigation**: The 404 page shows only plain text with no INDIGO logo, no sidebar, and no contextual navigation. Users who hit this page have no visual confirmation they are still on the platform.

5. **P2 -- Inconsistent Decimal Precision Display**: Fund cards on the dashboard show `0.00` while the Fund Management page shows `0.00000000`. The display precision should be contextual but consistent within each view type (summary vs. detail).

---

## 2. Page-by-Page Findings

### 2.1 Login Page (`/login`)

**Desktop (1440px):** Centered card layout with INDIGO logo above. Clean, professional. Dark gradient background. Form fields use glass-morphism styling with subtle borders. "Investor Portal" heading is clear. SSL badge at bottom adds trust signals. Cookie consent banner overlays cleanly.

**Tablet (768px):** Scales proportionally. Logo and form card maintain centered layout. All content visible without scrolling. No issues.

**Mobile (375px):** Logo fills width nicely. Form card has proper padding. Touch targets for inputs are adequate (48px+ height). "Forgot?" link is accessible. Button is full-width and prominent.

**Issues:**
| # | Severity | Issue | Recommendation |
|---|----------|-------|----------------|
| L1 | P2 | Logo image uses `img` tag with alt text "Infinite Yield Fund" but the visible branding says "INDIGO" -- alt text mismatch | Update alt text to "INDIGO" or "INDIGO Yield Platform" |
| L2 | P2 | "Investor Portal" heading may confuse admin users who use the same login form | Consider a neutral heading like "Sign In" or "Access Platform" |
| L3 | P2 | Password field placeholder shows dots but also has a lock icon -- double metaphor | Keep either the icon or the dot placeholder, not both |
| L4 | P2 | No "remember me" checkbox -- users must re-authenticate every session | Add a "Stay signed in" toggle for convenience |
| L5 | P2 | Terms of Service and Privacy Policy links at bottom -- no confirmation these pages exist and contain real content | Verify `/terms` and `/privacy` routes have substantive content |

---

### 2.2 Admin Command Center (`/admin`)

**Desktop (1440px):** Rich dashboard with sidebar navigation, version badge, system status pill, action buttons (Apply Yield, New Transaction), Quick Actions bar, stats cards (Accounts, Positions, Pending, Today), Fund Financials section with per-fund cards (BTC, ETH, XRP, SOL, USDT), and Risk Analysis section with Liquidity/Concentration/Platform Metrics tabs.

**Tablet (768px):** Sidebar collapses to hamburger. "New Transaction" button text is truncated to "New Trans..." at the right edge. Fund cards switch to 2-column grid. Stats bar condenses well.

**Mobile (375px):** "Apply Yield" and "New Transaction" buttons are severely clipped -- only partial text visible ("pply Yie..." and "w Transac..."). Quick Actions lose their text labels, showing icons only. Fund cards stack to single column. Risk Analysis section responsive.

**Issues:**
| # | Severity | Issue | Recommendation |
|---|----------|-------|----------------|
| D1 | P0 | Primary action buttons ("Apply Yield", "New Transaction") overflow/clip on mobile and tablet | Stack buttons vertically below 768px or use icon-only variants with tooltips. Alternatively, move to a floating action button (FAB) or action menu pattern on mobile |
| D2 | P1 | Quick Actions bar loses text labels on mobile, showing only icons | Icons alone for "Transactions", "Withdrawals", "Reports", "Investors" are not self-evident. Add labels below icons or use a labeled icon grid |
| D3 | P1 | "No fund AUM data yet" badge in top-right corner is persistent across all admin pages | This should be dismissible or contextual. Showing it on every single page adds noise. Move to dashboard-only or use a one-time alert |
| D4 | P2 | Fund cards show "0 investors" with "Open Period" and "Record Yield" buttons even when AUM is 0.00 | When a fund has no investors and no AUM, consider a simplified card state that de-emphasizes actions |
| D5 | P2 | "SYSTEM OPERATIONAL" badge uses green dot + text but "Degraded" on Operations page uses amber -- good color coding, but there is no legend explaining these states | Add a tooltip or info icon explaining status levels |
| D6 | P2 | "Flows for: February 19th, 2026" date picker alignment on mobile could wrap awkwardly | Ensure the date picker is full-width on mobile |
| D7 | P2 | Version badge "v3.0.0" next to heading serves no user purpose -- developer artifact | Remove from user-facing UI or move to Settings/About |

---

### 2.3 Admin Investors (`/admin/investors`)

**Desktop (1440px):** Table-based layout with search bar, filter dropdowns (All Funds, account type, download status), pagination indicator (42 of 42). Table columns: Investor, Status, Funds, Activity, Pend. WD, Report, Joined, IB, Actions. All columns visible.

**Tablet (768px):** Columns JOINED, IB, ACTIONS are hidden/scrolled off. Core columns (Investor, Status, Funds, Activity, Pend. WD, Report) remain visible. Acceptable degradation.

**Mobile (375px):** Only Investor name + Status + partial Funds visible. Table header "FUND..." truncated. Filters wrap into 3 rows taking significant vertical space.

**Issues:**
| # | Severity | Issue | Recommendation |
|---|----------|-------|----------------|
| I1 | P1 | Table does not switch to card-based list on mobile | For 375px, consider a card-per-investor layout with key info (name, status, last activity) and a "View Details" tap target |
| I2 | P1 | No indication of clickable rows -- rows appear static | Add hover state on desktop, tap affordance on mobile. Rows should visually indicate they are interactive |
| I3 | P2 | All investors show "INACTIVE" status in grey badge | If this is the actual state, the monotone color makes scanning difficult. If all are the same status, the column wastes space |
| I4 | P2 | "42 of 42" pagination text without page controls | If all items fit in one page, this is fine. But clarify that this is total count vs. pagination |
| I5 | P2 | Search placeholder "Search name, email, or ID..." is truncated on mobile | Shorten to "Search..." on mobile |

---

### 2.4 Admin Ledger (`/admin/ledger`)

**Desktop (1440px):** Tabbed interface (Transactions | Withdrawals). Filter panel with time presets (This Month, Last Month, YTD, Clear All), "Show voided" checkbox, search, fund/type/category dropdowns, and date range pickers. Table below with 0 Transactions shown. Export and Add Transaction buttons.

**Tablet (768px):** Layout is functional. Filters may require horizontal scrolling for date pickers.

**Mobile (375px):** The filter panel is the dominant problem. It consumes the ENTIRE mobile viewport and then some. Users see: tabs, time presets, "Show voided" checkbox, search input, 3 dropdown filters stacked, 2 date pickers -- all before reaching any content. The actual transaction table with "0 Transactions" / "Add Transaction" is below the fold.

**Issues:**
| # | Severity | Issue | Recommendation |
|---|----------|-------|----------------|
| LE1 | P1 | Filter panel dominates mobile viewport -- no visible content above fold | Implement a collapsible filter section. Show 1-2 key filters (search + fund) by default, with "More Filters" expandable section |
| LE2 | P1 | "From date & time" and "To date & time" inputs use native date pickers that may display inconsistently across mobile browsers | Use a custom date picker component or format the placeholders more explicitly |
| LE3 | P2 | Empty state "No transactions found" is plain text -- no illustration or guidance | Add an illustration and contextual CTA: "No transactions yet. Record your first transaction." |
| LE4 | P2 | "Add Transaction" button at bottom right is easy to miss when scrolled | Duplicate the primary CTA in the empty state area |

---

### 2.5 Admin Yield History (`/admin/yield-history`)

**Desktop (1440px):** Tabs (Recorded Yields | Distributions). Clean filter bar with Fund, Purpose, Date From, Date To dropdowns and Reset button. "Yield Records" section with "Columns" customization button. Empty state: "No yield records found. Adjust filters or record yields first."

**Tablet (768px):** Filters display inline. Good use of horizontal space.

**Mobile (375px):** Filters stack vertically. Manageable scrolling. Date pickers use native HTML date inputs.

**Issues:**
| # | Severity | Issue | Recommendation |
|---|----------|-------|----------------|
| Y1 | P2 | Native HTML date inputs (`dd/mm/yyyy`) look inconsistent with the rest of the polished UI | Use custom styled date pickers that match the platform's dark theme |
| Y2 | P2 | Empty state text is helpful but lacks visual weight | Add an icon/illustration to draw attention |
| Y3 | P2 | "Columns" button purpose may not be obvious to first-time users | Add a tooltip: "Customize visible columns" |

---

### 2.6 Admin Reports (`/admin/reports`)

**Desktop (1440px):** Tabs (Monthly Statements | Historical Archive). Month selector with "Generate Missing" button and overflow menu (three dots). 4 status cards (Total: 41 investors, Sent: 0, Ready: 1, Missing: 40). Search and status filter. Table with Investor, Email, Assets, Status, Sent columns.

**Tablet (768px):** Status cards condense to 2x2 grid. Table shows all columns with some truncation.

**Mobile (375px):** Status cards in 2x2 grid work well. Table data truncated -- investor names ("Advantage Bloc..."), emails ("advantage.blockcha..."), assets column barely visible. Status column ("Missing", "Ready") visible.

**Issues:**
| # | Severity | Issue | Recommendation |
|---|----------|-------|----------------|
| R1 | P1 | "Missing: 40" status card in amber/yellow is alarming for launch day | If 40 out of 41 reports are "missing", this needs clear context -- are they not yet generated vs. failed? The word "missing" implies error |
| R2 | P1 | Table data truncation on mobile makes emails unreadable | Emails should wrap or use mobile card layout. A card per investor with name, email (wrapped), status badge, and action button would be more usable |
| R3 | P2 | Three-dot overflow menu next to "Generate Missing" -- not clear what additional actions it contains | Consider replacing with a labeled secondary action or using a split button |

---

### 2.7 Admin Fund Management (`/admin/funds`)

**Desktop (1440px):** 3-column card grid. Each card shows: fund icon (crypto logo), fund name, status badge (ACTIVE/INACTIVE), ticker + asset code, Total AUM, Investors count, and action buttons (Edit Details, Archive, Delete). Grid/List view toggle. "+ New Fund" primary button.

**Tablet (768px):** Switches to 2-column grid. Cards maintain readability.

**Mobile (375px):** Single column stack. Cards are spacious and readable. All information visible. Good responsive behavior.

**Issues:**
| # | Severity | Issue | Recommendation |
|---|----------|-------|----------------|
| F1 | P2 | AUM display precision differs: `0.00000000 BTC` vs `0.0000000 EURC` vs `0.000000 EURC` | Standardize decimal places per asset type or use a uniform format |
| F2 | P2 | Delete icon (trash) has no label -- only icon | Add "Delete" text label or a tooltip. Destructive actions should never be icon-only |
| F3 | P2 | "INACTIVE" funds (Euro Yield Fund, Tokenized Gold) show same card layout as active funds | Consider visually differentiating -- muted card, reduced opacity, or collapsed state |
| F4 | P2 | Grid/List toggle icons are small and lack labels | Add "Grid view" / "List view" tooltips |

---

### 2.8 Admin Revenue (`/admin/revenue`)

**Desktop (1440px):** Tabs (Platform Fees | IB Management). 3 metric cards (MTD Revenue, YTD Revenue, ITD Revenue) all showing "No revenue". INDIGO Fees Account Balance section with per-asset balances (BTC, ETH, SOL, XRP, USDT). "Yield Earned" section with "No yield earned yet" empty state.

**Tablet (768px):** Metric cards stack. Asset balance cards wrap.

**Mobile (375px):** Single column layout. All content accessible.

**Issues:**
| # | Severity | Issue | Recommendation |
|---|----------|-------|----------------|
| RE1 | P2 | "No revenue" in grey text across 3 cards is visually dull | Use "-- " or a placeholder illustration instead of repeated "No revenue" |
| RE2 | P2 | Balance values use `0.000000` with varying precision per asset | Standardize: BTC/ETH to 8 decimals, stablecoins to 2 or 4 |
| RE3 | P2 | Export button at top right is easy to miss | Move export closer to the data it relates to |

---

### 2.9 Admin Operations (`/admin/operations`)

**Desktop (1440px):** 4 tabs (Health, Integrity, Crystallization, Audit Trail). Health tab shows: Overall System Status (Degraded, amber badge), Report Delivery Queue (4 stat cards: Queued/Sending/Stuck/Failed), Database/Authentication/File Storage/Email Service cards with uptime percentages and response times.

**Tablet (768px):** Good responsive behavior. Cards wrap to 2-column. All tabs visible.

**Mobile (375px):** "Audit Trail" tab text partially clipped. Otherwise cards stack well. Status information is scannable.

**Issues:**
| # | Severity | Issue | Recommendation |
|---|----------|-------|----------------|
| O1 | P1 | "Degraded" system status with no explanation of what is degraded | Show which specific services are causing degradation. The Authentication (98%, "Slow authentication"), File Storage (96.5%), and Email Service (95%) all show warnings -- but the connection to "Degraded" overall status is not explicitly linked |
| O2 | P2 | Tab bar truncates "Audit Trail" text on mobile | Use shorter tab labels on mobile ("Health", "Integrity", "Crystal.", "Audit") or make tabs horizontally scrollable with visible scroll indicators |
| O3 | P2 | "Last checked: 12:42:08" uses 24h format without timezone indicator | Add timezone or relative time ("2 min ago") |

---

### 2.10 Admin Settings (`/admin/settings`)

**Desktop (1440px):** 4 tabs (General, Notifications, Admins, Account). General tab shows Platform Name text input, Maintenance Mode toggle, Allow New Registrations toggle. "Save Changes" button in top right.

**Tablet/Mobile:** Settings forms scale well. Toggle switches are appropriately sized.

**Issues:**
| # | Severity | Issue | Recommendation |
|---|----------|-------|----------------|
| S1 | P2 | "Save Changes" button is positioned at the top-right corner, far from the form fields it saves | Place save button at the bottom of the form, or make it sticky at bottom on mobile |
| S2 | P2 | Maintenance Mode and Allow Registrations toggles lack visual feedback on state | Add descriptive text that changes: "Currently OFF" / "Currently ON" |

---

### 2.11 Investor Overview (`/investor`)

**Desktop (1440px):** Welcome message with investor name. Quick action buttons (Statements, Transaction History). Period tabs (MTD, QTD, YTD, ITD). Position cards area with "No active positions found." empty state (dashed border box). Right sidebar with Latest Statement, Quick Stats (Pending Withdrawals: All Clear), Recent Activity cards.

**Tablet (768px):** Right sidebar stacks below main content.

**Mobile (375px):** Clean single-column layout. Action buttons side-by-side at top. Period tabs span full width. Cards stack vertically. All sections accessible.

**Issues:**
| # | Severity | Issue | Recommendation |
|---|----------|-------|----------------|
| IO1 | P1 | "No active positions found." in a dashed-border box looks like a placeholder/wireframe, not a polished empty state | Replace with an illustration, a message explaining next steps: "Your positions will appear here once you invest in a fund. Contact your administrator to get started." Add a CTA if possible |
| IO2 | P2 | "All Clear" green text in Quick Stats for Pending Withdrawals -- the green with arrow could be mistaken for a positive return metric | Clarify the label or use a different visual treatment (checkmark icon instead of green text + arrow) |
| IO3 | P2 | "No recent activity" and "No statements available yet" empty states are text-only | Add icons or illustrations for visual consistency |

---

### 2.12 Investor Portfolio (`/investor/portfolio`)

**Desktop (1440px):** Heading with "Export CSV" button. "All Positions" section with "0 ASSETS" count. Large empty state area with icon, "No Positions Found" heading, and helpful description: "Your fund positions will appear here once you have active investments."

**Tablet/Mobile:** Scales cleanly. Empty state centers well.

**Issues:**
| # | Severity | Issue | Recommendation |
|---|----------|-------|----------------|
| IP1 | P2 | Empty state is good but could include a CTA or next step | Add: "Contact your fund manager to begin investing" or similar guidance |
| IP2 | P2 | "Export CSV" button visible even with 0 positions | Disable or hide export when there is no data to export |

---

### 2.13 Investor Yield History (`/investor/yield-history`)

**Desktop (1440px):** Two stat cards (Total Yield Earned: "--", Yield Events: 0). Filters (All Years, All Funds). Empty state: "No yield history found / Yield will appear here after monthly distributions are finalized."

**Issues:**
| # | Severity | Issue | Recommendation |
|---|----------|-------|----------------|
| IY1 | P2 | "Total Yield Earned: --" (double dash) is ambiguous -- is it zero, loading, or unavailable? | Use "0.00" or "Not applicable" with explanation |
| IY2 | P2 | Empty state text is informative but passive | Consider adding a timeline: "Your first yield distribution will be processed at month end" |

---

### 2.14 Investor Transactions (`/investor/transactions`)

**Desktop (1440px):** Clean search bar with filter dropdowns (All Assets, All Types). "Export CSV" button. Blue dot next to "Transactions" heading (real-time indicator?). Empty state with icon: "No transactions found / Try adjusting your filters to find what you're looking for."

**Issues:**
| # | Severity | Issue | Recommendation |
|---|----------|-------|----------------|
| IT1 | P1 | Blue dot next to "Transactions" heading has no tooltip or explanation | Explain what this indicator means (real-time updates active? new transactions?). An unexplained dot creates confusion in a financial context |
| IT2 | P2 | Empty state suggests "try adjusting your filters" when there are no transactions at all | Differentiate between "no transactions exist" and "no transactions match filters" |
| IT3 | P2 | "Export CSV" enabled with no data -- same as portfolio |  Disable when empty |

---

### 2.15 Investor Statements (`/investor/statements`)

**Desktop (1440px):** "Monthly Statements" heading with Year (2026) and Asset (All Assets) filters. Empty state with icon and clear text: "No statements available / Statements are generated monthly. Your first statement will be available at the end of your first full month of investment." Helpful "About Monthly Statements" info box below.

**Issues:**
| # | Severity | Issue | Recommendation |
|---|----------|-------|----------------|
| IS1 | P2 | The "About Monthly Statements" info box is excellent -- consider using this pattern on other empty state pages | Replicate this "About X" educational pattern for Transactions, Yield History, and Portfolio pages |

---

### 2.16 Investor Settings (`/investor/settings`)

**Desktop (1440px):** Tabs (Profile, Security, Appearance). Profile tab shows avatar circle with initials, name, email. Form fields for First Name, Last Name, Email (read-only with note), Phone Number. Save Changes button.

**Mobile (375px):** Form fields stack. Avatar centers. Tabs span full width.

**Issues:**
| # | Severity | Issue | Recommendation |
|---|----------|-------|----------------|
| ISE1 | P2 | Email field is disabled with helper text "Contact support to change your email address" -- correct security practice but "support" is not linked | Make "support" a clickable link or provide actual contact method |
| ISE2 | P2 | Avatar circle shows initials but no option to upload a photo | Consider adding photo upload capability or explicitly stating it is not supported |

---

## 3. Cross-Cutting Issues

### 3.1 Navigation Consistency (P1)

When an admin user views investor pages via the portal switcher, the sidebar continues showing admin navigation (Command Center, Revenue, etc.) rather than switching to investor-relevant navigation (Overview, Portfolio, Yield History, etc.). This creates cognitive dissonance -- the user sees investor content but admin navigation.

**Recommendation:** When portal view is set to "investor", the sidebar should show investor navigation items to match the content being viewed.

### 3.2 Persistent "No fund AUM data yet" Banner (P1)

A small banner reading "No fund AUM data yet" appears in the top-right corner of EVERY admin page (dashboard, investors, ledger, yield history, reports, funds, revenue, operations, settings). This is contextually relevant only on the dashboard and possibly fund management. Showing it everywhere creates alert fatigue.

**Recommendation:** Show this banner only on pages where AUM data is contextually relevant (Dashboard, Fund Management). Alternatively, make it dismissible.

### 3.3 Empty State Quality (P2)

Empty states vary significantly in quality across the platform:

| Quality | Pages |
|---------|-------|
| Excellent | Investor Statements (has educational "About" box), Investor Portfolio (icon + description) |
| Adequate | Investor Yield History, Investor Transactions |
| Minimal | Admin Ledger ("No transactions found" plain text), Admin Revenue ("No revenue" repeated) |
| Missing | Risk Analysis section ("No active funds to monitor" -- no guidance) |

**Recommendation:** Standardize empty states with: (1) relevant icon/illustration, (2) clear description of what will appear, (3) actionable next step or CTA when applicable.

### 3.4 Breadcrumb Consistency (P2)

Breadcrumbs vary in format across pages:

- Admin pages: "Admin > Page Name" (plain text, with chevron separator)
- Investor pages: "Dashboard > Investor > Page Name" (longer chain)
- Some admin pages: "Admin > Reports & Analytics" (includes ampersand and ampersand-extended name)

**Recommendation:** Standardize breadcrumb format. Admin pages should use "Admin > [Section] > [Page]". Investor pages should use "Investor > [Page]".

### 3.5 Tab Component Visual Consistency (P2)

Tabs across the platform use two different visual styles:

1. **Pill tabs** (filled active state): Used on Ledger (Transactions | Withdrawals), Yield History, Reports, Revenue, Operations, Settings
2. **Underline tabs**: Used on Investor Overview period selector (MTD | QTD | YTD | ITD)

While having two tab styles is acceptable if they serve different purposes (primary navigation vs. data filtering), the distinction is not clear or documented.

**Recommendation:** Document the tab pattern distinction in the design system. Pill tabs for section navigation, underline tabs for data period filtering.

### 3.6 Monospace Font Usage for Financial Data (Positive Note)

The platform correctly uses JetBrains Mono (`font-mono`) for financial figures and `tabular-nums` for table alignment. This is proper financial UI typography and should be maintained.

---

## 4. Design System Gaps

### 4.1 Missing Components

| Component | Need |
|-----------|------|
| **Collapsible Filter Panel** | Critical for mobile experience on Ledger, Yield History, and Reports pages |
| **Mobile Card List** | Alternative to tables on mobile for Investors and Reports tables |
| **Confirmation Dialog (Destructive)** | Delete icons on Fund Management cards need confirmation modals |
| **Status Legend** | System status colors (green/amber/red) need an accessible legend or tooltip |
| **Toast Notification Variants** | Verified toasts exist (Sonner) but unclear if success/error/warning variants are styled consistently |

### 4.2 Inconsistent Tokens

| Token | Inconsistency |
|-------|---------------|
| **Decimal Precision** | Dashboard fund cards: `0.00`, Fund Management: `0.00000000`, Revenue: `0.000000` |
| **Date Formats** | Yield History uses native HTML date inputs (`dd/mm/yyyy`), Dashboard uses custom styled "February 19th, 2026", Activity column uses "Feb 19, 11:08" |
| **Status Badges** | Investor list uses "INACTIVE" in grey. Fund cards use "ACTIVE" in green / "INACTIVE" in grey outline. Reports use "Missing" in yellow text / "Ready" in green badge |
| **Empty State Text** | Font size, color, and padding vary between "No transactions found", "No active positions found.", "No revenue", and "No yield records found" |

### 4.3 Missing Design Tokens

- No documented color palette beyond Tailwind defaults + indigo accent
- No spacing scale documentation
- No documented shadow/elevation system (cards use subtle borders, not shadows)
- No documented animation/transition standards (buttons have `active:scale-[0.98]` which is good, but not uniformly applied)

---

## 5. Device-Specific Issues

### 5.1 Mobile-Only (375px)

| # | Issue | Affected Pages | Severity |
|---|-------|---------------|----------|
| M1 | Action buttons overflow/clip in header area | Admin Dashboard | P0 |
| M2 | Filter panels consume full viewport before data | Admin Ledger | P1 |
| M3 | Table data truncated making emails/names unreadable | Investors, Reports | P1 |
| M4 | Quick Actions lose text labels (icons only) | Admin Dashboard | P1 |
| M5 | Tab labels truncated ("Audit Trail" clipped) | Operations | P2 |
| M6 | Search placeholder text truncated | Investors | P2 |
| M7 | Native HTML date inputs break visual consistency | Yield History | P2 |

### 5.2 Tablet-Only (768px)

| # | Issue | Affected Pages | Severity |
|---|-------|---------------|----------|
| T1 | "New Transaction" button text truncated at right edge | Admin Dashboard | P0 |
| T2 | Secondary table columns hidden without scroll indicator | Investors | P2 |
| T3 | Sidebar hamburger menu -- no visible cue it contains navigation | All pages | P2 |

### 5.3 Desktop (1440px) -- No Major Issues

Desktop viewport is the strongest experience. The sidebar, tables, cards, and navigation all work well at 1440px. Minor observations:

- The right-side "No fund AUM data yet" banner could be more contextual
- The dashboard has significant vertical scrolling with many fund cards -- consider a "Show More" pattern for 5+ funds
- The investor list table has unused horizontal space on wide screens -- columns could use the space more effectively

---

## 6. Accessibility Assessment

### 6.1 Positive Findings

- **Skip Link**: `<SkipLink>` component present, linking to `#main-content`
- **Focus States**: Buttons use `focus-visible:ring-2` with proper ring offset -- WCAG compliant
- **ARIA Labels**: Sidebar has 4 ARIA attributes (basic coverage)
- **Semantic HTML**: Pages use `<main>`, `<nav>`, `<heading>` elements appropriately
- **Tab Order**: Generally logical top-to-bottom, left-to-right flow
- **Keyboard Shortcut**: Command palette (`Cmd+K`) provides keyboard navigation
- **Font Sizing**: Base font sizes appear adequate (14-16px body, larger headings)

### 6.2 Areas Needing Improvement

| # | Issue | Impact |
|---|-------|--------|
| A1 | Color contrast on dark theme -- light grey text on dark navy may not meet WCAG AA 4.5:1 for body text in some areas | Check contrast ratios for secondary/muted text colors |
| A2 | Fund Management delete icon (trash) has no aria-label | Screen reader users cannot identify the delete action |
| A3 | "Show voided" checkbox on Ledger lacks descriptive label for screen readers | The purpose of "voided" may not be clear without visual context |
| A4 | Status badges (ACTIVE/INACTIVE) use color alone to convey meaning | Add text labels (already present) -- but ensure color is not the only differentiator |
| A5 | Form error states not observed during audit | Unable to verify if validation errors are announced to screen readers |
| A6 | Cookie consent banner -- verify it is keyboard-navigable and trappable | Focus management on overlays is critical |

---

## 7. Performance Observations

### 7.1 Positive

- **Code Splitting**: All routes use `React.lazy()` with `<RouteSuspense>` -- proper lazy loading
- **Query Caching**: TanStack Query with 5min stale / 10min cache configuration
- **Font Loading**: Self-hosted fonts via `@fontsource` packages (no external font requests)
- **Vite Build**: Fast HMR in development (~163ms startup)

### 7.2 Concerns

| # | Concern | Risk |
|---|---------|------|
| P1 | CSP blocks `cdn.gpteng.co/gptengineer.js` script on every page load (error in console) | Remove the script reference from `index.html` if Lovable/GPT Engineer tooling is no longer needed |
| P2 | 42 investor rows rendered without pagination or virtualization | Acceptable for current scale but will need virtualization at 200+ investors |
| P3 | Fund cards all render simultaneously on dashboard | Consider lazy-rendering below-fold fund cards or a "Show All Funds" toggle when count exceeds 3 |

---

## 8. Summary Recommendations by Priority

### Immediate (P0 -- Fix Before/During Launch)

1. **Fix action button overflow on mobile/tablet** -- "Apply Yield" and "New Transaction" must be fully visible and tappable on all viewports

### This Week (P1 -- High Impact)

2. Implement collapsible filter drawer on Ledger page for mobile
3. Add a dedicated landing page at `/` (or redirect to `/login` with improved branding)
4. Improve investor table mobile experience (card layout alternative)
5. Clarify "Missing: 40" context on Reports page
6. Explain the blue dot indicator on Investor Transactions heading
7. Fix 404 page to include branding and contextual navigation
8. Address "No fund AUM data yet" banner showing on all pages

### This Month (P2 -- Polish)

9. Standardize empty states across all pages
10. Standardize decimal precision display by asset type
11. Standardize date format presentation
12. Replace native HTML date inputs with custom styled pickers
13. Add tooltips to all icon-only buttons
14. Add educational "About X" boxes to investor empty state pages (following Statements pattern)
15. Improve 404 page with branding
16. Add confirmation dialogs to destructive actions (fund delete)

---

**End of Audit**

*This document is a read-only audit. No code modifications were made during this review.*
