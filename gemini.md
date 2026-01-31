# Project Constitution

## Data Schemas

### Stress Test Output Schema
```json
{
  "summary": {
    "total_tests": "integer",
    "passed": "integer",
    "failed": "integer",
    "ambiguous": "integer",
    "run_timestamp": "string (ISO 8601)"
  },
  "tests": [
    {
      "test_id": "string (UUID)",
      "description": "string",
      "entities": ["admin", "ib", "investor"],
      "input_data": {
        "fund_id": "string",
        "investor_ids": ["string"],
        "start_date": "string (YYYY-MM-DD)",
        "end_date": "string (YYYY-MM-DD)",
        "scenarios": ["string"]
      },
      "operations_run": [
        {
          "type": "deposit|withdrawal|fee|yield|crystallize|void",
          "params": "object",
          "timestamp": "string"
        }
      ],
      "expected_results": "object",
      "actual_results": "object",
      "pass": "boolean",
      "fail_reason": "string (optional)",
      "ambiguous": "boolean",
      "reconciliation_checks": [
        {
          "check_type": "string (e.g., 'ledger_vs_position')",
          "expected": "string/number",
          "actual": "string/number",
          "pass": "boolean",
          "error_detail": "string (optional)"
        }
      ],
      "db_queries": [
        {
          "query": "string",
          "results": "array/object"
        }
      ],
      "logs": "string"
    }
  ],
  "entity_views": {
    "admin": "object (Admin Portal View Data)",
    "ib": "object (IB Portal View Data)",
    "investor": "object (Investor Portal View Data)"
  }
}
```

## Behavioral Rules
1.  **Deterministic Execution:** All test data (UUIDs, amounts, dates) must be generated deterministically from a seed.
2.  **Direct DB Validation:** Validation must occur via SQL queries against the database, not just API responses.
3.  **Financial Precision:** All calculations must use arbitrary-precision decimal arithmetic (no floating point).
4.  **Idempotency:** The test suite should clean up after itself or run in a contained environment (e.g., test funds).
5.  **Extreme Case Coverage:** Explicitly include edge cases (high volumes, cross-month, dust).

## Architectural Invariants
1.  **Data-First:** Schema defined before tools.
2.  **Self-Annealing:** Analyze -> Patch -> Test -> Update SOP.
3.  **Layered Architecture:**
    - Layer 1: Architecture (SOPs in `architecture/`)
    - Layer 2: Navigation (Decision Logic)
    - Layer 3: Tools (`tools/` Python Scripts)