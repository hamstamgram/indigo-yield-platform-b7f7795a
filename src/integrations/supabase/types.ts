export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      access_logs: {
        Row: {
          created_at: string
          device_label: string | null
          event: Database["public"]["Enums"]["access_event"]
          id: string
          ip: unknown
          success: boolean
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          device_label?: string | null
          event: Database["public"]["Enums"]["access_event"]
          id?: string
          ip?: unknown
          success?: boolean
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          device_label?: string | null
          event?: Database["public"]["Enums"]["access_event"]
          id?: string
          ip?: unknown
          success?: boolean
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      accounting_periods: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string | null
          fund_id: string
          id: string
          locked_at: string | null
          locked_by: string | null
          notes: string | null
          period_end: string
          period_start: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          fund_id: string
          id?: string
          locked_at?: string | null
          locked_by?: string | null
          notes?: string | null
          period_end: string
          period_start: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          fund_id?: string
          id?: string
          locked_at?: string | null
          locked_by?: string | null
          notes?: string | null
          period_end?: string
          period_start?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "accounting_periods_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "aum_position_reconciliation"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "accounting_periods_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "fund_aum_mismatch"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "accounting_periods_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "funds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounting_periods_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_aum_position_mismatch"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "accounting_periods_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_aum_snapshot_health"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "accounting_periods_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_crystallization_dashboard"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "accounting_periods_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_fund_aum_position_health"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "accounting_periods_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_fund_aum_position_status"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "accounting_periods_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_fund_summary_live"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "accounting_periods_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_liquidity_risk"
            referencedColumns: ["fund_id"]
          },
        ]
      }
      admin_alerts: {
        Row: {
          acknowledged_at: string | null
          acknowledged_by: string | null
          alert_type: string
          created_at: string
          id: string
          message: string | null
          metadata: Json | null
          notification_channel: string | null
          notification_sent_at: string | null
          related_run_id: string | null
          severity: string
          title: string
        }
        Insert: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          alert_type: string
          created_at?: string
          id?: string
          message?: string | null
          metadata?: Json | null
          notification_channel?: string | null
          notification_sent_at?: string | null
          related_run_id?: string | null
          severity: string
          title: string
        }
        Update: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          alert_type?: string
          created_at?: string
          id?: string
          message?: string | null
          metadata?: Json | null
          notification_channel?: string | null
          notification_sent_at?: string | null
          related_run_id?: string | null
          severity?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_alerts_acknowledged_by_fkey"
            columns: ["acknowledged_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_alerts_acknowledged_by_fkey"
            columns: ["acknowledged_by"]
            isOneToOne: false
            referencedRelation: "profiles_display"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_alerts_acknowledged_by_fkey"
            columns: ["acknowledged_by"]
            isOneToOne: false
            referencedRelation: "v_investor_kpis"
            referencedColumns: ["investor_id"]
          },
          {
            foreignKeyName: "admin_alerts_related_run_id_fkey"
            columns: ["related_run_id"]
            isOneToOne: false
            referencedRelation: "admin_integrity_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_approvals: {
        Row: {
          action_type: string
          actual_value: number | null
          approval_signature: string | null
          approval_status: string
          approved_by: string | null
          entity_id: string
          entity_type: string
          expires_at: string | null
          id: string
          metadata: Json | null
          operation_type: string | null
          reason: string | null
          rejection_reason: string | null
          requested_at: string | null
          requested_by: string
          resolved_at: string | null
          threshold_value: number | null
        }
        Insert: {
          action_type: string
          actual_value?: number | null
          approval_signature?: string | null
          approval_status?: string
          approved_by?: string | null
          entity_id: string
          entity_type: string
          expires_at?: string | null
          id?: string
          metadata?: Json | null
          operation_type?: string | null
          reason?: string | null
          rejection_reason?: string | null
          requested_at?: string | null
          requested_by: string
          resolved_at?: string | null
          threshold_value?: number | null
        }
        Update: {
          action_type?: string
          actual_value?: number | null
          approval_signature?: string | null
          approval_status?: string
          approved_by?: string | null
          entity_id?: string
          entity_type?: string
          expires_at?: string | null
          id?: string
          metadata?: Json | null
          operation_type?: string | null
          reason?: string | null
          rejection_reason?: string | null
          requested_at?: string | null
          requested_by?: string
          resolved_at?: string | null
          threshold_value?: number | null
        }
        Relationships: []
      }
      admin_integrity_runs: {
        Row: {
          context: string | null
          created_by: string | null
          id: string
          run_at: string
          runtime_ms: number | null
          scope_fund_id: string | null
          scope_investor_id: string | null
          status: string
          triggered_by: string
          violations: Json | null
        }
        Insert: {
          context?: string | null
          created_by?: string | null
          id?: string
          run_at?: string
          runtime_ms?: number | null
          scope_fund_id?: string | null
          scope_investor_id?: string | null
          status: string
          triggered_by?: string
          violations?: Json | null
        }
        Update: {
          context?: string | null
          created_by?: string | null
          id?: string
          run_at?: string
          runtime_ms?: number | null
          scope_fund_id?: string | null
          scope_investor_id?: string | null
          status?: string
          triggered_by?: string
          violations?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "admin_integrity_runs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_integrity_runs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles_display"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_integrity_runs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_investor_kpis"
            referencedColumns: ["investor_id"]
          },
          {
            foreignKeyName: "admin_integrity_runs_scope_fund_id_fkey"
            columns: ["scope_fund_id"]
            isOneToOne: false
            referencedRelation: "aum_position_reconciliation"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "admin_integrity_runs_scope_fund_id_fkey"
            columns: ["scope_fund_id"]
            isOneToOne: false
            referencedRelation: "fund_aum_mismatch"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "admin_integrity_runs_scope_fund_id_fkey"
            columns: ["scope_fund_id"]
            isOneToOne: false
            referencedRelation: "funds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_integrity_runs_scope_fund_id_fkey"
            columns: ["scope_fund_id"]
            isOneToOne: false
            referencedRelation: "v_aum_position_mismatch"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "admin_integrity_runs_scope_fund_id_fkey"
            columns: ["scope_fund_id"]
            isOneToOne: false
            referencedRelation: "v_aum_snapshot_health"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "admin_integrity_runs_scope_fund_id_fkey"
            columns: ["scope_fund_id"]
            isOneToOne: false
            referencedRelation: "v_crystallization_dashboard"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "admin_integrity_runs_scope_fund_id_fkey"
            columns: ["scope_fund_id"]
            isOneToOne: false
            referencedRelation: "v_fund_aum_position_health"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "admin_integrity_runs_scope_fund_id_fkey"
            columns: ["scope_fund_id"]
            isOneToOne: false
            referencedRelation: "v_fund_aum_position_status"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "admin_integrity_runs_scope_fund_id_fkey"
            columns: ["scope_fund_id"]
            isOneToOne: false
            referencedRelation: "v_fund_summary_live"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "admin_integrity_runs_scope_fund_id_fkey"
            columns: ["scope_fund_id"]
            isOneToOne: false
            referencedRelation: "v_liquidity_risk"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "admin_integrity_runs_scope_investor_id_fkey"
            columns: ["scope_investor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_integrity_runs_scope_investor_id_fkey"
            columns: ["scope_investor_id"]
            isOneToOne: false
            referencedRelation: "profiles_display"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_integrity_runs_scope_investor_id_fkey"
            columns: ["scope_investor_id"]
            isOneToOne: false
            referencedRelation: "v_investor_kpis"
            referencedColumns: ["investor_id"]
          },
        ]
      }
      admin_invites: {
        Row: {
          created_at: string
          created_by: string | null
          email: string
          expires_at: string
          id: string
          intended_role: string | null
          invite_code: string
          used: boolean | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          email: string
          expires_at: string
          id?: string
          intended_role?: string | null
          invite_code: string
          used?: boolean | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          email?: string
          expires_at?: string
          id?: string
          intended_role?: string | null
          invite_code?: string
          used?: boolean | null
        }
        Relationships: []
      }
      assets: {
        Row: {
          created_at: string
          decimal_places: number
          icon_url: string | null
          id: number
          is_active: boolean
          name: string
          symbol: Database["public"]["Enums"]["asset_code"]
        }
        Insert: {
          created_at?: string
          decimal_places?: number
          icon_url?: string | null
          id?: number
          is_active?: boolean
          name: string
          symbol: Database["public"]["Enums"]["asset_code"]
        }
        Update: {
          created_at?: string
          decimal_places?: number
          icon_url?: string | null
          id?: number
          is_active?: boolean
          name?: string
          symbol?: Database["public"]["Enums"]["asset_code"]
        }
        Relationships: []
      }
      audit_log: {
        Row: {
          action: string
          actor_user: string | null
          created_at: string
          entity: string
          entity_id: string | null
          id: string
          meta: Json | null
          new_values: Json | null
          old_values: Json | null
        }
        Insert: {
          action: string
          actor_user?: string | null
          created_at?: string
          entity: string
          entity_id?: string | null
          id?: string
          meta?: Json | null
          new_values?: Json | null
          old_values?: Json | null
        }
        Update: {
          action?: string
          actor_user?: string | null
          created_at?: string
          entity?: string
          entity_id?: string | null
          id?: string
          meta?: Json | null
          new_values?: Json | null
          old_values?: Json | null
        }
        Relationships: []
      }
      correction_runs: {
        Row: {
          completed_at: string | null
          correction_type: string
          created_at: string | null
          created_by: string | null
          effective_date: string | null
          fund_id: string | null
          id: string
          input_hash: string
          parameters: Json
          result: Json | null
          status: string
        }
        Insert: {
          completed_at?: string | null
          correction_type: string
          created_at?: string | null
          created_by?: string | null
          effective_date?: string | null
          fund_id?: string | null
          id?: string
          input_hash: string
          parameters: Json
          result?: Json | null
          status?: string
        }
        Update: {
          completed_at?: string | null
          correction_type?: string
          created_at?: string | null
          created_by?: string | null
          effective_date?: string | null
          fund_id?: string | null
          id?: string
          input_hash?: string
          parameters?: Json
          result?: Json | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "correction_runs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "correction_runs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles_display"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "correction_runs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_investor_kpis"
            referencedColumns: ["investor_id"]
          },
          {
            foreignKeyName: "correction_runs_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "aum_position_reconciliation"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "correction_runs_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "fund_aum_mismatch"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "correction_runs_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "funds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "correction_runs_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_aum_position_mismatch"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "correction_runs_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_aum_snapshot_health"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "correction_runs_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_crystallization_dashboard"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "correction_runs_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_fund_aum_position_health"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "correction_runs_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_fund_aum_position_status"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "correction_runs_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_fund_summary_live"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "correction_runs_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_liquidity_risk"
            referencedColumns: ["fund_id"]
          },
        ]
      }
      daily_nav: {
        Row: {
          aum: number
          created_at: string | null
          created_by: string | null
          fees_accrued: number | null
          fund_id: string
          gross_return_pct: number | null
          high_water_mark: number | null
          investor_count: number | null
          is_month_end: boolean | null
          nav_date: string
          nav_per_share: number | null
          net_return_pct: number | null
          purpose: Database["public"]["Enums"]["aum_purpose"]
          shares_outstanding: number | null
          total_inflows: number | null
          total_outflows: number | null
        }
        Insert: {
          aum: number
          created_at?: string | null
          created_by?: string | null
          fees_accrued?: number | null
          fund_id: string
          gross_return_pct?: number | null
          high_water_mark?: number | null
          investor_count?: number | null
          is_month_end?: boolean | null
          nav_date: string
          nav_per_share?: number | null
          net_return_pct?: number | null
          purpose?: Database["public"]["Enums"]["aum_purpose"]
          shares_outstanding?: number | null
          total_inflows?: number | null
          total_outflows?: number | null
        }
        Update: {
          aum?: number
          created_at?: string | null
          created_by?: string | null
          fees_accrued?: number | null
          fund_id?: string
          gross_return_pct?: number | null
          high_water_mark?: number | null
          investor_count?: number | null
          is_month_end?: boolean | null
          nav_date?: string
          nav_per_share?: number | null
          net_return_pct?: number | null
          purpose?: Database["public"]["Enums"]["aum_purpose"]
          shares_outstanding?: number | null
          total_inflows?: number | null
          total_outflows?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "daily_nav_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_nav_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles_display"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_nav_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_investor_kpis"
            referencedColumns: ["investor_id"]
          },
          {
            foreignKeyName: "daily_nav_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "aum_position_reconciliation"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "daily_nav_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "fund_aum_mismatch"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "daily_nav_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "funds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_nav_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_aum_position_mismatch"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "daily_nav_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_aum_snapshot_health"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "daily_nav_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_crystallization_dashboard"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "daily_nav_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_fund_aum_position_health"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "daily_nav_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_fund_aum_position_status"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "daily_nav_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_fund_summary_live"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "daily_nav_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_liquidity_risk"
            referencedColumns: ["fund_id"]
          },
        ]
      }
      daily_rates: {
        Row: {
          btc_rate: number
          created_at: string | null
          created_by: string | null
          eth_rate: number
          eurc_rate: number
          id: string
          notes: string | null
          rate_date: string
          sol_rate: number
          updated_at: string | null
          usdc_rate: number
          usdt_rate: number
          xaut_rate: number | null
          xrp_rate: number | null
        }
        Insert: {
          btc_rate: number
          created_at?: string | null
          created_by?: string | null
          eth_rate: number
          eurc_rate?: number
          id?: string
          notes?: string | null
          rate_date: string
          sol_rate: number
          updated_at?: string | null
          usdc_rate?: number
          usdt_rate?: number
          xaut_rate?: number | null
          xrp_rate?: number | null
        }
        Update: {
          btc_rate?: number
          created_at?: string | null
          created_by?: string | null
          eth_rate?: number
          eurc_rate?: number
          id?: string
          notes?: string | null
          rate_date?: string
          sol_rate?: number
          updated_at?: string | null
          usdc_rate?: number
          usdt_rate?: number
          xaut_rate?: number | null
          xrp_rate?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "daily_rates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_rates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles_display"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_rates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_investor_kpis"
            referencedColumns: ["investor_id"]
          },
        ]
      }
      data_edit_audit: {
        Row: {
          changed_fields: string[] | null
          edit_source: string | null
          edited_at: string | null
          edited_by: string | null
          id: string
          import_id: string | null
          import_related: boolean | null
          new_data: Json | null
          old_data: Json | null
          operation: string | null
          record_id: string
          table_name: string
          voided_record: boolean | null
        }
        Insert: {
          changed_fields?: string[] | null
          edit_source?: string | null
          edited_at?: string | null
          edited_by?: string | null
          id?: string
          import_id?: string | null
          import_related?: boolean | null
          new_data?: Json | null
          old_data?: Json | null
          operation?: string | null
          record_id: string
          table_name: string
          voided_record?: boolean | null
        }
        Update: {
          changed_fields?: string[] | null
          edit_source?: string | null
          edited_at?: string | null
          edited_by?: string | null
          id?: string
          import_id?: string | null
          import_related?: boolean | null
          new_data?: Json | null
          old_data?: Json | null
          operation?: string | null
          record_id?: string
          table_name?: string
          voided_record?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "data_edit_audit_edited_by_fkey"
            columns: ["edited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "data_edit_audit_edited_by_fkey"
            columns: ["edited_by"]
            isOneToOne: false
            referencedRelation: "profiles_display"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "data_edit_audit_edited_by_fkey"
            columns: ["edited_by"]
            isOneToOne: false
            referencedRelation: "v_investor_kpis"
            referencedColumns: ["investor_id"]
          },
        ]
      }
      documents: {
        Row: {
          checksum: string | null
          created_at: string
          created_by: string | null
          created_by_profile_id: string | null
          fund_id: string | null
          id: string
          period_end: string | null
          period_start: string | null
          storage_path: string
          title: string
          type: Database["public"]["Enums"]["document_type"]
          user_id: string
          user_profile_id: string | null
        }
        Insert: {
          checksum?: string | null
          created_at?: string
          created_by?: string | null
          created_by_profile_id?: string | null
          fund_id?: string | null
          id?: string
          period_end?: string | null
          period_start?: string | null
          storage_path: string
          title: string
          type: Database["public"]["Enums"]["document_type"]
          user_id: string
          user_profile_id?: string | null
        }
        Update: {
          checksum?: string | null
          created_at?: string
          created_by?: string | null
          created_by_profile_id?: string | null
          fund_id?: string | null
          id?: string
          period_end?: string | null
          period_start?: string | null
          storage_path?: string
          title?: string
          type?: Database["public"]["Enums"]["document_type"]
          user_id?: string
          user_profile_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_documents_created_by_profile"
            columns: ["created_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_documents_created_by_profile"
            columns: ["created_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles_display"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_documents_created_by_profile"
            columns: ["created_by_profile_id"]
            isOneToOne: false
            referencedRelation: "v_investor_kpis"
            referencedColumns: ["investor_id"]
          },
          {
            foreignKeyName: "fk_documents_user_profile"
            columns: ["user_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_documents_user_profile"
            columns: ["user_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles_display"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_documents_user_profile"
            columns: ["user_profile_id"]
            isOneToOne: false
            referencedRelation: "v_investor_kpis"
            referencedColumns: ["investor_id"]
          },
        ]
      }
      error_code_metadata: {
        Row: {
          category: string
          created_at: string
          default_message: string
          error_code: string
          is_retryable: boolean
          severity: string
          ui_action: string | null
          user_action_hint: string | null
        }
        Insert: {
          category: string
          created_at?: string
          default_message: string
          error_code: string
          is_retryable?: boolean
          severity?: string
          ui_action?: string | null
          user_action_hint?: string | null
        }
        Update: {
          category?: string
          created_at?: string
          default_message?: string
          error_code?: string
          is_retryable?: boolean
          severity?: string
          ui_action?: string | null
          user_action_hint?: string | null
        }
        Relationships: []
      }
      fee_allocations: {
        Row: {
          base_net_income: number
          created_at: string | null
          created_by: string | null
          credit_transaction_id: string | null
          debit_transaction_id: string | null
          distribution_id: string
          fee_amount: number
          fee_percentage: number
          fees_account_id: string
          fund_id: string
          id: string
          investor_id: string
          is_voided: boolean
          period_end: string
          period_start: string
          purpose: Database["public"]["Enums"]["aum_purpose"]
          voided_at: string | null
          voided_by: string | null
          voided_by_profile_id: string | null
        }
        Insert: {
          base_net_income: number
          created_at?: string | null
          created_by?: string | null
          credit_transaction_id?: string | null
          debit_transaction_id?: string | null
          distribution_id: string
          fee_amount: number
          fee_percentage: number
          fees_account_id?: string
          fund_id: string
          id?: string
          investor_id: string
          is_voided?: boolean
          period_end: string
          period_start: string
          purpose: Database["public"]["Enums"]["aum_purpose"]
          voided_at?: string | null
          voided_by?: string | null
          voided_by_profile_id?: string | null
        }
        Update: {
          base_net_income?: number
          created_at?: string | null
          created_by?: string | null
          credit_transaction_id?: string | null
          debit_transaction_id?: string | null
          distribution_id?: string
          fee_amount?: number
          fee_percentage?: number
          fees_account_id?: string
          fund_id?: string
          id?: string
          investor_id?: string
          is_voided?: boolean
          period_end?: string
          period_start?: string
          purpose?: Database["public"]["Enums"]["aum_purpose"]
          voided_at?: string | null
          voided_by?: string | null
          voided_by_profile_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fee_allocations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fee_allocations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles_display"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fee_allocations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_investor_kpis"
            referencedColumns: ["investor_id"]
          },
          {
            foreignKeyName: "fee_allocations_credit_transaction_id_fkey"
            columns: ["credit_transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fee_allocations_credit_transaction_id_fkey"
            columns: ["credit_transaction_id"]
            isOneToOne: false
            referencedRelation: "v_orphaned_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fee_allocations_credit_transaction_id_fkey"
            columns: ["credit_transaction_id"]
            isOneToOne: false
            referencedRelation: "v_transaction_distribution_orphans"
            referencedColumns: ["transaction_id"]
          },
          {
            foreignKeyName: "fee_allocations_debit_transaction_id_fkey"
            columns: ["debit_transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fee_allocations_debit_transaction_id_fkey"
            columns: ["debit_transaction_id"]
            isOneToOne: false
            referencedRelation: "v_orphaned_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fee_allocations_debit_transaction_id_fkey"
            columns: ["debit_transaction_id"]
            isOneToOne: false
            referencedRelation: "v_transaction_distribution_orphans"
            referencedColumns: ["transaction_id"]
          },
          {
            foreignKeyName: "fee_allocations_fees_account_id_fkey"
            columns: ["fees_account_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fee_allocations_fees_account_id_fkey"
            columns: ["fees_account_id"]
            isOneToOne: false
            referencedRelation: "profiles_display"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fee_allocations_fees_account_id_fkey"
            columns: ["fees_account_id"]
            isOneToOne: false
            referencedRelation: "v_investor_kpis"
            referencedColumns: ["investor_id"]
          },
          {
            foreignKeyName: "fk_fee_allocations_distribution"
            columns: ["distribution_id"]
            isOneToOne: false
            referencedRelation: "v_yield_conservation_violations"
            referencedColumns: ["distribution_id"]
          },
          {
            foreignKeyName: "fk_fee_allocations_distribution"
            columns: ["distribution_id"]
            isOneToOne: false
            referencedRelation: "yield_distribution_conservation_check"
            referencedColumns: ["distribution_id"]
          },
          {
            foreignKeyName: "fk_fee_allocations_distribution"
            columns: ["distribution_id"]
            isOneToOne: false
            referencedRelation: "yield_distributions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_fee_allocations_fund_v2"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "aum_position_reconciliation"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "fk_fee_allocations_fund_v2"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "fund_aum_mismatch"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "fk_fee_allocations_fund_v2"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "funds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_fee_allocations_fund_v2"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_aum_position_mismatch"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "fk_fee_allocations_fund_v2"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_aum_snapshot_health"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "fk_fee_allocations_fund_v2"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_crystallization_dashboard"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "fk_fee_allocations_fund_v2"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_fund_aum_position_health"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "fk_fee_allocations_fund_v2"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_fund_aum_position_status"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "fk_fee_allocations_fund_v2"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_fund_summary_live"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "fk_fee_allocations_fund_v2"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_liquidity_risk"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "fk_fee_allocations_investor_v2"
            columns: ["investor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_fee_allocations_investor_v2"
            columns: ["investor_id"]
            isOneToOne: false
            referencedRelation: "profiles_display"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_fee_allocations_investor_v2"
            columns: ["investor_id"]
            isOneToOne: false
            referencedRelation: "v_investor_kpis"
            referencedColumns: ["investor_id"]
          },
          {
            foreignKeyName: "fk_fee_allocations_voided_by_profile"
            columns: ["voided_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_fee_allocations_voided_by_profile"
            columns: ["voided_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles_display"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_fee_allocations_voided_by_profile"
            columns: ["voided_by_profile_id"]
            isOneToOne: false
            referencedRelation: "v_investor_kpis"
            referencedColumns: ["investor_id"]
          },
        ]
      }
      fund_aum_events: {
        Row: {
          closing_aum: number
          created_at: string
          created_by: string | null
          event_date: string
          event_ts: string
          fund_id: string
          id: string
          is_voided: boolean
          opening_aum: number
          post_flow_aum: number | null
          purpose: Database["public"]["Enums"]["aum_purpose"]
          trigger_reference: string | null
          trigger_type: string
          void_reason: string | null
          voided_at: string | null
          voided_by: string | null
          voided_by_profile_id: string | null
        }
        Insert: {
          closing_aum: number
          created_at?: string
          created_by?: string | null
          event_date: string
          event_ts: string
          fund_id: string
          id?: string
          is_voided?: boolean
          opening_aum: number
          post_flow_aum?: number | null
          purpose: Database["public"]["Enums"]["aum_purpose"]
          trigger_reference?: string | null
          trigger_type: string
          void_reason?: string | null
          voided_at?: string | null
          voided_by?: string | null
          voided_by_profile_id?: string | null
        }
        Update: {
          closing_aum?: number
          created_at?: string
          created_by?: string | null
          event_date?: string
          event_ts?: string
          fund_id?: string
          id?: string
          is_voided?: boolean
          opening_aum?: number
          post_flow_aum?: number | null
          purpose?: Database["public"]["Enums"]["aum_purpose"]
          trigger_reference?: string | null
          trigger_type?: string
          void_reason?: string | null
          voided_at?: string | null
          voided_by?: string | null
          voided_by_profile_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_fund_aum_events_voided_by_profile"
            columns: ["voided_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_fund_aum_events_voided_by_profile"
            columns: ["voided_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles_display"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_fund_aum_events_voided_by_profile"
            columns: ["voided_by_profile_id"]
            isOneToOne: false
            referencedRelation: "v_investor_kpis"
            referencedColumns: ["investor_id"]
          },
        ]
      }
      fund_daily_aum: {
        Row: {
          as_of_date: string | null
          aum_date: string
          created_at: string | null
          created_by: string | null
          fund_id: string
          id: string
          is_month_end: boolean | null
          is_voided: boolean
          nav_per_share: number | null
          purpose: Database["public"]["Enums"]["aum_purpose"]
          source: string | null
          temporal_lock_bypass: boolean | null
          total_aum: number
          total_shares: number | null
          updated_at: string | null
          updated_by: string | null
          void_reason: string | null
          voided_at: string | null
          voided_by: string | null
          voided_by_profile_id: string | null
        }
        Insert: {
          as_of_date?: string | null
          aum_date: string
          created_at?: string | null
          created_by?: string | null
          fund_id: string
          id?: string
          is_month_end?: boolean | null
          is_voided?: boolean
          nav_per_share?: number | null
          purpose?: Database["public"]["Enums"]["aum_purpose"]
          source?: string | null
          temporal_lock_bypass?: boolean | null
          total_aum?: number
          total_shares?: number | null
          updated_at?: string | null
          updated_by?: string | null
          void_reason?: string | null
          voided_at?: string | null
          voided_by?: string | null
          voided_by_profile_id?: string | null
        }
        Update: {
          as_of_date?: string | null
          aum_date?: string
          created_at?: string | null
          created_by?: string | null
          fund_id?: string
          id?: string
          is_month_end?: boolean | null
          is_voided?: boolean
          nav_per_share?: number | null
          purpose?: Database["public"]["Enums"]["aum_purpose"]
          source?: string | null
          temporal_lock_bypass?: boolean | null
          total_aum?: number
          total_shares?: number | null
          updated_at?: string | null
          updated_by?: string | null
          void_reason?: string | null
          voided_at?: string | null
          voided_by?: string | null
          voided_by_profile_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_fund_daily_aum_voided_by_profile"
            columns: ["voided_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_fund_daily_aum_voided_by_profile"
            columns: ["voided_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles_display"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_fund_daily_aum_voided_by_profile"
            columns: ["voided_by_profile_id"]
            isOneToOne: false
            referencedRelation: "v_investor_kpis"
            referencedColumns: ["investor_id"]
          },
          {
            foreignKeyName: "fund_daily_aum_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fund_daily_aum_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles_display"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fund_daily_aum_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_investor_kpis"
            referencedColumns: ["investor_id"]
          },
          {
            foreignKeyName: "fund_daily_aum_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "aum_position_reconciliation"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "fund_daily_aum_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "fund_aum_mismatch"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "fund_daily_aum_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "funds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fund_daily_aum_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_aum_position_mismatch"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "fund_daily_aum_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_aum_snapshot_health"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "fund_daily_aum_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_crystallization_dashboard"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "fund_daily_aum_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_fund_aum_position_health"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "fund_daily_aum_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_fund_aum_position_status"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "fund_daily_aum_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_fund_summary_live"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "fund_daily_aum_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_liquidity_risk"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "fund_daily_aum_voided_by_fkey"
            columns: ["voided_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fund_daily_aum_voided_by_fkey"
            columns: ["voided_by"]
            isOneToOne: false
            referencedRelation: "profiles_display"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fund_daily_aum_voided_by_fkey"
            columns: ["voided_by"]
            isOneToOne: false
            referencedRelation: "v_investor_kpis"
            referencedColumns: ["investor_id"]
          },
        ]
      }
      fund_daily_aum_archive: {
        Row: {
          archive_id: string
          archived_at: string
          archived_by: string | null
          as_of_date: string | null
          aum_date: string | null
          fund_id: string | null
          id: string | null
          nav_per_share: number | null
          original_created_at: string | null
          reset_batch_id: string
          source: string | null
          total_aum: number | null
          total_shares: number | null
        }
        Insert: {
          archive_id?: string
          archived_at?: string
          archived_by?: string | null
          as_of_date?: string | null
          aum_date?: string | null
          fund_id?: string | null
          id?: string | null
          nav_per_share?: number | null
          original_created_at?: string | null
          reset_batch_id: string
          source?: string | null
          total_aum?: number | null
          total_shares?: number | null
        }
        Update: {
          archive_id?: string
          archived_at?: string
          archived_by?: string | null
          as_of_date?: string | null
          aum_date?: string | null
          fund_id?: string | null
          id?: string | null
          nav_per_share?: number | null
          original_created_at?: string | null
          reset_batch_id?: string
          source?: string | null
          total_aum?: number | null
          total_shares?: number | null
        }
        Relationships: []
      }
      fund_yield_snapshots: {
        Row: {
          closing_aum: number
          created_at: string | null
          created_by: string | null
          days_in_period: number
          fund_id: string
          gross_yield_amount: number
          gross_yield_pct: number
          id: string
          opening_aum: number
          period_end: string
          period_start: string
          snapshot_date: string
          trigger_reference: string | null
          trigger_type: string
          updated_at: string | null
        }
        Insert: {
          closing_aum: number
          created_at?: string | null
          created_by?: string | null
          days_in_period?: number
          fund_id: string
          gross_yield_amount: number
          gross_yield_pct: number
          id?: string
          opening_aum: number
          period_end: string
          period_start: string
          snapshot_date: string
          trigger_reference?: string | null
          trigger_type?: string
          updated_at?: string | null
        }
        Update: {
          closing_aum?: number
          created_at?: string | null
          created_by?: string | null
          days_in_period?: number
          fund_id?: string
          gross_yield_amount?: number
          gross_yield_pct?: number
          id?: string
          opening_aum?: number
          period_end?: string
          period_start?: string
          snapshot_date?: string
          trigger_reference?: string | null
          trigger_type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_fund"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "aum_position_reconciliation"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "fk_fund"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "fund_aum_mismatch"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "fk_fund"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "funds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_fund"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_aum_position_mismatch"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "fk_fund"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_aum_snapshot_health"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "fk_fund"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_crystallization_dashboard"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "fk_fund"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_fund_aum_position_health"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "fk_fund"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_fund_aum_position_status"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "fk_fund"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_fund_summary_live"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "fk_fund"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_liquidity_risk"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "fund_yield_snapshots_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fund_yield_snapshots_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles_display"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fund_yield_snapshots_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_investor_kpis"
            referencedColumns: ["investor_id"]
          },
          {
            foreignKeyName: "fund_yield_snapshots_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "aum_position_reconciliation"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "fund_yield_snapshots_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "fund_aum_mismatch"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "fund_yield_snapshots_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "funds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fund_yield_snapshots_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_aum_position_mismatch"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "fund_yield_snapshots_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_aum_snapshot_health"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "fund_yield_snapshots_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_crystallization_dashboard"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "fund_yield_snapshots_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_fund_aum_position_health"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "fund_yield_snapshots_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_fund_aum_position_status"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "fund_yield_snapshots_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_fund_summary_live"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "fund_yield_snapshots_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_liquidity_risk"
            referencedColumns: ["fund_id"]
          },
        ]
      }
      funds: {
        Row: {
          asset: string
          code: string
          cooling_off_hours: number | null
          created_at: string | null
          fund_class: string
          high_water_mark: number | null
          id: string
          inception_date: string
          large_withdrawal_threshold: number | null
          lock_period_days: number | null
          logo_url: string | null
          max_daily_yield_pct: number | null
          mgmt_fee_bps: number | null
          min_investment: number | null
          name: string
          perf_fee_bps: number | null
          status: Database["public"]["Enums"]["fund_status"] | null
          strategy: string | null
          updated_at: string | null
        }
        Insert: {
          asset: string
          code: string
          cooling_off_hours?: number | null
          created_at?: string | null
          fund_class: string
          high_water_mark?: number | null
          id?: string
          inception_date?: string
          large_withdrawal_threshold?: number | null
          lock_period_days?: number | null
          logo_url?: string | null
          max_daily_yield_pct?: number | null
          mgmt_fee_bps?: number | null
          min_investment?: number | null
          name: string
          perf_fee_bps?: number | null
          status?: Database["public"]["Enums"]["fund_status"] | null
          strategy?: string | null
          updated_at?: string | null
        }
        Update: {
          asset?: string
          code?: string
          cooling_off_hours?: number | null
          created_at?: string | null
          fund_class?: string
          high_water_mark?: number | null
          id?: string
          inception_date?: string
          large_withdrawal_threshold?: number | null
          lock_period_days?: number | null
          logo_url?: string | null
          max_daily_yield_pct?: number | null
          mgmt_fee_bps?: number | null
          min_investment?: number | null
          name?: string
          perf_fee_bps?: number | null
          status?: Database["public"]["Enums"]["fund_status"] | null
          strategy?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      generated_reports: {
        Row: {
          created_at: string | null
          created_by: string | null
          fund_id: string | null
          html_content: string | null
          id: string
          investor_id: string | null
          pdf_url: string | null
          report_data: Json | null
          report_month: string | null
          report_name: string
          report_type: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          fund_id?: string | null
          html_content?: string | null
          id?: string
          investor_id?: string | null
          pdf_url?: string | null
          report_data?: Json | null
          report_month?: string | null
          report_name: string
          report_type: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          fund_id?: string | null
          html_content?: string | null
          id?: string
          investor_id?: string | null
          pdf_url?: string | null
          report_data?: Json | null
          report_month?: string | null
          report_name?: string
          report_type?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_generated_reports_fund"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "aum_position_reconciliation"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "fk_generated_reports_fund"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "fund_aum_mismatch"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "fk_generated_reports_fund"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "funds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_generated_reports_fund"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_aum_position_mismatch"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "fk_generated_reports_fund"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_aum_snapshot_health"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "fk_generated_reports_fund"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_crystallization_dashboard"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "fk_generated_reports_fund"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_fund_aum_position_health"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "fk_generated_reports_fund"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_fund_aum_position_status"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "fk_generated_reports_fund"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_fund_summary_live"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "fk_generated_reports_fund"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_liquidity_risk"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "generated_reports_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generated_reports_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles_display"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generated_reports_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_investor_kpis"
            referencedColumns: ["investor_id"]
          },
          {
            foreignKeyName: "generated_reports_investor_id_fkey"
            columns: ["investor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generated_reports_investor_id_fkey"
            columns: ["investor_id"]
            isOneToOne: false
            referencedRelation: "profiles_display"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generated_reports_investor_id_fkey"
            columns: ["investor_id"]
            isOneToOne: false
            referencedRelation: "v_investor_kpis"
            referencedColumns: ["investor_id"]
          },
        ]
      }
      generated_statements: {
        Row: {
          created_at: string | null
          fund_names: string[]
          generated_by: string
          html_content: string
          id: string
          investor_id: string
          pdf_url: string | null
          period_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          fund_names: string[]
          generated_by: string
          html_content: string
          id?: string
          investor_id: string
          pdf_url?: string | null
          period_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          fund_names?: string[]
          generated_by?: string
          html_content?: string
          id?: string
          investor_id?: string
          pdf_url?: string | null
          period_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "generated_statements_generated_by_fkey"
            columns: ["generated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generated_statements_generated_by_fkey"
            columns: ["generated_by"]
            isOneToOne: false
            referencedRelation: "profiles_display"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generated_statements_generated_by_fkey"
            columns: ["generated_by"]
            isOneToOne: false
            referencedRelation: "v_investor_kpis"
            referencedColumns: ["investor_id"]
          },
          {
            foreignKeyName: "generated_statements_investor_id_fkey"
            columns: ["investor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generated_statements_investor_id_fkey"
            columns: ["investor_id"]
            isOneToOne: false
            referencedRelation: "profiles_display"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generated_statements_investor_id_fkey"
            columns: ["investor_id"]
            isOneToOne: false
            referencedRelation: "v_investor_kpis"
            referencedColumns: ["investor_id"]
          },
          {
            foreignKeyName: "generated_statements_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "statement_periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generated_statements_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generated_statements_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_display"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generated_statements_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_investor_kpis"
            referencedColumns: ["investor_id"]
          },
        ]
      }
      global_fee_settings: {
        Row: {
          description: string | null
          setting_key: string
          updated_at: string | null
          updated_by: string | null
          value: number
        }
        Insert: {
          description?: string | null
          setting_key: string
          updated_at?: string | null
          updated_by?: string | null
          value: number
        }
        Update: {
          description?: string | null
          setting_key?: string
          updated_at?: string | null
          updated_by?: string | null
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "global_fee_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "global_fee_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles_display"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "global_fee_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "v_investor_kpis"
            referencedColumns: ["investor_id"]
          },
        ]
      }
      ib_allocations: {
        Row: {
          created_at: string | null
          created_by: string | null
          distribution_id: string | null
          effective_date: string
          fund_id: string | null
          ib_fee_amount: number
          ib_investor_id: string
          ib_percentage: number
          id: string
          is_voided: boolean
          paid_at: string | null
          paid_by: string | null
          payout_batch_id: string | null
          payout_status: string
          period_end: string | null
          period_id: string | null
          period_start: string | null
          purpose: Database["public"]["Enums"]["aum_purpose"]
          source: string | null
          source_investor_id: string
          source_net_income: number
          voided_at: string | null
          voided_by: string | null
          voided_by_profile_id: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          distribution_id?: string | null
          effective_date?: string
          fund_id?: string | null
          ib_fee_amount: number
          ib_investor_id: string
          ib_percentage: number
          id?: string
          is_voided?: boolean
          paid_at?: string | null
          paid_by?: string | null
          payout_batch_id?: string | null
          payout_status?: string
          period_end?: string | null
          period_id?: string | null
          period_start?: string | null
          purpose?: Database["public"]["Enums"]["aum_purpose"]
          source?: string | null
          source_investor_id: string
          source_net_income: number
          voided_at?: string | null
          voided_by?: string | null
          voided_by_profile_id?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          distribution_id?: string | null
          effective_date?: string
          fund_id?: string | null
          ib_fee_amount?: number
          ib_investor_id?: string
          ib_percentage?: number
          id?: string
          is_voided?: boolean
          paid_at?: string | null
          paid_by?: string | null
          payout_batch_id?: string | null
          payout_status?: string
          period_end?: string | null
          period_id?: string | null
          period_start?: string | null
          purpose?: Database["public"]["Enums"]["aum_purpose"]
          source?: string | null
          source_investor_id?: string
          source_net_income?: number
          voided_at?: string | null
          voided_by?: string | null
          voided_by_profile_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_ib_allocations_voided_by_profile"
            columns: ["voided_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_ib_allocations_voided_by_profile"
            columns: ["voided_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles_display"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_ib_allocations_voided_by_profile"
            columns: ["voided_by_profile_id"]
            isOneToOne: false
            referencedRelation: "v_investor_kpis"
            referencedColumns: ["investor_id"]
          },
          {
            foreignKeyName: "ib_allocations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ib_allocations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles_display"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ib_allocations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_investor_kpis"
            referencedColumns: ["investor_id"]
          },
          {
            foreignKeyName: "ib_allocations_distribution_id_fkey_v2"
            columns: ["distribution_id"]
            isOneToOne: false
            referencedRelation: "v_yield_conservation_violations"
            referencedColumns: ["distribution_id"]
          },
          {
            foreignKeyName: "ib_allocations_distribution_id_fkey_v2"
            columns: ["distribution_id"]
            isOneToOne: false
            referencedRelation: "yield_distribution_conservation_check"
            referencedColumns: ["distribution_id"]
          },
          {
            foreignKeyName: "ib_allocations_distribution_id_fkey_v2"
            columns: ["distribution_id"]
            isOneToOne: false
            referencedRelation: "yield_distributions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ib_allocations_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "aum_position_reconciliation"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "ib_allocations_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "fund_aum_mismatch"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "ib_allocations_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "funds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ib_allocations_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_aum_position_mismatch"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "ib_allocations_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_aum_snapshot_health"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "ib_allocations_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_crystallization_dashboard"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "ib_allocations_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_fund_aum_position_health"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "ib_allocations_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_fund_aum_position_status"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "ib_allocations_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_fund_summary_live"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "ib_allocations_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_liquidity_risk"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "ib_allocations_ib_investor_id_fkey"
            columns: ["ib_investor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ib_allocations_ib_investor_id_fkey"
            columns: ["ib_investor_id"]
            isOneToOne: false
            referencedRelation: "profiles_display"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ib_allocations_ib_investor_id_fkey"
            columns: ["ib_investor_id"]
            isOneToOne: false
            referencedRelation: "v_investor_kpis"
            referencedColumns: ["investor_id"]
          },
          {
            foreignKeyName: "ib_allocations_paid_by_fkey"
            columns: ["paid_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ib_allocations_paid_by_fkey"
            columns: ["paid_by"]
            isOneToOne: false
            referencedRelation: "profiles_display"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ib_allocations_paid_by_fkey"
            columns: ["paid_by"]
            isOneToOne: false
            referencedRelation: "v_investor_kpis"
            referencedColumns: ["investor_id"]
          },
          {
            foreignKeyName: "ib_allocations_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "statement_periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ib_allocations_source_investor_id_fkey"
            columns: ["source_investor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ib_allocations_source_investor_id_fkey"
            columns: ["source_investor_id"]
            isOneToOne: false
            referencedRelation: "profiles_display"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ib_allocations_source_investor_id_fkey"
            columns: ["source_investor_id"]
            isOneToOne: false
            referencedRelation: "v_investor_kpis"
            referencedColumns: ["investor_id"]
          },
        ]
      }
      ib_commission_ledger: {
        Row: {
          asset: string
          created_at: string | null
          created_by: string | null
          effective_date: string
          fund_id: string
          gross_yield_amount: number
          ib_commission_amount: number
          ib_id: string
          ib_name: string | null
          ib_percentage: number
          id: string
          is_voided: boolean | null
          source_investor_id: string
          source_investor_name: string | null
          transaction_id: string | null
          void_reason: string | null
          voided_at: string | null
          voided_by: string | null
          yield_distribution_id: string | null
        }
        Insert: {
          asset: string
          created_at?: string | null
          created_by?: string | null
          effective_date: string
          fund_id: string
          gross_yield_amount: number
          ib_commission_amount: number
          ib_id: string
          ib_name?: string | null
          ib_percentage: number
          id?: string
          is_voided?: boolean | null
          source_investor_id: string
          source_investor_name?: string | null
          transaction_id?: string | null
          void_reason?: string | null
          voided_at?: string | null
          voided_by?: string | null
          yield_distribution_id?: string | null
        }
        Update: {
          asset?: string
          created_at?: string | null
          created_by?: string | null
          effective_date?: string
          fund_id?: string
          gross_yield_amount?: number
          ib_commission_amount?: number
          ib_id?: string
          ib_name?: string | null
          ib_percentage?: number
          id?: string
          is_voided?: boolean | null
          source_investor_id?: string
          source_investor_name?: string | null
          transaction_id?: string | null
          void_reason?: string | null
          voided_at?: string | null
          voided_by?: string | null
          yield_distribution_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ib_commission_ledger_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ib_commission_ledger_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles_display"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ib_commission_ledger_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_investor_kpis"
            referencedColumns: ["investor_id"]
          },
          {
            foreignKeyName: "ib_commission_ledger_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "aum_position_reconciliation"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "ib_commission_ledger_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "fund_aum_mismatch"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "ib_commission_ledger_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "funds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ib_commission_ledger_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_aum_position_mismatch"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "ib_commission_ledger_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_aum_snapshot_health"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "ib_commission_ledger_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_crystallization_dashboard"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "ib_commission_ledger_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_fund_aum_position_health"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "ib_commission_ledger_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_fund_aum_position_status"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "ib_commission_ledger_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_fund_summary_live"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "ib_commission_ledger_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_liquidity_risk"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "ib_commission_ledger_ib_id_fkey"
            columns: ["ib_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ib_commission_ledger_ib_id_fkey"
            columns: ["ib_id"]
            isOneToOne: false
            referencedRelation: "profiles_display"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ib_commission_ledger_ib_id_fkey"
            columns: ["ib_id"]
            isOneToOne: false
            referencedRelation: "v_investor_kpis"
            referencedColumns: ["investor_id"]
          },
          {
            foreignKeyName: "ib_commission_ledger_source_investor_id_fkey"
            columns: ["source_investor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ib_commission_ledger_source_investor_id_fkey"
            columns: ["source_investor_id"]
            isOneToOne: false
            referencedRelation: "profiles_display"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ib_commission_ledger_source_investor_id_fkey"
            columns: ["source_investor_id"]
            isOneToOne: false
            referencedRelation: "v_investor_kpis"
            referencedColumns: ["investor_id"]
          },
          {
            foreignKeyName: "ib_commission_ledger_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ib_commission_ledger_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "v_orphaned_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ib_commission_ledger_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "v_transaction_distribution_orphans"
            referencedColumns: ["transaction_id"]
          },
          {
            foreignKeyName: "ib_commission_ledger_voided_by_fkey"
            columns: ["voided_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ib_commission_ledger_voided_by_fkey"
            columns: ["voided_by"]
            isOneToOne: false
            referencedRelation: "profiles_display"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ib_commission_ledger_voided_by_fkey"
            columns: ["voided_by"]
            isOneToOne: false
            referencedRelation: "v_investor_kpis"
            referencedColumns: ["investor_id"]
          },
          {
            foreignKeyName: "ib_commission_ledger_yield_distribution_id_fkey"
            columns: ["yield_distribution_id"]
            isOneToOne: false
            referencedRelation: "v_yield_conservation_violations"
            referencedColumns: ["distribution_id"]
          },
          {
            foreignKeyName: "ib_commission_ledger_yield_distribution_id_fkey"
            columns: ["yield_distribution_id"]
            isOneToOne: false
            referencedRelation: "yield_distribution_conservation_check"
            referencedColumns: ["distribution_id"]
          },
          {
            foreignKeyName: "ib_commission_ledger_yield_distribution_id_fkey"
            columns: ["yield_distribution_id"]
            isOneToOne: false
            referencedRelation: "yield_distributions"
            referencedColumns: ["id"]
          },
        ]
      }
      investor_daily_balance: {
        Row: {
          balance_date: string
          created_at: string | null
          end_of_day_balance: number
          fund_id: string
          id: string
          investor_id: string
          updated_at: string | null
        }
        Insert: {
          balance_date: string
          created_at?: string | null
          end_of_day_balance: number
          fund_id: string
          id?: string
          investor_id: string
          updated_at?: string | null
        }
        Update: {
          balance_date?: string
          created_at?: string | null
          end_of_day_balance?: number
          fund_id?: string
          id?: string
          investor_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "investor_daily_balance_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "aum_position_reconciliation"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "investor_daily_balance_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "fund_aum_mismatch"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "investor_daily_balance_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "funds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "investor_daily_balance_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_aum_position_mismatch"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "investor_daily_balance_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_aum_snapshot_health"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "investor_daily_balance_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_crystallization_dashboard"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "investor_daily_balance_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_fund_aum_position_health"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "investor_daily_balance_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_fund_aum_position_status"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "investor_daily_balance_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_fund_summary_live"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "investor_daily_balance_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_liquidity_risk"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "investor_daily_balance_investor_id_fkey"
            columns: ["investor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "investor_daily_balance_investor_id_fkey"
            columns: ["investor_id"]
            isOneToOne: false
            referencedRelation: "profiles_display"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "investor_daily_balance_investor_id_fkey"
            columns: ["investor_id"]
            isOneToOne: false
            referencedRelation: "v_investor_kpis"
            referencedColumns: ["investor_id"]
          },
        ]
      }
      investor_emails: {
        Row: {
          created_at: string | null
          email: string
          id: string
          investor_id: string
          is_primary: boolean | null
          updated_at: string | null
          verified: boolean | null
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
          investor_id: string
          is_primary?: boolean | null
          updated_at?: string | null
          verified?: boolean | null
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          investor_id?: string
          is_primary?: boolean | null
          updated_at?: string | null
          verified?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_investor_emails_investor"
            columns: ["investor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_investor_emails_investor"
            columns: ["investor_id"]
            isOneToOne: false
            referencedRelation: "profiles_display"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_investor_emails_investor"
            columns: ["investor_id"]
            isOneToOne: false
            referencedRelation: "v_investor_kpis"
            referencedColumns: ["investor_id"]
          },
        ]
      }
      investor_fee_schedule: {
        Row: {
          created_at: string
          effective_date: string
          end_date: string | null
          fee_pct: number
          fund_id: string | null
          id: string
          investor_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string
          effective_date: string
          end_date?: string | null
          fee_pct: number
          fund_id?: string | null
          id?: string
          investor_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string
          effective_date?: string
          end_date?: string | null
          fee_pct?: number
          fund_id?: string | null
          id?: string
          investor_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "investor_fee_schedule_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "aum_position_reconciliation"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "investor_fee_schedule_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "fund_aum_mismatch"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "investor_fee_schedule_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "funds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "investor_fee_schedule_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_aum_position_mismatch"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "investor_fee_schedule_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_aum_snapshot_health"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "investor_fee_schedule_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_crystallization_dashboard"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "investor_fee_schedule_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_fund_aum_position_health"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "investor_fee_schedule_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_fund_aum_position_status"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "investor_fee_schedule_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_fund_summary_live"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "investor_fee_schedule_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_liquidity_risk"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "investor_fee_schedule_investor_id_fkey"
            columns: ["investor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "investor_fee_schedule_investor_id_fkey"
            columns: ["investor_id"]
            isOneToOne: false
            referencedRelation: "profiles_display"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "investor_fee_schedule_investor_id_fkey"
            columns: ["investor_id"]
            isOneToOne: false
            referencedRelation: "v_investor_kpis"
            referencedColumns: ["investor_id"]
          },
        ]
      }
      investor_fund_performance: {
        Row: {
          created_at: string | null
          fund_name: string
          id: string
          investor_id: string
          itd_additions: number | null
          itd_beginning_balance: number | null
          itd_ending_balance: number | null
          itd_net_income: number | null
          itd_rate_of_return: number | null
          itd_redemptions: number | null
          mtd_additions: number | null
          mtd_beginning_balance: number | null
          mtd_ending_balance: number | null
          mtd_net_income: number | null
          mtd_rate_of_return: number | null
          mtd_redemptions: number | null
          period_id: string
          purpose: Database["public"]["Enums"]["aum_purpose"] | null
          qtd_additions: number | null
          qtd_beginning_balance: number | null
          qtd_ending_balance: number | null
          qtd_net_income: number | null
          qtd_rate_of_return: number | null
          qtd_redemptions: number | null
          updated_at: string | null
          ytd_additions: number | null
          ytd_beginning_balance: number | null
          ytd_ending_balance: number | null
          ytd_net_income: number | null
          ytd_rate_of_return: number | null
          ytd_redemptions: number | null
        }
        Insert: {
          created_at?: string | null
          fund_name: string
          id?: string
          investor_id: string
          itd_additions?: number | null
          itd_beginning_balance?: number | null
          itd_ending_balance?: number | null
          itd_net_income?: number | null
          itd_rate_of_return?: number | null
          itd_redemptions?: number | null
          mtd_additions?: number | null
          mtd_beginning_balance?: number | null
          mtd_ending_balance?: number | null
          mtd_net_income?: number | null
          mtd_rate_of_return?: number | null
          mtd_redemptions?: number | null
          period_id: string
          purpose?: Database["public"]["Enums"]["aum_purpose"] | null
          qtd_additions?: number | null
          qtd_beginning_balance?: number | null
          qtd_ending_balance?: number | null
          qtd_net_income?: number | null
          qtd_rate_of_return?: number | null
          qtd_redemptions?: number | null
          updated_at?: string | null
          ytd_additions?: number | null
          ytd_beginning_balance?: number | null
          ytd_ending_balance?: number | null
          ytd_net_income?: number | null
          ytd_rate_of_return?: number | null
          ytd_redemptions?: number | null
        }
        Update: {
          created_at?: string | null
          fund_name?: string
          id?: string
          investor_id?: string
          itd_additions?: number | null
          itd_beginning_balance?: number | null
          itd_ending_balance?: number | null
          itd_net_income?: number | null
          itd_rate_of_return?: number | null
          itd_redemptions?: number | null
          mtd_additions?: number | null
          mtd_beginning_balance?: number | null
          mtd_ending_balance?: number | null
          mtd_net_income?: number | null
          mtd_rate_of_return?: number | null
          mtd_redemptions?: number | null
          period_id?: string
          purpose?: Database["public"]["Enums"]["aum_purpose"] | null
          qtd_additions?: number | null
          qtd_beginning_balance?: number | null
          qtd_ending_balance?: number | null
          qtd_net_income?: number | null
          qtd_rate_of_return?: number | null
          qtd_redemptions?: number | null
          updated_at?: string | null
          ytd_additions?: number | null
          ytd_beginning_balance?: number | null
          ytd_ending_balance?: number | null
          ytd_net_income?: number | null
          ytd_rate_of_return?: number | null
          ytd_redemptions?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "investor_fund_performance_investor_id_fkey"
            columns: ["investor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "investor_fund_performance_investor_id_fkey"
            columns: ["investor_id"]
            isOneToOne: false
            referencedRelation: "profiles_display"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "investor_fund_performance_investor_id_fkey"
            columns: ["investor_id"]
            isOneToOne: false
            referencedRelation: "v_investor_kpis"
            referencedColumns: ["investor_id"]
          },
          {
            foreignKeyName: "investor_fund_performance_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "statement_periods"
            referencedColumns: ["id"]
          },
        ]
      }
      investor_fund_performance_archive: {
        Row: {
          archive_id: string
          archived_at: string
          archived_by: string | null
          fund_name: string | null
          id: string | null
          investor_id: string | null
          itd_additions: number | null
          itd_beginning_balance: number | null
          itd_ending_balance: number | null
          itd_net_income: number | null
          itd_rate_of_return: number | null
          itd_redemptions: number | null
          mtd_additions: number | null
          mtd_beginning_balance: number | null
          mtd_ending_balance: number | null
          mtd_net_income: number | null
          mtd_rate_of_return: number | null
          mtd_redemptions: number | null
          original_created_at: string | null
          original_updated_at: string | null
          period_id: string | null
          qtd_additions: number | null
          qtd_beginning_balance: number | null
          qtd_ending_balance: number | null
          qtd_net_income: number | null
          qtd_rate_of_return: number | null
          qtd_redemptions: number | null
          reset_batch_id: string
          ytd_additions: number | null
          ytd_beginning_balance: number | null
          ytd_ending_balance: number | null
          ytd_net_income: number | null
          ytd_rate_of_return: number | null
          ytd_redemptions: number | null
        }
        Insert: {
          archive_id?: string
          archived_at?: string
          archived_by?: string | null
          fund_name?: string | null
          id?: string | null
          investor_id?: string | null
          itd_additions?: number | null
          itd_beginning_balance?: number | null
          itd_ending_balance?: number | null
          itd_net_income?: number | null
          itd_rate_of_return?: number | null
          itd_redemptions?: number | null
          mtd_additions?: number | null
          mtd_beginning_balance?: number | null
          mtd_ending_balance?: number | null
          mtd_net_income?: number | null
          mtd_rate_of_return?: number | null
          mtd_redemptions?: number | null
          original_created_at?: string | null
          original_updated_at?: string | null
          period_id?: string | null
          qtd_additions?: number | null
          qtd_beginning_balance?: number | null
          qtd_ending_balance?: number | null
          qtd_net_income?: number | null
          qtd_rate_of_return?: number | null
          qtd_redemptions?: number | null
          reset_batch_id: string
          ytd_additions?: number | null
          ytd_beginning_balance?: number | null
          ytd_ending_balance?: number | null
          ytd_net_income?: number | null
          ytd_rate_of_return?: number | null
          ytd_redemptions?: number | null
        }
        Update: {
          archive_id?: string
          archived_at?: string
          archived_by?: string | null
          fund_name?: string | null
          id?: string | null
          investor_id?: string | null
          itd_additions?: number | null
          itd_beginning_balance?: number | null
          itd_ending_balance?: number | null
          itd_net_income?: number | null
          itd_rate_of_return?: number | null
          itd_redemptions?: number | null
          mtd_additions?: number | null
          mtd_beginning_balance?: number | null
          mtd_ending_balance?: number | null
          mtd_net_income?: number | null
          mtd_rate_of_return?: number | null
          mtd_redemptions?: number | null
          original_created_at?: string | null
          original_updated_at?: string | null
          period_id?: string | null
          qtd_additions?: number | null
          qtd_beginning_balance?: number | null
          qtd_ending_balance?: number | null
          qtd_net_income?: number | null
          qtd_rate_of_return?: number | null
          qtd_redemptions?: number | null
          reset_batch_id?: string
          ytd_additions?: number | null
          ytd_beginning_balance?: number | null
          ytd_ending_balance?: number | null
          ytd_net_income?: number | null
          ytd_rate_of_return?: number | null
          ytd_redemptions?: number | null
        }
        Relationships: []
      }
      investor_invites: {
        Row: {
          created_at: string | null
          created_by: string | null
          email: string
          expires_at: string
          id: string
          investor_id: string | null
          invite_code: string
          used: boolean | null
          used_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          email: string
          expires_at: string
          id?: string
          investor_id?: string | null
          invite_code: string
          used?: boolean | null
          used_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          email?: string
          expires_at?: string
          id?: string
          investor_id?: string | null
          invite_code?: string
          used?: boolean | null
          used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "investor_invites_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "investor_invites_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles_display"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "investor_invites_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_investor_kpis"
            referencedColumns: ["investor_id"]
          },
          {
            foreignKeyName: "investor_invites_investor_id_fkey"
            columns: ["investor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "investor_invites_investor_id_fkey"
            columns: ["investor_id"]
            isOneToOne: false
            referencedRelation: "profiles_display"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "investor_invites_investor_id_fkey"
            columns: ["investor_id"]
            isOneToOne: false
            referencedRelation: "v_investor_kpis"
            referencedColumns: ["investor_id"]
          },
        ]
      }
      investor_loss_carryforward: {
        Row: {
          created_at: string | null
          fund_id: string
          id: string
          investor_id: string
          loss_amount: number
          offset_by_distribution_id: string | null
          original_distribution_id: string | null
          period_end: string
          remaining_loss: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          fund_id: string
          id?: string
          investor_id: string
          loss_amount: number
          offset_by_distribution_id?: string | null
          original_distribution_id?: string | null
          period_end: string
          remaining_loss: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          fund_id?: string
          id?: string
          investor_id?: string
          loss_amount?: number
          offset_by_distribution_id?: string | null
          original_distribution_id?: string | null
          period_end?: string
          remaining_loss?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "investor_loss_carryforward_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "aum_position_reconciliation"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "investor_loss_carryforward_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "fund_aum_mismatch"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "investor_loss_carryforward_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "funds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "investor_loss_carryforward_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_aum_position_mismatch"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "investor_loss_carryforward_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_aum_snapshot_health"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "investor_loss_carryforward_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_crystallization_dashboard"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "investor_loss_carryforward_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_fund_aum_position_health"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "investor_loss_carryforward_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_fund_aum_position_status"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "investor_loss_carryforward_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_fund_summary_live"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "investor_loss_carryforward_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_liquidity_risk"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "investor_loss_carryforward_investor_id_fkey"
            columns: ["investor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "investor_loss_carryforward_investor_id_fkey"
            columns: ["investor_id"]
            isOneToOne: false
            referencedRelation: "profiles_display"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "investor_loss_carryforward_investor_id_fkey"
            columns: ["investor_id"]
            isOneToOne: false
            referencedRelation: "v_investor_kpis"
            referencedColumns: ["investor_id"]
          },
          {
            foreignKeyName: "investor_loss_carryforward_offset_by_distribution_id_fkey"
            columns: ["offset_by_distribution_id"]
            isOneToOne: false
            referencedRelation: "v_yield_conservation_violations"
            referencedColumns: ["distribution_id"]
          },
          {
            foreignKeyName: "investor_loss_carryforward_offset_by_distribution_id_fkey"
            columns: ["offset_by_distribution_id"]
            isOneToOne: false
            referencedRelation: "yield_distribution_conservation_check"
            referencedColumns: ["distribution_id"]
          },
          {
            foreignKeyName: "investor_loss_carryforward_offset_by_distribution_id_fkey"
            columns: ["offset_by_distribution_id"]
            isOneToOne: false
            referencedRelation: "yield_distributions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "investor_loss_carryforward_original_distribution_id_fkey"
            columns: ["original_distribution_id"]
            isOneToOne: false
            referencedRelation: "v_yield_conservation_violations"
            referencedColumns: ["distribution_id"]
          },
          {
            foreignKeyName: "investor_loss_carryforward_original_distribution_id_fkey"
            columns: ["original_distribution_id"]
            isOneToOne: false
            referencedRelation: "yield_distribution_conservation_check"
            referencedColumns: ["distribution_id"]
          },
          {
            foreignKeyName: "investor_loss_carryforward_original_distribution_id_fkey"
            columns: ["original_distribution_id"]
            isOneToOne: false
            referencedRelation: "yield_distributions"
            referencedColumns: ["id"]
          },
        ]
      }
      investor_position_snapshots: {
        Row: {
          created_at: string | null
          current_value: number
          fund_id: string
          id: string
          investor_id: string
          snapshot_date: string
          snapshot_source: string | null
        }
        Insert: {
          created_at?: string | null
          current_value: number
          fund_id: string
          id?: string
          investor_id: string
          snapshot_date: string
          snapshot_source?: string | null
        }
        Update: {
          created_at?: string | null
          current_value?: number
          fund_id?: string
          id?: string
          investor_id?: string
          snapshot_date?: string
          snapshot_source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "investor_position_snapshots_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "aum_position_reconciliation"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "investor_position_snapshots_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "fund_aum_mismatch"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "investor_position_snapshots_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "funds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "investor_position_snapshots_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_aum_position_mismatch"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "investor_position_snapshots_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_aum_snapshot_health"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "investor_position_snapshots_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_crystallization_dashboard"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "investor_position_snapshots_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_fund_aum_position_health"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "investor_position_snapshots_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_fund_aum_position_status"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "investor_position_snapshots_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_fund_summary_live"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "investor_position_snapshots_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_liquidity_risk"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "investor_position_snapshots_investor_id_fkey"
            columns: ["investor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "investor_position_snapshots_investor_id_fkey"
            columns: ["investor_id"]
            isOneToOne: false
            referencedRelation: "profiles_display"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "investor_position_snapshots_investor_id_fkey"
            columns: ["investor_id"]
            isOneToOne: false
            referencedRelation: "v_investor_kpis"
            referencedColumns: ["investor_id"]
          },
        ]
      }
      investor_positions: {
        Row: {
          aum_percentage: number | null
          cost_basis: number
          cumulative_yield_earned: number | null
          current_value: number
          fund_class: string | null
          fund_id: string
          high_water_mark: number | null
          investor_id: string
          is_active: boolean | null
          last_transaction_date: string | null
          last_yield_crystallization_date: string | null
          lock_until_date: string | null
          mgmt_fees_paid: number | null
          perf_fees_paid: number | null
          realized_pnl: number | null
          shares: number
          unrealized_pnl: number | null
          updated_at: string | null
        }
        Insert: {
          aum_percentage?: number | null
          cost_basis?: number
          cumulative_yield_earned?: number | null
          current_value?: number
          fund_class?: string | null
          fund_id: string
          high_water_mark?: number | null
          investor_id: string
          is_active?: boolean | null
          last_transaction_date?: string | null
          last_yield_crystallization_date?: string | null
          lock_until_date?: string | null
          mgmt_fees_paid?: number | null
          perf_fees_paid?: number | null
          realized_pnl?: number | null
          shares?: number
          unrealized_pnl?: number | null
          updated_at?: string | null
        }
        Update: {
          aum_percentage?: number | null
          cost_basis?: number
          cumulative_yield_earned?: number | null
          current_value?: number
          fund_class?: string | null
          fund_id?: string
          high_water_mark?: number | null
          investor_id?: string
          is_active?: boolean | null
          last_transaction_date?: string | null
          last_yield_crystallization_date?: string | null
          lock_until_date?: string | null
          mgmt_fees_paid?: number | null
          perf_fees_paid?: number | null
          realized_pnl?: number | null
          shares?: number
          unrealized_pnl?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_investor_positions_fund"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "aum_position_reconciliation"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "fk_investor_positions_fund"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "fund_aum_mismatch"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "fk_investor_positions_fund"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "funds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_investor_positions_fund"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_aum_position_mismatch"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "fk_investor_positions_fund"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_aum_snapshot_health"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "fk_investor_positions_fund"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_crystallization_dashboard"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "fk_investor_positions_fund"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_fund_aum_position_health"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "fk_investor_positions_fund"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_fund_aum_position_status"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "fk_investor_positions_fund"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_fund_summary_live"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "fk_investor_positions_fund"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_liquidity_risk"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "fk_investor_positions_investor"
            columns: ["investor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_investor_positions_investor"
            columns: ["investor_id"]
            isOneToOne: false
            referencedRelation: "profiles_display"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_investor_positions_investor"
            columns: ["investor_id"]
            isOneToOne: false
            referencedRelation: "v_investor_kpis"
            referencedColumns: ["investor_id"]
          },
        ]
      }
      investor_positions_archive: {
        Row: {
          archive_id: string
          archived_at: string
          archived_by: string | null
          aum_percentage: number | null
          cost_basis: number | null
          current_value: number | null
          fund_class: string | null
          fund_id: string | null
          high_water_mark: number | null
          investor_id: string | null
          last_transaction_date: string | null
          lock_until_date: string | null
          mgmt_fees_paid: number | null
          original_updated_at: string | null
          perf_fees_paid: number | null
          realized_pnl: number | null
          reset_batch_id: string
          shares: number | null
          unrealized_pnl: number | null
        }
        Insert: {
          archive_id?: string
          archived_at?: string
          archived_by?: string | null
          aum_percentage?: number | null
          cost_basis?: number | null
          current_value?: number | null
          fund_class?: string | null
          fund_id?: string | null
          high_water_mark?: number | null
          investor_id?: string | null
          last_transaction_date?: string | null
          lock_until_date?: string | null
          mgmt_fees_paid?: number | null
          original_updated_at?: string | null
          perf_fees_paid?: number | null
          realized_pnl?: number | null
          reset_batch_id: string
          shares?: number | null
          unrealized_pnl?: number | null
        }
        Update: {
          archive_id?: string
          archived_at?: string
          archived_by?: string | null
          aum_percentage?: number | null
          cost_basis?: number | null
          current_value?: number | null
          fund_class?: string | null
          fund_id?: string | null
          high_water_mark?: number | null
          investor_id?: string | null
          last_transaction_date?: string | null
          lock_until_date?: string | null
          mgmt_fees_paid?: number | null
          original_updated_at?: string | null
          perf_fees_paid?: number | null
          realized_pnl?: number | null
          reset_batch_id?: string
          shares?: number | null
          unrealized_pnl?: number | null
        }
        Relationships: []
      }
      investor_yield_events: {
        Row: {
          created_at: string
          created_by: string | null
          days_in_period: number
          event_date: string
          fee_amount: number | null
          fee_pct: number | null
          fund_aum_after: number
          fund_aum_before: number
          fund_id: string
          fund_yield_pct: number
          gross_yield_amount: number
          id: string
          investor_balance: number
          investor_id: string
          investor_share_pct: number
          is_voided: boolean
          made_visible_at: string | null
          made_visible_by: string | null
          net_yield_amount: number
          period_end: string
          period_start: string
          reference_id: string
          trigger_transaction_id: string | null
          trigger_type: string
          visibility_scope: string
          voided_at: string | null
          voided_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          days_in_period: number
          event_date: string
          fee_amount?: number | null
          fee_pct?: number | null
          fund_aum_after: number
          fund_aum_before: number
          fund_id: string
          fund_yield_pct: number
          gross_yield_amount: number
          id?: string
          investor_balance: number
          investor_id: string
          investor_share_pct: number
          is_voided?: boolean
          made_visible_at?: string | null
          made_visible_by?: string | null
          net_yield_amount: number
          period_end: string
          period_start: string
          reference_id: string
          trigger_transaction_id?: string | null
          trigger_type: string
          visibility_scope?: string
          voided_at?: string | null
          voided_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          days_in_period?: number
          event_date?: string
          fee_amount?: number | null
          fee_pct?: number | null
          fund_aum_after?: number
          fund_aum_before?: number
          fund_id?: string
          fund_yield_pct?: number
          gross_yield_amount?: number
          id?: string
          investor_balance?: number
          investor_id?: string
          investor_share_pct?: number
          is_voided?: boolean
          made_visible_at?: string | null
          made_visible_by?: string | null
          net_yield_amount?: number
          period_end?: string
          period_start?: string
          reference_id?: string
          trigger_transaction_id?: string | null
          trigger_type?: string
          visibility_scope?: string
          voided_at?: string | null
          voided_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_yield_events_created_by"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_yield_events_created_by"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles_display"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_yield_events_created_by"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_investor_kpis"
            referencedColumns: ["investor_id"]
          },
          {
            foreignKeyName: "fk_yield_events_fund"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "aum_position_reconciliation"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "fk_yield_events_fund"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "fund_aum_mismatch"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "fk_yield_events_fund"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "funds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_yield_events_fund"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_aum_position_mismatch"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "fk_yield_events_fund"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_aum_snapshot_health"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "fk_yield_events_fund"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_crystallization_dashboard"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "fk_yield_events_fund"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_fund_aum_position_health"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "fk_yield_events_fund"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_fund_aum_position_status"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "fk_yield_events_fund"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_fund_summary_live"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "fk_yield_events_fund"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_liquidity_risk"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "fk_yield_events_investor"
            columns: ["investor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_yield_events_investor"
            columns: ["investor_id"]
            isOneToOne: false
            referencedRelation: "profiles_display"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_yield_events_investor"
            columns: ["investor_id"]
            isOneToOne: false
            referencedRelation: "v_investor_kpis"
            referencedColumns: ["investor_id"]
          },
          {
            foreignKeyName: "fk_yield_events_trigger_tx"
            columns: ["trigger_transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_yield_events_trigger_tx"
            columns: ["trigger_transaction_id"]
            isOneToOne: false
            referencedRelation: "v_orphaned_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_yield_events_trigger_tx"
            columns: ["trigger_transaction_id"]
            isOneToOne: false
            referencedRelation: "v_transaction_distribution_orphans"
            referencedColumns: ["transaction_id"]
          },
          {
            foreignKeyName: "fk_yield_events_visible_by"
            columns: ["made_visible_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_yield_events_visible_by"
            columns: ["made_visible_by"]
            isOneToOne: false
            referencedRelation: "profiles_display"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_yield_events_visible_by"
            columns: ["made_visible_by"]
            isOneToOne: false
            referencedRelation: "v_investor_kpis"
            referencedColumns: ["investor_id"]
          },
          {
            foreignKeyName: "fk_yield_events_voided_by"
            columns: ["voided_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_yield_events_voided_by"
            columns: ["voided_by"]
            isOneToOne: false
            referencedRelation: "profiles_display"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_yield_events_voided_by"
            columns: ["voided_by"]
            isOneToOne: false
            referencedRelation: "v_investor_kpis"
            referencedColumns: ["investor_id"]
          },
        ]
      }
      mfa_reset_requests: {
        Row: {
          approval_signature: string | null
          approved_at: string | null
          approved_by: string | null
          created_at: string
          executed_at: string | null
          expires_at: string
          id: string
          rejected_at: string | null
          rejected_by: string | null
          rejection_reason: string | null
          request_reason: string
          requested_at: string
          requester_ip: unknown
          requester_user_agent: string | null
          status: string
          user_id: string
        }
        Insert: {
          approval_signature?: string | null
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          executed_at?: string | null
          expires_at?: string
          id?: string
          rejected_at?: string | null
          rejected_by?: string | null
          rejection_reason?: string | null
          request_reason: string
          requested_at?: string
          requester_ip?: unknown
          requester_user_agent?: string | null
          status?: string
          user_id: string
        }
        Update: {
          approval_signature?: string | null
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          executed_at?: string | null
          expires_at?: string
          id?: string
          rejected_at?: string | null
          rejected_by?: string | null
          rejection_reason?: string | null
          request_reason?: string
          requested_at?: string
          requester_ip?: unknown
          requester_user_agent?: string | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      notification_settings: {
        Row: {
          daily_rates_enabled: boolean | null
          email_enabled: boolean | null
          notification_types: Json | null
          push_enabled: boolean | null
          sms_enabled: boolean | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          daily_rates_enabled?: boolean | null
          email_enabled?: boolean | null
          notification_types?: Json | null
          push_enabled?: boolean | null
          sms_enabled?: boolean | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          daily_rates_enabled?: boolean | null
          email_enabled?: boolean | null
          notification_types?: Json | null
          push_enabled?: boolean | null
          sms_enabled?: boolean | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string
          created_at: string
          data_jsonb: Json | null
          id: string
          priority: Database["public"]["Enums"]["notification_priority"] | null
          read_at: string | null
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          data_jsonb?: Json | null
          id?: string
          priority?: Database["public"]["Enums"]["notification_priority"] | null
          read_at?: string | null
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          data_jsonb?: Json | null
          id?: string
          priority?: Database["public"]["Enums"]["notification_priority"] | null
          read_at?: string | null
          title?: string
          type?: Database["public"]["Enums"]["notification_type"]
          user_id?: string
        }
        Relationships: []
      }
      operation_approvals: {
        Row: {
          actual_value: number | null
          created_at: string | null
          created_by: string | null
          expires_at: string | null
          first_approval_notes: string | null
          first_approved_at: string | null
          first_approver_id: string | null
          id: string
          operation_details: Json | null
          operation_id: string
          operation_type: string
          second_approval_notes: string | null
          second_approved_at: string | null
          second_approver_id: string | null
          status: string | null
          threshold_exceeded: boolean | null
          threshold_value: number | null
        }
        Insert: {
          actual_value?: number | null
          created_at?: string | null
          created_by?: string | null
          expires_at?: string | null
          first_approval_notes?: string | null
          first_approved_at?: string | null
          first_approver_id?: string | null
          id?: string
          operation_details?: Json | null
          operation_id: string
          operation_type: string
          second_approval_notes?: string | null
          second_approved_at?: string | null
          second_approver_id?: string | null
          status?: string | null
          threshold_exceeded?: boolean | null
          threshold_value?: number | null
        }
        Update: {
          actual_value?: number | null
          created_at?: string | null
          created_by?: string | null
          expires_at?: string | null
          first_approval_notes?: string | null
          first_approved_at?: string | null
          first_approver_id?: string | null
          id?: string
          operation_details?: Json | null
          operation_id?: string
          operation_type?: string
          second_approval_notes?: string | null
          second_approved_at?: string | null
          second_approver_id?: string | null
          status?: string | null
          threshold_exceeded?: boolean | null
          threshold_value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "operation_approvals_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operation_approvals_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles_display"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operation_approvals_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_investor_kpis"
            referencedColumns: ["investor_id"]
          },
          {
            foreignKeyName: "operation_approvals_first_approver_id_fkey"
            columns: ["first_approver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operation_approvals_first_approver_id_fkey"
            columns: ["first_approver_id"]
            isOneToOne: false
            referencedRelation: "profiles_display"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operation_approvals_first_approver_id_fkey"
            columns: ["first_approver_id"]
            isOneToOne: false
            referencedRelation: "v_investor_kpis"
            referencedColumns: ["investor_id"]
          },
          {
            foreignKeyName: "operation_approvals_second_approver_id_fkey"
            columns: ["second_approver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operation_approvals_second_approver_id_fkey"
            columns: ["second_approver_id"]
            isOneToOne: false
            referencedRelation: "profiles_display"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operation_approvals_second_approver_id_fkey"
            columns: ["second_approver_id"]
            isOneToOne: false
            referencedRelation: "v_investor_kpis"
            referencedColumns: ["investor_id"]
          },
        ]
      }
      operation_metrics: {
        Row: {
          completed_at: string | null
          created_at: string
          duration_ms: number | null
          error_code: string | null
          error_message: string | null
          fund_id: string | null
          id: string
          input_params: Json | null
          operation_id: string | null
          operation_name: string
          output_result: Json | null
          started_at: string
          success: boolean | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          duration_ms?: number | null
          error_code?: string | null
          error_message?: string | null
          fund_id?: string | null
          id?: string
          input_params?: Json | null
          operation_id?: string | null
          operation_name: string
          output_result?: Json | null
          started_at?: string
          success?: boolean | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          duration_ms?: number | null
          error_code?: string | null
          error_message?: string | null
          fund_id?: string | null
          id?: string
          input_params?: Json | null
          operation_id?: string | null
          operation_name?: string
          output_result?: Json | null
          started_at?: string
          success?: boolean | null
        }
        Relationships: []
      }
      platform_fee_ledger: {
        Row: {
          asset: string
          created_at: string | null
          created_by: string | null
          effective_date: string
          fee_amount: number
          fee_percentage: number
          fund_id: string
          gross_yield_amount: number
          id: string
          investor_id: string
          investor_name: string | null
          is_voided: boolean | null
          transaction_id: string | null
          void_reason: string | null
          voided_at: string | null
          voided_by: string | null
          yield_distribution_id: string | null
        }
        Insert: {
          asset: string
          created_at?: string | null
          created_by?: string | null
          effective_date: string
          fee_amount: number
          fee_percentage: number
          fund_id: string
          gross_yield_amount: number
          id?: string
          investor_id: string
          investor_name?: string | null
          is_voided?: boolean | null
          transaction_id?: string | null
          void_reason?: string | null
          voided_at?: string | null
          voided_by?: string | null
          yield_distribution_id?: string | null
        }
        Update: {
          asset?: string
          created_at?: string | null
          created_by?: string | null
          effective_date?: string
          fee_amount?: number
          fee_percentage?: number
          fund_id?: string
          gross_yield_amount?: number
          id?: string
          investor_id?: string
          investor_name?: string | null
          is_voided?: boolean | null
          transaction_id?: string | null
          void_reason?: string | null
          voided_at?: string | null
          voided_by?: string | null
          yield_distribution_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "platform_fee_ledger_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "platform_fee_ledger_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles_display"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "platform_fee_ledger_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_investor_kpis"
            referencedColumns: ["investor_id"]
          },
          {
            foreignKeyName: "platform_fee_ledger_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "aum_position_reconciliation"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "platform_fee_ledger_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "fund_aum_mismatch"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "platform_fee_ledger_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "funds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "platform_fee_ledger_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_aum_position_mismatch"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "platform_fee_ledger_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_aum_snapshot_health"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "platform_fee_ledger_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_crystallization_dashboard"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "platform_fee_ledger_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_fund_aum_position_health"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "platform_fee_ledger_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_fund_aum_position_status"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "platform_fee_ledger_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_fund_summary_live"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "platform_fee_ledger_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_liquidity_risk"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "platform_fee_ledger_investor_id_fkey"
            columns: ["investor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "platform_fee_ledger_investor_id_fkey"
            columns: ["investor_id"]
            isOneToOne: false
            referencedRelation: "profiles_display"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "platform_fee_ledger_investor_id_fkey"
            columns: ["investor_id"]
            isOneToOne: false
            referencedRelation: "v_investor_kpis"
            referencedColumns: ["investor_id"]
          },
          {
            foreignKeyName: "platform_fee_ledger_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "platform_fee_ledger_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "v_orphaned_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "platform_fee_ledger_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "v_transaction_distribution_orphans"
            referencedColumns: ["transaction_id"]
          },
          {
            foreignKeyName: "platform_fee_ledger_voided_by_fkey"
            columns: ["voided_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "platform_fee_ledger_voided_by_fkey"
            columns: ["voided_by"]
            isOneToOne: false
            referencedRelation: "profiles_display"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "platform_fee_ledger_voided_by_fkey"
            columns: ["voided_by"]
            isOneToOne: false
            referencedRelation: "v_investor_kpis"
            referencedColumns: ["investor_id"]
          },
          {
            foreignKeyName: "platform_fee_ledger_yield_distribution_id_fkey"
            columns: ["yield_distribution_id"]
            isOneToOne: false
            referencedRelation: "v_yield_conservation_violations"
            referencedColumns: ["distribution_id"]
          },
          {
            foreignKeyName: "platform_fee_ledger_yield_distribution_id_fkey"
            columns: ["yield_distribution_id"]
            isOneToOne: false
            referencedRelation: "yield_distribution_conservation_check"
            referencedColumns: ["distribution_id"]
          },
          {
            foreignKeyName: "platform_fee_ledger_yield_distribution_id_fkey"
            columns: ["yield_distribution_id"]
            isOneToOne: false
            referencedRelation: "yield_distributions"
            referencedColumns: ["id"]
          },
        ]
      }
      position_correction_log: {
        Row: {
          corrected_at: string | null
          corrected_by: string | null
          fund_id: string
          id: string
          investor_id: string
          new_value: number | null
          notes: string | null
          old_value: number | null
          reconciliation_batch_id: string | null
          variance: number | null
          variance_percentage: number | null
        }
        Insert: {
          corrected_at?: string | null
          corrected_by?: string | null
          fund_id: string
          id?: string
          investor_id: string
          new_value?: number | null
          notes?: string | null
          old_value?: number | null
          reconciliation_batch_id?: string | null
          variance?: number | null
          variance_percentage?: number | null
        }
        Update: {
          corrected_at?: string | null
          corrected_by?: string | null
          fund_id?: string
          id?: string
          investor_id?: string
          new_value?: number | null
          notes?: string | null
          old_value?: number | null
          reconciliation_batch_id?: string | null
          variance?: number | null
          variance_percentage?: number | null
        }
        Relationships: []
      }
      position_reconciliation_log: {
        Row: {
          action_taken: string
          created_at: string
          discrepancy: number
          fund_id: string
          id: string
          investor_id: string
          ledger_value: number
          position_value: number
          reconciled_by: string | null
        }
        Insert: {
          action_taken: string
          created_at?: string
          discrepancy: number
          fund_id: string
          id?: string
          investor_id: string
          ledger_value: number
          position_value: number
          reconciled_by?: string | null
        }
        Update: {
          action_taken?: string
          created_at?: string
          discrepancy?: number
          fund_id?: string
          id?: string
          investor_id?: string
          ledger_value?: number
          position_value?: number
          reconciled_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "position_reconciliation_log_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "aum_position_reconciliation"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "position_reconciliation_log_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "fund_aum_mismatch"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "position_reconciliation_log_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "funds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "position_reconciliation_log_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_aum_position_mismatch"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "position_reconciliation_log_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_aum_snapshot_health"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "position_reconciliation_log_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_crystallization_dashboard"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "position_reconciliation_log_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_fund_aum_position_health"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "position_reconciliation_log_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_fund_aum_position_status"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "position_reconciliation_log_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_fund_summary_live"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "position_reconciliation_log_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_liquidity_risk"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "position_reconciliation_log_investor_id_fkey"
            columns: ["investor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "position_reconciliation_log_investor_id_fkey"
            columns: ["investor_id"]
            isOneToOne: false
            referencedRelation: "profiles_display"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "position_reconciliation_log_investor_id_fkey"
            columns: ["investor_id"]
            isOneToOne: false
            referencedRelation: "v_investor_kpis"
            referencedColumns: ["investor_id"]
          },
          {
            foreignKeyName: "position_reconciliation_log_reconciled_by_fkey"
            columns: ["reconciled_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "position_reconciliation_log_reconciled_by_fkey"
            columns: ["reconciled_by"]
            isOneToOne: false
            referencedRelation: "profiles_display"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "position_reconciliation_log_reconciled_by_fkey"
            columns: ["reconciled_by"]
            isOneToOne: false
            referencedRelation: "v_investor_kpis"
            referencedColumns: ["investor_id"]
          },
        ]
      }
      position_reset_log: {
        Row: {
          admin_user_id: string
          affected_counts: Json | null
          completed_at: string | null
          confirmation_code: string
          error_message: string | null
          id: string
          initiated_at: string
          reset_batch_id: string
          status: string
        }
        Insert: {
          admin_user_id: string
          affected_counts?: Json | null
          completed_at?: string | null
          confirmation_code: string
          error_message?: string | null
          id?: string
          initiated_at?: string
          reset_batch_id: string
          status?: string
        }
        Update: {
          admin_user_id?: string
          affected_counts?: Json | null
          completed_at?: string | null
          confirmation_code?: string
          error_message?: string | null
          id?: string
          initiated_at?: string
          reset_batch_id?: string
          status?: string
        }
        Relationships: []
      }
      price_alerts: {
        Row: {
          alert_type: string
          asset_code: string
          created_at: string | null
          id: string
          is_active: boolean | null
          threshold_value: number
          triggered_at: string | null
          user_id: string
        }
        Insert: {
          alert_type: string
          asset_code: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          threshold_value: number
          triggered_at?: string | null
          user_id: string
        }
        Update: {
          alert_type?: string
          asset_code?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          threshold_value?: number
          triggered_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "price_alerts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "price_alerts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_display"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "price_alerts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_investor_kpis"
            referencedColumns: ["investor_id"]
          },
        ]
      }
      profiles: {
        Row: {
          account_type: Database["public"]["Enums"]["account_type"] | null
          avatar_url: string | null
          created_at: string
          email: string
          entity_type: string | null
          fee_pct: number
          first_name: string | null
          ib_commission_source: string
          ib_parent_id: string | null
          ib_percentage: number | null
          id: string
          include_in_reporting: boolean
          is_admin: boolean
          is_system_account: boolean | null
          kyc_status: string | null
          last_activity_at: string | null
          last_name: string | null
          onboarding_date: string | null
          phone: string | null
          preferences: Json | null
          role: string | null
          status: string | null
          totp_enabled: boolean | null
          totp_verified: boolean | null
          updated_at: string
        }
        Insert: {
          account_type?: Database["public"]["Enums"]["account_type"] | null
          avatar_url?: string | null
          created_at?: string
          email: string
          entity_type?: string | null
          fee_pct?: number
          first_name?: string | null
          ib_commission_source?: string
          ib_parent_id?: string | null
          ib_percentage?: number | null
          id: string
          include_in_reporting?: boolean
          is_admin?: boolean
          is_system_account?: boolean | null
          kyc_status?: string | null
          last_activity_at?: string | null
          last_name?: string | null
          onboarding_date?: string | null
          phone?: string | null
          preferences?: Json | null
          role?: string | null
          status?: string | null
          totp_enabled?: boolean | null
          totp_verified?: boolean | null
          updated_at?: string
        }
        Update: {
          account_type?: Database["public"]["Enums"]["account_type"] | null
          avatar_url?: string | null
          created_at?: string
          email?: string
          entity_type?: string | null
          fee_pct?: number
          first_name?: string | null
          ib_commission_source?: string
          ib_parent_id?: string | null
          ib_percentage?: number | null
          id?: string
          include_in_reporting?: boolean
          is_admin?: boolean
          is_system_account?: boolean | null
          kyc_status?: string | null
          last_activity_at?: string | null
          last_name?: string | null
          onboarding_date?: string | null
          phone?: string | null
          preferences?: Json | null
          role?: string | null
          status?: string | null
          totp_enabled?: boolean | null
          totp_verified?: boolean | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_ib_parent_id_fkey"
            columns: ["ib_parent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_ib_parent_id_fkey"
            columns: ["ib_parent_id"]
            isOneToOne: false
            referencedRelation: "profiles_display"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_ib_parent_id_fkey"
            columns: ["ib_parent_id"]
            isOneToOne: false
            referencedRelation: "v_investor_kpis"
            referencedColumns: ["investor_id"]
          },
        ]
      }
      rate_limit_config: {
        Row: {
          action_type: string
          created_at: string | null
          description: string | null
          is_enabled: boolean | null
          max_actions: number
          updated_at: string | null
          window_minutes: number
        }
        Insert: {
          action_type: string
          created_at?: string | null
          description?: string | null
          is_enabled?: boolean | null
          max_actions?: number
          updated_at?: string | null
          window_minutes?: number
        }
        Update: {
          action_type?: string
          created_at?: string | null
          description?: string | null
          is_enabled?: boolean | null
          max_actions?: number
          updated_at?: string | null
          window_minutes?: number
        }
        Relationships: []
      }
      rate_limits: {
        Row: {
          action_type: string
          actor_id: string
          created_at: string | null
          id: string
          metadata: Json | null
        }
        Insert: {
          action_type: string
          actor_id: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
        }
        Update: {
          action_type?: string
          actor_id?: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
        }
        Relationships: []
      }
      reconciliation_packs: {
        Row: {
          closing_aum: number | null
          distribution_count: number | null
          finalized_at: string | null
          finalized_by: string | null
          fund_id: string
          generated_at: string | null
          generated_by: string
          gross_yield: number | null
          id: string
          investor_count: number | null
          net_flows: number | null
          net_yield: number | null
          opening_aum: number | null
          pack_data: Json | null
          pack_type: string
          period_end: string
          period_start: string
          status: string
          total_deposits: number | null
          total_dust: number | null
          total_fees: number | null
          total_withdrawals: number | null
          transaction_count: number | null
          void_count: number | null
        }
        Insert: {
          closing_aum?: number | null
          distribution_count?: number | null
          finalized_at?: string | null
          finalized_by?: string | null
          fund_id: string
          generated_at?: string | null
          generated_by: string
          gross_yield?: number | null
          id?: string
          investor_count?: number | null
          net_flows?: number | null
          net_yield?: number | null
          opening_aum?: number | null
          pack_data?: Json | null
          pack_type?: string
          period_end: string
          period_start: string
          status?: string
          total_deposits?: number | null
          total_dust?: number | null
          total_fees?: number | null
          total_withdrawals?: number | null
          transaction_count?: number | null
          void_count?: number | null
        }
        Update: {
          closing_aum?: number | null
          distribution_count?: number | null
          finalized_at?: string | null
          finalized_by?: string | null
          fund_id?: string
          generated_at?: string | null
          generated_by?: string
          gross_yield?: number | null
          id?: string
          investor_count?: number | null
          net_flows?: number | null
          net_yield?: number | null
          opening_aum?: number | null
          pack_data?: Json | null
          pack_type?: string
          period_end?: string
          period_start?: string
          status?: string
          total_deposits?: number | null
          total_dust?: number | null
          total_fees?: number | null
          total_withdrawals?: number | null
          transaction_count?: number | null
          void_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "reconciliation_packs_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "aum_position_reconciliation"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "reconciliation_packs_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "fund_aum_mismatch"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "reconciliation_packs_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "funds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reconciliation_packs_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_aum_position_mismatch"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "reconciliation_packs_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_aum_snapshot_health"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "reconciliation_packs_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_crystallization_dashboard"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "reconciliation_packs_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_fund_aum_position_health"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "reconciliation_packs_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_fund_aum_position_status"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "reconciliation_packs_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_fund_summary_live"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "reconciliation_packs_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_liquidity_risk"
            referencedColumns: ["fund_id"]
          },
        ]
      }
      report_access_logs: {
        Row: {
          action: string
          created_at: string
          id: string
          report_id: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          report_id?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          report_id?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      report_change_log: {
        Row: {
          change_reason: string | null
          change_summary: Json | null
          changed_at: string
          changed_by: string | null
          created_at: string
          id: string
          previous_html_hash: string | null
          previous_pdf_url: string | null
          report_id: string
          report_table: string
        }
        Insert: {
          change_reason?: string | null
          change_summary?: Json | null
          changed_at?: string
          changed_by?: string | null
          created_at?: string
          id?: string
          previous_html_hash?: string | null
          previous_pdf_url?: string | null
          report_id: string
          report_table: string
        }
        Update: {
          change_reason?: string | null
          change_summary?: Json | null
          changed_at?: string
          changed_by?: string | null
          created_at?: string
          id?: string
          previous_html_hash?: string | null
          previous_pdf_url?: string | null
          report_id?: string
          report_table?: string
        }
        Relationships: []
      }
      report_delivery_events: {
        Row: {
          created_at: string | null
          delivery_id: string
          event_data: Json | null
          event_type: string
          id: string
          occurred_at: string
          provider_message_id: string | null
        }
        Insert: {
          created_at?: string | null
          delivery_id: string
          event_data?: Json | null
          event_type: string
          id?: string
          occurred_at: string
          provider_message_id?: string | null
        }
        Update: {
          created_at?: string | null
          delivery_id?: string
          event_data?: Json | null
          event_type?: string
          id?: string
          occurred_at?: string
          provider_message_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "report_delivery_events_delivery_id_fkey"
            columns: ["delivery_id"]
            isOneToOne: false
            referencedRelation: "statement_email_delivery"
            referencedColumns: ["id"]
          },
        ]
      }
      report_schedules: {
        Row: {
          created_at: string
          created_by: string | null
          day_of_month: number | null
          day_of_week: number | null
          delivery_method: string[]
          description: string | null
          failure_count: number
          filters: Json
          formats: string[]
          frequency: string
          id: string
          is_active: boolean
          last_run_at: string | null
          last_run_status: string | null
          name: string
          next_run_at: string | null
          parameters: Json
          recipient_emails: string[]
          recipient_user_ids: string[]
          report_definition_id: string | null
          run_count: number
          time_of_day: string
          timezone: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          day_of_month?: number | null
          day_of_week?: number | null
          delivery_method?: string[]
          description?: string | null
          failure_count?: number
          filters?: Json
          formats?: string[]
          frequency: string
          id?: string
          is_active?: boolean
          last_run_at?: string | null
          last_run_status?: string | null
          name: string
          next_run_at?: string | null
          parameters?: Json
          recipient_emails?: string[]
          recipient_user_ids?: string[]
          report_definition_id?: string | null
          run_count?: number
          time_of_day: string
          timezone?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          day_of_month?: number | null
          day_of_week?: number | null
          delivery_method?: string[]
          description?: string | null
          failure_count?: number
          filters?: Json
          formats?: string[]
          frequency?: string
          id?: string
          is_active?: boolean
          last_run_at?: string | null
          last_run_status?: string | null
          name?: string
          next_run_at?: string | null
          parameters?: Json
          recipient_emails?: string[]
          recipient_user_ids?: string[]
          report_definition_id?: string | null
          run_count?: number
          time_of_day?: string
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
      risk_alerts: {
        Row: {
          acknowledged: boolean | null
          acknowledged_at: string | null
          acknowledged_by: string | null
          actual_value: number | null
          alert_type: string
          created_at: string | null
          details: Json | null
          expires_at: string | null
          fund_id: string | null
          id: string
          investor_id: string | null
          message: string
          resolution_notes: string | null
          resolved: boolean | null
          resolved_at: string | null
          resolved_by: string | null
          severity: string | null
          threshold_value: number | null
        }
        Insert: {
          acknowledged?: boolean | null
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          actual_value?: number | null
          alert_type: string
          created_at?: string | null
          details?: Json | null
          expires_at?: string | null
          fund_id?: string | null
          id?: string
          investor_id?: string | null
          message: string
          resolution_notes?: string | null
          resolved?: boolean | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string | null
          threshold_value?: number | null
        }
        Update: {
          acknowledged?: boolean | null
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          actual_value?: number | null
          alert_type?: string
          created_at?: string | null
          details?: Json | null
          expires_at?: string | null
          fund_id?: string | null
          id?: string
          investor_id?: string | null
          message?: string
          resolution_notes?: string | null
          resolved?: boolean | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string | null
          threshold_value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "risk_alerts_acknowledged_by_fkey"
            columns: ["acknowledged_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "risk_alerts_acknowledged_by_fkey"
            columns: ["acknowledged_by"]
            isOneToOne: false
            referencedRelation: "profiles_display"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "risk_alerts_acknowledged_by_fkey"
            columns: ["acknowledged_by"]
            isOneToOne: false
            referencedRelation: "v_investor_kpis"
            referencedColumns: ["investor_id"]
          },
          {
            foreignKeyName: "risk_alerts_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "aum_position_reconciliation"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "risk_alerts_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "fund_aum_mismatch"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "risk_alerts_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "funds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "risk_alerts_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_aum_position_mismatch"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "risk_alerts_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_aum_snapshot_health"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "risk_alerts_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_crystallization_dashboard"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "risk_alerts_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_fund_aum_position_health"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "risk_alerts_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_fund_aum_position_status"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "risk_alerts_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_fund_summary_live"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "risk_alerts_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_liquidity_risk"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "risk_alerts_investor_id_fkey"
            columns: ["investor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "risk_alerts_investor_id_fkey"
            columns: ["investor_id"]
            isOneToOne: false
            referencedRelation: "profiles_display"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "risk_alerts_investor_id_fkey"
            columns: ["investor_id"]
            isOneToOne: false
            referencedRelation: "v_investor_kpis"
            referencedColumns: ["investor_id"]
          },
          {
            foreignKeyName: "risk_alerts_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "risk_alerts_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "profiles_display"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "risk_alerts_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "v_investor_kpis"
            referencedColumns: ["investor_id"]
          },
        ]
      }
      statement_email_delivery: {
        Row: {
          attempt_count: number
          bounce_type: string | null
          bounced_at: string | null
          channel: string
          clicked_at: string | null
          created_at: string | null
          created_by: string | null
          delivered_at: string | null
          delivery_mode: string | null
          error_code: string | null
          error_message: string | null
          failed_at: string | null
          id: string
          investor_id: string
          last_attempt_at: string | null
          locked_at: string | null
          locked_by: string | null
          metadata: Json
          opened_at: string | null
          period_id: string
          provider: string | null
          provider_message_id: string | null
          recipient_email: string
          retry_count: number | null
          sent_at: string | null
          statement_id: string
          status: string | null
          subject: string
          updated_at: string
          user_id: string
        }
        Insert: {
          attempt_count?: number
          bounce_type?: string | null
          bounced_at?: string | null
          channel?: string
          clicked_at?: string | null
          created_at?: string | null
          created_by?: string | null
          delivered_at?: string | null
          delivery_mode?: string | null
          error_code?: string | null
          error_message?: string | null
          failed_at?: string | null
          id?: string
          investor_id: string
          last_attempt_at?: string | null
          locked_at?: string | null
          locked_by?: string | null
          metadata?: Json
          opened_at?: string | null
          period_id: string
          provider?: string | null
          provider_message_id?: string | null
          recipient_email: string
          retry_count?: number | null
          sent_at?: string | null
          statement_id: string
          status?: string | null
          subject: string
          updated_at?: string
          user_id: string
        }
        Update: {
          attempt_count?: number
          bounce_type?: string | null
          bounced_at?: string | null
          channel?: string
          clicked_at?: string | null
          created_at?: string | null
          created_by?: string | null
          delivered_at?: string | null
          delivery_mode?: string | null
          error_code?: string | null
          error_message?: string | null
          failed_at?: string | null
          id?: string
          investor_id?: string
          last_attempt_at?: string | null
          locked_at?: string | null
          locked_by?: string | null
          metadata?: Json
          opened_at?: string | null
          period_id?: string
          provider?: string | null
          provider_message_id?: string | null
          recipient_email?: string
          retry_count?: number | null
          sent_at?: string | null
          statement_id?: string
          status?: string | null
          subject?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "statement_email_delivery_investor_id_fkey"
            columns: ["investor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "statement_email_delivery_investor_id_fkey"
            columns: ["investor_id"]
            isOneToOne: false
            referencedRelation: "profiles_display"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "statement_email_delivery_investor_id_fkey"
            columns: ["investor_id"]
            isOneToOne: false
            referencedRelation: "v_investor_kpis"
            referencedColumns: ["investor_id"]
          },
          {
            foreignKeyName: "statement_email_delivery_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "statement_periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "statement_email_delivery_statement_id_fkey"
            columns: ["statement_id"]
            isOneToOne: false
            referencedRelation: "generated_statements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "statement_email_delivery_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "statement_email_delivery_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_display"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "statement_email_delivery_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_investor_kpis"
            referencedColumns: ["investor_id"]
          },
        ]
      }
      statement_periods: {
        Row: {
          created_at: string | null
          created_by: string | null
          finalized_at: string | null
          finalized_by: string | null
          id: string
          month: number
          notes: string | null
          period_end_date: string
          period_name: string
          status: string | null
          updated_at: string | null
          year: number
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          finalized_at?: string | null
          finalized_by?: string | null
          id?: string
          month: number
          notes?: string | null
          period_end_date: string
          period_name: string
          status?: string | null
          updated_at?: string | null
          year: number
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          finalized_at?: string | null
          finalized_by?: string | null
          id?: string
          month?: number
          notes?: string | null
          period_end_date?: string
          period_name?: string
          status?: string | null
          updated_at?: string | null
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "statement_periods_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "statement_periods_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles_display"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "statement_periods_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_investor_kpis"
            referencedColumns: ["investor_id"]
          },
          {
            foreignKeyName: "statement_periods_finalized_by_fkey"
            columns: ["finalized_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "statement_periods_finalized_by_fkey"
            columns: ["finalized_by"]
            isOneToOne: false
            referencedRelation: "profiles_display"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "statement_periods_finalized_by_fkey"
            columns: ["finalized_by"]
            isOneToOne: false
            referencedRelation: "v_investor_kpis"
            referencedColumns: ["investor_id"]
          },
        ]
      }
      statements: {
        Row: {
          additions: number
          asset_code: Database["public"]["Enums"]["asset_code"]
          begin_balance: number
          created_at: string
          end_balance: number
          id: string
          investor_id: string
          investor_profile_id: string | null
          net_income: number
          period_month: number
          period_year: number
          rate_of_return_itd: number | null
          rate_of_return_mtd: number | null
          rate_of_return_qtd: number | null
          rate_of_return_ytd: number | null
          redemptions: number
          storage_path: string | null
        }
        Insert: {
          additions: number
          asset_code: Database["public"]["Enums"]["asset_code"]
          begin_balance: number
          created_at?: string
          end_balance: number
          id?: string
          investor_id: string
          investor_profile_id?: string | null
          net_income: number
          period_month: number
          period_year: number
          rate_of_return_itd?: number | null
          rate_of_return_mtd?: number | null
          rate_of_return_qtd?: number | null
          rate_of_return_ytd?: number | null
          redemptions: number
          storage_path?: string | null
        }
        Update: {
          additions?: number
          asset_code?: Database["public"]["Enums"]["asset_code"]
          begin_balance?: number
          created_at?: string
          end_balance?: number
          id?: string
          investor_id?: string
          investor_profile_id?: string | null
          net_income?: number
          period_month?: number
          period_year?: number
          rate_of_return_itd?: number | null
          rate_of_return_mtd?: number | null
          rate_of_return_qtd?: number | null
          rate_of_return_ytd?: number | null
          redemptions?: number
          storage_path?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_statements_investor_profile"
            columns: ["investor_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_statements_investor_profile"
            columns: ["investor_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles_display"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_statements_investor_profile"
            columns: ["investor_profile_id"]
            isOneToOne: false
            referencedRelation: "v_investor_kpis"
            referencedColumns: ["investor_id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          assigned_admin_id: string | null
          attachments: string[] | null
          category: Database["public"]["Enums"]["ticket_category"]
          created_at: string
          id: string
          messages_jsonb: Json
          priority: Database["public"]["Enums"]["ticket_priority"]
          status: Database["public"]["Enums"]["ticket_status"]
          subject: string
          updated_at: string
          user_id: string
        }
        Insert: {
          assigned_admin_id?: string | null
          attachments?: string[] | null
          category?: Database["public"]["Enums"]["ticket_category"]
          created_at?: string
          id?: string
          messages_jsonb?: Json
          priority?: Database["public"]["Enums"]["ticket_priority"]
          status?: Database["public"]["Enums"]["ticket_status"]
          subject: string
          updated_at?: string
          user_id: string
        }
        Update: {
          assigned_admin_id?: string | null
          attachments?: string[] | null
          category?: Database["public"]["Enums"]["ticket_category"]
          created_at?: string
          id?: string
          messages_jsonb?: Json
          priority?: Database["public"]["Enums"]["ticket_priority"]
          status?: Database["public"]["Enums"]["ticket_status"]
          subject?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      system_2fa_policy: {
        Row: {
          backup_code_length: number | null
          backup_codes_count: number | null
          grace_period_days: number | null
          id: string
          lockout_duration_minutes: number | null
          max_failed_attempts: number | null
          require_2fa_for_admins: boolean | null
          require_2fa_for_investors: boolean | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          backup_code_length?: number | null
          backup_codes_count?: number | null
          grace_period_days?: number | null
          id?: string
          lockout_duration_minutes?: number | null
          max_failed_attempts?: number | null
          require_2fa_for_admins?: boolean | null
          require_2fa_for_investors?: boolean | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          backup_code_length?: number | null
          backup_codes_count?: number | null
          grace_period_days?: number | null
          id?: string
          lockout_duration_minutes?: number | null
          max_failed_attempts?: number | null
          require_2fa_for_admins?: boolean | null
          require_2fa_for_investors?: boolean | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      system_config: {
        Row: {
          description: string | null
          key: string
          updated_at: string | null
          updated_by: string | null
          value: Json
        }
        Insert: {
          description?: string | null
          key: string
          updated_at?: string | null
          updated_by?: string | null
          value: Json
        }
        Update: {
          description?: string | null
          key?: string
          updated_at?: string | null
          updated_by?: string | null
          value?: Json
        }
        Relationships: [
          {
            foreignKeyName: "system_config_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "system_config_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles_display"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "system_config_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "v_investor_kpis"
            referencedColumns: ["investor_id"]
          },
        ]
      }
      transaction_bypass_attempts: {
        Row: {
          attempted_amount: number | null
          attempted_at: string
          attempted_source: string | null
          attempted_type: string | null
          client_info: Json | null
          error_message: string | null
          fund_id: string | null
          id: string
          investor_id: string | null
          user_id: string | null
        }
        Insert: {
          attempted_amount?: number | null
          attempted_at?: string
          attempted_source?: string | null
          attempted_type?: string | null
          client_info?: Json | null
          error_message?: string | null
          fund_id?: string | null
          id?: string
          investor_id?: string | null
          user_id?: string | null
        }
        Update: {
          attempted_amount?: number | null
          attempted_at?: string
          attempted_source?: string | null
          attempted_type?: string | null
          client_info?: Json | null
          error_message?: string | null
          fund_id?: string | null
          id?: string
          investor_id?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      transaction_import_staging: {
        Row: {
          amount: number
          asset: string
          batch_id: string
          created_at: string | null
          fund_id: string
          id: string
          imported_by: string
          investor_id: string
          notes: string | null
          promoted_at: string | null
          promoted_tx_id: string | null
          reference_id: string | null
          tx_date: string
          type: string
          validated_at: string | null
          validation_errors: Json | null
          validation_status: string
        }
        Insert: {
          amount: number
          asset: string
          batch_id: string
          created_at?: string | null
          fund_id: string
          id?: string
          imported_by: string
          investor_id: string
          notes?: string | null
          promoted_at?: string | null
          promoted_tx_id?: string | null
          reference_id?: string | null
          tx_date: string
          type: string
          validated_at?: string | null
          validation_errors?: Json | null
          validation_status?: string
        }
        Update: {
          amount?: number
          asset?: string
          batch_id?: string
          created_at?: string | null
          fund_id?: string
          id?: string
          imported_by?: string
          investor_id?: string
          notes?: string | null
          promoted_at?: string | null
          promoted_tx_id?: string | null
          reference_id?: string | null
          tx_date?: string
          type?: string
          validated_at?: string | null
          validation_errors?: Json | null
          validation_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "transaction_import_staging_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "aum_position_reconciliation"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "transaction_import_staging_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "fund_aum_mismatch"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "transaction_import_staging_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "funds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transaction_import_staging_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_aum_position_mismatch"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "transaction_import_staging_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_aum_snapshot_health"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "transaction_import_staging_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_crystallization_dashboard"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "transaction_import_staging_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_fund_aum_position_health"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "transaction_import_staging_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_fund_aum_position_status"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "transaction_import_staging_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_fund_summary_live"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "transaction_import_staging_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_liquidity_risk"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "transaction_import_staging_promoted_tx_id_fkey"
            columns: ["promoted_tx_id"]
            isOneToOne: false
            referencedRelation: "transactions_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transaction_import_staging_promoted_tx_id_fkey"
            columns: ["promoted_tx_id"]
            isOneToOne: false
            referencedRelation: "v_orphaned_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transaction_import_staging_promoted_tx_id_fkey"
            columns: ["promoted_tx_id"]
            isOneToOne: false
            referencedRelation: "v_transaction_distribution_orphans"
            referencedColumns: ["transaction_id"]
          },
        ]
      }
      transactions_v2: {
        Row: {
          amount: number
          approved_at: string | null
          approved_by: string | null
          asset: string
          balance_after: number | null
          balance_before: number | null
          correction_id: string | null
          created_at: string | null
          created_by: string | null
          distribution_id: string | null
          fund_class: string | null
          fund_id: string
          id: string
          investor_id: string | null
          is_system_generated: boolean | null
          is_voided: boolean
          meta: Json | null
          notes: string | null
          purpose: Database["public"]["Enums"]["aum_purpose"] | null
          reference_id: string | null
          source: Database["public"]["Enums"]["tx_source"] | null
          transfer_id: string | null
          tx_date: string
          tx_hash: string | null
          tx_subtype: string | null
          type: Database["public"]["Enums"]["tx_type"]
          value_date: string
          visibility_scope: Database["public"]["Enums"]["visibility_scope"]
          void_reason: string | null
          voided_at: string | null
          voided_by: string | null
          voided_by_profile_id: string | null
        }
        Insert: {
          amount: number
          approved_at?: string | null
          approved_by?: string | null
          asset: string
          balance_after?: number | null
          balance_before?: number | null
          correction_id?: string | null
          created_at?: string | null
          created_by?: string | null
          distribution_id?: string | null
          fund_class?: string | null
          fund_id: string
          id?: string
          investor_id?: string | null
          is_system_generated?: boolean | null
          is_voided?: boolean
          meta?: Json | null
          notes?: string | null
          purpose?: Database["public"]["Enums"]["aum_purpose"] | null
          reference_id?: string | null
          source?: Database["public"]["Enums"]["tx_source"] | null
          transfer_id?: string | null
          tx_date?: string
          tx_hash?: string | null
          tx_subtype?: string | null
          type: Database["public"]["Enums"]["tx_type"]
          value_date?: string
          visibility_scope?: Database["public"]["Enums"]["visibility_scope"]
          void_reason?: string | null
          voided_at?: string | null
          voided_by?: string | null
          voided_by_profile_id?: string | null
        }
        Update: {
          amount?: number
          approved_at?: string | null
          approved_by?: string | null
          asset?: string
          balance_after?: number | null
          balance_before?: number | null
          correction_id?: string | null
          created_at?: string | null
          created_by?: string | null
          distribution_id?: string | null
          fund_class?: string | null
          fund_id?: string
          id?: string
          investor_id?: string | null
          is_system_generated?: boolean | null
          is_voided?: boolean
          meta?: Json | null
          notes?: string | null
          purpose?: Database["public"]["Enums"]["aum_purpose"] | null
          reference_id?: string | null
          source?: Database["public"]["Enums"]["tx_source"] | null
          transfer_id?: string | null
          tx_date?: string
          tx_hash?: string | null
          tx_subtype?: string | null
          type?: Database["public"]["Enums"]["tx_type"]
          value_date?: string
          visibility_scope?: Database["public"]["Enums"]["visibility_scope"]
          void_reason?: string | null
          voided_at?: string | null
          voided_by?: string | null
          voided_by_profile_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_transactions_v2_distribution"
            columns: ["distribution_id"]
            isOneToOne: false
            referencedRelation: "v_yield_conservation_violations"
            referencedColumns: ["distribution_id"]
          },
          {
            foreignKeyName: "fk_transactions_v2_distribution"
            columns: ["distribution_id"]
            isOneToOne: false
            referencedRelation: "yield_distribution_conservation_check"
            referencedColumns: ["distribution_id"]
          },
          {
            foreignKeyName: "fk_transactions_v2_distribution"
            columns: ["distribution_id"]
            isOneToOne: false
            referencedRelation: "yield_distributions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_transactions_v2_fund"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "aum_position_reconciliation"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "fk_transactions_v2_fund"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "fund_aum_mismatch"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "fk_transactions_v2_fund"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "funds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_transactions_v2_fund"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_aum_position_mismatch"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "fk_transactions_v2_fund"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_aum_snapshot_health"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "fk_transactions_v2_fund"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_crystallization_dashboard"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "fk_transactions_v2_fund"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_fund_aum_position_health"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "fk_transactions_v2_fund"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_fund_aum_position_status"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "fk_transactions_v2_fund"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_fund_summary_live"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "fk_transactions_v2_fund"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_liquidity_risk"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "fk_transactions_v2_investor"
            columns: ["investor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_transactions_v2_investor"
            columns: ["investor_id"]
            isOneToOne: false
            referencedRelation: "profiles_display"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_transactions_v2_investor"
            columns: ["investor_id"]
            isOneToOne: false
            referencedRelation: "v_investor_kpis"
            referencedColumns: ["investor_id"]
          },
          {
            foreignKeyName: "fk_transactions_v2_voided_by_profile"
            columns: ["voided_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_transactions_v2_voided_by_profile"
            columns: ["voided_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles_display"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_transactions_v2_voided_by_profile"
            columns: ["voided_by_profile_id"]
            isOneToOne: false
            referencedRelation: "v_investor_kpis"
            referencedColumns: ["investor_id"]
          },
          {
            foreignKeyName: "transactions_v2_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_v2_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles_display"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_v2_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "v_investor_kpis"
            referencedColumns: ["investor_id"]
          },
          {
            foreignKeyName: "transactions_v2_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_v2_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles_display"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_v2_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_investor_kpis"
            referencedColumns: ["investor_id"]
          },
          {
            foreignKeyName: "transactions_v2_investor_id_fkey"
            columns: ["investor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_v2_investor_id_fkey"
            columns: ["investor_id"]
            isOneToOne: false
            referencedRelation: "profiles_display"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_v2_investor_id_fkey"
            columns: ["investor_id"]
            isOneToOne: false
            referencedRelation: "v_investor_kpis"
            referencedColumns: ["investor_id"]
          },
        ]
      }
      transactions_v2_archive: {
        Row: {
          amount: number | null
          archive_id: string
          archived_at: string
          archived_by: string | null
          asset: string | null
          created_by: string | null
          fund_id: string | null
          id: string | null
          investor_id: string | null
          notes: string | null
          original_created_at: string | null
          reference_id: string | null
          reset_batch_id: string
          tx_date: string | null
          type: string | null
        }
        Insert: {
          amount?: number | null
          archive_id?: string
          archived_at?: string
          archived_by?: string | null
          asset?: string | null
          created_by?: string | null
          fund_id?: string | null
          id?: string | null
          investor_id?: string | null
          notes?: string | null
          original_created_at?: string | null
          reference_id?: string | null
          reset_batch_id: string
          tx_date?: string | null
          type?: string | null
        }
        Update: {
          amount?: number | null
          archive_id?: string
          archived_at?: string
          archived_by?: string | null
          asset?: string | null
          created_by?: string | null
          fund_id?: string | null
          id?: string | null
          investor_id?: string | null
          notes?: string | null
          original_created_at?: string | null
          reference_id?: string | null
          reset_batch_id?: string
          tx_date?: string | null
          type?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_sessions: {
        Row: {
          created_at: string
          device_label: string | null
          id: string
          ip: unknown
          last_seen_at: string
          refresh_token_id: string | null
          revoked_at: string | null
          revoked_by: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          device_label?: string | null
          id?: string
          ip?: unknown
          last_seen_at?: string
          refresh_token_id?: string | null
          revoked_at?: string | null
          revoked_by?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          device_label?: string | null
          id?: string
          ip?: unknown
          last_seen_at?: string
          refresh_token_id?: string | null
          revoked_at?: string | null
          revoked_by?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_totp_backup_codes: {
        Row: {
          code_hash: string
          created_at: string | null
          generated_batch_id: string | null
          id: string
          totp_settings_id: string
          used_at: string | null
          user_id: string
        }
        Insert: {
          code_hash: string
          created_at?: string | null
          generated_batch_id?: string | null
          id?: string
          totp_settings_id: string
          used_at?: string | null
          user_id: string
        }
        Update: {
          code_hash?: string
          created_at?: string | null
          generated_batch_id?: string | null
          id?: string
          totp_settings_id?: string
          used_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_totp_backup_codes_totp_settings_id_fkey"
            columns: ["totp_settings_id"]
            isOneToOne: false
            referencedRelation: "user_totp_settings"
            referencedColumns: ["id"]
          },
        ]
      }
      user_totp_settings: {
        Row: {
          algorithm: string | null
          backup_codes_generated_at: string | null
          created_at: string | null
          created_by: string | null
          digits: number | null
          enabled: boolean
          enforce_required: boolean | null
          failed_attempts: number | null
          id: string
          last_used_at: string | null
          locked_until: string | null
          period: number | null
          qr_code_shown_at: string | null
          recovery_used_count: number | null
          secret_encrypted: string | null
          setup_completed_at: string | null
          updated_at: string | null
          user_id: string
          verified_at: string | null
        }
        Insert: {
          algorithm?: string | null
          backup_codes_generated_at?: string | null
          created_at?: string | null
          created_by?: string | null
          digits?: number | null
          enabled?: boolean
          enforce_required?: boolean | null
          failed_attempts?: number | null
          id?: string
          last_used_at?: string | null
          locked_until?: string | null
          period?: number | null
          qr_code_shown_at?: string | null
          recovery_used_count?: number | null
          secret_encrypted?: string | null
          setup_completed_at?: string | null
          updated_at?: string | null
          user_id: string
          verified_at?: string | null
        }
        Update: {
          algorithm?: string | null
          backup_codes_generated_at?: string | null
          created_at?: string | null
          created_by?: string | null
          digits?: number | null
          enabled?: boolean
          enforce_required?: boolean | null
          failed_attempts?: number | null
          id?: string
          last_used_at?: string | null
          locked_until?: string | null
          period?: number | null
          qr_code_shown_at?: string | null
          recovery_used_count?: number | null
          secret_encrypted?: string | null
          setup_completed_at?: string | null
          updated_at?: string | null
          user_id?: string
          verified_at?: string | null
        }
        Relationships: []
      }
      withdrawal_audit_logs: {
        Row: {
          action: Database["public"]["Enums"]["withdrawal_action"]
          actor_id: string | null
          created_at: string
          details: Json | null
          id: string
          request_id: string
        }
        Insert: {
          action: Database["public"]["Enums"]["withdrawal_action"]
          actor_id?: string | null
          created_at?: string
          details?: Json | null
          id?: string
          request_id: string
        }
        Update: {
          action?: Database["public"]["Enums"]["withdrawal_action"]
          actor_id?: string | null
          created_at?: string
          details?: Json | null
          id?: string
          request_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "withdrawal_audit_logs_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "withdrawal_audit_logs_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles_display"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "withdrawal_audit_logs_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "v_investor_kpis"
            referencedColumns: ["investor_id"]
          },
          {
            foreignKeyName: "withdrawal_audit_logs_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_missing_withdrawal_transactions"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "withdrawal_audit_logs_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "withdrawal_queue"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "withdrawal_audit_logs_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "withdrawal_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      withdrawal_requests: {
        Row: {
          admin_notes: string | null
          approved_amount: number | null
          approved_at: string | null
          approved_by: string | null
          approved_shares: number | null
          cancellation_reason: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          created_by: string | null
          earliest_processing_at: string | null
          fund_class: string | null
          fund_id: string
          id: string
          investor_id: string | null
          notes: string | null
          processed_amount: number | null
          processed_at: string | null
          rejected_at: string | null
          rejected_by: string | null
          rejection_reason: string | null
          request_date: string
          requested_amount: number
          requested_shares: number | null
          settlement_date: string | null
          status: Database["public"]["Enums"]["withdrawal_status"]
          tx_hash: string | null
          updated_at: string | null
          version: number | null
          withdrawal_type: string
        }
        Insert: {
          admin_notes?: string | null
          approved_amount?: number | null
          approved_at?: string | null
          approved_by?: string | null
          approved_shares?: number | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          created_by?: string | null
          earliest_processing_at?: string | null
          fund_class?: string | null
          fund_id: string
          id?: string
          investor_id?: string | null
          notes?: string | null
          processed_amount?: number | null
          processed_at?: string | null
          rejected_at?: string | null
          rejected_by?: string | null
          rejection_reason?: string | null
          request_date?: string
          requested_amount: number
          requested_shares?: number | null
          settlement_date?: string | null
          status?: Database["public"]["Enums"]["withdrawal_status"]
          tx_hash?: string | null
          updated_at?: string | null
          version?: number | null
          withdrawal_type: string
        }
        Update: {
          admin_notes?: string | null
          approved_amount?: number | null
          approved_at?: string | null
          approved_by?: string | null
          approved_shares?: number | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          created_by?: string | null
          earliest_processing_at?: string | null
          fund_class?: string | null
          fund_id?: string
          id?: string
          investor_id?: string | null
          notes?: string | null
          processed_amount?: number | null
          processed_at?: string | null
          rejected_at?: string | null
          rejected_by?: string | null
          rejection_reason?: string | null
          request_date?: string
          requested_amount?: number
          requested_shares?: number | null
          settlement_date?: string | null
          status?: Database["public"]["Enums"]["withdrawal_status"]
          tx_hash?: string | null
          updated_at?: string | null
          version?: number | null
          withdrawal_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_withdrawal_requests_profile"
            columns: ["investor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_withdrawal_requests_profile"
            columns: ["investor_id"]
            isOneToOne: false
            referencedRelation: "profiles_display"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_withdrawal_requests_profile"
            columns: ["investor_id"]
            isOneToOne: false
            referencedRelation: "v_investor_kpis"
            referencedColumns: ["investor_id"]
          },
          {
            foreignKeyName: "withdrawal_requests_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "withdrawal_requests_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles_display"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "withdrawal_requests_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "v_investor_kpis"
            referencedColumns: ["investor_id"]
          },
          {
            foreignKeyName: "withdrawal_requests_cancelled_by_fkey"
            columns: ["cancelled_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "withdrawal_requests_cancelled_by_fkey"
            columns: ["cancelled_by"]
            isOneToOne: false
            referencedRelation: "profiles_display"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "withdrawal_requests_cancelled_by_fkey"
            columns: ["cancelled_by"]
            isOneToOne: false
            referencedRelation: "v_investor_kpis"
            referencedColumns: ["investor_id"]
          },
          {
            foreignKeyName: "withdrawal_requests_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "withdrawal_requests_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles_display"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "withdrawal_requests_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_investor_kpis"
            referencedColumns: ["investor_id"]
          },
          {
            foreignKeyName: "withdrawal_requests_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "aum_position_reconciliation"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "withdrawal_requests_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "fund_aum_mismatch"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "withdrawal_requests_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "funds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "withdrawal_requests_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_aum_position_mismatch"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "withdrawal_requests_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_aum_snapshot_health"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "withdrawal_requests_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_crystallization_dashboard"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "withdrawal_requests_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_fund_aum_position_health"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "withdrawal_requests_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_fund_aum_position_status"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "withdrawal_requests_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_fund_summary_live"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "withdrawal_requests_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_liquidity_risk"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "withdrawal_requests_rejected_by_fkey"
            columns: ["rejected_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "withdrawal_requests_rejected_by_fkey"
            columns: ["rejected_by"]
            isOneToOne: false
            referencedRelation: "profiles_display"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "withdrawal_requests_rejected_by_fkey"
            columns: ["rejected_by"]
            isOneToOne: false
            referencedRelation: "v_investor_kpis"
            referencedColumns: ["investor_id"]
          },
        ]
      }
      yield_allocations: {
        Row: {
          adb_share: number | null
          created_at: string | null
          distribution_id: string
          fee_amount: number | null
          fee_pct: number | null
          fee_transaction_id: string | null
          fund_id: string | null
          gross_amount: number
          ib_amount: number | null
          ib_pct: number | null
          ib_transaction_id: string | null
          id: string
          investor_id: string
          is_voided: boolean | null
          net_amount: number
          ownership_pct: number | null
          position_value_at_calc: number | null
          transaction_id: string | null
        }
        Insert: {
          adb_share?: number | null
          created_at?: string | null
          distribution_id: string
          fee_amount?: number | null
          fee_pct?: number | null
          fee_transaction_id?: string | null
          fund_id?: string | null
          gross_amount: number
          ib_amount?: number | null
          ib_pct?: number | null
          ib_transaction_id?: string | null
          id?: string
          investor_id: string
          is_voided?: boolean | null
          net_amount: number
          ownership_pct?: number | null
          position_value_at_calc?: number | null
          transaction_id?: string | null
        }
        Update: {
          adb_share?: number | null
          created_at?: string | null
          distribution_id?: string
          fee_amount?: number | null
          fee_pct?: number | null
          fee_transaction_id?: string | null
          fund_id?: string | null
          gross_amount?: number
          ib_amount?: number | null
          ib_pct?: number | null
          ib_transaction_id?: string | null
          id?: string
          investor_id?: string
          is_voided?: boolean | null
          net_amount?: number
          ownership_pct?: number | null
          position_value_at_calc?: number | null
          transaction_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "yield_allocations_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "aum_position_reconciliation"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "yield_allocations_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "fund_aum_mismatch"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "yield_allocations_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "funds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "yield_allocations_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_aum_position_mismatch"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "yield_allocations_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_aum_snapshot_health"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "yield_allocations_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_crystallization_dashboard"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "yield_allocations_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_fund_aum_position_health"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "yield_allocations_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_fund_aum_position_status"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "yield_allocations_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_fund_summary_live"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "yield_allocations_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_liquidity_risk"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "yield_allocations_ib_transaction_id_fkey"
            columns: ["ib_transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "yield_allocations_ib_transaction_id_fkey"
            columns: ["ib_transaction_id"]
            isOneToOne: false
            referencedRelation: "v_orphaned_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "yield_allocations_ib_transaction_id_fkey"
            columns: ["ib_transaction_id"]
            isOneToOne: false
            referencedRelation: "v_transaction_distribution_orphans"
            referencedColumns: ["transaction_id"]
          },
        ]
      }
      yield_corrections: {
        Row: {
          applied_at: string | null
          applied_by: string | null
          correction_distribution_id: string
          created_at: string
          created_by: string
          delta_aum: number
          delta_gross_yield: number
          id: string
          investors_affected: number
          new_aum: number
          new_gross_yield: number
          old_aum: number
          old_gross_yield: number
          original_distribution_id: string
          preview_json: Json
          reason: string
          rolled_back_at: string | null
          rolled_back_by: string | null
          status: string
          total_fee_delta: number
          total_ib_delta: number
        }
        Insert: {
          applied_at?: string | null
          applied_by?: string | null
          correction_distribution_id: string
          created_at?: string
          created_by: string
          delta_aum: number
          delta_gross_yield?: number
          id?: string
          investors_affected?: number
          new_aum: number
          new_gross_yield?: number
          old_aum: number
          old_gross_yield?: number
          original_distribution_id: string
          preview_json: Json
          reason: string
          rolled_back_at?: string | null
          rolled_back_by?: string | null
          status?: string
          total_fee_delta?: number
          total_ib_delta?: number
        }
        Update: {
          applied_at?: string | null
          applied_by?: string | null
          correction_distribution_id?: string
          created_at?: string
          created_by?: string
          delta_aum?: number
          delta_gross_yield?: number
          id?: string
          investors_affected?: number
          new_aum?: number
          new_gross_yield?: number
          old_aum?: number
          old_gross_yield?: number
          original_distribution_id?: string
          preview_json?: Json
          reason?: string
          rolled_back_at?: string | null
          rolled_back_by?: string | null
          status?: string
          total_fee_delta?: number
          total_ib_delta?: number
        }
        Relationships: [
          {
            foreignKeyName: "yield_corrections_correction_distribution_id_fkey"
            columns: ["correction_distribution_id"]
            isOneToOne: false
            referencedRelation: "v_yield_conservation_violations"
            referencedColumns: ["distribution_id"]
          },
          {
            foreignKeyName: "yield_corrections_correction_distribution_id_fkey"
            columns: ["correction_distribution_id"]
            isOneToOne: false
            referencedRelation: "yield_distribution_conservation_check"
            referencedColumns: ["distribution_id"]
          },
          {
            foreignKeyName: "yield_corrections_correction_distribution_id_fkey"
            columns: ["correction_distribution_id"]
            isOneToOne: false
            referencedRelation: "yield_distributions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "yield_corrections_original_distribution_id_fkey"
            columns: ["original_distribution_id"]
            isOneToOne: false
            referencedRelation: "v_yield_conservation_violations"
            referencedColumns: ["distribution_id"]
          },
          {
            foreignKeyName: "yield_corrections_original_distribution_id_fkey"
            columns: ["original_distribution_id"]
            isOneToOne: false
            referencedRelation: "yield_distribution_conservation_check"
            referencedColumns: ["distribution_id"]
          },
          {
            foreignKeyName: "yield_corrections_original_distribution_id_fkey"
            columns: ["original_distribution_id"]
            isOneToOne: false
            referencedRelation: "yield_distributions"
            referencedColumns: ["id"]
          },
        ]
      }
      yield_distributions: {
        Row: {
          allocation_count: number | null
          aum_record_id: string | null
          calculation_method: string | null
          closing_aum: number | null
          created_at: string
          created_by: string | null
          distribution_type: string
          dust_amount: number | null
          dust_receiver_id: string | null
          effective_date: string
          fund_id: string
          gross_yield: number
          gross_yield_amount: number | null
          id: string
          investor_count: number | null
          is_month_end: boolean
          is_voided: boolean | null
          net_yield: number | null
          opening_aum: number | null
          parent_distribution_id: string | null
          period_end: string | null
          period_start: string | null
          previous_aum: number | null
          purpose: Database["public"]["Enums"]["aum_purpose"]
          reason: string | null
          recorded_aum: number
          reference_id: string | null
          status: string
          summary_json: Json | null
          total_fee_amount: number | null
          total_fees: number | null
          total_ib: number | null
          total_ib_amount: number | null
          total_net_amount: number | null
          void_reason: string | null
          voided_at: string | null
          voided_by: string | null
          yield_date: string | null
          yield_percentage: number | null
        }
        Insert: {
          allocation_count?: number | null
          aum_record_id?: string | null
          calculation_method?: string | null
          closing_aum?: number | null
          created_at?: string
          created_by?: string | null
          distribution_type?: string
          dust_amount?: number | null
          dust_receiver_id?: string | null
          effective_date: string
          fund_id: string
          gross_yield?: number
          gross_yield_amount?: number | null
          id?: string
          investor_count?: number | null
          is_month_end?: boolean
          is_voided?: boolean | null
          net_yield?: number | null
          opening_aum?: number | null
          parent_distribution_id?: string | null
          period_end?: string | null
          period_start?: string | null
          previous_aum?: number | null
          purpose: Database["public"]["Enums"]["aum_purpose"]
          reason?: string | null
          recorded_aum: number
          reference_id?: string | null
          status: string
          summary_json?: Json | null
          total_fee_amount?: number | null
          total_fees?: number | null
          total_ib?: number | null
          total_ib_amount?: number | null
          total_net_amount?: number | null
          void_reason?: string | null
          voided_at?: string | null
          voided_by?: string | null
          yield_date?: string | null
          yield_percentage?: number | null
        }
        Update: {
          allocation_count?: number | null
          aum_record_id?: string | null
          calculation_method?: string | null
          closing_aum?: number | null
          created_at?: string
          created_by?: string | null
          distribution_type?: string
          dust_amount?: number | null
          dust_receiver_id?: string | null
          effective_date?: string
          fund_id?: string
          gross_yield?: number
          gross_yield_amount?: number | null
          id?: string
          investor_count?: number | null
          is_month_end?: boolean
          is_voided?: boolean | null
          net_yield?: number | null
          opening_aum?: number | null
          parent_distribution_id?: string | null
          period_end?: string | null
          period_start?: string | null
          previous_aum?: number | null
          purpose?: Database["public"]["Enums"]["aum_purpose"]
          reason?: string | null
          recorded_aum?: number
          reference_id?: string | null
          status?: string
          summary_json?: Json | null
          total_fee_amount?: number | null
          total_fees?: number | null
          total_ib?: number | null
          total_ib_amount?: number | null
          total_net_amount?: number | null
          void_reason?: string | null
          voided_at?: string | null
          voided_by?: string | null
          yield_date?: string | null
          yield_percentage?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_yield_distributions_fund_new"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "aum_position_reconciliation"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "fk_yield_distributions_fund_new"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "fund_aum_mismatch"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "fk_yield_distributions_fund_new"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "funds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_yield_distributions_fund_new"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_aum_position_mismatch"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "fk_yield_distributions_fund_new"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_aum_snapshot_health"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "fk_yield_distributions_fund_new"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_crystallization_dashboard"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "fk_yield_distributions_fund_new"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_fund_aum_position_health"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "fk_yield_distributions_fund_new"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_fund_aum_position_status"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "fk_yield_distributions_fund_new"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_fund_summary_live"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "fk_yield_distributions_fund_new"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_liquidity_risk"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "yield_distributions_aum_record_id_fkey"
            columns: ["aum_record_id"]
            isOneToOne: false
            referencedRelation: "fund_daily_aum"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "yield_distributions_dust_receiver_id_fkey"
            columns: ["dust_receiver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "yield_distributions_dust_receiver_id_fkey"
            columns: ["dust_receiver_id"]
            isOneToOne: false
            referencedRelation: "profiles_display"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "yield_distributions_dust_receiver_id_fkey"
            columns: ["dust_receiver_id"]
            isOneToOne: false
            referencedRelation: "v_investor_kpis"
            referencedColumns: ["investor_id"]
          },
          {
            foreignKeyName: "yield_distributions_parent_distribution_id_fkey"
            columns: ["parent_distribution_id"]
            isOneToOne: false
            referencedRelation: "v_yield_conservation_violations"
            referencedColumns: ["distribution_id"]
          },
          {
            foreignKeyName: "yield_distributions_parent_distribution_id_fkey"
            columns: ["parent_distribution_id"]
            isOneToOne: false
            referencedRelation: "yield_distribution_conservation_check"
            referencedColumns: ["distribution_id"]
          },
          {
            foreignKeyName: "yield_distributions_parent_distribution_id_fkey"
            columns: ["parent_distribution_id"]
            isOneToOne: false
            referencedRelation: "yield_distributions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "yield_distributions_voided_by_fkey"
            columns: ["voided_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "yield_distributions_voided_by_fkey"
            columns: ["voided_by"]
            isOneToOne: false
            referencedRelation: "profiles_display"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "yield_distributions_voided_by_fkey"
            columns: ["voided_by"]
            isOneToOne: false
            referencedRelation: "v_investor_kpis"
            referencedColumns: ["investor_id"]
          },
        ]
      }
      yield_edit_audit: {
        Row: {
          created_at: string
          edit_reason: string | null
          edited_at: string
          edited_by: string | null
          id: string
          new_values: Json
          previous_values: Json
          record_id: string
          record_type: string
        }
        Insert: {
          created_at?: string
          edit_reason?: string | null
          edited_at?: string
          edited_by?: string | null
          id?: string
          new_values: Json
          previous_values: Json
          record_id: string
          record_type: string
        }
        Update: {
          created_at?: string
          edit_reason?: string | null
          edited_at?: string
          edited_by?: string | null
          id?: string
          new_values?: Json
          previous_values?: Json
          record_id?: string
          record_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_yield_edit_audit_editor_profile"
            columns: ["edited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_yield_edit_audit_editor_profile"
            columns: ["edited_by"]
            isOneToOne: false
            referencedRelation: "profiles_display"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_yield_edit_audit_editor_profile"
            columns: ["edited_by"]
            isOneToOne: false
            referencedRelation: "v_investor_kpis"
            referencedColumns: ["investor_id"]
          },
        ]
      }
      yield_rate_sanity_config: {
        Row: {
          alert_threshold_pct: number | null
          created_at: string | null
          fund_id: string
          id: string
          max_daily_yield_pct: number
          min_daily_yield_pct: number | null
          updated_at: string | null
        }
        Insert: {
          alert_threshold_pct?: number | null
          created_at?: string | null
          fund_id: string
          id?: string
          max_daily_yield_pct?: number
          min_daily_yield_pct?: number | null
          updated_at?: string | null
        }
        Update: {
          alert_threshold_pct?: number | null
          created_at?: string | null
          fund_id?: string
          id?: string
          max_daily_yield_pct?: number
          min_daily_yield_pct?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_fund_sanity"
            columns: ["fund_id"]
            isOneToOne: true
            referencedRelation: "aum_position_reconciliation"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "fk_fund_sanity"
            columns: ["fund_id"]
            isOneToOne: true
            referencedRelation: "fund_aum_mismatch"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "fk_fund_sanity"
            columns: ["fund_id"]
            isOneToOne: true
            referencedRelation: "funds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_fund_sanity"
            columns: ["fund_id"]
            isOneToOne: true
            referencedRelation: "v_aum_position_mismatch"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "fk_fund_sanity"
            columns: ["fund_id"]
            isOneToOne: true
            referencedRelation: "v_aum_snapshot_health"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "fk_fund_sanity"
            columns: ["fund_id"]
            isOneToOne: true
            referencedRelation: "v_crystallization_dashboard"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "fk_fund_sanity"
            columns: ["fund_id"]
            isOneToOne: true
            referencedRelation: "v_fund_aum_position_health"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "fk_fund_sanity"
            columns: ["fund_id"]
            isOneToOne: true
            referencedRelation: "v_fund_aum_position_status"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "fk_fund_sanity"
            columns: ["fund_id"]
            isOneToOne: true
            referencedRelation: "v_fund_summary_live"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "fk_fund_sanity"
            columns: ["fund_id"]
            isOneToOne: true
            referencedRelation: "v_liquidity_risk"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "yield_rate_sanity_config_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: true
            referencedRelation: "aum_position_reconciliation"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "yield_rate_sanity_config_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: true
            referencedRelation: "fund_aum_mismatch"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "yield_rate_sanity_config_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: true
            referencedRelation: "funds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "yield_rate_sanity_config_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: true
            referencedRelation: "v_aum_position_mismatch"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "yield_rate_sanity_config_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: true
            referencedRelation: "v_aum_snapshot_health"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "yield_rate_sanity_config_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: true
            referencedRelation: "v_crystallization_dashboard"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "yield_rate_sanity_config_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: true
            referencedRelation: "v_fund_aum_position_health"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "yield_rate_sanity_config_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: true
            referencedRelation: "v_fund_aum_position_status"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "yield_rate_sanity_config_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: true
            referencedRelation: "v_fund_summary_live"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "yield_rate_sanity_config_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: true
            referencedRelation: "v_liquidity_risk"
            referencedColumns: ["fund_id"]
          },
        ]
      }
      yield_rates: {
        Row: {
          asset_id: number
          created_at: string
          daily_yield_percentage: number
          date: string
          entered_by: string | null
          id: string
          is_api_sourced: boolean | null
          updated_at: string
        }
        Insert: {
          asset_id: number
          created_at?: string
          daily_yield_percentage: number
          date: string
          entered_by?: string | null
          id?: string
          is_api_sourced?: boolean | null
          updated_at?: string
        }
        Update: {
          asset_id?: number
          created_at?: string
          daily_yield_percentage?: number
          date?: string
          entered_by?: string | null
          id?: string
          is_api_sourced?: boolean | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "yield_rates_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      aum_position_reconciliation: {
        Row: {
          aum_date: string | null
          calculated_aum: number | null
          discrepancy: number | null
          fund_id: string | null
          fund_name: string | null
          has_discrepancy: boolean | null
          recorded_aum: number | null
        }
        Relationships: []
      }
      fund_aum_mismatch: {
        Row: {
          aum_date: string | null
          calculated_aum: number | null
          discrepancy: number | null
          fund_code: string | null
          fund_id: string | null
          fund_name: string | null
          recorded_aum: number | null
        }
        Relationships: []
      }
      ib_allocation_consistency: {
        Row: {
          allocated_ib_id: string | null
          allocated_ib_name: string | null
          allocation_id: string | null
          current_ib_id: string | null
          current_ib_name: string | null
          effective_date: string | null
          ib_changed_since_allocation: boolean | null
          ib_fee_amount: number | null
          ib_removed: boolean | null
          source_investor_id: string | null
          source_investor_name: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ib_allocations_ib_investor_id_fkey"
            columns: ["allocated_ib_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ib_allocations_ib_investor_id_fkey"
            columns: ["allocated_ib_id"]
            isOneToOne: false
            referencedRelation: "profiles_display"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ib_allocations_ib_investor_id_fkey"
            columns: ["allocated_ib_id"]
            isOneToOne: false
            referencedRelation: "v_investor_kpis"
            referencedColumns: ["investor_id"]
          },
          {
            foreignKeyName: "ib_allocations_source_investor_id_fkey"
            columns: ["source_investor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ib_allocations_source_investor_id_fkey"
            columns: ["source_investor_id"]
            isOneToOne: false
            referencedRelation: "profiles_display"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ib_allocations_source_investor_id_fkey"
            columns: ["source_investor_id"]
            isOneToOne: false
            referencedRelation: "v_investor_kpis"
            referencedColumns: ["investor_id"]
          },
          {
            foreignKeyName: "profiles_ib_parent_id_fkey"
            columns: ["current_ib_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_ib_parent_id_fkey"
            columns: ["current_ib_id"]
            isOneToOne: false
            referencedRelation: "profiles_display"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_ib_parent_id_fkey"
            columns: ["current_ib_id"]
            isOneToOne: false
            referencedRelation: "v_investor_kpis"
            referencedColumns: ["investor_id"]
          },
        ]
      }
      investor_position_ledger_mismatch: {
        Row: {
          discrepancy: number | null
          fund_code: string | null
          fund_id: string | null
          investor_id: string | null
          investor_name: string | null
          ledger_balance: number | null
          position_value: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_investor_positions_fund"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "aum_position_reconciliation"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "fk_investor_positions_fund"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "fund_aum_mismatch"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "fk_investor_positions_fund"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "funds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_investor_positions_fund"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_aum_position_mismatch"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "fk_investor_positions_fund"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_aum_snapshot_health"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "fk_investor_positions_fund"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_crystallization_dashboard"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "fk_investor_positions_fund"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_fund_aum_position_health"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "fk_investor_positions_fund"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_fund_aum_position_status"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "fk_investor_positions_fund"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_fund_summary_live"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "fk_investor_positions_fund"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_liquidity_risk"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "fk_investor_positions_investor"
            columns: ["investor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_investor_positions_investor"
            columns: ["investor_id"]
            isOneToOne: false
            referencedRelation: "profiles_display"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_investor_positions_investor"
            columns: ["investor_id"]
            isOneToOne: false
            referencedRelation: "v_investor_kpis"
            referencedColumns: ["investor_id"]
          },
        ]
      }
      position_transaction_reconciliation: {
        Row: {
          difference: number | null
          fund_id: string | null
          investor_id: string | null
          position_value: number | null
          transaction_sum: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_investor_positions_fund"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "aum_position_reconciliation"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "fk_investor_positions_fund"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "fund_aum_mismatch"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "fk_investor_positions_fund"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "funds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_investor_positions_fund"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_aum_position_mismatch"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "fk_investor_positions_fund"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_aum_snapshot_health"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "fk_investor_positions_fund"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_crystallization_dashboard"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "fk_investor_positions_fund"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_fund_aum_position_health"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "fk_investor_positions_fund"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_fund_aum_position_status"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "fk_investor_positions_fund"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_fund_summary_live"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "fk_investor_positions_fund"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_liquidity_risk"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "fk_investor_positions_investor"
            columns: ["investor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_investor_positions_investor"
            columns: ["investor_id"]
            isOneToOne: false
            referencedRelation: "profiles_display"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_investor_positions_investor"
            columns: ["investor_id"]
            isOneToOne: false
            referencedRelation: "v_investor_kpis"
            referencedColumns: ["investor_id"]
          },
        ]
      }
      profiles_display: {
        Row: {
          account_type: Database["public"]["Enums"]["account_type"] | null
          created_at: string | null
          first_name: string | null
          id: string | null
          is_system_account: boolean | null
          last_name: string | null
          status: string | null
        }
        Insert: {
          account_type?: Database["public"]["Enums"]["account_type"] | null
          created_at?: string | null
          first_name?: string | null
          id?: string | null
          is_system_account?: boolean | null
          last_name?: string | null
          status?: string | null
        }
        Update: {
          account_type?: Database["public"]["Enums"]["account_type"] | null
          created_at?: string | null
          first_name?: string | null
          id?: string | null
          is_system_account?: boolean | null
          last_name?: string | null
          status?: string | null
        }
        Relationships: []
      }
      v_approval_history: {
        Row: {
          action_type: string | null
          actual_value: number | null
          approval_id: string | null
          approval_signature: string | null
          approval_status: string | null
          approved_by: string | null
          approver_name: string | null
          entity_id: string | null
          entity_type: string | null
          metadata: Json | null
          reason: string | null
          rejection_reason: string | null
          requested_at: string | null
          requested_by: string | null
          requester_name: string | null
          resolved_at: string | null
        }
        Relationships: []
      }
      v_aum_position_mismatch: {
        Row: {
          asset: string | null
          fund_id: string | null
          fund_name: string | null
          has_mismatch: boolean | null
          latest_nav_aum: number | null
          mismatch_amount: number | null
          sum_positions: number | null
        }
        Relationships: []
      }
      v_aum_snapshot_health: {
        Row: {
          active_positions: number | null
          aum_created_at: string | null
          aum_source: string | null
          discrepancy: number | null
          fund_code: string | null
          fund_id: string | null
          fund_name: string | null
          latest_aum_date: string | null
          positions_sum: number | null
          recorded_aum: number | null
          status: string | null
        }
        Relationships: []
      }
      v_concentration_risk: {
        Row: {
          account_type: Database["public"]["Enums"]["account_type"] | null
          concentration_level: string | null
          fund_aum: number | null
          fund_code: string | null
          fund_id: string | null
          investor_id: string | null
          investor_name: string | null
          ownership_pct: number | null
          position_value: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_investor_positions_fund"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "aum_position_reconciliation"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "fk_investor_positions_fund"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "fund_aum_mismatch"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "fk_investor_positions_fund"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "funds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_investor_positions_fund"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_aum_position_mismatch"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "fk_investor_positions_fund"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_aum_snapshot_health"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "fk_investor_positions_fund"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_crystallization_dashboard"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "fk_investor_positions_fund"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_fund_aum_position_health"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "fk_investor_positions_fund"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_fund_aum_position_status"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "fk_investor_positions_fund"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_fund_summary_live"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "fk_investor_positions_fund"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_liquidity_risk"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "fk_investor_positions_investor"
            columns: ["investor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_investor_positions_investor"
            columns: ["investor_id"]
            isOneToOne: false
            referencedRelation: "profiles_display"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_investor_positions_investor"
            columns: ["investor_id"]
            isOneToOne: false
            referencedRelation: "v_investor_kpis"
            referencedColumns: ["investor_id"]
          },
        ]
      }
      v_cost_basis_anomalies: {
        Row: {
          cost_basis: number | null
          cost_basis_ratio: number | null
          current_value: number | null
          expected_cost_basis: number | null
          fund_id: string | null
          fund_name: string | null
          investor_id: string | null
          investor_name: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_investor_positions_fund"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "aum_position_reconciliation"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "fk_investor_positions_fund"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "fund_aum_mismatch"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "fk_investor_positions_fund"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "funds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_investor_positions_fund"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_aum_position_mismatch"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "fk_investor_positions_fund"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_aum_snapshot_health"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "fk_investor_positions_fund"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_crystallization_dashboard"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "fk_investor_positions_fund"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_fund_aum_position_health"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "fk_investor_positions_fund"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_fund_aum_position_status"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "fk_investor_positions_fund"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_fund_summary_live"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "fk_investor_positions_fund"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_liquidity_risk"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "fk_investor_positions_investor"
            columns: ["investor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_investor_positions_investor"
            columns: ["investor_id"]
            isOneToOne: false
            referencedRelation: "profiles_display"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_investor_positions_investor"
            columns: ["investor_id"]
            isOneToOne: false
            referencedRelation: "v_investor_kpis"
            referencedColumns: ["investor_id"]
          },
        ]
      }
      v_cost_basis_mismatch: {
        Row: {
          computed_cost_basis: number | null
          computed_current_value: number | null
          computed_shares: number | null
          cost_basis_variance: number | null
          cost_basis_variance_pct: number | null
          current_value_variance: number | null
          fund_code: string | null
          fund_id: string | null
          investor_email: string | null
          investor_id: string | null
          investor_name: string | null
          position_cost_basis: number | null
          position_current_value: number | null
          position_shares: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_investor_positions_fund"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "aum_position_reconciliation"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "fk_investor_positions_fund"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "fund_aum_mismatch"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "fk_investor_positions_fund"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "funds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_investor_positions_fund"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_aum_position_mismatch"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "fk_investor_positions_fund"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_aum_snapshot_health"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "fk_investor_positions_fund"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_crystallization_dashboard"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "fk_investor_positions_fund"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_fund_aum_position_health"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "fk_investor_positions_fund"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_fund_aum_position_status"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "fk_investor_positions_fund"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_fund_summary_live"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "fk_investor_positions_fund"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_liquidity_risk"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "fk_investor_positions_investor"
            columns: ["investor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_investor_positions_investor"
            columns: ["investor_id"]
            isOneToOne: false
            referencedRelation: "profiles_display"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_investor_positions_investor"
            columns: ["investor_id"]
            isOneToOne: false
            referencedRelation: "v_investor_kpis"
            referencedColumns: ["investor_id"]
          },
        ]
      }
      v_crystallization_dashboard: {
        Row: {
          critical_stale: number | null
          fund_code: string | null
          fund_id: string | null
          fund_name: string | null
          never_crystallized: number | null
          newest_crystallization: string | null
          oldest_crystallization: string | null
          total_positions: number | null
          up_to_date: number | null
          warning_stale: number | null
        }
        Relationships: []
      }
      v_crystallization_gaps: {
        Row: {
          cumulative_yield_earned: number | null
          current_value: number | null
          days_behind: number | null
          fund_code: string | null
          fund_id: string | null
          gap_type: string | null
          investor_email: string | null
          investor_id: string | null
          last_tx_type: string | null
          last_yield_crystallization_date: string | null
          max_tx_date: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_investor_positions_fund"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "aum_position_reconciliation"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "fk_investor_positions_fund"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "fund_aum_mismatch"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "fk_investor_positions_fund"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "funds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_investor_positions_fund"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_aum_position_mismatch"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "fk_investor_positions_fund"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_aum_snapshot_health"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "fk_investor_positions_fund"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_crystallization_dashboard"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "fk_investor_positions_fund"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_fund_aum_position_health"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "fk_investor_positions_fund"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_fund_aum_position_status"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "fk_investor_positions_fund"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_fund_summary_live"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "fk_investor_positions_fund"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_liquidity_risk"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "fk_investor_positions_investor"
            columns: ["investor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_investor_positions_investor"
            columns: ["investor_id"]
            isOneToOne: false
            referencedRelation: "profiles_display"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_investor_positions_investor"
            columns: ["investor_id"]
            isOneToOne: false
            referencedRelation: "v_investor_kpis"
            referencedColumns: ["investor_id"]
          },
        ]
      }
      v_daily_platform_metrics_live: {
        Row: {
          active_funds: number | null
          active_investors: number | null
          metric_date: string | null
          pending_withdrawal_amount: number | null
          pending_withdrawals: number | null
          refreshed_at: string | null
          total_ibs: number | null
          total_platform_aum: number | null
          yields_today: number | null
        }
        Relationships: []
      }
      v_documents_compat: {
        Row: {
          checksum: string | null
          created_at: string | null
          created_by: string | null
          created_by_profile_id: string | null
          fund_id: string | null
          id: string | null
          period_end: string | null
          period_start: string | null
          storage_path: string | null
          title: string | null
          type: Database["public"]["Enums"]["document_type"] | null
          user_id: string | null
          user_profile_id: string | null
        }
        Insert: {
          checksum?: string | null
          created_at?: string | null
          created_by?: string | null
          created_by_profile_id?: string | null
          fund_id?: string | null
          id?: string | null
          period_end?: string | null
          period_start?: string | null
          storage_path?: string | null
          title?: string | null
          type?: Database["public"]["Enums"]["document_type"] | null
          user_id?: string | null
          user_profile_id?: string | null
        }
        Update: {
          checksum?: string | null
          created_at?: string | null
          created_by?: string | null
          created_by_profile_id?: string | null
          fund_id?: string | null
          id?: string | null
          period_end?: string | null
          period_start?: string | null
          storage_path?: string | null
          title?: string | null
          type?: Database["public"]["Enums"]["document_type"] | null
          user_id?: string | null
          user_profile_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_documents_created_by_profile"
            columns: ["created_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_documents_created_by_profile"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_documents_created_by_profile"
            columns: ["created_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles_display"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_documents_created_by_profile"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles_display"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_documents_created_by_profile"
            columns: ["created_by_profile_id"]
            isOneToOne: false
            referencedRelation: "v_investor_kpis"
            referencedColumns: ["investor_id"]
          },
          {
            foreignKeyName: "fk_documents_created_by_profile"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_investor_kpis"
            referencedColumns: ["investor_id"]
          },
          {
            foreignKeyName: "fk_documents_user_profile"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_documents_user_profile"
            columns: ["user_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_documents_user_profile"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_display"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_documents_user_profile"
            columns: ["user_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles_display"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_documents_user_profile"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_investor_kpis"
            referencedColumns: ["investor_id"]
          },
          {
            foreignKeyName: "fk_documents_user_profile"
            columns: ["user_profile_id"]
            isOneToOne: false
            referencedRelation: "v_investor_kpis"
            referencedColumns: ["investor_id"]
          },
        ]
      }
      v_fee_allocation_orphans: {
        Row: {
          allocation_id: string | null
          distribution_id: string | null
          fee_amount: number | null
          fund_id: string | null
          investor_id: string | null
          issue_type: string | null
          period_end: string | null
          period_start: string | null
          purpose: Database["public"]["Enums"]["aum_purpose"] | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_fee_allocations_distribution"
            columns: ["distribution_id"]
            isOneToOne: false
            referencedRelation: "v_yield_conservation_violations"
            referencedColumns: ["distribution_id"]
          },
          {
            foreignKeyName: "fk_fee_allocations_distribution"
            columns: ["distribution_id"]
            isOneToOne: false
            referencedRelation: "yield_distribution_conservation_check"
            referencedColumns: ["distribution_id"]
          },
          {
            foreignKeyName: "fk_fee_allocations_distribution"
            columns: ["distribution_id"]
            isOneToOne: false
            referencedRelation: "yield_distributions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_fee_allocations_fund_v2"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "aum_position_reconciliation"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "fk_fee_allocations_fund_v2"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "fund_aum_mismatch"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "fk_fee_allocations_fund_v2"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "funds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_fee_allocations_fund_v2"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_aum_position_mismatch"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "fk_fee_allocations_fund_v2"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_aum_snapshot_health"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "fk_fee_allocations_fund_v2"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_crystallization_dashboard"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "fk_fee_allocations_fund_v2"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_fund_aum_position_health"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "fk_fee_allocations_fund_v2"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_fund_aum_position_status"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "fk_fee_allocations_fund_v2"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_fund_summary_live"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "fk_fee_allocations_fund_v2"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_liquidity_risk"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "fk_fee_allocations_investor_v2"
            columns: ["investor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_fee_allocations_investor_v2"
            columns: ["investor_id"]
            isOneToOne: false
            referencedRelation: "profiles_display"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_fee_allocations_investor_v2"
            columns: ["investor_id"]
            isOneToOne: false
            referencedRelation: "v_investor_kpis"
            referencedColumns: ["investor_id"]
          },
        ]
      }
      v_fee_calculation_orphans: {
        Row: {
          base_net_income: number | null
          created_at: string | null
          created_by: string | null
          credit_transaction_id: string | null
          debit_transaction_id: string | null
          distribution_id: string | null
          fee_amount: number | null
          fee_percentage: number | null
          fees_account_id: string | null
          fund_id: string | null
          id: string | null
          investor_id: string | null
          is_voided: boolean | null
          period_end: string | null
          period_start: string | null
          purpose: Database["public"]["Enums"]["aum_purpose"] | null
          voided_at: string | null
          voided_by: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fee_allocations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fee_allocations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles_display"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fee_allocations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_investor_kpis"
            referencedColumns: ["investor_id"]
          },
          {
            foreignKeyName: "fee_allocations_credit_transaction_id_fkey"
            columns: ["credit_transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fee_allocations_credit_transaction_id_fkey"
            columns: ["credit_transaction_id"]
            isOneToOne: false
            referencedRelation: "v_orphaned_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fee_allocations_credit_transaction_id_fkey"
            columns: ["credit_transaction_id"]
            isOneToOne: false
            referencedRelation: "v_transaction_distribution_orphans"
            referencedColumns: ["transaction_id"]
          },
          {
            foreignKeyName: "fee_allocations_debit_transaction_id_fkey"
            columns: ["debit_transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fee_allocations_debit_transaction_id_fkey"
            columns: ["debit_transaction_id"]
            isOneToOne: false
            referencedRelation: "v_orphaned_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fee_allocations_debit_transaction_id_fkey"
            columns: ["debit_transaction_id"]
            isOneToOne: false
            referencedRelation: "v_transaction_distribution_orphans"
            referencedColumns: ["transaction_id"]
          },
          {
            foreignKeyName: "fee_allocations_fees_account_id_fkey"
            columns: ["fees_account_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fee_allocations_fees_account_id_fkey"
            columns: ["fees_account_id"]
            isOneToOne: false
            referencedRelation: "profiles_display"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fee_allocations_fees_account_id_fkey"
            columns: ["fees_account_id"]
            isOneToOne: false
            referencedRelation: "v_investor_kpis"
            referencedColumns: ["investor_id"]
          },
          {
            foreignKeyName: "fk_fee_allocations_distribution"
            columns: ["distribution_id"]
            isOneToOne: false
            referencedRelation: "v_yield_conservation_violations"
            referencedColumns: ["distribution_id"]
          },
          {
            foreignKeyName: "fk_fee_allocations_distribution"
            columns: ["distribution_id"]
            isOneToOne: false
            referencedRelation: "yield_distribution_conservation_check"
            referencedColumns: ["distribution_id"]
          },
          {
            foreignKeyName: "fk_fee_allocations_distribution"
            columns: ["distribution_id"]
            isOneToOne: false
            referencedRelation: "yield_distributions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_fee_allocations_fund_v2"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "aum_position_reconciliation"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "fk_fee_allocations_fund_v2"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "fund_aum_mismatch"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "fk_fee_allocations_fund_v2"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "funds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_fee_allocations_fund_v2"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_aum_position_mismatch"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "fk_fee_allocations_fund_v2"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_aum_snapshot_health"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "fk_fee_allocations_fund_v2"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_crystallization_dashboard"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "fk_fee_allocations_fund_v2"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_fund_aum_position_health"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "fk_fee_allocations_fund_v2"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_fund_aum_position_status"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "fk_fee_allocations_fund_v2"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_fund_summary_live"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "fk_fee_allocations_fund_v2"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_liquidity_risk"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "fk_fee_allocations_investor_v2"
            columns: ["investor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_fee_allocations_investor_v2"
            columns: ["investor_id"]
            isOneToOne: false
            referencedRelation: "profiles_display"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_fee_allocations_investor_v2"
            columns: ["investor_id"]
            isOneToOne: false
            referencedRelation: "v_investor_kpis"
            referencedColumns: ["investor_id"]
          },
        ]
      }
      v_fund_aum_position_health: {
        Row: {
          asset: string | null
          aum_date: string | null
          aum_source: string | null
          fund_id: string | null
          fund_name: string | null
          health_status: string | null
          latest_daily_aum: number | null
          position_sum: number | null
          status: Database["public"]["Enums"]["fund_status"] | null
          variance: number | null
        }
        Relationships: []
      }
      v_fund_aum_position_status: {
        Row: {
          active_investors: number | null
          actual_positions: number | null
          asset: string | null
          discrepancy: number | null
          discrepancy_pct: number | null
          fund_id: string | null
          fund_name: string | null
          recorded_aum: number | null
          status: string | null
        }
        Relationships: []
      }
      v_fund_summary_live: {
        Row: {
          asset: string | null
          code: string | null
          fees_balance: number | null
          fund_id: string | null
          ib_balance: number | null
          investor_aum: number | null
          investor_count: number | null
          latest_aum: number | null
          latest_aum_date: string | null
          name: string | null
          status: Database["public"]["Enums"]["fund_status"] | null
          total_positions: number | null
        }
        Relationships: []
      }
      v_ib_allocation_orphans: {
        Row: {
          allocation_id: string | null
          distribution_id: string | null
          effective_date: string | null
          ib_fee_amount: number | null
          ib_investor_id: string | null
          issue_type: string | null
          payout_status: string | null
          source_investor_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ib_allocations_distribution_id_fkey_v2"
            columns: ["distribution_id"]
            isOneToOne: false
            referencedRelation: "v_yield_conservation_violations"
            referencedColumns: ["distribution_id"]
          },
          {
            foreignKeyName: "ib_allocations_distribution_id_fkey_v2"
            columns: ["distribution_id"]
            isOneToOne: false
            referencedRelation: "yield_distribution_conservation_check"
            referencedColumns: ["distribution_id"]
          },
          {
            foreignKeyName: "ib_allocations_distribution_id_fkey_v2"
            columns: ["distribution_id"]
            isOneToOne: false
            referencedRelation: "yield_distributions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ib_allocations_ib_investor_id_fkey"
            columns: ["ib_investor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ib_allocations_ib_investor_id_fkey"
            columns: ["ib_investor_id"]
            isOneToOne: false
            referencedRelation: "profiles_display"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ib_allocations_ib_investor_id_fkey"
            columns: ["ib_investor_id"]
            isOneToOne: false
            referencedRelation: "v_investor_kpis"
            referencedColumns: ["investor_id"]
          },
          {
            foreignKeyName: "ib_allocations_source_investor_id_fkey"
            columns: ["source_investor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ib_allocations_source_investor_id_fkey"
            columns: ["source_investor_id"]
            isOneToOne: false
            referencedRelation: "profiles_display"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ib_allocations_source_investor_id_fkey"
            columns: ["source_investor_id"]
            isOneToOne: false
            referencedRelation: "v_investor_kpis"
            referencedColumns: ["investor_id"]
          },
        ]
      }
      v_investor_kpis: {
        Row: {
          email: string | null
          first_investment_date: string | null
          funds_invested: number | null
          investor_id: string | null
          kyc_status: string | null
          last_activity_date: string | null
          name: string | null
          status: string | null
          total_invested: number | null
          total_mgmt_fees: number | null
          total_perf_fees: number | null
          total_realized_pnl: number | null
          total_unrealized_pnl: number | null
          total_value: number | null
        }
        Relationships: []
      }
      v_itd_returns: {
        Row: {
          cost_basis: number | null
          current_value: number | null
          fund_id: string | null
          fund_name: string | null
          investor_id: string | null
          itd_return_pct: number | null
          realized_pnl: number | null
          unrealized_pnl: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_investor_positions_fund"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "aum_position_reconciliation"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "fk_investor_positions_fund"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "fund_aum_mismatch"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "fk_investor_positions_fund"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "funds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_investor_positions_fund"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_aum_position_mismatch"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "fk_investor_positions_fund"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_aum_snapshot_health"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "fk_investor_positions_fund"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_crystallization_dashboard"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "fk_investor_positions_fund"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_fund_aum_position_health"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "fk_investor_positions_fund"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_fund_aum_position_status"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "fk_investor_positions_fund"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_fund_summary_live"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "fk_investor_positions_fund"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_liquidity_risk"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "fk_investor_positions_investor"
            columns: ["investor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_investor_positions_investor"
            columns: ["investor_id"]
            isOneToOne: false
            referencedRelation: "profiles_display"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_investor_positions_investor"
            columns: ["investor_id"]
            isOneToOne: false
            referencedRelation: "v_investor_kpis"
            referencedColumns: ["investor_id"]
          },
        ]
      }
      v_ledger_reconciliation: {
        Row: {
          calculated_balance: number | null
          fund_code: string | null
          fund_id: string | null
          has_variance: boolean | null
          investor_email: string | null
          investor_id: string | null
          position_balance: number | null
          variance: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_investor_positions_fund"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "aum_position_reconciliation"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "fk_investor_positions_fund"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "fund_aum_mismatch"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "fk_investor_positions_fund"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "funds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_investor_positions_fund"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_aum_position_mismatch"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "fk_investor_positions_fund"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_aum_snapshot_health"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "fk_investor_positions_fund"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_crystallization_dashboard"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "fk_investor_positions_fund"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_fund_aum_position_health"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "fk_investor_positions_fund"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_fund_aum_position_status"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "fk_investor_positions_fund"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_fund_summary_live"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "fk_investor_positions_fund"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_liquidity_risk"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "fk_investor_positions_investor"
            columns: ["investor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_investor_positions_investor"
            columns: ["investor_id"]
            isOneToOne: false
            referencedRelation: "profiles_display"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_investor_positions_investor"
            columns: ["investor_id"]
            isOneToOne: false
            referencedRelation: "v_investor_kpis"
            referencedColumns: ["investor_id"]
          },
        ]
      }
      v_liquidity_risk: {
        Row: {
          active_positions: number | null
          fund_code: string | null
          fund_id: string | null
          fund_name: string | null
          pending_withdrawals: number | null
          risk_level: string | null
          total_aum: number | null
          withdrawal_ratio: number | null
        }
        Relationships: []
      }
      v_live_investor_balances: {
        Row: {
          fund_name: string | null
          investor_id: string | null
          last_reported_balance: number | null
          live_balance: number | null
          recent_deposits: number | null
          recent_withdrawals: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_investor_positions_investor"
            columns: ["investor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_investor_positions_investor"
            columns: ["investor_id"]
            isOneToOne: false
            referencedRelation: "profiles_display"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_investor_positions_investor"
            columns: ["investor_id"]
            isOneToOne: false
            referencedRelation: "v_investor_kpis"
            referencedColumns: ["investor_id"]
          },
        ]
      }
      v_missing_withdrawal_transactions: {
        Row: {
          fund_code: string | null
          fund_id: string | null
          investor_email: string | null
          investor_id: string | null
          processed_amount: number | null
          request_date: string | null
          request_id: string | null
          settlement_date: string | null
          status: Database["public"]["Enums"]["withdrawal_status"] | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_withdrawal_requests_profile"
            columns: ["investor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_withdrawal_requests_profile"
            columns: ["investor_id"]
            isOneToOne: false
            referencedRelation: "profiles_display"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_withdrawal_requests_profile"
            columns: ["investor_id"]
            isOneToOne: false
            referencedRelation: "v_investor_kpis"
            referencedColumns: ["investor_id"]
          },
          {
            foreignKeyName: "withdrawal_requests_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "aum_position_reconciliation"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "withdrawal_requests_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "fund_aum_mismatch"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "withdrawal_requests_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "funds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "withdrawal_requests_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_aum_position_mismatch"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "withdrawal_requests_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_aum_snapshot_health"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "withdrawal_requests_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_crystallization_dashboard"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "withdrawal_requests_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_fund_aum_position_health"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "withdrawal_requests_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_fund_aum_position_status"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "withdrawal_requests_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_fund_summary_live"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "withdrawal_requests_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_liquidity_risk"
            referencedColumns: ["fund_id"]
          },
        ]
      }
      v_orphaned_positions: {
        Row: {
          current_value: number | null
          fund_id: string | null
          fund_missing: boolean | null
          investor_id: string | null
          investor_missing: boolean | null
          last_transaction_date: string | null
          orphan_type: string | null
          shares: number | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_investor_positions_fund"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "aum_position_reconciliation"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "fk_investor_positions_fund"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "fund_aum_mismatch"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "fk_investor_positions_fund"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "funds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_investor_positions_fund"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_aum_position_mismatch"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "fk_investor_positions_fund"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_aum_snapshot_health"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "fk_investor_positions_fund"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_crystallization_dashboard"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "fk_investor_positions_fund"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_fund_aum_position_health"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "fk_investor_positions_fund"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_fund_aum_position_status"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "fk_investor_positions_fund"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_fund_summary_live"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "fk_investor_positions_fund"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_liquidity_risk"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "fk_investor_positions_investor"
            columns: ["investor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_investor_positions_investor"
            columns: ["investor_id"]
            isOneToOne: false
            referencedRelation: "profiles_display"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_investor_positions_investor"
            columns: ["investor_id"]
            isOneToOne: false
            referencedRelation: "v_investor_kpis"
            referencedColumns: ["investor_id"]
          },
        ]
      }
      v_orphaned_transactions: {
        Row: {
          amount: number | null
          fund_id: string | null
          id: string | null
          investor_id: string | null
          tx_date: string | null
          type: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_transactions_v2_fund"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "aum_position_reconciliation"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "fk_transactions_v2_fund"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "fund_aum_mismatch"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "fk_transactions_v2_fund"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "funds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_transactions_v2_fund"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_aum_position_mismatch"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "fk_transactions_v2_fund"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_aum_snapshot_health"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "fk_transactions_v2_fund"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_crystallization_dashboard"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "fk_transactions_v2_fund"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_fund_aum_position_health"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "fk_transactions_v2_fund"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_fund_aum_position_status"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "fk_transactions_v2_fund"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_fund_summary_live"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "fk_transactions_v2_fund"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_liquidity_risk"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "fk_transactions_v2_investor"
            columns: ["investor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_transactions_v2_investor"
            columns: ["investor_id"]
            isOneToOne: false
            referencedRelation: "profiles_display"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_transactions_v2_investor"
            columns: ["investor_id"]
            isOneToOne: false
            referencedRelation: "v_investor_kpis"
            referencedColumns: ["investor_id"]
          },
          {
            foreignKeyName: "transactions_v2_investor_id_fkey"
            columns: ["investor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_v2_investor_id_fkey"
            columns: ["investor_id"]
            isOneToOne: false
            referencedRelation: "profiles_display"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_v2_investor_id_fkey"
            columns: ["investor_id"]
            isOneToOne: false
            referencedRelation: "v_investor_kpis"
            referencedColumns: ["investor_id"]
          },
        ]
      }
      v_pending_approvals: {
        Row: {
          action_description: string | null
          action_type: string | null
          actual_value: number | null
          approval_id: string | null
          entity_id: string | null
          entity_type: string | null
          expires_at: string | null
          expiry_status: string | null
          metadata: Json | null
          reason: string | null
          requested_at: string | null
          requested_by: string | null
          requester_email: string | null
          requester_name: string | null
          threshold_value: number | null
        }
        Relationships: []
      }
      v_position_transaction_variance: {
        Row: {
          balance_variance: number | null
          cost_basis: number | null
          fund_code: string | null
          fund_id: string | null
          investor_email: string | null
          investor_id: string | null
          position_value: number | null
          total_deposits: number | null
          total_fees: number | null
          total_interest: number | null
          total_withdrawals: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_investor_positions_fund"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "aum_position_reconciliation"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "fk_investor_positions_fund"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "fund_aum_mismatch"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "fk_investor_positions_fund"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "funds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_investor_positions_fund"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_aum_position_mismatch"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "fk_investor_positions_fund"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_aum_snapshot_health"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "fk_investor_positions_fund"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_crystallization_dashboard"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "fk_investor_positions_fund"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_fund_aum_position_health"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "fk_investor_positions_fund"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_fund_aum_position_status"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "fk_investor_positions_fund"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_fund_summary_live"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "fk_investor_positions_fund"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_liquidity_risk"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "fk_investor_positions_investor"
            columns: ["investor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_investor_positions_investor"
            columns: ["investor_id"]
            isOneToOne: false
            referencedRelation: "profiles_display"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_investor_positions_investor"
            columns: ["investor_id"]
            isOneToOne: false
            referencedRelation: "v_investor_kpis"
            referencedColumns: ["investor_id"]
          },
        ]
      }
      v_potential_duplicate_profiles: {
        Row: {
          duplicate_type: string | null
          emails: string[] | null
          first_created: string | null
          last_created: string | null
          match_key: string | null
          names: string[] | null
          profile_count: number | null
          profile_ids: string[] | null
          total_funds_affected: number | null
          total_value_affected: number | null
        }
        Relationships: []
      }
      v_statements_compat: {
        Row: {
          additions: number | null
          asset_code: Database["public"]["Enums"]["asset_code"] | null
          begin_balance: number | null
          created_at: string | null
          end_balance: number | null
          id: string | null
          investor_id: string | null
          investor_profile_id: string | null
          net_income: number | null
          period_month: number | null
          period_year: number | null
          rate_of_return_itd: number | null
          rate_of_return_mtd: number | null
          rate_of_return_qtd: number | null
          rate_of_return_ytd: number | null
          redemptions: number | null
          storage_path: string | null
        }
        Insert: {
          additions?: number | null
          asset_code?: Database["public"]["Enums"]["asset_code"] | null
          begin_balance?: number | null
          created_at?: string | null
          end_balance?: number | null
          id?: string | null
          investor_id?: string | null
          investor_profile_id?: string | null
          net_income?: number | null
          period_month?: number | null
          period_year?: number | null
          rate_of_return_itd?: number | null
          rate_of_return_mtd?: number | null
          rate_of_return_qtd?: number | null
          rate_of_return_ytd?: number | null
          redemptions?: number | null
          storage_path?: string | null
        }
        Update: {
          additions?: number | null
          asset_code?: Database["public"]["Enums"]["asset_code"] | null
          begin_balance?: number | null
          created_at?: string | null
          end_balance?: number | null
          id?: string | null
          investor_id?: string | null
          investor_profile_id?: string | null
          net_income?: number | null
          period_month?: number | null
          period_year?: number | null
          rate_of_return_itd?: number | null
          rate_of_return_mtd?: number | null
          rate_of_return_qtd?: number | null
          rate_of_return_ytd?: number | null
          redemptions?: number | null
          storage_path?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_statements_investor_profile"
            columns: ["investor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_statements_investor_profile"
            columns: ["investor_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_statements_investor_profile"
            columns: ["investor_id"]
            isOneToOne: false
            referencedRelation: "profiles_display"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_statements_investor_profile"
            columns: ["investor_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles_display"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_statements_investor_profile"
            columns: ["investor_id"]
            isOneToOne: false
            referencedRelation: "v_investor_kpis"
            referencedColumns: ["investor_id"]
          },
          {
            foreignKeyName: "fk_statements_investor_profile"
            columns: ["investor_profile_id"]
            isOneToOne: false
            referencedRelation: "v_investor_kpis"
            referencedColumns: ["investor_id"]
          },
        ]
      }
      v_transaction_distribution_orphans: {
        Row: {
          amount: number | null
          distribution_id: string | null
          fund_id: string | null
          investor_id: string | null
          issue_type: string | null
          purpose: Database["public"]["Enums"]["aum_purpose"] | null
          transaction_id: string | null
          transaction_type: Database["public"]["Enums"]["tx_type"] | null
          tx_date: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_transactions_v2_distribution"
            columns: ["distribution_id"]
            isOneToOne: false
            referencedRelation: "v_yield_conservation_violations"
            referencedColumns: ["distribution_id"]
          },
          {
            foreignKeyName: "fk_transactions_v2_distribution"
            columns: ["distribution_id"]
            isOneToOne: false
            referencedRelation: "yield_distribution_conservation_check"
            referencedColumns: ["distribution_id"]
          },
          {
            foreignKeyName: "fk_transactions_v2_distribution"
            columns: ["distribution_id"]
            isOneToOne: false
            referencedRelation: "yield_distributions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_transactions_v2_fund"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "aum_position_reconciliation"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "fk_transactions_v2_fund"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "fund_aum_mismatch"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "fk_transactions_v2_fund"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "funds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_transactions_v2_fund"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_aum_position_mismatch"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "fk_transactions_v2_fund"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_aum_snapshot_health"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "fk_transactions_v2_fund"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_crystallization_dashboard"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "fk_transactions_v2_fund"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_fund_aum_position_health"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "fk_transactions_v2_fund"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_fund_aum_position_status"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "fk_transactions_v2_fund"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_fund_summary_live"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "fk_transactions_v2_fund"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_liquidity_risk"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "fk_transactions_v2_investor"
            columns: ["investor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_transactions_v2_investor"
            columns: ["investor_id"]
            isOneToOne: false
            referencedRelation: "profiles_display"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_transactions_v2_investor"
            columns: ["investor_id"]
            isOneToOne: false
            referencedRelation: "v_investor_kpis"
            referencedColumns: ["investor_id"]
          },
          {
            foreignKeyName: "transactions_v2_investor_id_fkey"
            columns: ["investor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_v2_investor_id_fkey"
            columns: ["investor_id"]
            isOneToOne: false
            referencedRelation: "profiles_display"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_v2_investor_id_fkey"
            columns: ["investor_id"]
            isOneToOne: false
            referencedRelation: "v_investor_kpis"
            referencedColumns: ["investor_id"]
          },
        ]
      }
      v_transaction_sources: {
        Row: {
          first_tx: string | null
          last_tx: string | null
          source: Database["public"]["Enums"]["tx_source"] | null
          tx_count: number | null
          type: Database["public"]["Enums"]["tx_type"] | null
        }
        Relationships: []
      }
      v_yield_calculation_health: {
        Row: {
          details: Json | null
          status: string | null
          test_name: string | null
        }
        Relationships: []
      }
      v_yield_conservation_violations: {
        Row: {
          created_at: string | null
          distribution_id: string | null
          fund_code: string | null
          fund_id: string | null
          has_violation: boolean | null
          header_dust: number | null
          header_fee: number | null
          header_gross: number | null
          header_ib: number | null
          header_net: number | null
          header_variance: number | null
          is_voided: boolean | null
          period_end: string | null
          period_start: string | null
          purpose: Database["public"]["Enums"]["aum_purpose"] | null
          status: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_yield_distributions_fund_new"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "aum_position_reconciliation"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "fk_yield_distributions_fund_new"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "fund_aum_mismatch"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "fk_yield_distributions_fund_new"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "funds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_yield_distributions_fund_new"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_aum_position_mismatch"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "fk_yield_distributions_fund_new"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_aum_snapshot_health"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "fk_yield_distributions_fund_new"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_crystallization_dashboard"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "fk_yield_distributions_fund_new"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_fund_aum_position_health"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "fk_yield_distributions_fund_new"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_fund_aum_position_status"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "fk_yield_distributions_fund_new"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_fund_summary_live"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "fk_yield_distributions_fund_new"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_liquidity_risk"
            referencedColumns: ["fund_id"]
          },
        ]
      }
      withdrawal_audit_log: {
        Row: {
          action: Database["public"]["Enums"]["withdrawal_action"] | null
          actor_id: string | null
          created_at: string | null
          details: Json | null
          id: string | null
          request_id: string | null
        }
        Insert: {
          action?: Database["public"]["Enums"]["withdrawal_action"] | null
          actor_id?: string | null
          created_at?: string | null
          details?: Json | null
          id?: string | null
          request_id?: string | null
        }
        Update: {
          action?: Database["public"]["Enums"]["withdrawal_action"] | null
          actor_id?: string | null
          created_at?: string | null
          details?: Json | null
          id?: string | null
          request_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "withdrawal_audit_logs_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "withdrawal_audit_logs_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles_display"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "withdrawal_audit_logs_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "v_investor_kpis"
            referencedColumns: ["investor_id"]
          },
          {
            foreignKeyName: "withdrawal_audit_logs_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_missing_withdrawal_transactions"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "withdrawal_audit_logs_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "withdrawal_queue"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "withdrawal_audit_logs_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "withdrawal_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      withdrawal_queue: {
        Row: {
          amount: number | null
          fund_id: string | null
          fund_name: string | null
          id: string | null
          investor_id: string | null
          notes: string | null
          processed_at: string | null
          requested_at: string | null
          status: Database["public"]["Enums"]["withdrawal_status"] | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_withdrawal_requests_profile"
            columns: ["investor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_withdrawal_requests_profile"
            columns: ["investor_id"]
            isOneToOne: false
            referencedRelation: "profiles_display"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_withdrawal_requests_profile"
            columns: ["investor_id"]
            isOneToOne: false
            referencedRelation: "v_investor_kpis"
            referencedColumns: ["investor_id"]
          },
          {
            foreignKeyName: "withdrawal_requests_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "aum_position_reconciliation"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "withdrawal_requests_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "fund_aum_mismatch"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "withdrawal_requests_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "funds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "withdrawal_requests_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_aum_position_mismatch"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "withdrawal_requests_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_aum_snapshot_health"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "withdrawal_requests_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_crystallization_dashboard"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "withdrawal_requests_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_fund_aum_position_health"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "withdrawal_requests_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_fund_aum_position_status"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "withdrawal_requests_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_fund_summary_live"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "withdrawal_requests_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_liquidity_risk"
            referencedColumns: ["fund_id"]
          },
        ]
      }
      yield_distribution_conservation_check: {
        Row: {
          actual_deductions: number | null
          calculated_fees: number | null
          calculated_ib: number | null
          conservation_error: number | null
          distribution_id: string | null
          effective_date: string | null
          expected_deductions: number | null
          fund_code: string | null
          fund_id: string | null
          gross_yield: number | null
          net_to_investors: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_yield_distributions_fund_new"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "aum_position_reconciliation"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "fk_yield_distributions_fund_new"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "fund_aum_mismatch"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "fk_yield_distributions_fund_new"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "funds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_yield_distributions_fund_new"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_aum_position_mismatch"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "fk_yield_distributions_fund_new"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_aum_snapshot_health"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "fk_yield_distributions_fund_new"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_crystallization_dashboard"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "fk_yield_distributions_fund_new"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_fund_aum_position_health"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "fk_yield_distributions_fund_new"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_fund_aum_position_status"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "fk_yield_distributions_fund_new"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_fund_summary_live"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "fk_yield_distributions_fund_new"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_liquidity_risk"
            referencedColumns: ["fund_id"]
          },
        ]
      }
    }
    Functions: {
      _resolve_investor_fee_pct: {
        Args: { p_date: string; p_fund_id: string; p_investor_id: string }
        Returns: number
      }
      acquire_delivery_batch: {
        Args: {
          p_batch_size?: number
          p_channel?: string
          p_period_id: string
          p_worker_id?: string
        }
        Returns: {
          attempt_count: number
          id: string
          investor_id: string
          recipient_email: string
          statement_id: string
        }[]
      }
      acquire_position_lock: {
        Args: { p_fund_id: string; p_investor_id: string }
        Returns: undefined
      }
      acquire_withdrawal_lock: {
        Args: { p_request_id: string }
        Returns: undefined
      }
      acquire_yield_lock: {
        Args: { p_fund_id: string; p_yield_date: string }
        Returns: undefined
      }
      add_fund_to_investor: {
        Args: {
          p_cost_basis?: number
          p_fund_id: string
          p_initial_shares?: number
          p_investor_id: string
        }
        Returns: string
      }
      adjust_investor_position:
        | {
            Args: {
              p_admin_id?: string
              p_amount: number
              p_fund_id: string
              p_investor_id: string
              p_reason: string
              p_tx_date?: string
            }
            Returns: Json
          }
        | {
            Args: {
              p_admin_id?: string
              p_delta: number
              p_fund_id: string
              p_investor_id: string
              p_note?: string
              p_reference_id?: string
              p_tx_date?: string
              p_tx_type?: string
            }
            Returns: {
              new_balance: number
              old_balance: number
              transaction_id: string
            }[]
          }
      admin_create_transaction: {
        Args: {
          p_admin_id?: string
          p_amount: number
          p_fund_id: string
          p_investor_id: string
          p_notes?: string
          p_reference_id?: string
          p_tx_date: string
          p_type: string
        }
        Returns: string
      }
      admin_create_transactions_batch: {
        Args: { p_requests: Json }
        Returns: Json
      }
      apply_adb_yield_distribution: {
        Args: {
          p_admin_id: string
          p_dust_tolerance?: number
          p_fund_id: string
          p_gross_yield_amount: number
          p_period_end: string
          p_period_start: string
          p_purpose: string
        }
        Returns: Json
      }
      apply_adb_yield_distribution_v3: {
        Args: {
          p_admin_id?: string
          p_fund_id: string
          p_gross_yield_amount: number
          p_period_end: string
          p_period_start: string
          p_purpose?: Database["public"]["Enums"]["aum_purpose"]
        }
        Returns: Json
      }
      apply_daily_yield_to_fund_v3: {
        Args: {
          p_created_by?: string
          p_fund_id: string
          p_gross_yield_pct: number
          p_purpose?: Database["public"]["Enums"]["aum_purpose"]
          p_yield_date: string
        }
        Returns: Json
      }
      apply_daily_yield_with_validation: {
        Args: {
          p_created_by: string
          p_fund_id: string
          p_gross_yield_pct: number
          p_purpose?: string
          p_skip_validation?: boolean
          p_yield_date: string
        }
        Returns: Json
      }
      apply_deposit_with_crystallization: {
        Args: {
          p_admin_id: string
          p_amount: number
          p_closing_aum: number
          p_effective_date: string
          p_fund_id: string
          p_investor_id: string
          p_notes?: string
          p_purpose?: string
        }
        Returns: Json
      }
      apply_transaction_with_crystallization: {
        Args: {
          p_admin_id?: string
          p_amount: number
          p_distribution_id?: string
          p_fund_id: string
          p_investor_id: string
          p_new_total_aum?: number
          p_notes?: string
          p_purpose?: Database["public"]["Enums"]["aum_purpose"]
          p_reference_id: string
          p_tx_date: string
          p_tx_type: string
        }
        Returns: Json
      }
      apply_withdrawal_with_crystallization: {
        Args: {
          p_admin_id: string
          p_amount: number
          p_fund_id: string
          p_investor_id: string
          p_new_total_aum: number
          p_notes?: string
          p_purpose?: string
          p_tx_date: string
        }
        Returns: Json
      }
      apply_yield_correction_v2: {
        Args: {
          p_confirmation: string
          p_fund_id: string
          p_new_aum: number
          p_period_end: string
          p_period_start: string
          p_purpose: string
          p_reason: string
        }
        Returns: Json
      }
      approve_mfa_reset: {
        Args: { p_admin_id?: string; p_request_id: string }
        Returns: Json
      }
      approve_request: {
        Args: { p_approval_id: string; p_approver_id: string; p_notes?: string }
        Returns: Json
      }
      approve_staging_promotion: {
        Args: {
          p_approval_id: string
          p_approved_by: string
          p_closing_aum?: number
        }
        Returns: Json
      }
      approve_withdrawal: {
        Args: {
          p_admin_notes?: string
          p_approved_amount?: number
          p_request_id: string
        }
        Returns: boolean
      }
      assert_integrity_or_raise: {
        Args: {
          p_context?: string
          p_scope_fund_id?: string
          p_scope_investor_id?: string
        }
        Returns: undefined
      }
      backfill_balance_chain_fix: {
        Args: { p_fund_id: string; p_investor_id: string }
        Returns: Json
      }
      batch_crystallize_fund:
        | {
            Args: {
              p_admin_id?: string
              p_dry_run?: boolean
              p_fund_id: string
              p_new_total_aum?: number
              p_target_date?: string
            }
            Returns: Json
          }
        | {
            Args: {
              p_admin_id?: string
              p_dry_run?: boolean
              p_force_override?: boolean
              p_fund_id: string
              p_new_total_aum?: number
              p_target_date?: string
            }
            Returns: Json
          }
      batch_initialize_fund_aum: {
        Args: { p_admin_id?: string; p_dry_run?: boolean }
        Returns: Json
      }
      batch_reconcile_all_positions: { Args: never; Returns: Json }
      build_error_response: {
        Args: { p_details?: Json; p_error_code: string }
        Returns: Json
      }
      build_success_response: {
        Args: { p_data?: Json; p_message?: string }
        Returns: Json
      }
      calc_avg_daily_balance: {
        Args: {
          p_fund_id: string
          p_investor_id: string
          p_period_end: string
          p_period_start: string
        }
        Returns: number
      }
      calc_avg_daily_balance_optimized: {
        Args: {
          p_fund_id: string
          p_investor_id: string
          p_period_end: string
          p_period_start: string
        }
        Returns: number
      }
      calculate_position_at_date_fix: {
        Args: { p_as_of_date: string; p_fund_id: string; p_investor_id: string }
        Returns: number
      }
      calculate_reconciliation_tolerance: {
        Args: { p_aum: number; p_tier?: string }
        Returns: number
      }
      can_access_investor: { Args: { investor_uuid: string }; Returns: boolean }
      can_access_notification: {
        Args: { notification_id: string }
        Returns: boolean
      }
      can_execute_mfa_reset: { Args: { p_user_id?: string }; Returns: Json }
      can_insert_notification: { Args: never; Returns: boolean }
      can_withdraw: {
        Args: { p_amount: number; p_fund_id: string; p_investor_id: string }
        Returns: Json
      }
      cancel_delivery: { Args: { p_delivery_id: string }; Returns: Json }
      cancel_withdrawal_by_admin: {
        Args: { p_admin_notes?: string; p_reason: string; p_request_id: string }
        Returns: boolean
      }
      cancel_withdrawal_by_investor: {
        Args: { p_investor_id: string; p_reason?: string; p_request_id: string }
        Returns: Json
      }
      check_all_funds_transaction_aum: {
        Args: { p_tx_date: string }
        Returns: {
          fund_code: string
          fund_id: string
          has_reporting_aum: boolean
          has_transaction_aum: boolean
          reporting_aum: number
          transaction_aum: number
        }[]
      }
      check_and_fix_aum_integrity: {
        Args: {
          p_dry_run?: boolean
          p_end_date?: string
          p_fund_id?: string
          p_start_date?: string
        }
        Returns: Json
      }
      check_approval_integrity: {
        Args: never
        Returns: {
          check_name: string
          details: Json
          status: string
          violation_count: number
        }[]
      }
      check_aum_exists_for_date: {
        Args: { p_date: string; p_fund_id: string }
        Returns: boolean
      }
      check_aum_position_health: {
        Args: never
        Returns: {
          asset: string
          fund_name: string
          health_status: string
          latest_aum: number
          position_sum: number
          variance: number
        }[]
      }
      check_aum_reconciliation: {
        Args: { p_fund_id: string; p_tolerance_pct?: number }
        Returns: Json
      }
      check_duplicate_transaction_refs: { Args: never; Returns: number }
      check_is_admin: { Args: { user_id: string }; Returns: boolean }
      check_platform_data_integrity: { Args: never; Returns: Json }
      check_rate_limit: {
        Args: {
          p_action_type: string
          p_actor_id: string
          p_max_actions?: number
          p_window_minutes?: number
        }
        Returns: boolean
      }
      check_rate_limit_with_config: {
        Args: { p_action_type: string; p_actor_id: string }
        Returns: boolean
      }
      check_transaction_sources: {
        Args: never
        Returns: {
          assessment: string
          sample_ids: string[]
          source: Database["public"]["Enums"]["tx_source"]
          tx_count: number
        }[]
      }
      cleanup_dormant_positions: {
        Args: { p_dry_run?: boolean }
        Returns: Json
      }
      cleanup_duplicate_preflow_aum: { Args: never; Returns: Json }
      cleanup_expired_approvals: { Args: never; Returns: Json }
      cleanup_test_profiles: {
        Args: never
        Returns: {
          deleted_email: string
          deleted_profile_id: string
          reason: string
        }[]
      }
      complete_withdrawal: {
        Args: {
          p_admin_notes?: string
          p_closing_aum: number
          p_event_ts?: string
          p_request_id: string
          p_transaction_hash?: string
        }
        Returns: boolean
      }
      compute_correction_input_hash: {
        Args: {
          p_fund_id: string
          p_new_aum: number
          p_period_end: string
          p_period_start: string
          p_purpose: string
        }
        Returns: string
      }
      compute_jsonb_delta: { Args: { p_new: Json; p_old: Json }; Returns: Json }
      compute_position_from_ledger: {
        Args: { p_as_of?: string; p_fund_id: string; p_investor_id: string }
        Returns: Json
      }
      compute_profile_role: {
        Args: {
          p_account_type: Database["public"]["Enums"]["account_type"]
          p_is_admin: boolean
          p_user_id: string
        }
        Returns: string
      }
      create_admin_invite: { Args: { p_email: string }; Returns: string }
      create_daily_position_snapshot: {
        Args: { p_fund_id?: string; p_snapshot_date?: string }
        Returns: Json
      }
      create_integrity_alert: {
        Args: {
          p_alert_type: string
          p_message: string
          p_metadata?: Json
          p_severity: string
          p_title: string
        }
        Returns: string
      }
      create_withdrawal_request: {
        Args: {
          p_amount: number
          p_fund_id: string
          p_investor_id: string
          p_notes?: string
          p_type?: string
        }
        Returns: string
      }
      crystallize_month_end: {
        Args: {
          p_admin_id: string
          p_closing_aum: number
          p_fund_id: string
          p_month_end_date: string
        }
        Returns: Json
      }
      crystallize_yield_before_flow: {
        Args: {
          p_admin_id: string
          p_closing_aum: number
          p_event_ts: string
          p_fund_id: string
          p_purpose?: Database["public"]["Enums"]["aum_purpose"]
          p_trigger_reference: string
          p_trigger_type: string
        }
        Returns: Json
      }
      current_user_is_admin_or_owner: {
        Args: { check_user_id: string }
        Returns: boolean
      }
      decrypt_totp_secret: {
        Args: { encrypted_secret: string }
        Returns: string
      }
      delete_transaction: {
        Args: { p_confirmation: string; p_transaction_id: string }
        Returns: Json
      }
      delete_withdrawal: {
        Args: {
          p_hard_delete?: boolean
          p_reason: string
          p_withdrawal_id: string
        }
        Returns: Json
      }
      dispatch_report_delivery_run: {
        Args: { p_channel?: string; p_period_id: string }
        Returns: Json
      }
      edit_transaction: {
        Args: {
          p_notes?: string
          p_reference_id?: string
          p_transaction_id: string
          p_tx_date?: string
          p_tx_hash?: string
        }
        Returns: Json
      }
      encrypt_totp_secret: { Args: { secret_text: string }; Returns: string }
      ensure_admin: { Args: never; Returns: undefined }
      ensure_preflow_aum: {
        Args: {
          p_admin_id: string
          p_date: string
          p_fund_id: string
          p_purpose: Database["public"]["Enums"]["aum_purpose"]
          p_total_aum: number
        }
        Returns: Json
      }
      export_investor_data: { Args: { p_user_id: string }; Returns: Json }
      finalize_month_yield: {
        Args: {
          p_admin_id: string
          p_fund_id: string
          p_period_month: number
          p_period_year: number
        }
        Returns: Json
      }
      finalize_reconciliation_pack: {
        Args: { p_admin_id: string; p_pack_id: string }
        Returns: Json
      }
      finalize_statement_period: {
        Args: { p_admin_id: string; p_period_id: string }
        Returns: undefined
      }
      fix_cost_basis_anomalies: {
        Args: { p_admin_id: string; p_dry_run?: boolean; p_reason?: string }
        Returns: Json
      }
      fix_doubled_cost_basis: { Args: never; Returns: Json }
      fix_position_metadata: { Args: never; Returns: Json }
      force_delete_investor:
        | { Args: { p_investor_id: string }; Returns: Json }
        | {
            Args: { p_admin_id: string; p_investor_id: string }
            Returns: boolean
          }
      fund_period_return: {
        Args: { d1: string; d2: string; f: string; net?: boolean }
        Returns: number
      }
      generate_document_path: {
        Args: { document_type: string; filename: string; user_id: string }
        Returns: string
      }
      generate_reconciliation_pack: {
        Args: {
          p_admin_id: string
          p_fund_id: string
          p_period_end: string
          p_period_start: string
        }
        Returns: Json
      }
      generate_staging_preview_report: {
        Args: { p_batch_id: string }
        Returns: Json
      }
      generate_statement_path: {
        Args: {
          fund_code?: string
          month: number
          user_id: string
          year: number
        }
        Returns: string
      }
      get_admin_name: { Args: { admin_id: string }; Returns: string }
      get_all_dust_tolerances: { Args: never; Returns: Json }
      get_approval_threshold: { Args: { p_operation: string }; Returns: number }
      get_aum_position_reconciliation: {
        Args: { p_date?: string }
        Returns: {
          calculated_position_sum: number
          discrepancy: number
          fund_code: string
          fund_id: string
          fund_name: string
          has_discrepancy: boolean
          reconciliation_date: string
          recorded_aum: number
        }[]
      }
      get_available_balance: {
        Args: { p_fund_id: string; p_investor_id: string }
        Returns: number
      }
      get_delivery_stats: { Args: { p_period_id: string }; Returns: Json }
      get_dust_tolerance_for_fund: {
        Args: { p_fund_id: string }
        Returns: number
      }
      get_existing_preflow_aum: {
        Args: {
          p_event_date: string
          p_fund_id: string
          p_purpose: Database["public"]["Enums"]["aum_purpose"]
        }
        Returns: {
          aum_event_id: string
          closing_aum: number
          event_ts: string
        }[]
      }
      get_fund_aum_as_of: {
        Args: {
          p_as_of_date: string
          p_fund_id: string
          p_purpose?: Database["public"]["Enums"]["aum_purpose"]
        }
        Returns: {
          as_of_date: string
          aum_source: string
          aum_value: number
          event_id: string
          fund_code: string
          fund_id: string
          purpose: Database["public"]["Enums"]["aum_purpose"]
        }[]
      }
      get_fund_base_asset: { Args: { p_fund_id: string }; Returns: string }
      get_fund_composition: {
        Args: { p_date: string; p_fund_id: string }
        Returns: {
          balance: number
          email: string
          investor_name: string
          ownership_pct: number
        }[]
      }
      get_fund_nav_history: {
        Args: { p_end_date: string; p_fund_id: string; p_start_date: string }
        Returns: {
          aum: number
          gross_return_pct: number
          nav_date: string
          nav_per_share: number
          net_return_pct: number
        }[]
      }
      get_fund_net_flows: {
        Args: { p_end_date: string; p_fund_id: string; p_start_date: string }
        Returns: {
          inflows: number
          net_flow: number
          outflows: number
          period_date: string
        }[]
      }
      get_fund_summary: {
        Args: never
        Returns: {
          active_investor_count: number
          asset: string
          created_at: string
          fund_code: string
          fund_id: string
          fund_name: string
          investor_count: number
          last_yield_date: string
          status: string
          total_aum: number
          total_deposits: number
          total_fees_collected: number
          total_withdrawals: number
          total_yield_distributed: number
        }[]
      }
      get_funds_with_aum: {
        Args: never
        Returns: {
          asset: string
          fund_class: string
          fund_code: string
          fund_id: string
          fund_name: string
          investor_count: number
          status: string
          total_aum: number
        }[]
      }
      get_health_trend: {
        Args: { p_days?: number }
        Returns: {
          avg_anomalies: number
          max_anomalies: number
          snapshot_count: number
          snapshot_date: string
        }[]
      }
      get_historical_nav: {
        Args: { target_date: string }
        Returns: {
          out_asset_code: string
          out_aum: number
          out_daily_inflows: number
          out_daily_outflows: number
          out_fund_id: string
          out_fund_name: string
          out_net_flow_24h: number
        }[]
      }
      get_ib_parent_candidates: {
        Args: { p_exclude_id: string }
        Returns: {
          email_masked: string
          first_name: string
          id: string
          last_name: string
        }[]
      }
      get_ib_referral_count: { Args: { p_ib_id: string }; Returns: number }
      get_ib_referral_detail: {
        Args: { p_ib_id: string; p_referral_id: string }
        Returns: {
          created_at: string
          email_masked: string
          first_name: string
          ib_parent_id: string
          id: string
          last_name: string
          status: string
        }[]
      }
      get_ib_referrals: {
        Args: { p_ib_id: string; p_limit?: number; p_offset?: number }
        Returns: {
          created_at: string
          email_masked: string
          first_name: string
          ib_percentage: number
          id: string
          last_name: string
          status: string
        }[]
      }
      get_investor_fee_pct: {
        Args: {
          p_effective_date: string
          p_fund_id: string
          p_investor_id: string
        }
        Returns: number
      }
      get_investor_ib_pct: {
        Args: { p_fund_id: string; p_investor_id: string }
        Returns: number
      }
      get_investor_remaining_loss: {
        Args: { p_fund_id: string; p_investor_id: string }
        Returns: number
      }
      get_kpi_metrics:
        | { Args: { metric_type: string; user_id: string }; Returns: Json }
        | { Args: { p_date_range?: string }; Returns: Json }
      get_latest_health_status: {
        Args: never
        Returns: {
          details: Json
          snapshot_at: string
          snapshot_id: string
          status: string
          total_anomalies: number
        }[]
      }
      get_monthly_platform_aum: {
        Args: never
        Returns: {
          month: string
          total_aum: number
        }[]
      }
      get_pending_approval: {
        Args: {
          p_action_type: string
          p_entity_id: string
          p_entity_type: string
        }
        Returns: {
          approval_id: string
          expires_at: string
          metadata: Json
          requested_at: string
          requested_by: string
        }[]
      }
      get_position_reconciliation: {
        Args: { p_as_of_date?: string; p_fund_id?: string }
        Returns: {
          out_difference: number
          out_fund_id: string
          out_fund_name: string
          out_investor_id: string
          out_investor_name: string
          out_is_matched: boolean
          out_ledger_balance: number
          out_position_balance: number
        }[]
      }
      get_report_statistics: {
        Args: { p_period_end: string; p_period_start: string }
        Returns: {
          avg_processing_time_ms: number
          failure_count: number
          last_generated_at: string
          report_type: string
          success_count: number
          total_downloads: number
          total_generated: number
        }[]
      }
      get_reporting_eligible_investors: {
        Args: { p_period_id: string }
        Returns: {
          eligibility_reason: string
          email: string
          investor_id: string
          investor_name: string
          is_eligible: boolean
        }[]
      }
      get_schema_dump: { Args: never; Returns: Json }
      get_statement_period_summary: {
        Args: { p_period_id: string }
        Returns: {
          statements_generated: number
          statements_pending: number
          statements_sent: number
          total_funds: number
          total_investors: number
        }[]
      }
      get_statement_signed_url: {
        Args: { p_expires_in?: number; p_storage_path: string }
        Returns: string
      }
      get_system_mode: { Args: never; Returns: string }
      get_transaction_aum: {
        Args: {
          p_fund_id: string
          p_purpose?: Database["public"]["Enums"]["aum_purpose"]
          p_tx_date: string
        }
        Returns: number
      }
      get_user_admin_status: { Args: { user_id: string }; Returns: boolean }
      get_user_reports: {
        Args: { p_limit?: number; p_user_id: string }
        Returns: {
          created_at: string
          id: string
          report_month: string
          report_name: string
          report_type: string
          status: string
        }[]
      }
      get_void_aum_impact: { Args: { p_record_id: string }; Returns: Json }
      get_void_transaction_impact: {
        Args: { p_transaction_id: string }
        Returns: Json
      }
      get_void_yield_impact: {
        Args: { p_distribution_id: string }
        Returns: Json
      }
      get_yield_corrections: {
        Args: { p_date_from?: string; p_date_to?: string; p_fund_id?: string }
        Returns: {
          applied_at: string
          applied_by_name: string
          correction_id: string
          delta_aum: number
          effective_date: string
          fund_asset: string
          fund_id: string
          fund_name: string
          investors_affected: number
          new_aum: number
          old_aum: number
          purpose: string
          reason: string
          status: string
          total_fee_delta: number
          total_ib_delta: number
        }[]
      }
      has_finalized_recon_pack: {
        Args: {
          p_fund_id: string
          p_period_end: string
          p_period_start: string
        }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      has_super_admin_role: { Args: { p_user_id: string }; Returns: boolean }
      has_valid_approval: {
        Args: {
          p_action_type: string
          p_entity_id: string
          p_entity_type: string
        }
        Returns: boolean
      }
      initialize_all_hwm_values: {
        Args: never
        Returns: {
          positions_affected: Json
          updated_count: number
        }[]
      }
      initialize_crystallization_dates: {
        Args: { p_admin_id?: string; p_dry_run?: boolean; p_fund_id?: string }
        Returns: Json
      }
      initialize_fund_aum_from_positions: {
        Args: { p_admin_id?: string; p_aum_date?: string; p_fund_id: string }
        Returns: Json
      }
      initialize_null_crystallization_dates: {
        Args: never
        Returns: {
          fund_id: string
          investor_id: string
          new_crystallization_date: string
        }[]
      }
      insert_yield_transaction: {
        Args: {
          p_admin_id: string
          p_amount: number
          p_fund_code: string
          p_investor_name: string
          p_month: string
          p_tx_date: string
        }
        Returns: boolean
      }
      internal_route_to_fees: {
        Args: {
          p_admin_id: string
          p_amount: number
          p_effective_date: string
          p_from_investor_id: string
          p_fund_id: string
          p_reason: string
          p_transfer_id?: string
        }
        Returns: {
          credit_tx_id: string
          debit_tx_id: string
          message: string
          success: boolean
          transfer_id: string
        }[]
      }
      is_2fa_required: { Args: { p_user_id: string }; Returns: boolean }
      is_admin: { Args: never; Returns: boolean }
      is_admin_for_jwt: { Args: never; Returns: boolean }
      is_admin_safe: { Args: never; Returns: boolean }
      is_canonical_rpc: { Args: never; Returns: boolean }
      is_crystallization_current: {
        Args: {
          p_fund_id: string
          p_investor_id: string
          p_target_date?: string
        }
        Returns: Json
      }
      is_import_enabled: { Args: never; Returns: boolean }
      is_period_locked: {
        Args: { p_date: string; p_fund_id: string }
        Returns: boolean
      }
      is_super_admin:
        | { Args: never; Returns: boolean }
        | { Args: { p_user_id: string }; Returns: boolean }
      is_valid_share_token: { Args: { token_value: string }; Returns: boolean }
      is_within_edit_window: {
        Args: { p_created_at: string }
        Returns: boolean
      }
      is_yield_period_closed: {
        Args: {
          p_fund_id: string
          p_month: number
          p_purpose: Database["public"]["Enums"]["aum_purpose"]
          p_year: number
        }
        Returns: boolean
      }
      list_pending_staging_approvals: {
        Args: never
        Returns: {
          approval_id: string
          batch_id: string
          batch_summary: Json
          reason: string
          requested_at: string
          requested_by: string
          requester_email: string
        }[]
      }
      lock_accounting_period: {
        Args: {
          p_admin_id: string
          p_fund_id: string
          p_notes?: string
          p_period_end: string
          p_period_start: string
        }
        Returns: Json
      }
      lock_imports: { Args: { p_reason?: string }; Returns: string }
      lock_period_with_approval: {
        Args: {
          p_admin_id: string
          p_fund_id: string
          p_notes?: string
          p_period_end: string
          p_period_start: string
        }
        Returns: Json
      }
      log_access_event: {
        Args: {
          p_event: string
          p_failure_reason?: string
          p_ip_address?: unknown
          p_metadata?: Json
          p_success?: boolean
          p_user_agent?: string
          p_user_id: string
        }
        Returns: string
      }
      log_audit_event: {
        Args: {
          p_action: string
          p_entity: string
          p_entity_id?: string
          p_meta?: Json
          p_new_values?: Json
          p_old_values?: Json
        }
        Returns: string
      }
      log_financial_operation: {
        Args: {
          p_action: string
          p_entity: string
          p_entity_id: string
          p_meta?: Json
          p_new_values?: Json
          p_old_values?: Json
        }
        Returns: string
      }
      log_ledger_mismatches: {
        Args: never
        Returns: {
          logged: boolean
          mismatch_count: number
        }[]
      }
      log_security_event: {
        Args: {
          p_details?: Json
          p_event_type: string
          p_severity: string
          p_user_id?: string
        }
        Returns: string
      }
      log_withdrawal_action: {
        Args: {
          p_action: Database["public"]["Enums"]["withdrawal_action"]
          p_details?: Json
          p_request_id: string
        }
        Returns: undefined
      }
      mark_delivery_result: {
        Args: {
          p_delivery_id: string
          p_error_code?: string
          p_error_message?: string
          p_provider_message_id?: string
          p_success: boolean
        }
        Returns: Json
      }
      mark_mfa_reset_executed: { Args: { p_request_id: string }; Returns: Json }
      mark_sent_manually: {
        Args: { p_delivery_id: string; p_note?: string }
        Returns: Json
      }
      merge_duplicate_profiles: {
        Args: {
          p_admin_id?: string
          p_keep_profile_id: string
          p_merge_profile_id: string
        }
        Returns: Json
      }
      nightly_aum_reconciliation: { Args: never; Returns: Json }
      offset_losses_with_gain: {
        Args: {
          p_distribution_id?: string
          p_fund_id: string
          p_gross_gain: number
          p_investor_id: string
        }
        Returns: {
          loss_offset: number
          remaining_carryforward: number
          taxable_gain: number
        }[]
      }
      parse_platform_error: { Args: { p_error_message: string }; Returns: Json }
      populate_daily_balances: {
        Args: { p_end_date: string; p_fund_id: string; p_start_date: string }
        Returns: Json
      }
      populate_investor_fund_performance: {
        Args: { p_investor_id?: string }
        Returns: number
      }
      preview_adb_yield_distribution_v3: {
        Args: {
          p_fund_id: string
          p_gross_yield_amount: number
          p_period_end: string
          p_period_start: string
          p_purpose?: string
        }
        Returns: Json
      }
      preview_crystallization: {
        Args: {
          p_fund_id: string
          p_investor_id: string
          p_new_total_aum?: number
          p_target_date?: string
        }
        Returns: Json
      }
      preview_daily_yield_to_fund_v3: {
        Args: {
          p_fund_id: string
          p_new_aum: number
          p_purpose?: string
          p_yield_date: string
        }
        Returns: Json
      }
      preview_merge_duplicate_profiles: {
        Args: { p_keep_profile_id: string; p_merge_profile_id: string }
        Returns: Json
      }
      preview_yield_correction_v2: {
        Args: {
          p_fund_id: string
          p_new_aum: number
          p_period_end: string
          p_period_start: string
          p_purpose: string
        }
        Returns: Json
      }
      process_excel_import_with_classes: {
        Args: { p_data: Json; p_import_type?: string }
        Returns: Json
      }
      process_yield_distribution: {
        Args: {
          p_admin_id?: string
          p_date: string
          p_fund_id: string
          p_gross_amount: number
        }
        Returns: {
          fee_amount: number
          gross_amount: number
          investor_id: string
          net_amount: number
        }[]
      }
      process_yield_distribution_with_dust: {
        Args: {
          p_admin_id?: string
          p_date: string
          p_fund_id: string
          p_gross_amount: number
        }
        Returns: {
          dust_allocated: number
          fee_amount: number
          gross_amount: number
          investor_id: string
          net_amount: number
        }[]
      }
      promote_staging_batch: {
        Args: { p_admin_id: string; p_batch_id: string; p_closing_aum: number }
        Returns: Json
      }
      queue_statement_deliveries: {
        Args: {
          p_channel?: string
          p_fund_id?: string
          p_investor_ids?: string[]
          p_period_id: string
        }
        Returns: Json
      }
      raise_platform_error: {
        Args: { p_details?: Json; p_error_code: string }
        Returns: undefined
      }
      rebuild_investor_period_balances: {
        Args: {
          p_fund_id: string
          p_period_end: string
          p_period_start: string
          p_purpose: Database["public"]["Enums"]["aum_purpose"]
        }
        Returns: {
          additions: number
          avg_capital: number
          beginning_balance: number
          days_in_period: number
          days_invested: number
          email: string
          ending_balance: number
          fee_pct: number
          ib_parent_id: string
          ib_percentage: number
          investor_id: string
          investor_name: string
          redemptions: number
        }[]
      }
      rebuild_position_from_ledger: {
        Args: {
          p_admin_id: string
          p_dry_run?: boolean
          p_fund_id: string
          p_investor_id: string
          p_reason: string
        }
        Returns: Json
      }
      recalc_daily_balance: {
        Args: {
          p_balance_date: string
          p_fund_id: string
          p_investor_id: string
        }
        Returns: number
      }
      recalculate_all_aum: { Args: never; Returns: Json }
      recalculate_fund_aum_for_date: {
        Args: {
          p_actor_id?: string
          p_date: string
          p_fund_id: string
          p_purpose?: Database["public"]["Enums"]["aum_purpose"]
        }
        Returns: Json
      }
      recompute_investor_position: {
        Args: { p_fund_id: string; p_investor_id: string }
        Returns: undefined
      }
      recompute_investor_positions_for_investor: {
        Args: { p_investor_id: string }
        Returns: undefined
      }
      reconcile_all_positions: {
        Args: { p_dry_run?: boolean }
        Returns: {
          action: string
          fund_id: string
          fund_name: string
          investor_id: string
          investor_name: string
          new_shares: number
          new_value: number
          old_shares: number
          old_value: number
        }[]
      }
      reconcile_fund_aum_with_positions: {
        Args: never
        Returns: {
          out_difference: number
          out_fund_code: string
          out_fund_id: string
          out_new_aum: number
          out_old_aum: number
        }[]
      }
      reconcile_fund_period: {
        Args: { p_end_date: string; p_fund_id: string; p_start_date: string }
        Returns: {
          actual: number
          difference: number
          expected: number
          metric: string
          status: string
        }[]
      }
      reconcile_investor_position: {
        Args: {
          p_action?: string
          p_admin_id: string
          p_fund_id: string
          p_investor_id: string
        }
        Returns: Json
      }
      reconcile_investor_position_internal: {
        Args: { p_fund_id: string; p_investor_id: string }
        Returns: undefined
      }
      record_investor_loss: {
        Args: {
          p_distribution_id?: string
          p_fund_id: string
          p_investor_id: string
          p_loss_amount: number
          p_period_end: string
        }
        Returns: string
      }
      refresh_materialized_view_concurrently: {
        Args: { view_name: string }
        Returns: undefined
      }
      refresh_yield_materialized_views: { Args: never; Returns: Json }
      regenerate_reports_for_correction: {
        Args: { p_correction_id: string }
        Returns: Json
      }
      reject_mfa_reset: {
        Args: { p_admin_id?: string; p_reason: string; p_request_id: string }
        Returns: Json
      }
      reject_request: {
        Args: {
          p_approval_id: string
          p_rejection_reason: string
          p_rejector_id: string
        }
        Returns: Json
      }
      reject_staging_promotion: {
        Args: { p_approval_id: string; p_reason: string; p_rejected_by: string }
        Returns: Json
      }
      reject_withdrawal: {
        Args: { p_admin_notes?: string; p_reason: string; p_request_id: string }
        Returns: boolean
      }
      reopen_yield_period: {
        Args: {
          p_fund_id: string
          p_month: number
          p_purpose: Database["public"]["Enums"]["aum_purpose"]
          p_reason: string
          p_year: number
        }
        Returns: Json
      }
      repair_all_positions: { Args: never; Returns: Json }
      replace_aum_snapshot: {
        Args: {
          p_admin_id?: string
          p_aum_date: string
          p_fund_id: string
          p_new_total_aum: number
          p_purpose?: Database["public"]["Enums"]["aum_purpose"]
          p_reason?: string
        }
        Returns: Json
      }
      request_approval: {
        Args: {
          p_action_type: string
          p_amount?: number
          p_entity_id: string
          p_entity_type: string
          p_expiry_hours?: number
          p_metadata?: Json
          p_reason: string
          p_requester_id: string
        }
        Returns: Json
      }
      request_mfa_reset: {
        Args: { p_ip?: unknown; p_reason: string; p_user_agent?: string }
        Returns: Json
      }
      request_staging_promotion_approval: {
        Args: { p_batch_id: string; p_reason?: string; p_requested_by: string }
        Returns: Json
      }
      requeue_stale_sending: {
        Args: { p_minutes?: number; p_period_id: string }
        Returns: Json
      }
      require_admin: { Args: { p_operation?: string }; Returns: undefined }
      require_super_admin:
        | { Args: never; Returns: string }
        | { Args: { p_operation: string }; Returns: undefined }
        | {
            Args: { p_actor_id: string; p_operation: string }
            Returns: undefined
          }
      requires_dual_approval: {
        Args: { p_amount?: number; p_operation: string }
        Returns: boolean
      }
      reset_all_data_keep_profiles: {
        Args: { p_admin_id: string; p_confirmation_code: string }
        Returns: Json
      }
      reset_all_investor_positions: {
        Args: { p_admin_id: string; p_confirmation_code: string }
        Returns: Json
      }
      retry_delivery: { Args: { p_delivery_id: string }; Returns: Json }
      rollback_yield_correction: {
        Args: { p_correction_id: string; p_reason: string }
        Returns: Json
      }
      route_withdrawal_to_fees:
        | {
            Args: {
              p_actor_id: string
              p_reason?: string
              p_request_id: string
            }
            Returns: boolean
          }
        | {
            Args: { p_reason?: string; p_request_id: string }
            Returns: boolean
          }
      run_comprehensive_health_check: {
        Args: never
        Returns: {
          check_name: string
          check_status: string
          details: Json
          violation_count: number
        }[]
      }
      run_daily_health_check: {
        Args: never
        Returns: {
          check_name: string
          details: Json
          status: string
          violation_count: number
        }[]
      }
      run_integrity_check: {
        Args: { p_scope_fund_id?: string; p_scope_investor_id?: string }
        Returns: Json
      }
      run_integrity_pack: { Args: never; Returns: Json }
      send_daily_rate_notifications: {
        Args: { p_rate_date: string }
        Returns: number
      }
      set_canonical_rpc: { Args: { enabled?: boolean }; Returns: undefined }
      set_fund_daily_aum: {
        Args: {
          p_aum_date: string
          p_fund_id: string
          p_purpose?: string
          p_skip_validation?: boolean
          p_source?: string
          p_total_aum: number
        }
        Returns: Json
      }
      start_processing_withdrawal: {
        Args: {
          p_admin_notes?: string
          p_processed_amount?: number
          p_request_id: string
          p_settlement_date?: string
          p_tx_hash?: string
        }
        Returns: boolean
      }
      sync_all_fund_aum: { Args: { p_target_date?: string }; Returns: Json }
      sync_aum_to_positions: {
        Args: {
          p_admin_id?: string
          p_aum_date?: string
          p_fund_id: string
          p_purpose?: Database["public"]["Enums"]["aum_purpose"]
          p_reason?: string
        }
        Returns: Json
      }
      system_health_check: { Args: never; Returns: Json }
      test_apply_daily_yield_v3: {
        Args: {
          p_actor_id: string
          p_fund_id: string
          p_gross_yield_pct: number
          p_yield_date: string
        }
        Returns: Json
      }
      test_apply_yield_distribution: {
        Args: {
          p_actor_id: string
          p_fund_id: string
          p_gross_yield_pct: number
          p_yield_date: string
        }
        Returns: Json
      }
      test_profiles_access: {
        Args: never
        Returns: {
          details: string
          result: boolean
          test_name: string
        }[]
      }
      unlock_imports: { Args: never; Returns: boolean }
      update_admin_role: {
        Args: { p_new_role: string; p_target_user_id: string }
        Returns: Json
      }
      update_dust_tolerance: {
        Args: { p_admin_id: string; p_asset: string; p_tolerance: number }
        Returns: Json
      }
      update_fund_aum_baseline: {
        Args: { p_fund_id: string; p_new_baseline: number }
        Returns: boolean
      }
      update_fund_daily_aum: {
        Args: {
          p_admin_id: string
          p_new_total_aum: number
          p_reason: string
          p_record_id: string
        }
        Returns: Json
      }
      update_fund_daily_aum_with_recalc: {
        Args: {
          p_admin_id: string
          p_new_total_aum: number
          p_reason: string
          p_record_id: string
        }
        Returns: Json
      }
      update_investor_aum_percentages: {
        Args: { p_fund_id: string }
        Returns: number
      }
      update_transaction: {
        Args: { p_reason: string; p_transaction_id: string; p_updates: Json }
        Returns: Json
      }
      update_user_profile_secure: {
        Args: {
          p_first_name?: string
          p_last_name?: string
          p_phone?: string
          p_status?: string
          p_user_id: string
        }
        Returns: boolean
      }
      update_withdrawal: {
        Args: {
          p_notes?: string
          p_reason?: string
          p_requested_amount?: number
          p_withdrawal_id: string
          p_withdrawal_type?: string
        }
        Returns: Json
      }
      upsert_fund_aum_after_yield:
        | {
            Args: {
              p_aum_date: string
              p_fund_id: string
              p_source?: string
              p_total_aum: number
            }
            Returns: undefined
          }
        | {
            Args: {
              p_actor_id: string
              p_aum_date: string
              p_fund_id: string
              p_purpose: Database["public"]["Enums"]["aum_purpose"]
              p_yield_amount: number
            }
            Returns: Json
          }
      use_invite_code: {
        Args: { p_invite_code: string; p_user_id: string }
        Returns: boolean
      }
      validate_aum_against_positions: {
        Args: {
          p_aum_value: number
          p_context?: string
          p_fund_id: string
          p_max_deviation_pct?: number
        }
        Returns: Json
      }
      validate_aum_matches_positions: {
        Args: {
          p_aum_date?: string
          p_fund_id: string
          p_purpose?: Database["public"]["Enums"]["aum_purpose"]
          p_tolerance_pct?: number
        }
        Returns: Json
      }
      validate_aum_matches_positions_strict: {
        Args: {
          p_aum_date?: string
          p_fund_id: string
          p_purpose?: Database["public"]["Enums"]["aum_purpose"]
        }
        Returns: Json
      }
      validate_invite_code: {
        Args: { p_invite_code: string }
        Returns: {
          email: string
          expires_at: string
          id: string
          used: boolean
        }[]
      }
      validate_pre_yield_aum: {
        Args: { p_fund_id: string; p_tolerance_percentage?: number }
        Returns: Json
      }
      validate_staging_batch: { Args: { p_batch_id: string }; Returns: Json }
      validate_staging_row: { Args: { p_staging_id: string }; Returns: Json }
      validate_transaction_aum_exists: {
        Args: {
          p_fund_id: string
          p_purpose?: Database["public"]["Enums"]["aum_purpose"]
          p_tx_date: string
        }
        Returns: boolean
      }
      validate_withdrawal_transition: {
        Args: { p_current_status: string; p_new_status: string }
        Returns: boolean
      }
      validate_yield_distribution_prerequisites: {
        Args: {
          p_admin_id?: string
          p_aum_tolerance_pct?: number
          p_auto_sync?: boolean
          p_fund_id: string
          p_gross_yield_pct: number
          p_purpose?: string
          p_yield_date: string
        }
        Returns: Json
      }
      validate_yield_parameters: {
        Args: {
          p_fund_id: string
          p_gross_yield_pct: number
          p_purpose: string
          p_yield_date: string
        }
        Returns: Json
      }
      validate_yield_rate_sanity: {
        Args: { p_fund_id: string; p_gross_yield_pct: number }
        Returns: undefined
      }
      validate_yield_temporal_lock: {
        Args: { p_fund_id: string; p_purpose: string; p_yield_date: string }
        Returns: Json
      }
      verify_aum_purpose_usage: {
        Args: never
        Returns: {
          details: Json
          issue_type: string
          record_id: string
          table_name: string
        }[]
      }
      verify_yield_calculation_integrity: {
        Args: never
        Returns: {
          details: Json
          status: string
          test_name: string
        }[]
      }
      verify_yield_distribution_balance: {
        Args: { p_date: string; p_fund_id: string; p_purpose?: string }
        Returns: {
          actual: number
          check_name: string
          difference: number
          expected: number
          status: string
        }[]
      }
      void_and_reissue_transaction: {
        Args: {
          p_admin_id: string
          p_closing_aum: number
          p_new_amount: number
          p_new_date: string
          p_new_notes: string
          p_original_tx_id: string
          p_reason: string
        }
        Returns: Json
      }
      void_fund_daily_aum: {
        Args: { p_admin_id: string; p_reason: string; p_record_id: string }
        Returns: Json
      }
      void_investor_yield_events_for_distribution: {
        Args: {
          p_admin_id: string
          p_distribution_id: string
          p_reason?: string
        }
        Returns: number
      }
      void_transaction: {
        Args: { p_admin_id: string; p_reason: string; p_transaction_id: string }
        Returns: Json
      }
      void_transaction_with_approval: {
        Args: { p_admin_id: string; p_reason: string; p_transaction_id: string }
        Returns: Json
      }
      void_yield_distribution: {
        Args: {
          p_admin_id: string
          p_distribution_id: string
          p_reason?: string
        }
        Returns: Json
      }
    }
    Enums: {
      access_event:
        | "login"
        | "logout"
        | "2fa_setup"
        | "2fa_verify"
        | "session_revoked"
        | "password_change"
      account_type: "investor" | "ib" | "fees_account"
      app_role:
        | "super_admin"
        | "admin"
        | "moderator"
        | "ib"
        | "user"
        | "investor"
      approval_operation_type:
        | "PERIOD_LOCK"
        | "PERIOD_UNLOCK"
        | "LARGE_WITHDRAWAL"
        | "LARGE_DEPOSIT"
        | "STAGING_PROMOTION"
        | "FEE_STRUCTURE_CHANGE"
        | "RECONCILIATION_FINALIZE"
        | "VOID_TRANSACTION"
        | "BULK_OPERATION"
        | "MFA_RESET"
      asset_code:
        | "BTC"
        | "ETH"
        | "SOL"
        | "USDT"
        | "EURC"
        | "xAUT"
        | "XRP"
        | "ADA"
      aum_purpose: "reporting" | "transaction"
      benchmark_type: "BTC" | "ETH" | "STABLE" | "CUSTOM"
      document_type: "statement" | "notice" | "terms" | "tax" | "other"
      error_category:
        | "VALIDATION"
        | "BUSINESS_RULE"
        | "STATE"
        | "PERMISSION"
        | "NOT_FOUND"
        | "CONFLICT"
        | "SYSTEM"
      fee_kind: "mgmt" | "perf"
      fund_status:
        | "active"
        | "inactive"
        | "suspended"
        | "deprecated"
        | "pending"
      notification_priority: "low" | "medium" | "high"
      notification_type:
        | "deposit"
        | "statement"
        | "performance"
        | "system"
        | "support"
        | "withdrawal"
        | "yield"
      platform_error_code:
        | "PREFLOW_AUM_MISSING"
        | "AUM_NOT_FOUND"
        | "AUM_ALREADY_EXISTS"
        | "AUM_DUPLICATE_PREFLOW"
        | "PERIOD_LOCKED"
        | "PERIOD_NOT_FOUND"
        | "ECONOMIC_DATE_REQUIRED"
        | "FUTURE_DATE_NOT_ALLOWED"
        | "BACKDATED_NOT_ALLOWED"
        | "LEDGER_IMMUTABLE"
        | "TRANSACTION_NOT_FOUND"
        | "TRANSACTION_ALREADY_VOIDED"
        | "INSUFFICIENT_BALANCE"
        | "INVALID_TRANSACTION_TYPE"
        | "ASSET_MISMATCH"
        | "INVALID_ASSET"
        | "YIELD_CONSERVATION_VIOLATION"
        | "DUST_TOLERANCE_EXCEEDED"
        | "NO_POSITIONS_FOR_YIELD"
        | "FUND_NOT_FOUND"
        | "FUND_INACTIVE"
        | "INVESTOR_NOT_FOUND"
        | "INVESTOR_POSITION_NOT_FOUND"
        | "INVESTOR_NOT_IN_FUND"
        | "APPROVAL_REQUIRED"
        | "APPROVAL_PENDING"
        | "SELF_APPROVAL_NOT_ALLOWED"
        | "UNAUTHORIZED"
        | "ADMIN_REQUIRED"
        | "VALIDATION_ERROR"
        | "REQUIRED_FIELD_MISSING"
        | "INVALID_AMOUNT"
        | "INVALID_DATE"
        | "INVALID_PURPOSE"
        | "SYSTEM_ERROR"
        | "INVARIANT_VIOLATION"
        | "CONCURRENCY_ERROR"
        | "STAGING_VALIDATION_FAILED"
        | "STAGING_BATCH_NOT_FOUND"
        | "STAGING_ALREADY_PROMOTED"
      share_scope: "portfolio" | "documents" | "statement"
      ticket_category:
        | "account"
        | "portfolio"
        | "statement"
        | "technical"
        | "general"
      ticket_priority: "low" | "medium" | "high" | "urgent"
      ticket_status: "open" | "in_progress" | "waiting_on_lp" | "closed"
      transaction_status: "pending" | "confirmed" | "failed" | "cancelled"
      transaction_type:
        | "DEPOSIT"
        | "WITHDRAWAL"
        | "INTEREST"
        | "FEE"
        | "DUST_ALLOCATION"
      tx_source:
        | "manual_admin"
        | "yield_distribution"
        | "fee_allocation"
        | "ib_allocation"
        | "system_bootstrap"
        | "investor_wizard"
        | "internal_routing"
        | "yield_correction"
        | "withdrawal_completion"
        | "rpc_canonical"
        | "crystallization"
        | "system"
        | "migration"
      tx_type:
        | "DEPOSIT"
        | "WITHDRAWAL"
        | "INTEREST"
        | "FEE"
        | "ADJUSTMENT"
        | "FEE_CREDIT"
        | "IB_CREDIT"
        | "YIELD"
        | "INTERNAL_WITHDRAWAL"
        | "INTERNAL_CREDIT"
        | "IB_DEBIT"
      visibility_scope: "investor_visible" | "admin_only"
      withdrawal_action:
        | "create"
        | "approve"
        | "reject"
        | "processing"
        | "complete"
        | "cancel"
        | "update"
        | "route_to_fees"
      withdrawal_status:
        | "pending"
        | "approved"
        | "processing"
        | "completed"
        | "rejected"
        | "cancelled"
      yield_distribution_status:
        | "draft"
        | "applied"
        | "voided"
        | "previewed"
        | "corrected"
        | "rolled_back"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      access_event: [
        "login",
        "logout",
        "2fa_setup",
        "2fa_verify",
        "session_revoked",
        "password_change",
      ],
      account_type: ["investor", "ib", "fees_account"],
      app_role: ["super_admin", "admin", "moderator", "ib", "user", "investor"],
      approval_operation_type: [
        "PERIOD_LOCK",
        "PERIOD_UNLOCK",
        "LARGE_WITHDRAWAL",
        "LARGE_DEPOSIT",
        "STAGING_PROMOTION",
        "FEE_STRUCTURE_CHANGE",
        "RECONCILIATION_FINALIZE",
        "VOID_TRANSACTION",
        "BULK_OPERATION",
        "MFA_RESET",
      ],
      asset_code: ["BTC", "ETH", "SOL", "USDT", "EURC", "xAUT", "XRP", "ADA"],
      aum_purpose: ["reporting", "transaction"],
      benchmark_type: ["BTC", "ETH", "STABLE", "CUSTOM"],
      document_type: ["statement", "notice", "terms", "tax", "other"],
      error_category: [
        "VALIDATION",
        "BUSINESS_RULE",
        "STATE",
        "PERMISSION",
        "NOT_FOUND",
        "CONFLICT",
        "SYSTEM",
      ],
      fee_kind: ["mgmt", "perf"],
      fund_status: ["active", "inactive", "suspended", "deprecated", "pending"],
      notification_priority: ["low", "medium", "high"],
      notification_type: [
        "deposit",
        "statement",
        "performance",
        "system",
        "support",
        "withdrawal",
        "yield",
      ],
      platform_error_code: [
        "PREFLOW_AUM_MISSING",
        "AUM_NOT_FOUND",
        "AUM_ALREADY_EXISTS",
        "AUM_DUPLICATE_PREFLOW",
        "PERIOD_LOCKED",
        "PERIOD_NOT_FOUND",
        "ECONOMIC_DATE_REQUIRED",
        "FUTURE_DATE_NOT_ALLOWED",
        "BACKDATED_NOT_ALLOWED",
        "LEDGER_IMMUTABLE",
        "TRANSACTION_NOT_FOUND",
        "TRANSACTION_ALREADY_VOIDED",
        "INSUFFICIENT_BALANCE",
        "INVALID_TRANSACTION_TYPE",
        "ASSET_MISMATCH",
        "INVALID_ASSET",
        "YIELD_CONSERVATION_VIOLATION",
        "DUST_TOLERANCE_EXCEEDED",
        "NO_POSITIONS_FOR_YIELD",
        "FUND_NOT_FOUND",
        "FUND_INACTIVE",
        "INVESTOR_NOT_FOUND",
        "INVESTOR_POSITION_NOT_FOUND",
        "INVESTOR_NOT_IN_FUND",
        "APPROVAL_REQUIRED",
        "APPROVAL_PENDING",
        "SELF_APPROVAL_NOT_ALLOWED",
        "UNAUTHORIZED",
        "ADMIN_REQUIRED",
        "VALIDATION_ERROR",
        "REQUIRED_FIELD_MISSING",
        "INVALID_AMOUNT",
        "INVALID_DATE",
        "INVALID_PURPOSE",
        "SYSTEM_ERROR",
        "INVARIANT_VIOLATION",
        "CONCURRENCY_ERROR",
        "STAGING_VALIDATION_FAILED",
        "STAGING_BATCH_NOT_FOUND",
        "STAGING_ALREADY_PROMOTED",
      ],
      share_scope: ["portfolio", "documents", "statement"],
      ticket_category: [
        "account",
        "portfolio",
        "statement",
        "technical",
        "general",
      ],
      ticket_priority: ["low", "medium", "high", "urgent"],
      ticket_status: ["open", "in_progress", "waiting_on_lp", "closed"],
      transaction_status: ["pending", "confirmed", "failed", "cancelled"],
      transaction_type: [
        "DEPOSIT",
        "WITHDRAWAL",
        "INTEREST",
        "FEE",
        "DUST_ALLOCATION",
      ],
      tx_source: [
        "manual_admin",
        "yield_distribution",
        "fee_allocation",
        "ib_allocation",
        "system_bootstrap",
        "investor_wizard",
        "internal_routing",
        "yield_correction",
        "withdrawal_completion",
        "rpc_canonical",
        "crystallization",
        "system",
        "migration",
      ],
      tx_type: [
        "DEPOSIT",
        "WITHDRAWAL",
        "INTEREST",
        "FEE",
        "ADJUSTMENT",
        "FEE_CREDIT",
        "IB_CREDIT",
        "YIELD",
        "INTERNAL_WITHDRAWAL",
        "INTERNAL_CREDIT",
        "IB_DEBIT",
      ],
      visibility_scope: ["investor_visible", "admin_only"],
      withdrawal_action: [
        "create",
        "approve",
        "reject",
        "processing",
        "complete",
        "cancel",
        "update",
        "route_to_fees",
      ],
      withdrawal_status: [
        "pending",
        "approved",
        "processing",
        "completed",
        "rejected",
        "cancelled",
      ],
      yield_distribution_status: [
        "draft",
        "applied",
        "voided",
        "previewed",
        "corrected",
        "rolled_back",
      ],
    },
  },
} as const
