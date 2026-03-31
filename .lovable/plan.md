

# Fix Build Error: Stray Ellipsis in AdminManualTransaction.tsx

## Problem

The build fails because line 48 of `AdminManualTransaction.tsx` contains a literal `...` which is not valid TypeScript. This is between the last import and the first code block.

## Fix

Remove line 48 (`...`). The file should go directly from the `import Decimal` line to the comment/schema definition.

### Change
```
// Before (line 47-49):
import Decimal from "decimal.js";
...
// Form Schema — clean transaction form

// After:
import Decimal from "decimal.js";

// Form Schema — clean transaction form
```

Single line deletion. No other changes needed.

