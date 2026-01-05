# Reality Check (Live Schema)

Source: `/tmp/indigo_yield_remote.sql`

## Table Existence
- `public.transactions_v2`: ✅ exists
- `public.transactions`: ❌ does not exist

## Critical Tables (Columns)
### `transactions_v2`
| column | type/constraints (raw) |
|---|---|
| `id` | `"uuid" DEFAULT "gen_random_uuid"() NOT NULL` |
| `fund_id` | `"uuid" NOT NULL` |
| `tx_date` | `"date" DEFAULT CURRENT_DATE NOT NULL` |
| `value_date` | `"date" DEFAULT CURRENT_DATE NOT NULL` |
| `asset` | `"text" NOT NULL` |
| `amount` | `numeric(28,10) NOT NULL` |
| `type` | `"public"."tx_type" NOT NULL` |
| `balance_before` | `numeric(28,10)` |
| `balance_after` | `numeric(28,10)` |
| `tx_hash` | `"text"` |
| `reference_id` | `"text"` |
| `notes` | `"text"` |
| `approved_by` | `"uuid"` |
| `approved_at` | `timestamp with time zone` |
| `created_by` | `"uuid"` |
| `created_at` | `timestamp with time zone DEFAULT "now"()` |
| `fund_class` | `"text"` |
| `investor_id` | `"uuid"` |
| `purpose` | `"public"."aum_purpose" DEFAULT 'transaction'::"public"."aum_purpose"` |
| `source` | `"public"."tx_source" DEFAULT 'manual_admin'::"public"."tx_source"` |
| `is_system_generated` | `boolean DEFAULT false` |
| `visibility_scope` | `"public"."visibility_scope" DEFAULT 'investor_visible'::"public"."visibility_scope" NOT NULL` |
| `transfer_id` | `"uuid"` |
| `distribution_id` | `"uuid"` |
| `correction_id` | `"uuid"` |
| `tx_subtype` | `"text"` |
| `is_voided` | `boolean DEFAULT false NOT NULL` |
| `voided_at` | `timestamp with time zone` |
| `voided_by` | `"uuid"` |
| `void_reason` | `"text"` |

### `investor_positions`
| column | type/constraints (raw) |
|---|---|
| `fund_id` | `"uuid" NOT NULL` |
| `shares` | `numeric(28,10) DEFAULT 0 NOT NULL` |
| `cost_basis` | `numeric(28,10) DEFAULT 0 NOT NULL` |
| `current_value` | `numeric(28,10) DEFAULT 0 NOT NULL` |
| `unrealized_pnl` | `numeric(28,10) DEFAULT 0` |
| `realized_pnl` | `numeric(28,10) DEFAULT 0` |
| `last_transaction_date` | `"date"` |
| `lock_until_date` | `"date"` |
| `high_water_mark` | `numeric(28,10)` |
| `mgmt_fees_paid` | `numeric(28,10) DEFAULT 0` |
| `perf_fees_paid` | `numeric(28,10) DEFAULT 0` |
| `updated_at` | `timestamp with time zone DEFAULT "now"()` |
| `fund_class` | `"text"` |
| `aum_percentage` | `numeric DEFAULT 0` |
| `investor_id` | `"uuid" NOT NULL` |
| `last_yield_crystallization_date` | `"date"` |
| `cumulative_yield_earned` | `numeric DEFAULT 0` |

### `profiles`
| column | type/constraints (raw) |
|---|---|
| `id` | `"uuid" NOT NULL` |
| `email` | `"text" NOT NULL` |
| `first_name` | `"text"` |
| `last_name` | `"text"` |
| `phone` | `"text"` |
| `is_admin` | `boolean DEFAULT false NOT NULL` |
| `avatar_url` | `"text"` |
| `totp_enabled` | `boolean DEFAULT false` |
| `totp_verified` | `boolean DEFAULT false` |
| `created_at` | `timestamp with time zone DEFAULT "now"() NOT NULL` |
| `updated_at` | `timestamp with time zone DEFAULT "now"() NOT NULL` |
| `status` | `"text" DEFAULT 'Active'::"text"` |
| `preferences` | `"jsonb" DEFAULT '{}'::"jsonb"` |
| `onboarding_date` | `"date" DEFAULT CURRENT_DATE` |
| `entity_type` | `"text"` |
| `kyc_status` | `"text" DEFAULT 'pending'::"text"` |
| `ib_parent_id` | `"uuid"` |
| `ib_percentage` | `numeric(5,2) DEFAULT 0` |
| `account_type` | `"public"."account_type" DEFAULT 'investor'::"public"."account_type"` |
| `is_system_account` | `boolean DEFAULT false` |
| `include_in_reporting` | `boolean DEFAULT false NOT NULL` |
| `last_activity_at` | `timestamp with time zone` |
| `fee_pct` | `numeric(6,3) DEFAULT 20.000 NOT NULL` |
| `ib_commission_source` | `"text" DEFAULT 'platform_fees'::"text" NOT NULL` |

### `funds`
| column | type/constraints (raw) |
|---|---|
| `id` | `"uuid" DEFAULT "gen_random_uuid"() NOT NULL` |
| `code` | `"text" NOT NULL` |
| `name` | `"text" NOT NULL` |
| `asset` | `"text" NOT NULL` |
| `strategy` | `"text"` |
| `inception_date` | `"date" DEFAULT CURRENT_DATE NOT NULL` |
| `status` | `"public"."fund_status" DEFAULT 'active'::"public"."fund_status"` |
| `mgmt_fee_bps` | `integer DEFAULT 200` |
| `perf_fee_bps` | `integer DEFAULT 2000` |
| `high_water_mark` | `numeric(28,10) DEFAULT 0` |
| `min_investment` | `numeric(28,10) DEFAULT 1000` |
| `lock_period_days` | `integer DEFAULT 0` |
| `created_at` | `timestamp with time zone DEFAULT "now"()` |
| `updated_at` | `timestamp with time zone DEFAULT "now"()` |
| `fund_class` | `"text" NOT NULL` |
| `logo_url` | `"text"` |

### `withdrawal_requests`
| column | type/constraints (raw) |
|---|---|
| `id` | `"uuid" DEFAULT "gen_random_uuid"() NOT NULL` |
| `fund_id` | `"uuid" NOT NULL` |
| `fund_class` | `"text"` |
| `request_date` | `timestamp with time zone DEFAULT "now"() NOT NULL` |
| `requested_amount` | `numeric(28,10) NOT NULL` |
| `requested_shares` | `numeric(28,10)` |
| `withdrawal_type` | `"text" NOT NULL` |
| `status` | `"public"."withdrawal_status" DEFAULT 'pending'::"public"."withdrawal_status" NOT NULL` |
| `approved_amount` | `numeric(28,10)` |
| `approved_shares` | `numeric(28,10)` |
| `approved_by` | `"uuid"` |
| `approved_at` | `timestamp with time zone` |
| `processed_amount` | `numeric(28,10)` |
| `processed_at` | `timestamp with time zone` |
| `settlement_date` | `"date"` |
| `tx_hash` | `"text"` |
| `rejection_reason` | `"text"` |
| `rejected_by` | `"uuid"` |
| `rejected_at` | `timestamp with time zone` |
| `cancellation_reason` | `"text"` |
| `cancelled_by` | `"uuid"` |
| `cancelled_at` | `timestamp with time zone` |
| `notes` | `"text"` |
| `admin_notes` | `"text"` |
| `created_by` | `"uuid"` |
| `updated_at` | `timestamp with time zone DEFAULT "now"()` |
| `investor_id` | `"uuid"` |
| `version` | `integer DEFAULT 1` |

### `fund_daily_aum`
| column | type/constraints (raw) |
|---|---|
| `id` | `"uuid" DEFAULT "gen_random_uuid"() NOT NULL` |
| `aum_date` | `"date" NOT NULL` |
| `total_aum` | `numeric DEFAULT 0 NOT NULL` |
| `nav_per_share` | `numeric` |
| `total_shares` | `numeric` |
| `created_at` | `timestamp with time zone DEFAULT "now"()` |
| `updated_at` | `timestamp with time zone DEFAULT "now"()` |
| `created_by` | `"uuid"` |
| `source` | `"text" DEFAULT 'ingested'::"text"` |
| `as_of_date` | `"date"` |
| `is_month_end` | `boolean DEFAULT false` |
| `purpose` | `"public"."aum_purpose" DEFAULT 'transaction'::"public"."aum_purpose" NOT NULL` |
| `updated_by` | `"uuid"` |
| `fund_id` | `"uuid" NOT NULL` |
| `is_voided` | `boolean DEFAULT false NOT NULL` |
| `voided_at` | `timestamp with time zone` |
| `voided_by` | `"uuid"` |
| `void_reason` | `"text"` |

## Enums
### `public.tx_type`
`DEPOSIT`, `WITHDRAWAL`, `INTEREST`, `FEE`, `ADJUSTMENT`, `FEE_CREDIT`, `IB_CREDIT`, `YIELD`, `INTERNAL_WITHDRAWAL`, `INTERNAL_CREDIT`, `IB_DEBIT`

### `public.aum_purpose`
`reporting`, `transaction`

