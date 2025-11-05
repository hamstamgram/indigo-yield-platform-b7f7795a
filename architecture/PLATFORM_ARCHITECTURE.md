# Indigo Yield Platform - Complete Page Architecture
## Version 2.0 - Full Implementation Specification

---

## Executive Summary

This document defines the complete page architecture for the Indigo Yield Platform, targeting:
- **Web Platform**: 120+ pages with institutional-grade features
- **iOS Platform**: 85+ screens with mobile-first optimization
- **Feature Parity**: 95% feature parity with platform-specific enhancements
- **Accessibility**: WCAG 2.1 AA compliance throughout

---

## 1. Information Architecture

### 1.1 Primary Navigation Structure

```
┌─────────────────────────────────────────────────────────┐
│                    INDIGO YIELD PLATFORM                │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  [Dashboard] [Portfolio] [Transactions] [Documents]    │
│  [Analytics] [Account] [Support] [Settings]            │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 1.2 Navigation Hierarchy

#### Level 1 - Primary Navigation
1. **Dashboard** - Home/Overview
2. **Portfolio** - Holdings & Performance
3. **Transactions** - All Financial Activities
4. **Documents** - Statements, Tax, Legal
5. **Analytics** - Advanced Charts & Insights
6. **Account** - Profile & Security
7. **Support** - Help & Communication
8. **Settings** - Preferences & Configuration

#### Level 2 - Secondary Navigation
Contextual sub-navigation based on primary section

#### Level 3 - Tertiary Navigation
Page-specific actions and filters

---

## 2. Complete Web Page Inventory (125 Pages)

### 2.1 Onboarding & Registration (12 pages)
1. **Landing Page** - Marketing/conversion
2. **Sign Up** - Initial registration
3. **Email Verification** - Confirmation flow
4. **Welcome Tour** - Platform introduction
5. **Account Type Selection** - Individual/Entity
6. **KYC Start** - Identity verification intro
7. **Personal Information** - Basic details
8. **Identity Verification** - Document upload
9. **Address Verification** - Proof of address
10. **Tax Information** - W-9/W-8 forms
11. **Investment Profile** - Risk assessment
12. **Initial Funding** - First deposit setup

### 2.2 Dashboard & Overview (8 pages)
13. **Main Dashboard** - Complete overview
14. **Performance Dashboard** - Returns focus
15. **Risk Dashboard** - Risk metrics
16. **Market Dashboard** - Market conditions
17. **Quick Actions** - Common tasks
18. **Notifications Center** - All alerts
19. **Activity Feed** - Recent events
20. **Personalized Insights** - AI-driven tips

### 2.3 Portfolio Management (15 pages)
21. **Portfolio Overview** - Holdings summary
22. **Fund Details** - Individual fund view
23. **Performance Analysis** - Return analytics
24. **Risk Analysis** - Risk metrics
25. **Allocation View** - Asset distribution
26. **Rebalancing Tool** - Portfolio optimization
27. **Projection Calculator** - Future value
28. **Comparison Tool** - Fund comparison
29. **Historical Performance** - Past returns
30. **Benchmark Comparison** - Index comparison
31. **Custom Portfolios** - Strategy builder
32. **Watchlist** - Saved funds
33. **Research Center** - Fund research
34. **Fund Prospectus** - Legal documents
35. **Portfolio Export** - Data export

### 2.4 Transaction Center (18 pages)
36. **Transaction History** - All transactions
37. **Pending Transactions** - In-progress
38. **Deposit Hub** - Funding options
39. **ACH Transfer** - Bank transfer
40. **Wire Transfer** - Wire instructions
41. **Crypto Deposit** - Digital assets
42. **Credit Card** - Card payments
43. **Withdrawal Request** - Redemption
44. **Withdrawal Review** - Confirmation
45. **Withdrawal Status** - Tracking
46. **Transfer Between Funds** - Internal moves
47. **Recurring Investments** - Auto-invest
48. **Dollar Cost Averaging** - DCA setup
49. **Transaction Limits** - Limits management
50. **Transaction Receipts** - Confirmations
51. **Failed Transactions** - Error handling
52. **Transaction Search** - Advanced search
53. **Bulk Operations** - Multiple transactions

### 2.5 Document Center (16 pages)
54. **Document Library** - All documents
55. **Account Statements** - Monthly/quarterly
56. **Tax Documents** - 1099s, K-1s
57. **Trade Confirmations** - Transaction docs
58. **Legal Agreements** - Terms & conditions
59. **Prospectuses** - Fund documents
60. **Regulatory Filings** - SEC documents
61. **Audit Reports** - Annual audits
62. **Performance Reports** - Custom reports
63. **Document Upload** - User uploads
64. **Document Verification** - Status tracking
65. **E-Sign Center** - Digital signatures
66. **Document Archive** - Historical docs
67. **Document Search** - Advanced search
68. **Document Preferences** - Delivery settings
69. **Secure Messages** - Encrypted docs

### 2.6 Tax Center (10 pages)
70. **Tax Overview** - Tax summary
71. **Tax Documents** - All tax forms
72. **1099 Forms** - Interest/dividends
73. **K-1 Forms** - Partnership returns
74. **Cost Basis** - Basis tracking
75. **Capital Gains** - Gains/losses
76. **Tax Loss Harvesting** - TLH opportunities
77. **Tax Estimator** - Liability calculator
78. **Tax Export** - TurboTax/etc
79. **Tax Settings** - Preferences

### 2.7 Analytics & Reports (12 pages)
80. **Analytics Dashboard** - Main analytics
81. **Performance Analytics** - Return analysis
82. **Risk Analytics** - Risk metrics
83. **Custom Charts** - Chart builder
84. **Comparative Analysis** - Peer comparison
85. **Attribution Analysis** - Return attribution
86. **Scenario Analysis** - What-if modeling
87. **Report Builder** - Custom reports
88. **Scheduled Reports** - Automated reports
89. **Data Export** - CSV/Excel export
90. **API Access** - Developer tools
91. **Market Analysis** - Market insights

### 2.8 Account Management (10 pages)
92. **Profile Overview** - Account summary
93. **Personal Information** - Contact details
94. **Security Settings** - 2FA, passwords
95. **Login History** - Access logs
96. **Linked Accounts** - External accounts
97. **Beneficiaries** - Estate planning
98. **Power of Attorney** - POA management
99. **Account Closure** - Close account
100. **Data Privacy** - GDPR/CCPA
101. **Communication Preferences** - Notifications

### 2.9 Support & Help (12 pages)
102. **Help Center** - Main support
103. **FAQs** - Common questions
104. **Video Tutorials** - How-to videos
105. **Live Chat** - Real-time support
106. **Support Tickets** - Issue tracking
107. **Knowledge Base** - Articles
108. **Glossary** - Terms definitions
109. **Contact Us** - Contact options
110. **Schedule Call** - Advisor booking
111. **Community Forum** - User community
112. **System Status** - Platform status
113. **Release Notes** - Updates

### 2.10 Additional Features (12 pages)
114. **Referral Program** - Invite friends
115. **Referral Dashboard** - Track referrals
116. **Rewards Center** - Loyalty program
117. **Learning Center** - Education hub
118. **Webinars** - Live sessions
119. **Market News** - News feed
120. **Economic Calendar** - Events
121. **Calculator Tools** - Financial calcs
122. **Mobile App Download** - App links
123. **API Documentation** - Developer docs
124. **Terms of Service** - Legal
125. **Privacy Policy** - Privacy

---

## 3. Complete iOS Screen Inventory (85 Screens)

### 3.1 Authentication & Onboarding (10 screens)
1. **Splash Screen** - App launch
2. **Welcome Screen** - First launch
3. **Login Screen** - Authentication
4. **Face ID/Touch ID Setup** - Biometric
5. **Registration Flow** - Sign up
6. **KYC Flow** - Identity verification
7. **Document Capture** - Camera integration
8. **Onboarding Tutorial** - Swipe tutorial
9. **Push Notification Permission** - Alerts
10. **Initial Deposit** - First funding

### 3.2 Main Navigation (5 screens)
11. **Tab Bar Navigation** - Main nav
12. **Dashboard Tab** - Overview
13. **Portfolio Tab** - Holdings
14. **Activity Tab** - Transactions
15. **More Tab** - Additional options

### 3.3 Dashboard Screens (8 screens)
16. **Main Dashboard** - Overview
17. **Performance Card** - Returns
18. **Quick Actions** - Fast access
19. **Notifications List** - Alerts
20. **Market Summary** - Market data
21. **Widget Configuration** - Customize
22. **Pull-to-Refresh** - Data update
23. **3D Touch Actions** - Quick actions

### 3.4 Portfolio Screens (10 screens)
24. **Portfolio List** - All holdings
25. **Fund Detail** - Individual fund
26. **Performance Chart** - Interactive chart
27. **Fund Comparison** - Compare funds
28. **Allocation Pie Chart** - Distribution
29. **Rebalancing** - Adjust portfolio
30. **Watchlist** - Saved funds
31. **Research** - Fund research
32. **Calculator** - Projections
33. **Share Sheet** - Export/share

### 3.5 Transaction Screens (12 screens)
34. **Transaction List** - History
35. **Transaction Detail** - Single transaction
36. **Deposit Flow** - Add funds
37. **Bank Account Link** - Plaid integration
38. **Crypto Wallet** - Digital assets
39. **Withdrawal Flow** - Redeem funds
40. **Recurring Investment** - Auto-invest
41. **Transaction Filter** - Search/filter
42. **Receipt View** - Confirmation
43. **Pending Transactions** - In-progress
44. **QR Code Scanner** - Crypto addresses
45. **Apple Pay Integration** - Payment

### 3.6 Document Screens (8 screens)
46. **Document List** - All documents
47. **Document Viewer** - PDF viewer
48. **Statement List** - Statements
49. **Tax Documents** - Tax forms
50. **Document Search** - Find docs
51. **Download Manager** - Offline docs
52. **E-Sign Flow** - Digital signature
53. **Share Document** - Export/share

### 3.7 Analytics Screens (6 screens)
54. **Analytics Dashboard** - Charts
55. **Custom Chart Builder** - Create charts
56. **Comparison View** - Compare metrics
57. **Report View** - Generated reports
58. **Data Export** - Export data
59. **Landscape Charts** - Rotation support

### 3.8 Account & Settings (10 screens)
60. **Account Overview** - Profile
61. **Personal Information** - Edit details
62. **Security Settings** - 2FA, biometric
63. **Notification Settings** - Alerts config
64. **Linked Accounts** - External accounts
65. **Privacy Settings** - Data privacy
66. **App Settings** - Preferences
67. **About** - App information
68. **Help & Support** - Support options
69. **Logout Confirmation** - Sign out

### 3.9 Communication Screens (6 screens)
70. **Message Center** - Inbox
71. **Message Thread** - Conversation
72. **Compose Message** - New message
73. **Live Chat** - Support chat
74. **Call Support** - Phone support
75. **Video Call** - Video support

### 3.10 iOS-Specific Features (10 screens)
76. **Today Widget** - Widget view
77. **Apple Watch App** - Companion app
78. **Siri Shortcuts** - Voice commands
79. **Spotlight Search** - System search
80. **App Clips** - Lightweight experience
81. **Share Extension** - System share
82. **Notification Actions** - Rich notifications
83. **Haptic Feedback** - Touch feedback
84. **Dark Mode** - Theme support
85. **Accessibility Options** - A11y features

---

## 4. User Journey Maps

### 4.1 New Investor Onboarding Journey

```
START → Landing → Sign Up → Email Verify → KYC Process →
Tax Info → Risk Profile → Initial Deposit → Dashboard
```

**Web Steps**: 12 pages, ~20 minutes
**iOS Steps**: 10 screens, ~15 minutes (optimized flow)

### 4.2 Deposit Journey

```
Dashboard → Deposit Hub → Select Method → Enter Amount →
Review → Confirm → Processing → Success → Portfolio Update
```

**Web Steps**: 8 pages, ~5 minutes
**iOS Steps**: 6 screens, ~3 minutes (Apple Pay option)

### 4.3 Withdrawal Journey

```
Portfolio → Withdrawal Request → Select Fund → Enter Amount →
Select Destination → Review → 2FA → Confirm → Status Tracking
```

**Web Steps**: 9 pages, ~7 minutes
**iOS Steps**: 7 screens, ~5 minutes

### 4.4 Tax Document Journey

```
Documents → Tax Center → Select Year → View 1099 →
Download → Export to TurboTax
```

**Web Steps**: 6 pages, ~3 minutes
**iOS Steps**: 5 screens, ~2 minutes

---

## 5. Feature Comparison Matrix

| Feature Category | Web Platform | iOS Platform | Parity |
|-----------------|--------------|--------------|---------|
| **Authentication** | | | |
| Email/Password | ✅ Full | ✅ Full | 100% |
| 2FA | ✅ SMS/App | ✅ SMS/App | 100% |
| Biometric | ❌ N/A | ✅ Face/Touch ID | Platform-specific |
| SSO | ✅ Google/Apple | ✅ Apple Sign-In | 95% |
| **Dashboard** | | | |
| Overview | ✅ Full | ✅ Full | 100% |
| Widgets | ✅ Customizable | ✅ iOS Widgets | 95% |
| Real-time Updates | ✅ WebSocket | ✅ Push/Socket | 100% |
| **Portfolio** | | | |
| Holdings View | ✅ Full | ✅ Full | 100% |
| Performance Charts | ✅ Interactive | ✅ Native Charts | 95% |
| Rebalancing | ✅ Full | ✅ Simplified | 90% |
| Research Tools | ✅ Full | ✅ Adapted | 85% |
| **Transactions** | | | |
| Deposits | ✅ All methods | ✅ + Apple Pay | 100% |
| Withdrawals | ✅ Full | ✅ Full | 100% |
| History | ✅ Full | ✅ Full | 100% |
| Recurring | ✅ Full | ✅ Full | 100% |
| **Documents** | | | |
| View/Download | ✅ Full | ✅ Full | 100% |
| E-Sign | ✅ DocuSign | ✅ Native | 95% |
| Tax Forms | ✅ Full | ✅ Full | 100% |
| **Analytics** | | | |
| Charts | ✅ Full | ✅ Optimized | 90% |
| Reports | ✅ Full | ✅ View-only | 80% |
| Export | ✅ All formats | ✅ Limited | 70% |
| **Support** | | | |
| Help Center | ✅ Full | ✅ Full | 100% |
| Live Chat | ✅ Full | ✅ Full | 100% |
| Video Support | ✅ WebRTC | ✅ Native | 95% |

**Overall Feature Parity: 93%**

---

## 6. Responsive Breakpoints

### 6.1 Web Platform Breakpoints

```scss
// Mobile First Approach
$breakpoint-xs: 320px;   // Small phones
$breakpoint-sm: 576px;   // Phones
$breakpoint-md: 768px;   // Tablets
$breakpoint-lg: 992px;   // Desktop
$breakpoint-xl: 1200px;  // Large desktop
$breakpoint-xxl: 1920px; // 4K displays
```

### 6.2 Layout Adaptations

| Breakpoint | Layout | Navigation | Grid |
|------------|--------|------------|------|
| XS (320-575) | Single column | Hamburger | 1 col |
| SM (576-767) | Single column | Hamburger | 1 col |
| MD (768-991) | Two column | Tab bar | 2 col |
| LG (992-1199) | Three column | Side nav | 3 col |
| XL (1200-1919) | Three column | Side nav | 4 col |
| XXL (1920+) | Four column | Side nav | 5 col |

---

## 7. Progressive Disclosure Patterns

### 7.1 Information Hierarchy

**Level 1 - Always Visible**
- Current balance
- Total return
- Quick actions
- Primary navigation

**Level 2 - One Click Away**
- Detailed performance
- Transaction history
- Basic settings
- Recent documents

**Level 3 - Deep Dive**
- Advanced analytics
- Historical data
- Detailed reports
- Tax information

### 7.2 Disclosure Triggers

1. **Hover States** (Desktop)
   - Tooltips for metrics
   - Expanded cards
   - Preview popups

2. **Tap/Click Actions**
   - Accordion expansions
   - Modal details
   - Drawer panels

3. **Scroll Triggers**
   - Lazy loading
   - Infinite scroll
   - Progressive enhancement

4. **User Preference**
   - Saved view states
   - Custom dashboards
   - Personalized defaults

---

## 8. Accessibility Features (WCAG 2.1 AA)

### 8.1 Visual Accessibility
- **Color Contrast**: 4.5:1 minimum for normal text
- **Large Text**: 3:1 minimum for 18pt+ text
- **Focus Indicators**: Visible keyboard focus
- **Color Independence**: Not solely color-dependent
- **Zoom Support**: 200% zoom without horizontal scroll

### 8.2 Keyboard Navigation
- **Tab Order**: Logical flow through all interactive elements
- **Skip Links**: Jump to main content
- **Keyboard Shortcuts**: Documented shortcuts
- **Focus Traps**: Proper modal/dialog handling
- **Escape Routes**: ESC key closes modals

### 8.3 Screen Reader Support
- **ARIA Labels**: All interactive elements labeled
- **ARIA Live Regions**: Dynamic content updates
- **Semantic HTML**: Proper heading hierarchy
- **Alternative Text**: Images and charts described
- **Table Headers**: Proper data table markup

### 8.4 Motor Accessibility
- **Target Size**: 44×44px minimum touch targets
- **Click Areas**: Extended click zones
- **Drag Alternatives**: Keyboard/button alternatives
- **Time Limits**: Adjustable or removable
- **Error Prevention**: Confirmation for destructive actions

### 8.5 Cognitive Accessibility
- **Clear Language**: Plain English, no jargon
- **Consistent Navigation**: Same location across pages
- **Error Messages**: Clear, actionable guidance
- **Help Available**: Contextual help throughout
- **Progress Indicators**: Multi-step process clarity

---

## 9. Design System Requirements

### 9.1 Component Library

**Foundation Components**
- Typography system (6 levels)
- Color system (primary, secondary, semantic)
- Spacing system (8px grid)
- Icon library (500+ icons)
- Motion system (easing, duration)

**UI Components**
- Buttons (6 variants)
- Forms (15 input types)
- Cards (8 layouts)
- Tables (sortable, filterable)
- Charts (12 types)
- Navigation (4 patterns)
- Modals (5 sizes)
- Alerts (4 severities)

**Complex Components**
- Data grids
- Chart builders
- Form wizards
- File uploaders
- Date pickers
- Calculators

### 9.2 Design Tokens

```json
{
  "color": {
    "primary": "#4A90E2",
    "secondary": "#7B68EE",
    "success": "#4CAF50",
    "warning": "#FF9800",
    "error": "#F44336",
    "neutral": {
      "0": "#FFFFFF",
      "100": "#F5F5F5",
      "900": "#212121"
    }
  },
  "spacing": {
    "xs": "4px",
    "sm": "8px",
    "md": "16px",
    "lg": "24px",
    "xl": "32px"
  },
  "typography": {
    "h1": "32px/1.2",
    "h2": "24px/1.3",
    "body": "16px/1.5",
    "small": "14px/1.4"
  }
}
```

### 9.3 Platform-Specific Guidelines

**Web Platform**
- Material Design 3 principles
- CSS Grid/Flexbox layouts
- CSS custom properties
- Progressive enhancement
- Print stylesheets

**iOS Platform**
- Human Interface Guidelines
- SF Symbols integration
- Dynamic Type support
- Dark mode support
- Haptic feedback patterns

---

## 10. Navigation Specifications

### 10.1 Web Navigation Structure

**Primary Navigation Bar**
```
Logo | Dashboard | Portfolio | Transactions | Documents | Analytics | [User Menu]
```

**Secondary Navigation** (Contextual)
- Dashboard: Overview | Performance | Risk | Activity
- Portfolio: Holdings | Performance | Allocation | Research
- Transactions: History | Deposits | Withdrawals | Recurring

**User Menu Dropdown**
- Profile
- Account Settings
- Security
- Help & Support
- Sign Out

### 10.2 iOS Navigation Structure

**Tab Bar** (Bottom)
```
[Dashboard] [Portfolio] [Transact] [Documents] [More]
```

**Navigation Bar** (Top)
- Title
- Back button (when applicable)
- Action buttons (context-specific)

**More Menu**
- Analytics
- Tax Center
- Messages
- Settings
- Help
- About

---

## 11. Security & Compliance Features

### 11.1 Authentication Layers
1. **Primary Auth**: Email + Password
2. **2FA**: SMS, Authenticator App, Hardware Key
3. **Biometric**: Face ID, Touch ID (iOS)
4. **Session Management**: Timeout, concurrent limits
5. **Device Trust**: Registered devices

### 11.2 Data Protection
- **Encryption**: TLS 1.3, AES-256
- **Data Masking**: Sensitive info hidden
- **Audit Logging**: All actions logged
- **PII Protection**: GDPR/CCPA compliant
- **Secure Document Storage**: Encrypted at rest

### 11.3 Compliance Features
- **KYC/AML**: Full identity verification
- **FATCA/CRS**: Tax reporting
- **Reg BI**: Best interest documentation
- **FINRA**: Regulatory compliance
- **SOC 2**: Security certification

---

## 12. Performance Requirements

### 12.1 Web Performance Targets
- **First Contentful Paint**: < 1.5s
- **Time to Interactive**: < 3.5s
- **Largest Contentful Paint**: < 2.5s
- **Cumulative Layout Shift**: < 0.1
- **First Input Delay**: < 100ms

### 12.2 iOS Performance Targets
- **App Launch**: < 2s
- **Screen Transition**: < 300ms
- **Data Refresh**: < 1s
- **Memory Usage**: < 100MB
- **Battery Impact**: Low

---

## 13. Localization & Internationalization

### 13.1 Language Support
- English (US) - Primary
- Spanish (ES/MX)
- French (FR/CA)
- German (DE)
- Japanese (JP)
- Chinese Simplified (CN)

### 13.2 Regional Adaptations
- Currency formatting
- Date/time formatting
- Number formatting
- Address formats
- Phone formats
- Tax forms by region

---

## 14. Analytics & Tracking

### 14.1 User Analytics
- Page views and screen views
- User flows and funnels
- Event tracking
- Session recordings
- Heatmaps
- A/B testing

### 14.2 Performance Monitoring
- Real user monitoring (RUM)
- Application performance monitoring (APM)
- Error tracking
- Uptime monitoring
- API performance
- Database query performance

---

## 15. Implementation Roadmap

### Phase 1: Foundation (Months 1-2)
- Complete remaining core pages
- Implement authentication flow
- Basic KYC/AML integration
- Payment gateway setup

### Phase 2: Enhancement (Months 3-4)
- Document center
- Tax center
- Advanced analytics
- Mobile app launch

### Phase 3: Optimization (Months 5-6)
- Performance optimization
- A/B testing
- User feedback integration
- Advanced features

### Phase 4: Scale (Months 6+)
- International expansion
- Additional payment methods
- AI-powered insights
- API platform

---

## 16. Success Metrics

### 16.1 User Experience Metrics
- **Task Completion Rate**: > 95%
- **Error Rate**: < 1%
- **User Satisfaction**: > 4.5/5
- **Support Tickets**: < 2% of users
- **Time to Complete Tasks**: Industry-leading

### 16.2 Business Metrics
- **Conversion Rate**: > 15%
- **User Retention**: > 90% annual
- **Daily Active Users**: > 60%
- **Net Promoter Score**: > 50
- **Revenue per User**: Top quartile

---

## Appendices

### A. Detailed Page Specifications
[Would include wireframes and detailed specs for each page]

### B. Component Documentation
[Complete component library documentation]

### C. API Specifications
[REST/GraphQL API documentation]

### D. Testing Protocols
[QA and testing procedures]

### E. Deployment Guide
[Technical deployment documentation]

---

*Document Version: 2.0*
*Last Updated: November 2024*
*Next Review: Q1 2025*