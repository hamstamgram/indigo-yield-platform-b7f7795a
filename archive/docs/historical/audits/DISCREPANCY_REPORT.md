# Discrepancy Report for Indigo Fund Investor Records

This report outlines discrepancies and observations made during the financial audit and data migration analysis of the Indigo Fund investor records, comprising monthly PDF reports and a master Excel accounting file (`Copy of Accounting Yield Funds.xlsx`).

## 1. Investor Name Normalization
- **Discrepancy**: Investor names in the Excel file exhibit inconsistencies and informal aliases compared to formal names found in PDF reports.
  - **"Blondish"**: Appears in `Done - ETH TAC Program` sheet. Cross-referenced with `Vivie-Ann Bakos` from PDF reports.
  - **"Mathias"**: Appears in `DONE - BTC Boosted Program` sheet. Cross-referenced with `Matthias Reiser` from PDF reports (possible typo).
  - **"Jose"**: Appears in `Done - ETH TAC Program` sheet. Cross-referenced with `Jose Molla` from PDF reports.
  - **"Nathanael"**: Appears in `Done - ETH TAC Program` sheet. Cross-referenced with `Nathanael Cohen` from PDF reports.
  - **"Kyle"**: Appears in `DONE - BTC Boosted Program` sheet. Cross-referenced with `Kyle Gulamerian` from PDF reports.
- **Impact**: Inconsistent investor identification across data sources, potentially leading to fragmented records and incorrect data aggregation.
- **Citation**: Various rows in 'Done - ETH TAC Program', 'DONE - BTC Boosted Program', and 'BTC Yield Fund' sheets in `Copy of Accounting Yield Funds.xlsx`. Names like "Blondish" are found in column 8 of respective sheets.
- **Recommendation**: Implement a robust name normalization strategy during data ingestion, creating a canonical investor ID and name.

## 2. Data Precision
- **Observation**: The Excel source data often contains higher precision (more decimal places) for financial figures compared to the monthly PDF reports.
- **Impact**: Rounding differences in reports vs. underlying data could lead to minor reconciliation discrepancies if not handled consistently.
- **Recommendation**: During import, store figures with the highest available precision (e.g., using `DECIMAL(20, 8)` or equivalent) and apply consistent rounding rules for display/reporting.

## 3. Excel Column Header Ambiguity (Date/Investor/Transaction)
- **Observation**: In sheets like `BTC Yield Fund`, `DONE - BTC Boosted Program`, and `Done - ETH TAC Program`, column headers beyond the initial descriptive columns (Date, AUM, etc.) are often formatted as `datetime` objects (e.g., `2025-02-01 00:00:00`). These columns represent monthly snapshots of investor holdings for that period.
- **Discrepancy**: The initial interpretation of these columns was challenging due to their date format, whereas they represent investor-specific data points for the period ending on the preceding month.
- **Impact**: Potential misinterpretation of data structure and incorrect mapping of data points during automated extraction.
- **Recommendation**: Develop a clear parsing logic that maps these date-formatted column headers to their corresponding reporting periods and correctly associates values with investors and funds.

## 4. Unstructured Transactional Data
- **Observation**: While the `Investments` sheet captures initial capital contributions cleanly, explicit "Redemptions" were not found in a structured format. Some textual comments in `ETH Yield Fund` (e.g., Row 6 comments) mention "Withdrawal from INDIGO Main fund", suggesting that some transactional data might be embedded in unstructured text.
- **Impact**: Difficulty in fully capturing the historical flow of funds (contributions and redemptions) for each investor without manual review of text fields.
- **Recommendation**: Prioritize the `Investments` sheet for contributions. For redemptions, a robust search through comments/notes across all sheets might be necessary if they are not recorded elsewhere. This requires manual review for accuracy.

## 5. "USD Value" in Investments Sheet
- **Discrepancy**: The `USD Value` column in the `Investments` sheet consistently shows `#REF!` errors in the extracted data.
- **Impact**: Inability to immediately ascertain the USD equivalent of investments made in other currencies (BTC, ETH).
- **Recommendation**: This value needs to be either recalculated based on historical exchange rates at the `Investment Date` or flagged as data requiring manual correction/lookup.

## 6. PDF Data Extraction Challenges
- **Observation**: Extracting data from PDF reports using OCR is inherently prone to errors and requires careful parsing of unstructured text for validation.
- **Impact**: Automated reconciliation with Excel data based purely on OCR text could be unreliable without significant error handling and validation logic.
- **Recommendation**: The current validation relied on manual confirmation of key figures. For a full automated audit, a dedicated PDF parsing solution (or template-based extraction) would be required, or the Excel file should be considered the primary source of truth for numerical data.

---
End of Report
