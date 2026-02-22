export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1";
  };
  public: {
    Tables: {
      admin_alerts: {
        Row: {
          acknowledged_at: string | null;
          acknowledged_by: string | null;
          alert_type: string;
          created_at: string;
          id: string;
          message: string | null;
          metadata: Json | null;
          notification_channel: string | null;
          notification_sent_at: string | null;
          related_run_id: string | null;
          severity: string;
          title: string;
        };
        Insert: {
          acknowledged_at?: string | null;
          acknowledged_by?: string | null;
          alert_type: string;
          created_at?: string;
          id?: string;
          message?: string | null;
          metadata?: Json | null;
          notification_channel?: string | null;
          notification_sent_at?: string | null;
          related_run_id?: string | null;
          severity: string;
          title: string;
        };
        Update: {
          acknowledged_at?: string | null;
          acknowledged_by?: string | null;
          alert_type?: string;
          created_at?: string;
          id?: string;
          message?: string | null;
          metadata?: Json | null;
          notification_channel?: string | null;
          notification_sent_at?: string | null;
          related_run_id?: string | null;
          severity?: string;
          title?: string;
        };
        Relationships: [
          {
            foreignKeyName: "admin_alerts_acknowledged_by_fkey";
            columns: ["acknowledged_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "admin_alerts_related_run_id_fkey";
            columns: ["related_run_id"];
            isOneToOne: false;
            referencedRelation: "admin_integrity_runs";
            referencedColumns: ["id"];
          },
        ];
      };
      admin_integrity_runs: {
        Row: {
          context: string | null;
          created_by: string | null;
          id: string;
          run_at: string;
          runtime_ms: number | null;
          scope_fund_id: string | null;
          scope_investor_id: string | null;
          status: string;
          triggered_by: string;
          violations: Json | null;
        };
        Insert: {
          context?: string | null;
          created_by?: string | null;
          id?: string;
          run_at?: string;
          runtime_ms?: number | null;
          scope_fund_id?: string | null;
          scope_investor_id?: string | null;
          status: string;
          triggered_by?: string;
          violations?: Json | null;
        };
        Update: {
          context?: string | null;
          created_by?: string | null;
          id?: string;
          run_at?: string;
          runtime_ms?: number | null;
          scope_fund_id?: string | null;
          scope_investor_id?: string | null;
          status?: string;
          triggered_by?: string;
          violations?: Json | null;
        };
        Relationships: [
          {
            foreignKeyName: "admin_integrity_runs_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "admin_integrity_runs_scope_fund_id_fkey";
            columns: ["scope_fund_id"];
            isOneToOne: false;
            referencedRelation: "aum_position_reconciliation";
            referencedColumns: ["fund_id"];
          },
          {
            foreignKeyName: "admin_integrity_runs_scope_fund_id_fkey";
            columns: ["scope_fund_id"];
            isOneToOne: false;
            referencedRelation: "fund_aum_mismatch";
            referencedColumns: ["fund_id"];
          },
          {
            foreignKeyName: "admin_integrity_runs_scope_fund_id_fkey";
            columns: ["scope_fund_id"];
            isOneToOne: false;
            referencedRelation: "funds";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "admin_integrity_runs_scope_fund_id_fkey";
            columns: ["scope_fund_id"];
            isOneToOne: false;
            referencedRelation: "v_crystallization_dashboard";
            referencedColumns: ["fund_id"];
          },
          {
            foreignKeyName: "admin_integrity_runs_scope_fund_id_fkey";
            columns: ["scope_fund_id"];
            isOneToOne: false;
            referencedRelation: "v_fund_aum_position_health";
            referencedColumns: ["fund_id"];
          },
          {
            foreignKeyName: "admin_integrity_runs_scope_fund_id_fkey";
            columns: ["scope_fund_id"];
            isOneToOne: false;
            referencedRelation: "v_liquidity_risk";
            referencedColumns: ["fund_id"];
          },
          {
            foreignKeyName: "admin_integrity_runs_scope_investor_id_fkey";
            columns: ["scope_investor_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      assets: {
        Row: {
          created_at: string;
          decimal_places: number;
          icon_url: string | null;
          id: number;
          is_active: boolean;
          name: string;
          symbol: Database["public"]["Enums"]["asset_code"];
        };
        Insert: {
          created_at?: string;
          decimal_places?: number;
          icon_url?: string | null;
          id?: number;
          is_active?: boolean;
          name: string;
          symbol: Database["public"]["Enums"]["asset_code"];
        };
        Update: {
          created_at?: string;
          decimal_places?: number;
          icon_url?: string | null;
          id?: number;
          is_active?: boolean;
          name?: string;
          symbol?: Database["public"]["Enums"]["asset_code"];
        };
        Relationships: [];
      };
      audit_log: {
        Row: {
          action: string;
          actor_user: string | null;
          created_at: string;
          entity: string;
          entity_id: string | null;
          id: string;
          meta: Json | null;
          new_values: Json | null;
          old_values: Json | null;
        };
        Insert: {
          action: string;
          actor_user?: string | null;
          created_at?: string;
          entity: string;
          entity_id?: string | null;
          id?: string;
          meta?: Json | null;
          new_values?: Json | null;
          old_values?: Json | null;
        };
        Update: {
          action?: string;
          actor_user?: string | null;
          created_at?: string;
          entity?: string;
          entity_id?: string | null;
          id?: string;
          meta?: Json | null;
          new_values?: Json | null;
          old_values?: Json | null;
        };
        Relationships: [];
      };
      data_edit_audit: {
        Row: {
          changed_fields: string[] | null;
          edit_source: string | null;
          edited_at: string | null;
          edited_by: string | null;
          id: string;
          import_id: string | null;
          import_related: boolean | null;
          new_data: Json | null;
          old_data: Json | null;
          operation: string | null;
          record_id: string;
          table_name: string;
          voided_record: boolean | null;
        };
        Insert: {
          changed_fields?: string[] | null;
          edit_source?: string | null;
          edited_at?: string | null;
          edited_by?: string | null;
          id?: string;
          import_id?: string | null;
          import_related?: boolean | null;
          new_data?: Json | null;
          old_data?: Json | null;
          operation?: string | null;
          record_id: string;
          table_name: string;
          voided_record?: boolean | null;
        };
        Update: {
          changed_fields?: string[] | null;
          edit_source?: string | null;
          edited_at?: string | null;
          edited_by?: string | null;
          id?: string;
          import_id?: string | null;
          import_related?: boolean | null;
          new_data?: Json | null;
          old_data?: Json | null;
          operation?: string | null;
          record_id?: string;
          table_name?: string;
          voided_record?: boolean | null;
        };
        Relationships: [
          {
            foreignKeyName: "data_edit_audit_edited_by_fkey";
            columns: ["edited_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      documents: {
        Row: {
          checksum: string | null;
          created_at: string;
          created_by: string | null;
          created_by_profile_id: string | null;
          fund_id: string | null;
          id: string;
          period_end: string | null;
          period_start: string | null;
          storage_path: string;
          title: string;
          type: Database["public"]["Enums"]["document_type"];
          user_id: string;
          user_profile_id: string | null;
        };
        Insert: {
          checksum?: string | null;
          created_at?: string;
          created_by?: string | null;
          created_by_profile_id?: string | null;
          fund_id?: string | null;
          id?: string;
          period_end?: string | null;
          period_start?: string | null;
          storage_path: string;
          title: string;
          type: Database["public"]["Enums"]["document_type"];
          user_id: string;
          user_profile_id?: string | null;
        };
        Update: {
          checksum?: string | null;
          created_at?: string;
          created_by?: string | null;
          created_by_profile_id?: string | null;
          fund_id?: string | null;
          id?: string;
          period_end?: string | null;
          period_start?: string | null;
          storage_path?: string;
          title?: string;
          type?: Database["public"]["Enums"]["document_type"];
          user_id?: string;
          user_profile_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "fk_documents_created_by_profile";
            columns: ["created_by_profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "fk_documents_user_profile";
            columns: ["user_profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      error_code_metadata: {
        Row: {
          category: string;
          created_at: string;
          default_message: string;
          error_code: string;
          is_retryable: boolean;
          severity: string;
          ui_action: string | null;
          user_action_hint: string | null;
        };
        Insert: {
          category: string;
          created_at?: string;
          default_message: string;
          error_code: string;
          is_retryable?: boolean;
          severity?: string;
          ui_action?: string | null;
          user_action_hint?: string | null;
        };
        Update: {
          category?: string;
          created_at?: string;
          default_message?: string;
          error_code?: string;
          is_retryable?: boolean;
          severity?: string;
          ui_action?: string | null;
          user_action_hint?: string | null;
        };
        Relationships: [];
      };
      fee_allocations: {
        Row: {
          base_net_income: number;
          created_at: string | null;
          created_by: string | null;
          credit_transaction_id: string | null;
          debit_transaction_id: string | null;
          distribution_id: string;
          fee_amount: number;
          fee_percentage: number;
          fees_account_id: string;
          fund_id: string;
          id: string;
          investor_id: string;
          is_voided: boolean;
          period_end: string;
          period_start: string;
          purpose: Database["public"]["Enums"]["aum_purpose"];
          voided_at: string | null;
          voided_by: string | null;
          voided_by_profile_id: string | null;
        };
        Insert: {
          base_net_income: number;
          created_at?: string | null;
          created_by?: string | null;
          credit_transaction_id?: string | null;
          debit_transaction_id?: string | null;
          distribution_id: string;
          fee_amount: number;
          fee_percentage: number;
          fees_account_id?: string;
          fund_id: string;
          id?: string;
          investor_id: string;
          is_voided?: boolean;
          period_end: string;
          period_start: string;
          purpose: Database["public"]["Enums"]["aum_purpose"];
          voided_at?: string | null;
          voided_by?: string | null;
          voided_by_profile_id?: string | null;
        };
        Update: {
          base_net_income?: number;
          created_at?: string | null;
          created_by?: string | null;
          credit_transaction_id?: string | null;
          debit_transaction_id?: string | null;
          distribution_id?: string;
          fee_amount?: number;
          fee_percentage?: number;
          fees_account_id?: string;
          fund_id?: string;
          id?: string;
          investor_id?: string;
          is_voided?: boolean;
          period_end?: string;
          period_start?: string;
          purpose?: Database["public"]["Enums"]["aum_purpose"];
          voided_at?: string | null;
          voided_by?: string | null;
          voided_by_profile_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "fee_allocations_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "fee_allocations_credit_transaction_id_fkey";
            columns: ["credit_transaction_id"];
            isOneToOne: false;
            referencedRelation: "transactions_v2";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "fee_allocations_credit_transaction_id_fkey";
            columns: ["credit_transaction_id"];
            isOneToOne: false;
            referencedRelation: "v_orphaned_transactions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "fee_allocations_credit_transaction_id_fkey";
            columns: ["credit_transaction_id"];
            isOneToOne: false;
            referencedRelation: "v_transaction_distribution_orphans";
            referencedColumns: ["transaction_id"];
          },
          {
            foreignKeyName: "fee_allocations_debit_transaction_id_fkey";
            columns: ["debit_transaction_id"];
            isOneToOne: false;
            referencedRelation: "transactions_v2";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "fee_allocations_debit_transaction_id_fkey";
            columns: ["debit_transaction_id"];
            isOneToOne: false;
            referencedRelation: "v_orphaned_transactions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "fee_allocations_debit_transaction_id_fkey";
            columns: ["debit_transaction_id"];
            isOneToOne: false;
            referencedRelation: "v_transaction_distribution_orphans";
            referencedColumns: ["transaction_id"];
          },
          {
            foreignKeyName: "fee_allocations_fees_account_id_fkey";
            columns: ["fees_account_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "fk_fee_allocations_distribution";
            columns: ["distribution_id"];
            isOneToOne: false;
            referencedRelation: "v_yield_conservation_violations";
            referencedColumns: ["distribution_id"];
          },
          {
            foreignKeyName: "fk_fee_allocations_distribution";
            columns: ["distribution_id"];
            isOneToOne: false;
            referencedRelation: "yield_distribution_conservation_check";
            referencedColumns: ["distribution_id"];
          },
          {
            foreignKeyName: "fk_fee_allocations_distribution";
            columns: ["distribution_id"];
            isOneToOne: false;
            referencedRelation: "yield_distributions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "fk_fee_allocations_fund_v2";
            columns: ["fund_id"];
            isOneToOne: false;
            referencedRelation: "aum_position_reconciliation";
            referencedColumns: ["fund_id"];
          },
          {
            foreignKeyName: "fk_fee_allocations_fund_v2";
            columns: ["fund_id"];
            isOneToOne: false;
            referencedRelation: "fund_aum_mismatch";
            referencedColumns: ["fund_id"];
          },
          {
            foreignKeyName: "fk_fee_allocations_fund_v2";
            columns: ["fund_id"];
            isOneToOne: false;
            referencedRelation: "funds";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "fk_fee_allocations_fund_v2";
            columns: ["fund_id"];
            isOneToOne: false;
            referencedRelation: "v_crystallization_dashboard";
            referencedColumns: ["fund_id"];
          },
          {
            foreignKeyName: "fk_fee_allocations_fund_v2";
            columns: ["fund_id"];
            isOneToOne: false;
            referencedRelation: "v_fund_aum_position_health";
            referencedColumns: ["fund_id"];
          },
          {
            foreignKeyName: "fk_fee_allocations_fund_v2";
            columns: ["fund_id"];
            isOneToOne: false;
            referencedRelation: "v_liquidity_risk";
            referencedColumns: ["fund_id"];
          },
          {
            foreignKeyName: "fk_fee_allocations_investor_v2";
            columns: ["investor_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "fk_fee_allocations_voided_by_profile";
            columns: ["voided_by_profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      fund_daily_aum: {
        Row: {
          as_of_date: string | null;
          aum_date: string;
          created_at: string | null;
          created_by: string | null;
          fund_id: string;
          id: string;
          is_month_end: boolean | null;
          is_voided: boolean;
          nav_per_share: number | null;
          purpose: Database["public"]["Enums"]["aum_purpose"];
          source: string | null;
          temporal_lock_bypass: boolean | null;
          total_aum: number;
          total_shares: number | null;
          updated_at: string | null;
          updated_by: string | null;
          void_reason: string | null;
          voided_at: string | null;
          voided_by: string | null;
          voided_by_profile_id: string | null;
        };
        Insert: {
          as_of_date?: string | null;
          aum_date: string;
          created_at?: string | null;
          created_by?: string | null;
          fund_id: string;
          id?: string;
          is_month_end?: boolean | null;
          is_voided?: boolean;
          nav_per_share?: number | null;
          purpose?: Database["public"]["Enums"]["aum_purpose"];
          source?: string | null;
          temporal_lock_bypass?: boolean | null;
          total_aum?: number;
          total_shares?: number | null;
          updated_at?: string | null;
          updated_by?: string | null;
          void_reason?: string | null;
          voided_at?: string | null;
          voided_by?: string | null;
          voided_by_profile_id?: string | null;
        };
        Update: {
          as_of_date?: string | null;
          aum_date?: string;
          created_at?: string | null;
          created_by?: string | null;
          fund_id?: string;
          id?: string;
          is_month_end?: boolean | null;
          is_voided?: boolean;
          nav_per_share?: number | null;
          purpose?: Database["public"]["Enums"]["aum_purpose"];
          source?: string | null;
          temporal_lock_bypass?: boolean | null;
          total_aum?: number;
          total_shares?: number | null;
          updated_at?: string | null;
          updated_by?: string | null;
          void_reason?: string | null;
          voided_at?: string | null;
          voided_by?: string | null;
          voided_by_profile_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "fk_fund_daily_aum_voided_by_profile";
            columns: ["voided_by_profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "fund_daily_aum_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "fund_daily_aum_fund_id_fkey";
            columns: ["fund_id"];
            isOneToOne: false;
            referencedRelation: "aum_position_reconciliation";
            referencedColumns: ["fund_id"];
          },
          {
            foreignKeyName: "fund_daily_aum_fund_id_fkey";
            columns: ["fund_id"];
            isOneToOne: false;
            referencedRelation: "fund_aum_mismatch";
            referencedColumns: ["fund_id"];
          },
          {
            foreignKeyName: "fund_daily_aum_fund_id_fkey";
            columns: ["fund_id"];
            isOneToOne: false;
            referencedRelation: "funds";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "fund_daily_aum_fund_id_fkey";
            columns: ["fund_id"];
            isOneToOne: false;
            referencedRelation: "v_crystallization_dashboard";
            referencedColumns: ["fund_id"];
          },
          {
            foreignKeyName: "fund_daily_aum_fund_id_fkey";
            columns: ["fund_id"];
            isOneToOne: false;
            referencedRelation: "v_fund_aum_position_health";
            referencedColumns: ["fund_id"];
          },
          {
            foreignKeyName: "fund_daily_aum_fund_id_fkey";
            columns: ["fund_id"];
            isOneToOne: false;
            referencedRelation: "v_liquidity_risk";
            referencedColumns: ["fund_id"];
          },
          {
            foreignKeyName: "fund_daily_aum_voided_by_fkey";
            columns: ["voided_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      fund_yield_snapshots: {
        Row: {
          closing_aum: number | null;
          created_at: string;
          created_by: string | null;
          days_in_period: number | null;
          fund_id: string;
          gross_yield_amount: number | null;
          gross_yield_pct: number | null;
          id: string;
          opening_aum: number | null;
          period_end: string | null;
          period_start: string | null;
          snapshot_date: string;
          trigger_reference: string | null;
          trigger_type: string;
        };
        Insert: {
          closing_aum?: number | null;
          created_at?: string;
          created_by?: string | null;
          days_in_period?: number | null;
          fund_id: string;
          gross_yield_amount?: number | null;
          gross_yield_pct?: number | null;
          id?: string;
          opening_aum?: number | null;
          period_end?: string | null;
          period_start?: string | null;
          snapshot_date: string;
          trigger_reference?: string | null;
          trigger_type: string;
        };
        Update: {
          closing_aum?: number | null;
          created_at?: string;
          created_by?: string | null;
          days_in_period?: number | null;
          fund_id?: string;
          gross_yield_amount?: number | null;
          gross_yield_pct?: number | null;
          id?: string;
          opening_aum?: number | null;
          period_end?: string | null;
          period_start?: string | null;
          snapshot_date?: string;
          trigger_reference?: string | null;
          trigger_type?: string;
        };
        Relationships: [
          {
            foreignKeyName: "fund_yield_snapshots_fund_id_fkey";
            columns: ["fund_id"];
            isOneToOne: false;
            referencedRelation: "aum_position_reconciliation";
            referencedColumns: ["fund_id"];
          },
          {
            foreignKeyName: "fund_yield_snapshots_fund_id_fkey";
            columns: ["fund_id"];
            isOneToOne: false;
            referencedRelation: "fund_aum_mismatch";
            referencedColumns: ["fund_id"];
          },
          {
            foreignKeyName: "fund_yield_snapshots_fund_id_fkey";
            columns: ["fund_id"];
            isOneToOne: false;
            referencedRelation: "funds";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "fund_yield_snapshots_fund_id_fkey";
            columns: ["fund_id"];
            isOneToOne: false;
            referencedRelation: "v_crystallization_dashboard";
            referencedColumns: ["fund_id"];
          },
          {
            foreignKeyName: "fund_yield_snapshots_fund_id_fkey";
            columns: ["fund_id"];
            isOneToOne: false;
            referencedRelation: "v_fund_aum_position_health";
            referencedColumns: ["fund_id"];
          },
          {
            foreignKeyName: "fund_yield_snapshots_fund_id_fkey";
            columns: ["fund_id"];
            isOneToOne: false;
            referencedRelation: "v_liquidity_risk";
            referencedColumns: ["fund_id"];
          },
        ];
      };
      funds: {
        Row: {
          asset: string;
          code: string;
          cooling_off_hours: number | null;
          created_at: string | null;
          fund_class: string;
          high_water_mark: number | null;
          id: string;
          inception_date: string;
          large_withdrawal_threshold: number | null;
          lock_period_days: number | null;
          logo_url: string | null;
          max_daily_yield_pct: number | null;
          mgmt_fee_bps: number | null;
          min_investment: number | null;
          min_withdrawal_amount: number | null;
          name: string;
          perf_fee_bps: number | null;
          status: Database["public"]["Enums"]["fund_status"] | null;
          strategy: string | null;
          updated_at: string | null;
        };
        Insert: {
          asset: string;
          code: string;
          cooling_off_hours?: number | null;
          created_at?: string | null;
          fund_class: string;
          high_water_mark?: number | null;
          id?: string;
          inception_date?: string;
          large_withdrawal_threshold?: number | null;
          lock_period_days?: number | null;
          logo_url?: string | null;
          max_daily_yield_pct?: number | null;
          mgmt_fee_bps?: number | null;
          min_investment?: number | null;
          min_withdrawal_amount?: number | null;
          name: string;
          perf_fee_bps?: number | null;
          status?: Database["public"]["Enums"]["fund_status"] | null;
          strategy?: string | null;
          updated_at?: string | null;
        };
        Update: {
          asset?: string;
          code?: string;
          cooling_off_hours?: number | null;
          created_at?: string | null;
          fund_class?: string;
          high_water_mark?: number | null;
          id?: string;
          inception_date?: string;
          large_withdrawal_threshold?: number | null;
          lock_period_days?: number | null;
          logo_url?: string | null;
          max_daily_yield_pct?: number | null;
          mgmt_fee_bps?: number | null;
          min_investment?: number | null;
          min_withdrawal_amount?: number | null;
          name?: string;
          perf_fee_bps?: number | null;
          status?: Database["public"]["Enums"]["fund_status"] | null;
          strategy?: string | null;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      generated_statements: {
        Row: {
          created_at: string | null;
          fund_names: string[];
          generated_by: string;
          html_content: string;
          id: string;
          investor_id: string;
          pdf_url: string | null;
          period_id: string;
          user_id: string;
        };
        Insert: {
          created_at?: string | null;
          fund_names: string[];
          generated_by: string;
          html_content: string;
          id?: string;
          investor_id: string;
          pdf_url?: string | null;
          period_id: string;
          user_id: string;
        };
        Update: {
          created_at?: string | null;
          fund_names?: string[];
          generated_by?: string;
          html_content?: string;
          id?: string;
          investor_id?: string;
          pdf_url?: string | null;
          period_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "generated_statements_generated_by_fkey";
            columns: ["generated_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "generated_statements_investor_id_fkey";
            columns: ["investor_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "generated_statements_period_id_fkey";
            columns: ["period_id"];
            isOneToOne: false;
            referencedRelation: "statement_periods";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "generated_statements_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      global_fee_settings: {
        Row: {
          description: string | null;
          setting_key: string;
          updated_at: string | null;
          updated_by: string | null;
          value: number;
        };
        Insert: {
          description?: string | null;
          setting_key: string;
          updated_at?: string | null;
          updated_by?: string | null;
          value: number;
        };
        Update: {
          description?: string | null;
          setting_key?: string;
          updated_at?: string | null;
          updated_by?: string | null;
          value?: number;
        };
        Relationships: [
          {
            foreignKeyName: "global_fee_settings_updated_by_fkey";
            columns: ["updated_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      ib_allocations: {
        Row: {
          created_at: string | null;
          created_by: string | null;
          distribution_id: string | null;
          effective_date: string;
          fund_id: string | null;
          ib_fee_amount: number;
          ib_investor_id: string;
          ib_percentage: number;
          id: string;
          is_voided: boolean;
          paid_at: string | null;
          paid_by: string | null;
          payout_batch_id: string | null;
          payout_status: string;
          period_end: string | null;
          period_id: string | null;
          period_start: string | null;
          purpose: Database["public"]["Enums"]["aum_purpose"];
          source: string | null;
          source_investor_id: string;
          source_net_income: number;
          voided_at: string | null;
          voided_by: string | null;
          voided_by_profile_id: string | null;
        };
        Insert: {
          created_at?: string | null;
          created_by?: string | null;
          distribution_id?: string | null;
          effective_date?: string;
          fund_id?: string | null;
          ib_fee_amount: number;
          ib_investor_id: string;
          ib_percentage: number;
          id?: string;
          is_voided?: boolean;
          paid_at?: string | null;
          paid_by?: string | null;
          payout_batch_id?: string | null;
          payout_status?: string;
          period_end?: string | null;
          period_id?: string | null;
          period_start?: string | null;
          purpose?: Database["public"]["Enums"]["aum_purpose"];
          source?: string | null;
          source_investor_id: string;
          source_net_income: number;
          voided_at?: string | null;
          voided_by?: string | null;
          voided_by_profile_id?: string | null;
        };
        Update: {
          created_at?: string | null;
          created_by?: string | null;
          distribution_id?: string | null;
          effective_date?: string;
          fund_id?: string | null;
          ib_fee_amount?: number;
          ib_investor_id?: string;
          ib_percentage?: number;
          id?: string;
          is_voided?: boolean;
          paid_at?: string | null;
          paid_by?: string | null;
          payout_batch_id?: string | null;
          payout_status?: string;
          period_end?: string | null;
          period_id?: string | null;
          period_start?: string | null;
          purpose?: Database["public"]["Enums"]["aum_purpose"];
          source?: string | null;
          source_investor_id?: string;
          source_net_income?: number;
          voided_at?: string | null;
          voided_by?: string | null;
          voided_by_profile_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "fk_ib_allocations_voided_by_profile";
            columns: ["voided_by_profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ib_allocations_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ib_allocations_distribution_id_fkey_v2";
            columns: ["distribution_id"];
            isOneToOne: false;
            referencedRelation: "v_yield_conservation_violations";
            referencedColumns: ["distribution_id"];
          },
          {
            foreignKeyName: "ib_allocations_distribution_id_fkey_v2";
            columns: ["distribution_id"];
            isOneToOne: false;
            referencedRelation: "yield_distribution_conservation_check";
            referencedColumns: ["distribution_id"];
          },
          {
            foreignKeyName: "ib_allocations_distribution_id_fkey_v2";
            columns: ["distribution_id"];
            isOneToOne: false;
            referencedRelation: "yield_distributions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ib_allocations_fund_id_fkey";
            columns: ["fund_id"];
            isOneToOne: false;
            referencedRelation: "aum_position_reconciliation";
            referencedColumns: ["fund_id"];
          },
          {
            foreignKeyName: "ib_allocations_fund_id_fkey";
            columns: ["fund_id"];
            isOneToOne: false;
            referencedRelation: "fund_aum_mismatch";
            referencedColumns: ["fund_id"];
          },
          {
            foreignKeyName: "ib_allocations_fund_id_fkey";
            columns: ["fund_id"];
            isOneToOne: false;
            referencedRelation: "funds";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ib_allocations_fund_id_fkey";
            columns: ["fund_id"];
            isOneToOne: false;
            referencedRelation: "v_crystallization_dashboard";
            referencedColumns: ["fund_id"];
          },
          {
            foreignKeyName: "ib_allocations_fund_id_fkey";
            columns: ["fund_id"];
            isOneToOne: false;
            referencedRelation: "v_fund_aum_position_health";
            referencedColumns: ["fund_id"];
          },
          {
            foreignKeyName: "ib_allocations_fund_id_fkey";
            columns: ["fund_id"];
            isOneToOne: false;
            referencedRelation: "v_liquidity_risk";
            referencedColumns: ["fund_id"];
          },
          {
            foreignKeyName: "ib_allocations_ib_investor_id_fkey";
            columns: ["ib_investor_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ib_allocations_paid_by_fkey";
            columns: ["paid_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ib_allocations_period_id_fkey";
            columns: ["period_id"];
            isOneToOne: false;
            referencedRelation: "statement_periods";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ib_allocations_source_investor_id_fkey";
            columns: ["source_investor_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      ib_commission_ledger: {
        Row: {
          asset: string;
          created_at: string | null;
          created_by: string | null;
          effective_date: string;
          fund_id: string;
          gross_yield_amount: number;
          ib_commission_amount: number;
          ib_id: string;
          ib_name: string | null;
          ib_percentage: number;
          id: string;
          is_voided: boolean | null;
          source_investor_id: string;
          source_investor_name: string | null;
          transaction_id: string | null;
          void_reason: string | null;
          voided_at: string | null;
          voided_by: string | null;
          yield_distribution_id: string | null;
        };
        Insert: {
          asset: string;
          created_at?: string | null;
          created_by?: string | null;
          effective_date: string;
          fund_id: string;
          gross_yield_amount: number;
          ib_commission_amount: number;
          ib_id: string;
          ib_name?: string | null;
          ib_percentage: number;
          id?: string;
          is_voided?: boolean | null;
          source_investor_id: string;
          source_investor_name?: string | null;
          transaction_id?: string | null;
          void_reason?: string | null;
          voided_at?: string | null;
          voided_by?: string | null;
          yield_distribution_id?: string | null;
        };
        Update: {
          asset?: string;
          created_at?: string | null;
          created_by?: string | null;
          effective_date?: string;
          fund_id?: string;
          gross_yield_amount?: number;
          ib_commission_amount?: number;
          ib_id?: string;
          ib_name?: string | null;
          ib_percentage?: number;
          id?: string;
          is_voided?: boolean | null;
          source_investor_id?: string;
          source_investor_name?: string | null;
          transaction_id?: string | null;
          void_reason?: string | null;
          voided_at?: string | null;
          voided_by?: string | null;
          yield_distribution_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "ib_commission_ledger_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ib_commission_ledger_fund_id_fkey";
            columns: ["fund_id"];
            isOneToOne: false;
            referencedRelation: "aum_position_reconciliation";
            referencedColumns: ["fund_id"];
          },
          {
            foreignKeyName: "ib_commission_ledger_fund_id_fkey";
            columns: ["fund_id"];
            isOneToOne: false;
            referencedRelation: "fund_aum_mismatch";
            referencedColumns: ["fund_id"];
          },
          {
            foreignKeyName: "ib_commission_ledger_fund_id_fkey";
            columns: ["fund_id"];
            isOneToOne: false;
            referencedRelation: "funds";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ib_commission_ledger_fund_id_fkey";
            columns: ["fund_id"];
            isOneToOne: false;
            referencedRelation: "v_crystallization_dashboard";
            referencedColumns: ["fund_id"];
          },
          {
            foreignKeyName: "ib_commission_ledger_fund_id_fkey";
            columns: ["fund_id"];
            isOneToOne: false;
            referencedRelation: "v_fund_aum_position_health";
            referencedColumns: ["fund_id"];
          },
          {
            foreignKeyName: "ib_commission_ledger_fund_id_fkey";
            columns: ["fund_id"];
            isOneToOne: false;
            referencedRelation: "v_liquidity_risk";
            referencedColumns: ["fund_id"];
          },
          {
            foreignKeyName: "ib_commission_ledger_ib_id_fkey";
            columns: ["ib_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ib_commission_ledger_source_investor_id_fkey";
            columns: ["source_investor_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ib_commission_ledger_transaction_id_fkey";
            columns: ["transaction_id"];
            isOneToOne: false;
            referencedRelation: "transactions_v2";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ib_commission_ledger_transaction_id_fkey";
            columns: ["transaction_id"];
            isOneToOne: false;
            referencedRelation: "v_orphaned_transactions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ib_commission_ledger_transaction_id_fkey";
            columns: ["transaction_id"];
            isOneToOne: false;
            referencedRelation: "v_transaction_distribution_orphans";
            referencedColumns: ["transaction_id"];
          },
          {
            foreignKeyName: "ib_commission_ledger_voided_by_fkey";
            columns: ["voided_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ib_commission_ledger_yield_distribution_id_fkey";
            columns: ["yield_distribution_id"];
            isOneToOne: false;
            referencedRelation: "v_yield_conservation_violations";
            referencedColumns: ["distribution_id"];
          },
          {
            foreignKeyName: "ib_commission_ledger_yield_distribution_id_fkey";
            columns: ["yield_distribution_id"];
            isOneToOne: false;
            referencedRelation: "yield_distribution_conservation_check";
            referencedColumns: ["distribution_id"];
          },
          {
            foreignKeyName: "ib_commission_ledger_yield_distribution_id_fkey";
            columns: ["yield_distribution_id"];
            isOneToOne: false;
            referencedRelation: "yield_distributions";
            referencedColumns: ["id"];
          },
        ];
      };
      ib_commission_schedule: {
        Row: {
          created_at: string;
          effective_date: string;
          end_date: string | null;
          fund_id: string | null;
          ib_percentage: number;
          id: string;
          investor_id: string;
          updated_at: string | null;
        };
        Insert: {
          created_at?: string;
          effective_date: string;
          end_date?: string | null;
          fund_id?: string | null;
          ib_percentage: number;
          id?: string;
          investor_id: string;
          updated_at?: string | null;
        };
        Update: {
          created_at?: string;
          effective_date?: string;
          end_date?: string | null;
          fund_id?: string | null;
          ib_percentage?: number;
          id?: string;
          investor_id?: string;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "ib_commission_schedule_fund_id_fkey";
            columns: ["fund_id"];
            isOneToOne: false;
            referencedRelation: "aum_position_reconciliation";
            referencedColumns: ["fund_id"];
          },
          {
            foreignKeyName: "ib_commission_schedule_fund_id_fkey";
            columns: ["fund_id"];
            isOneToOne: false;
            referencedRelation: "fund_aum_mismatch";
            referencedColumns: ["fund_id"];
          },
          {
            foreignKeyName: "ib_commission_schedule_fund_id_fkey";
            columns: ["fund_id"];
            isOneToOne: false;
            referencedRelation: "funds";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ib_commission_schedule_fund_id_fkey";
            columns: ["fund_id"];
            isOneToOne: false;
            referencedRelation: "v_crystallization_dashboard";
            referencedColumns: ["fund_id"];
          },
          {
            foreignKeyName: "ib_commission_schedule_fund_id_fkey";
            columns: ["fund_id"];
            isOneToOne: false;
            referencedRelation: "v_fund_aum_position_health";
            referencedColumns: ["fund_id"];
          },
          {
            foreignKeyName: "ib_commission_schedule_fund_id_fkey";
            columns: ["fund_id"];
            isOneToOne: false;
            referencedRelation: "v_liquidity_risk";
            referencedColumns: ["fund_id"];
          },
          {
            foreignKeyName: "ib_commission_schedule_investor_id_fkey";
            columns: ["investor_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      investor_daily_balance: {
        Row: {
          balance_date: string;
          created_at: string;
          end_of_day_balance: number;
          fund_id: string;
          id: string;
          investor_id: string;
        };
        Insert: {
          balance_date: string;
          created_at?: string;
          end_of_day_balance?: number;
          fund_id: string;
          id?: string;
          investor_id: string;
        };
        Update: {
          balance_date?: string;
          created_at?: string;
          end_of_day_balance?: number;
          fund_id?: string;
          id?: string;
          investor_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "investor_daily_balance_fund_id_fkey";
            columns: ["fund_id"];
            isOneToOne: false;
            referencedRelation: "aum_position_reconciliation";
            referencedColumns: ["fund_id"];
          },
          {
            foreignKeyName: "investor_daily_balance_fund_id_fkey";
            columns: ["fund_id"];
            isOneToOne: false;
            referencedRelation: "fund_aum_mismatch";
            referencedColumns: ["fund_id"];
          },
          {
            foreignKeyName: "investor_daily_balance_fund_id_fkey";
            columns: ["fund_id"];
            isOneToOne: false;
            referencedRelation: "funds";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "investor_daily_balance_fund_id_fkey";
            columns: ["fund_id"];
            isOneToOne: false;
            referencedRelation: "v_crystallization_dashboard";
            referencedColumns: ["fund_id"];
          },
          {
            foreignKeyName: "investor_daily_balance_fund_id_fkey";
            columns: ["fund_id"];
            isOneToOne: false;
            referencedRelation: "v_fund_aum_position_health";
            referencedColumns: ["fund_id"];
          },
          {
            foreignKeyName: "investor_daily_balance_fund_id_fkey";
            columns: ["fund_id"];
            isOneToOne: false;
            referencedRelation: "v_liquidity_risk";
            referencedColumns: ["fund_id"];
          },
        ];
      };
      investor_emails: {
        Row: {
          created_at: string | null;
          email: string;
          id: string;
          investor_id: string;
          is_primary: boolean | null;
          updated_at: string | null;
          verified: boolean | null;
        };
        Insert: {
          created_at?: string | null;
          email: string;
          id?: string;
          investor_id: string;
          is_primary?: boolean | null;
          updated_at?: string | null;
          verified?: boolean | null;
        };
        Update: {
          created_at?: string | null;
          email?: string;
          id?: string;
          investor_id?: string;
          is_primary?: boolean | null;
          updated_at?: string | null;
          verified?: boolean | null;
        };
        Relationships: [
          {
            foreignKeyName: "fk_investor_emails_investor";
            columns: ["investor_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      investor_fee_schedule: {
        Row: {
          created_at: string;
          effective_date: string;
          end_date: string | null;
          fee_pct: number;
          fund_id: string | null;
          id: string;
          investor_id: string;
          updated_at: string | null;
        };
        Insert: {
          created_at?: string;
          effective_date: string;
          end_date?: string | null;
          fee_pct: number;
          fund_id?: string | null;
          id?: string;
          investor_id: string;
          updated_at?: string | null;
        };
        Update: {
          created_at?: string;
          effective_date?: string;
          end_date?: string | null;
          fee_pct?: number;
          fund_id?: string | null;
          id?: string;
          investor_id?: string;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "investor_fee_schedule_fund_id_fkey";
            columns: ["fund_id"];
            isOneToOne: false;
            referencedRelation: "aum_position_reconciliation";
            referencedColumns: ["fund_id"];
          },
          {
            foreignKeyName: "investor_fee_schedule_fund_id_fkey";
            columns: ["fund_id"];
            isOneToOne: false;
            referencedRelation: "fund_aum_mismatch";
            referencedColumns: ["fund_id"];
          },
          {
            foreignKeyName: "investor_fee_schedule_fund_id_fkey";
            columns: ["fund_id"];
            isOneToOne: false;
            referencedRelation: "funds";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "investor_fee_schedule_fund_id_fkey";
            columns: ["fund_id"];
            isOneToOne: false;
            referencedRelation: "v_crystallization_dashboard";
            referencedColumns: ["fund_id"];
          },
          {
            foreignKeyName: "investor_fee_schedule_fund_id_fkey";
            columns: ["fund_id"];
            isOneToOne: false;
            referencedRelation: "v_fund_aum_position_health";
            referencedColumns: ["fund_id"];
          },
          {
            foreignKeyName: "investor_fee_schedule_fund_id_fkey";
            columns: ["fund_id"];
            isOneToOne: false;
            referencedRelation: "v_liquidity_risk";
            referencedColumns: ["fund_id"];
          },
          {
            foreignKeyName: "investor_fee_schedule_investor_id_fkey";
            columns: ["investor_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      investor_fund_performance: {
        Row: {
          created_at: string | null;
          fund_name: string;
          id: string;
          investor_id: string;
          itd_additions: number | null;
          itd_beginning_balance: number | null;
          itd_ending_balance: number | null;
          itd_net_income: number | null;
          itd_rate_of_return: number | null;
          itd_redemptions: number | null;
          mtd_additions: number | null;
          mtd_beginning_balance: number | null;
          mtd_ending_balance: number | null;
          mtd_net_income: number | null;
          mtd_rate_of_return: number | null;
          mtd_redemptions: number | null;
          period_id: string;
          purpose: Database["public"]["Enums"]["aum_purpose"] | null;
          qtd_additions: number | null;
          qtd_beginning_balance: number | null;
          qtd_ending_balance: number | null;
          qtd_net_income: number | null;
          qtd_rate_of_return: number | null;
          qtd_redemptions: number | null;
          updated_at: string | null;
          ytd_additions: number | null;
          ytd_beginning_balance: number | null;
          ytd_ending_balance: number | null;
          ytd_net_income: number | null;
          ytd_rate_of_return: number | null;
          ytd_redemptions: number | null;
        };
        Insert: {
          created_at?: string | null;
          fund_name: string;
          id?: string;
          investor_id: string;
          itd_additions?: number | null;
          itd_beginning_balance?: number | null;
          itd_ending_balance?: number | null;
          itd_net_income?: number | null;
          itd_rate_of_return?: number | null;
          itd_redemptions?: number | null;
          mtd_additions?: number | null;
          mtd_beginning_balance?: number | null;
          mtd_ending_balance?: number | null;
          mtd_net_income?: number | null;
          mtd_rate_of_return?: number | null;
          mtd_redemptions?: number | null;
          period_id: string;
          purpose?: Database["public"]["Enums"]["aum_purpose"] | null;
          qtd_additions?: number | null;
          qtd_beginning_balance?: number | null;
          qtd_ending_balance?: number | null;
          qtd_net_income?: number | null;
          qtd_rate_of_return?: number | null;
          qtd_redemptions?: number | null;
          updated_at?: string | null;
          ytd_additions?: number | null;
          ytd_beginning_balance?: number | null;
          ytd_ending_balance?: number | null;
          ytd_net_income?: number | null;
          ytd_rate_of_return?: number | null;
          ytd_redemptions?: number | null;
        };
        Update: {
          created_at?: string | null;
          fund_name?: string;
          id?: string;
          investor_id?: string;
          itd_additions?: number | null;
          itd_beginning_balance?: number | null;
          itd_ending_balance?: number | null;
          itd_net_income?: number | null;
          itd_rate_of_return?: number | null;
          itd_redemptions?: number | null;
          mtd_additions?: number | null;
          mtd_beginning_balance?: number | null;
          mtd_ending_balance?: number | null;
          mtd_net_income?: number | null;
          mtd_rate_of_return?: number | null;
          mtd_redemptions?: number | null;
          period_id?: string;
          purpose?: Database["public"]["Enums"]["aum_purpose"] | null;
          qtd_additions?: number | null;
          qtd_beginning_balance?: number | null;
          qtd_ending_balance?: number | null;
          qtd_net_income?: number | null;
          qtd_rate_of_return?: number | null;
          qtd_redemptions?: number | null;
          updated_at?: string | null;
          ytd_additions?: number | null;
          ytd_beginning_balance?: number | null;
          ytd_ending_balance?: number | null;
          ytd_net_income?: number | null;
          ytd_rate_of_return?: number | null;
          ytd_redemptions?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "investor_fund_performance_investor_id_fkey";
            columns: ["investor_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "investor_fund_performance_period_id_fkey";
            columns: ["period_id"];
            isOneToOne: false;
            referencedRelation: "statement_periods";
            referencedColumns: ["id"];
          },
        ];
      };
      investor_position_snapshots: {
        Row: {
          created_at: string | null;
          current_value: number;
          fund_id: string;
          id: string;
          investor_id: string;
          snapshot_date: string;
          snapshot_source: string | null;
        };
        Insert: {
          created_at?: string | null;
          current_value: number;
          fund_id: string;
          id?: string;
          investor_id: string;
          snapshot_date: string;
          snapshot_source?: string | null;
        };
        Update: {
          created_at?: string | null;
          current_value?: number;
          fund_id?: string;
          id?: string;
          investor_id?: string;
          snapshot_date?: string;
          snapshot_source?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "investor_position_snapshots_fund_id_fkey";
            columns: ["fund_id"];
            isOneToOne: false;
            referencedRelation: "aum_position_reconciliation";
            referencedColumns: ["fund_id"];
          },
          {
            foreignKeyName: "investor_position_snapshots_fund_id_fkey";
            columns: ["fund_id"];
            isOneToOne: false;
            referencedRelation: "fund_aum_mismatch";
            referencedColumns: ["fund_id"];
          },
          {
            foreignKeyName: "investor_position_snapshots_fund_id_fkey";
            columns: ["fund_id"];
            isOneToOne: false;
            referencedRelation: "funds";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "investor_position_snapshots_fund_id_fkey";
            columns: ["fund_id"];
            isOneToOne: false;
            referencedRelation: "v_crystallization_dashboard";
            referencedColumns: ["fund_id"];
          },
          {
            foreignKeyName: "investor_position_snapshots_fund_id_fkey";
            columns: ["fund_id"];
            isOneToOne: false;
            referencedRelation: "v_fund_aum_position_health";
            referencedColumns: ["fund_id"];
          },
          {
            foreignKeyName: "investor_position_snapshots_fund_id_fkey";
            columns: ["fund_id"];
            isOneToOne: false;
            referencedRelation: "v_liquidity_risk";
            referencedColumns: ["fund_id"];
          },
          {
            foreignKeyName: "investor_position_snapshots_investor_id_fkey";
            columns: ["investor_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      investor_positions: {
        Row: {
          aum_percentage: number | null;
          cost_basis: number;
          cumulative_yield_earned: number | null;
          current_value: number;
          fund_class: string | null;
          fund_id: string;
          high_water_mark: number | null;
          investor_id: string;
          is_active: boolean | null;
          last_transaction_date: string | null;
          last_yield_crystallization_date: string | null;
          lock_until_date: string | null;
          mgmt_fees_paid: number | null;
          perf_fees_paid: number | null;
          realized_pnl: number | null;
          shares: number;
          unrealized_pnl: number | null;
          updated_at: string | null;
        };
        Insert: {
          aum_percentage?: number | null;
          cost_basis?: number;
          cumulative_yield_earned?: number | null;
          current_value?: number;
          fund_class?: string | null;
          fund_id: string;
          high_water_mark?: number | null;
          investor_id: string;
          is_active?: boolean | null;
          last_transaction_date?: string | null;
          last_yield_crystallization_date?: string | null;
          lock_until_date?: string | null;
          mgmt_fees_paid?: number | null;
          perf_fees_paid?: number | null;
          realized_pnl?: number | null;
          shares?: number;
          unrealized_pnl?: number | null;
          updated_at?: string | null;
        };
        Update: {
          aum_percentage?: number | null;
          cost_basis?: number;
          cumulative_yield_earned?: number | null;
          current_value?: number;
          fund_class?: string | null;
          fund_id?: string;
          high_water_mark?: number | null;
          investor_id?: string;
          is_active?: boolean | null;
          last_transaction_date?: string | null;
          last_yield_crystallization_date?: string | null;
          lock_until_date?: string | null;
          mgmt_fees_paid?: number | null;
          perf_fees_paid?: number | null;
          realized_pnl?: number | null;
          shares?: number;
          unrealized_pnl?: number | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "fk_investor_positions_fund";
            columns: ["fund_id"];
            isOneToOne: false;
            referencedRelation: "aum_position_reconciliation";
            referencedColumns: ["fund_id"];
          },
          {
            foreignKeyName: "fk_investor_positions_fund";
            columns: ["fund_id"];
            isOneToOne: false;
            referencedRelation: "fund_aum_mismatch";
            referencedColumns: ["fund_id"];
          },
          {
            foreignKeyName: "fk_investor_positions_fund";
            columns: ["fund_id"];
            isOneToOne: false;
            referencedRelation: "funds";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "fk_investor_positions_fund";
            columns: ["fund_id"];
            isOneToOne: false;
            referencedRelation: "v_crystallization_dashboard";
            referencedColumns: ["fund_id"];
          },
          {
            foreignKeyName: "fk_investor_positions_fund";
            columns: ["fund_id"];
            isOneToOne: false;
            referencedRelation: "v_fund_aum_position_health";
            referencedColumns: ["fund_id"];
          },
          {
            foreignKeyName: "fk_investor_positions_fund";
            columns: ["fund_id"];
            isOneToOne: false;
            referencedRelation: "v_liquidity_risk";
            referencedColumns: ["fund_id"];
          },
          {
            foreignKeyName: "fk_investor_positions_investor";
            columns: ["investor_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      investor_yield_events: {
        Row: {
          created_at: string;
          created_by: string | null;
          days_in_period: number;
          event_date: string;
          fee_amount: number | null;
          fee_pct: number | null;
          fund_aum_after: number;
          fund_aum_before: number;
          fund_id: string;
          fund_yield_pct: number;
          gross_yield_amount: number;
          ib_amount: number | null;
          id: string;
          investor_balance: number;
          investor_id: string;
          investor_share_pct: number;
          is_voided: boolean;
          made_visible_at: string | null;
          made_visible_by: string | null;
          net_yield_amount: number;
          period_end: string;
          period_start: string;
          reference_id: string;
          trigger_transaction_id: string | null;
          trigger_type: string;
          visibility_scope: string;
          voided_at: string | null;
          voided_by: string | null;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          days_in_period: number;
          event_date: string;
          fee_amount?: number | null;
          fee_pct?: number | null;
          fund_aum_after: number;
          fund_aum_before: number;
          fund_id: string;
          fund_yield_pct: number;
          gross_yield_amount: number;
          ib_amount?: number | null;
          id?: string;
          investor_balance: number;
          investor_id: string;
          investor_share_pct: number;
          is_voided?: boolean;
          made_visible_at?: string | null;
          made_visible_by?: string | null;
          net_yield_amount: number;
          period_end: string;
          period_start: string;
          reference_id: string;
          trigger_transaction_id?: string | null;
          trigger_type: string;
          visibility_scope?: string;
          voided_at?: string | null;
          voided_by?: string | null;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          days_in_period?: number;
          event_date?: string;
          fee_amount?: number | null;
          fee_pct?: number | null;
          fund_aum_after?: number;
          fund_aum_before?: number;
          fund_id?: string;
          fund_yield_pct?: number;
          gross_yield_amount?: number;
          ib_amount?: number | null;
          id?: string;
          investor_balance?: number;
          investor_id?: string;
          investor_share_pct?: number;
          is_voided?: boolean;
          made_visible_at?: string | null;
          made_visible_by?: string | null;
          net_yield_amount?: number;
          period_end?: string;
          period_start?: string;
          reference_id?: string;
          trigger_transaction_id?: string | null;
          trigger_type?: string;
          visibility_scope?: string;
          voided_at?: string | null;
          voided_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "fk_yield_events_created_by";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "fk_yield_events_fund";
            columns: ["fund_id"];
            isOneToOne: false;
            referencedRelation: "aum_position_reconciliation";
            referencedColumns: ["fund_id"];
          },
          {
            foreignKeyName: "fk_yield_events_fund";
            columns: ["fund_id"];
            isOneToOne: false;
            referencedRelation: "fund_aum_mismatch";
            referencedColumns: ["fund_id"];
          },
          {
            foreignKeyName: "fk_yield_events_fund";
            columns: ["fund_id"];
            isOneToOne: false;
            referencedRelation: "funds";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "fk_yield_events_fund";
            columns: ["fund_id"];
            isOneToOne: false;
            referencedRelation: "v_crystallization_dashboard";
            referencedColumns: ["fund_id"];
          },
          {
            foreignKeyName: "fk_yield_events_fund";
            columns: ["fund_id"];
            isOneToOne: false;
            referencedRelation: "v_fund_aum_position_health";
            referencedColumns: ["fund_id"];
          },
          {
            foreignKeyName: "fk_yield_events_fund";
            columns: ["fund_id"];
            isOneToOne: false;
            referencedRelation: "v_liquidity_risk";
            referencedColumns: ["fund_id"];
          },
          {
            foreignKeyName: "fk_yield_events_investor";
            columns: ["investor_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "fk_yield_events_trigger_tx";
            columns: ["trigger_transaction_id"];
            isOneToOne: false;
            referencedRelation: "transactions_v2";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "fk_yield_events_trigger_tx";
            columns: ["trigger_transaction_id"];
            isOneToOne: false;
            referencedRelation: "v_orphaned_transactions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "fk_yield_events_trigger_tx";
            columns: ["trigger_transaction_id"];
            isOneToOne: false;
            referencedRelation: "v_transaction_distribution_orphans";
            referencedColumns: ["transaction_id"];
          },
          {
            foreignKeyName: "fk_yield_events_visible_by";
            columns: ["made_visible_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "fk_yield_events_voided_by";
            columns: ["voided_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      notifications: {
        Row: {
          body: string;
          created_at: string;
          data_jsonb: Json | null;
          id: string;
          priority: Database["public"]["Enums"]["notification_priority"] | null;
          read_at: string | null;
          title: string;
          type: Database["public"]["Enums"]["notification_type"];
          user_id: string;
        };
        Insert: {
          body: string;
          created_at?: string;
          data_jsonb?: Json | null;
          id?: string;
          priority?: Database["public"]["Enums"]["notification_priority"] | null;
          read_at?: string | null;
          title: string;
          type: Database["public"]["Enums"]["notification_type"];
          user_id: string;
        };
        Update: {
          body?: string;
          created_at?: string;
          data_jsonb?: Json | null;
          id?: string;
          priority?: Database["public"]["Enums"]["notification_priority"] | null;
          read_at?: string | null;
          title?: string;
          type?: Database["public"]["Enums"]["notification_type"];
          user_id?: string;
        };
        Relationships: [];
      };
      platform_fee_ledger: {
        Row: {
          asset: string;
          created_at: string | null;
          created_by: string | null;
          effective_date: string;
          fee_amount: number;
          fee_percentage: number;
          fund_id: string;
          gross_yield_amount: number;
          id: string;
          investor_id: string;
          investor_name: string | null;
          is_voided: boolean | null;
          transaction_id: string | null;
          void_reason: string | null;
          voided_at: string | null;
          voided_by: string | null;
          yield_distribution_id: string | null;
        };
        Insert: {
          asset: string;
          created_at?: string | null;
          created_by?: string | null;
          effective_date: string;
          fee_amount: number;
          fee_percentage: number;
          fund_id: string;
          gross_yield_amount: number;
          id?: string;
          investor_id: string;
          investor_name?: string | null;
          is_voided?: boolean | null;
          transaction_id?: string | null;
          void_reason?: string | null;
          voided_at?: string | null;
          voided_by?: string | null;
          yield_distribution_id?: string | null;
        };
        Update: {
          asset?: string;
          created_at?: string | null;
          created_by?: string | null;
          effective_date?: string;
          fee_amount?: number;
          fee_percentage?: number;
          fund_id?: string;
          gross_yield_amount?: number;
          id?: string;
          investor_id?: string;
          investor_name?: string | null;
          is_voided?: boolean | null;
          transaction_id?: string | null;
          void_reason?: string | null;
          voided_at?: string | null;
          voided_by?: string | null;
          yield_distribution_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "platform_fee_ledger_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "platform_fee_ledger_fund_id_fkey";
            columns: ["fund_id"];
            isOneToOne: false;
            referencedRelation: "aum_position_reconciliation";
            referencedColumns: ["fund_id"];
          },
          {
            foreignKeyName: "platform_fee_ledger_fund_id_fkey";
            columns: ["fund_id"];
            isOneToOne: false;
            referencedRelation: "fund_aum_mismatch";
            referencedColumns: ["fund_id"];
          },
          {
            foreignKeyName: "platform_fee_ledger_fund_id_fkey";
            columns: ["fund_id"];
            isOneToOne: false;
            referencedRelation: "funds";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "platform_fee_ledger_fund_id_fkey";
            columns: ["fund_id"];
            isOneToOne: false;
            referencedRelation: "v_crystallization_dashboard";
            referencedColumns: ["fund_id"];
          },
          {
            foreignKeyName: "platform_fee_ledger_fund_id_fkey";
            columns: ["fund_id"];
            isOneToOne: false;
            referencedRelation: "v_fund_aum_position_health";
            referencedColumns: ["fund_id"];
          },
          {
            foreignKeyName: "platform_fee_ledger_fund_id_fkey";
            columns: ["fund_id"];
            isOneToOne: false;
            referencedRelation: "v_liquidity_risk";
            referencedColumns: ["fund_id"];
          },
          {
            foreignKeyName: "platform_fee_ledger_investor_id_fkey";
            columns: ["investor_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "platform_fee_ledger_transaction_id_fkey";
            columns: ["transaction_id"];
            isOneToOne: false;
            referencedRelation: "transactions_v2";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "platform_fee_ledger_transaction_id_fkey";
            columns: ["transaction_id"];
            isOneToOne: false;
            referencedRelation: "v_orphaned_transactions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "platform_fee_ledger_transaction_id_fkey";
            columns: ["transaction_id"];
            isOneToOne: false;
            referencedRelation: "v_transaction_distribution_orphans";
            referencedColumns: ["transaction_id"];
          },
          {
            foreignKeyName: "platform_fee_ledger_voided_by_fkey";
            columns: ["voided_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "platform_fee_ledger_yield_distribution_id_fkey";
            columns: ["yield_distribution_id"];
            isOneToOne: false;
            referencedRelation: "v_yield_conservation_violations";
            referencedColumns: ["distribution_id"];
          },
          {
            foreignKeyName: "platform_fee_ledger_yield_distribution_id_fkey";
            columns: ["yield_distribution_id"];
            isOneToOne: false;
            referencedRelation: "yield_distribution_conservation_check";
            referencedColumns: ["distribution_id"];
          },
          {
            foreignKeyName: "platform_fee_ledger_yield_distribution_id_fkey";
            columns: ["yield_distribution_id"];
            isOneToOne: false;
            referencedRelation: "yield_distributions";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          account_type: Database["public"]["Enums"]["account_type"] | null;
          avatar_url: string | null;
          created_at: string;
          email: string;
          entity_type: string | null;
          first_name: string | null;
          ib_commission_source: string;
          ib_parent_id: string | null;
          id: string;
          include_in_reporting: boolean;
          is_admin: boolean;
          is_system_account: boolean | null;
          kyc_status: string | null;
          last_activity_at: string | null;
          last_name: string | null;
          onboarding_date: string | null;
          phone: string | null;
          preferences: Json | null;
          role: string | null;
          status: string | null;
          totp_enabled: boolean | null;
          totp_verified: boolean | null;
          updated_at: string;
        };
        Insert: {
          account_type?: Database["public"]["Enums"]["account_type"] | null;
          avatar_url?: string | null;
          created_at?: string;
          email: string;
          entity_type?: string | null;
          first_name?: string | null;
          ib_commission_source?: string;
          ib_parent_id?: string | null;
          id: string;
          include_in_reporting?: boolean;
          is_admin?: boolean;
          is_system_account?: boolean | null;
          kyc_status?: string | null;
          last_activity_at?: string | null;
          last_name?: string | null;
          onboarding_date?: string | null;
          phone?: string | null;
          preferences?: Json | null;
          role?: string | null;
          status?: string | null;
          totp_enabled?: boolean | null;
          totp_verified?: boolean | null;
          updated_at?: string;
        };
        Update: {
          account_type?: Database["public"]["Enums"]["account_type"] | null;
          avatar_url?: string | null;
          created_at?: string;
          email?: string;
          entity_type?: string | null;
          first_name?: string | null;
          ib_commission_source?: string;
          ib_parent_id?: string | null;
          id?: string;
          include_in_reporting?: boolean;
          is_admin?: boolean;
          is_system_account?: boolean | null;
          kyc_status?: string | null;
          last_activity_at?: string | null;
          last_name?: string | null;
          onboarding_date?: string | null;
          phone?: string | null;
          preferences?: Json | null;
          role?: string | null;
          status?: string | null;
          totp_enabled?: boolean | null;
          totp_verified?: boolean | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "profiles_ib_parent_id_fkey";
            columns: ["ib_parent_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      qa_entity_manifest: {
        Row: {
          created_at: string | null;
          entity_id: string;
          entity_label: string | null;
          entity_type: string;
          id: string;
          run_tag: string;
        };
        Insert: {
          created_at?: string | null;
          entity_id: string;
          entity_label?: string | null;
          entity_type: string;
          id?: string;
          run_tag: string;
        };
        Update: {
          created_at?: string | null;
          entity_id?: string;
          entity_label?: string | null;
          entity_type?: string;
          id?: string;
          run_tag?: string;
        };
        Relationships: [];
      };
      rate_limit_config: {
        Row: {
          action_type: string;
          created_at: string | null;
          description: string | null;
          is_enabled: boolean | null;
          max_actions: number;
          updated_at: string | null;
          window_minutes: number;
        };
        Insert: {
          action_type: string;
          created_at?: string | null;
          description?: string | null;
          is_enabled?: boolean | null;
          max_actions?: number;
          updated_at?: string | null;
          window_minutes?: number;
        };
        Update: {
          action_type?: string;
          created_at?: string | null;
          description?: string | null;
          is_enabled?: boolean | null;
          max_actions?: number;
          updated_at?: string | null;
          window_minutes?: number;
        };
        Relationships: [];
      };
      report_schedules: {
        Row: {
          created_at: string;
          created_by: string | null;
          day_of_month: number | null;
          day_of_week: number | null;
          delivery_method: string[];
          description: string | null;
          failure_count: number;
          filters: Json;
          formats: string[];
          frequency: string;
          id: string;
          is_active: boolean;
          last_run_at: string | null;
          last_run_status: string | null;
          name: string;
          next_run_at: string | null;
          parameters: Json;
          recipient_emails: string[];
          recipient_user_ids: string[];
          report_definition_id: string | null;
          run_count: number;
          time_of_day: string;
          timezone: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          day_of_month?: number | null;
          day_of_week?: number | null;
          delivery_method?: string[];
          description?: string | null;
          failure_count?: number;
          filters?: Json;
          formats?: string[];
          frequency: string;
          id?: string;
          is_active?: boolean;
          last_run_at?: string | null;
          last_run_status?: string | null;
          name: string;
          next_run_at?: string | null;
          parameters?: Json;
          recipient_emails?: string[];
          recipient_user_ids?: string[];
          report_definition_id?: string | null;
          run_count?: number;
          time_of_day: string;
          timezone?: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          day_of_month?: number | null;
          day_of_week?: number | null;
          delivery_method?: string[];
          description?: string | null;
          failure_count?: number;
          filters?: Json;
          formats?: string[];
          frequency?: string;
          id?: string;
          is_active?: boolean;
          last_run_at?: string | null;
          last_run_status?: string | null;
          name?: string;
          next_run_at?: string | null;
          parameters?: Json;
          recipient_emails?: string[];
          recipient_user_ids?: string[];
          report_definition_id?: string | null;
          run_count?: number;
          time_of_day?: string;
          timezone?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      risk_alerts: {
        Row: {
          acknowledged: boolean | null;
          acknowledged_at: string | null;
          acknowledged_by: string | null;
          actual_value: number | null;
          alert_type: string;
          created_at: string | null;
          details: Json | null;
          expires_at: string | null;
          fund_id: string | null;
          id: string;
          investor_id: string | null;
          message: string;
          resolution_notes: string | null;
          resolved: boolean | null;
          resolved_at: string | null;
          resolved_by: string | null;
          severity: string | null;
          threshold_value: number | null;
        };
        Insert: {
          acknowledged?: boolean | null;
          acknowledged_at?: string | null;
          acknowledged_by?: string | null;
          actual_value?: number | null;
          alert_type: string;
          created_at?: string | null;
          details?: Json | null;
          expires_at?: string | null;
          fund_id?: string | null;
          id?: string;
          investor_id?: string | null;
          message: string;
          resolution_notes?: string | null;
          resolved?: boolean | null;
          resolved_at?: string | null;
          resolved_by?: string | null;
          severity?: string | null;
          threshold_value?: number | null;
        };
        Update: {
          acknowledged?: boolean | null;
          acknowledged_at?: string | null;
          acknowledged_by?: string | null;
          actual_value?: number | null;
          alert_type?: string;
          created_at?: string | null;
          details?: Json | null;
          expires_at?: string | null;
          fund_id?: string | null;
          id?: string;
          investor_id?: string | null;
          message?: string;
          resolution_notes?: string | null;
          resolved?: boolean | null;
          resolved_at?: string | null;
          resolved_by?: string | null;
          severity?: string | null;
          threshold_value?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "risk_alerts_acknowledged_by_fkey";
            columns: ["acknowledged_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "risk_alerts_fund_id_fkey";
            columns: ["fund_id"];
            isOneToOne: false;
            referencedRelation: "aum_position_reconciliation";
            referencedColumns: ["fund_id"];
          },
          {
            foreignKeyName: "risk_alerts_fund_id_fkey";
            columns: ["fund_id"];
            isOneToOne: false;
            referencedRelation: "fund_aum_mismatch";
            referencedColumns: ["fund_id"];
          },
          {
            foreignKeyName: "risk_alerts_fund_id_fkey";
            columns: ["fund_id"];
            isOneToOne: false;
            referencedRelation: "funds";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "risk_alerts_fund_id_fkey";
            columns: ["fund_id"];
            isOneToOne: false;
            referencedRelation: "v_crystallization_dashboard";
            referencedColumns: ["fund_id"];
          },
          {
            foreignKeyName: "risk_alerts_fund_id_fkey";
            columns: ["fund_id"];
            isOneToOne: false;
            referencedRelation: "v_fund_aum_position_health";
            referencedColumns: ["fund_id"];
          },
          {
            foreignKeyName: "risk_alerts_fund_id_fkey";
            columns: ["fund_id"];
            isOneToOne: false;
            referencedRelation: "v_liquidity_risk";
            referencedColumns: ["fund_id"];
          },
          {
            foreignKeyName: "risk_alerts_investor_id_fkey";
            columns: ["investor_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "risk_alerts_resolved_by_fkey";
            columns: ["resolved_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      statement_email_delivery: {
        Row: {
          attempt_count: number;
          bounce_type: string | null;
          bounced_at: string | null;
          channel: string;
          clicked_at: string | null;
          created_at: string | null;
          created_by: string | null;
          delivered_at: string | null;
          delivery_mode: string | null;
          error_code: string | null;
          error_message: string | null;
          failed_at: string | null;
          id: string;
          investor_id: string;
          last_attempt_at: string | null;
          locked_at: string | null;
          locked_by: string | null;
          metadata: Json;
          opened_at: string | null;
          period_id: string;
          provider: string | null;
          provider_message_id: string | null;
          recipient_email: string;
          retry_count: number | null;
          sent_at: string | null;
          statement_id: string;
          status: string | null;
          subject: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          attempt_count?: number;
          bounce_type?: string | null;
          bounced_at?: string | null;
          channel?: string;
          clicked_at?: string | null;
          created_at?: string | null;
          created_by?: string | null;
          delivered_at?: string | null;
          delivery_mode?: string | null;
          error_code?: string | null;
          error_message?: string | null;
          failed_at?: string | null;
          id?: string;
          investor_id: string;
          last_attempt_at?: string | null;
          locked_at?: string | null;
          locked_by?: string | null;
          metadata?: Json;
          opened_at?: string | null;
          period_id: string;
          provider?: string | null;
          provider_message_id?: string | null;
          recipient_email: string;
          retry_count?: number | null;
          sent_at?: string | null;
          statement_id: string;
          status?: string | null;
          subject: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          attempt_count?: number;
          bounce_type?: string | null;
          bounced_at?: string | null;
          channel?: string;
          clicked_at?: string | null;
          created_at?: string | null;
          created_by?: string | null;
          delivered_at?: string | null;
          delivery_mode?: string | null;
          error_code?: string | null;
          error_message?: string | null;
          failed_at?: string | null;
          id?: string;
          investor_id?: string;
          last_attempt_at?: string | null;
          locked_at?: string | null;
          locked_by?: string | null;
          metadata?: Json;
          opened_at?: string | null;
          period_id?: string;
          provider?: string | null;
          provider_message_id?: string | null;
          recipient_email?: string;
          retry_count?: number | null;
          sent_at?: string | null;
          statement_id?: string;
          status?: string | null;
          subject?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "statement_email_delivery_investor_id_fkey";
            columns: ["investor_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "statement_email_delivery_period_id_fkey";
            columns: ["period_id"];
            isOneToOne: false;
            referencedRelation: "statement_periods";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "statement_email_delivery_statement_id_fkey";
            columns: ["statement_id"];
            isOneToOne: false;
            referencedRelation: "generated_statements";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "statement_email_delivery_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      statement_periods: {
        Row: {
          created_at: string | null;
          created_by: string | null;
          finalized_at: string | null;
          finalized_by: string | null;
          id: string;
          month: number;
          notes: string | null;
          period_end_date: string;
          period_name: string;
          status: string | null;
          updated_at: string | null;
          year: number;
        };
        Insert: {
          created_at?: string | null;
          created_by?: string | null;
          finalized_at?: string | null;
          finalized_by?: string | null;
          id?: string;
          month: number;
          notes?: string | null;
          period_end_date: string;
          period_name: string;
          status?: string | null;
          updated_at?: string | null;
          year: number;
        };
        Update: {
          created_at?: string | null;
          created_by?: string | null;
          finalized_at?: string | null;
          finalized_by?: string | null;
          id?: string;
          month?: number;
          notes?: string | null;
          period_end_date?: string;
          period_name?: string;
          status?: string | null;
          updated_at?: string | null;
          year?: number;
        };
        Relationships: [
          {
            foreignKeyName: "statement_periods_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "statement_periods_finalized_by_fkey";
            columns: ["finalized_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      statements: {
        Row: {
          additions: number;
          asset_code: Database["public"]["Enums"]["asset_code"];
          begin_balance: number;
          created_at: string;
          end_balance: number;
          id: string;
          investor_id: string;
          investor_profile_id: string | null;
          net_income: number;
          period_month: number;
          period_year: number;
          rate_of_return_itd: number | null;
          rate_of_return_mtd: number | null;
          rate_of_return_qtd: number | null;
          rate_of_return_ytd: number | null;
          redemptions: number;
          storage_path: string | null;
        };
        Insert: {
          additions: number;
          asset_code: Database["public"]["Enums"]["asset_code"];
          begin_balance: number;
          created_at?: string;
          end_balance: number;
          id?: string;
          investor_id: string;
          investor_profile_id?: string | null;
          net_income: number;
          period_month: number;
          period_year: number;
          rate_of_return_itd?: number | null;
          rate_of_return_mtd?: number | null;
          rate_of_return_qtd?: number | null;
          rate_of_return_ytd?: number | null;
          redemptions: number;
          storage_path?: string | null;
        };
        Update: {
          additions?: number;
          asset_code?: Database["public"]["Enums"]["asset_code"];
          begin_balance?: number;
          created_at?: string;
          end_balance?: number;
          id?: string;
          investor_id?: string;
          investor_profile_id?: string | null;
          net_income?: number;
          period_month?: number;
          period_year?: number;
          rate_of_return_itd?: number | null;
          rate_of_return_mtd?: number | null;
          rate_of_return_qtd?: number | null;
          rate_of_return_ytd?: number | null;
          redemptions?: number;
          storage_path?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "fk_statements_investor_profile";
            columns: ["investor_profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      support_tickets: {
        Row: {
          assigned_admin_id: string | null;
          attachments: string[] | null;
          category: Database["public"]["Enums"]["ticket_category"];
          created_at: string;
          id: string;
          messages_jsonb: Json;
          priority: Database["public"]["Enums"]["ticket_priority"];
          status: Database["public"]["Enums"]["ticket_status"];
          subject: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          assigned_admin_id?: string | null;
          attachments?: string[] | null;
          category?: Database["public"]["Enums"]["ticket_category"];
          created_at?: string;
          id?: string;
          messages_jsonb?: Json;
          priority?: Database["public"]["Enums"]["ticket_priority"];
          status?: Database["public"]["Enums"]["ticket_status"];
          subject: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          assigned_admin_id?: string | null;
          attachments?: string[] | null;
          category?: Database["public"]["Enums"]["ticket_category"];
          created_at?: string;
          id?: string;
          messages_jsonb?: Json;
          priority?: Database["public"]["Enums"]["ticket_priority"];
          status?: Database["public"]["Enums"]["ticket_status"];
          subject?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      system_config: {
        Row: {
          description: string | null;
          key: string;
          updated_at: string | null;
          updated_by: string | null;
          value: Json;
        };
        Insert: {
          description?: string | null;
          key: string;
          updated_at?: string | null;
          updated_by?: string | null;
          value: Json;
        };
        Update: {
          description?: string | null;
          key?: string;
          updated_at?: string | null;
          updated_by?: string | null;
          value?: Json;
        };
        Relationships: [
          {
            foreignKeyName: "system_config_updated_by_fkey";
            columns: ["updated_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      transactions_v2: {
        Row: {
          amount: number;
          approved_at: string | null;
          approved_by: string | null;
          asset: string;
          balance_after: number | null;
          balance_before: number | null;
          correction_id: string | null;
          created_at: string | null;
          created_by: string | null;
          distribution_id: string | null;
          fund_class: string | null;
          fund_id: string;
          id: string;
          investor_id: string | null;
          is_system_generated: boolean | null;
          is_voided: boolean;
          meta: Json | null;
          notes: string | null;
          purpose: Database["public"]["Enums"]["aum_purpose"] | null;
          reference_id: string | null;
          source: Database["public"]["Enums"]["tx_source"] | null;
          transfer_id: string | null;
          tx_date: string;
          tx_hash: string | null;
          tx_subtype: string | null;
          type: Database["public"]["Enums"]["tx_type"];
          value_date: string;
          visibility_scope: Database["public"]["Enums"]["visibility_scope"];
          void_reason: string | null;
          voided_at: string | null;
          voided_by: string | null;
          voided_by_profile_id: string | null;
        };
        Insert: {
          amount: number;
          approved_at?: string | null;
          approved_by?: string | null;
          asset: string;
          balance_after?: number | null;
          balance_before?: number | null;
          correction_id?: string | null;
          created_at?: string | null;
          created_by?: string | null;
          distribution_id?: string | null;
          fund_class?: string | null;
          fund_id: string;
          id?: string;
          investor_id?: string | null;
          is_system_generated?: boolean | null;
          is_voided?: boolean;
          meta?: Json | null;
          notes?: string | null;
          purpose?: Database["public"]["Enums"]["aum_purpose"] | null;
          reference_id?: string | null;
          source?: Database["public"]["Enums"]["tx_source"] | null;
          transfer_id?: string | null;
          tx_date?: string;
          tx_hash?: string | null;
          tx_subtype?: string | null;
          type: Database["public"]["Enums"]["tx_type"];
          value_date?: string;
          visibility_scope?: Database["public"]["Enums"]["visibility_scope"];
          void_reason?: string | null;
          voided_at?: string | null;
          voided_by?: string | null;
          voided_by_profile_id?: string | null;
        };
        Update: {
          amount?: number;
          approved_at?: string | null;
          approved_by?: string | null;
          asset?: string;
          balance_after?: number | null;
          balance_before?: number | null;
          correction_id?: string | null;
          created_at?: string | null;
          created_by?: string | null;
          distribution_id?: string | null;
          fund_class?: string | null;
          fund_id?: string;
          id?: string;
          investor_id?: string | null;
          is_system_generated?: boolean | null;
          is_voided?: boolean;
          meta?: Json | null;
          notes?: string | null;
          purpose?: Database["public"]["Enums"]["aum_purpose"] | null;
          reference_id?: string | null;
          source?: Database["public"]["Enums"]["tx_source"] | null;
          transfer_id?: string | null;
          tx_date?: string;
          tx_hash?: string | null;
          tx_subtype?: string | null;
          type?: Database["public"]["Enums"]["tx_type"];
          value_date?: string;
          visibility_scope?: Database["public"]["Enums"]["visibility_scope"];
          void_reason?: string | null;
          voided_at?: string | null;
          voided_by?: string | null;
          voided_by_profile_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "fk_transactions_v2_distribution";
            columns: ["distribution_id"];
            isOneToOne: false;
            referencedRelation: "v_yield_conservation_violations";
            referencedColumns: ["distribution_id"];
          },
          {
            foreignKeyName: "fk_transactions_v2_distribution";
            columns: ["distribution_id"];
            isOneToOne: false;
            referencedRelation: "yield_distribution_conservation_check";
            referencedColumns: ["distribution_id"];
          },
          {
            foreignKeyName: "fk_transactions_v2_distribution";
            columns: ["distribution_id"];
            isOneToOne: false;
            referencedRelation: "yield_distributions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "fk_transactions_v2_fund";
            columns: ["fund_id"];
            isOneToOne: false;
            referencedRelation: "aum_position_reconciliation";
            referencedColumns: ["fund_id"];
          },
          {
            foreignKeyName: "fk_transactions_v2_fund";
            columns: ["fund_id"];
            isOneToOne: false;
            referencedRelation: "fund_aum_mismatch";
            referencedColumns: ["fund_id"];
          },
          {
            foreignKeyName: "fk_transactions_v2_fund";
            columns: ["fund_id"];
            isOneToOne: false;
            referencedRelation: "funds";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "fk_transactions_v2_fund";
            columns: ["fund_id"];
            isOneToOne: false;
            referencedRelation: "v_crystallization_dashboard";
            referencedColumns: ["fund_id"];
          },
          {
            foreignKeyName: "fk_transactions_v2_fund";
            columns: ["fund_id"];
            isOneToOne: false;
            referencedRelation: "v_fund_aum_position_health";
            referencedColumns: ["fund_id"];
          },
          {
            foreignKeyName: "fk_transactions_v2_fund";
            columns: ["fund_id"];
            isOneToOne: false;
            referencedRelation: "v_liquidity_risk";
            referencedColumns: ["fund_id"];
          },
          {
            foreignKeyName: "fk_transactions_v2_investor";
            columns: ["investor_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "fk_transactions_v2_voided_by_profile";
            columns: ["voided_by_profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "transactions_v2_approved_by_fkey";
            columns: ["approved_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "transactions_v2_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "transactions_v2_investor_id_fkey";
            columns: ["investor_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      user_roles: {
        Row: {
          created_at: string | null;
          id: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Insert: {
          created_at?: string | null;
          id?: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Update: {
          created_at?: string | null;
          id?: string;
          role?: Database["public"]["Enums"]["app_role"];
          user_id?: string;
        };
        Relationships: [];
      };
      withdrawal_requests: {
        Row: {
          admin_notes: string | null;
          approved_amount: number | null;
          approved_at: string | null;
          approved_by: string | null;
          approved_shares: number | null;
          cancellation_reason: string | null;
          cancelled_at: string | null;
          cancelled_by: string | null;
          created_by: string | null;
          earliest_processing_at: string | null;
          fund_class: string | null;
          fund_id: string;
          id: string;
          investor_id: string | null;
          notes: string | null;
          processed_amount: number | null;
          processed_at: string | null;
          rejected_at: string | null;
          rejected_by: string | null;
          rejection_reason: string | null;
          request_date: string;
          requested_amount: number;
          requested_shares: number | null;
          settlement_date: string | null;
          status: Database["public"]["Enums"]["withdrawal_status"];
          tx_hash: string | null;
          updated_at: string | null;
          version: number | null;
          withdrawal_type: string;
        };
        Insert: {
          admin_notes?: string | null;
          approved_amount?: number | null;
          approved_at?: string | null;
          approved_by?: string | null;
          approved_shares?: number | null;
          cancellation_reason?: string | null;
          cancelled_at?: string | null;
          cancelled_by?: string | null;
          created_by?: string | null;
          earliest_processing_at?: string | null;
          fund_class?: string | null;
          fund_id: string;
          id?: string;
          investor_id?: string | null;
          notes?: string | null;
          processed_amount?: number | null;
          processed_at?: string | null;
          rejected_at?: string | null;
          rejected_by?: string | null;
          rejection_reason?: string | null;
          request_date?: string;
          requested_amount: number;
          requested_shares?: number | null;
          settlement_date?: string | null;
          status?: Database["public"]["Enums"]["withdrawal_status"];
          tx_hash?: string | null;
          updated_at?: string | null;
          version?: number | null;
          withdrawal_type: string;
        };
        Update: {
          admin_notes?: string | null;
          approved_amount?: number | null;
          approved_at?: string | null;
          approved_by?: string | null;
          approved_shares?: number | null;
          cancellation_reason?: string | null;
          cancelled_at?: string | null;
          cancelled_by?: string | null;
          created_by?: string | null;
          earliest_processing_at?: string | null;
          fund_class?: string | null;
          fund_id?: string;
          id?: string;
          investor_id?: string | null;
          notes?: string | null;
          processed_amount?: number | null;
          processed_at?: string | null;
          rejected_at?: string | null;
          rejected_by?: string | null;
          rejection_reason?: string | null;
          request_date?: string;
          requested_amount?: number;
          requested_shares?: number | null;
          settlement_date?: string | null;
          status?: Database["public"]["Enums"]["withdrawal_status"];
          tx_hash?: string | null;
          updated_at?: string | null;
          version?: number | null;
          withdrawal_type?: string;
        };
        Relationships: [
          {
            foreignKeyName: "fk_withdrawal_requests_profile";
            columns: ["investor_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "withdrawal_requests_approved_by_fkey";
            columns: ["approved_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "withdrawal_requests_cancelled_by_fkey";
            columns: ["cancelled_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "withdrawal_requests_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "withdrawal_requests_fund_id_fkey";
            columns: ["fund_id"];
            isOneToOne: false;
            referencedRelation: "aum_position_reconciliation";
            referencedColumns: ["fund_id"];
          },
          {
            foreignKeyName: "withdrawal_requests_fund_id_fkey";
            columns: ["fund_id"];
            isOneToOne: false;
            referencedRelation: "fund_aum_mismatch";
            referencedColumns: ["fund_id"];
          },
          {
            foreignKeyName: "withdrawal_requests_fund_id_fkey";
            columns: ["fund_id"];
            isOneToOne: false;
            referencedRelation: "funds";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "withdrawal_requests_fund_id_fkey";
            columns: ["fund_id"];
            isOneToOne: false;
            referencedRelation: "v_crystallization_dashboard";
            referencedColumns: ["fund_id"];
          },
          {
            foreignKeyName: "withdrawal_requests_fund_id_fkey";
            columns: ["fund_id"];
            isOneToOne: false;
            referencedRelation: "v_fund_aum_position_health";
            referencedColumns: ["fund_id"];
          },
          {
            foreignKeyName: "withdrawal_requests_fund_id_fkey";
            columns: ["fund_id"];
            isOneToOne: false;
            referencedRelation: "v_liquidity_risk";
            referencedColumns: ["fund_id"];
          },
          {
            foreignKeyName: "withdrawal_requests_rejected_by_fkey";
            columns: ["rejected_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      yield_allocations: {
        Row: {
          adb_share: number | null;
          created_at: string | null;
          distribution_id: string;
          fee_amount: number | null;
          fee_pct: number | null;
          fee_transaction_id: string | null;
          fund_id: string | null;
          gross_amount: number;
          ib_amount: number | null;
          ib_pct: number | null;
          ib_transaction_id: string | null;
          id: string;
          investor_id: string;
          is_voided: boolean | null;
          fee_credit: number | null;
          ib_credit: number | null;
          net_amount: number;
          ownership_pct: number | null;
          position_value_at_calc: number | null;
          transaction_id: string | null;
        };
        Insert: {
          adb_share?: number | null;
          created_at?: string | null;
          distribution_id: string;
          fee_amount?: number | null;
          fee_pct?: number | null;
          fee_transaction_id?: string | null;
          fund_id?: string | null;
          gross_amount: number;
          ib_amount?: number | null;
          ib_pct?: number | null;
          ib_transaction_id?: string | null;
          id?: string;
          investor_id: string;
          is_voided?: boolean | null;
          fee_credit?: number | null;
          ib_credit?: number | null;
          net_amount: number;
          ownership_pct?: number | null;
          position_value_at_calc?: number | null;
          transaction_id?: string | null;
        };
        Update: {
          adb_share?: number | null;
          created_at?: string | null;
          distribution_id?: string;
          fee_amount?: number | null;
          fee_pct?: number | null;
          fee_transaction_id?: string | null;
          fund_id?: string | null;
          gross_amount?: number;
          ib_amount?: number | null;
          ib_pct?: number | null;
          ib_transaction_id?: string | null;
          id?: string;
          investor_id?: string;
          is_voided?: boolean | null;
          fee_credit?: number | null;
          ib_credit?: number | null;
          net_amount?: number;
          ownership_pct?: number | null;
          position_value_at_calc?: number | null;
          transaction_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "yield_allocations_fund_id_fkey";
            columns: ["fund_id"];
            isOneToOne: false;
            referencedRelation: "aum_position_reconciliation";
            referencedColumns: ["fund_id"];
          },
          {
            foreignKeyName: "yield_allocations_fund_id_fkey";
            columns: ["fund_id"];
            isOneToOne: false;
            referencedRelation: "fund_aum_mismatch";
            referencedColumns: ["fund_id"];
          },
          {
            foreignKeyName: "yield_allocations_fund_id_fkey";
            columns: ["fund_id"];
            isOneToOne: false;
            referencedRelation: "funds";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "yield_allocations_fund_id_fkey";
            columns: ["fund_id"];
            isOneToOne: false;
            referencedRelation: "v_crystallization_dashboard";
            referencedColumns: ["fund_id"];
          },
          {
            foreignKeyName: "yield_allocations_fund_id_fkey";
            columns: ["fund_id"];
            isOneToOne: false;
            referencedRelation: "v_fund_aum_position_health";
            referencedColumns: ["fund_id"];
          },
          {
            foreignKeyName: "yield_allocations_fund_id_fkey";
            columns: ["fund_id"];
            isOneToOne: false;
            referencedRelation: "v_liquidity_risk";
            referencedColumns: ["fund_id"];
          },
          {
            foreignKeyName: "yield_allocations_ib_transaction_id_fkey";
            columns: ["ib_transaction_id"];
            isOneToOne: false;
            referencedRelation: "transactions_v2";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "yield_allocations_ib_transaction_id_fkey";
            columns: ["ib_transaction_id"];
            isOneToOne: false;
            referencedRelation: "v_orphaned_transactions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "yield_allocations_ib_transaction_id_fkey";
            columns: ["ib_transaction_id"];
            isOneToOne: false;
            referencedRelation: "v_transaction_distribution_orphans";
            referencedColumns: ["transaction_id"];
          },
        ];
      };
      yield_distributions: {
        Row: {
          allocation_count: number | null;
          aum_record_id: string | null;
          calculation_method: string | null;
          closing_aum: number | null;
          consolidated_into_id: string | null;
          created_at: string;
          created_by: string | null;
          distribution_type: string;
          dust_amount: number | null;
          dust_receiver_id: string | null;
          effective_date: string;
          fund_id: string;
          gross_yield: number;
          gross_yield_amount: number | null;
          id: string;
          investor_count: number | null;
          is_month_end: boolean;
          is_voided: boolean | null;
          net_yield: number | null;
          opening_aum: number | null;
          parent_distribution_id: string | null;
          period_end: string | null;
          period_start: string | null;
          previous_aum: number | null;
          purpose: Database["public"]["Enums"]["aum_purpose"];
          reason: string | null;
          recorded_aum: number;
          reference_id: string | null;
          snapshot_time: string | null;
          status: string;
          summary_json: Json | null;
          total_fee_amount: number | null;
          total_fees: number | null;
          total_ib: number | null;
          total_ib_amount: number | null;
          total_net_amount: number | null;
          void_reason: string | null;
          voided_at: string | null;
          voided_by: string | null;
          yield_date: string | null;
          yield_percentage: number | null;
        };
        Insert: {
          allocation_count?: number | null;
          aum_record_id?: string | null;
          calculation_method?: string | null;
          closing_aum?: number | null;
          consolidated_into_id?: string | null;
          created_at?: string;
          created_by?: string | null;
          distribution_type?: string;
          dust_amount?: number | null;
          dust_receiver_id?: string | null;
          effective_date: string;
          fund_id: string;
          gross_yield?: number;
          gross_yield_amount?: number | null;
          id?: string;
          investor_count?: number | null;
          is_month_end?: boolean;
          is_voided?: boolean | null;
          net_yield?: number | null;
          opening_aum?: number | null;
          parent_distribution_id?: string | null;
          period_end?: string | null;
          period_start?: string | null;
          previous_aum?: number | null;
          purpose: Database["public"]["Enums"]["aum_purpose"];
          reason?: string | null;
          recorded_aum: number;
          reference_id?: string | null;
          snapshot_time?: string | null;
          status: string;
          summary_json?: Json | null;
          total_fee_amount?: number | null;
          total_fees?: number | null;
          total_ib?: number | null;
          total_ib_amount?: number | null;
          total_net_amount?: number | null;
          void_reason?: string | null;
          voided_at?: string | null;
          voided_by?: string | null;
          yield_date?: string | null;
          yield_percentage?: number | null;
        };
        Update: {
          allocation_count?: number | null;
          aum_record_id?: string | null;
          calculation_method?: string | null;
          closing_aum?: number | null;
          consolidated_into_id?: string | null;
          created_at?: string;
          created_by?: string | null;
          distribution_type?: string;
          dust_amount?: number | null;
          dust_receiver_id?: string | null;
          effective_date?: string;
          fund_id?: string;
          gross_yield?: number;
          gross_yield_amount?: number | null;
          id?: string;
          investor_count?: number | null;
          is_month_end?: boolean;
          is_voided?: boolean | null;
          net_yield?: number | null;
          opening_aum?: number | null;
          parent_distribution_id?: string | null;
          period_end?: string | null;
          period_start?: string | null;
          previous_aum?: number | null;
          purpose?: Database["public"]["Enums"]["aum_purpose"];
          reason?: string | null;
          recorded_aum?: number;
          reference_id?: string | null;
          snapshot_time?: string | null;
          status?: string;
          summary_json?: Json | null;
          total_fee_amount?: number | null;
          total_fees?: number | null;
          total_ib?: number | null;
          total_ib_amount?: number | null;
          total_net_amount?: number | null;
          void_reason?: string | null;
          voided_at?: string | null;
          voided_by?: string | null;
          yield_date?: string | null;
          yield_percentage?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "fk_yield_distributions_fund_new";
            columns: ["fund_id"];
            isOneToOne: false;
            referencedRelation: "aum_position_reconciliation";
            referencedColumns: ["fund_id"];
          },
          {
            foreignKeyName: "fk_yield_distributions_fund_new";
            columns: ["fund_id"];
            isOneToOne: false;
            referencedRelation: "fund_aum_mismatch";
            referencedColumns: ["fund_id"];
          },
          {
            foreignKeyName: "fk_yield_distributions_fund_new";
            columns: ["fund_id"];
            isOneToOne: false;
            referencedRelation: "funds";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "fk_yield_distributions_fund_new";
            columns: ["fund_id"];
            isOneToOne: false;
            referencedRelation: "v_crystallization_dashboard";
            referencedColumns: ["fund_id"];
          },
          {
            foreignKeyName: "fk_yield_distributions_fund_new";
            columns: ["fund_id"];
            isOneToOne: false;
            referencedRelation: "v_fund_aum_position_health";
            referencedColumns: ["fund_id"];
          },
          {
            foreignKeyName: "fk_yield_distributions_fund_new";
            columns: ["fund_id"];
            isOneToOne: false;
            referencedRelation: "v_liquidity_risk";
            referencedColumns: ["fund_id"];
          },
          {
            foreignKeyName: "yield_distributions_aum_record_id_fkey";
            columns: ["aum_record_id"];
            isOneToOne: false;
            referencedRelation: "fund_daily_aum";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "yield_distributions_aum_record_id_fkey";
            columns: ["aum_record_id"];
            isOneToOne: false;
            referencedRelation: "v_fund_daily_aum_orphans";
            referencedColumns: ["aum_id"];
          },
          {
            foreignKeyName: "yield_distributions_consolidated_into_id_fkey";
            columns: ["consolidated_into_id"];
            isOneToOne: false;
            referencedRelation: "v_yield_conservation_violations";
            referencedColumns: ["distribution_id"];
          },
          {
            foreignKeyName: "yield_distributions_consolidated_into_id_fkey";
            columns: ["consolidated_into_id"];
            isOneToOne: false;
            referencedRelation: "yield_distribution_conservation_check";
            referencedColumns: ["distribution_id"];
          },
          {
            foreignKeyName: "yield_distributions_consolidated_into_id_fkey";
            columns: ["consolidated_into_id"];
            isOneToOne: false;
            referencedRelation: "yield_distributions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "yield_distributions_dust_receiver_id_fkey";
            columns: ["dust_receiver_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "yield_distributions_parent_distribution_id_fkey";
            columns: ["parent_distribution_id"];
            isOneToOne: false;
            referencedRelation: "v_yield_conservation_violations";
            referencedColumns: ["distribution_id"];
          },
          {
            foreignKeyName: "yield_distributions_parent_distribution_id_fkey";
            columns: ["parent_distribution_id"];
            isOneToOne: false;
            referencedRelation: "yield_distribution_conservation_check";
            referencedColumns: ["distribution_id"];
          },
          {
            foreignKeyName: "yield_distributions_parent_distribution_id_fkey";
            columns: ["parent_distribution_id"];
            isOneToOne: false;
            referencedRelation: "yield_distributions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "yield_distributions_voided_by_fkey";
            columns: ["voided_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      yield_rate_sanity_config: {
        Row: {
          alert_threshold_pct: number | null;
          created_at: string | null;
          fund_id: string;
          id: string;
          max_daily_yield_pct: number;
          min_daily_yield_pct: number | null;
          updated_at: string | null;
        };
        Insert: {
          alert_threshold_pct?: number | null;
          created_at?: string | null;
          fund_id: string;
          id?: string;
          max_daily_yield_pct?: number;
          min_daily_yield_pct?: number | null;
          updated_at?: string | null;
        };
        Update: {
          alert_threshold_pct?: number | null;
          created_at?: string | null;
          fund_id?: string;
          id?: string;
          max_daily_yield_pct?: number;
          min_daily_yield_pct?: number | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "fk_fund_sanity";
            columns: ["fund_id"];
            isOneToOne: true;
            referencedRelation: "aum_position_reconciliation";
            referencedColumns: ["fund_id"];
          },
          {
            foreignKeyName: "fk_fund_sanity";
            columns: ["fund_id"];
            isOneToOne: true;
            referencedRelation: "fund_aum_mismatch";
            referencedColumns: ["fund_id"];
          },
          {
            foreignKeyName: "fk_fund_sanity";
            columns: ["fund_id"];
            isOneToOne: true;
            referencedRelation: "funds";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "fk_fund_sanity";
            columns: ["fund_id"];
            isOneToOne: true;
            referencedRelation: "v_crystallization_dashboard";
            referencedColumns: ["fund_id"];
          },
          {
            foreignKeyName: "fk_fund_sanity";
            columns: ["fund_id"];
            isOneToOne: true;
            referencedRelation: "v_fund_aum_position_health";
            referencedColumns: ["fund_id"];
          },
          {
            foreignKeyName: "fk_fund_sanity";
            columns: ["fund_id"];
            isOneToOne: true;
            referencedRelation: "v_liquidity_risk";
            referencedColumns: ["fund_id"];
          },
          {
            foreignKeyName: "yield_rate_sanity_config_fund_id_fkey";
            columns: ["fund_id"];
            isOneToOne: true;
            referencedRelation: "aum_position_reconciliation";
            referencedColumns: ["fund_id"];
          },
          {
            foreignKeyName: "yield_rate_sanity_config_fund_id_fkey";
            columns: ["fund_id"];
            isOneToOne: true;
            referencedRelation: "fund_aum_mismatch";
            referencedColumns: ["fund_id"];
          },
          {
            foreignKeyName: "yield_rate_sanity_config_fund_id_fkey";
            columns: ["fund_id"];
            isOneToOne: true;
            referencedRelation: "funds";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "yield_rate_sanity_config_fund_id_fkey";
            columns: ["fund_id"];
            isOneToOne: true;
            referencedRelation: "v_crystallization_dashboard";
            referencedColumns: ["fund_id"];
          },
          {
            foreignKeyName: "yield_rate_sanity_config_fund_id_fkey";
            columns: ["fund_id"];
            isOneToOne: true;
            referencedRelation: "v_fund_aum_position_health";
            referencedColumns: ["fund_id"];
          },
          {
            foreignKeyName: "yield_rate_sanity_config_fund_id_fkey";
            columns: ["fund_id"];
            isOneToOne: true;
            referencedRelation: "v_liquidity_risk";
            referencedColumns: ["fund_id"];
          },
        ];
      };
    };
    Views: {
      aum_position_reconciliation: {
        Row: {
          aum_date: string | null;
          calculated_aum: number | null;
          discrepancy: number | null;
          fund_id: string | null;
          fund_name: string | null;
          has_discrepancy: boolean | null;
          recorded_aum: number | null;
        };
        Relationships: [];
      };
      fund_aum_mismatch: {
        Row: {
          asset: string | null;
          aum_date: string | null;
          discrepancy: number | null;
          fund_id: string | null;
          fund_name: string | null;
          position_sum: number | null;
          recorded_aum: number | null;
        };
        Relationships: [];
      };
      ib_allocation_consistency: {
        Row: {
          allocated_ib_id: string | null;
          allocated_ib_name: string | null;
          allocation_id: string | null;
          current_ib_id: string | null;
          current_ib_name: string | null;
          effective_date: string | null;
          ib_changed_since_allocation: boolean | null;
          ib_fee_amount: number | null;
          ib_removed: boolean | null;
          source_investor_id: string | null;
          source_investor_name: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "ib_allocations_ib_investor_id_fkey";
            columns: ["allocated_ib_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ib_allocations_source_investor_id_fkey";
            columns: ["source_investor_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "profiles_ib_parent_id_fkey";
            columns: ["current_ib_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      investor_position_ledger_mismatch: {
        Row: {
          discrepancy: number | null;
          fund_id: string | null;
          investor_id: string | null;
          ledger_balance: number | null;
          position_balance: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "fk_investor_positions_fund";
            columns: ["fund_id"];
            isOneToOne: false;
            referencedRelation: "aum_position_reconciliation";
            referencedColumns: ["fund_id"];
          },
          {
            foreignKeyName: "fk_investor_positions_fund";
            columns: ["fund_id"];
            isOneToOne: false;
            referencedRelation: "fund_aum_mismatch";
            referencedColumns: ["fund_id"];
          },
          {
            foreignKeyName: "fk_investor_positions_fund";
            columns: ["fund_id"];
            isOneToOne: false;
            referencedRelation: "funds";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "fk_investor_positions_fund";
            columns: ["fund_id"];
            isOneToOne: false;
            referencedRelation: "v_crystallization_dashboard";
            referencedColumns: ["fund_id"];
          },
          {
            foreignKeyName: "fk_investor_positions_fund";
            columns: ["fund_id"];
            isOneToOne: false;
            referencedRelation: "v_fund_aum_position_health";
            referencedColumns: ["fund_id"];
          },
          {
            foreignKeyName: "fk_investor_positions_fund";
            columns: ["fund_id"];
            isOneToOne: false;
            referencedRelation: "v_liquidity_risk";
            referencedColumns: ["fund_id"];
          },
          {
            foreignKeyName: "fk_investor_positions_investor";
            columns: ["investor_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      position_transaction_reconciliation: {
        Row: {
          difference: number | null;
          fund_id: string | null;
          investor_id: string | null;
          position_value: number | null;
          transaction_sum: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "fk_investor_positions_fund";
            columns: ["fund_id"];
            isOneToOne: false;
            referencedRelation: "aum_position_reconciliation";
            referencedColumns: ["fund_id"];
          },
          {
            foreignKeyName: "fk_investor_positions_fund";
            columns: ["fund_id"];
            isOneToOne: false;
            referencedRelation: "fund_aum_mismatch";
            referencedColumns: ["fund_id"];
          },
          {
            foreignKeyName: "fk_investor_positions_fund";
            columns: ["fund_id"];
            isOneToOne: false;
            referencedRelation: "funds";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "fk_investor_positions_fund";
            columns: ["fund_id"];
            isOneToOne: false;
            referencedRelation: "v_crystallization_dashboard";
            referencedColumns: ["fund_id"];
          },
          {
            foreignKeyName: "fk_investor_positions_fund";
            columns: ["fund_id"];
            isOneToOne: false;
            referencedRelation: "v_fund_aum_position_health";
            referencedColumns: ["fund_id"];
          },
          {
            foreignKeyName: "fk_investor_positions_fund";
            columns: ["fund_id"];
            isOneToOne: false;
            referencedRelation: "v_liquidity_risk";
            referencedColumns: ["fund_id"];
          },
          {
            foreignKeyName: "fk_investor_positions_investor";
            columns: ["investor_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      v_cost_basis_mismatch: {
        Row: {
          computed_cost_basis: number | null;
          computed_current_value: number | null;
          computed_shares: number | null;
          cost_basis_variance: number | null;
          cost_basis_variance_pct: number | null;
          current_value_variance: number | null;
          fund_code: string | null;
          fund_id: string | null;
          investor_email: string | null;
          investor_id: string | null;
          investor_name: string | null;
          position_cost_basis: number | null;
          position_current_value: number | null;
          position_shares: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "fk_investor_positions_fund";
            columns: ["fund_id"];
            isOneToOne: false;
            referencedRelation: "aum_position_reconciliation";
            referencedColumns: ["fund_id"];
          },
          {
            foreignKeyName: "fk_investor_positions_fund";
            columns: ["fund_id"];
            isOneToOne: false;
            referencedRelation: "fund_aum_mismatch";
            referencedColumns: ["fund_id"];
          },
          {
            foreignKeyName: "fk_investor_positions_fund";
            columns: ["fund_id"];
            isOneToOne: false;
            referencedRelation: "funds";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "fk_investor_positions_fund";
            columns: ["fund_id"];
            isOneToOne: false;
            referencedRelation: "v_crystallization_dashboard";
            referencedColumns: ["fund_id"];
          },
          {
            foreignKeyName: "fk_investor_positions_fund";
            columns: ["fund_id"];
            isOneToOne: false;
            referencedRelation: "v_fund_aum_position_health";
            referencedColumns: ["fund_id"];
          },
          {
            foreignKeyName: "fk_investor_positions_fund";
            columns: ["fund_id"];
            isOneToOne: false;
            referencedRelation: "v_liquidity_risk";
            referencedColumns: ["fund_id"];
          },
          {
            foreignKeyName: "fk_investor_positions_investor";
            columns: ["investor_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      v_crystallization_dashboard: {
        Row: {
          critical_stale: number | null;
          fund_code: string | null;
          fund_id: string | null;
          fund_name: string | null;
          never_crystallized: number | null;
          newest_crystallization: string | null;
          oldest_crystallization: string | null;
          total_positions: number | null;
          up_to_date: number | null;
          warning_stale: number | null;
        };
        Relationships: [];
      };
      v_crystallization_gaps: {
        Row: {
          cumulative_yield_earned: number | null;
          current_value: number | null;
          days_behind: number | null;
          fund_code: string | null;
          fund_id: string | null;
          gap_type: string | null;
          investor_email: string | null;
          investor_id: string | null;
          last_tx_type: string | null;
          last_yield_crystallization_date: string | null;
          max_tx_date: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "fk_investor_positions_fund";
            columns: ["fund_id"];
            isOneToOne: false;
            referencedRelation: "aum_position_reconciliation";
            referencedColumns: ["fund_id"];
          },
          {
            foreignKeyName: "fk_investor_positions_fund";
            columns: ["fund_id"];
            isOneToOne: false;
            referencedRelation: "fund_aum_mismatch";
            referencedColumns: ["fund_id"];
          },
          {
            foreignKeyName: "fk_investor_positions_fund";
            columns: ["fund_id"];
            isOneToOne: false;
            referencedRelation: "funds";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "fk_investor_positions_fund";
            columns: ["fund_id"];
            isOneToOne: false;
            referencedRelation: "v_crystallization_dashboard";
            referencedColumns: ["fund_id"];
          },
          {
            foreignKeyName: "fk_investor_positions_fund";
            columns: ["fund_id"];
            isOneToOne: false;
            referencedRelation: "v_fund_aum_position_health";
            referencedColumns: ["fund_id"];
          },
          {
            foreignKeyName: "fk_investor_positions_fund";
            columns: ["fund_id"];
            isOneToOne: false;
            referencedRelation: "v_liquidity_risk";
            referencedColumns: ["fund_id"];
          },
          {
            foreignKeyName: "fk_investor_positions_investor";
            columns: ["investor_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      v_fee_allocation_orphans: {
        Row: {
          distribution_id: string | null;
          fee_allocation_id: string | null;
          fee_amount: number | null;
          investor_id: string | null;
          is_voided: boolean | null;
        };
        Relationships: [
          {
            foreignKeyName: "fk_fee_allocations_distribution";
            columns: ["distribution_id"];
            isOneToOne: false;
            referencedRelation: "v_yield_conservation_violations";
            referencedColumns: ["distribution_id"];
          },
          {
            foreignKeyName: "fk_fee_allocations_distribution";
            columns: ["distribution_id"];
            isOneToOne: false;
            referencedRelation: "yield_distribution_conservation_check";
            referencedColumns: ["distribution_id"];
          },
          {
            foreignKeyName: "fk_fee_allocations_distribution";
            columns: ["distribution_id"];
            isOneToOne: false;
            referencedRelation: "yield_distributions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "fk_fee_allocations_investor_v2";
            columns: ["investor_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      v_fee_calculation_orphans: {
        Row: {
          base_net_income: number | null;
          created_at: string | null;
          created_by: string | null;
          credit_transaction_id: string | null;
          debit_transaction_id: string | null;
          distribution_id: string | null;
          fee_amount: number | null;
          fee_percentage: number | null;
          fees_account_id: string | null;
          fund_id: string | null;
          id: string | null;
          investor_id: string | null;
          is_voided: boolean | null;
          period_end: string | null;
          period_start: string | null;
          purpose: Database["public"]["Enums"]["aum_purpose"] | null;
          voided_at: string | null;
          voided_by: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "fee_allocations_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "fee_allocations_credit_transaction_id_fkey";
            columns: ["credit_transaction_id"];
            isOneToOne: false;
            referencedRelation: "transactions_v2";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "fee_allocations_credit_transaction_id_fkey";
            columns: ["credit_transaction_id"];
            isOneToOne: false;
            referencedRelation: "v_orphaned_transactions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "fee_allocations_credit_transaction_id_fkey";
            columns: ["credit_transaction_id"];
            isOneToOne: false;
            referencedRelation: "v_transaction_distribution_orphans";
            referencedColumns: ["transaction_id"];
          },
          {
            foreignKeyName: "fee_allocations_debit_transaction_id_fkey";
            columns: ["debit_transaction_id"];
            isOneToOne: false;
            referencedRelation: "transactions_v2";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "fee_allocations_debit_transaction_id_fkey";
            columns: ["debit_transaction_id"];
            isOneToOne: false;
            referencedRelation: "v_orphaned_transactions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "fee_allocations_debit_transaction_id_fkey";
            columns: ["debit_transaction_id"];
            isOneToOne: false;
            referencedRelation: "v_transaction_distribution_orphans";
            referencedColumns: ["transaction_id"];
          },
          {
            foreignKeyName: "fee_allocations_fees_account_id_fkey";
            columns: ["fees_account_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "fk_fee_allocations_distribution";
            columns: ["distribution_id"];
            isOneToOne: false;
            referencedRelation: "v_yield_conservation_violations";
            referencedColumns: ["distribution_id"];
          },
          {
            foreignKeyName: "fk_fee_allocations_distribution";
            columns: ["distribution_id"];
            isOneToOne: false;
            referencedRelation: "yield_distribution_conservation_check";
            referencedColumns: ["distribution_id"];
          },
          {
            foreignKeyName: "fk_fee_allocations_distribution";
            columns: ["distribution_id"];
            isOneToOne: false;
            referencedRelation: "yield_distributions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "fk_fee_allocations_fund_v2";
            columns: ["fund_id"];
            isOneToOne: false;
            referencedRelation: "aum_position_reconciliation";
            referencedColumns: ["fund_id"];
          },
          {
            foreignKeyName: "fk_fee_allocations_fund_v2";
            columns: ["fund_id"];
            isOneToOne: false;
            referencedRelation: "fund_aum_mismatch";
            referencedColumns: ["fund_id"];
          },
          {
            foreignKeyName: "fk_fee_allocations_fund_v2";
            columns: ["fund_id"];
            isOneToOne: false;
            referencedRelation: "funds";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "fk_fee_allocations_fund_v2";
            columns: ["fund_id"];
            isOneToOne: false;
            referencedRelation: "v_crystallization_dashboard";
            referencedColumns: ["fund_id"];
          },
          {
            foreignKeyName: "fk_fee_allocations_fund_v2";
            columns: ["fund_id"];
            isOneToOne: false;
            referencedRelation: "v_fund_aum_position_health";
            referencedColumns: ["fund_id"];
          },
          {
            foreignKeyName: "fk_fee_allocations_fund_v2";
            columns: ["fund_id"];
            isOneToOne: false;
            referencedRelation: "v_liquidity_risk";
            referencedColumns: ["fund_id"];
          },
          {
            foreignKeyName: "fk_fee_allocations_investor_v2";
            columns: ["investor_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      v_fund_aum_position_health: {
        Row: {
          asset: string | null;
          aum_date: string | null;
          aum_source: string | null;
          fund_id: string | null;
          fund_name: string | null;
          health_status: string | null;
          latest_daily_aum: number | null;
          position_sum: number | null;
          status: Database["public"]["Enums"]["fund_status"] | null;
          variance: number | null;
        };
        Relationships: [];
      };
      v_fund_daily_aum_orphans: {
        Row: {
          aum_date: string | null;
          aum_id: string | null;
          fund_id: string | null;
          issue_type: string | null;
          purpose: Database["public"]["Enums"]["aum_purpose"] | null;
          source: string | null;
          total_aum: number | null;
        };
        Insert: {
          aum_date?: string | null;
          aum_id?: string | null;
          fund_id?: string | null;
          issue_type?: never;
          purpose?: Database["public"]["Enums"]["aum_purpose"] | null;
          source?: string | null;
          total_aum?: number | null;
        };
        Update: {
          aum_date?: string | null;
          aum_id?: string | null;
          fund_id?: string | null;
          issue_type?: never;
          purpose?: Database["public"]["Enums"]["aum_purpose"] | null;
          source?: string | null;
          total_aum?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "fund_daily_aum_fund_id_fkey";
            columns: ["fund_id"];
            isOneToOne: false;
            referencedRelation: "aum_position_reconciliation";
            referencedColumns: ["fund_id"];
          },
          {
            foreignKeyName: "fund_daily_aum_fund_id_fkey";
            columns: ["fund_id"];
            isOneToOne: false;
            referencedRelation: "fund_aum_mismatch";
            referencedColumns: ["fund_id"];
          },
          {
            foreignKeyName: "fund_daily_aum_fund_id_fkey";
            columns: ["fund_id"];
            isOneToOne: false;
            referencedRelation: "funds";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "fund_daily_aum_fund_id_fkey";
            columns: ["fund_id"];
            isOneToOne: false;
            referencedRelation: "v_crystallization_dashboard";
            referencedColumns: ["fund_id"];
          },
          {
            foreignKeyName: "fund_daily_aum_fund_id_fkey";
            columns: ["fund_id"];
            isOneToOne: false;
            referencedRelation: "v_fund_aum_position_health";
            referencedColumns: ["fund_id"];
          },
          {
            foreignKeyName: "fund_daily_aum_fund_id_fkey";
            columns: ["fund_id"];
            isOneToOne: false;
            referencedRelation: "v_liquidity_risk";
            referencedColumns: ["fund_id"];
          },
        ];
      };
      v_ib_allocation_orphans: {
        Row: {
          distribution_id: string | null;
          ib_allocation_id: string | null;
          ib_fee_amount: number | null;
          ib_investor_id: string | null;
          is_voided: boolean | null;
          source_investor_id: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "ib_allocations_distribution_id_fkey_v2";
            columns: ["distribution_id"];
            isOneToOne: false;
            referencedRelation: "v_yield_conservation_violations";
            referencedColumns: ["distribution_id"];
          },
          {
            foreignKeyName: "ib_allocations_distribution_id_fkey_v2";
            columns: ["distribution_id"];
            isOneToOne: false;
            referencedRelation: "yield_distribution_conservation_check";
            referencedColumns: ["distribution_id"];
          },
          {
            foreignKeyName: "ib_allocations_distribution_id_fkey_v2";
            columns: ["distribution_id"];
            isOneToOne: false;
            referencedRelation: "yield_distributions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ib_allocations_ib_investor_id_fkey";
            columns: ["ib_investor_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ib_allocations_source_investor_id_fkey";
            columns: ["source_investor_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      v_investor_yield_events_orphans: {
        Row: {
          event_date: string | null;
          event_id: string | null;
          fund_id: string | null;
          investor_id: string | null;
          issue_type: string | null;
          net_yield_amount: number | null;
          reference_id: string | null;
          trigger_transaction_id: string | null;
        };
        Insert: {
          event_date?: string | null;
          event_id?: string | null;
          fund_id?: string | null;
          investor_id?: string | null;
          issue_type?: never;
          net_yield_amount?: number | null;
          reference_id?: string | null;
          trigger_transaction_id?: string | null;
        };
        Update: {
          event_date?: string | null;
          event_id?: string | null;
          fund_id?: string | null;
          investor_id?: string | null;
          issue_type?: never;
          net_yield_amount?: number | null;
          reference_id?: string | null;
          trigger_transaction_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "fk_yield_events_fund";
            columns: ["fund_id"];
            isOneToOne: false;
            referencedRelation: "aum_position_reconciliation";
            referencedColumns: ["fund_id"];
          },
          {
            foreignKeyName: "fk_yield_events_fund";
            columns: ["fund_id"];
            isOneToOne: false;
            referencedRelation: "fund_aum_mismatch";
            referencedColumns: ["fund_id"];
          },
          {
            foreignKeyName: "fk_yield_events_fund";
            columns: ["fund_id"];
            isOneToOne: false;
            referencedRelation: "funds";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "fk_yield_events_fund";
            columns: ["fund_id"];
            isOneToOne: false;
            referencedRelation: "v_crystallization_dashboard";
            referencedColumns: ["fund_id"];
          },
          {
            foreignKeyName: "fk_yield_events_fund";
            columns: ["fund_id"];
            isOneToOne: false;
            referencedRelation: "v_fund_aum_position_health";
            referencedColumns: ["fund_id"];
          },
          {
            foreignKeyName: "fk_yield_events_fund";
            columns: ["fund_id"];
            isOneToOne: false;
            referencedRelation: "v_liquidity_risk";
            referencedColumns: ["fund_id"];
          },
          {
            foreignKeyName: "fk_yield_events_investor";
            columns: ["investor_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "fk_yield_events_trigger_tx";
            columns: ["trigger_transaction_id"];
            isOneToOne: false;
            referencedRelation: "transactions_v2";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "fk_yield_events_trigger_tx";
            columns: ["trigger_transaction_id"];
            isOneToOne: false;
            referencedRelation: "v_orphaned_transactions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "fk_yield_events_trigger_tx";
            columns: ["trigger_transaction_id"];
            isOneToOne: false;
            referencedRelation: "v_transaction_distribution_orphans";
            referencedColumns: ["transaction_id"];
          },
        ];
      };
      v_ledger_reconciliation: {
        Row: {
          asset: string | null;
          drift: number | null;
          fund_id: string | null;
          fund_name: string | null;
          investor_id: string | null;
          ledger_balance: number | null;
          position_balance: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "fk_investor_positions_fund";
            columns: ["fund_id"];
            isOneToOne: false;
            referencedRelation: "aum_position_reconciliation";
            referencedColumns: ["fund_id"];
          },
          {
            foreignKeyName: "fk_investor_positions_fund";
            columns: ["fund_id"];
            isOneToOne: false;
            referencedRelation: "fund_aum_mismatch";
            referencedColumns: ["fund_id"];
          },
          {
            foreignKeyName: "fk_investor_positions_fund";
            columns: ["fund_id"];
            isOneToOne: false;
            referencedRelation: "funds";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "fk_investor_positions_fund";
            columns: ["fund_id"];
            isOneToOne: false;
            referencedRelation: "v_crystallization_dashboard";
            referencedColumns: ["fund_id"];
          },
          {
            foreignKeyName: "fk_investor_positions_fund";
            columns: ["fund_id"];
            isOneToOne: false;
            referencedRelation: "v_fund_aum_position_health";
            referencedColumns: ["fund_id"];
          },
          {
            foreignKeyName: "fk_investor_positions_fund";
            columns: ["fund_id"];
            isOneToOne: false;
            referencedRelation: "v_liquidity_risk";
            referencedColumns: ["fund_id"];
          },
          {
            foreignKeyName: "fk_investor_positions_investor";
            columns: ["investor_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      v_liquidity_risk: {
        Row: {
          active_positions: number | null;
          fund_code: string | null;
          fund_id: string | null;
          fund_name: string | null;
          pending_withdrawals: number | null;
          risk_level: string | null;
          total_aum: number | null;
          withdrawal_ratio: number | null;
        };
        Relationships: [];
      };
      v_missing_withdrawal_transactions: {
        Row: {
          fund_id: string | null;
          investor_id: string | null;
          processed_amount: number | null;
          processed_at: string | null;
          requested_amount: number | null;
          status: Database["public"]["Enums"]["withdrawal_status"] | null;
          withdrawal_request_id: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "fk_withdrawal_requests_profile";
            columns: ["investor_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "withdrawal_requests_fund_id_fkey";
            columns: ["fund_id"];
            isOneToOne: false;
            referencedRelation: "aum_position_reconciliation";
            referencedColumns: ["fund_id"];
          },
          {
            foreignKeyName: "withdrawal_requests_fund_id_fkey";
            columns: ["fund_id"];
            isOneToOne: false;
            referencedRelation: "fund_aum_mismatch";
            referencedColumns: ["fund_id"];
          },
          {
            foreignKeyName: "withdrawal_requests_fund_id_fkey";
            columns: ["fund_id"];
            isOneToOne: false;
            referencedRelation: "funds";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "withdrawal_requests_fund_id_fkey";
            columns: ["fund_id"];
            isOneToOne: false;
            referencedRelation: "v_crystallization_dashboard";
            referencedColumns: ["fund_id"];
          },
          {
            foreignKeyName: "withdrawal_requests_fund_id_fkey";
            columns: ["fund_id"];
            isOneToOne: false;
            referencedRelation: "v_fund_aum_position_health";
            referencedColumns: ["fund_id"];
          },
          {
            foreignKeyName: "withdrawal_requests_fund_id_fkey";
            columns: ["fund_id"];
            isOneToOne: false;
            referencedRelation: "v_liquidity_risk";
            referencedColumns: ["fund_id"];
          },
        ];
      };
      v_orphaned_positions: {
        Row: {
          current_value: number | null;
          fund_id: string | null;
          fund_missing: boolean | null;
          investor_id: string | null;
          investor_missing: boolean | null;
          last_transaction_date: string | null;
          orphan_type: string | null;
          shares: number | null;
          updated_at: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "fk_investor_positions_fund";
            columns: ["fund_id"];
            isOneToOne: false;
            referencedRelation: "aum_position_reconciliation";
            referencedColumns: ["fund_id"];
          },
          {
            foreignKeyName: "fk_investor_positions_fund";
            columns: ["fund_id"];
            isOneToOne: false;
            referencedRelation: "fund_aum_mismatch";
            referencedColumns: ["fund_id"];
          },
          {
            foreignKeyName: "fk_investor_positions_fund";
            columns: ["fund_id"];
            isOneToOne: false;
            referencedRelation: "funds";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "fk_investor_positions_fund";
            columns: ["fund_id"];
            isOneToOne: false;
            referencedRelation: "v_crystallization_dashboard";
            referencedColumns: ["fund_id"];
          },
          {
            foreignKeyName: "fk_investor_positions_fund";
            columns: ["fund_id"];
            isOneToOne: false;
            referencedRelation: "v_fund_aum_position_health";
            referencedColumns: ["fund_id"];
          },
          {
            foreignKeyName: "fk_investor_positions_fund";
            columns: ["fund_id"];
            isOneToOne: false;
            referencedRelation: "v_liquidity_risk";
            referencedColumns: ["fund_id"];
          },
          {
            foreignKeyName: "fk_investor_positions_investor";
            columns: ["investor_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      v_orphaned_transactions: {
        Row: {
          amount: number | null;
          fund_id: string | null;
          id: string | null;
          investor_id: string | null;
          reference_id: string | null;
          tx_date: string | null;
          type: Database["public"]["Enums"]["tx_type"] | null;
        };
        Insert: {
          amount?: number | null;
          fund_id?: string | null;
          id?: string | null;
          investor_id?: string | null;
          reference_id?: string | null;
          tx_date?: string | null;
          type?: Database["public"]["Enums"]["tx_type"] | null;
        };
        Update: {
          amount?: number | null;
          fund_id?: string | null;
          id?: string | null;
          investor_id?: string | null;
          reference_id?: string | null;
          tx_date?: string | null;
          type?: Database["public"]["Enums"]["tx_type"] | null;
        };
        Relationships: [
          {
            foreignKeyName: "fk_transactions_v2_fund";
            columns: ["fund_id"];
            isOneToOne: false;
            referencedRelation: "aum_position_reconciliation";
            referencedColumns: ["fund_id"];
          },
          {
            foreignKeyName: "fk_transactions_v2_fund";
            columns: ["fund_id"];
            isOneToOne: false;
            referencedRelation: "fund_aum_mismatch";
            referencedColumns: ["fund_id"];
          },
          {
            foreignKeyName: "fk_transactions_v2_fund";
            columns: ["fund_id"];
            isOneToOne: false;
            referencedRelation: "funds";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "fk_transactions_v2_fund";
            columns: ["fund_id"];
            isOneToOne: false;
            referencedRelation: "v_crystallization_dashboard";
            referencedColumns: ["fund_id"];
          },
          {
            foreignKeyName: "fk_transactions_v2_fund";
            columns: ["fund_id"];
            isOneToOne: false;
            referencedRelation: "v_fund_aum_position_health";
            referencedColumns: ["fund_id"];
          },
          {
            foreignKeyName: "fk_transactions_v2_fund";
            columns: ["fund_id"];
            isOneToOne: false;
            referencedRelation: "v_liquidity_risk";
            referencedColumns: ["fund_id"];
          },
          {
            foreignKeyName: "fk_transactions_v2_investor";
            columns: ["investor_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "transactions_v2_investor_id_fkey";
            columns: ["investor_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      v_position_transaction_variance: {
        Row: {
          balance_variance: number | null;
          cost_basis: number | null;
          fund_code: string | null;
          fund_id: string | null;
          investor_email: string | null;
          investor_id: string | null;
          position_value: number | null;
          total_deposits: number | null;
          total_fees: number | null;
          total_interest: number | null;
          total_withdrawals: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "fk_investor_positions_fund";
            columns: ["fund_id"];
            isOneToOne: false;
            referencedRelation: "aum_position_reconciliation";
            referencedColumns: ["fund_id"];
          },
          {
            foreignKeyName: "fk_investor_positions_fund";
            columns: ["fund_id"];
            isOneToOne: false;
            referencedRelation: "fund_aum_mismatch";
            referencedColumns: ["fund_id"];
          },
          {
            foreignKeyName: "fk_investor_positions_fund";
            columns: ["fund_id"];
            isOneToOne: false;
            referencedRelation: "funds";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "fk_investor_positions_fund";
            columns: ["fund_id"];
            isOneToOne: false;
            referencedRelation: "v_crystallization_dashboard";
            referencedColumns: ["fund_id"];
          },
          {
            foreignKeyName: "fk_investor_positions_fund";
            columns: ["fund_id"];
            isOneToOne: false;
            referencedRelation: "v_fund_aum_position_health";
            referencedColumns: ["fund_id"];
          },
          {
            foreignKeyName: "fk_investor_positions_fund";
            columns: ["fund_id"];
            isOneToOne: false;
            referencedRelation: "v_liquidity_risk";
            referencedColumns: ["fund_id"];
          },
          {
            foreignKeyName: "fk_investor_positions_investor";
            columns: ["investor_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      v_potential_duplicate_profiles: {
        Row: {
          duplicate_type: string | null;
          emails: string[] | null;
          first_created: string | null;
          last_created: string | null;
          match_key: string | null;
          names: string[] | null;
          profile_count: number | null;
          profile_ids: string[] | null;
          total_funds_affected: number | null;
          total_value_affected: number | null;
        };
        Relationships: [];
      };
      v_transaction_distribution_orphans: {
        Row: {
          amount: number | null;
          distribution_id: string | null;
          fund_id: string | null;
          investor_id: string | null;
          issue_type: string | null;
          purpose: Database["public"]["Enums"]["aum_purpose"] | null;
          transaction_id: string | null;
          transaction_type: Database["public"]["Enums"]["tx_type"] | null;
          tx_date: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "fk_transactions_v2_distribution";
            columns: ["distribution_id"];
            isOneToOne: false;
            referencedRelation: "v_yield_conservation_violations";
            referencedColumns: ["distribution_id"];
          },
          {
            foreignKeyName: "fk_transactions_v2_distribution";
            columns: ["distribution_id"];
            isOneToOne: false;
            referencedRelation: "yield_distribution_conservation_check";
            referencedColumns: ["distribution_id"];
          },
          {
            foreignKeyName: "fk_transactions_v2_distribution";
            columns: ["distribution_id"];
            isOneToOne: false;
            referencedRelation: "yield_distributions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "fk_transactions_v2_fund";
            columns: ["fund_id"];
            isOneToOne: false;
            referencedRelation: "aum_position_reconciliation";
            referencedColumns: ["fund_id"];
          },
          {
            foreignKeyName: "fk_transactions_v2_fund";
            columns: ["fund_id"];
            isOneToOne: false;
            referencedRelation: "fund_aum_mismatch";
            referencedColumns: ["fund_id"];
          },
          {
            foreignKeyName: "fk_transactions_v2_fund";
            columns: ["fund_id"];
            isOneToOne: false;
            referencedRelation: "funds";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "fk_transactions_v2_fund";
            columns: ["fund_id"];
            isOneToOne: false;
            referencedRelation: "v_crystallization_dashboard";
            referencedColumns: ["fund_id"];
          },
          {
            foreignKeyName: "fk_transactions_v2_fund";
            columns: ["fund_id"];
            isOneToOne: false;
            referencedRelation: "v_fund_aum_position_health";
            referencedColumns: ["fund_id"];
          },
          {
            foreignKeyName: "fk_transactions_v2_fund";
            columns: ["fund_id"];
            isOneToOne: false;
            referencedRelation: "v_liquidity_risk";
            referencedColumns: ["fund_id"];
          },
          {
            foreignKeyName: "fk_transactions_v2_investor";
            columns: ["investor_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "transactions_v2_investor_id_fkey";
            columns: ["investor_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      v_transaction_sources: {
        Row: {
          active_count: number | null;
          source: Database["public"]["Enums"]["tx_source"] | null;
          tx_count: number | null;
        };
        Relationships: [];
      };
      v_yield_allocation_orphans: {
        Row: {
          allocation_id: string | null;
          distribution_id: string | null;
          fund_id: string | null;
          gross_amount: number | null;
          investor_id: string | null;
          issue_type: string | null;
          net_amount: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "yield_allocations_fund_id_fkey";
            columns: ["fund_id"];
            isOneToOne: false;
            referencedRelation: "aum_position_reconciliation";
            referencedColumns: ["fund_id"];
          },
          {
            foreignKeyName: "yield_allocations_fund_id_fkey";
            columns: ["fund_id"];
            isOneToOne: false;
            referencedRelation: "fund_aum_mismatch";
            referencedColumns: ["fund_id"];
          },
          {
            foreignKeyName: "yield_allocations_fund_id_fkey";
            columns: ["fund_id"];
            isOneToOne: false;
            referencedRelation: "funds";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "yield_allocations_fund_id_fkey";
            columns: ["fund_id"];
            isOneToOne: false;
            referencedRelation: "v_crystallization_dashboard";
            referencedColumns: ["fund_id"];
          },
          {
            foreignKeyName: "yield_allocations_fund_id_fkey";
            columns: ["fund_id"];
            isOneToOne: false;
            referencedRelation: "v_fund_aum_position_health";
            referencedColumns: ["fund_id"];
          },
          {
            foreignKeyName: "yield_allocations_fund_id_fkey";
            columns: ["fund_id"];
            isOneToOne: false;
            referencedRelation: "v_liquidity_risk";
            referencedColumns: ["fund_id"];
          },
        ];
      };
      v_yield_conservation_violations: {
        Row: {
          distribution_id: string | null;
          effective_date: string | null;
          fund_id: string | null;
          header_dust: number | null;
          header_fees: number | null;
          header_gross: number | null;
          header_ib: number | null;
          header_net: number | null;
          variance: number | null;
        };
        Insert: {
          distribution_id?: string | null;
          effective_date?: string | null;
          fund_id?: string | null;
          header_dust?: never;
          header_fees?: never;
          header_gross?: never;
          header_ib?: never;
          header_net?: never;
          variance?: never;
        };
        Update: {
          distribution_id?: string | null;
          effective_date?: string | null;
          fund_id?: string | null;
          header_dust?: never;
          header_fees?: never;
          header_gross?: never;
          header_ib?: never;
          header_net?: never;
          variance?: never;
        };
        Relationships: [
          {
            foreignKeyName: "fk_yield_distributions_fund_new";
            columns: ["fund_id"];
            isOneToOne: false;
            referencedRelation: "aum_position_reconciliation";
            referencedColumns: ["fund_id"];
          },
          {
            foreignKeyName: "fk_yield_distributions_fund_new";
            columns: ["fund_id"];
            isOneToOne: false;
            referencedRelation: "fund_aum_mismatch";
            referencedColumns: ["fund_id"];
          },
          {
            foreignKeyName: "fk_yield_distributions_fund_new";
            columns: ["fund_id"];
            isOneToOne: false;
            referencedRelation: "funds";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "fk_yield_distributions_fund_new";
            columns: ["fund_id"];
            isOneToOne: false;
            referencedRelation: "v_crystallization_dashboard";
            referencedColumns: ["fund_id"];
          },
          {
            foreignKeyName: "fk_yield_distributions_fund_new";
            columns: ["fund_id"];
            isOneToOne: false;
            referencedRelation: "v_fund_aum_position_health";
            referencedColumns: ["fund_id"];
          },
          {
            foreignKeyName: "fk_yield_distributions_fund_new";
            columns: ["fund_id"];
            isOneToOne: false;
            referencedRelation: "v_liquidity_risk";
            referencedColumns: ["fund_id"];
          },
        ];
      };
      yield_distribution_conservation_check: {
        Row: {
          distribution_id: string | null;
          dust: number | null;
          effective_date: string | null;
          fees: number | null;
          fund_id: string | null;
          gross: number | null;
          ib: number | null;
          net: number | null;
          residual: number | null;
        };
        Insert: {
          distribution_id?: string | null;
          dust?: never;
          effective_date?: string | null;
          fees?: never;
          fund_id?: string | null;
          gross?: never;
          ib?: never;
          net?: never;
          residual?: never;
        };
        Update: {
          distribution_id?: string | null;
          dust?: never;
          effective_date?: string | null;
          fees?: never;
          fund_id?: string | null;
          gross?: never;
          ib?: never;
          net?: never;
          residual?: never;
        };
        Relationships: [
          {
            foreignKeyName: "fk_yield_distributions_fund_new";
            columns: ["fund_id"];
            isOneToOne: false;
            referencedRelation: "aum_position_reconciliation";
            referencedColumns: ["fund_id"];
          },
          {
            foreignKeyName: "fk_yield_distributions_fund_new";
            columns: ["fund_id"];
            isOneToOne: false;
            referencedRelation: "fund_aum_mismatch";
            referencedColumns: ["fund_id"];
          },
          {
            foreignKeyName: "fk_yield_distributions_fund_new";
            columns: ["fund_id"];
            isOneToOne: false;
            referencedRelation: "funds";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "fk_yield_distributions_fund_new";
            columns: ["fund_id"];
            isOneToOne: false;
            referencedRelation: "v_crystallization_dashboard";
            referencedColumns: ["fund_id"];
          },
          {
            foreignKeyName: "fk_yield_distributions_fund_new";
            columns: ["fund_id"];
            isOneToOne: false;
            referencedRelation: "v_fund_aum_position_health";
            referencedColumns: ["fund_id"];
          },
          {
            foreignKeyName: "fk_yield_distributions_fund_new";
            columns: ["fund_id"];
            isOneToOne: false;
            referencedRelation: "v_liquidity_risk";
            referencedColumns: ["fund_id"];
          },
        ];
      };
    };
    Functions: {
      _resolve_investor_fee_pct: {
        Args: {
          p_effective_date: string;
          p_fund_id: string;
          p_investor_id: string;
        };
        Returns: number;
      };
      _resolve_investor_ib_pct: {
        Args: {
          p_effective_date: string;
          p_fund_id: string;
          p_investor_id: string;
        };
        Returns: number;
      };
      _v5_check_distribution_uniqueness: {
        Args: {
          p_fund_id: string;
          p_period_end: string;
          p_purpose: Database["public"]["Enums"]["aum_purpose"];
        };
        Returns: undefined;
      };
      acquire_delivery_batch: {
        Args: {
          p_batch_size?: number;
          p_channel?: string;
          p_period_id: string;
          p_worker_id?: string;
        };
        Returns: {
          attempt_count: number;
          id: string;
          investor_id: string;
          recipient_email: string;
          statement_id: string;
        }[];
      };
      acquire_position_lock: {
        Args: { p_fund_id: string; p_investor_id: string };
        Returns: undefined;
      };
      acquire_withdrawal_lock: {
        Args: { p_request_id: string };
        Returns: undefined;
      };
      acquire_yield_lock: {
        Args: { p_fund_id: string; p_yield_date: string };
        Returns: undefined;
      };
      add_fund_to_investor: {
        Args: {
          p_cost_basis?: number;
          p_fund_id: string;
          p_initial_shares?: number;
          p_investor_id: string;
        };
        Returns: string;
      };
      adjust_investor_position: {
        Args: {
          p_admin_id?: string;
          p_amount: number;
          p_fund_id: string;
          p_investor_id: string;
          p_reason: string;
          p_tx_date?: string;
        };
        Returns: Json;
      };
      apply_adb_yield_distribution_v3: {
        Args: {
          p_admin_id?: string;
          p_distribution_date?: string;
          p_fund_id: string;
          p_gross_yield_amount: number;
          p_period_end: string;
          p_period_start: string;
          p_purpose?: Database["public"]["Enums"]["aum_purpose"];
          p_recorded_aum?: number;
        };
        Returns: Json;
      };
      apply_daily_yield_with_validation: {
        Args: {
          p_created_by: string;
          p_fund_id: string;
          p_gross_yield_pct: number;
          p_purpose?: string;
          p_skip_validation?: boolean;
          p_yield_date: string;
        };
        Returns: Json;
      };

      apply_investor_transaction: {
        Args: {
          p_admin_id: string;
          p_amount: number;
          p_fund_id: string;
          p_investor_id: string;
          p_notes?: string;
          p_purpose?: Database["public"]["Enums"]["aum_purpose"];
          p_reference_id: string;
          p_tx_date: string;
          p_tx_type: Database["public"]["Enums"]["tx_type"];
        };
        Returns: Json;
      };
      apply_segmented_yield_distribution_v5: {
        Args: {
          p_admin_id?: string;
          p_distribution_date?: string;
          p_fund_id: string;
          p_period_end: string;
          p_purpose?: Database["public"]["Enums"]["aum_purpose"];
          p_recorded_aum: number;
        };
        Returns: Json;
      };

      approve_and_complete_withdrawal: {
        Args: {
          p_admin_notes?: string;
          p_is_full_exit?: boolean;
          p_processed_amount?: number;
          p_request_id: string;
          p_send_precision?: number;
          p_tx_hash?: string;
        };
        Returns: Json;
      };
      approve_withdrawal: {
        Args: {
          p_admin_notes?: string;
          p_approved_amount?: number;
          p_request_id: string;
        };
        Returns: boolean;
      };
      assert_integrity_or_raise: {
        Args: {
          p_context?: string;
          p_scope_fund_id?: string;
          p_scope_investor_id?: string;
        };
        Returns: undefined;
      };
      backfill_balance_chain_fix: {
        Args: { p_fund_id: string; p_investor_id: string };
        Returns: Json;
      };
      batch_crystallize_fund: {
        Args: {
          p_effective_date: string;
          p_force_override: boolean;
          p_fund_id: string;
        };
        Returns: undefined;
      };
      batch_initialize_fund_aum: {
        Args: { p_admin_id?: string; p_dry_run?: boolean };
        Returns: Json;
      };
      batch_reconcile_all_positions: { Args: never; Returns: Json };
      build_error_response: {
        Args: { p_details?: Json; p_error_code: string };
        Returns: Json;
      };
      build_success_response: {
        Args: { p_data?: Json; p_message?: string };
        Returns: Json;
      };
      calc_avg_daily_balance: {
        Args: {
          p_fund_id: string;
          p_investor_id: string;
          p_period_end: string;
          p_period_start: string;
        };
        Returns: number;
      };
      calculate_position_at_date_fix: {
        Args: { p_as_of_date: string; p_fund_id: string; p_investor_id: string };
        Returns: number;
      };
      can_access_investor: { Args: { investor_uuid: string }; Returns: boolean };
      can_access_notification: {
        Args: { notification_id: string };
        Returns: boolean;
      };
      can_insert_notification: { Args: never; Returns: boolean };
      can_withdraw: {
        Args: { p_amount: number; p_fund_id: string; p_investor_id: string };
        Returns: Json;
      };
      cancel_delivery: { Args: { p_delivery_id: string }; Returns: Json };
      cancel_withdrawal_by_admin: {
        Args: { p_admin_notes?: string; p_reason: string; p_request_id: string };
        Returns: boolean;
      };
      cancel_withdrawal_by_investor: {
        Args: { p_investor_id: string; p_reason?: string; p_request_id: string };
        Returns: Json;
      };
      check_all_funds_transaction_aum: {
        Args: { p_tx_date: string };
        Returns: {
          fund_code: string;
          fund_id: string;
          has_reporting_aum: boolean;
          has_transaction_aum: boolean;
          reporting_aum: number;
          transaction_aum: number;
        }[];
      };
      check_and_fix_aum_integrity: {
        Args: {
          p_dry_run?: boolean;
          p_end_date?: string;
          p_fund_id?: string;
          p_start_date?: string;
        };
        Returns: Json;
      };
      check_aum_exists_for_date: {
        Args: { p_date: string; p_fund_id: string };
        Returns: boolean;
      };
      check_aum_position_health: {
        Args: never;
        Returns: {
          asset: string;
          fund_name: string;
          health_status: string;
          latest_aum: number;
          position_sum: number;
          variance: number;
        }[];
      };
      check_aum_reconciliation: {
        Args: {
          p_as_of_date?: string;
          p_fund_id: string;
          p_tolerance_pct?: number;
        };
        Returns: Json;
      };
      check_duplicate_ib_allocations: { Args: never; Returns: number };
      check_duplicate_transaction_refs: { Args: never; Returns: number };
      check_is_admin: { Args: { user_id: string }; Returns: boolean };
      check_platform_data_integrity: { Args: never; Returns: Json };
      check_transaction_sources: {
        Args: never;
        Returns: {
          assessment: string;
          sample_ids: string[];
          source: Database["public"]["Enums"]["tx_source"];
          tx_count: number;
        }[];
      };
      cleanup_dormant_positions: {
        Args: { p_dry_run?: boolean };
        Returns: Json;
      };
      complete_withdrawal: {
        Args: {
          p_admin_notes?: string;
          p_closing_aum: number;
          p_event_ts?: string;
          p_request_id: string;
          p_transaction_hash?: string;
        };
        Returns: boolean;
      };
      compute_jsonb_delta: { Args: { p_new: Json; p_old: Json }; Returns: Json };
      compute_position_from_ledger: {
        Args: { p_as_of?: string; p_fund_id: string; p_investor_id: string };
        Returns: Json;
      };
      compute_profile_role: {
        Args: {
          p_account_type: Database["public"]["Enums"]["account_type"];
          p_is_admin: boolean;
          p_user_id: string;
        };
        Returns: string;
      };
      create_daily_position_snapshot: {
        Args: { p_fund_id?: string; p_snapshot_date?: string };
        Returns: Json;
      };
      create_integrity_alert: {
        Args: {
          p_alert_type: string;
          p_message: string;
          p_metadata?: Json;
          p_severity: string;
          p_title: string;
        };
        Returns: string;
      };
      create_withdrawal_request: {
        Args: {
          p_amount: number;
          p_fund_id: string;
          p_investor_id: string;
          p_notes?: string;
          p_type?: string;
        };
        Returns: string;
      };
      crystallize_month_end: {
        Args: {
          p_admin_id: string;
          p_closing_aum: number;
          p_fund_id: string;
          p_month_end_date: string;
        };
        Returns: Json;
      };
      crystallize_yield_before_flow: {
        Args: {
          p_admin_id: string;
          p_closing_aum: number;
          p_event_ts: string;
          p_fund_id: string;
          p_purpose?: Database["public"]["Enums"]["aum_purpose"];
          p_trigger_reference: string;
          p_trigger_type: string;
        };
        Returns: Json;
      };
      current_user_is_admin_or_owner: {
        Args: { check_user_id: string };
        Returns: boolean;
      };
      delete_transaction: {
        Args: { p_confirmation: string; p_transaction_id: string };
        Returns: Json;
      };
      delete_withdrawal: {
        Args: {
          p_hard_delete?: boolean;
          p_reason: string;
          p_withdrawal_id: string;
        };
        Returns: Json;
      };
      dispatch_report_delivery_run: {
        Args: { p_channel?: string; p_period_id: string };
        Returns: Json;
      };
      edit_transaction: {
        Args: {
          p_notes?: string;
          p_reference_id?: string;
          p_transaction_id: string;
          p_tx_date?: string;
          p_tx_hash?: string;
        };
        Returns: Json;
      };
      ensure_admin: { Args: never; Returns: undefined };
      export_investor_data: { Args: { p_user_id: string }; Returns: Json };
      finalize_month_yield: {
        Args: {
          p_admin_id: string;
          p_fund_id: string;
          p_period_month: number;
          p_period_year: number;
        };
        Returns: Json;
      };
      finalize_statement_period: {
        Args: { p_admin_id: string; p_period_id: string };
        Returns: undefined;
      };
      fix_yield_distribution_investor_count: {
        Args: { p_distribution_id: string };
        Returns: undefined;
      };
      force_delete_investor: {
        Args: { p_admin_id: string; p_investor_id: string };
        Returns: boolean;
      };
      generate_document_path: {
        Args: { document_type: string; filename: string; user_id: string };
        Returns: string;
      };
      generate_statement_path: {
        Args: {
          fund_code?: string;
          month: number;
          user_id: string;
          year: number;
        };
        Returns: string;
      };
      get_active_funds_summary: {
        Args: never;
        Returns: {
          aum_record_count: number;
          fund_asset: string;
          fund_code: string;
          fund_id: string;
          fund_name: string;
          investor_count: number;
          total_aum: number;
        }[];
      };
      get_admin_name: { Args: { admin_id: string }; Returns: string };
      get_all_dust_tolerances: { Args: never; Returns: Json };
      get_aum_position_reconciliation: {
        Args: { p_date?: string };
        Returns: {
          calculated_position_sum: number;
          discrepancy: number;
          fund_code: string;
          fund_id: string;
          fund_name: string;
          has_discrepancy: boolean;
          reconciliation_date: string;
          recorded_aum: number;
        }[];
      };
      get_available_balance: {
        Args: { p_fund_id: string; p_investor_id: string };
        Returns: number;
      };
      get_delivery_stats: { Args: { p_period_id: string }; Returns: Json };
      get_dust_tolerance_for_fund: {
        Args: { p_fund_id: string };
        Returns: number;
      };
      get_fund_aum_as_of:
        | {
            Args: {
              p_as_of_date: string;
              p_fund_id: string;
              p_purpose?: Database["public"]["Enums"]["aum_purpose"];
            };
            Returns: {
              as_of_date: string;
              aum_source: string;
              aum_value: number;
              event_id: string;
              fund_code: string;
              fund_id: string;
              purpose: Database["public"]["Enums"]["aum_purpose"];
            }[];
          }
        | {
            Args: {
              p_as_of_date: string;
              p_fund_id: string;
              p_purpose?: string;
            };
            Returns: {
              as_of_date: string;
              aum_record_id: string;
              aum_source: string;
              aum_value: number;
              fund_code: string;
              fund_id: string;
              purpose: string;
            }[];
          };
      get_fund_base_asset: { Args: { p_fund_id: string }; Returns: string };
      get_fund_composition:
        | {
            Args: { p_fund_id: string };
            Returns: {
              current_value: number;
              investor_email: string;
              investor_id: string;
              investor_name: string;
              mtd_yield: number;
              ownership_pct: number;
            }[];
          }
        | {
            Args: { p_date: string; p_fund_id: string };
            Returns: {
              balance: number;
              email: string;
              investor_name: string;
              ownership_pct: number;
            }[];
          };
      get_fund_net_flows: {
        Args: { p_end_date: string; p_fund_id: string; p_start_date: string };
        Returns: {
          inflows: number;
          net_flow: number;
          outflows: number;
          period_date: string;
        }[];
      };
      get_fund_positions_sum: { Args: { p_fund_id: string }; Returns: number };
      get_fund_summary: {
        Args: never;
        Returns: {
          active_investor_count: number;
          asset: string;
          created_at: string;
          fund_code: string;
          fund_id: string;
          fund_name: string;
          investor_count: number;
          last_yield_date: string;
          status: string;
          total_aum: number;
          total_deposits: number;
          total_fees_collected: number;
          total_withdrawals: number;
          total_yield_distributed: number;
        }[];
      };
      get_funds_aum_snapshot: {
        Args: {
          p_as_of_date: string;
          p_purpose?: Database["public"]["Enums"]["aum_purpose"];
        };
        Returns: {
          as_of_date: string;
          asset: string;
          aum_source: string;
          aum_value: number;
          fund_code: string;
          fund_id: string;
          fund_name: string;
          investor_count: number;
          purpose: string;
        }[];
      };
      get_funds_with_aum: {
        Args: never;
        Returns: {
          asset: string;
          fund_class: string;
          fund_code: string;
          fund_id: string;
          fund_name: string;
          investor_count: number;
          status: string;
          total_aum: number;
        }[];
      };
      get_health_trend: {
        Args: { p_days?: number };
        Returns: {
          avg_anomalies: number;
          max_anomalies: number;
          snapshot_count: number;
          snapshot_date: string;
        }[];
      };
      get_ib_parent_candidates: {
        Args: { p_exclude_id: string };
        Returns: {
          email_masked: string;
          first_name: string;
          id: string;
          last_name: string;
        }[];
      };
      get_ib_referral_count: { Args: { p_ib_id: string }; Returns: number };
      get_ib_referral_detail: {
        Args: { p_ib_id: string; p_referral_id: string };
        Returns: {
          created_at: string;
          email_masked: string;
          first_name: string;
          ib_parent_id: string;
          id: string;
          last_name: string;
          status: string;
        }[];
      };
      get_ib_referrals: {
        Args: { p_ib_id: string; p_limit?: number; p_offset?: number };
        Returns: {
          created_at: string;
          email_masked: string;
          first_name: string;
          ib_percentage: number;
          id: string;
          last_name: string;
          status: string;
        }[];
      };
      get_investor_cumulative_yield: {
        Args: { p_investor_id: string };
        Returns: {
          event_count: number;
          fund_asset: string;
          fund_id: string;
          fund_name: string;
          total_net_yield: number;
        }[];
      };
      get_investor_fee_pct: {
        Args: {
          p_effective_date: string;
          p_fund_id: string;
          p_investor_id: string;
        };
        Returns: number;
      };
      get_investor_ib_pct: {
        Args: {
          p_effective_date?: string;
          p_fund_id: string;
          p_investor_id: string;
        };
        Returns: number;
      };
      get_investor_reports_v2: { Args: { p_period_id: string }; Returns: Json };
      get_investor_yield_summary: {
        Args: { p_investor_id: string; p_month?: number; p_year?: number };
        Returns: {
          event_count: number;
          fund_asset: string;
          fund_id: string;
          fund_name: string;
          total_fees: number;
          total_gross: number;
          total_net: number;
        }[];
      };
      get_latest_health_status: {
        Args: never;
        Returns: {
          details: Json;
          snapshot_at: string;
          snapshot_id: string;
          status: string;
          total_anomalies: number;
        }[];
      };
      get_monthly_platform_aum: {
        Args: never;
        Returns: {
          month: string;
          total_aum: number;
        }[];
      };
      get_platform_stats: { Args: never; Returns: Json };
      get_position_reconciliation: {
        Args: { p_as_of_date?: string; p_fund_id?: string };
        Returns: {
          out_difference: number;
          out_fund_id: string;
          out_fund_name: string;
          out_investor_id: string;
          out_investor_name: string;
          out_is_matched: boolean;
          out_ledger_balance: number;
          out_position_balance: number;
        }[];
      };
      get_reporting_eligible_investors: {
        Args: { p_period_id: string };
        Returns: {
          eligibility_reason: string;
          email: string;
          investor_id: string;
          investor_name: string;
          is_eligible: boolean;
        }[];
      };
      get_schema_dump: { Args: never; Returns: Json };
      get_statement_period_summary: {
        Args: { p_period_id: string };
        Returns: {
          statements_generated: number;
          statements_pending: number;
          statements_sent: number;
          total_funds: number;
          total_investors: number;
        }[];
      };
      get_statement_signed_url: {
        Args: { p_expires_in?: number; p_storage_path: string };
        Returns: string;
      };
      get_system_mode: { Args: never; Returns: string };
      get_transaction_aum: {
        Args: {
          p_fund_id: string;
          p_purpose?: Database["public"]["Enums"]["aum_purpose"];
          p_tx_date: string;
        };
        Returns: number;
      };
      get_user_admin_status: { Args: { user_id: string }; Returns: boolean };
      get_void_aum_impact: { Args: { p_record_id: string }; Returns: Json };
      get_void_transaction_impact: {
        Args: { p_transaction_id: string };
        Returns: Json;
      };
      get_void_yield_impact: {
        Args: { p_distribution_id: string };
        Returns: Json;
      };
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"];
          _user_id: string;
        };
        Returns: boolean;
      };
      has_super_admin_role: { Args: { p_user_id: string }; Returns: boolean };
      initialize_all_hwm_values: {
        Args: never;
        Returns: {
          positions_affected: Json;
          updated_count: number;
        }[];
      };
      initialize_crystallization_dates: {
        Args: { p_admin_id?: string; p_dry_run?: boolean; p_fund_id?: string };
        Returns: Json;
      };
      initialize_fund_aum_from_positions: {
        Args: { p_admin_id?: string; p_aum_date?: string; p_fund_id: string };
        Returns: Json;
      };
      initialize_null_crystallization_dates: {
        Args: never;
        Returns: {
          fund_id: string;
          investor_id: string;
          new_crystallization_date: string;
        }[];
      };
      insert_yield_transaction: {
        Args: {
          p_admin_id: string;
          p_amount: number;
          p_fund_code: string;
          p_investor_name: string;
          p_month: string;
          p_tx_date: string;
        };
        Returns: boolean;
      };
      internal_route_to_fees: {
        Args: {
          p_admin_id: string;
          p_amount: number;
          p_effective_date: string;
          p_from_investor_id: string;
          p_fund_id: string;
          p_reason: string;
          p_transfer_id?: string;
        };
        Returns: {
          credit_tx_id: string;
          debit_tx_id: string;
          message: string;
          success: boolean;
          transfer_id: string;
        }[];
      };
      is_admin:
        | { Args: never; Returns: boolean }
        | { Args: { p_user_id: string }; Returns: boolean };
      is_admin_for_jwt: { Args: never; Returns: boolean };
      is_admin_safe: { Args: never; Returns: boolean };
      is_canonical_rpc: { Args: never; Returns: boolean };
      is_crystallization_current: {
        Args: {
          p_fund_id: string;
          p_investor_id: string;
          p_target_date?: string;
        };
        Returns: Json;
      };
      is_import_enabled: { Args: never; Returns: boolean };
      is_period_locked: {
        Args: { p_date: string; p_fund_id: string };
        Returns: boolean;
      };
      is_super_admin:
        | { Args: never; Returns: boolean }
        | { Args: { p_user_id: string }; Returns: boolean };
      is_within_edit_window: {
        Args: { p_created_at: string };
        Returns: boolean;
      };
      is_yield_period_closed: {
        Args: {
          p_fund_id: string;
          p_month: number;
          p_purpose: Database["public"]["Enums"]["aum_purpose"];
          p_year: number;
        };
        Returns: boolean;
      };
      log_audit_event: {
        Args: {
          p_action: string;
          p_entity: string;
          p_entity_id?: string;
          p_meta?: Json;
          p_new_values?: Json;
          p_old_values?: Json;
        };
        Returns: string;
      };
      log_financial_operation: {
        Args: {
          p_action: string;
          p_entity: string;
          p_entity_id: string;
          p_meta?: Json;
          p_new_values?: Json;
          p_old_values?: Json;
        };
        Returns: string;
      };
      log_ledger_mismatches: {
        Args: never;
        Returns: {
          logged: boolean;
          mismatch_count: number;
        }[];
      };
      log_security_event: {
        Args: {
          p_details?: Json;
          p_event_type: string;
          p_severity: string;
          p_user_id?: string;
        };
        Returns: string;
      };
      log_withdrawal_action: {
        Args: { p_action: string; p_meta?: Json; p_request_id: string };
        Returns: undefined;
      };
      mark_delivery_result: {
        Args: {
          p_delivery_id: string;
          p_error_code?: string;
          p_error_message?: string;
          p_provider_message_id?: string;
          p_success: boolean;
        };
        Returns: Json;
      };
      mark_sent_manually: {
        Args: { p_delivery_id: string; p_note?: string };
        Returns: Json;
      };
      merge_duplicate_profiles: {
        Args: {
          p_admin_id?: string;
          p_keep_profile_id: string;
          p_merge_profile_id: string;
        };
        Returns: Json;
      };
      nightly_aum_reconciliation: { Args: never; Returns: Json };
      parse_platform_error: { Args: { p_error_message: string }; Returns: Json };
      populate_investor_fund_performance: {
        Args: { p_investor_id?: string };
        Returns: number;
      };
      preview_adb_yield_distribution_v3: {
        Args: {
          p_fund_id: string;
          p_gross_yield_amount: number;
          p_period_end: string;
          p_period_start: string;
          p_purpose?: string;
        };
        Returns: Json;
      };
      preview_crystallization: {
        Args: {
          p_fund_id: string;
          p_investor_id: string;
          p_new_total_aum?: number;
          p_target_date?: string;
        };
        Returns: Json;
      };
      preview_daily_yield_to_fund_v3: {
        Args: {
          p_fund_id: string;
          p_new_aum: number;
          p_purpose?: string;
          p_yield_date: string;
        };
        Returns: Json;
      };
      preview_merge_duplicate_profiles: {
        Args: { p_keep_profile_id: string; p_merge_profile_id: string };
        Returns: Json;
      };
      preview_segmented_yield_distribution_v5: {
        Args: {
          p_fund_id: string;
          p_period_end: string;
          p_purpose?: Database["public"]["Enums"]["aum_purpose"];
          p_recorded_aum: number;
        };
        Returns: Json;
      };
      process_yield_distribution: {
        Args: {
          p_admin_id?: string;
          p_date: string;
          p_fund_id: string;
          p_gross_amount: number;
        };
        Returns: {
          fee_amount: number;
          gross_amount: number;
          investor_id: string;
          net_amount: number;
        }[];
      };
      process_yield_distribution_with_dust: {
        Args: {
          p_admin_id?: string;
          p_date: string;
          p_fund_id: string;
          p_gross_amount: number;
        };
        Returns: {
          dust_allocated: number;
          fee_amount: number;
          gross_amount: number;
          investor_id: string;
          net_amount: number;
        }[];
      };
      qa_admin_id: { Args: never; Returns: string };
      qa_fees_account_id: { Args: never; Returns: string };
      qa_fund_id: { Args: { p_asset: string }; Returns: string };
      qa_investor_id: { Args: { p_key: string }; Returns: string };
      queue_statement_deliveries: {
        Args: {
          p_channel?: string;
          p_fund_id?: string;
          p_investor_ids?: string[];
          p_period_id: string;
        };
        Returns: Json;
      };
      raise_platform_error: {
        Args: { p_details?: Json; p_error_code: string };
        Returns: undefined;
      };
      rebuild_investor_period_balances: {
        Args: {
          p_fund_id: string;
          p_period_end: string;
          p_period_start: string;
          p_purpose: Database["public"]["Enums"]["aum_purpose"];
        };
        Returns: {
          additions: number;
          avg_capital: number;
          beginning_balance: number;
          days_in_period: number;
          days_invested: number;
          email: string;
          ending_balance: number;
          fee_pct: number;
          ib_parent_id: string;
          ib_percentage: number;
          investor_id: string;
          investor_name: string;
          redemptions: number;
        }[];
      };
      rebuild_position_from_ledger: {
        Args: {
          p_admin_id: string;
          p_dry_run?: boolean;
          p_fund_id: string;
          p_investor_id: string;
          p_reason: string;
        };
        Returns: Json;
      };
      recalculate_all_aum: { Args: never; Returns: Json };
      recalculate_fund_aum_for_date: {
        Args: {
          p_actor_id?: string;
          p_date: string;
          p_fund_id: string;
          p_purpose?: Database["public"]["Enums"]["aum_purpose"];
        };
        Returns: Json;
      };
      recompute_investor_position: {
        Args: { p_fund_id: string; p_investor_id: string };
        Returns: undefined;
      };
      recompute_investor_positions_for_investor: {
        Args: { p_investor_id: string };
        Returns: undefined;
      };
      reconcile_all_positions: {
        Args: { p_dry_run?: boolean };
        Returns: {
          action: string;
          fund_id: string;
          fund_name: string;
          investor_id: string;
          investor_name: string;
          new_shares: number;
          new_value: number;
          old_shares: number;
          old_value: number;
        }[];
      };
      reconcile_fund_aum_with_positions: {
        Args: never;
        Returns: {
          out_difference: number;
          out_fund_code: string;
          out_fund_id: string;
          out_new_aum: number;
          out_old_aum: number;
        }[];
      };
      reconcile_investor_position_internal: {
        Args: { p_fund_id: string; p_investor_id: string };
        Returns: undefined;
      };
      refresh_materialized_view_concurrently: {
        Args: { view_name: string };
        Returns: undefined;
      };
      refresh_yield_materialized_views: { Args: never; Returns: Json };
      reject_withdrawal: {
        Args: { p_admin_notes?: string; p_reason: string; p_request_id: string };
        Returns: boolean;
      };
      reopen_yield_period: {
        Args: {
          p_fund_id: string;
          p_month: number;
          p_purpose: Database["public"]["Enums"]["aum_purpose"];
          p_reason: string;
          p_year: number;
        };
        Returns: Json;
      };
      repair_all_positions: { Args: never; Returns: Json };
      replace_aum_snapshot: {
        Args: {
          p_admin_id?: string;
          p_aum_date: string;
          p_fund_id: string;
          p_new_total_aum: number;
          p_purpose?: Database["public"]["Enums"]["aum_purpose"];
          p_reason?: string;
        };
        Returns: Json;
      };
      requeue_stale_sending: {
        Args: { p_minutes?: number; p_period_id: string };
        Returns: Json;
      };
      require_admin: { Args: { p_operation?: string }; Returns: undefined };
      require_super_admin:
        | { Args: never; Returns: string }
        | {
            Args: { p_actor_id: string; p_operation: string };
            Returns: undefined;
          };
      reset_all_data_keep_profiles: {
        Args: { p_admin_id: string; p_confirmation_code: string };
        Returns: Json;
      };
      reset_all_investor_positions: {
        Args: { p_admin_id: string; p_confirmation_code: string };
        Returns: Json;
      };
      retry_delivery: { Args: { p_delivery_id: string }; Returns: Json };
      route_withdrawal_to_fees: {
        Args: { p_actor_id: string; p_reason?: string; p_request_id: string };
        Returns: boolean;
      };
      run_comprehensive_health_check: {
        Args: never;
        Returns: {
          check_name: string;
          check_status: string;
          details: Json;
          violation_count: number;
        }[];
      };
      run_daily_health_check: {
        Args: never;
        Returns: {
          check_name: string;
          details: Json;
          status: string;
          violation_count: number;
        }[];
      };
      run_integrity_check: {
        Args: { p_scope_fund_id?: string; p_scope_investor_id?: string };
        Returns: Json;
      };
      run_integrity_pack:
        | { Args: never; Returns: Json }
        | {
            Args: { p_scope_fund_id?: string; p_scope_investor_id?: string };
            Returns: Json;
          };
      run_invariant_checks: { Args: never; Returns: Json };
      set_canonical_rpc: { Args: { enabled?: boolean }; Returns: undefined };
      set_fund_daily_aum: {
        Args: {
          p_aum_date: string;
          p_fund_id: string;
          p_purpose?: string;
          p_skip_validation?: boolean;
          p_source?: string;
          p_total_aum: number;
        };
        Returns: Json;
      };
      start_processing_withdrawal: {
        Args: {
          p_admin_notes?: string;
          p_processed_amount?: number;
          p_request_id: string;
          p_settlement_date?: string;
          p_tx_hash?: string;
        };
        Returns: boolean;
      };
      sync_all_fund_aum: { Args: { p_target_date?: string }; Returns: Json };
      sync_aum_to_positions: {
        Args: {
          p_admin_id?: string;
          p_aum_date?: string;
          p_fund_id: string;
          p_purpose?: Database["public"]["Enums"]["aum_purpose"];
          p_reason?: string;
        };
        Returns: Json;
      };
      sync_transaction_aum_after_yield: {
        Args: { p_admin_id?: string; p_aum_date: string; p_fund_id: string };
        Returns: undefined;
      };
      system_health_check: { Args: never; Returns: Json };
      unvoid_transaction: {
        Args: { p_admin_id: string; p_reason: string; p_transaction_id: string };
        Returns: Json;
      };
      unvoid_transactions_bulk: {
        Args: {
          p_admin_id: string;
          p_reason: string;
          p_transaction_ids: string[];
        };
        Returns: Json;
      };
      update_admin_role: {
        Args: { p_new_role: string; p_target_user_id: string };
        Returns: Json;
      };
      update_dust_tolerance: {
        Args: { p_admin_id: string; p_asset: string; p_tolerance: number };
        Returns: Json;
      };
      update_fund_aum_baseline: {
        Args: { p_fund_id: string; p_new_baseline: number };
        Returns: boolean;
      };
      update_fund_daily_aum: {
        Args: {
          p_admin_id: string;
          p_new_total_aum: number;
          p_reason: string;
          p_record_id: string;
        };
        Returns: Json;
      };
      update_fund_daily_aum_with_recalc: {
        Args: {
          p_admin_id: string;
          p_new_total_aum: number;
          p_reason: string;
          p_record_id: string;
        };
        Returns: Json;
      };
      update_investor_aum_percentages: {
        Args: { p_fund_id: string };
        Returns: number;
      };
      update_transaction: {
        Args: { p_reason: string; p_transaction_id: string; p_updates: Json };
        Returns: Json;
      };
      update_user_profile_secure: {
        Args: {
          p_first_name?: string;
          p_last_name?: string;
          p_phone?: string;
          p_status?: string;
          p_user_id: string;
        };
        Returns: boolean;
      };
      update_withdrawal: {
        Args: {
          p_notes?: string;
          p_reason?: string;
          p_requested_amount?: number;
          p_withdrawal_id: string;
          p_withdrawal_type?: string;
        };
        Returns: Json;
      };
      upsert_fund_aum_after_yield: {
        Args: {
          p_actor_id: string;
          p_aum_date: string;
          p_fund_id: string;
          p_purpose: Database["public"]["Enums"]["aum_purpose"];
          p_yield_amount: number;
        };
        Returns: Json;
      };
      validate_aum_against_positions: {
        Args: {
          p_aum_value: number;
          p_context?: string;
          p_fund_id: string;
          p_max_deviation_pct?: number;
        };
        Returns: Json;
      };
      validate_aum_against_positions_at_date: {
        Args: {
          p_aum_value: number;
          p_context?: string;
          p_event_date: string;
          p_fund_id: string;
          p_max_deviation_pct?: number;
        };
        Returns: Json;
      };
      validate_aum_matches_positions: {
        Args: {
          p_aum_date?: string;
          p_fund_id: string;
          p_purpose?: Database["public"]["Enums"]["aum_purpose"];
          p_tolerance_pct?: number;
        };
        Returns: Json;
      };
      validate_aum_matches_positions_strict: {
        Args: {
          p_aum_date?: string;
          p_fund_id: string;
          p_purpose?: Database["public"]["Enums"]["aum_purpose"];
        };
        Returns: Json;
      };
      validate_pre_yield_aum: {
        Args: { p_fund_id: string; p_tolerance_percentage?: number };
        Returns: Json;
      };
      validate_transaction_aum_exists: {
        Args: {
          p_fund_id: string;
          p_purpose?: Database["public"]["Enums"]["aum_purpose"];
          p_tx_date: string;
        };
        Returns: boolean;
      };
      validate_withdrawal_transition: {
        Args: { p_current_status: string; p_new_status: string };
        Returns: boolean;
      };
      validate_yield_distribution_prerequisites: {
        Args: {
          p_admin_id?: string;
          p_aum_tolerance_pct?: number;
          p_auto_sync?: boolean;
          p_fund_id: string;
          p_gross_yield_pct: number;
          p_purpose?: string;
          p_yield_date: string;
        };
        Returns: Json;
      };
      validate_yield_parameters: {
        Args: {
          p_fund_id: string;
          p_gross_yield_pct: number;
          p_purpose: string;
          p_yield_date: string;
        };
        Returns: Json;
      };
      validate_yield_rate_sanity: {
        Args: { p_context?: string; p_fund_id?: string; p_yield_pct: number };
        Returns: boolean;
      };
      validate_yield_temporal_lock: {
        Args: { p_fund_id: string; p_purpose: string; p_yield_date: string };
        Returns: Json;
      };
      verify_aum_purpose_usage: {
        Args: never;
        Returns: {
          details: Json;
          issue_type: string;
          record_id: string;
          table_name: string;
        }[];
      };
      verify_yield_distribution_balance: {
        Args: { p_date: string; p_fund_id: string; p_purpose?: string };
        Returns: {
          actual: number;
          check_name: string;
          difference: number;
          expected: number;
          status: string;
        }[];
      };
      void_and_reissue_transaction: {
        Args: {
          p_admin_id: string;
          p_closing_aum?: number;
          p_new_amount: number;
          p_new_date: string;
          p_new_notes?: string;
          p_new_tx_hash?: string;
          p_original_tx_id: string;
          p_reason?: string;
        };
        Returns: Json;
      };
      void_fund_daily_aum: {
        Args: { p_admin_id: string; p_reason: string; p_record_id: string };
        Returns: Json;
      };
      void_investor_yield_events_for_distribution: {
        Args: {
          p_admin_id?: string;
          p_distribution_id: string;
          p_reason?: string;
        };
        Returns: number;
      };
      void_transaction: {
        Args: { p_admin_id: string; p_reason: string; p_transaction_id: string };
        Returns: Json;
      };
      void_transactions_bulk: {
        Args: {
          p_admin_id: string;
          p_reason: string;
          p_transaction_ids: string[];
        };
        Returns: Json;
      };
      void_yield_distribution: {
        Args: {
          p_admin_id: string;
          p_distribution_id: string;
          p_reason?: string;
          p_void_crystals?: boolean;
        };
        Returns: Json;
      };
    };
    Enums: {
      access_event:
        | "login"
        | "logout"
        | "2fa_setup"
        | "2fa_verify"
        | "session_revoked"
        | "password_change";
      account_type: "investor" | "ib" | "fees_account";
      app_role: "super_admin" | "admin" | "moderator" | "ib" | "user" | "investor";
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
        | "MFA_RESET";
      asset_code: "BTC" | "ETH" | "SOL" | "USDT" | "EURC" | "xAUT" | "XRP" | "ADA";
      aum_purpose: "reporting" | "transaction";
      benchmark_type: "BTC" | "ETH" | "STABLE" | "CUSTOM";
      document_type: "statement" | "notice" | "terms" | "tax" | "other";
      error_category:
        | "VALIDATION"
        | "BUSINESS_RULE"
        | "STATE"
        | "PERMISSION"
        | "NOT_FOUND"
        | "CONFLICT"
        | "SYSTEM";
      fee_kind: "mgmt" | "perf";
      fund_status: "active" | "inactive" | "suspended" | "deprecated" | "pending";
      notification_priority: "low" | "medium" | "high";
      notification_type:
        | "deposit"
        | "statement"
        | "performance"
        | "system"
        | "support"
        | "withdrawal"
        | "yield";
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
        | "STAGING_ALREADY_PROMOTED";
      share_scope: "portfolio" | "documents" | "statement";
      ticket_category: "account" | "portfolio" | "statement" | "technical" | "general";
      ticket_priority: "low" | "medium" | "high" | "urgent";
      ticket_status: "open" | "in_progress" | "waiting_on_lp" | "closed";
      transaction_status: "pending" | "confirmed" | "failed" | "cancelled";
      transaction_type: "DEPOSIT" | "WITHDRAWAL" | "INTEREST" | "FEE" | "DUST_ALLOCATION";
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
        | "stress_test";
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
        | "DUST_SWEEP";
      visibility_scope: "investor_visible" | "admin_only";
      withdrawal_action:
        | "create"
        | "approve"
        | "reject"
        | "processing"
        | "complete"
        | "cancel"
        | "update"
        | "route_to_fees";
      withdrawal_status:
        | "pending"
        | "approved"
        | "processing"
        | "completed"
        | "rejected"
        | "cancelled";
      yield_distribution_status:
        | "draft"
        | "applied"
        | "voided"
        | "previewed"
        | "corrected"
        | "rolled_back";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

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
      ticket_category: ["account", "portfolio", "statement", "technical", "general"],
      ticket_priority: ["low", "medium", "high", "urgent"],
      ticket_status: ["open", "in_progress", "waiting_on_lp", "closed"],
      transaction_status: ["pending", "confirmed", "failed", "cancelled"],
      transaction_type: ["DEPOSIT", "WITHDRAWAL", "INTEREST", "FEE", "DUST_ALLOCATION"],
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
        "stress_test",
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
        "DUST_SWEEP",
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
} as const;
