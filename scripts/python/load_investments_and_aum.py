import csv
import os
import uuid
from datetime import datetime

import psycopg2
from psycopg2.extras import execute_batch

DB_HOST = os.getenv("DB_HOST", "aws-0-us-east-2.pooler.supabase.com")
DB_PORT = os.getenv("DB_PORT", "6543")
DB_NAME = os.getenv("DB_NAME", "postgres")
DB_USER = os.getenv("DB_USER", "postgres.nkfimvovosdehmyyjubn")
DB_PASS = os.getenv("DB_PASS", "Douentza2067@@")

FUND_AUM_CSV = "archive/processed_reports/output/fund_daily_aum.csv"
INVESTMENTS_CSV = "archive/processed_reports/output/investments.csv"


def load_fund_map(cur):
    cur.execute("SELECT code, id FROM public.funds")
    return {code: fid for code, fid in cur.fetchall()}


def load_profile_map(cur):
    cur.execute(
        "SELECT lower(trim(coalesce(first_name,''))) || ' ' || lower(trim(coalesce(last_name,''))) AS nm, id, email "
        "FROM public.profiles"
    )
    mapping = {}
    for nm, pid, email in cur.fetchall():
        nm = nm.strip()
        # Prefer real email for Matthias Reiser
        if nm == "matthias reiser":
            if email == "matthias@xventures.de":
                mapping[nm] = (pid, email)
                continue
            if nm in mapping:
                # keep existing preferred real email
                continue
        mapping[nm] = (pid, email)
    return mapping


def reset_tables(cur):
    cur.execute("TRUNCATE TABLE public.transactions_v2 CASCADE")
    cur.execute("TRUNCATE TABLE public.investor_positions CASCADE")
    cur.execute("TRUNCATE TABLE public.fund_daily_aum CASCADE")


def ensure_tx_fund_class_constraint(cur):
    cur.execute(
        """
        ALTER TABLE public.transactions_v2
          DROP CONSTRAINT IF EXISTS transactions_v2_fund_class_check;
        ALTER TABLE public.transactions_v2
          ADD CONSTRAINT transactions_v2_fund_class_check
          CHECK (fund_class = ANY (ARRAY['USDT','USDC','EURC','BTC','ETH','SOL','XRP','xAUT']));
        """
    )


def ensure_position_uniqueness(cur):
    cur.execute(
        """
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_constraint
            WHERE conname = 'investor_positions_investor_fund_unique'
              AND conrelid = 'public.investor_positions'::regclass
          ) THEN
            ALTER TABLE public.investor_positions
              ADD CONSTRAINT investor_positions_investor_fund_unique
              UNIQUE (investor_id, fund_id);
          END IF;
        END $$;
        """
    )


def ensure_position_fund_class_constraint(cur):
    cur.execute(
        """
        ALTER TABLE public.investor_positions
          DROP CONSTRAINT IF EXISTS investor_positions_fund_class_check;
        ALTER TABLE public.investor_positions
          ADD CONSTRAINT investor_positions_fund_class_check
          CHECK (fund_class = ANY (ARRAY['USDT','USDC','EURC','BTC','ETH','SOL','XRP','xAUT']));
        """
    )


def load_fund_daily_aum(cur, fund_map):
    rows = []
    with open(FUND_AUM_CSV, newline="") as f:
        rdr = csv.DictReader(f)
        for r in rdr:
            code = r["fund_code"]
            fund_id = fund_map.get(code)
            if not fund_id:
                raise ValueError(f"Unknown fund code in AUM CSV: {code}")
            as_of = r["as_of_date"]
            total = r["total_aum"]
            source = r.get("source") or "ingested"
            rows.append((str(uuid.uuid4()), fund_id, as_of, total, source, as_of))
    execute_batch(
        cur,
        """
        INSERT INTO public.fund_daily_aum (id, fund_id, aum_date, total_aum, source, as_of_date)
        VALUES (%s, %s, %s, %s, %s, %s)
        ON CONFLICT (fund_id, aum_date)
        DO UPDATE SET
          total_aum = EXCLUDED.total_aum,
          source = EXCLUDED.source,
          as_of_date = EXCLUDED.as_of_date,
          updated_at = now()
        """,
        rows,
        page_size=500,
    )


def load_investments(cur, fund_map, profile_map):
    currency_to_fund = {
        "BTC": "IND-BTC",
        "ETH": "IND-ETH",
        "USDT": "IND-USDT",
        "SOL": "IND-SOL",
        "XRP": "IND-XRP",
    }
    tx_rows = []
    pos_rows = []
    with open(INVESTMENTS_CSV, newline="") as f:
        rdr = csv.DictReader(f)
        for r in rdr:
            name = r["investor_name"].strip().lower()
            currency = r["currency"].strip().upper()
            amount = r["amount"]
            inv_date = r["investment_date"]
            if name not in profile_map:
                raise ValueError(f"Profile not found for investor name: {name}")
            investor_id, email = profile_map[name]
            fund_code = currency_to_fund.get(currency)
            if not fund_code:
                raise ValueError(f"Unsupported currency {currency} for {name}")
            fund_id = fund_map[fund_code]

            tx_rows.append(
                (
                    str(uuid.uuid4()),
                    investor_id,
                    fund_id,
                    "DEPOSIT",
                    currency,
                    currency,
                    amount,
                    inv_date,
                    inv_date,
                    "migration:investments",
                    f"Initial deposit import for {name}",
                )
            )
            pos_rows.append((investor_id, fund_id, currency, amount, inv_date))

    execute_batch(
        cur,
        """
        INSERT INTO public.transactions_v2
          (id, investor_id, fund_id, type, asset, fund_class, amount, tx_date, value_date, reference_id, notes, created_at)
        VALUES
          (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, now())
        """,
        tx_rows,
        page_size=500,
    )

    # Upsert positions: add to existing if present, else insert
    for investor_id, fund_id, fund_class, amount, inv_date in pos_rows:
        cur.execute(
            """
            INSERT INTO public.investor_positions
              (investor_id, fund_id, fund_class, shares, current_value, cost_basis, last_transaction_date, updated_at)
            VALUES
              (%s, %s, %s, %s, %s, %s, %s, now())
            ON CONFLICT (investor_id, fund_id)
            DO UPDATE SET
              shares = investor_positions.shares + EXCLUDED.shares,
              current_value = investor_positions.current_value + EXCLUDED.current_value,
              cost_basis = investor_positions.cost_basis + EXCLUDED.cost_basis,
              last_transaction_date = GREATEST(coalesce(investor_positions.last_transaction_date, EXCLUDED.last_transaction_date), EXCLUDED.last_transaction_date),
              updated_at = now();
            """,
            (investor_id, fund_id, fund_class, amount, amount, amount, inv_date),
        )


def main():
    conn = psycopg2.connect(
        host=DB_HOST, port=DB_PORT, dbname=DB_NAME, user=DB_USER, password=DB_PASS, sslmode="require"
    )
    conn.autocommit = False
    try:
        with conn.cursor() as cur:
            fund_map = load_fund_map(cur)
            profile_map = load_profile_map(cur)
            reset_tables(cur)
            ensure_tx_fund_class_constraint(cur)
            ensure_position_uniqueness(cur)
            ensure_position_fund_class_constraint(cur)
            load_fund_daily_aum(cur, fund_map)
            load_investments(cur, fund_map, profile_map)
        conn.commit()
        print("Fund AUM and investments loaded successfully.")
    except Exception as e:
        conn.rollback()
        raise
    finally:
        conn.close()


if __name__ == "__main__":
    main()
