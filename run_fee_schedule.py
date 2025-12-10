import os
import psycopg2

# Direct pooler connection (IPv4-friendly)
DB_HOST = os.getenv("DB_HOST", "aws-0-eu-central-1.pooler.supabase.com")
DB_PORT = os.getenv("DB_PORT", "6543")
DB_NAME = os.getenv("DB_NAME", "postgres")
DB_USER = os.getenv("DB_USER", "postgres.nkfimvovosdehmyyjubn")
DB_PASS = os.getenv("DB_PASS", "Douentza2067@@")

SQL_FILE = "supabase/migrations/20251212_fee_schedule_v2.sql"


def run_sql():
    print(f"Connecting to {DB_HOST}:{DB_PORT}/{DB_NAME} as {DB_USER} ...")
    conn = psycopg2.connect(
        host=DB_HOST,
        port=DB_PORT,
        dbname=DB_NAME,
        user=DB_USER,
        password=DB_PASS,
        sslmode="require",
    )
    conn.autocommit = True
    with conn, conn.cursor() as cur:
        with open(SQL_FILE, "r", encoding="utf-8") as f:
            sql = f.read()
        print(f"Executing {SQL_FILE} ...")
        cur.execute(sql)
    conn.close()
    print("Done.")


if __name__ == "__main__":
    run_sql()
