# 📊 Indigo Fund Statement Template Design System

## Overview
This document defines the HTML template and design system for generating individual investor monthly statements from multi-investor PDF reports.

## 🎨 Design System

### Brand Colors
- **Primary Background**: `#edf0fe` (Light blue-gray)
- **Secondary Background**: `#f8fafc` (Very light gray)
- **Border Color**: `#e2e8f0` (Light gray border)
- **Text Primary**: `#0f172a` (Dark navy)
- **Text Secondary**: `#64748b` (Medium gray)
- **Success/Positive**: `#16a34a` (Green for gains)
- **Typography**: Montserrat, Arial, sans-serif

### Asset Logos (CDN URLs)
```
BTC:  https://storage.mlcdn.com/account_image/855106/HqTafY3UXNLyQctbIqje0qAv7BYiDI4MRVUhOKiT.png
ETH:  https://storage.mlcdn.com/account_image/855106/1LGif7hOOerx0K9BWZh0vRgg2QfRBoxBibwrQGW5.png
USDT: https://storage.mlcdn.com/account_image/855106/2p3Y0l5lox8EefjCx7U7Qgfkrb9cxW3L8mGpaORi.png
SOL:  https://storage.mlcdn.com/account_image/855106/9EenamIVtIm3Rqfh63IZCQBrVZaDE2YHwRPwwpIN.png
EURO: (text only, no logo)

Company Logo: https://storage.mlcdn.com/account_image/855106/T7spejaxgKvLqaFJArUJu6YSxacSpADGPyWIrbRq.png
```

## 📐 Template Structure

### 1. Brand Header (Top Bar)
```html
<div style="background-color: #edf0fe; padding: 16px;">
  <table width="100%">
    <tr>
      <td align="left">
        <img src="[company-logo-url]" height="22" alt="Indigo Fund">
      </td>
      <td align="right">
        <h1 style="font-size:22px;font-weight:700;color:#0f172a;margin:0;">
          Monthly Report
        </h1>
      </td>
    </tr>
  </table>
</div>
```

### 2. Investor Header Card
```html
<div style="background:#edf0fe;border:1px solid #e2e8f0;border-radius:10px;padding:16px;margin:16px 0;">
  <div style="font-size:15px;font-weight:bold;color:#0f172a;">
    Investor: [Investor Name]
  </div>
  <div style="font-size:12px;color:#0f172a;line-height:1.5;margin-top:4px;">
    Investor Statement for the Period Ended: [Month DD, YYYY]
  </div>
</div>
```

### 3. Fund Section Template
```html
<div style="background:#f8fafc;border-radius:10px;padding:20px;margin-top:[spacing]px;">
  <!-- Fund Header -->
  <div style="display:flex;align-items:center;">
    <img src="[asset-logo-url]" height="32" style="margin-right:12px;">
    <span style="font-size:18px;font-weight:bold;color:#0f172a;">[Fund Name]</span>
  </div>
  
  <!-- Data Table -->
  <table style="width:100%;margin-top:20px;border-collapse:collapse;">
    <thead>
      <tr>
        <th style="text-align:left;font-size:12px;color:#64748b;text-transform:uppercase;font-weight:bold;padding:8px 0;">
          <!-- Row Label -->
        </th>
        <th style="text-align:right;font-size:11px;color:#64748b;text-transform:uppercase;font-weight:bold;">MTD</th>
        <th style="text-align:right;font-size:11px;color:#64748b;text-transform:uppercase;font-weight:bold;">QTD</th>
        <th style="text-align:right;font-size:11px;color:#64748b;text-transform:uppercase;font-weight:bold;">YTD</th>
        <th style="text-align:right;font-size:11px;color:#64748b;text-transform:uppercase;font-weight:bold;">ITD</th>
      </tr>
    </thead>
    <tbody>
      <!-- Data rows here -->
    </tbody>
  </table>
</div>
```

## 📊 Data Table Rows

### Standard Row
```html
<tr>
  <td style="font-size:13px;color:#0f172a;padding:6px 0;">[Label]</td>
  <td style="font-size:13px;text-align:right;white-space:nowrap;">[Value]</td>
  <td style="font-size:13px;text-align:right;white-space:nowrap;">[Value]</td>
  <td style="font-size:13px;text-align:right;white-space:nowrap;">[Value]</td>
  <td style="font-size:13px;text-align:right;white-space:nowrap;">[Value]</td>
</tr>
```

### Important Row Styles

#### Net Income (Green + Bold)
```html
<tr>
  <td style="font-size:13px;color:#16a34a;font-weight:bold;padding:6px 0;">Net Income</td>
  <td style="font-size:13px;color:#16a34a;font-weight:bold;text-align:right;white-space:nowrap;">+[Value]</td>
  <!-- ... other cells with same green/bold style -->
</tr>
```

#### Rate of Return (Green + Bold)
```html
<tr>
  <td style="font-size:13px;color:#16a34a;font-weight:bold;padding:6px 0;">Rate of Return (%)</td>
  <td style="font-size:13px;color:#16a34a;font-weight:bold;text-align:right;white-space:nowrap;">[Value]%</td>
  <!-- ... other cells with same green/bold style -->
</tr>
```

#### Ending Balance (Bold)
```html
<tr>
  <td style="font-size:13px;font-weight:bold;color:#0f172a;padding:6px 0;">Ending Balance</td>
  <td style="font-size:13px;font-weight:bold;text-align:right;white-space:nowrap;">[Value]</td>
  <!-- ... other cells with bold style -->
</tr>
```

## 🔢 Number Formatting Rules

1. **Negative Numbers**: Convert `(123)` to `-123`
2. **Empty Values**: Convert `–` or blanks to `-`
3. **Net Income**: Always prefix with `+` unless already negative
4. **Percentages**: Add `%` suffix for Rate of Return
5. **Alignment**: All numbers right-aligned with `nowrap`

## 📏 Spacing Guidelines

- **Before first fund block**: 24px margin-top
- **Between fund blocks**: 16px margin-top
- **Table row padding**: 6px vertical
- **Card padding**: 16px all sides
- **Container padding**: 20px for fund sections

## 🎯 Fund Display Order

Always display funds in this order (if present):
1. BTC (Bitcoin)
2. ETH (Ethereum)
3. USDT (Tether)
4. SOL (Solana)
5. EURO (Euro Stablecoin)

## 📋 Required Data Points

For each fund, capture these rows with 4 values (MTD, QTD, YTD, ITD):
- **Beginning Balance**
- **Additions**
- **Redemptions**
- **Net Income** (green, bold, with +/- sign)
- **Ending Balance** (bold)
- **Rate of Return (%)** (green, bold, with % suffix)

## 🚀 Implementation in Platform

### Storage Structure
```
/statements/
  /2025/
    /08/
      /investor_[id]/
        statement_2025_08.html
        statement_2025_08.pdf (if PDF generation enabled)
```

### Database Schema
Statements are stored in the `statements` table with:
- `investor_id` - Links to user
- `period_year` - Year of statement
- `period_month` - Month of statement
- `asset_code` - Asset type (BTC, ETH, etc.)
- `storage_path` - Path to HTML/PDF file
- Financial data columns for all metrics

### Generation Process
1. Parse source data (PDF or database)
2. Extract investor-specific data
3. Apply HTML template with proper styling
4. Generate one file per investor
5. Store in Supabase Storage
6. Update database with statement metadata

## 📝 File Naming Convention

- **HTML Files**: `[period]_[investor_name].html`
  - Example: `2025_08_John_Doe.html`
- **PDF Files**: `[period]_[investor_name].pdf`
  - Example: `2025_08_John_Doe.pdf`

## ✅ Quality Checks

Before finalizing statements:
1. Verify all numbers are present (no empty columns)
2. Confirm Net Income has proper +/- signs
3. Check Rate of Return has % suffix
4. Validate green color on positive metrics
5. Ensure proper bold formatting on key rows
6. Confirm numeric alignment (right, nowrap)
7. Verify fund order matches specification

## 🔗 Integration Points

### With Existing Platform
- Statements viewable in investor portal
- Downloadable via authenticated endpoints
- Email distribution through notification system
- Automated generation on monthly schedule

### API Endpoints
- `GET /api/statements/:userId/:year/:month` - Retrieve statement
- `POST /api/statements/generate` - Trigger generation
- `GET /api/statements/list/:userId` - List all statements

## 📧 Distribution

Statements can be distributed via:
1. **Portal Download** - Direct download from investor dashboard
2. **Email Attachment** - Monthly email with PDF attachment
3. **Secure Link** - Time-limited signed URL for access
4. **API Access** - Programmatic retrieval for integrations
