# Button Map - All CTAs

## Generated: 2024-12-22

## Admin Dashboard

| Button | Location | Handler | Backend | Permissions | Success State |
|--------|----------|---------|---------|-------------|---------------|
| Add Investor | Header | `openCreateWizard()` | INSERT profiles, user_roles | admin | Toast + redirect |
| Add Transaction | Header | `openTransactionModal()` | INSERT transactions_v2 | admin | Toast + refresh |
| Record Yield | Header | `openYieldModal()` | RPC apply_yield | admin | Toast + refresh |
| Generate Reports | Reports tab | `generateReports()` | RPC generate_statements | admin | Progress bar |
| Queue Deliveries | Delivery Center | `queueDeliveries()` | RPC queue_statement_deliveries | admin | Count display |
| Send Emails | Delivery Center | `processQueue()` | Edge: send-report-mailersend | admin | Status update |

## Investor Management

| Button | Location | Handler | Backend | Permissions | Success State |
|--------|----------|---------|---------|-------------|---------------|
| View Details | Table row | `navigate(/admin/investors/:id)` | SELECT profiles | admin | Page load |
| Edit Investor | Detail page | `openEditModal()` | UPDATE profiles | admin | Toast + refresh |
| Add Position | Positions tab | `openPositionModal()` | INSERT transactions_v2 | admin | Toast + refresh |
| Convert to IB | Detail page | `convertToIB()` | INSERT user_roles | admin | Toast + badge |
| Deactivate | Detail page | `deactivateInvestor()` | UPDATE profiles | super_admin | Confirm + toast |

## Transaction Management

| Button | Location | Handler | Backend | Permissions | Success State |
|--------|----------|---------|---------|-------------|---------------|
| Add Transaction | Table header | `openTransactionModal()` | INSERT transactions_v2 | admin | Toast + refresh |
| View Transaction | Table row | `openDetailModal()` | SELECT transactions_v2 | admin | Modal display |
| Edit Transaction | Detail modal | `openEditModal()` | UPDATE transactions_v2 | admin | Toast + refresh |
| Delete Transaction | Detail modal | `confirmDelete()` | DELETE transactions_v2 | super_admin | Confirm + toast |

## Yield Distribution

| Button | Location | Handler | Backend | Permissions | Success State |
|--------|----------|---------|---------|-------------|---------------|
| Preview Distribution | Form | `previewYield()` | RPC preview_yield | admin | Table display |
| Apply Distribution | Preview modal | `applyYield()` | RPC apply_yield | admin | Toast + refresh |
| Correct Yield | History row | `openCorrectionModal()` | RPC correct_yield | admin | Confirm + toast |
| Reverse Distribution | History row | `reverseDistribution()` | RPC reverse_yield | super_admin | Typed confirm |

## Report Management

| Button | Location | Handler | Backend | Permissions | Success State |
|--------|----------|---------|---------|-------------|---------------|
| Generate All | Period header | `generateAllReports()` | RPC generate_statements | admin | Progress bar |
| Regenerate | Report row | `regenerateReport()` | RPC generate_statement | admin | Toast |
| Preview | Report row | `openPreviewModal()` | SELECT generated_statements | admin | Modal display |
| Download HTML | Preview modal | `downloadHTML()` | Client-side | admin | File download |
| Send Email | Report row | `sendEmail()` | Edge: send-report-mailersend | admin | Status update |

## Email Delivery Center

| Button | Location | Handler | Backend | Permissions | Success State |
|--------|----------|---------|---------|-------------|---------------|
| Queue Deliveries | Header | `queueDeliveries()` | RPC queue_statement_deliveries | admin | Count toast |
| Process Queue | Header | `processQueue()` | Edge: send-report-mailersend | admin | Progress |
| Retry Failed | Row action | `retryDelivery()` | RPC retry_delivery | admin | Status update |
| Cancel Pending | Row action | `cancelDelivery()` | RPC cancel_delivery | admin | Status update |
| Mark Sent | Row action | `markSentManually()` | RPC mark_sent_manually | admin | Status update |
| Refresh Status | Header | `refreshStatus()` | Edge: refresh-delivery-status | admin | Status update |

## Fund Management

| Button | Location | Handler | Backend | Permissions | Success State |
|--------|----------|---------|---------|-------------|---------------|
| Add Fund | Header | `openFundModal()` | INSERT funds | super_admin | Toast + refresh |
| Edit Fund | Row action | `openEditModal()` | UPDATE funds | admin | Toast + refresh |
| Archive Fund | Row action | `archiveFund()` | UPDATE funds status | super_admin | Confirm + toast |

## Settings Pages

| Button | Location | Handler | Backend | Permissions | Success State |
|--------|----------|---------|---------|-------------|---------------|
| Save Settings | Platform Settings | `saveSettings()` | UPDATE platform_settings | super_admin | Toast |
| Add Admin | Admin List | `openInviteModal()` | INSERT admin_invites | super_admin | Toast + email |
| Remove Admin | Admin row | `removeAdmin()` | DELETE user_roles | super_admin | Typed confirm |
| Run Health Check | System Health | `runHealthCheck()` | Multiple RPCs | admin | Status display |

## Navigation Consistency

All "Add Transaction" buttons across the platform:
- Use the same `TransactionModal` component
- Accept optional `investorId` prop for pre-selection
- Validate against same rules
- Show same success/error states

## Result: ✅ PASS
All buttons mapped with consistent handlers and permissions.
