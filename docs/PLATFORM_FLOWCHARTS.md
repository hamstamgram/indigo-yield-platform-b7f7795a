# Indigo Yield Platform - Operations Flowcharts

> Last Updated: February 18, 2026
> Paste each mermaid block into mermaid.live or any Mermaid renderer to see the diagrams.
> Notion: use /code block with "mermaid" language, or paste into mermaid.live and screenshot.

---

## Master Operations Map

Shows how every operation connects. Green = working, arrows = data flow.

```mermaid
flowchart TB
    subgraph ADMIN["ADMIN PORTAL"]
        A_DASH["Command Center"]
        A_TX["New Transaction"]
        A_WD["Withdrawal Mgmt"]
        A_YIELD["Yield Operations"]
        A_VOID["Void / Corrections"]
        A_REPORTS["Statement Manager"]
        A_FEES["INDIGO Fees"]
        A_FUNDS["Fund Management"]
        A_INTEGRITY["Operations / Health"]
        A_AUDIT["Audit Trail"]
        A_IB["IB Management"]
        A_SETTINGS["Settings"]
    end

    subgraph INVESTOR["INVESTOR PORTAL"]
        I_DASH["Dashboard"]
        I_PORT["Portfolio"]
        I_PERF["Performance"]
        I_YIELD["Yield History"]
        I_TX["Transactions"]
        I_WD["Withdrawals"]
        I_STMT["Statements"]
        I_DOCS["Documents"]
        I_SET["Settings"]
    end

    subgraph ENGINE["FINANCIAL ENGINE"]
        CRYSTAL["Crystallization"]
        LEDGER["Transaction Ledger"]
        POSITION["Position Tracker"]
        AUM["AUM Tracker"]
        FEE_CALC["Fee Calculator"]
        IB_CALC["IB Commission"]
        CONSERVE["Conservation Check"]
        AUDIT_LOG["Audit Log"]
    end

    subgraph DB["DATABASE"]
        T_TX["transactions_v2"]
        T_POS["investor_positions"]
        T_YD["yield_distributions"]
        T_YA["yield_allocations"]
        T_FA["fee_allocations"]
        T_IA["ib_allocations"]
        T_AUM["fund_daily_aum"]
        T_WR["withdrawal_requests"]
        T_AL["audit_log"]
        T_IYE["investor_yield_events"]
    end

    %% Admin actions
    A_TX -->|deposit/withdrawal| CRYSTAL
    A_YIELD -->|preview + apply| FEE_CALC
    A_WD -->|approve| CRYSTAL
    A_VOID -->|void| LEDGER
    A_REPORTS -->|generate| T_IYE

    %% Engine flows
    CRYSTAL -->|credit owed earnings| LEDGER
    FEE_CALC --> IB_CALC
    IB_CALC --> LEDGER
    LEDGER --> POSITION
    POSITION --> AUM
    LEDGER --> CONSERVE
    LEDGER --> AUDIT_LOG

    %% DB writes
    LEDGER --> T_TX
    POSITION --> T_POS
    AUM --> T_AUM
    FEE_CALC --> T_FA
    IB_CALC --> T_IA
    AUDIT_LOG --> T_AL
    CRYSTAL --> T_IYE

    %% Investor reads
    I_DASH --> T_POS
    I_PORT --> T_POS
    I_TX --> T_TX
    I_YIELD --> T_IYE
    I_WD --> T_WR
    I_PERF --> T_POS

    style CRYSTAL fill:#4ade80,color:#000
    style LEDGER fill:#4ade80,color:#000
    style POSITION fill:#4ade80,color:#000
    style AUM fill:#4ade80,color:#000
    style FEE_CALC fill:#4ade80,color:#000
    style IB_CALC fill:#4ade80,color:#000
    style CONSERVE fill:#4ade80,color:#000
    style AUDIT_LOG fill:#4ade80,color:#000
```

---

## 1. Deposit Flow

What happens when admin records a deposit for an investor.

```mermaid
sequenceDiagram
    actor Admin
    participant UI as Transaction Form
    participant TS as transactionService
    participant RPC as apply_transaction_with_crystallization
    participant Crystal as crystallize_yield_before_flow
    participant Ledger as transactions_v2
    participant Trigger as trg_ledger_sync
    participant Pos as investor_positions
    participant AUM as fund_daily_aum
    participant Audit as audit_log

    Admin->>UI: Fill form (investor, fund, amount, date)
    UI->>UI: Validate (amount > 0, investor selected)
    Note over UI: If amount > 1M: show confirmation dialog

    UI->>TS: createTransactionWithCrystallization()
    TS->>TS: Generate reference_id (idempotency key)
    TS->>RPC: call RPC (11 params)

    RPC->>RPC: Check: last_crystal_date < tx_date?
    alt Crystallization needed
        RPC->>Crystal: crystallize_yield_before_flow()
        Crystal->>Crystal: Lookup AUM (aum_date <= event_date)
        Crystal->>Crystal: Calculate owed yield per investor
        Crystal->>Ledger: Insert YIELD/FEE_CREDIT/IB_CREDIT txs
        Crystal->>AUM: Insert preflow AUM record
        Crystal-->>RPC: { gross_yield, investors_affected }
    end

    RPC->>Ledger: INSERT DEPOSIT transaction
    Ledger->>Trigger: AFTER INSERT fires
    Trigger->>Pos: UPDATE current_value += amount
    Trigger->>Pos: UPDATE cost_basis
    Ledger->>Audit: Delta audit trigger fires

    RPC-->>TS: { success, deposit_tx_id, crystallization }
    TS-->>UI: Success
    UI->>UI: Invalidate caches (positions, AUM, transactions)
    UI-->>Admin: Toast: "Transaction created successfully"
```

---

## 2. Withdrawal Flow

Full lifecycle from investor request to admin approval.

```mermaid
sequenceDiagram
    actor Investor
    actor Admin
    participant InvUI as Investor Portal
    participant WdSvc as withdrawalService
    participant WdRPC as create_withdrawal_request
    participant AdminUI as Withdrawal Management
    participant AppRPC as approve_and_complete_withdrawal
    participant Ledger as transactions_v2
    participant Trigger as trg_ledger_sync
    participant Pos as investor_positions
    participant Audit as audit_log

    Note over Investor,Audit: PHASE 1: Investor submits request

    Investor->>InvUI: Select fund, enter amount, submit
    InvUI->>InvUI: Validate (amount <= balance, amount > 0)
    InvUI->>WdSvc: submitInvestorWithdrawal()
    WdSvc->>WdRPC: create_withdrawal_request()
    WdRPC->>WdRPC: Validate balance >= amount
    WdRPC->>WdRPC: INSERT withdrawal_requests (status=pending)
    WdRPC->>Audit: Audit log entry
    WdRPC-->>InvUI: request_id
    InvUI-->>Investor: "Request submitted" (status: Pending)

    Note over Investor,Audit: PHASE 2: Admin reviews

    Admin->>AdminUI: Open Withdrawal Management
    AdminUI->>AdminUI: Show pending requests table

    alt Approve
        Admin->>AdminUI: Click Approve, enter processed amount
        AdminUI->>AppRPC: approve_and_complete_withdrawal()
        AppRPC->>AppRPC: Verify admin + balance + status=pending
        AppRPC->>AppRPC: UPDATE withdrawal_requests (status=completed)
        AppRPC->>Ledger: INSERT WITHDRAWAL transaction
        Ledger->>Trigger: AFTER INSERT fires
        Trigger->>Pos: UPDATE current_value -= amount
        Ledger->>Audit: Delta audit trigger
        AppRPC-->>AdminUI: Success
        AdminUI-->>Admin: Toast: "Withdrawal approved"
    else Reject
        Admin->>AdminUI: Click Reject, enter reason
        AdminUI->>AppRPC: reject_withdrawal()
        AppRPC->>AppRPC: UPDATE withdrawal_requests (status=rejected, reason)
        AppRPC->>Audit: Audit log entry
        AppRPC-->>AdminUI: Success
        AdminUI-->>Admin: Toast: "Withdrawal rejected"
    else Cancel
        Admin->>AdminUI: Click Cancel
        AdminUI->>AppRPC: cancel_withdrawal()
        AppRPC->>AppRPC: UPDATE withdrawal_requests (status=cancelled)
    end

    Note over Investor,Audit: PHASE 3: Investor sees result

    Investor->>InvUI: Check withdrawal history
    InvUI-->>Investor: Status updated + balance changed (if approved)
```

---

## 3. Yield Distribution Flow

Preview, apply, and post-processing.

```mermaid
sequenceDiagram
    actor Admin
    participant UI as Yield Operations Page
    participant Preview as yieldPreviewService
    participant Apply as yieldApplyService
    participant V5 as V5 Yield Engine (SQL)
    participant Ledger as transactions_v2
    participant YD as yield_distributions
    participant YA as yield_allocations
    participant FA as fee_allocations
    participant IA as ib_allocations
    participant Pos as investor_positions
    participant AUM as fund_daily_aum
    participant IYE as investor_yield_events
    participant Notify as yieldNotifications

    Note over Admin,Notify: PHASE 1: Preview (read-only)

    Admin->>UI: Select fund, enter new AUM, pick period
    UI->>Preview: previewYieldDistribution()
    Preview->>Preview: Validate UUID + AUM > 0
    Preview->>V5: RPC preview_segmented_yield_distribution_v5
    V5->>V5: Read crystallization markers for segment boundaries
    V5->>V5: Calculate opening AUM per segment
    V5->>V5: Gross = recorded_aum - opening_aum
    V5->>V5: Per investor: ADB weighting (balance x days)
    V5->>V5: Per investor: fee lookup (override > schedule > fund default)
    V5->>V5: Per investor: IB = gross_share x ib_rate / 100
    V5->>V5: Conservation check: gross = net + fees + IB + dust
    V5-->>Preview: allocations[], totals, conservation result
    Preview-->>UI: Per-investor table

    Admin->>UI: Review preview, verify totals
    UI-->>Admin: Show: gross, fees, IB, net per investor

    Note over Admin,Notify: PHASE 2: Apply (writes to DB)

    Admin->>UI: Click Apply, type "APPLY YIELD" to confirm
    UI->>Apply: applyYieldDistribution()
    Apply->>V5: RPC apply_segmented_yield_distribution_v5

    V5->>YD: INSERT yield_distributions header
    V5->>YA: INSERT yield_allocations (per investor)
    V5->>FA: INSERT fee_allocations (per investor)
    V5->>IA: INSERT ib_allocations (per IB)

    loop For each investor
        V5->>Ledger: INSERT YIELD transaction
        Ledger->>Pos: trg_ledger_sync: position += net_yield
    end

    V5->>Ledger: INSERT FEE_CREDIT (fees account)
    Ledger->>Pos: trg_ledger_sync: fees position += fee_total

    loop For each IB parent
        V5->>Ledger: INSERT IB_CREDIT
        Ledger->>Pos: trg_ledger_sync: IB position += commission
    end

    V5->>AUM: INSERT fund_daily_aum (yield_aum_sync)
    V5-->>Apply: { success, distribution_id, investor_count }

    Note over Admin,Notify: PHASE 3: Post-processing

    Apply->>V5: RPC finalize_month_yield
    V5->>IYE: UPDATE visibility_scope to investor_visible

    Apply->>Notify: onFundYieldDistributed() (async, non-blocking)
    Apply-->>UI: Success result
    UI->>UI: Invalidate all caches
    UI-->>Admin: Toast: "Yield distributed to N investors"
```

---

## 4. Fee & Commission Calculation

How fees and IB commissions are determined during yield distribution.

```mermaid
flowchart TD
    START["Gross Yield per Investor"] --> FEE_LOOKUP

    subgraph FEE_LOOKUP["Fee Rate Lookup (per investor)"]
        F1{"Custom fee_percentage\non profile?"}
        F2{"Date-based fee_schedule\nfor this period?"}
        F3["Use fund default\n(fee_bps / 100 = 30%)"]

        F1 -->|Yes| USE_CUSTOM["Use custom rate"]
        F1 -->|No| F2
        F2 -->|Yes| USE_SCHEDULE["Use schedule rate"]
        F2 -->|No| F3
    end

    USE_CUSTOM --> CALC_FEE
    USE_SCHEDULE --> CALC_FEE
    F3 --> CALC_FEE

    CALC_FEE["fee_amount = gross x fee_rate"] --> NET
    NET["net_yield = gross - fee_amount"] --> IB_CHECK

    IB_CHECK{"Investor has\nIB parent?"}
    IB_CHECK -->|No| FINAL_NO_IB["Investor gets: net_yield\nFees account gets: fee_amount"]
    IB_CHECK -->|Yes| IB_LOOKUP

    subgraph IB_LOOKUP["IB Rate Lookup"]
        I1{"Date-based\nib_commission_schedule?"}
        I2["Use profile\nib_percentage"]

        I1 -->|Yes| USE_IB_SCHEDULE["Use schedule rate"]
        I1 -->|No| I2
    end

    USE_IB_SCHEDULE --> CALC_IB
    I2 --> CALC_IB

    CALC_IB["ib_amount = gross x ib_rate / 100\n(from GROSS, not net)"] --> FINAL_IB

    FINAL_IB["Investor gets: net_yield\nIB gets: ib_amount\nFees account gets: fee_amount - ib_amount"]

    subgraph NEGATIVE["If Yield is NEGATIVE"]
        NEG["All accounts lose proportionally\nfee_amount = 0\nib_amount = 0"]
    end

    subgraph CONSERVATION["Conservation Identity"]
        CON["gross = net + fees + IB + dust\nMUST always hold\nAutomatically verified"]
    end

    style CALC_FEE fill:#f59e0b,color:#000
    style CALC_IB fill:#8b5cf6,color:#fff
    style FINAL_NO_IB fill:#4ade80,color:#000
    style FINAL_IB fill:#4ade80,color:#000
    style NEG fill:#ef4444,color:#fff
    style CON fill:#3b82f6,color:#fff
```

---

## 5. Crystallization Flow

Automatic earnings protection before any deposit or withdrawal.

```mermaid
flowchart TD
    TRIGGER["Deposit or Withdrawal\nsubmitted by admin"] --> CHECK

    CHECK{"Last crystallization date\n< transaction date?"}
    CHECK -->|No: same day| SKIP["Skip crystallization\nProceed to transaction"]
    CHECK -->|Yes: days behind| CRYSTAL

    subgraph CRYSTAL["Crystallization Process"]
        C1["Look up last recorded AUM\n(aum_date <= event_date)"]
        C2["Read all investor positions\nin the fund"]
        C3["Opening AUM =\nsum of current positions"]
        C4["Gross yield =\nclosing AUM - opening AUM"]
        C5{"Gross yield\npositive, negative,\nor zero?"}

        C1 --> C2 --> C3 --> C4 --> C5

        C5 -->|Positive| POS_YIELD["Allocate proportionally\nApply fees + IB\nCreate YIELD transactions"]
        C5 -->|Negative| NEG_YIELD["All wallets lose proportionally\nNo fees, no IB\nCreate negative YIELD txs"]
        C5 -->|Zero| ZERO_YIELD["Record flat period\nNo transactions created"]
    end

    POS_YIELD --> UPDATE
    NEG_YIELD --> UPDATE
    ZERO_YIELD --> UPDATE

    subgraph UPDATE["Post-Crystallization"]
        U1["Update last_yield_crystallization_date"]
        U2["Write preflow AUM record"]
        U3["Create investor_yield_events\n(visibility = admin_only)"]
    end

    U1 --> PROCEED
    U2 --> PROCEED
    U3 --> PROCEED

    SKIP --> PROCEED
    PROCEED["Proceed with original\ndeposit or withdrawal"]

    style TRIGGER fill:#6366f1,color:#fff
    style CRYSTAL fill:#f0fdf4,color:#000
    style UPDATE fill:#eff6ff,color:#000
    style PROCEED fill:#4ade80,color:#000
```

---

## 6. Void Operations

How corrections work for transactions and yield distributions.

```mermaid
flowchart TD
    subgraph TX_VOID["Void a Transaction"]
        TV1["Admin selects transaction\nClicks Void"] --> TV2
        TV2["RPC: void_transaction"] --> TV3
        TV3["SET is_voided = true\non transactions_v2"] --> TV4
        TV4["trg_ledger_sync fires:\nReverses position change"] --> TV5
        TV5["Delta audit trigger:\nLogs void to audit_log"] --> TV6
        TV6["Cascade: void linked\ninvestor_yield_events"]
    end

    subgraph YD_VOID["Void a Yield Distribution"]
        YV1["Admin selects distribution\nClicks Void"] --> YV2
        YV2["Pre-void: get_void_aum_impact\nShows affected investors"] --> YV3
        YV3["Admin confirms void\nOptional: void crystals too"] --> YV4
        YV4["RPC: void_yield_distribution"] --> YV5

        YV5["SET is_voided = true on:\n- yield_distributions\n- yield_allocations\n- fee_allocations\n- ib_allocations"] --> YV6

        YV6["Void all linked transactions:\n- YIELD txs\n- FEE_CREDIT txs\n- IB_CREDIT txs"] --> YV7

        YV7["trg_ledger_sync fires\nfor EACH voided tx:\nReverses all position changes"] --> YV8

        YV8{"Void crystals\nrequested?"}
        YV8 -->|Yes| YV9["Also void crystallization\nyield events matching\nYLD:fund:date:investor pattern"]
        YV8 -->|No| YV10["Done"]
        YV9 --> YV10
    end

    subgraph RESULT["After Any Void"]
        R1["All positions revert to\nexact pre-operation amounts"]
        R2["Voided records remain\nin DB with is_voided=true\n(never deleted)"]
        R3["Full audit trail\nof the void action"]
    end

    TV6 --> RESULT
    YV10 --> RESULT

    style TX_VOID fill:#fef2f2,color:#000
    style YD_VOID fill:#fef2f2,color:#000
    style RESULT fill:#f0fdf4,color:#000
```

---

## 7. Report & Statement Flow

How monthly statements are generated and delivered.

```mermaid
sequenceDiagram
    actor Admin
    participant UI as Statement Manager
    participant GenSvc as generation service
    participant EF as Edge Function: generate-fund-performance
    participant DB as Database
    participant DelSvc as delivery service
    participant Mail as Edge Function: send-report-mailersend
    participant Email as MailerSend API

    Note over Admin,Email: PHASE 1: Generate performance data

    Admin->>UI: Select year/month, click "Generate Missing"
    UI->>GenSvc: generateFundPerformanceReports(year, month)
    GenSvc->>EF: invoke("generate-fund-performance")

    EF->>DB: Read transactions_v2 for period
    EF->>DB: Read investor_positions
    EF->>EF: Compute per investor per fund:<br/>beginning_balance, ending_balance,<br/>additions, redemptions, net_income,<br/>rate_of_return = (income/begin) x 100
    EF->>DB: UPSERT investor_fund_performance rows
    EF->>DB: Ensure statement_periods row exists
    EF-->>UI: { recordsCreated, statementsGenerated }

    Note over Admin,Email: PHASE 2: Preview

    Admin->>UI: Click Preview (eye icon) on investor row
    UI->>UI: Fetch statement HTML, show in iframe dialog
    Admin->>Admin: Review content

    Note over Admin,Email: PHASE 3: Send

    Admin->>UI: Click "Send All Generated"
    UI->>DelSvc: queueDeliveries(periodId)
    DelSvc->>DB: INSERT statement_email_delivery rows (status=queued)
    DelSvc-->>UI: { queued_count }

    loop For each queued delivery (batch of 25)
        UI->>DelSvc: sendViaMailerSend(deliveryId)
        DelSvc->>Mail: invoke("send-report-mailersend")
        Mail->>Mail: Generate HTML email
        Mail->>Email: Send via MailerSend API
        Email-->>Mail: Delivery confirmation
        Mail->>DB: UPDATE statement_email_delivery (status=sent)
        Mail-->>UI: Success
    end

    UI-->>Admin: Toast: "Sent N emails (M failed)"
```

---

## 8. Integrity Check Flow

Three tiers of system health verification.

```mermaid
flowchart TD
    subgraph TIER1["Tier 1: Real-Time Views (6 checks)"]
        direction TB
        T1_1["fund_aum_mismatch\nFund AUM = sum of positions?"]
        T1_2["yield_distribution_conservation_check\ngross = net + fees + IB + dust?"]
        T1_3["ib_allocation_consistency\nIB records match commissions?"]
        T1_4["investor_position_ledger_mismatch\nposition = sum(transactions)?"]
        T1_5["orphaned positions check\nAll positions have valid investors?"]
        T1_6["voided transaction count\nInformational: how many voided?"]
    end

    subgraph TIER2["Tier 2: Full Invariant Suite (16 checks)"]
        direction TB
        T2_1["Core checks (4):\nLedger sync, orphans,\nAUM match, conservation"]
        T2_2["IB checks (3):\nDuplicate allocations,\nconsistency, orphans"]
        T2_3["Temporal checks (5):\nStatement periods,\ndate sequencing,\nfee schedule gaps"]
        T2_4["Security checks (4):\nRLS active, admin gates,\naudit coverage,\ncanonical mutation guards"]
    end

    subgraph TIER3["Tier 3: Scheduled Check + Alerts"]
        direction TB
        T3_1["RPC: run_integrity_check"]
        T3_2["Write result to\nadmin_integrity_runs"]
        T3_3{"Violations\nfound?"}
        T3_4["Create admin_alerts\n(unacknowledged)"]
        T3_5["Auto-resolve stale alerts\n(if 0 violations)"]
    end

    ADMIN["Admin clicks\nRun Checks"] --> TIER1
    ADMIN --> TIER2

    TIER1 --> RESULT1["6 check results\ngreen/yellow/red per check"]
    TIER2 --> RESULT2["16 check results\npassed/failed per check"]

    SCHEDULE["Scheduled job or\nmanual trigger"] --> TIER3
    T3_1 --> T3_2 --> T3_3
    T3_3 -->|Yes| T3_4
    T3_3 -->|No| T3_5

    subgraph CRYSTAL_HEALTH["Crystallization Health"]
        CH1["v_crystallization_dashboard\nper-fund: up_to_date / stale / critical"]
        CH2["v_crystallization_gaps\nper-position: days behind, gap type"]
        CH3["Batch crystallize:\nfix gaps for a whole fund"]
    end

    ADMIN --> CRYSTAL_HEALTH

    style TIER1 fill:#dcfce7,color:#000
    style TIER2 fill:#dbeafe,color:#000
    style TIER3 fill:#fef3c7,color:#000
    style CRYSTAL_HEALTH fill:#f3e8ff,color:#000
```

---

## 9. Data Flow: What Writes Where

Every write operation and which tables it touches.

```mermaid
flowchart LR
    subgraph OPS["Operations"]
        DEP["Deposit"]
        WD["Withdrawal"]
        YIELD["Yield Distribution"]
        VOID_TX["Void Transaction"]
        VOID_YD["Void Distribution"]
        CRYSTAL["Crystallization"]
    end

    subgraph TABLES["Database Tables"]
        TX["transactions_v2"]
        POS["investor_positions\n(via trigger)"]
        YD["yield_distributions"]
        YA["yield_allocations"]
        FA["fee_allocations"]
        IA["ib_allocations"]
        AUM["fund_daily_aum"]
        WR["withdrawal_requests"]
        IYE["investor_yield_events"]
        AL["audit_log\n(via trigger)"]
    end

    DEP -->|INSERT DEPOSIT| TX
    DEP -->|auto-update| POS
    DEP -->|INSERT preflow| AUM
    DEP -->|delta audit| AL

    WD -->|UPDATE status| WR
    WD -->|INSERT WITHDRAWAL| TX
    WD -->|auto-update| POS
    WD -->|delta audit| AL

    YIELD -->|INSERT header| YD
    YIELD -->|INSERT per-investor| YA
    YIELD -->|INSERT fees| FA
    YIELD -->|INSERT commissions| IA
    YIELD -->|INSERT YIELD/FEE_CREDIT/IB_CREDIT| TX
    YIELD -->|auto-update all| POS
    YIELD -->|INSERT snapshot| AUM
    YIELD -->|UPDATE visibility| IYE
    YIELD -->|delta audit| AL

    VOID_TX -->|SET is_voided=true| TX
    VOID_TX -->|auto-reverse| POS
    VOID_TX -->|delta audit| AL

    VOID_YD -->|SET is_voided=true| YD
    VOID_YD -->|SET is_voided=true| YA
    VOID_YD -->|SET is_voided=true| FA
    VOID_YD -->|SET is_voided=true| IA
    VOID_YD -->|SET is_voided=true| TX
    VOID_YD -->|auto-reverse all| POS
    VOID_YD -->|delta audit| AL

    CRYSTAL -->|INSERT header| YD
    CRYSTAL -->|INSERT events| IYE
    CRYSTAL -->|INSERT preflow| AUM
    CRYSTAL -->|UPDATE crystal date| POS
```

---

## 10. User Journey: Investor Lifecycle

Complete journey from onboarding to earning yield.

```mermaid
flowchart TD
    START["Admin creates investor\n(invite or manual)"] --> ONBOARD

    ONBOARD["Investor receives\nemail invite"] --> LOGIN

    LOGIN["Investor logs in\nfor the first time"] --> DASH

    DASH["Investor Dashboard\nSees: 'No active positions'"] --> DEPOSIT

    DEPOSIT["Admin records first deposit\n(e.g., 10 BTC)"] --> BALANCE

    BALANCE["Investor sees:\n10.000 BTC balance\non Dashboard + Portfolio"] --> WAIT

    WAIT["Time passes...\nFund generates yield"] --> YIELD

    YIELD["Admin records month-end yield\n(e.g., +5%)"] --> EARN

    EARN["Investor sees in Yield History:\n+0.350 BTC net yield\n(after 30% fee)"] --> NEW_BALANCE

    NEW_BALANCE["Balance updated:\n10.350 BTC\nITD Return: +3.50%"] --> COMPOUND

    COMPOUND["Next month: yield compounds\non 10.350 BTC (not 10.000)"] --> WITHDRAW_OR_CONTINUE

    WITHDRAW_OR_CONTINUE{"Investor wants\nto withdraw?"}
    WITHDRAW_OR_CONTINUE -->|No| WAIT
    WITHDRAW_OR_CONTINUE -->|Yes| WD_REQ

    WD_REQ["Investor submits\nwithdrawal request"] --> ADMIN_REVIEW

    ADMIN_REVIEW{"Admin\nreviews"}
    ADMIN_REVIEW -->|Approve| WD_DONE["Balance decreases\nInvestor sees 'Completed'"]
    ADMIN_REVIEW -->|Reject| WD_REJECT["Balance unchanged\nInvestor sees reason"]

    WD_DONE --> STATEMENTS
    STATEMENTS["Monthly statements\ngenerated by admin\nInvestor can download PDF"]

    style START fill:#6366f1,color:#fff
    style EARN fill:#4ade80,color:#000
    style NEW_BALANCE fill:#4ade80,color:#000
    style WD_DONE fill:#f59e0b,color:#000
    style STATEMENTS fill:#3b82f6,color:#fff
```

---

## 11. Admin Monthly Operations Sequence

What admin does at month-end in order.

```mermaid
flowchart TD
    M1["1. Run Integrity Checks\n/admin/operations > Integrity\nVerify 16/16 pass"] --> M2

    M2["2. Record AUM per fund\n/admin/yield\nEnter new AUM for each fund"] --> M3

    M3["3. Preview yield distribution\nReview per-investor breakdown\nVerify conservation check passes"] --> M4

    M4["4. Apply yield distribution\nType 'APPLY YIELD' to confirm\nAll balances update atomically"] --> M5

    M5["5. Check INDIGO Fees\n/admin/fees\nVerify fee revenue looks correct"] --> M6

    M6["6. Generate statements\n/admin/investor-reports\nGenerate missing for the month"] --> M7

    M7["7. Preview a few statements\nSpot-check numbers match\nyield distribution amounts"] --> M8

    M8["8. Send statements\nClick 'Send All Generated'\nEmails delivered to investors"] --> M9

    M9["9. Run Integrity Checks again\n/admin/operations > Integrity\nVerify still 16/16 pass"] --> M10

    M10["10. Review Audit Trail\n/admin/audit-logs\nAll month-end actions logged"]

    style M1 fill:#ef4444,color:#fff
    style M4 fill:#f59e0b,color:#000
    style M8 fill:#3b82f6,color:#fff
    style M9 fill:#ef4444,color:#fff
```

---

## How to Render These Diagrams

**Option 1 -- mermaid.live (easiest)**
1. Go to [mermaid.live](https://mermaid.live)
2. Paste any code block above
3. Screenshot or download the SVG/PNG

**Option 2 -- Notion**
1. Type `/code` in Notion
2. Set language to "Mermaid"
3. Paste the diagram code
4. Notion renders it inline (requires Notion plan with Mermaid support)

**Option 3 -- VS Code**
1. Install "Markdown Preview Mermaid Support" extension
2. Open this file
3. Preview renders all diagrams

**Option 4 -- GitHub**
1. Push this file to any GitHub repo
2. GitHub renders Mermaid natively in markdown files
