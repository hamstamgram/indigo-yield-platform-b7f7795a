# Financial Formatting Guidelines

## The Rule

Monetary values are stored as `string` (or `FinancialString`) with `NUMERIC(38,18)` precision from PostgreSQL. **Never convert them to JavaScript `number`.**

JavaScript `number` uses IEEE 754 double-precision (64-bit), which only guarantees ~15 significant digits of precision. PostgreSQL `NUMERIC(38,18)` preserves 38 significant digits with 18 decimal places. Converting a monetary value to `number` loses precision silently.

## Examples of the Problem

```typescript
// JavaScript native number: precision loss
const a = 12345678.901234567;
const b = 0.1 + 0.2;
console.log(a); // 12345678.901234568 (last digit rounded)
console.log(b); // 0.30000000000000004

// Decimal.js: exact precision
import Decimal from "decimal.js";
const d = new Decimal("12345678.901234567");
console.log(d.toString()); // "12345678.901234567" (exact)
```

## DO

```typescript
import { parseFinancial, formatFinancialDisplay } from "@/utils/financial";
import { formatAssetAmount } from "@/utils/assets";
import { fromDbValue } from "@/types/financial";

// For arithmetic: use parseFinancial (returns Decimal)
const balance = parseFinancial(position.current_value);
const fee = parseFinancial(feeAmount);
const net = balance.minus(fee);

// For display: use formatAssetAmount (adds commas, symbol, preserves precision)
const display = formatAssetAmount(net.toString(), "BTC");
// => "12,345,678.90123456 BTC"

// For bare number display (no symbol): use formatFinancialDisplay
const numberOnly = formatFinancialDisplay(net.toString(), 8);
// => "12,345,678.90123456"

// For type safety: use FinancialString
const amount: FinancialString = fromDbValue(dbRow.amount);
```

## DON'T

```typescript
// Precision loss
toNum(amount);
toNumber(amount);
Number(amount);
parseFloat(amount);

// No-op on strings (no thousand separators)
amount.toLocaleString();

// Strips trailing zeros
parseFinancial(amount).toFixed(); // no args = strips zeros

// Also loses precision
parseFinancial(amount).toNumber();
```

## Common Patterns

### Displaying an amount in JSX
```tsx
// Bad
{toNum(withdrawal.requested_amount).toLocaleString()}

// Good
{formatAssetAmount(withdrawal.requested_amount, withdrawal.asset)}
```

### Input field value
```tsx
// Bad — strips trailing zeros
setValue("amount", parseFinancial(maxAmount).toFixed());

// Good — preserves raw string
setValue("amount", String(maxAmount));
```

### Comparison / validation
```tsx
// Bad
if (Number(requestedAmount) > Number(availableBalance)) { ... }

// Good
if (parseFinancial(requestedAmount).gt(parseFinancial(availableBalance))) { ... }
```

### Aggregation (sum, avg)
```tsx
// Bad
const total = values.reduce((a, b) => a + toNum(b), 0);

// Good
import { sumFinancials } from "@/utils/financial";
const total = sumFinancials(values);
```

## Enforcement

The ESLint rule `no-native-number-on-money` catches common mistakes in pre-commit. If you hit a false positive (e.g., `toNum(count)` for a non-monetary count), rename the variable to avoid monetary patterns: `itemCount` instead of `amountCount`.
