# Unresolved Ambiguities Requiring Manual Review for Indigo Fund Data Migration

This document lists specific points of ambiguity identified during the financial audit and data migration analysis that require clarification and manual review by a subject matter expert or fund administrator. Addressing these points is crucial for ensuring the accuracy and completeness of the data imported into the Indigo Yield Platform.

## 1. Investor Name Confirmation
- **Ambiguity**: The alias "Blondish" was found in the Excel sheet `Done - ETH TAC Program` and was mapped to "Vivie-Ann Bakos" based on visual correlation with PDF reports.
- **Action Required**: **Confirm definitively** that "Blondish" refers to "Vivie-Ann Bakos". This is critical for accurate investor attribution. Similar confirmations are needed for shortened names like "Jose" and "Kyle".

## 2. Role and Utility of "Calculus" Sheet
- **Ambiguity**: The `Calculus` sheet appears to contain a summary of investor holdings by asset but its exact purpose (e.g., current snapshot, working sheet for calculations, deprecated data) and update frequency are unclear.
- **Action Required**: Clarify the intended use and validity of the `Calculus` sheet. Should its data be imported as a "current balance" snapshot, or is it solely for internal calculations and not suitable for platform ingestion?

## 3. Identification and Tracking of Redemptions
- **Ambiguity**: While capital contributions are clearly structured in the `Investments` sheet, explicit, structured records of investor redemptions (withdrawals) were not found. Some mentions of "Withdrawal" were found in unstructured comments within the "Yield Fund" sheets.
- **Action Required**: Provide a clear source or methodology for identifying and tracking investor redemptions. If no structured data exists, manual review of comments/notes to identify these transactions will be necessary, or a policy for deriving them from net balance changes.

## 4. Handling of "#REF!" in "USD Value"
- **Ambiguity**: The `USD Value` column in the `Investments` sheet consistently showed `#REF!` errors in the extracted data.
- **Action Required**: Specify how this column should be handled. Should the system attempt to recalculate the USD value based on historical exchange rates at the `Investment Date`, or should these values be manually provided/corrected? If left blank, what is the implication for reporting?

## 5. Interpretation of Future Dates in Excel Column Headers
- **Ambiguity**: Some "Yield Fund" sheets contain column headers formatted as `datetime` objects that represent dates seemingly in the future relative to the last reported period (e.g., November/December 2025 data in sheets associated with January 2025 reports).
- **Action Required**: Clarify whether these "future" dated columns are projections, placeholders, or represent actual data for which reports are not yet available. If they are projections, they should be clearly marked as such or excluded from "actual" holdings data.

## 6. Full Historical Transaction Data for Fees and Yield
- **Ambiguity**: While "Net Performance" is available in monthly snapshots, the granular, per-investor, per-transaction breakdown of fees charged and yield distributed (distinct from overall performance) is not explicitly detailed in structured form for all periods.
- **Action Required**: Confirm if granular historical fee and yield transaction data (to populate the `transactions` table with `type='fee'` and `type='yield'`) is required for the platform. If so, a more detailed extraction methodology might be needed from the performance calculation sheets, or manual reconciliation might be necessary.

## 7. Investor Addresses
- **Ambiguity**: Investor addresses are present in the PDF reports but require optical character recognition (OCR) and manual validation for extraction.
- **Action Required**: Determine the priority and method for extracting investor addresses. If required, a manual process or a more advanced OCR solution specifically tailored for these PDFs will be needed.

---
End of Document
