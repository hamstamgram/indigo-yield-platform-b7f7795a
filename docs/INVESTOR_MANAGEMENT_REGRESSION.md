# Investor Management Regression Checklist

**Last Updated:** 2024-12-21  
**Component:** Admin Investors Experience

---

## 1. Investor List Filters

| Test Case | Expected | Status |
|-----------|----------|--------|
| Search by name | Filters list to matching investors | ☐ |
| Search by email | Filters list to matching investors | ☐ |
| Filter by fund dropdown | Shows only investors with positions in selected fund | ☐ |
| Click "Active: N" quick filter | Shows only investors with positions (status=active) | ☐ |
| Click "No positions: N" quick filter | Shows only investors without positions (status=inactive) | ☐ |
| Filter by "Has IB" | Shows only investors with IB parent | ☐ |
| Filter by "Pending Withdrawals" | Shows only investors with pending withdrawal requests | ☐ |
| Clear filters button | Resets all filters to default | ☐ |
| URL persistence | Refreshing page preserves filter state | ☐ |
| Combined filters | Multiple filters work together correctly | ☐ |

---

## 2. Drawer/Detail Panel Tabs

| Test Case | Expected | Status |
|-----------|----------|--------|
| Click investor row | Opens detail panel on right side | ☐ |
| Overview tab loads | Shows key stats, positions summary, primary actions | ☐ |
| Transactions tab loads | Shows investor's transaction history (formerly Ledger) | ☐ |
| Positions tab loads | Shows all fund positions with values | ☐ |
| Withdrawals tab loads | Shows withdrawal requests scoped to investor | ☐ |
| Reports tab loads | Shows generated statements scoped to investor | ☐ |
| Settings tab loads | Shows IB settings, fee schedule, danger zone | ☐ |
| Tab order matches spec | Overview → Transactions → Positions → Withdrawals → Reports → Settings | ☐ |
| Compact mode icons | Icons visible, labels hidden on small screens | ☐ |
| Copy investor ID | Clicking copy button copies UUID to clipboard | ☐ |

---

## 3. Add Transaction Flow

| Test Case | Expected | Status |
|-----------|----------|--------|
| "Add Transaction" from Overview | Opens transaction form/dialog | ☐ |
| Transaction form validation | Requires fund, type, amount, date | ☐ |
| Submit subscription transaction | Creates transaction, updates positions | ☐ |
| Submit redemption transaction | Creates transaction, updates positions | ☐ |
| Transaction appears in Transactions tab | New transaction visible in list | ☐ |
| Position value updates | Position current_value reflects transaction | ☐ |

---

## 4. Generate Report Flow

| Test Case | Expected | Status |
|-----------|----------|--------|
| Navigate to Reports tab | Shows report generation UI | ☐ |
| Select period for report | Period dropdown populated with available periods | ☐ |
| Generate report button | Creates report without duplicates | ☐ |
| One report per period rule | Attempting duplicate shows error/warning | ☐ |
| Report appears in list | Generated report visible in Reports tab | ☐ |
| Download/view report | PDF or HTML renders correctly | ☐ |

---

## 5. Withdrawals Approval Flow

| Test Case | Expected | Status |
|-----------|----------|--------|
| Withdrawals tab shows pending | Pending requests visible with badge | ☐ |
| Approve withdrawal | Status changes to approved, triggers ledger update | ☐ |
| Reject withdrawal | Status changes to rejected with reason | ☐ |
| Complete withdrawal | Status changes to completed | ☐ |
| Position updates on completion | Investor balance reduced by withdrawal amount | ☐ |
| Auto-scoped to investor | Only shows current investor's withdrawals | ☐ |

---

## 6. Settings Updates

| Test Case | Expected | Status |
|-----------|----------|--------|
| IB parent assignment | Can assign IB parent to investor | ☐ |
| IB percentage update | Can modify IB commission percentage | ☐ |
| Fee schedule update | Can modify investor-specific fee rate | ☐ |
| Report recipients update | Can add/remove email recipients | ☐ |
| Changes persist on refresh | Settings saved to database correctly | ☐ |

---

## 7. Delete Investor Safety

| Test Case | Expected | Status |
|-----------|----------|--------|
| Delete NOT on Overview tab | No delete button in Overview | ☐ |
| Delete NOT on Transactions tab | No delete button in Transactions | ☐ |
| Delete NOT on Positions tab | No delete button in Positions | ☐ |
| Delete ONLY in Settings > Danger Zone | Delete button only in Settings tab | ☐ |
| AlertDialog confirmation required | Must confirm before deletion | ☐ |
| Force delete with positions | Shows warning about active positions | ☐ |
| Typed confirmation for force delete | Must type investor name or CONFIRM | ☐ |
| Successful deletion | Investor removed, panel closes, list refreshes | ☐ |

---

## 8. Full Profile Page (/admin/investors/:id)

| Test Case | Expected | Status |
|-----------|----------|--------|
| Breadcrumbs present | "Admin > Investors > {Name}" visible | ☐ |
| Back button works | Returns to /admin/investors with filters preserved | ☐ |
| Same tabs as drawer | All 6 tabs present with same components | ☐ |
| Richer table display | Tables have more columns/space | ☐ |
| Tab URL persistence | ?tab=transactions persists active tab | ☐ |

---

## 9. UX Safety

| Test Case | Expected | Status |
|-----------|----------|--------|
| No USD anywhere | All amounts in token denomination (BTC, ETH, etc.) | ☐ |
| Empty state guidance | No positions shows checklist + "Add Transaction" CTA | ☐ |
| No duplicate CTAs | Header and body don't repeat same action | ☐ |
| Loading states | Skeleton/spinner during data fetches | ☐ |
| Error states | Clear error messages with retry option | ☐ |

---

## Files Involved

| File | Purpose |
|------|---------|
| `src/routes/admin/UnifiedInvestorsPage.tsx` | Investor list with 2-panel layout |
| `src/components/admin/investors/InvestorDetailPanel.tsx` | Right-side detail panel |
| `src/components/admin/investors/InvestorTabs.tsx` | Unified tab system |
| `src/components/admin/investors/InvestorOverviewTab.tsx` | Overview stats and actions |
| `src/components/admin/investors/InvestorLedgerTab.tsx` | Transaction history (now "Transactions" tab) |
| `src/components/admin/investors/InvestorPositionsTab.tsx` | Fund positions |
| `src/components/admin/investors/InvestorWithdrawalsTab.tsx` | Withdrawal management |
| `src/components/admin/investors/InvestorReportsTab.tsx` | Report generation |
| `src/components/admin/investors/InvestorSettingsTab.tsx` | Settings + Danger Zone |
| `src/routes/admin/investors/InvestorManagement.tsx` | Full profile page |

---

## Regression Test Commands

```bash
# Verify no delete buttons outside Settings
grep -r "Delete.*Investor" src/components/admin/investors/*.tsx | grep -v Settings

# Verify no USD references in investor components
grep -rE "USD|\\\$[0-9]|formatCurrency.*USD" src/components/admin/investors/

# Verify tab naming consistency
grep -E "Ledger|Transactions" src/components/admin/investors/InvestorTabs.tsx
```

---

## Sign-off

| Role | Name | Date |
|------|------|------|
| Developer | | |
| QA | | |
| Product | | |
