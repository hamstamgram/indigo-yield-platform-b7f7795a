# Final Data Mapping (Supabase)

## 1. Funds
| Excel Source | Supabase `funds` Table | Asset | Notes |
| :--- | :--- | :--- | :--- |
| BTC Yield Fund | `BTC Yield Fund` | BTC | Core Fund |
| ETH Yield Fund | `ETH Yield Fund` | ETH | Core Fund |
| DONE - BTC Boosted Program | `BTC Boosted Program` | BTC | Legacy/Closed |
| Done - ETH TAC Program | `ETH TAC Program` | ETH | Legacy/Closed |
| USDT Yield Fund | `USDT Yield Fund` | USDT | Core Fund |
| SOL Yield Fund | `SOL Yield Fund` | SOL | Core Fund |
| XRP Yield Fund | `XRP Yield Fund` | XRP | Core Fund |

## 2. Transactions (`transactions_v2`)

| Transaction Type | `tx_type` Enum | Description |
| :--- | :--- | :--- |
| Initial Investment | `deposit` | From `Investments` sheet. |
| Net Yield Distribution | `yield` | Derived from monthly balance increase. |
| Capital Withdrawal | `withdrawal` | Derived from monthly balance decrease (exceeding negative yield). |
| Manual Adjustment | `deposit` / `withdrawal` | For reconciliation deltas. |

## 3. Entity Mapping

| Alias (Excel) | Canonical Name (Supabase) | Email (if available) |
| :--- | :--- | :--- |
| Blondish | Vivie-Ann Bakos | *Lookup in Investments* |
| Mathias | Matthias Reiser | matthias@xventures.de |
| Jose | Jose Molla | *Lookup in Investments* |
| Nathanael | Nathanael Cohen | *Lookup in Investments* |
| Kyle | Kyle Gulamerian | *Lookup in Investments* |
| Danielle | Danielle Richetta | danielle@iamfashion-st.com |

## 4. Technical Schema Constraints
*   `investors.email` is UNIQUE. If email missing, generate placeholder `firstname.lastname@placeholder.indigo.fund`.
*   `transactions_v2.amount`: `NUMERIC(28,10)`.
*   `funds.code`: Must be unique. Generate codes like `BTC-BST-01` for boosted programs.
