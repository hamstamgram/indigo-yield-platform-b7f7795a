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
    PostgrestVersion: "12.2.3 (519615d)"
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
      admin_invites: {
        Row: {
          created_at: string
          created_by: string | null
          email: string
          expires_at: string
          id: string
          invite_code: string
          used: boolean | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          email: string
          expires_at: string
          id?: string
          invite_code: string
          used?: boolean | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          email?: string
          expires_at?: string
          id?: string
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
      audit_logs: {
        Row: {
          action: string
          changes: Json | null
          created_at: string | null
          id: string
          ip_address: unknown
          record_id: string | null
          table_name: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          changes?: Json | null
          created_at?: string | null
          id?: string
          ip_address?: unknown
          record_id?: string | null
          table_name: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          changes?: Json | null
          created_at?: string | null
          id?: string
          ip_address?: unknown
          record_id?: string | null
          table_name?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_investor_kpis"
            referencedColumns: ["investor_id"]
          },
        ]
      }
      balance_adjustments: {
        Row: {
          amount: number
          audit_ref: string | null
          created_at: string
          created_by: string
          currency: string
          fund_id: string | null
          id: string
          notes: string | null
          reason: string
          user_id: string
        }
        Insert: {
          amount: number
          audit_ref?: string | null
          created_at?: string
          created_by: string
          currency?: string
          fund_id?: string | null
          id?: string
          notes?: string | null
          reason: string
          user_id: string
        }
        Update: {
          amount?: number
          audit_ref?: string | null
          created_at?: string
          created_by?: string
          currency?: string
          fund_id?: string | null
          id?: string
          notes?: string | null
          reason?: string
          user_id?: string
        }
        Relationships: []
      }
      benchmarks: {
        Row: {
          created_at: string
          date: string
          id: number
          price_usd: number
          ret_1d: number | null
          ret_itd: number | null
          ret_mtd: number | null
          ret_qtd: number | null
          ret_ytd: number | null
          symbol: string
        }
        Insert: {
          created_at?: string
          date: string
          id?: number
          price_usd: number
          ret_1d?: number | null
          ret_itd?: number | null
          ret_mtd?: number | null
          ret_qtd?: number | null
          ret_ytd?: number | null
          symbol: string
        }
        Update: {
          created_at?: string
          date?: string
          id?: number
          price_usd?: number
          ret_1d?: number | null
          ret_itd?: number | null
          ret_mtd?: number | null
          ret_qtd?: number | null
          ret_ytd?: number | null
          symbol?: string
        }
        Relationships: []
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
            referencedRelation: "v_investor_kpis"
            referencedColumns: ["investor_id"]
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
            referencedRelation: "withdrawal_queue"
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
            referencedRelation: "v_investor_kpis"
            referencedColumns: ["investor_id"]
          },
          {
            foreignKeyName: "data_edit_audit_import_id_fkey"
            columns: ["import_id"]
            isOneToOne: false
            referencedRelation: "excel_import_log"
            referencedColumns: ["id"]
          },
        ]
      }
      deposits: {
        Row: {
          amount: number
          asset_symbol: string
          created_at: string | null
          created_by: string | null
          id: string
          status: string | null
          transaction_hash: string | null
          user_id: string | null
        }
        Insert: {
          amount: number
          asset_symbol: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          status?: string | null
          transaction_hash?: string | null
          user_id?: string | null
        }
        Update: {
          amount?: number
          asset_symbol?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          status?: string | null
          transaction_hash?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      documents: {
        Row: {
          checksum: string | null
          created_at: string
          created_by: string | null
          fund_id: string | null
          id: string
          period_end: string | null
          period_start: string | null
          storage_path: string
          title: string
          type: Database["public"]["Enums"]["document_type"]
          user_id: string
        }
        Insert: {
          checksum?: string | null
          created_at?: string
          created_by?: string | null
          fund_id?: string | null
          id?: string
          period_end?: string | null
          period_start?: string | null
          storage_path: string
          title: string
          type: Database["public"]["Enums"]["document_type"]
          user_id: string
        }
        Update: {
          checksum?: string | null
          created_at?: string
          created_by?: string | null
          fund_id?: string | null
          id?: string
          period_end?: string | null
          period_start?: string | null
          storage_path?: string
          title?: string
          type?: Database["public"]["Enums"]["document_type"]
          user_id?: string
        }
        Relationships: []
      }
      email_logs: {
        Row: {
          created_at: string | null
          delivered_at: string | null
          error: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient: string
          sent_at: string | null
          status: string | null
          subject: string
          template: string | null
        }
        Insert: {
          created_at?: string | null
          delivered_at?: string | null
          error?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient: string
          sent_at?: string | null
          status?: string | null
          subject: string
          template?: string | null
        }
        Update: {
          created_at?: string | null
          delivered_at?: string | null
          error?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient?: string
          sent_at?: string | null
          status?: string | null
          subject?: string
          template?: string | null
        }
        Relationships: []
      }
      excel_import_log: {
        Row: {
          class_summary: Json | null
          completed_at: string | null
          created_at: string | null
          errors: Json | null
          filename: string
          fund_classes: Json | null
          id: string
          import_type: string | null
          imported_by: string | null
          rows_failed: number | null
          rows_processed: number | null
          rows_succeeded: number | null
          started_at: string | null
          status: string | null
        }
        Insert: {
          class_summary?: Json | null
          completed_at?: string | null
          created_at?: string | null
          errors?: Json | null
          filename: string
          fund_classes?: Json | null
          id?: string
          import_type?: string | null
          imported_by?: string | null
          rows_failed?: number | null
          rows_processed?: number | null
          rows_succeeded?: number | null
          started_at?: string | null
          status?: string | null
        }
        Update: {
          class_summary?: Json | null
          completed_at?: string | null
          created_at?: string | null
          errors?: Json | null
          filename?: string
          fund_classes?: Json | null
          id?: string
          import_type?: string | null
          imported_by?: string | null
          rows_failed?: number | null
          rows_processed?: number | null
          rows_succeeded?: number | null
          started_at?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "excel_import_log_imported_by_fkey"
            columns: ["imported_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "excel_import_log_imported_by_fkey"
            columns: ["imported_by"]
            isOneToOne: false
            referencedRelation: "v_investor_kpis"
            referencedColumns: ["investor_id"]
          },
        ]
      }
      fee_calculations: {
        Row: {
          calculation_basis: number
          calculation_date: string
          created_at: string | null
          created_by: string | null
          fee_amount: number
          fee_type: string | null
          fund_id: string
          id: string
          investor_id: string
          notes: string | null
          posted_transaction_id: string | null
          rate_bps: number
          status: string | null
        }
        Insert: {
          calculation_basis: number
          calculation_date: string
          created_at?: string | null
          created_by?: string | null
          fee_amount: number
          fee_type?: string | null
          fund_id: string
          id?: string
          investor_id: string
          notes?: string | null
          posted_transaction_id?: string | null
          rate_bps: number
          status?: string | null
        }
        Update: {
          calculation_basis?: number
          calculation_date?: string
          created_at?: string | null
          created_by?: string | null
          fee_amount?: number
          fee_type?: string | null
          fund_id?: string
          id?: string
          investor_id?: string
          notes?: string | null
          posted_transaction_id?: string | null
          rate_bps?: number
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fee_calculations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fee_calculations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_investor_kpis"
            referencedColumns: ["investor_id"]
          },
          {
            foreignKeyName: "fee_calculations_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "funds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fee_calculations_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "withdrawal_queue"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "fee_calculations_investor_id_fkey"
            columns: ["investor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fee_calculations_investor_id_fkey"
            columns: ["investor_id"]
            isOneToOne: false
            referencedRelation: "v_investor_kpis"
            referencedColumns: ["investor_id"]
          },
          {
            foreignKeyName: "fee_calculations_posted_transaction_id_fkey"
            columns: ["posted_transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions_v2"
            referencedColumns: ["id"]
          },
        ]
      }
      fees: {
        Row: {
          amount: number
          asset_code: Database["public"]["Enums"]["asset_code"]
          created_at: string
          created_by: string | null
          id: string
          investor_id: string
          kind: Database["public"]["Enums"]["fee_kind"]
          period_month: number | null
          period_year: number | null
        }
        Insert: {
          amount: number
          asset_code: Database["public"]["Enums"]["asset_code"]
          created_at?: string
          created_by?: string | null
          id?: string
          investor_id: string
          kind: Database["public"]["Enums"]["fee_kind"]
          period_month?: number | null
          period_year?: number | null
        }
        Update: {
          amount?: number
          asset_code?: Database["public"]["Enums"]["asset_code"]
          created_at?: string
          created_by?: string | null
          id?: string
          investor_id?: string
          kind?: Database["public"]["Enums"]["fee_kind"]
          period_month?: number | null
          period_year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_fees_investor"
            columns: ["investor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_fees_investor"
            columns: ["investor_id"]
            isOneToOne: false
            referencedRelation: "v_investor_kpis"
            referencedColumns: ["investor_id"]
          },
        ]
      }
      fund_configurations: {
        Row: {
          benchmark: Database["public"]["Enums"]["benchmark_type"]
          code: string
          created_at: string
          currency: string
          effective_from: string
          fee_version: number
          id: string
          inception_date: string
          mgmt_fee_bps: number
          name: string
          perf_fee_bps: number
          status: Database["public"]["Enums"]["fund_status"]
          updated_at: string
        }
        Insert: {
          benchmark?: Database["public"]["Enums"]["benchmark_type"]
          code: string
          created_at?: string
          currency?: string
          effective_from?: string
          fee_version?: number
          id?: string
          inception_date?: string
          mgmt_fee_bps?: number
          name: string
          perf_fee_bps?: number
          status?: Database["public"]["Enums"]["fund_status"]
          updated_at?: string
        }
        Update: {
          benchmark?: Database["public"]["Enums"]["benchmark_type"]
          code?: string
          created_at?: string
          currency?: string
          effective_from?: string
          fee_version?: number
          id?: string
          inception_date?: string
          mgmt_fee_bps?: number
          name?: string
          perf_fee_bps?: number
          status?: Database["public"]["Enums"]["fund_status"]
          updated_at?: string
        }
        Relationships: []
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
          nav_per_share: number | null
          purpose: Database["public"]["Enums"]["aum_purpose"]
          source: string | null
          total_aum: number
          total_shares: number | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          as_of_date?: string | null
          aum_date: string
          created_at?: string | null
          created_by?: string | null
          fund_id: string
          id?: string
          is_month_end?: boolean | null
          nav_per_share?: number | null
          purpose?: Database["public"]["Enums"]["aum_purpose"]
          source?: string | null
          total_aum?: number
          total_shares?: number | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          as_of_date?: string | null
          aum_date?: string
          created_at?: string | null
          created_by?: string | null
          fund_id?: string
          id?: string
          is_month_end?: boolean | null
          nav_per_share?: number | null
          purpose?: Database["public"]["Enums"]["aum_purpose"]
          source?: string | null
          total_aum?: number
          total_shares?: number | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
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
      fund_fee_history: {
        Row: {
          created_at: string
          created_by: string
          effective_from: string
          fund_id: string
          id: string
          mgmt_fee_bps: number
          perf_fee_bps: number
        }
        Insert: {
          created_at?: string
          created_by: string
          effective_from: string
          fund_id: string
          id?: string
          mgmt_fee_bps: number
          perf_fee_bps: number
        }
        Update: {
          created_at?: string
          created_by?: string
          effective_from?: string
          fund_id?: string
          id?: string
          mgmt_fee_bps?: number
          perf_fee_bps?: number
        }
        Relationships: [
          {
            foreignKeyName: "fund_fee_history_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "fund_configurations"
            referencedColumns: ["id"]
          },
        ]
      }
      fund_period_snapshot: {
        Row: {
          created_at: string
          created_by: string | null
          fund_id: string
          id: string
          investor_count: number
          is_locked: boolean
          locked_at: string | null
          locked_by: string | null
          period_id: string
          snapshot_date: string
          total_aum: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          fund_id: string
          id?: string
          investor_count?: number
          is_locked?: boolean
          locked_at?: string | null
          locked_by?: string | null
          period_id: string
          snapshot_date: string
          total_aum: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          fund_id?: string
          id?: string
          investor_count?: number
          is_locked?: boolean
          locked_at?: string | null
          locked_by?: string | null
          period_id?: string
          snapshot_date?: string
          total_aum?: number
        }
        Relationships: [
          {
            foreignKeyName: "fund_period_snapshot_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fund_period_snapshot_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_investor_kpis"
            referencedColumns: ["investor_id"]
          },
          {
            foreignKeyName: "fund_period_snapshot_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "funds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fund_period_snapshot_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "withdrawal_queue"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "fund_period_snapshot_locked_by_fkey"
            columns: ["locked_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fund_period_snapshot_locked_by_fkey"
            columns: ["locked_by"]
            isOneToOne: false
            referencedRelation: "v_investor_kpis"
            referencedColumns: ["investor_id"]
          },
          {
            foreignKeyName: "fund_period_snapshot_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "statement_periods"
            referencedColumns: ["id"]
          },
        ]
      }
      funds: {
        Row: {
          asset: string
          code: string
          created_at: string | null
          fund_class: string
          high_water_mark: number | null
          id: string
          inception_date: string
          lock_period_days: number | null
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
          created_at?: string | null
          fund_class: string
          high_water_mark?: number | null
          id?: string
          inception_date?: string
          lock_period_days?: number | null
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
          created_at?: string | null
          fund_class?: string
          high_water_mark?: number | null
          id?: string
          inception_date?: string
          lock_period_days?: number | null
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
            referencedRelation: "v_investor_kpis"
            referencedColumns: ["investor_id"]
          },
        ]
      }
      ib_allocations: {
        Row: {
          created_at: string | null
          created_by: string | null
          effective_date: string
          fund_id: string | null
          ib_fee_amount: number
          ib_investor_id: string
          ib_percentage: number
          id: string
          period_id: string | null
          source_investor_id: string
          source_net_income: number
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          effective_date?: string
          fund_id?: string | null
          ib_fee_amount: number
          ib_investor_id: string
          ib_percentage: number
          id?: string
          period_id?: string | null
          source_investor_id: string
          source_net_income: number
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          effective_date?: string
          fund_id?: string | null
          ib_fee_amount?: number
          ib_investor_id?: string
          ib_percentage?: number
          id?: string
          period_id?: string | null
          source_investor_id?: string
          source_net_income?: number
        }
        Relationships: [
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
            referencedRelation: "v_investor_kpis"
            referencedColumns: ["investor_id"]
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
            referencedRelation: "withdrawal_queue"
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
            referencedRelation: "v_investor_kpis"
            referencedColumns: ["investor_id"]
          },
        ]
      }
      import_locks: {
        Row: {
          id: string
          import_id: string | null
          is_active: boolean | null
          lock_reason: string | null
          locked_at: string
          locked_by: string | null
          unlock_at: string | null
          unlocked_at: string | null
          unlocked_by: string | null
        }
        Insert: {
          id?: string
          import_id?: string | null
          is_active?: boolean | null
          lock_reason?: string | null
          locked_at?: string
          locked_by?: string | null
          unlock_at?: string | null
          unlocked_at?: string | null
          unlocked_by?: string | null
        }
        Update: {
          id?: string
          import_id?: string | null
          is_active?: boolean | null
          lock_reason?: string | null
          locked_at?: string
          locked_by?: string | null
          unlock_at?: string | null
          unlocked_at?: string | null
          unlocked_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "import_locks_import_id_fkey"
            columns: ["import_id"]
            isOneToOne: false
            referencedRelation: "excel_import_log"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "import_locks_locked_by_fkey"
            columns: ["locked_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "import_locks_locked_by_fkey"
            columns: ["locked_by"]
            isOneToOne: false
            referencedRelation: "v_investor_kpis"
            referencedColumns: ["investor_id"]
          },
          {
            foreignKeyName: "import_locks_unlocked_by_fkey"
            columns: ["unlocked_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "import_locks_unlocked_by_fkey"
            columns: ["unlocked_by"]
            isOneToOne: false
            referencedRelation: "v_investor_kpis"
            referencedColumns: ["investor_id"]
          },
        ]
      }
      investment_summary: {
        Row: {
          id: string
          investor_id: string
          last_updated: string | null
          return_percentage: number | null
          total_current_value: number | null
          total_invested: number | null
          total_returns: number | null
        }
        Insert: {
          id?: string
          investor_id: string
          last_updated?: string | null
          return_percentage?: number | null
          total_current_value?: number | null
          total_invested?: number | null
          total_returns?: number | null
        }
        Update: {
          id?: string
          investor_id?: string
          last_updated?: string | null
          return_percentage?: number | null
          total_current_value?: number | null
          total_invested?: number | null
          total_returns?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "investment_summary_investor_id_fkey"
            columns: ["investor_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "investment_summary_investor_id_fkey"
            columns: ["investor_id"]
            isOneToOne: true
            referencedRelation: "v_investor_kpis"
            referencedColumns: ["investor_id"]
          },
        ]
      }
      investments: {
        Row: {
          amount: number
          created_at: string | null
          created_by: string | null
          fund_id: string
          id: string
          investment_date: string
          investor_id: string
          notes: string | null
          shares: number | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          created_by?: string | null
          fund_id: string
          id?: string
          investment_date?: string
          investor_id: string
          notes?: string | null
          shares?: number | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          created_by?: string | null
          fund_id?: string
          id?: string
          investment_date?: string
          investor_id?: string
          notes?: string | null
          shares?: number | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "investments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "investments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_investor_kpis"
            referencedColumns: ["investor_id"]
          },
          {
            foreignKeyName: "investments_investor_id_fkey"
            columns: ["investor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "investments_investor_id_fkey"
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
          investor_id: string | null
          is_primary: boolean | null
          updated_at: string | null
          verified: boolean | null
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
          investor_id?: string | null
          is_primary?: boolean | null
          updated_at?: string | null
          verified?: boolean | null
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          investor_id?: string | null
          is_primary?: boolean | null
          updated_at?: string | null
          verified?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_investor_emails_profile"
            columns: ["investor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_investor_emails_profile"
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
          fee_pct: number
          fund_id: string | null
          id: string
          investor_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string
          effective_date: string
          fee_pct: number
          fund_id?: string | null
          id?: string
          investor_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string
          effective_date?: string
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
            referencedRelation: "funds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "investor_fee_schedule_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "withdrawal_queue"
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
            referencedRelation: "v_investor_kpis"
            referencedColumns: ["investor_id"]
          },
        ]
      }
      investor_monthly_reports: {
        Row: {
          additions: number | null
          asset_code: string
          aum_manual_override: number | null
          closing_balance: number | null
          created_at: string
          edited_by: string | null
          entry_date: string | null
          exit_date: string | null
          id: string
          investor_id: string
          opening_balance: number | null
          report_month: string
          updated_at: string
          withdrawals: number | null
          yield_earned: number | null
        }
        Insert: {
          additions?: number | null
          asset_code: string
          aum_manual_override?: number | null
          closing_balance?: number | null
          created_at?: string
          edited_by?: string | null
          entry_date?: string | null
          exit_date?: string | null
          id?: string
          investor_id: string
          opening_balance?: number | null
          report_month: string
          updated_at?: string
          withdrawals?: number | null
          yield_earned?: number | null
        }
        Update: {
          additions?: number | null
          asset_code?: string
          aum_manual_override?: number | null
          closing_balance?: number | null
          created_at?: string
          edited_by?: string | null
          entry_date?: string | null
          exit_date?: string | null
          id?: string
          investor_id?: string
          opening_balance?: number | null
          report_month?: string
          updated_at?: string
          withdrawals?: number | null
          yield_earned?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_investor_monthly_reports_investor"
            columns: ["investor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_investor_monthly_reports_investor"
            columns: ["investor_id"]
            isOneToOne: false
            referencedRelation: "v_investor_kpis"
            referencedColumns: ["investor_id"]
          },
        ]
      }
      investor_period_snapshot: {
        Row: {
          balance_at_snapshot: number
          created_at: string
          fund_id: string
          fund_period_snapshot_id: string
          id: string
          investor_id: string
          ownership_pct: number
          period_id: string
        }
        Insert: {
          balance_at_snapshot: number
          created_at?: string
          fund_id: string
          fund_period_snapshot_id: string
          id?: string
          investor_id: string
          ownership_pct: number
          period_id: string
        }
        Update: {
          balance_at_snapshot?: number
          created_at?: string
          fund_id?: string
          fund_period_snapshot_id?: string
          id?: string
          investor_id?: string
          ownership_pct?: number
          period_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "investor_period_snapshot_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "funds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "investor_period_snapshot_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "withdrawal_queue"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "investor_period_snapshot_fund_period_snapshot_id_fkey"
            columns: ["fund_period_snapshot_id"]
            isOneToOne: false
            referencedRelation: "fund_period_snapshot"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "investor_period_snapshot_investor_id_fkey"
            columns: ["investor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "investor_period_snapshot_investor_id_fkey"
            columns: ["investor_id"]
            isOneToOne: false
            referencedRelation: "v_investor_kpis"
            referencedColumns: ["investor_id"]
          },
          {
            foreignKeyName: "investor_period_snapshot_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "statement_periods"
            referencedColumns: ["id"]
          },
        ]
      }
      investor_positions: {
        Row: {
          aum_percentage: number | null
          cost_basis: number
          current_value: number
          fund_class: string | null
          fund_id: string
          high_water_mark: number | null
          investor_id: string | null
          last_transaction_date: string | null
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
          current_value?: number
          fund_class?: string | null
          fund_id: string
          high_water_mark?: number | null
          investor_id?: string | null
          last_transaction_date?: string | null
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
          current_value?: number
          fund_class?: string | null
          fund_id?: string
          high_water_mark?: number | null
          investor_id?: string | null
          last_transaction_date?: string | null
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
            foreignKeyName: "fk_investor_positions_profile"
            columns: ["investor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_investor_positions_profile"
            columns: ["investor_id"]
            isOneToOne: false
            referencedRelation: "v_investor_kpis"
            referencedColumns: ["investor_id"]
          },
          {
            foreignKeyName: "investor_positions_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "funds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "investor_positions_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "withdrawal_queue"
            referencedColumns: ["fund_id"]
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
      onboarding_submissions: {
        Row: {
          additional_emails: string[] | null
          company_name: string | null
          created_at: string | null
          created_investor_id: string | null
          email: string
          full_name: string
          id: string
          investor_id: string | null
          jotform_submission_id: string | null
          notes: string | null
          phone: string | null
          processed_at: string | null
          processed_by: string | null
          raw_data: Json | null
          status: string
          submitted_at: string | null
          updated_at: string | null
        }
        Insert: {
          additional_emails?: string[] | null
          company_name?: string | null
          created_at?: string | null
          created_investor_id?: string | null
          email: string
          full_name: string
          id?: string
          investor_id?: string | null
          jotform_submission_id?: string | null
          notes?: string | null
          phone?: string | null
          processed_at?: string | null
          processed_by?: string | null
          raw_data?: Json | null
          status?: string
          submitted_at?: string | null
          updated_at?: string | null
        }
        Update: {
          additional_emails?: string[] | null
          company_name?: string | null
          created_at?: string | null
          created_investor_id?: string | null
          email?: string
          full_name?: string
          id?: string
          investor_id?: string | null
          jotform_submission_id?: string | null
          notes?: string | null
          phone?: string | null
          processed_at?: string | null
          processed_by?: string | null
          raw_data?: Json | null
          status?: string
          submitted_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "onboarding_submissions_investor_id_fkey"
            columns: ["investor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "onboarding_submissions_investor_id_fkey"
            columns: ["investor_id"]
            isOneToOne: false
            referencedRelation: "v_investor_kpis"
            referencedColumns: ["investor_id"]
          },
        ]
      }
      portfolio_history: {
        Row: {
          asset_id: number
          balance: number
          created_at: string
          date: string
          id: string
          usd_value: number | null
          user_id: string
          yield_applied: number | null
        }
        Insert: {
          asset_id: number
          balance: number
          created_at?: string
          date: string
          id?: string
          usd_value?: number | null
          user_id: string
          yield_applied?: number | null
        }
        Update: {
          asset_id?: number
          balance?: number
          created_at?: string
          date?: string
          id?: string
          usd_value?: number | null
          user_id?: string
          yield_applied?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "portfolio_history_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
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
            referencedRelation: "v_investor_kpis"
            referencedColumns: ["investor_id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          entity_type: string | null
          fee_percentage: number | null
          first_name: string | null
          ib_parent_id: string | null
          ib_percentage: number | null
          id: string
          is_admin: boolean
          kyc_status: string | null
          last_name: string | null
          onboarding_date: string | null
          phone: string | null
          preferences: Json | null
          status: string | null
          totp_enabled: boolean | null
          totp_verified: boolean | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          entity_type?: string | null
          fee_percentage?: number | null
          first_name?: string | null
          ib_parent_id?: string | null
          ib_percentage?: number | null
          id: string
          is_admin?: boolean
          kyc_status?: string | null
          last_name?: string | null
          onboarding_date?: string | null
          phone?: string | null
          preferences?: Json | null
          status?: string | null
          totp_enabled?: boolean | null
          totp_verified?: boolean | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          entity_type?: string | null
          fee_percentage?: number | null
          first_name?: string | null
          ib_parent_id?: string | null
          ib_percentage?: number | null
          id?: string
          is_admin?: boolean
          kyc_status?: string | null
          last_name?: string | null
          onboarding_date?: string | null
          phone?: string | null
          preferences?: Json | null
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
            referencedRelation: "v_investor_kpis"
            referencedColumns: ["investor_id"]
          },
        ]
      }
      reconciliation: {
        Row: {
          beginning_nav: number
          calculated_nav: number
          created_at: string | null
          ending_nav: number
          fees: number
          fund_id: string
          gross_pnl: number
          id: string
          net_flows: number
          notes: string | null
          reconciled_at: string | null
          reconciled_by: string | null
          reconciliation_date: string
          status: string | null
          variance: number
          variance_pct: number | null
        }
        Insert: {
          beginning_nav: number
          calculated_nav: number
          created_at?: string | null
          ending_nav: number
          fees: number
          fund_id: string
          gross_pnl: number
          id?: string
          net_flows: number
          notes?: string | null
          reconciled_at?: string | null
          reconciled_by?: string | null
          reconciliation_date: string
          status?: string | null
          variance: number
          variance_pct?: number | null
        }
        Update: {
          beginning_nav?: number
          calculated_nav?: number
          created_at?: string | null
          ending_nav?: number
          fees?: number
          fund_id?: string
          gross_pnl?: number
          id?: string
          net_flows?: number
          notes?: string | null
          reconciled_at?: string | null
          reconciled_by?: string | null
          reconciliation_date?: string
          status?: string | null
          variance?: number
          variance_pct?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "reconciliation_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "funds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reconciliation_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "withdrawal_queue"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "reconciliation_reconciled_by_fkey"
            columns: ["reconciled_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reconciliation_reconciled_by_fkey"
            columns: ["reconciled_by"]
            isOneToOne: false
            referencedRelation: "v_investor_kpis"
            referencedColumns: ["investor_id"]
          },
        ]
      }
      report_access_logs: {
        Row: {
          action: string
          created_at: string | null
          id: string
          metadata: Json | null
          report_id: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          report_id?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          report_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "report_access_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_access_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_investor_kpis"
            referencedColumns: ["investor_id"]
          },
        ]
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
      report_definitions: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean | null
          is_admin_only: boolean | null
          name: string
          template_config: Json | null
          template_type: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_admin_only?: boolean | null
          name: string
          template_config?: Json | null
          template_type: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_admin_only?: boolean | null
          name?: string
          template_config?: Json | null
          template_type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "report_definitions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_definitions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_investor_kpis"
            referencedColumns: ["investor_id"]
          },
        ]
      }
      report_schedules: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          last_run_at: string | null
          next_run_at: string | null
          recipients: Json | null
          report_definition_id: string | null
          schedule_type: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          last_run_at?: string | null
          next_run_at?: string | null
          recipients?: Json | null
          report_definition_id?: string | null
          schedule_type: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          last_run_at?: string | null
          next_run_at?: string | null
          recipients?: Json | null
          report_definition_id?: string | null
          schedule_type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "report_schedules_report_definition_id_fkey"
            columns: ["report_definition_id"]
            isOneToOne: false
            referencedRelation: "report_definitions"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          parameters: Json | null
          report_type: string
          schedule: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          parameters?: Json | null
          report_type: string
          schedule?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          parameters?: Json | null
          report_type?: string
          schedule?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reports_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_investor_kpis"
            referencedColumns: ["investor_id"]
          },
        ]
      }
      secure_shares: {
        Row: {
          created_at: string
          created_by: string | null
          expires_at: string
          fund_id: string | null
          id: string
          max_views: number | null
          owner_user_id: string
          revoked_at: string | null
          scope: Database["public"]["Enums"]["share_scope"]
          token: string
          views_count: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          expires_at: string
          fund_id?: string | null
          id?: string
          max_views?: number | null
          owner_user_id: string
          revoked_at?: string | null
          scope: Database["public"]["Enums"]["share_scope"]
          token: string
          views_count?: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          expires_at?: string
          fund_id?: string | null
          id?: string
          max_views?: number | null
          owner_user_id?: string
          revoked_at?: string | null
          scope?: Database["public"]["Enums"]["share_scope"]
          token?: string
          views_count?: number
        }
        Relationships: []
      }
      statement_email_delivery: {
        Row: {
          created_at: string | null
          error_message: string | null
          failed_at: string | null
          id: string
          investor_id: string
          period_id: string
          recipient_email: string
          retry_count: number | null
          sent_at: string | null
          statement_id: string
          status: string | null
          subject: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          error_message?: string | null
          failed_at?: string | null
          id?: string
          investor_id: string
          period_id: string
          recipient_email: string
          retry_count?: number | null
          sent_at?: string | null
          statement_id: string
          status?: string | null
          subject: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          error_message?: string | null
          failed_at?: string | null
          id?: string
          investor_id?: string
          period_id?: string
          recipient_email?: string
          retry_count?: number | null
          sent_at?: string | null
          statement_id?: string
          status?: string | null
          subject?: string
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
            referencedRelation: "v_investor_kpis"
            referencedColumns: ["investor_id"]
          },
        ]
      }
      statement_metadata: {
        Row: {
          created_at: string | null
          email_sent_to: string | null
          file_size: number | null
          generated_at: string | null
          generated_by: string | null
          id: string
          period_month: number
          period_year: number
          sent_at: string | null
          storage_path: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          email_sent_to?: string | null
          file_size?: number | null
          generated_at?: string | null
          generated_by?: string | null
          id?: string
          period_month: number
          period_year: number
          sent_at?: string | null
          storage_path: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          email_sent_to?: string | null
          file_size?: number | null
          generated_at?: string | null
          generated_by?: string | null
          id?: string
          period_month?: number
          period_year?: number
          sent_at?: string | null
          storage_path?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "statement_metadata_generated_by_fkey"
            columns: ["generated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "statement_metadata_generated_by_fkey"
            columns: ["generated_by"]
            isOneToOne: false
            referencedRelation: "v_investor_kpis"
            referencedColumns: ["investor_id"]
          },
          {
            foreignKeyName: "statement_metadata_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "statement_metadata_user_id_fkey"
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
        Relationships: []
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
            referencedRelation: "v_investor_kpis"
            referencedColumns: ["investor_id"]
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
          created_at: string | null
          created_by: string | null
          fund_class: string | null
          fund_id: string
          id: string
          investor_id: string | null
          notes: string | null
          reference_id: string | null
          tx_date: string
          tx_hash: string | null
          type: Database["public"]["Enums"]["tx_type"]
          value_date: string
        }
        Insert: {
          amount: number
          approved_at?: string | null
          approved_by?: string | null
          asset: string
          balance_after?: number | null
          balance_before?: number | null
          created_at?: string | null
          created_by?: string | null
          fund_class?: string | null
          fund_id: string
          id?: string
          investor_id?: string | null
          notes?: string | null
          reference_id?: string | null
          tx_date?: string
          tx_hash?: string | null
          type: Database["public"]["Enums"]["tx_type"]
          value_date?: string
        }
        Update: {
          amount?: number
          approved_at?: string | null
          approved_by?: string | null
          asset?: string
          balance_after?: number | null
          balance_before?: number | null
          created_at?: string | null
          created_by?: string | null
          fund_class?: string | null
          fund_id?: string
          id?: string
          investor_id?: string | null
          notes?: string | null
          reference_id?: string | null
          tx_date?: string
          tx_hash?: string | null
          type?: Database["public"]["Enums"]["tx_type"]
          value_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_transactions_v2_profile"
            columns: ["investor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_transactions_v2_profile"
            columns: ["investor_id"]
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
            referencedRelation: "v_investor_kpis"
            referencedColumns: ["investor_id"]
          },
          {
            foreignKeyName: "transactions_v2_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "funds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_v2_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "withdrawal_queue"
            referencedColumns: ["fund_id"]
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
      user_access_logs_enhanced: {
        Row: {
          authentication_method: string | null
          backup_code_used: boolean | null
          created_at: string | null
          device_fingerprint: string | null
          event: string
          failure_reason: string | null
          id: string
          ip_address: unknown
          location_city: string | null
          location_country: string | null
          metadata: Json | null
          session_id: string | null
          success: boolean
          totp_used: boolean | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          authentication_method?: string | null
          backup_code_used?: boolean | null
          created_at?: string | null
          device_fingerprint?: string | null
          event: string
          failure_reason?: string | null
          id?: string
          ip_address?: unknown
          location_city?: string | null
          location_country?: string | null
          metadata?: Json | null
          session_id?: string | null
          success: boolean
          totp_used?: boolean | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          authentication_method?: string | null
          backup_code_used?: boolean | null
          created_at?: string | null
          device_fingerprint?: string | null
          event?: string
          failure_reason?: string | null
          id?: string
          ip_address?: unknown
          location_city?: string | null
          location_country?: string | null
          metadata?: Json | null
          session_id?: string | null
          success?: boolean
          totp_used?: boolean | null
          user_agent?: string | null
          user_id?: string
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
      web_push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          revoked_at: string | null
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          revoked_at?: string | null
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          revoked_at?: string | null
          user_id?: string
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
            referencedRelation: "v_investor_kpis"
            referencedColumns: ["investor_id"]
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
            referencedRelation: "v_investor_kpis"
            referencedColumns: ["investor_id"]
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
            referencedRelation: "withdrawal_queue"
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
        Relationships: []
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
      yield_settings: {
        Row: {
          created_at: string
          created_by: string | null
          effective_from: string
          frequency: string
          id: string
          rate_bps: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          effective_from?: string
          frequency?: string
          id?: string
          rate_bps: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          effective_from?: string
          frequency?: string
          id?: string
          rate_bps?: number
        }
        Relationships: []
      }
    }
    Views: {
      audit_events_v: {
        Row: {
          actor_user: string | null
          created_at: string | null
          entity: string | null
          entity_id: string | null
          event_id: string | null
          meta: Json | null
          new_values: Json | null
          old_values: Json | null
          operation: string | null
          source_table: string | null
          user_id: string | null
        }
        Relationships: []
      }
      import_status: {
        Row: {
          active_locks: number | null
          edit_window_days: number | null
          imports_enabled: boolean | null
          last_import_time: string | null
          last_lock_time: string | null
          successful_imports: number | null
        }
        Relationships: []
      }
      monthly_fee_summary: {
        Row: {
          asset_code: string | null
          investor_count: number | null
          summary_month: string | null
          total_fees_collected: number | null
          total_gross_yield: number | null
          total_net_yield: number | null
        }
        Relationships: []
      }
      platform_fees_collected: {
        Row: {
          asset_code: string | null
          created_at: string | null
          fee_amount: number | null
          fee_date: string | null
          fee_month: string | null
          id: string | null
          investor_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fee_calculations_investor_id_fkey"
            columns: ["investor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fee_calculations_investor_id_fkey"
            columns: ["investor_id"]
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
          fund_id: string | null
          itd_return: number | null
        }
        Relationships: [
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
            referencedRelation: "withdrawal_queue"
            referencedColumns: ["fund_id"]
          },
        ]
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
            referencedRelation: "v_investor_kpis"
            referencedColumns: ["investor_id"]
          },
        ]
      }
      withdrawal_queue: {
        Row: {
          admin_notes: string | null
          approved_amount: number | null
          approved_at: string | null
          approved_by_email: string | null
          approved_by_name: string | null
          cancellation_reason: string | null
          cancelled_at: string | null
          cancelled_by_email: string | null
          cancelled_by_name: string | null
          current_position_value: number | null
          current_shares: number | null
          expected_withdrawal: number | null
          fund_class: string | null
          fund_code: string | null
          fund_id: string | null
          fund_name: string | null
          id: string | null
          investor_email: string | null
          investor_id: string | null
          investor_name: string | null
          notes: string | null
          processed_amount: number | null
          processed_at: string | null
          rejected_at: string | null
          rejected_by_email: string | null
          rejected_by_name: string | null
          rejection_reason: string | null
          request_date: string | null
          requested_amount: number | null
          settlement_date: string | null
          status: Database["public"]["Enums"]["withdrawal_status"] | null
          tx_hash: string | null
          updated_at: string | null
          withdrawal_type: string | null
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
            referencedRelation: "v_investor_kpis"
            referencedColumns: ["investor_id"]
          },
        ]
      }
    }
    Functions: {
      _resolve_investor_fee_pct: {
        Args: { p_date: string; p_fund_id: string; p_investor_id: string }
        Returns: number
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
      adjust_investor_position: {
        Args: {
          p_admin_id: string
          p_delta: number
          p_fund_id: string
          p_investor_id: string
          p_note: string
        }
        Returns: {
          fund_id: string
          investor_id: string
          new_balance: number
          previous_balance: number
        }[]
      }
      admin_create_transaction: {
        Args: {
          p_amount: number
          p_fund_id: string
          p_investor_id: string
          p_notes?: string
          p_shares?: number
          p_transaction_type: string
        }
        Returns: string
      }
      apply_daily_yield_to_fund:
        | {
            Args: {
              p_daily_rate: number
              p_fund_id: string
              p_rate_date: string
            }
            Returns: number
          }
        | {
            Args: {
              p_admin_id: string
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
      apply_daily_yield_with_fees: {
        Args: {
          p_fee_rate?: number
          p_fund_id: string
          p_gross_rate: number
          p_rate_date: string
        }
        Returns: {
          fees_collected: number
          gross_yield: number
          net_yield: number
          positions_updated: number
        }[]
      }
      approve_withdrawal: {
        Args: {
          p_admin_notes?: string
          p_approved_amount?: number
          p_request_id: string
        }
        Returns: boolean
      }
      can_access_investor: { Args: { investor_uuid: string }; Returns: boolean }
      can_access_notification: {
        Args: { notification_id: string }
        Returns: boolean
      }
      can_withdraw: {
        Args: { p_amount: number; p_fund_id: string; p_investor_id: string }
        Returns: Json
      }
      cancel_withdrawal_by_admin: {
        Args: { p_admin_notes?: string; p_reason: string; p_request_id: string }
        Returns: boolean
      }
      check_is_admin: { Args: { user_id: string }; Returns: boolean }
      complete_withdrawal: {
        Args: {
          p_admin_notes?: string
          p_request_id: string
          p_tx_hash?: string
        }
        Returns: boolean
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
      decrypt_totp_secret: {
        Args: { encrypted_secret: string }
        Returns: string
      }
      distribute_monthly_yield: {
        Args: {
          p_fund_id: string
          p_month: number
          p_total_yield: number
          p_year: number
        }
        Returns: number
      }
      distribute_yield_v2: {
        Args: {
          p_admin_id: string
          p_fund_name: string
          p_gross_yield_amount: number
          p_period_id: string
        }
        Returns: Json
      }
      encrypt_totp_secret: { Args: { secret_text: string }; Returns: string }
      ensure_admin: { Args: never; Returns: undefined }
      finalize_statement_period: {
        Args: { p_admin_id: string; p_period_id: string }
        Returns: undefined
      }
      force_delete_investor: {
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
      generate_fund_period_snapshot: {
        Args: { p_admin_id?: string; p_fund_id: string; p_period_id: string }
        Returns: string
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
      get_all_investors_with_details: {
        Args: never
        Returns: {
          created_at: string
          email: string
          first_name: string
          id: string
          last_name: string
        }[]
      }
      get_all_non_admin_profiles: {
        Args: never
        Returns: {
          created_at: string
          email: string
          fee_percentage: number
          first_name: string
          id: string
          last_name: string
        }[]
      }
      get_fund_composition: {
        Args: { p_date: string; p_fund_id: string }
        Returns: {
          balance: number
          email: string
          investor_name: string
          ownership_pct: number
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
      get_funds_with_aum: {
        Args: never
        Returns: {
          asset: string
          code: string
          fund_class: string
          id: string
          inception_date: string
          investor_count: number
          latest_aum: number
          latest_aum_date: string
          name: string
          status: Database["public"]["Enums"]["fund_status"]
        }[]
      }
      get_historical_nav: {
        Args: { target_date?: string }
        Returns: {
          asset_code: string
          aum: number
          daily_inflows: number
          daily_outflows: number
          fund_id: string
          fund_name: string
          net_flow_24h: number
        }[]
      }
      get_investor_period_summary: {
        Args: {
          p_end_date: string
          p_investor_id: string
          p_start_date: string
        }
        Returns: {
          additions: number
          beginning_value: number
          ending_value: number
          net_income: number
          rate_of_return: number
          redemptions: number
        }[]
      }
      get_investor_portfolio_summary: {
        Args: { p_investor_id: string }
        Returns: {
          fund_count: number
          last_updated: string
          total_cost_basis: number
          total_shares: number
          total_value: number
          unrealized_gain: number
        }[]
      }
      get_investor_positions_by_class: {
        Args: { p_investor_id: string }
        Returns: {
          allocation_pct: number
          fund_class: string
          total_pnl: number
          total_value: number
        }[]
      }
      get_monthly_platform_aum: {
        Args: never
        Returns: {
          month: string
          total_aum: number
        }[]
      }
      get_period_ownership: {
        Args: { p_fund_id: string; p_period_id: string }
        Returns: {
          balance: number
          investor_id: string
          is_locked: boolean
          ownership_pct: number
          snapshot_date: string
        }[]
      }
      get_profile_by_id: {
        Args: { profile_id: string }
        Returns: {
          created_at: string
          email: string
          fee_percentage: number
          first_name: string
          id: string
          is_admin: boolean
          last_name: string
        }[]
      }
      get_report_statistics: {
        Args: { p_period_end: string; p_period_start: string }
        Returns: {
          reports_by_type: Json
          reports_pending: number
          reports_sent: number
          total_reports: number
        }[]
      }
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
      handle_ledger_transaction: {
        Args: {
          p_amount: number
          p_fund_id: string
          p_investor_id: string
          p_type: string
        }
        Returns: undefined
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      has_super_admin_role: { Args: { p_user_id: string }; Returns: boolean }
      is_2fa_required: { Args: { p_user_id: string }; Returns: boolean }
      is_admin: { Args: never; Returns: boolean }
      is_admin_for_jwt: { Args: never; Returns: boolean }
      is_admin_safe: { Args: never; Returns: boolean }
      is_import_enabled: { Args: never; Returns: boolean }
      is_period_locked: {
        Args: { p_fund_id: string; p_period_id: string }
        Returns: boolean
      }
      is_super_admin: { Args: never; Returns: boolean }
      is_valid_share_token: { Args: { token_value: string }; Returns: boolean }
      is_within_edit_window: {
        Args: { p_created_at: string }
        Returns: boolean
      }
      lock_fund_period_snapshot: {
        Args: { p_admin_id: string; p_fund_id: string; p_period_id: string }
        Returns: boolean
      }
      lock_imports: { Args: { p_reason?: string }; Returns: string }
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
      process_excel_import_with_classes: {
        Args: { p_data: Json; p_import_type?: string }
        Returns: Json
      }
      process_yield_distribution: {
        Args: { p_date: string; p_fund_id: string; p_gross_amount: number }
        Returns: {
          fee_amount: number
          gross_amount: number
          investor_id: string
          net_amount: number
        }[]
      }
      reject_withdrawal: {
        Args: { p_admin_notes?: string; p_reason: string; p_request_id: string }
        Returns: boolean
      }
      reset_all_investor_positions: {
        Args: { p_admin_id: string; p_confirmation_code: string }
        Returns: Json
      }
      send_daily_rate_notifications: {
        Args: { p_rate_date: string }
        Returns: number
      }
      set_fund_daily_aum: {
        Args: {
          p_aum_date: string
          p_fund_id: string
          p_nav_per_share?: number
          p_total_aum: number
        }
        Returns: string
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
      update_fund_aum_baseline: {
        Args: { p_fund_id: string; p_new_baseline: number }
        Returns: boolean
      }
      update_investor_aum_percentages:
        | {
            Args: { p_fund_id: string }
            Returns: {
              error: true
            } & "Could not choose the best candidate function between: public.update_investor_aum_percentages(p_fund_id => text), public.update_investor_aum_percentages(p_fund_id => uuid). Try renaming the parameters or the function itself in the database so function overloading can be resolved"
          }
        | {
            Args: { p_fund_id: string }
            Returns: {
              error: true
            } & "Could not choose the best candidate function between: public.update_investor_aum_percentages(p_fund_id => text), public.update_investor_aum_percentages(p_fund_id => uuid). Try renaming the parameters or the function itself in the database so function overloading can be resolved"
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
      use_invite_code: {
        Args: { p_invite_code: string; p_user_id: string }
        Returns: boolean
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
    }
    Enums: {
      access_event:
        | "login"
        | "logout"
        | "2fa_setup"
        | "2fa_verify"
        | "session_revoked"
        | "password_change"
      app_role: "super_admin" | "admin" | "moderator" | "user"
      asset_code: "BTC" | "ETH" | "SOL" | "USDT" | "EURC" | "xAUT" | "XRP"
      aum_purpose: "reporting" | "transaction"
      benchmark_type: "BTC" | "ETH" | "STABLE" | "CUSTOM"
      document_type: "statement" | "notice" | "terms" | "tax" | "other"
      fee_kind: "mgmt" | "perf"
      fund_status: "active" | "inactive" | "suspended" | "deprecated"
      notification_priority: "low" | "medium" | "high"
      notification_type:
        | "deposit"
        | "statement"
        | "performance"
        | "system"
        | "support"
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
      transaction_type: "DEPOSIT" | "WITHDRAWAL" | "INTEREST" | "FEE"
      tx_type: "DEPOSIT" | "WITHDRAWAL" | "INTEREST" | "FEE" | "ADJUSTMENT"
      withdrawal_action:
        | "create"
        | "approve"
        | "reject"
        | "processing"
        | "complete"
        | "cancel"
        | "update"
      withdrawal_status:
        | "pending"
        | "approved"
        | "processing"
        | "completed"
        | "rejected"
        | "cancelled"
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
      app_role: ["super_admin", "admin", "moderator", "user"],
      asset_code: ["BTC", "ETH", "SOL", "USDT", "EURC", "xAUT", "XRP"],
      aum_purpose: ["reporting", "transaction"],
      benchmark_type: ["BTC", "ETH", "STABLE", "CUSTOM"],
      document_type: ["statement", "notice", "terms", "tax", "other"],
      fee_kind: ["mgmt", "perf"],
      fund_status: ["active", "inactive", "suspended", "deprecated"],
      notification_priority: ["low", "medium", "high"],
      notification_type: [
        "deposit",
        "statement",
        "performance",
        "system",
        "support",
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
      transaction_type: ["DEPOSIT", "WITHDRAWAL", "INTEREST", "FEE"],
      tx_type: ["DEPOSIT", "WITHDRAWAL", "INTEREST", "FEE", "ADJUSTMENT"],
      withdrawal_action: [
        "create",
        "approve",
        "reject",
        "processing",
        "complete",
        "cancel",
        "update",
      ],
      withdrawal_status: [
        "pending",
        "approved",
        "processing",
        "completed",
        "rejected",
        "cancelled",
      ],
    },
  },
} as const
