

# Add Asset Logos to IB Management Pages

## Summary

The IB Management page currently displays asset earnings as plain text (e.g., "0.0012 BTC, 1.50 USDT") without logos. This update will add CryptoIcon logos next to asset amounts and remove redundant ticker text where logos are already present.

## Changes Required

### File 1: `src/features/admin/ib/pages/IBManagementPage.tsx`

#### Change 1: Update Total IB Earnings card (lines 188-197)

**Current:**
```tsx
{Object.entries(allEarningsByAsset).map(([asset, amount]) => (
  <div key={asset} className="text-lg font-semibold font-mono">
    {formatCrypto(amount, 4, asset)}
  </div>
))}
```

**Updated:**
```tsx
{Object.entries(allEarningsByAsset).map(([asset, amount]) => (
  <div key={asset} className="flex items-center gap-2 text-lg font-semibold font-mono">
    <CryptoIcon symbol={asset} className="h-5 w-5" />
    {formatCrypto(amount, 4, asset)}
  </div>
))}
```

#### Change 2: Update Earnings column in IB table (lines 290-292)

Replace the simple text-based `formatEarningsDisplay` output with a flex container that includes logos.

**Current:**
```tsx
<TableCell className="text-right font-mono text-sm">
  {formatEarningsDisplay(ib.earningsByAsset)}
</TableCell>
```

**Updated:**
```tsx
<TableCell className="text-right">
  <div className="flex flex-wrap items-center justify-end gap-2">
    {Object.entries(ib.earningsByAsset).length === 0 ? (
      <span className="text-muted-foreground">—</span>
    ) : (
      Object.entries(ib.earningsByAsset).map(([asset, amount]) => (
        <div key={asset} className="flex items-center gap-1">
          <CryptoIcon symbol={asset} className="h-4 w-4" />
          <span className="font-mono text-sm">{formatCrypto(amount, 4, asset)}</span>
        </div>
      ))
    )}
  </div>
</TableCell>
```

#### Change 3: Remove unused `formatEarningsDisplay` function (lines 87-92)

This function will no longer be needed since we're replacing it with inline rendering that includes logos.

---

### File 2: `src/features/admin/ib/pages/IBPayoutsPage.tsx`

#### Change 1: Remove redundant asset ticker text (line 133)

**Current:**
```tsx
<div key={asset} className="flex items-center gap-2">
  <CryptoIcon symbol={asset} className="h-4 w-4" />
  <span className="text-lg font-bold">{formatAssetAmount(amount, asset)}</span>
  <span className="text-xs text-muted-foreground">{asset}</span>  {/* REDUNDANT */}
</div>
```

**Updated:**
```tsx
<div key={asset} className="flex items-center gap-2">
  <CryptoIcon symbol={asset} className="h-4 w-4" />
  <span className="text-lg font-bold">{formatAssetAmount(amount, asset)}</span>
</div>
```

The `formatAssetAmount` function already appends the asset symbol (e.g., "1,500.00 BTC"), so the separate `{asset}` text is redundant when a logo is present.

---

## Visual Summary

```text
BEFORE (IBManagementPage - Total IB Earnings card):
┌────────────────────────┐
│ Total IB Earnings      │
│ 0.0012 BTC            │  <- No logo
│ 1.50 USDT             │  <- No logo
└────────────────────────┘

AFTER:
┌────────────────────────┐
│ Total IB Earnings      │
│ [₿] 0.0012 BTC        │  <- With logo
│ [T] 1.50 USDT         │  <- With logo
└────────────────────────┘


BEFORE (IBManagementPage - IB Table Earnings column):
┌──────────────────┐
│ 0.0012 BTC       │  <- Plain text, no logo
└──────────────────┘

AFTER:
┌──────────────────────┐
│ [₿] 0.0012 BTC       │  <- Logo + amount
│ [T] 1.50 USDT        │  <- Logo + amount (if multiple assets)
└──────────────────────────┘


BEFORE (IBPayoutsPage - Total Commission card):
┌────────────────────────────────┐
│ [₿] 0.0012 BTC  BTC           │  <- Redundant "BTC" text
└────────────────────────────────┘

AFTER:
┌────────────────────────────────┐
│ [₿] 0.0012 BTC                │  <- Clean with logo only
└────────────────────────────────┘
```

---

## Files to Modify

| File | Lines | Change |
|------|-------|--------|
| `IBManagementPage.tsx` | 87-92 | Remove unused `formatEarningsDisplay` function |
| `IBManagementPage.tsx` | 193-196 | Add CryptoIcon to Total IB Earnings card |
| `IBManagementPage.tsx` | 290-292 | Replace text earnings with logo + amount flex layout |
| `IBPayoutsPage.tsx` | 133 | Remove redundant `{asset}` text after amount |

---

## Testing

After implementation:
1. Navigate to `/admin/ib-management`
2. Verify Total IB Earnings card shows logos next to each asset amount
3. Verify IB table Earnings column shows logos next to each asset amount
4. Navigate to `/admin/ib-payouts`
5. Verify Total Commission card shows logos without redundant ticker text

