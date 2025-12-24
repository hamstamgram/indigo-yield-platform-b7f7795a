"""
Ingestion helper for fund AUM, investments, and per-investor statements.

Sources:
  - Excel: archive/REPORTS/Copy of Accounting Yield Funds.xlsx
    * Fund sheets: BTC/ETH/USDT/SOL/XRP Yield Fund (daily/monthly AUM)
    * Program sheets: DONE - BTC Boosted Program, DONE - BTC TAC Program, Done - ETH TAC Program (closed programs)
    * Investments sheet: per-investor contributions by currency
  - JSON statements: archive/processed_reports/*.json (per-investor, per-period; net of fees)
  - Fees: archive/processed_reports/Indigo_Fees.json (if present)

Outputs (written to archive/processed_reports/output/ as CSVs):
  - fund_daily_aum.csv: fund_code, as_of_date, total_aum, source
  - investments.csv: investor_name, currency, amount, investment_date
  - statements_perf.csv: investor_name, fund_code, period_end_date, begin_balance, contributions,
    withdrawals, gross_return, fees, net_return, end_balance
  - fee_schedule.csv: investor_name, fund_code, effective_date, fee_pct (from fees file or inferred)

Note: This script does not write to the database. It produces normalized CSVs to be reviewed
and then loaded via SQL COPY or a dedicated loader.
"""

import json
from pathlib import Path
from datetime import datetime
import pandas as pd

ROOT = Path(__file__).resolve().parent.parent
EXCEL_PATH = ROOT / "archive" / "REPORTS" / "Copy of Accounting Yield Funds.xlsx"
STATEMENTS_DIR = ROOT / "archive" / "processed_reports"
OUTPUT_DIR = STATEMENTS_DIR / "output"

FUND_SHEETS = {
    "BTC Yield Fund": "IND-BTC",
    "ETH Yield Fund": "IND-ETH",
    "USDT Yield Fund": "IND-USDT",
    "SOL Yield Fund": "IND-SOL",
    "XRP Yield Fund": "IND-XRP",
}

PROGRAM_SHEETS = {
    "DONE - BTC Boosted Program": "IND-BTC",
    "DONE - BTC TAC Program": "IND-BTC",
    "Done - ETH TAC Program": "IND-ETH",
}


def ensure_output():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)


def parse_fund_aum():
    xl = pd.ExcelFile(EXCEL_PATH)
    rows = []

    def add_rows(sheet_name: str, fund_code: str, source: str):
        df = xl.parse(sheet_name)
        # Expect columns: Date, AUM, possibly more columns (flows/returns)
        if "Date" not in df.columns or "AUM" not in df.columns:
            return
        for _, r in df.iterrows():
            date_val = r["Date"]
            aum_val = r["AUM"]
            if pd.isna(date_val) or pd.isna(aum_val):
                continue
            try:
                as_of_date = pd.to_datetime(date_val).date()
                total_aum = float(aum_val)
            except Exception:
                continue
            rows.append(
                {
                    "fund_code": fund_code,
                    "as_of_date": as_of_date.isoformat(),
                    "total_aum": total_aum,
                    "source": source,
                }
            )

    for sheet, code in FUND_SHEETS.items():
        if sheet in xl.sheet_names:
            add_rows(sheet, code, "ingested")
    for sheet, code in PROGRAM_SHEETS.items():
        if sheet in xl.sheet_names:
            add_rows(sheet, code, "program_closed")

    out = pd.DataFrame(rows)
    out.sort_values(["fund_code", "as_of_date"], inplace=True)
    out.to_csv(OUTPUT_DIR / "fund_daily_aum.csv", index=False)


def parse_investments():
    xl = pd.ExcelFile(EXCEL_PATH)
    if "Investments" not in xl.sheet_names:
        return
    df = xl.parse("Investments")
    cols = {c.lower(): c for c in df.columns}
    rows = []
    for _, r in df.iterrows():
        name = r.get(cols.get("investor name"))
        currency = r.get(cols.get("currency"))
        amt = r.get(cols.get("amount"))
        date_val = r.get(cols.get("investment date"))
        if pd.isna(name) or pd.isna(currency) or pd.isna(amt) or pd.isna(date_val):
            continue
        try:
            investment_date = pd.to_datetime(date_val).date().isoformat()
        except Exception:
            continue
        rows.append(
            {
                "investor_name": str(name).strip(),
                "currency": str(currency).strip(),
                "amount": float(amt),
                "investment_date": investment_date,
            }
        )
    out = pd.DataFrame(rows)
    out.sort_values(["investment_date", "investor_name"], inplace=True)
    out.to_csv(OUTPUT_DIR / "investments.csv", index=False)


def parse_fee_file():
    fees_path = STATEMENTS_DIR / "Indigo_Fees.json"
    if not fees_path.exists():
        return pd.DataFrame(columns=["investor_name", "fund_code", "effective_date", "fee_pct"])
    try:
        data = json.loads(fees_path.read_text())
    except Exception:
        return pd.DataFrame(columns=["investor_name", "fund_code", "effective_date", "fee_pct"])
    rows = []
    # handle both list of dicts and simple mappings or strings
    if isinstance(data, dict):
        # try to interpret as name->fee or with fund_code
        for k, v in data.items():
            name = k
            fee_pct = None
            fund_code = ""
            effective_date = datetime.utcnow().date().isoformat()
            if isinstance(v, (int, float, str)):
                try:
                    fee_pct = float(v)
                except Exception:
                    fee_pct = None
            elif isinstance(v, dict):
                fee_pct = v.get("fee_pct") or v.get("fee") or v.get("pct")
                fund_code = v.get("fund_code") or v.get("fund") or fund_code
                eff = v.get("effective_date") or v.get("date")
                if eff:
                    try:
                        effective_date = pd.to_datetime(eff).date().isoformat()
                    except Exception:
                        pass
            if fee_pct is None:
                continue
            rows.append(
                {
                    "investor_name": str(name).strip(),
                    "fund_code": fund_code or "",
                    "effective_date": effective_date,
                    "fee_pct": float(fee_pct),
                }
            )
    elif isinstance(data, list):
        for rec in data:
            if isinstance(rec, (int, float, str)):
                # not enough info
                continue
            name = rec.get("investor") or rec.get("name")
            fund_code = rec.get("fund_code")
            fee_pct = rec.get("fee_pct") or rec.get("fee") or rec.get("pct")
            effective_date = rec.get("effective_date") or rec.get("date")
            if not name or fee_pct is None:
                continue
            try:
                eff = (
                    pd.to_datetime(effective_date).date().isoformat()
                    if effective_date
                    else datetime.utcnow().date().isoformat()
                )
            except Exception:
                eff = datetime.utcnow().date().isoformat()
            rows.append(
                {
                    "investor_name": str(name).strip(),
                    "fund_code": fund_code or "",
                    "effective_date": eff,
                    "fee_pct": float(fee_pct),
                }
            )
    if rows:
        out = pd.DataFrame(rows)
        out.sort_values(["investor_name", "fund_code", "effective_date"], inplace=True)
        out.to_csv(OUTPUT_DIR / "fee_schedule.csv", index=False)
        return out
    else:
        # write empty with columns
        empty = pd.DataFrame(columns=["investor_name", "fund_code", "effective_date", "fee_pct"])
        empty.to_csv(OUTPUT_DIR / "fee_schedule.csv", index=False)
        return empty


def parse_statements():
    rows = []
    for path in STATEMENTS_DIR.glob("*.json"):
        if path.name == "Indigo_Fees.json":
            continue
        try:
            data = json.loads(path.read_text())
        except Exception:
            continue
        investor = data.get("investor") or data.get("name") or path.stem
        fund_code = data.get("fund_code") or data.get("fund") or ""
        period_end = data.get("period_end") or data.get("period_end_date") or data.get("date")
        begin_bal = data.get("beginning_balance") or data.get("begin_balance") or 0
        contrib = data.get("contributions") or data.get("deposits") or 0
        withdraw = data.get("withdrawals") or 0
        gross = data.get("gross_return") or data.get("gross") or 0
        fees = data.get("fees") or data.get("management_fees") or 0
        net = data.get("net_return") or data.get("net") or 0
        end_bal = data.get("ending_balance") or data.get("end_balance") or 0

        try:
            period_end_date = pd.to_datetime(period_end).date().isoformat() if period_end else ""
        except Exception:
            period_end_date = ""

        rows.append(
            {
                "investor_name": str(investor).strip(),
                "fund_code": str(fund_code).strip(),
                "period_end_date": period_end_date,
                "begin_balance": float(begin_bal or 0),
                "contributions": float(contrib or 0),
                "withdrawals": float(withdraw or 0),
                "gross_return": float(gross or 0),
                "fees": float(fees or 0),
                "net_return": float(net or 0),
                "end_balance": float(end_bal or 0),
            }
        )
    out = pd.DataFrame(rows)
    out.sort_values(["fund_code", "investor_name", "period_end_date"], inplace=True)
    out.to_csv(OUTPUT_DIR / "statements_perf.csv", index=False)


def main():
    ensure_output()
    parse_fund_aum()
    parse_investments()
    fee_df = parse_fee_file()
    parse_statements()
    print("Ingestion CSVs written to", OUTPUT_DIR)
    if not fee_df.empty:
        print("Fee schedule rows:", len(fee_df))


if __name__ == "__main__":
    main()
