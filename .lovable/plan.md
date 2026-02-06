

# Fix Report Logos - Centralize Fund Icons

## Problem

There are **5 duplicate fund icon maps** across the codebase, each with different keys and several with **wrong URLs**:

| File | Key Format | Issues |
|------|-----------|--------|
| `src/types/domains/report.ts` (FUND_ICONS) | "BTC YIELD FUND" | Most complete; canonical source for reports |
| `src/services/reports/emailReportGenerator.ts` (FUND_ICON_MAP) | "BTC YIELD FUND" | **Tokenized Gold shows USDC logo**, SOL URL has typo, missing USDT/XRP |
| `src/lib/statements/monthlyEmailGenerator.ts` (FUND_ICONS) | "BTC YIELD FUND" | **Tokenized Gold shows USDC logo**, missing XRP |
| `src/lib/pdf/statementGenerator.ts` (FUND_ICONS) | "BTC" (asset code) | Uses external coingecko URLs for XRP/XAUT |
| `src/types/asset.ts` (ASSET_CONFIGS logoUrl) | "BTC" (asset code) | Uses coingecko for XAUT/XRP; no CDN URLs |

### Specific bugs found:

1. **Tokenized Gold shows USDC logo** in 2 files: `emailReportGenerator.ts` line 11 and `monthlyEmailGenerator.ts` line 32 both map gold to `770YUb...` which is USDC's icon
2. **SOL URL typo** in `emailReportGenerator.ts` line 15: `...IRFQ.png` (missing 'S', should be `...IRFSQ.png`)
3. **Missing assets** in `emailReportGenerator.ts`: no USDT YIELD FUND, no XRP, no USDC entries
4. **Incomplete branding logic** in `emailReportGenerator.ts` lines 416-420: missing EURC, USDC, XRP fund name mappings

## Solution

Centralize all fund icon URLs into `src/types/domains/report.ts` (already the most complete map) and have all other files import from there. Also update `ASSET_CONFIGS` in `src/types/asset.ts` with CDN URLs for XAUT and XRP.

---

## Changes

### 1. Update `src/types/domains/report.ts` - Add asset-code lookup helper

The existing `FUND_ICONS` map (keyed by fund display name) is already correct. Add:
- A `FUND_NAME_BY_ASSET` map: asset code to fund display name
- A `getFundIconByAsset(assetCode)` helper function

### 2. Update `src/types/asset.ts` - Fix XAUT and XRP logo URLs

Replace coingecko URLs with CDN URLs for XAUT and XRP to match the report icons:
- XAUT: use `eX8YQ2JiQtWXocPigWGSwju5WPTsGq01eOKmTx5p.png` (CDN)
- XRP: use `mlmOJ9qsJ3LDZaVyWnIqhffzzem0vIts6bourbHO.png` (CDN)

### 3. Fix `src/services/reports/emailReportGenerator.ts`

- Remove local `FUND_ICON_MAP` (lines 4-18)
- Import `FUND_ICONS` and `FUND_NAME_BY_ASSET` from `@/types/domains`
- Fix `getFundIcon()` to use the centralized map
- Fix branding logic (lines 416-420) to cover all 8 assets using `FUND_NAME_BY_ASSET`

### 4. Fix `src/lib/statements/monthlyEmailGenerator.ts`

- Remove local `FUND_ICONS` (lines 20-34)
- Import from `@/types/domains`

### 5. Fix `src/lib/pdf/statementGenerator.ts`

- Remove local `FUND_ICONS` (lines 8-17)
- Import `getFundIconByAsset` from `@/types/domains`
- Update icon lookup on line 222 to use `getFundIconByAsset(asset)`

### 6. `src/utils/statementPdfGenerator.ts` - Already correct

This file already imports `FUND_ICONS` from `@/types/domains` -- no change needed.

### 7. `src/components/reports/InvestorReportTemplate.tsx` - Already correct

Already imports from `@/types/domains` -- no change needed.

---

## Files Modified

| File | Change |
|------|--------|
| `src/types/domains/report.ts` | Add `FUND_NAME_BY_ASSET` map and `getFundIconByAsset()` helper |
| `src/types/asset.ts` | Update XAUT and XRP `logoUrl` to CDN URLs |
| `src/services/reports/emailReportGenerator.ts` | Remove local icon map, import centralized, fix branding logic for all 8 assets |
| `src/lib/statements/monthlyEmailGenerator.ts` | Remove local icon map, import centralized |
| `src/lib/pdf/statementGenerator.ts` | Remove local icon map, import centralized helper |

## Corrected Icon Map (Single Source of Truth)

```text
Asset   Fund Display Name       CDN Logo
-----   -----------------       --------
BTC     BTC YIELD FUND          8Pf2dt...
ETH     ETH YIELD FUND          iuulK6...
SOL     SOL YIELD FUND          14fmAP...IRFSQ  (fixes typo)
USDT    USDT YIELD FUND         2p3Y0l...
USDC    USDC YIELD FUND         770YUb...
EURC    EURC YIELD FUND         kwV87o...
XAUT    XAUT YIELD FUND         eX8YQ2...  (fixes wrong logo)
XRP     XRP YIELD FUND          mlmOJ9...
```

