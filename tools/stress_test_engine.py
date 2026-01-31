import os
import sys
import uuid
import random
import json
import traceback
from datetime import datetime, timedelta
from decimal import Decimal, getcontext
from dotenv import load_dotenv
from supabase import create_client, Client
from tenacity import retry, stop_after_attempt, wait_exponential

# High precision for financial math
getcontext().prec = 38

# ============================================================================
# ENVIRONMENT SAFETY GUARD
# ============================================================================
# This engine creates thousands of test entities (funds, profiles, transactions).
# It MUST NEVER run against production without explicit confirmation.
# ============================================================================

KNOWN_PRODUCTION_PATTERNS = [
    "supabase.co",       # Hosted Supabase production
    "supabase.in",       # Alternate hosted domain
]

KNOWN_SAFE_PATTERNS = [
    "localhost",
    "127.0.0.1",
    "local.supabase",
]


def _is_production_url(url: str) -> bool:
    """Check if the Supabase URL looks like a production environment."""
    if not url:
        return True  # No URL = assume production (fail safe)
    url_lower = url.lower()
    for safe in KNOWN_SAFE_PATTERNS:
        if safe in url_lower:
            return False
    for prod in KNOWN_PRODUCTION_PATTERNS:
        if prod in url_lower:
            return True
    # Unknown URL — assume production (fail safe)
    return True


def _enforce_environment_guard(url: str) -> None:
    """Block execution against production unless explicitly confirmed."""
    if not _is_production_url(url):
        return  # Local/dev environment — safe to proceed

    # Check for explicit override flags
    if os.getenv("STRESS_TEST_ALLOW_PRODUCTION") == "I_ACCEPT_THE_RISK":
        print("WARNING: Running stress test against PRODUCTION with explicit override.")
        print(f"  URL: {url}")
        return

    if "--confirm-production" in sys.argv:
        print("WARNING: Running stress test against PRODUCTION with --confirm-production flag.")
        print(f"  URL: {url}")
        return

    # Block execution
    print("=" * 72)
    print("BLOCKED: Stress test engine detected a PRODUCTION Supabase URL.")
    print(f"  URL: {url}")
    print()
    print("This engine creates thousands of test funds, profiles, and")
    print("transactions. Running it against production will pollute your")
    print("database with fake data that is extremely difficult to clean up.")
    print()
    print("To run against a LOCAL database:")
    print("  - Use a local Supabase instance (supabase start)")
    print("  - Or a Supabase development branch")
    print()
    print("To override (DANGEROUS — only for experts):")
    print("  - Pass --confirm-production flag")
    print("  - Or set STRESS_TEST_ALLOW_PRODUCTION=I_ACCEPT_THE_RISK")
    print("=" * 72)
    sys.exit(1)


class StressTestEngine:
    def __init__(self, seed=42):
        project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
        load_dotenv(os.path.join(project_root, '.env'))

        self.url = os.getenv("VITE_SUPABASE_URL")
        self.key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

        # ENVIRONMENT GUARD: Block production unless explicitly confirmed
        _enforce_environment_guard(self.url)

        self.supabase: Client = create_client(self.url, self.key)
        
        random.seed(seed)
        self.run_id = str(uuid.uuid4())
        self.results = {
            "summary": {
                "total_tests": 0,
                "passed": 0,
                "failed": 0,
                "ambiguous": 0,
                "run_timestamp": datetime.now().isoformat()
            },
            "tests": [],
            "entity_views": {"admin": {}, "ib": {}, "investor": {}}
        }
        
        # Admin ID for operations
        self.admin_id = self._get_admin_id()
        self.fees_account_id = self._get_fees_account_id()

    @retry(stop=stop_after_attempt(5), wait=wait_exponential(multiplier=1, min=4, max=10))
    def _get_admin_id(self):
        res = self.supabase.table("profiles").select("id").eq("is_admin", True).limit(1).execute()
        if res.data:
            return res.data[0]['id']
        return str(uuid.UUID(int=0))

    @retry(stop=stop_after_attempt(5), wait=wait_exponential(multiplier=1, min=4, max=10))
    def _get_fees_account_id(self):
        res = self.supabase.table("profiles").select("id").eq("account_type", "fees_account").limit(1).execute()
        if res.data:
            return res.data[0]['id']
        
        email = "fees@platform.test"
        # Create auth user
        auth_res = self.supabase.auth.admin.create_user({
            "email": email,
            "password": "Password123!",
            "email_confirm": True
        })
        user_id = auth_res.user.id
        
        profile = {
            "id": user_id,
            "email": email,
            "account_type": "fees_account",
            "role": "fees_account",
            "first_name": "Platform",
            "last_name": "Fees"
        }
        self.supabase.table("profiles").upsert(profile).execute()
        self.supabase.table("user_roles").insert({"user_id": user_id, "role": "admin"}).execute()
        return profile['id']

    @retry(stop=stop_after_attempt(5), wait=wait_exponential(multiplier=1, min=4, max=10))
    def create_test_fund(self):
        uid_part = uuid.uuid4().hex[:8].upper()
        fund_code = f"STRESS_{uid_part}"
        asset_name = f"ASSET_{uid_part}"
        fund = {
            "id": str(uuid.uuid4()),
            "code": fund_code,
            "name": f"Stress Test Fund {uid_part}",
            "asset": asset_name,
            "status": "active",
            "fund_class": "Standard",
            "inception_date": "2024-01-01"
        }
        self.supabase.table("funds").insert(fund).execute()
        return fund

    @retry(stop=stop_after_attempt(5), wait=wait_exponential(multiplier=1, min=4, max=10))
    def create_test_investor(self, ib_id=None):
        uid = str(uuid.uuid4())
        email = f"investor_{uid[:8]}@test.com"
        
        # Create auth user
        auth_res = self.supabase.auth.admin.create_user({
            "email": email,
            "password": "Password123!",
            "email_confirm": True
        })
        user_id = auth_res.user.id
        
        profile = {
            "id": user_id,
            "email": email,
            "account_type": "investor",
            "first_name": "Investor",
            "last_name": uid[:4],
            "ib_parent_id": ib_id,
            "fee_pct": 2.0,
            "ib_percentage": 10.0 if ib_id else 0
        }
        self.supabase.table("profiles").upsert(profile).execute()
        self.supabase.table("user_roles").insert({"user_id": user_id, "role": "investor"}).execute()
        return profile

    @retry(stop=stop_after_attempt(5), wait=wait_exponential(multiplier=1, min=4, max=10))
    def create_test_ib(self):
        uid = str(uuid.uuid4())
        email = f"ib_{uid[:8]}@test.com"
        
        # Create auth user
        auth_res = self.supabase.auth.admin.create_user({
            "email": email,
            "password": "Password123!",
            "email_confirm": True
        })
        user_id = auth_res.user.id
        
        profile = {
            "id": user_id,
            "email": email,
            "account_type": "ib",
            "first_name": "IB",
            "last_name": uid[:4]
        }
        self.supabase.table("profiles").upsert(profile).execute()
        self.supabase.table("user_roles").insert({"user_id": user_id, "role": "ib"}).execute()
        return profile

    @retry(stop=stop_after_attempt(5), wait=wait_exponential(multiplier=1, min=4, max=10))
    def run_deposit(self, investor_id, fund_id, amount, date):
        ref = f"dep_{uuid.uuid4().hex[:8]}"
        res = self.supabase.rpc("apply_transaction_with_crystallization", {
            "p_investor_id": investor_id,
            "p_fund_id": fund_id,
            "p_tx_type": "DEPOSIT",
            "p_amount": float(amount),
            "p_tx_date": date.strftime("%Y-%m-%d"),
            "p_reference_id": ref,
            "p_admin_id": self.admin_id
        }).execute()
        return res.data

    @retry(stop=stop_after_attempt(5), wait=wait_exponential(multiplier=1, min=4, max=10))
    def run_withdrawal(self, investor_id, fund_id, amount, date):
        ref = f"wd_{uuid.uuid4().hex[:8]}"
        res = self.supabase.rpc("apply_transaction_with_crystallization", {
            "p_investor_id": investor_id,
            "p_fund_id": fund_id,
            "p_tx_type": "WITHDRAWAL",
            "p_amount": float(amount),
            "p_tx_date": date.strftime("%Y-%m-%d"),
            "p_reference_id": ref,
            "p_admin_id": self.admin_id
        }).execute()
        return res.data

    @retry(stop=stop_after_attempt(5), wait=wait_exponential(multiplier=1, min=4, max=10))
    def run_yield_distribution(self, fund_id, start_date, end_date, gross_amount):
        res = self.supabase.rpc("apply_adb_yield_distribution_v3", {
            "p_fund_id": fund_id,
            "p_period_start": start_date.strftime("%Y-%m-%d"),
            "p_period_end": end_date.strftime("%Y-%m-%d"),
            "p_gross_yield_amount": float(gross_amount),
            "p_admin_id": self.admin_id
        }).execute()
        return res.data

    @retry(stop=stop_after_attempt(5), wait=wait_exponential(multiplier=1, min=4, max=10))
    def run_void(self, tx_id, reason="Stress Test"):
        try:
            res = self.supabase.rpc("void_transaction", {
                "p_transaction_id": tx_id,
                "p_admin_id": self.admin_id,
                "p_reason": reason
            }).execute()
            return res.data
        except Exception as e:
            return {"error": str(e)}

    def perform_reconciliation(self, fund_id):
        checks = []
        
        # Check 1: Conservation of Yield (Gross = Net + Fee + IB)
        dist_res = self.supabase.table("yield_distributions").select("*").eq("fund_id", fund_id).eq("is_voided", False).execute()
        for dist in dist_res.data:
            gross = Decimal(str(dist['gross_yield_amount']))
            net = Decimal(str(dist['total_net_amount']))
            fee = Decimal(str(dist['total_fee_amount']))
            ib = Decimal(str(dist['total_ib_amount']))
            diff = abs(gross - (net + fee + ib))
            checks.append({
                "check_type": f"yield_conservation_{dist['id'][:8]}",
                "expected": float(gross),
                "actual": float(net + fee + ib),
                "pass": diff < Decimal('0.000001'),
                "error_detail": f"Diff: {diff}" if diff >= Decimal('0.000001') else ""
            })

        # Check 2: Position vs Ledger
        pos_res = self.supabase.table("investor_positions").select("*").eq("fund_id", fund_id).execute()
        for pos in pos_res.data:
            tx_sum = self.supabase.table("transactions_v2").select("amount").eq("investor_id", pos['investor_id']).eq("fund_id", fund_id).eq("is_voided", False).execute()
            total_tx = sum(Decimal(str(tx['amount'])) for tx in tx_sum.data)
            curr_val = Decimal(str(pos['current_value']))
            diff = abs(total_tx - curr_val)
            checks.append({
                "check_type": f"ledger_integrity_{pos['investor_id'][:8]}",
                "expected": float(total_tx),
                "actual": float(curr_val),
                "pass": diff < Decimal('0.000001'),
                "error_detail": f"Diff: {diff}" if diff >= Decimal('0.000001') else ""
            })

        return checks

    def execute_scenario(self, name, config):
        test_id = str(uuid.uuid4())
        ops_run = []
        try:
            fund = self.create_test_fund()
            ib = self.create_test_ib()
            investors = [self.create_test_investor(ib['id']) for _ in range(config.get('investors', 3))]
            
            # Timeline
            start_date = datetime(2024, 1, 1)
            current_date = start_date
            
            # Operations
            for op in config.get('timeline', []):
                op_type = op['type']
                op_date = start_date + timedelta(days=op['day'])
                
                if op_type == 'deposit':
                    for inv in (investors if op.get('all') else [random.choice(investors)]):
                        amt = Decimal(str(op['amount']))
                        self.run_deposit(inv['id'], fund['id'], amt, op_date)
                        ops_run.append(f"DEPOSIT {amt} on Day {op['day']}")
                
                elif op_type == 'yield':
                    amt = Decimal(str(op['amount']))
                    self.run_yield_distribution(fund['id'], current_date, op_date, amt)
                    ops_run.append(f"YIELD {amt} for period ending Day {op['day']}")
                    current_date = op_date + timedelta(days=1)
                
                elif op_type == 'void_last':
                    last_tx = self.supabase.table("transactions_v2").select("id").eq("fund_id", fund['id']).order("created_at", desc=True).limit(1).execute()
                    if last_tx.data:
                        self.run_void(last_tx.data[0]['id'])
                        ops_run.append(f"VOID TX {last_tx.data[0]['id'][:8]} on Day {op['day']}")

            recon = self.perform_reconciliation(fund['id'])
            pass_status = all(c['pass'] for c in recon)
            
            self.log_test(
                test_id, name, config, ops_run, pass_status, 
                actual={"recon": recon}, expected={"all_pass": True}, 
                reconciliation=recon
            )
            
        except Exception as e:
            self.log_test(
                test_id, name, config, ops_run, False, 
                actual={}, expected={}, reconciliation=[], 
                fail_reason=str(e), logs=traceback.format_exc()
            )

    def log_test(self, test_id, description, input_data, ops, pass_status, actual, expected, reconciliation, logs="", fail_reason=None):
        self.results["tests"].append({
            "test_id": test_id,
            "description": description,
            "input_data": input_data,
            "operations_run": ops,
            "expected_results": expected,
            "actual_results": actual,
            "pass": pass_status,
            "fail_reason": fail_reason,
            "ambiguous": False,
            "reconciliation_checks": reconciliation,
            "logs": logs
        })
        self.results["summary"]["total_tests"] += 1
        if pass_status: self.results["summary"]["passed"] += 1
        else: self.results["summary"]["failed"] += 1

    def run_scenarios(self, count=5):
        print(f"🚀 Running {count} Scenarios (Run ID: {self.run_id})")
        
        templates = [
            {"name": "Standard Growth", "config": {
                "investors": 3,
                "timeline": [
                    {"type": "deposit", "day": 0, "amount": 10000, "all": True},
                    {"type": "yield", "day": 30, "amount": 500},
                    {"type": "yield", "day": 60, "amount": 550}
                ]
            }},
            {"name": "Adversarial Voids", "config": {
                "investors": 2,
                "timeline": [
                    {"type": "deposit", "day": 0, "amount": 5000, "all": True},
                    {"type": "yield", "day": 15, "amount": 100},
                    {"type": "void_last", "day": 16},
                    {"type": "yield", "day": 30, "amount": 200}
                ]
            }},
            {"name": "Dust and Precision", "config": {
                "investors": 5,
                "timeline": [
                    {"type": "deposit", "day": 0, "amount": 0.000001, "all": True},
                    {"type": "yield", "day": 30, "amount": 0.00000001}
                ]
            }}
        ]
        
        for i in range(count):
            tpl = random.choice(templates)
            jittered_config = json.loads(json.dumps(tpl['config']))
            for op in jittered_config['timeline']:
                if 'amount' in op:
                    op['amount'] *= (1 + (random.random() - 0.5) * 0.2)
            
            if i % 10 == 0: print(f"Progress: {i}/{count}...")
            self.execute_scenario(f"{tpl['name']} #{i}", jittered_config)

        self.save_report()

    def save_report(self):
        report_path = os.path.join(os.path.dirname(__file__), '..', 'stress_test_report.json')
        with open(report_path, "w") as f:
            json.dump(self.results, f, indent=2)
        print(f"✅ Stress test complete. Results: {self.results['summary']['passed']}/{self.results['summary']['total_tests']} passed.")

if __name__ == "__main__":

    engine = StressTestEngine()

    engine.run_scenarios(count=1000)
