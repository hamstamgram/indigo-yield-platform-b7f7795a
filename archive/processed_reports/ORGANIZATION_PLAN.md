# Indigo Yield Platform - Data Organization Plan

## Overview
This plan organizes investment data from raw CSV logs into individual, structured JSON files suitable for Supabase ingestion.
Each file represents a unique investor entity and contains their profile, transaction history, and calculated summaries.

## Data Structure
- **Root Directory:** `indigo-yield-platform-v01/processed_reports/`
- **Format:** JSON
- **Schema:**
  ```json
  {
    "profile": { "emails": [...] },
    "transactions": [ { "date": "...", "currency": "...", "amount": 0.0, "usd_value": 0.0, ... } ],
    "summary": { "currencies": { "BTC": 0.0, ... }, "total_usd_value": 0.0 }
  }
  ```

## Processed Investors
| Investor Name | File Name | Transactions | Net USD Value (Est.) |
|---|---|---|---|| Sam Johnson | `Sam_Johnson.json` | 12 | $2,280,333.85 |
| Monica Levy Chicheportiche | `Monica_Levy_Chicheportiche.json` | 1 | $840,168.03 |
| Tomer Zur | `Tomer_Zur.json` | 10 | $752,239.59 |
| Blondish | `Blondish.json` | 3 | $660,566.81 |
| Jose Molla | `Jose_Molla.json` | 13 | $510,428.20 |
| Kabbaj | `Kabbaj.json` | 4 | $497,005.33 |
| Thomas Puech | `Thomas_Puech.json` | 1 | $412,864.01 |
| Babak Eftekhari | `Babak_Eftekhari.json` | 10 | $409,358.40 |
| Vivie & Liana | `Vivie__Liana.json` | 1 | $375,863.41 |
| Matthew Beatty | `Matthew_Beatty.json` | 4 | $334,704.00 |
| Nath & Thomas | `Nath__Thomas.json` | 3 | $322,170.33 |
| Matthias Reiser | `Matthias_Reiser.json` | 1 | $292,582.29 |
| Bo Kriek | `Bo_Kriek.json` | 1 | $273,807.00 |
| Oliver Loisel | `Oliver_Loisel.json` | 1 | $244,870.73 |
| Anne Cecile Noique | `Anne_Cecile_Noique.json` | 1 | $222,687.00 |
| Terance Chen | `Terance_Chen.json` | 1 | $219,747.00 |
| Danielle Richetta | `Danielle_Richetta.json` | 7 | $204,896.61 |
| Dario Deiana | `Dario_Deiana.json` | 1 | $199,659.72 |
| Alain Bensimon | `Alain_Bensimon.json` | 1 | $136,737.00 |
| Nathanaël Cohen | `Nathanaël_Cohen.json` | 8 | $131,785.02 |
| Brandon Hood | `Brandon_Hood.json` | 1 | $120,970.88 |
| Advantage Blockchain | `Advantage_Blockchain.json` | 1 | $118,294.72 |
| Daniele Francilia | `Daniele_Francilia.json` | 1 | $109,776.00 |
| Julien Grunebaum | `Julien_Grunebaum.json` | 1 | $109,392.00 |
| Pierre Bezencon | `Pierre_Bezencon.json` | 1 | $109,333.00 |
| Sacha Oshry | `Sacha_Oshry.json` | 1 | $100,000.00 |
| Rabih Mokbel | `Rabih_Mokbel.json` | 1 | $100,000.00 |
| Halley86 | `Halley86.json` | 1 | $99,990.00 |
| Valeria Cruz | `Valeria_Cruz.json` | 1 | $50,000.00 |
| Victoria | `Victoria.json` | 1 | $12,316.30 |
| Paul Johnson | `Paul_Johnson.json` | 9 | $10,622.99 |
| Indigo Ventures | `Indigo_Ventures.json` | 3 | $2,405.45 |
| Indigo Fees | `Indigo_Fees.json` | 1 | $138.58 |
| Kyle Gulamerian | `Kyle_Gulamerian.json` | 3 | $-102,857.03 |
| Indigo Digital Asset Fund Lp | `Indigo_Digital_Asset_Fund_Lp.json` | 6 | $-195,130.92 |
