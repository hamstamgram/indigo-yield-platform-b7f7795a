# Admin Operations Page Contract

## Route
`/admin/operations`

## Purpose
Central operations hub for administrators to monitor system health, recent activities, and perform bulk operations with real-time updates.

## Data Dependencies

### Primary Tables
- `audit_log` / `audit_logs` - System audit events
- `integrity_check_log` - Data integrity results
- `excel_import_log` - Import history
- Various operational tables

### Realtime Subscriptions
- `audit_log` - Live activity feed
- System health metrics

### Query Keys
- `QUERY_KEYS.integrityDashboard`
- `QUERY_KEYS.auditLog`
- `QUERY_KEYS.systemHealth`
- `QUERY_KEYS.pendingActions`
- `QUERY_KEYS.deliveryQueueMetrics`

## User Actions

### Monitor Activity
- View real-time activity feed
- Filter by action type, user, entity
- Search audit logs
- Export activity reports

### System Health
- View database health metrics
- Check data integrity status
- Monitor queue depths
- View error rates

### Bulk Operations
- Trigger integrity checks
- Run data reconciliation
- Process pending items
- Clear stale locks

### Import Management
- View import history
- Check import status
- Retry failed imports
- Download import logs

## Components
- `OperationsHubPage` - Main page container
- `ActivityFeed` - Real-time event list
- `SystemHealthPanel` - Health metrics
- `IntegrityStatus` - Data integrity overview
- `BulkActionsPanel` - Bulk operation controls
- `ImportHistory` - Import log table

## Hooks
- `useOperationsHub` - Operations data
- `useIntegrityData` - Integrity metrics
- `useRealtimeSubscription` - Live updates

## Permissions
- Requires `admin` role
- Bulk operations require confirmation
- Some operations require `super_admin`

## Real-time Features
- Uses Supabase realtime for live updates
- Auto-refreshes health metrics every 30s
- Shows toast notifications for critical events
