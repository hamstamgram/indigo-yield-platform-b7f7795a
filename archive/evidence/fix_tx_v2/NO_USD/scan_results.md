# NO USD Scan Results

Generated: 2025-12-22

## Scan Command

```bash
# Searched for USD patterns in investor and IB routes
grep -E '\$|USD|formatCurrency|toLocaleString.*currency' src/routes/investor/**/*.tsx src/routes/ib/**/*.tsx
```

## Results Summary

### Investor Routes: ✅ PASS

| File | Match Count | Analysis |
|------|-------------|----------|
| InvestorTransactionsPage.tsx | 4 | Template strings `${...}` - NOT USD |
| NotificationsPage.tsx | 1 | Template string - NOT USD |
| StatementsPage.tsx | 3 | Comment explaining to NOT use USD + toLocaleString for decimal formatting |
| InvestorOverviewPage.tsx | 1 | Template string - NOT USD |
| InvestorPortfolioPage.tsx | 1 | Template string - NOT USD |
| FundDetailsPage.tsx | 3 | Template strings - NOT USD |

**Conclusion**: All matches are false positives (template literals). No actual USD symbols displayed.

### IB Routes: ✅ PASS

| File | Match Count | Analysis |
|------|-------------|----------|
| IBReferralsPage.tsx | 5 | Template strings - NOT USD |
| IBReferralDetailPage.tsx | 7 | Template strings + fallback asset defaults |
| IBPayoutHistoryPage.tsx | 1 | Fallback `"USDT"` for unknown assets |
| IBCommissionsPage.tsx | 5 | Template strings - NOT USD |
| IBDashboard.tsx | 8 | Comment "no USD conversion" + fallback defaults |
| IBOverviewPage.tsx | 1 | Template string - NOT USD |

**Conclusion**: 
- All "$" matches are JavaScript template literals `${...}`
- "USDT" references are fallback asset codes (stablecoin ticker, not fiat USD)
- Explicit comment confirms "no USD conversion" design

## Verification: Token-Denominated Only

All investor-facing values display in native token units:
- BTC funds → amounts in BTC
- ETH funds → amounts in ETH  
- USDT funds → amounts in USDT (stablecoin, not fiat USD display)

No currency formatting (e.g., "$1,234.56") is applied to any investor-visible amounts.
