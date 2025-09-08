# 📑 Indigo Fund Statement Template Specifications

## Overview
This document contains the exact specifications for generating investor HTML reports from monthly PDF data following the Indigo Fund design system.

## 🎯 Template System Components

### 1. Available Generators

| Script | Purpose | Input | Output |
|--------|---------|-------|--------|
| `generate-investor-statements.js` | Generate from database | Portfolio positions | HTML statements |
| `generate-statements-from-pdf.js` | Generate from PDF | PDF report | HTML statements |

### 2. Template Location
- **Base Template:** `templates/statement_template.html`
- **Generated Statements:** `statements/YYYY_MM/`

## 📊 PDF Parsing Rules

### Investor Identification
- Each investor section labeled with: `ATTN: Investor Name`
- Extract all fund tables per investor

### Data Points to Extract
For each fund (BTC, ETH, USDT, SOL, EURO), capture 4 values (MTD, QTD, YTD, ITD):
1. **Beginning Balance**
2. **Additions**
3. **Redemptions**
4. **Net Income** → Always prefix with "+" unless negative
5. **Ending Balance**
6. **Rate of Return (%)**

### Number Normalization
- Convert `(123)` to `-123`
- Convert `–` or blanks to `-`
- Preserve decimal precision as provided

### Fund Order
Always display in this order:
1. BTC
2. ETH
3. USDT
4. SOL
5. EURO

## 🎨 Design System

### Color Palette
```css
/* Backgrounds */
#edf0fe /* Primary background (light blue-gray) */
#f8fafc /* Secondary background (very light gray) */

/* Borders */
#e2e8f0 /* Light gray border */

/* Text */
#0f172a /* Primary text (dark navy) */
#64748b /* Secondary text (medium gray) */
#16a34a /* Success/Positive (green for gains) */
```

### Typography
```css
font-family: 'Montserrat', Arial, sans-serif;
```

### Logo URLs
```javascript
const LOGOS = {
  company: 'https://storage.mlcdn.com/account_image/855106/T7spejaxgKvLqaFJArUJu6YSxacSpADGPyWIrbRq.png',
  BTC: 'https://storage.mlcdn.com/account_image/855106/HqTafY3UXNLyQctbIqje0qAv7BYiDI4MRVUhOKiT.png',
  ETH: 'https://storage.mlcdn.com/account_image/855106/1LGif7hOOerx0K9BWZh0vRgg2QfRBoxBibwrQGW5.png',
  USDT: 'https://storage.mlcdn.com/account_image/855106/2p3Y0l5lox8EefjCx7U7Qgfkrb9cxW3L8mGpaORi.png',
  SOL: 'https://storage.mlcdn.com/account_image/855106/9EenamIVtIm3Rqfh63IZCQBrVZaDE2YHwRPwwpIN.png',
  EURO: null // Text only, no logo
};
```

## 📐 HTML Structure

### 1. Brand Header (Top Bar)
```html
<div style="background-color:#edf0fe;padding:16px;">
  <table width="100%">
    <tr>
      <td align="left">
        <img src="[company-logo]" height="22" alt="Indigo Fund">
      </td>
      <td align="right">
        <h1 style="font-size:22px;font-weight:700;color:#0f172a;">
          Monthly Report
        </h1>
      </td>
    </tr>
  </table>
</div>
```

### 2. Investor Header (Card)
```html
<div style="background:#edf0fe;border:1px solid #e2e8f0;border-radius:10px;padding:16px;margin:16px;">
  <div style="font-size:15px;font-weight:bold;color:#0f172a;">
    Investor: [Name]
  </div>
  <div style="font-size:12px;color:#0f172a;line-height:1.5;margin-top:4px;">
    Investor Statement for the Period Ended: [Month DD, YYYY]
  </div>
</div>
```

### 3. Fund Section
```html
<div style="background:#f8fafc;border-radius:10px;padding:20px;margin:16px;margin-top:[24px|16px];">
  <!-- Fund Header -->
  <div style="display:flex;align-items:center;">
    <img src="[asset-logo]" height="32" style="margin-right:12px;">
    <span style="font-size:18px;font-weight:bold;color:#0f172a;">
      [Fund] Yield Fund
    </span>
  </div>
  
  <!-- Data Table -->
  <table style="width:100%;margin-top:20px;border-collapse:collapse;">
    <!-- Table content -->
  </table>
</div>
```

## 📋 Table Styling

### Headers
- **Row label:** 12px, #64748b, uppercase, bold
- **Column headers (MTD/QTD/YTD/ITD):** 11px, #64748b, uppercase, bold

### Data Rows
- **Standard rows:** 13px, #0f172a
- **Net Income:** 13px, #16a34a (green), bold, prefix with "+"
- **Ending Balance:** 13px, #0f172a, bold
- **Rate of Return:** 13px, #16a34a (green), bold

### Spacing
- **First fund block:** 24px margin-top
- **Between fund blocks:** 16px margin-top
- **Row padding:** 6px vertical
- **Table margin-top:** 20px

## 📄 File Output

### Naming Convention
```
01_Investor_Name.html
02_Another_Investor.html
...
```

### Directory Structure
```
statements/
  2025_09/
    01_Advantage_Blockchain.html
    02_Jose_Molla.html
    ...
```

## 🔧 Usage Examples

### Generate from Database
```bash
# Uses current portfolio positions
node generate-investor-statements.js
```

### Generate from PDF
```bash
# Parse PDF and generate statements
node generate-statements-from-pdf.js monthly_report.pdf
```

### Generate with Sample Data
```bash
# Use built-in sample data
node generate-statements-from-pdf.js
```

## ✅ Quality Checks

Before finalizing statements:
1. **Numbers:** Verify all values present (no empty columns)
2. **Signs:** Net Income has "+" prefix for positive values
3. **Colors:** Green for Net Income and Rate of Return
4. **Bold:** Ending Balance, Net Income, Rate of Return
5. **Alignment:** All numbers right-aligned with nowrap
6. **Fund Order:** BTC → ETH → USDT → SOL → EURO
7. **Missing Funds:** Omit sections if investor has no position

## 🚀 Production Workflow

### Monthly Process
1. **Receive PDF:** Monthly yield fund report (all investors)
2. **Parse Data:** Extract investor sections (ATTN: labels)
3. **Generate HTML:** Apply template to each investor
4. **Quality Check:** Verify formatting and numbers
5. **Bundle Files:** Create ZIP archive
6. **Distribute:** Send to investors

### Automation Ready
The system is designed to be automated:
- Input: PDF upload
- Processing: Automatic parsing and generation
- Output: ZIP file with all HTML statements

## 📦 ZIP Bundle Structure

When bundling for distribution:
```
monthly_statements_2025_09.zip
├── 01_Advantage_Blockchain.html
├── 02_Alain_Bensimon.html
├── 03_Anne_Cecile_Noique.html
└── ... (all investor files)
```

## 🔗 Integration Points

### With GPT/AI Assistant
The specifications are designed to be used with AI assistants that can:
1. Parse PDF content
2. Apply the template rules
3. Generate HTML files
4. Bundle into ZIP

### With Platform
- Statements can be stored in Supabase Storage
- Accessible via investor portal
- Distributed via email with signed URLs

## 📝 Notes

- **Font Loading:** Montserrat loaded from Google Fonts
- **Responsive:** Fixed 800px max-width container
- **Print Ready:** Optimized for PDF conversion
- **Inline Styles:** All styling inline for email compatibility
- **No JavaScript:** Pure HTML/CSS for maximum compatibility

---

This specification ensures consistent, professional statement generation following the exact Indigo Fund design system.
