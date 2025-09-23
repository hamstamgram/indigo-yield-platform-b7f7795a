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
          ip: unknown | null
          success: boolean
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          device_label?: string | null
          event: Database["public"]["Enums"]["access_event"]
          id?: string
          ip?: unknown | null
          success?: boolean
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          device_label?: string | null
          event?: Database["public"]["Enums"]["access_event"]
          id?: string
          ip?: unknown | null
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
      admin_users: {
        Row: {
          granted_at: string
          granted_by: string | null
          revoked_at: string | null
          revoked_by: string | null
          user_id: string
        }
        Insert: {
          granted_at?: string
          granted_by?: string | null
          revoked_at?: string | null
          revoked_by?: string | null
          user_id: string
        }
        Update: {
          granted_at?: string
          granted_by?: string | null
          revoked_at?: string | null
          revoked_by?: string | null
          user_id?: string
        }
        Relationships: []
      }
      asset_prices: {
        Row: {
          as_of: string
          asset_id: string
          created_at: string
          high_24h: number | null
          low_24h: number | null
          market_cap: number | null
          price_usd: number
          source: string
          volume_24h: number | null
        }
        Insert: {
          as_of: string
          asset_id: string
          created_at?: string
          high_24h?: number | null
          low_24h?: number | null
          market_cap?: number | null
          price_usd: number
          source: string
          volume_24h?: number | null
        }
        Update: {
          as_of?: string
          asset_id?: string
          created_at?: string
          high_24h?: number | null
          low_24h?: number | null
          market_cap?: number | null
          price_usd?: number
          source?: string
          volume_24h?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "asset_prices_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets_v2"
            referencedColumns: ["asset_id"]
          },
        ]
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
      assets_v2: {
        Row: {
          asset_id: string
          chain: string | null
          coingecko_id: string | null
          created_at: string
          decimals: number
          is_active: boolean
          kind: string
          metadata: Json
          name: string
          price_source: string
          symbol: string
          updated_at: string
        }
        Insert: {
          asset_id: string
          chain?: string | null
          coingecko_id?: string | null
          created_at?: string
          decimals: number
          is_active?: boolean
          kind: string
          metadata?: Json
          name: string
          price_source?: string
          symbol: string
          updated_at?: string
        }
        Update: {
          asset_id?: string
          chain?: string | null
          coingecko_id?: string | null
          created_at?: string
          decimals?: number
          is_active?: boolean
          kind?: string
          metadata?: Json
          name?: string
          price_source?: string
          symbol?: string
          updated_at?: string
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
      daily_aum_entries: {
        Row: {
          asset_breakdown: Json | null
          created_at: string
          created_by: string | null
          entry_date: string
          fund_id: string | null
          id: string
          investor_count: number
          total_aum: number
        }
        Insert: {
          asset_breakdown?: Json | null
          created_at?: string
          created_by?: string | null
          entry_date: string
          fund_id?: string | null
          id?: string
          investor_count?: number
          total_aum?: number
        }
        Update: {
          asset_breakdown?: Json | null
          created_at?: string
          created_by?: string | null
          entry_date?: string
          fund_id?: string | null
          id?: string
          investor_count?: number
          total_aum?: number
        }
        Relationships: [
          {
            foreignKeyName: "daily_aum_entries_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "funds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_aum_entries_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "v_fund_kpis"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "daily_aum_entries_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "withdrawal_queue"
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
          nav_date: string
          nav_per_share: number | null
          net_return_pct: number | null
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
          nav_date: string
          nav_per_share?: number | null
          net_return_pct?: number | null
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
          nav_date?: string
          nav_per_share?: number | null
          net_return_pct?: number | null
          shares_outstanding?: number | null
          total_inflows?: number | null
          total_outflows?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "daily_nav_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "investor_directory"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "daily_nav_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
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
            referencedRelation: "v_fund_kpis"
            referencedColumns: ["fund_id"]
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
      daily_yield_applications: {
        Row: {
          application_date: string
          applied_at: string | null
          applied_by: string | null
          asset_code: string
          daily_yield_percentage: number
          id: string
          investors_affected: number
          total_aum: number
          total_yield_generated: number
        }
        Insert: {
          application_date: string
          applied_at?: string | null
          applied_by?: string | null
          asset_code: string
          daily_yield_percentage: number
          id?: string
          investors_affected?: number
          total_aum: number
          total_yield_generated: number
        }
        Update: {
          application_date?: string
          applied_at?: string | null
          applied_by?: string | null
          asset_code?: string
          daily_yield_percentage?: number
          id?: string
          investors_affected?: number
          total_aum?: number
          total_yield_generated?: number
        }
        Relationships: []
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
            referencedRelation: "investor_directory"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "data_edit_audit_edited_by_fkey"
            columns: ["edited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
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
            referencedRelation: "investor_directory"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "excel_import_log_imported_by_fkey"
            columns: ["imported_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
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
            referencedRelation: "investor_directory"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "fee_calculations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
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
            referencedRelation: "v_fund_kpis"
            referencedColumns: ["fund_id"]
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
            referencedRelation: "investor_directory"
            referencedColumns: ["investor_id"]
          },
          {
            foreignKeyName: "fee_calculations_investor_id_fkey"
            columns: ["investor_id"]
            isOneToOne: false
            referencedRelation: "investors"
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
            foreignKeyName: "fee_calculations_investor_id_fkey"
            columns: ["investor_id"]
            isOneToOne: false
            referencedRelation: "withdrawal_queue"
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
          kind: Database["public"]["Enums"]["fee_kind"]
          period_month: number | null
          period_year: number | null
          user_id: string
        }
        Insert: {
          amount: number
          asset_code: Database["public"]["Enums"]["asset_code"]
          created_at?: string
          created_by?: string | null
          id?: string
          kind: Database["public"]["Enums"]["fee_kind"]
          period_month?: number | null
          period_year?: number | null
          user_id: string
        }
        Update: {
          amount?: number
          asset_code?: Database["public"]["Enums"]["asset_code"]
          created_at?: string
          created_by?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["fee_kind"]
          period_month?: number | null
          period_year?: number | null
          user_id?: string
        }
        Relationships: []
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
            referencedRelation: "investor_directory"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "import_locks_locked_by_fkey"
            columns: ["locked_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "import_locks_unlocked_by_fkey"
            columns: ["unlocked_by"]
            isOneToOne: false
            referencedRelation: "investor_directory"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "import_locks_unlocked_by_fkey"
            columns: ["unlocked_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
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
            foreignKeyName: "investor_monthly_reports_investor_id_fkey"
            columns: ["investor_id"]
            isOneToOne: false
            referencedRelation: "investor_directory"
            referencedColumns: ["investor_id"]
          },
          {
            foreignKeyName: "investor_monthly_reports_investor_id_fkey"
            columns: ["investor_id"]
            isOneToOne: false
            referencedRelation: "investors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "investor_monthly_reports_investor_id_fkey"
            columns: ["investor_id"]
            isOneToOne: false
            referencedRelation: "v_investor_kpis"
            referencedColumns: ["investor_id"]
          },
          {
            foreignKeyName: "investor_monthly_reports_investor_id_fkey"
            columns: ["investor_id"]
            isOneToOne: false
            referencedRelation: "withdrawal_queue"
            referencedColumns: ["investor_id"]
          },
        ]
      }
      investor_positions: {
        Row: {
          cost_basis: number
          current_value: number
          fund_class: string | null
          fund_id: string
          high_water_mark: number | null
          investor_id: string
          last_modified_at: string | null
          last_modified_by: string | null
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
          cost_basis?: number
          current_value?: number
          fund_class?: string | null
          fund_id: string
          high_water_mark?: number | null
          investor_id: string
          last_modified_at?: string | null
          last_modified_by?: string | null
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
          cost_basis?: number
          current_value?: number
          fund_class?: string | null
          fund_id?: string
          high_water_mark?: number | null
          investor_id?: string
          last_modified_at?: string | null
          last_modified_by?: string | null
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
            referencedRelation: "v_fund_kpis"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "investor_positions_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "withdrawal_queue"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "investor_positions_investor_id_fkey"
            columns: ["investor_id"]
            isOneToOne: false
            referencedRelation: "investor_directory"
            referencedColumns: ["investor_id"]
          },
          {
            foreignKeyName: "investor_positions_investor_id_fkey"
            columns: ["investor_id"]
            isOneToOne: false
            referencedRelation: "investors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "investor_positions_investor_id_fkey"
            columns: ["investor_id"]
            isOneToOne: false
            referencedRelation: "v_investor_kpis"
            referencedColumns: ["investor_id"]
          },
          {
            foreignKeyName: "investor_positions_investor_id_fkey"
            columns: ["investor_id"]
            isOneToOne: false
            referencedRelation: "withdrawal_queue"
            referencedColumns: ["investor_id"]
          },
        ]
      }
      investors: {
        Row: {
          accredited: boolean | null
          aml_status: string | null
          created_at: string | null
          email: string
          entity_type: string | null
          id: string
          kyc_date: string | null
          kyc_status: string | null
          name: string
          onboarding_date: string | null
          phone: string | null
          profile_id: string | null
          status: string
          tax_id: string | null
          updated_at: string | null
        }
        Insert: {
          accredited?: boolean | null
          aml_status?: string | null
          created_at?: string | null
          email: string
          entity_type?: string | null
          id?: string
          kyc_date?: string | null
          kyc_status?: string | null
          name: string
          onboarding_date?: string | null
          phone?: string | null
          profile_id?: string | null
          status?: string
          tax_id?: string | null
          updated_at?: string | null
        }
        Update: {
          accredited?: boolean | null
          aml_status?: string | null
          created_at?: string | null
          email?: string
          entity_type?: string | null
          id?: string
          kyc_date?: string | null
          kyc_status?: string | null
          name?: string
          onboarding_date?: string | null
          phone?: string | null
          profile_id?: string | null
          status?: string
          tax_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "investors_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "investor_directory"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "investors_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
      portfolio_members: {
        Row: {
          granted_at: string
          granted_by: string | null
          portfolio_id: string
          role: string
          user_id: string
        }
        Insert: {
          granted_at?: string
          granted_by?: string | null
          portfolio_id: string
          role?: string
          user_id: string
        }
        Update: {
          granted_at?: string
          granted_by?: string | null
          portfolio_id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "portfolio_members_portfolio_id_fkey"
            columns: ["portfolio_id"]
            isOneToOne: false
            referencedRelation: "admin_portfolio_overview_v"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portfolio_members_portfolio_id_fkey"
            columns: ["portfolio_id"]
            isOneToOne: false
            referencedRelation: "portfolio_overview_v"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portfolio_members_portfolio_id_fkey"
            columns: ["portfolio_id"]
            isOneToOne: false
            referencedRelation: "portfolios_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portfolio_members_portfolio_id_fkey"
            columns: ["portfolio_id"]
            isOneToOne: false
            referencedRelation: "positions_current_v"
            referencedColumns: ["portfolio_id"]
          },
        ]
      }
      portfolio_nav_snapshots: {
        Row: {
          as_of: string
          created_at: string
          details: Json
          nav_usd: number
          portfolio_id: string
        }
        Insert: {
          as_of: string
          created_at?: string
          details: Json
          nav_usd: number
          portfolio_id: string
        }
        Update: {
          as_of?: string
          created_at?: string
          details?: Json
          nav_usd?: number
          portfolio_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "portfolio_nav_snapshots_portfolio_id_fkey"
            columns: ["portfolio_id"]
            isOneToOne: false
            referencedRelation: "admin_portfolio_overview_v"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portfolio_nav_snapshots_portfolio_id_fkey"
            columns: ["portfolio_id"]
            isOneToOne: false
            referencedRelation: "portfolio_overview_v"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portfolio_nav_snapshots_portfolio_id_fkey"
            columns: ["portfolio_id"]
            isOneToOne: false
            referencedRelation: "portfolios_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portfolio_nav_snapshots_portfolio_id_fkey"
            columns: ["portfolio_id"]
            isOneToOne: false
            referencedRelation: "positions_current_v"
            referencedColumns: ["portfolio_id"]
          },
        ]
      }
      portfolios_v2: {
        Row: {
          base_currency: string
          created_at: string
          id: string
          inception_date: string
          metadata: Json
          name: string
          owner_user_id: string
          status: string
          updated_at: string
        }
        Insert: {
          base_currency?: string
          created_at?: string
          id?: string
          inception_date?: string
          metadata?: Json
          name: string
          owner_user_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          base_currency?: string
          created_at?: string
          id?: string
          inception_date?: string
          metadata?: Json
          name?: string
          owner_user_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      positions: {
        Row: {
          asset_code: Database["public"]["Enums"]["asset_code"]
          current_balance: number
          id: string
          last_modified_at: string | null
          last_modified_by: string | null
          principal: number
          total_earned: number
          updated_at: string
          user_id: string
        }
        Insert: {
          asset_code: Database["public"]["Enums"]["asset_code"]
          current_balance?: number
          id?: string
          last_modified_at?: string | null
          last_modified_by?: string | null
          principal?: number
          total_earned?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          asset_code?: Database["public"]["Enums"]["asset_code"]
          current_balance?: number
          id?: string
          last_modified_at?: string | null
          last_modified_by?: string | null
          principal?: number
          total_earned?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          fee_percentage: number | null
          first_name: string | null
          full_name: string | null
          id: string
          is_admin: boolean
          last_name: string | null
          phone: string | null
          status: string | null
          totp_enabled: boolean | null
          totp_verified: boolean | null
          updated_at: string
          user_type: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          fee_percentage?: number | null
          first_name?: string | null
          full_name?: string | null
          id: string
          is_admin?: boolean
          last_name?: string | null
          phone?: string | null
          status?: string | null
          totp_enabled?: boolean | null
          totp_verified?: boolean | null
          updated_at?: string
          user_type?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          fee_percentage?: number | null
          first_name?: string | null
          full_name?: string | null
          id?: string
          is_admin?: boolean
          last_name?: string | null
          phone?: string | null
          status?: string | null
          totp_enabled?: boolean | null
          totp_verified?: boolean | null
          updated_at?: string
          user_type?: string | null
        }
        Relationships: []
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
            referencedRelation: "v_fund_kpis"
            referencedColumns: ["fund_id"]
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
            referencedRelation: "investor_directory"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "reconciliation_reconciled_by_fkey"
            columns: ["reconciled_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
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
      statements: {
        Row: {
          additions: number
          asset_code: Database["public"]["Enums"]["asset_code"]
          begin_balance: number
          created_at: string
          end_balance: number
          file_path: string | null
          fund_code: string | null
          id: string
          month: number | null
          net_income: number
          period_month: number
          period_year: number
          rate_of_return_itd: number | null
          rate_of_return_mtd: number | null
          rate_of_return_qtd: number | null
          rate_of_return_ytd: number | null
          redemptions: number
          signed_url: string | null
          storage_path: string | null
          url_expires_at: string | null
          user_id: string
          year: number | null
        }
        Insert: {
          additions: number
          asset_code: Database["public"]["Enums"]["asset_code"]
          begin_balance: number
          created_at?: string
          end_balance: number
          file_path?: string | null
          fund_code?: string | null
          id?: string
          month?: number | null
          net_income: number
          period_month: number
          period_year: number
          rate_of_return_itd?: number | null
          rate_of_return_mtd?: number | null
          rate_of_return_qtd?: number | null
          rate_of_return_ytd?: number | null
          redemptions: number
          signed_url?: string | null
          storage_path?: string | null
          url_expires_at?: string | null
          user_id: string
          year?: number | null
        }
        Update: {
          additions?: number
          asset_code?: Database["public"]["Enums"]["asset_code"]
          begin_balance?: number
          created_at?: string
          end_balance?: number
          file_path?: string | null
          fund_code?: string | null
          id?: string
          month?: number | null
          net_income?: number
          period_month?: number
          period_year?: number
          rate_of_return_itd?: number | null
          rate_of_return_mtd?: number | null
          rate_of_return_qtd?: number | null
          rate_of_return_ytd?: number | null
          redemptions?: number
          signed_url?: string | null
          storage_path?: string | null
          url_expires_at?: string | null
          user_id?: string
          year?: number | null
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
            referencedRelation: "investor_directory"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "system_config_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          amount: number
          asset_code: Database["public"]["Enums"]["asset_code"]
          confirmed_at: string | null
          created_at: string
          created_by: string | null
          id: string
          note: string | null
          status: Database["public"]["Enums"]["transaction_status"]
          tx_hash: string | null
          type: Database["public"]["Enums"]["transaction_type"]
          user_id: string
        }
        Insert: {
          amount: number
          asset_code: Database["public"]["Enums"]["asset_code"]
          confirmed_at?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          note?: string | null
          status?: Database["public"]["Enums"]["transaction_status"]
          tx_hash?: string | null
          type: Database["public"]["Enums"]["transaction_type"]
          user_id: string
        }
        Update: {
          amount?: number
          asset_code?: Database["public"]["Enums"]["asset_code"]
          confirmed_at?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          note?: string | null
          status?: Database["public"]["Enums"]["transaction_status"]
          tx_hash?: string | null
          type?: Database["public"]["Enums"]["transaction_type"]
          user_id?: string
        }
        Relationships: []
      }
      transactions_v2: {
        Row: {
          amount: number
          approved_at: string | null
          approved_by: string | null
          asset: string
          asset_id: string | null
          balance_after: number | null
          balance_before: number | null
          created_at: string | null
          created_by: string | null
          fund_class: string | null
          fund_id: string
          id: string
          investor_id: string
          notes: string | null
          occurred_at: string
          portfolio_id: string | null
          price_per_unit: number | null
          quantity: number | null
          ref_code: string | null
          reference_id: string | null
          total_value: number | null
          tx_date: string
          tx_hash: string | null
          txn_type: string | null
          type: Database["public"]["Enums"]["tx_type"]
          value_date: string
        }
        Insert: {
          amount: number
          approved_at?: string | null
          approved_by?: string | null
          asset: string
          asset_id?: string | null
          balance_after?: number | null
          balance_before?: number | null
          created_at?: string | null
          created_by?: string | null
          fund_class?: string | null
          fund_id: string
          id?: string
          investor_id: string
          notes?: string | null
          occurred_at?: string
          portfolio_id?: string | null
          price_per_unit?: number | null
          quantity?: number | null
          ref_code?: string | null
          reference_id?: string | null
          total_value?: number | null
          tx_date?: string
          tx_hash?: string | null
          txn_type?: string | null
          type: Database["public"]["Enums"]["tx_type"]
          value_date?: string
        }
        Update: {
          amount?: number
          approved_at?: string | null
          approved_by?: string | null
          asset?: string
          asset_id?: string | null
          balance_after?: number | null
          balance_before?: number | null
          created_at?: string | null
          created_by?: string | null
          fund_class?: string | null
          fund_id?: string
          id?: string
          investor_id?: string
          notes?: string | null
          occurred_at?: string
          portfolio_id?: string | null
          price_per_unit?: number | null
          quantity?: number | null
          ref_code?: string | null
          reference_id?: string | null
          total_value?: number | null
          tx_date?: string
          tx_hash?: string | null
          txn_type?: string | null
          type?: Database["public"]["Enums"]["tx_type"]
          value_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_v2_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "investor_directory"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "transactions_v2_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_v2_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets_v2"
            referencedColumns: ["asset_id"]
          },
          {
            foreignKeyName: "transactions_v2_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "investor_directory"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "transactions_v2_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
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
            referencedRelation: "v_fund_kpis"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "transactions_v2_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "withdrawal_queue"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "transactions_v2_investor_id_fkey"
            columns: ["investor_id"]
            isOneToOne: false
            referencedRelation: "investor_directory"
            referencedColumns: ["investor_id"]
          },
          {
            foreignKeyName: "transactions_v2_investor_id_fkey"
            columns: ["investor_id"]
            isOneToOne: false
            referencedRelation: "investors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_v2_investor_id_fkey"
            columns: ["investor_id"]
            isOneToOne: false
            referencedRelation: "v_investor_kpis"
            referencedColumns: ["investor_id"]
          },
          {
            foreignKeyName: "transactions_v2_investor_id_fkey"
            columns: ["investor_id"]
            isOneToOne: false
            referencedRelation: "withdrawal_queue"
            referencedColumns: ["investor_id"]
          },
          {
            foreignKeyName: "transactions_v2_portfolio_id_fkey"
            columns: ["portfolio_id"]
            isOneToOne: false
            referencedRelation: "admin_portfolio_overview_v"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_v2_portfolio_id_fkey"
            columns: ["portfolio_id"]
            isOneToOne: false
            referencedRelation: "portfolio_overview_v"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_v2_portfolio_id_fkey"
            columns: ["portfolio_id"]
            isOneToOne: false
            referencedRelation: "portfolios_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_v2_portfolio_id_fkey"
            columns: ["portfolio_id"]
            isOneToOne: false
            referencedRelation: "positions_current_v"
            referencedColumns: ["portfolio_id"]
          },
        ]
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
          ip_address: unknown | null
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
          ip_address?: unknown | null
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
          ip_address?: unknown | null
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
      user_sessions: {
        Row: {
          created_at: string
          device_label: string | null
          id: string
          ip: unknown | null
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
          ip?: unknown | null
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
          ip?: unknown | null
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
            referencedRelation: "investor_directory"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "withdrawal_audit_logs_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
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
          investor_id: string
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
          investor_id: string
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
          investor_id?: string
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
            foreignKeyName: "withdrawal_requests_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "investor_directory"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "withdrawal_requests_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "withdrawal_requests_cancelled_by_fkey"
            columns: ["cancelled_by"]
            isOneToOne: false
            referencedRelation: "investor_directory"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "withdrawal_requests_cancelled_by_fkey"
            columns: ["cancelled_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "withdrawal_requests_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "investor_directory"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "withdrawal_requests_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
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
            referencedRelation: "v_fund_kpis"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "withdrawal_requests_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "withdrawal_queue"
            referencedColumns: ["fund_id"]
          },
          {
            foreignKeyName: "withdrawal_requests_investor_id_fkey"
            columns: ["investor_id"]
            isOneToOne: false
            referencedRelation: "investor_directory"
            referencedColumns: ["investor_id"]
          },
          {
            foreignKeyName: "withdrawal_requests_investor_id_fkey"
            columns: ["investor_id"]
            isOneToOne: false
            referencedRelation: "investors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "withdrawal_requests_investor_id_fkey"
            columns: ["investor_id"]
            isOneToOne: false
            referencedRelation: "v_investor_kpis"
            referencedColumns: ["investor_id"]
          },
          {
            foreignKeyName: "withdrawal_requests_investor_id_fkey"
            columns: ["investor_id"]
            isOneToOne: false
            referencedRelation: "withdrawal_queue"
            referencedColumns: ["investor_id"]
          },
          {
            foreignKeyName: "withdrawal_requests_rejected_by_fkey"
            columns: ["rejected_by"]
            isOneToOne: false
            referencedRelation: "investor_directory"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "withdrawal_requests_rejected_by_fkey"
            columns: ["rejected_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      yield_distribution_log: {
        Row: {
          application_date: string
          asset_code: string
          balance_after: number
          balance_before: number
          created_at: string | null
          daily_yield_application_id: string | null
          id: string
          percentage_owned: number
          user_id: string
          yield_amount: number
        }
        Insert: {
          application_date: string
          asset_code: string
          balance_after: number
          balance_before: number
          created_at?: string | null
          daily_yield_application_id?: string | null
          id?: string
          percentage_owned: number
          user_id: string
          yield_amount: number
        }
        Update: {
          application_date?: string
          asset_code?: string
          balance_after?: number
          balance_before?: number
          created_at?: string | null
          daily_yield_application_id?: string | null
          id?: string
          percentage_owned?: number
          user_id?: string
          yield_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "yield_distribution_log_daily_yield_application_id_fkey"
            columns: ["daily_yield_application_id"]
            isOneToOne: false
            referencedRelation: "daily_yield_applications"
            referencedColumns: ["id"]
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
      yield_sources: {
        Row: {
          asset_code: string
          created_at: string | null
          current_balance: number
          id: string
          last_updated: string | null
          percentage_of_aum: number
          user_id: string
        }
        Insert: {
          asset_code: string
          created_at?: string | null
          current_balance?: number
          id?: string
          last_updated?: string | null
          percentage_of_aum?: number
          user_id: string
        }
        Update: {
          asset_code?: string
          created_at?: string | null
          current_balance?: number
          id?: string
          last_updated?: string | null
          percentage_of_aum?: number
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      admin_portfolio_overview_v: {
        Row: {
          asset_count: number | null
          base_currency: string | null
          created_at: string | null
          email: string | null
          first_name: string | null
          full_name: string | null
          id: string | null
          inception_date: string | null
          last_name: string | null
          metadata: Json | null
          name: string | null
          owner_user_id: string | null
          status: string | null
          total_value_usd: number | null
          updated_at: string | null
        }
        Relationships: []
      }
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
      investor_directory: {
        Row: {
          aml_status: string | null
          created_at: string | null
          email: string | null
          fee_percentage: number | null
          first_name: string | null
          investor_id: string | null
          investor_name: string | null
          investor_status: string | null
          kyc_status: string | null
          last_name: string | null
          profile_id: string | null
        }
        Relationships: []
      }
      investor_positions_by_class: {
        Row: {
          fund_class: string | null
          fund_count: number | null
          investor_id: string | null
          latest_transaction: string | null
          total_cost_basis: number | null
          total_current_value: number | null
          total_mgmt_fees: number | null
          total_perf_fees: number | null
          total_realized_pnl: number | null
          total_shares: number | null
          total_unrealized_pnl: number | null
        }
        Relationships: [
          {
            foreignKeyName: "investor_positions_investor_id_fkey"
            columns: ["investor_id"]
            isOneToOne: false
            referencedRelation: "investor_directory"
            referencedColumns: ["investor_id"]
          },
          {
            foreignKeyName: "investor_positions_investor_id_fkey"
            columns: ["investor_id"]
            isOneToOne: false
            referencedRelation: "investors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "investor_positions_investor_id_fkey"
            columns: ["investor_id"]
            isOneToOne: false
            referencedRelation: "v_investor_kpis"
            referencedColumns: ["investor_id"]
          },
          {
            foreignKeyName: "investor_positions_investor_id_fkey"
            columns: ["investor_id"]
            isOneToOne: false
            referencedRelation: "withdrawal_queue"
            referencedColumns: ["investor_id"]
          },
        ]
      }
      portfolio_overview_v: {
        Row: {
          asset_count: number | null
          created_at: string | null
          id: string | null
          inception_date: string | null
          name: string | null
          owner_user_id: string | null
          status: string | null
          total_value_usd: number | null
          updated_at: string | null
        }
        Relationships: []
      }
      positions_current_v: {
        Row: {
          asset_id: string | null
          asset_name: string | null
          last_price_usd: number | null
          owner_user_id: string | null
          portfolio_id: string | null
          portfolio_name: string | null
          quantity: number | null
          symbol: string | null
          value_usd: number | null
        }
        Relationships: []
      }
      v_fund_kpis: {
        Row: {
          active_investors: number | null
          asset: string | null
          code: string | null
          current_aum: number | null
          day_return_pct: number | null
          fund_id: string | null
          itd_return: number | null
          mtd_return: number | null
          name: string | null
          qtd_return: number | null
          ytd_return: number | null
        }
        Insert: {
          active_investors?: never
          asset?: string | null
          code?: string | null
          current_aum?: never
          day_return_pct?: never
          fund_id?: string | null
          itd_return?: never
          mtd_return?: never
          name?: string | null
          qtd_return?: never
          ytd_return?: never
        }
        Update: {
          active_investors?: never
          asset?: string | null
          code?: string | null
          current_aum?: never
          day_return_pct?: never
          fund_id?: string | null
          itd_return?: never
          mtd_return?: never
          name?: string | null
          qtd_return?: never
          ytd_return?: never
        }
        Relationships: []
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
            referencedRelation: "v_fund_kpis"
            referencedColumns: ["fund_id"]
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
        Relationships: []
      }
    }
    Functions: {
      apply_daily_yield: {
        Args: {
          p_application_date?: string
          p_asset_code: string
          p_daily_yield_percentage: number
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
      calculate_positions: {
        Args: { p_portfolio_id: string }
        Returns: {
          asset_id: string
          last_price_usd: number
          quantity: number
          value_usd: number
        }[]
      }
      can_access_notification: {
        Args: { notification_id: string }
        Returns: boolean
      }
      can_access_user: {
        Args: { user_uuid: string }
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
      check_is_admin: {
        Args: { user_id: string }
        Returns: boolean
      }
      complete_withdrawal: {
        Args: {
          p_admin_notes?: string
          p_request_id: string
          p_tx_hash?: string
        }
        Returns: boolean
      }
      create_daily_aum_entry: {
        Args: { p_entry_date?: string; p_fund_id?: string }
        Returns: Json
      }
      create_investor_profile: {
        Args: {
          p_email: string
          p_first_name: string
          p_last_name: string
          p_phone?: string
          p_send_invite?: boolean
        }
        Returns: Json
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
      encrypt_totp_secret: {
        Args: { secret_text: string }
        Returns: string
      }
      ensure_admin: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      fund_period_return: {
        Args: { d1: string; d2: string; f: string; net?: boolean }
        Returns: number
      }
      generate_document_path: {
        Args: { document_type: string; filename: string; user_id: string }
        Returns: string
      }
      generate_historical_statements: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      generate_monthly_report_template: {
        Args: { p_investor_id?: string; p_month?: string }
        Returns: Json
      }
      generate_statement_data: {
        Args: {
          p_investor_id: string
          p_period_month: number
          p_period_year: number
        }
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
      get_24h_interest: {
        Args: Record<PropertyKey, never>
        Returns: {
          interest: number
        }[]
      }
      get_admin_name: {
        Args: { admin_id: string }
        Returns: string
      }
      get_all_investors_with_details: {
        Args: Record<PropertyKey, never>
        Returns: {
          aml_status: string
          created_at: string
          email: string
          first_name: string
          id: string
          investor_status: string
          kyc_status: string
          last_name: string
          phone: string
          status: string
        }[]
      }
      get_all_investors_with_summary: {
        Args: Record<PropertyKey, never>
        Returns: {
          email: string
          first_name: string
          id: string
          last_name: string
          last_statement_date: string
          total_aum: number
        }[]
      }
      get_all_non_admin_profiles: {
        Args: Record<PropertyKey, never>
        Returns: {
          created_at: string
          email: string
          fee_percentage: number
          first_name: string
          id: string
          last_name: string
        }[]
      }
      get_investor_count: {
        Args: Record<PropertyKey, never>
        Returns: {
          count: number
        }[]
      }
      get_investor_portfolio_summary: {
        Args: { p_investor_id: string }
        Returns: {
          last_statement_date: string
          portfolio_count: number
          total_aum: number
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
      get_pending_withdrawals: {
        Args: Record<PropertyKey, never>
        Returns: {
          count: number
        }[]
      }
      get_profile_basic: {
        Args: { user_id: string }
        Returns: {
          first_name: string
          last_name: string
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
      get_total_aum: {
        Args: Record<PropertyKey, never>
        Returns: {
          total_aum: number
        }[]
      }
      get_user_admin_status: {
        Args: { user_id: string }
        Returns: boolean
      }
      get_user_portfolio_summary: {
        Args: { p_user_id: string }
        Returns: {
          last_statement_date: string
          portfolio_count: number
          total_aum: number
        }[]
      }
      has_portfolio_access: {
        Args: { p_portfolio_id: string }
        Returns: boolean
      }
      is_2fa_required: {
        Args: { p_user_id: string }
        Returns: boolean
      }
      is_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      is_admin_safe: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      is_admin_secure: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      is_admin_v2: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      is_import_enabled: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      is_valid_share_token: {
        Args: { token_value: string }
        Returns: boolean
      }
      is_within_edit_window: {
        Args: { p_created_at: string }
        Returns: boolean
      }
      lock_imports: {
        Args: { p_reason?: string }
        Returns: string
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
      log_withdrawal_action: {
        Args: {
          p_action: Database["public"]["Enums"]["withdrawal_action"]
          p_details?: Json
          p_request_id: string
        }
        Returns: undefined
      }
      migrate_legacy_positions: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      migrate_legacy_positions_temp: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      migrate_legacy_to_new_system: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      populate_yield_sources: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      populate_yield_sources_simple: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      populate_yield_sources_temp: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      process_excel_import_with_classes: {
        Args: { p_data: Json; p_import_type?: string }
        Returns: Json
      }
      recalculate_aum_percentages: {
        Args: { p_asset_code: string }
        Returns: boolean
      }
      reject_withdrawal: {
        Args: { p_admin_notes?: string; p_reason: string; p_request_id: string }
        Returns: boolean
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
        Args: Record<PropertyKey, never>
        Returns: {
          details: string
          result: boolean
          test_name: string
        }[]
      }
      unlock_imports: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      update_user_profile_secure: {
        Args: {
          p_first_name?: string
          p_last_name?: string
          p_phone?: string
          p_status?: string
          p_user_id: string
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
      asset_code: "BTC" | "ETH" | "SOL" | "USDT" | "USDC" | "EURC"
      benchmark_type: "BTC" | "ETH" | "STABLE" | "CUSTOM"
      document_type: "statement" | "notice" | "terms" | "tax" | "other"
      fee_kind: "mgmt" | "perf"
      fund_status: "active" | "inactive" | "suspended"
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
      asset_code: ["BTC", "ETH", "SOL", "USDT", "USDC", "EURC"],
      benchmark_type: ["BTC", "ETH", "STABLE", "CUSTOM"],
      document_type: ["statement", "notice", "terms", "tax", "other"],
      fee_kind: ["mgmt", "perf"],
      fund_status: ["active", "inactive", "suspended"],
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
