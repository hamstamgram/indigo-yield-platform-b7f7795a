# No USD Enforcement

## Current State

The INDIGO platform is token-denominated only. No USD, $, or fiat values are displayed.

## Verification Commands

```bash
# Scan investor-facing code for USD patterns
rg -i '\$|USD|eur|€|fiat' \
  src/routes/investor \
  src/routes/dashboard \
  src/components/investor

# Check for currency formatters
rg 'formatCurrency|toLocaleString.*currency' \
  src/routes/investor \
  src/routes/dashboard
```

## Expected Results

Both commands should return 0 matches in investor-facing code.

## CI Check Recommendation

Add to CI pipeline:

```yaml
- name: No USD Check
  run: |
    if rg -i '\$[0-9]|USD|formatCurrency' src/routes/investor src/routes/dashboard; then
      echo "ERROR: USD formatting detected in investor-facing code"
      exit 1
    fi
```

## Code Standards

1. All amounts displayed with token symbol (e.g., "0.5 BTC", "100 USDC")
2. Use `getAssetConfig(assetCode).symbol` for token symbols
3. Never use `toLocaleString` with currency options
4. Never hardcode "$" or "USD" in display code
