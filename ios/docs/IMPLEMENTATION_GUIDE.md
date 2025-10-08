# Indigo Yield iOS App - Implementation Guide

## Overview

This guide provides step-by-step instructions for implementing the Live Events and Newsletter pages using the Indigo Yield design system.

## Project Structure

```
IndigoInvestor/
├── Core/
│   └── Theme/
│       ├── IndigoTheme.swift (existing)
│       └── DesignTokens.swift (new)
├── Views/
│   ├── Components/
│   │   └── ComponentLibrary.swift (new)
│   ├── LiveEventsView.swift (new)
│   ├── NewsletterView.swift (new)
│   └── Navigation/
│       └── MainTabView.swift (existing - needs updates)
└── Assets.xcassets/
    └── [Icon and color assets]
```

## Step 1: Design System Integration

### 1.1 Add Design Tokens

The `DesignTokens.swift` file provides:
- **Color system** with brand, financial, and semantic colors
- **Typography hierarchy** with Montserrat for headers and SF Pro for body text
- **Spacing system** based on 4pt grid
- **Component sizing** standards
- **Animation definitions**
- **Shadow styles**

### 1.2 Update Existing Theme

Replace color references in existing files:

```swift
// Before
Color.accentColor
Color(.secondarySystemBackground)

// After
DesignTokens.Colors.indigoPrimary
DesignTokens.Colors.backgroundSecondary
```

## Step 2: Component Library Setup

### 2.1 Add Reusable Components

The `ComponentLibrary.swift` provides:

#### Financial Components
- `FinancialValueView` - Displays currency values with change indicators
- `PortfolioAllocationRing` - Circular allocation chart
- `AssetAllocationRow` - Asset list item with performance data

#### UI Components
- `IndigoButtonStyle` - Primary, secondary, tertiary, destructive styles
- `LoadingStateView` - Loading indicators (spinner, dots, progress)
- `EmptyStateView` - Empty state with icon and action
- `StatusBadge` - Color-coded status indicators
- `InfoCard` - Information display with icons
- `ExpandableSection` - Collapsible content sections

#### Chart Components
- `MiniLineChart` - Small trend line charts
- Portfolio allocation visualizations

#### Form Components
- `IndigoTextField` - Custom text input with validation
- Form styling and validation rules

### 2.2 Usage Examples

```swift
// Financial value display
FinancialValueView(
    value: 250000,
    showChange: true,
    change: 5.2,
    size: .large
)

// Primary button
Button("Invest Now") { /* action */ }
    .indigoButton(style: .primary, size: .large)

// Status badge
StatusBadge(text: "Active", status: .success)
```

## Step 3: Live Events Implementation

### 3.1 Features Implemented

- **Real-time event feed** with categorization
- **Event filtering** by category (Market, Fund, System, Alerts)
- **Priority indicators** (High, Medium, Low)
- **Market impact display** for relevant events
- **Related assets** linking
- **Notification settings**
- **Pull-to-refresh** and pagination
- **Event sharing** functionality

### 3.2 Key Components

#### LiveEventCard
- Displays event title, description, timestamp
- Shows market impact and related assets
- Priority color coding on left edge
- Expandable description for long content

#### Event Categories
- Market Update (blue)
- Fund News (green)
- System (gray)
- Alert (red)
- Maintenance (orange)

#### Event Model
```swift
struct LiveEvent {
    let id: String
    let title: String
    let description: String
    let category: EventCategory
    let timestamp: Date
    let marketImpact: Double?
    let relatedAssets: [String]
    let hasActionButton: Bool
    let priority: EventPriority
}
```

### 3.3 Integration Points

1. **API Integration**: Replace mock data in `LiveEventsViewModel`
2. **Real-time Updates**: Implement WebSocket or Server-Sent Events
3. **Push Notifications**: Connect to notification settings
4. **Deep Linking**: Handle event detail navigation

## Step 4: Newsletter Implementation

### 4.1 Features Implemented

- **Subscription management** with email preferences
- **Newsletter archive** with search and filtering
- **Category filtering** (Weekly, Market, Funds, Insights, Company)
- **Reading statistics** (total issues, read count, average time)
- **Full-screen reader** with sharing options
- **Download functionality** (PDF export)
- **Reading list** integration
- **Multi-format content** support

### 4.2 Key Components

#### NewsletterSubscriptionCard
- Toggle subscription on/off
- Show subscription email and delivery schedule
- Next delivery date display

#### NewsletterIssueCard
- Issue title, excerpt, and metadata
- Category badge and read status
- Estimated read time
- Tag display (first 3 + count)
- Share and read actions

#### NewsletterReaderView
- Full-screen reading experience
- Structured content sections
- Share, save, download, print options
- Progress tracking

#### Newsletter Model
```swift
struct NewsletterIssue {
    let id: String
    let title: String
    let excerpt: String
    let date: Date
    let category: NewsletterCategory
    let readTime: Int
    let sections: [NewsletterContentSection]
    let tags: [String]
    let isRead: Bool
}
```

### 4.3 Content Structure

#### Newsletter Sections
- Title and metadata
- Rich text content
- Image support
- Highlighted bullet points
- Related links and references

## Step 5: Navigation Integration

### 5.1 Tab Bar Updates

Add new tabs to `MainTabView.swift`:

```swift
// Add to TabView
.tabItem {
    Label("Live Events", systemImage: "bell.badge")
}
.tag(5)

.tabItem {
    Label("Newsletter", systemImage: "envelope")
}
.tag(6)
```

### 5.2 Deep Linking Support

```swift
// Handle newsletter links
case "/newsletter":
    selectedTab = 6 // Newsletter tab
    if let issueId = components.queryItems?.first(where: { $0.name == "id" })?.value {
        navigationState.newsletterPath.append(.reader(issueId))
    }

// Handle event links
case "/events":
    selectedTab = 5 // Live Events tab
    if let eventId = components.queryItems?.first(where: { $0.name == "id" })?.value {
        navigationState.eventsPath.append(.detail(eventId))
    }
```

## Step 6: Assets and Resources

### 6.1 Required Icons

Add to `Assets.xcassets`:
- Newsletter category icons
- Event type icons
- Market impact indicators
- Status indicators

### 6.2 Color Assets

Update color sets:
- IndigoPrimary: #4147CC
- IndigoSecondary: #6B70D9
- IndigoAccent: #FBB93C
- Financial data colors (positive green, negative red)

## Step 7: Accessibility Implementation

### 7.1 VoiceOver Support

```swift
// Financial values
.accessibilityValue("$250,000")
.accessibilityHint("Total portfolio value")

// Status indicators
.accessibilityLabel("Investment status: Active")

// Interactive elements
.accessibilityAddTraits(.isButton)
```

### 7.2 Dynamic Type Support

All components use design system fonts that scale with user preferences:

```swift
.font(DesignTokens.Typography.headline) // Scales automatically
```

### 7.3 Color Contrast

All color combinations meet WCAG AA standards:
- Primary text: 4.5:1 contrast minimum
- Secondary text: 3:1 contrast minimum
- Interactive elements: Clear focus indicators

## Step 8: Testing Strategy

### 8.1 Unit Tests

Test view models:
```swift
class LiveEventsViewModelTests: XCTestCase {
    func testEventFiltering() {
        // Test category filtering logic
    }

    func testLoadMoreEvents() {
        // Test pagination
    }
}
```

### 8.2 UI Tests

Test user interactions:
```swift
func testNewsletterSubscription() {
    // Test subscription toggle
    // Verify UI updates
}

func testEventRefresh() {
    // Test pull-to-refresh
    // Verify data reload
}
```

### 8.3 Accessibility Tests

```swift
func testVoiceOverNavigation() {
    // Test screen reader navigation
    // Verify all elements are accessible
}
```

## Step 9: Performance Optimization

### 9.1 Image Loading

Implement lazy loading for newsletter images:
```swift
AsyncImage(url: imageURL) { image in
    image
        .resizable()
        .aspectRatio(contentMode: .fit)
} placeholder: {
    ProgressView()
        .frame(height: 200)
}
```

### 9.2 List Performance

Use `LazyVStack` for large datasets:
```swift
LazyVStack(spacing: 16) {
    ForEach(viewModel.events) { event in
        LiveEventCard(event: event)
    }
}
```

### 9.3 Data Caching

Implement caching for:
- Newsletter content
- Event data
- User preferences

## Step 10: Backend Integration

### 10.1 API Endpoints

Required endpoints:
```
GET /api/events - Fetch live events
GET /api/events/:id - Get event details
POST /api/events/:id/view - Mark event as viewed

GET /api/newsletter - Fetch newsletter archive
GET /api/newsletter/:id - Get newsletter content
POST /api/newsletter/subscribe - Manage subscription
POST /api/newsletter/:id/read - Mark as read
```

### 10.2 Real-time Updates

Implement WebSocket connection for live events:
```swift
class RealtimeService {
    func connectToEventStream() {
        // WebSocket implementation
    }

    func handleEventUpdate(_ event: LiveEvent) {
        // Update UI with new event
    }
}
```

## Step 11: Analytics Integration

### 11.1 Event Tracking

Track user interactions:
```swift
// Event views
Analytics.track("event_viewed", properties: ["event_id": event.id])

// Newsletter reads
Analytics.track("newsletter_read", properties: ["issue_id": issue.id])

// Subscription changes
Analytics.track("newsletter_subscribed", properties: ["email": email])
```

### 11.2 Performance Metrics

Monitor:
- Page load times
- Scroll performance
- Image loading speed
- API response times

## Step 12: Error Handling

### 12.1 Network Errors

```swift
enum NetworkError: Error {
    case noConnection
    case serverError
    case invalidData
}

func handleNetworkError(_ error: NetworkError) {
    switch error {
    case .noConnection:
        showOfflineMessage()
    case .serverError:
        showRetryOption()
    case .invalidData:
        showDataErrorMessage()
    }
}
```

### 12.2 User Feedback

Implement error states:
- Network connection errors
- Loading failures
- Empty data states
- Subscription failures

## Step 13: Security Considerations

### 13.1 Data Protection

- Encrypt sensitive data
- Secure API communications (HTTPS)
- Validate all user inputs
- Implement proper session management

### 13.2 Privacy Compliance

- Handle email preferences securely
- Implement data deletion requests
- Provide privacy policy links
- Secure newsletter content access

## Conclusion

This implementation provides:

1. **Professional Design System** - Consistent, accessible, iOS-native components
2. **Live Events Page** - Real-time market updates with categorization and filtering
3. **Newsletter System** - Complete subscription, archive, and reading experience
4. **Reusable Components** - Scalable component library for future features
5. **Performance Optimized** - Efficient loading, caching, and rendering
6. **Accessible** - Full VoiceOver support and WCAG compliance
7. **Maintainable** - Clear architecture and separation of concerns

The design system can be extended for additional features while maintaining consistency across the entire Indigo Yield iOS application.

## Next Steps

1. **Review Design System** - Validate colors, fonts, and spacing with brand guidelines
2. **Implement API Integration** - Connect to real backend services
3. **Add Real-time Features** - WebSocket integration for live updates
4. **Comprehensive Testing** - Unit tests, UI tests, and accessibility validation
5. **Performance Testing** - Load testing with realistic data volumes
6. **User Testing** - Validate UX with target investors and administrators