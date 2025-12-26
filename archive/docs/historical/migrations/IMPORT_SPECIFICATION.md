# Import Specification Document for Indigo Yield Platform Engine (Supabase Aligned)

This document outlines the normalized data structure and import process for integrating investor records into the Indigo Yield Platform Supabase database. It is aligned with the existing Supabase schema.

## 1. Target Data Model (Supabase Public Schema)

### 1.1. `investors` Table
Target for investor profiles.
*   **Match Logic**: Check if investor exists by `email`. If yes, update/skip. If no, create.
*   **Schema Mapping**:
    *   `id`: Generate new UUID.
    *   `name`: Normalized Name (from Excel).
    *   `email`: Email (from `Investments` sheet).
    *   `status`: Set to 'active'.
    *   `kyc_status`: Default to 'pending' or 'approved' if known.
    *   `profile_id`: Link to `auth.users` if user exists (optional for initial data load).

### 1.2. `funds` Table
Target for fund/program details.
*   **Match Logic**: Check if fund exists by `name` or `code`.
*   **Schema Mapping**:
    *   `id`: Use existing UUID if found, or generate new.
    *   `name`: Mapped from Excel Sheet Name.
    *   `asset`: 'BTC', 'ETH', 'USDT', etc.
    *   `fund_class`: Same as asset (e.g., 'BTC').
*   **Fund Mapping Table**:
    *   "BTC Yield Fund" -> `funds` (Asset: BTC)
    *   "ETH Yield Fund" -> `funds` (Asset: ETH)
    *   "DONE - BTC Boosted Program" -> **New Fund Entry** or map to "BTC Yield Fund" with specific note/tag? *Recommendation: Create new fund record for distinct tracking.*
    *   "Done - ETH TAC Program" -> **New Fund Entry** or map to "ETH Yield Fund"? *Recommendation: Create new fund record.*

### 1.3. `transactions_v2` Table
Target for all capital movements.
*   **Schema Mapping**:
    *   `id`: Generate UUID.
    *   `investor_id`: UUID from `investors` table.
    *   `fund_id`: UUID from `funds` table.
    *   `tx_date`: Transaction Date (`Investment Date` or Report Date).
    *   `value_date`: Same as `tx_date`.
    *   `type`: Map to `tx_type` enum ('deposit', 'withdrawal', 'yield', 'fee').
    *   `amount`: Transaction Amount.
    *   `balance_after`: Calculated running balance.
    *   `asset`: Fund asset currency ('BTC', 'ETH').
    *   `status`: 'approved'.

### 1.4. `daily_nav` Table
Target for fund performance history.
*   **Schema Mapping**:
    *   `fund_id`: UUID from `funds` table.
    *   `nav_date`: Report Date.
    *   `aum`: Fund AUM from report.
    *   `gross_return_pct`: `Gross Performance (%)`.
    *   `net_return_pct`: `Net Performance` / AUM (calculate percentage).

### 1.5. `investor_positions` Table
Target for **current** state snapshot.
*   **Schema Mapping**:
    *   `investor_id`: UUID from `investors`.
    *   `fund_id`: UUID from `funds`.
    *   `shares`: Equivalent to Balance (if 1 share = 1 unit of asset).
    *   `current_value`: Balance * Price (USD).
    *   `updated_at`: Timestamp of import.

## 2. Import Process Guidelines

### 2.1. Pre-processing
1.  **Extract Data**: Use `extracted_data.json` and `INVESTOR_DATA_SUMMARY.json`.
2.  **Name Normalization**: Apply the mapping rules (Blondish -> Vivie-Ann Bakos, etc.).

### 2.2. Loading Order
1.  **`funds`**: Verify "BTC Yield Fund" and "ETH Yield Fund" exist. **Create missing funds** ("BTC Boosted", "ETH TAC") if they represent distinct pools in the accounting.
2.  **`investors`**: Insert unique investors.
3.  **`transactions_v2`**:
    *   Import **Contributions** from `Investments` sheet -> `type: deposit`.
    *   Import **Monthly Balances** as "Adjustment" or "Yield" transactions?
        *   *Better Strategy*: Calculate the *difference* between monthly balances.
        *   If Balance(T) > Balance(T-1), difference is Yield (or Deposit).
        *   If Balance(T) < Balance(T-1), difference is Fee or Withdrawal.
        *   *Constraint*: Without explicit transaction logs, we must infer transactions from balance changes in `investor_fund_holdings` derived from monthly reports.
4.  **`daily_nav`**: Insert monthly performance rows for each fund.
5.  **`investor_positions`**: Update with the latest known balance for each investor/fund pair.

### 2.3. Validation
*   **Sum Check**: Sum(`investor_positions.shares`) for a fund should match `daily_nav.aum` (if AUM is in crypto units) or be close to it.
*   **Cross-Reference**: Randomly check 3 investors against their latest PDF report.

---
End of Document