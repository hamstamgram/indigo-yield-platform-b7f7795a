export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)";
  };
  graphql_public: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      graphql: {
        Args: {
          extensions?: Json;
          operationName?: string;
          query?: string;
          variables?: Json;
        };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  public: {
    Tables: {
      access_logs: {
        Row: {
          created_at: string;
          device_label: string | null;
          event: Database["public"]["Enums"]["access_event"];
          id: string;
          ip: unknown;
          success: boolean;
          user_agent: string | null;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          device_label?: string | null;
          event: Database["public"]["Enums"]["access_event"];
          id?: string;
          ip?: unknown;
          success?: boolean;
          user_agent?: string | null;
          user_id: string;
        };
        Update: {
          created_at?: string;
          device_label?: string | null;
          event?: Database["public"]["Enums"]["access_event"];
          id?: string;
          ip?: unknown;
          success?: boolean;
          user_agent?: string | null;
          user_id?: string;
        };
        Relationships: [];
      };
      admin_invites: {
        Row: {
          created_at: string | null;
          created_by: string | null;
          email: string;
          expires_at: string;
          id: string;
          invite_code: string;
          used_at: string | null;
          used_by: string | null;
        };
        Insert: {
          created_at?: string | null;
          created_by?: string | null;
          email: string;
          expires_at: string;
          id?: string;
          invite_code: string;
          used_at?: string | null;
          used_by?: string | null;
        };
        Update: {
          created_at?: string | null;
          created_by?: string | null;
          email?: string;
          expires_at?: string;
          id?: string;
          invite_code?: string;
          used_at?: string | null;
          used_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "admin_invites_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "investor_directory";
            referencedColumns: ["profile_id"];
          },
          {
            foreignKeyName: "admin_invites_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "admin_invites_used_by_fkey";
            columns: ["used_by"];
            isOneToOne: false;
            referencedRelation: "investor_directory";
            referencedColumns: ["profile_id"];
          },
          {
            foreignKeyName: "admin_invites_used_by_fkey";
            columns: ["used_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      admin_users: {
        Row: {
          granted_at: string;
          granted_by: string | null;
          revoked_at: string | null;
          revoked_by: string | null;
          user_id: string;
        };
        Insert: {
          granted_at?: string;
          granted_by?: string | null;
          revoked_at?: string | null;
          revoked_by?: string | null;
          user_id: string;
        };
        Update: {
          granted_at?: string;
          granted_by?: string | null;
          revoked_at?: string | null;
          revoked_by?: string | null;
          user_id?: string;
        };
        Relationships: [];
      };
      asset_prices: {
        Row: {
          as_of: string | null;
          asset_id: string;
          created_at: string | null;
          id: string;
          market_cap: number | null;
          price_btc: number | null;
          price_eth: number | null;
          price_usd: number;
          source: string | null;
          volume_24h: number | null;
        };
        Insert: {
          as_of?: string | null;
          asset_id: string;
          created_at?: string | null;
          id?: string;
          market_cap?: number | null;
          price_btc?: number | null;
          price_eth?: number | null;
          price_usd: number;
          source?: string | null;
          volume_24h?: number | null;
        };
        Update: {
          as_of?: string | null;
          asset_id?: string;
          created_at?: string | null;
          id?: string;
          market_cap?: number | null;
          price_btc?: number | null;
          price_eth?: number | null;
          price_usd?: number;
          source?: string | null;
          volume_24h?: number | null;
        };
        Relationships: [];
      };
      assets_v2: {
        Row: {
          asset_id: string;
          created_at: string | null;
          decimals: number | null;
          is_active: boolean | null;
          kind: string;
          logo_url: string | null;
          metadata: Json | null;
          name: string;
          symbol: string;
          updated_at: string | null;
        };
        Insert: {
          asset_id: string;
          created_at?: string | null;
          decimals?: number | null;
          is_active?: boolean | null;
          kind?: string;
          logo_url?: string | null;
          metadata?: Json | null;
          name: string;
          symbol: string;
          updated_at?: string | null;
        };
        Update: {
          asset_id?: string;
          created_at?: string | null;
          decimals?: number | null;
          is_active?: boolean | null;
          kind?: string;
          logo_url?: string | null;
          metadata?: Json | null;
          name?: string;
          symbol?: string;
          updated_at?: string | null;
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
      balance_adjustments: {
        Row: {
          amount: number;
          audit_ref: string | null;
          created_at: string;
          created_by: string;
          currency: string;
          fund_id: string | null;
          id: string;
          notes: string | null;
          reason: string;
          user_id: string;
        };
        Insert: {
          amount: number;
          audit_ref?: string | null;
          created_at?: string;
          created_by: string;
          currency?: string;
          fund_id?: string | null;
          id?: string;
          notes?: string | null;
          reason: string;
          user_id: string;
        };
        Update: {
          amount?: number;
          audit_ref?: string | null;
          created_at?: string;
          created_by?: string;
          currency?: string;
          fund_id?: string | null;
          id?: string;
          notes?: string | null;
          reason?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      benchmarks: {
        Row: {
          created_at: string;
          date: string;
          id: number;
          price_usd: number;
          ret_1d: number | null;
          ret_itd: number | null;
          ret_mtd: number | null;
          ret_qtd: number | null;
          ret_ytd: number | null;
          symbol: string;
        };
        Insert: {
          created_at?: string;
          date: string;
          id?: number;
          price_usd: number;
          ret_1d?: number | null;
          ret_itd?: number | null;
          ret_mtd?: number | null;
          ret_qtd?: number | null;
          ret_ytd?: number | null;
          symbol: string;
        };
        Update: {
          created_at?: string;
          date?: string;
          id?: number;
          price_usd?: number;
          ret_1d?: number | null;
          ret_itd?: number | null;
          ret_mtd?: number | null;
          ret_qtd?: number | null;
          ret_ytd?: number | null;
          symbol?: string;
        };
        Relationships: [];
      };
      daily_rates: {
        Row: {
          btc_rate: number;
          created_at: string;
          created_by: string | null;
          eth_rate: number;
          eurc_rate: number;
          id: string;
          notes: string | null;
          rate_date: string;
          sol_rate: number;
          updated_at: string;
          usdc_rate: number;
          usdt_rate: number;
        };
        Insert: {
          btc_rate?: number;
          created_at?: string;
          created_by?: string | null;
          eth_rate?: number;
          eurc_rate?: number;
          id?: string;
          notes?: string | null;
          rate_date: string;
          sol_rate?: number;
          updated_at?: string;
          usdc_rate?: number;
          usdt_rate?: number;
        };
        Update: {
          btc_rate?: number;
          created_at?: string;
          created_by?: string | null;
          eth_rate?: number;
          eurc_rate?: number;
          id?: string;
          notes?: string | null;
          rate_date?: string;
          sol_rate?: number;
          updated_at?: string;
          usdc_rate?: number;
          usdt_rate?: number;
        };
        Relationships: [];
      };
      documents: {
        Row: {
          checksum: string | null;
          created_at: string;
          created_by: string | null;
          fund_id: string | null;
          id: string;
          period_end: string | null;
          period_start: string | null;
          storage_path: string;
          title: string;
          type: Database["public"]["Enums"]["document_type"];
          user_id: string;
        };
        Insert: {
          checksum?: string | null;
          created_at?: string;
          created_by?: string | null;
          fund_id?: string | null;
          id?: string;
          period_end?: string | null;
          period_start?: string | null;
          storage_path: string;
          title: string;
          type: Database["public"]["Enums"]["document_type"];
          user_id: string;
        };
        Update: {
          checksum?: string | null;
          created_at?: string;
          created_by?: string | null;
          fund_id?: string | null;
          id?: string;
          period_end?: string | null;
          period_start?: string | null;
          storage_path?: string;
          title?: string;
          type?: Database["public"]["Enums"]["document_type"];
          user_id?: string;
        };
        Relationships: [];
      };
      fee_calculations: {
        Row: {
          calculation_basis: number;
          calculation_date: string;
          created_at: string | null;
          created_by: string | null;
          fee_amount: number;
          fee_type: string | null;
          fund_id: string;
          id: string;
          investor_id: string;
          notes: string | null;
          posted_transaction_id: string | null;
          rate_bps: number;
          status: string | null;
        };
        Insert: {
          calculation_basis: number;
          calculation_date: string;
          created_at?: string | null;
          created_by?: string | null;
          fee_amount: number;
          fee_type?: string | null;
          fund_id: string;
          id?: string;
          investor_id: string;
          notes?: string | null;
          posted_transaction_id?: string | null;
          rate_bps: number;
          status?: string | null;
        };
        Update: {
          calculation_basis?: number;
          calculation_date?: string;
          created_at?: string | null;
          created_by?: string | null;
          fee_amount?: number;
          fee_type?: string | null;
          fund_id?: string;
          id?: string;
          investor_id?: string;
          notes?: string | null;
          posted_transaction_id?: string | null;
          rate_bps?: number;
          status?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "fee_calculations_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "investor_directory";
            referencedColumns: ["profile_id"];
          },
          {
            foreignKeyName: "fee_calculations_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "fee_calculations_fund_id_fkey";
            columns: ["fund_id"];
            isOneToOne: false;
            referencedRelation: "funds";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "fee_calculations_investor_id_fkey";
            columns: ["investor_id"];
            isOneToOne: false;
            referencedRelation: "investor_directory";
            referencedColumns: ["investor_id"];
          },
          {
            foreignKeyName: "fee_calculations_investor_id_fkey";
            columns: ["investor_id"];
            isOneToOne: false;
            referencedRelation: "investors";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "fee_calculations_posted_transaction_id_fkey";
            columns: ["posted_transaction_id"];
            isOneToOne: false;
            referencedRelation: "transactions_v2";
            referencedColumns: ["id"];
          },
        ];
      };
      fund_configurations: {
        Row: {
          benchmark: Database["public"]["Enums"]["benchmark_type"];
          code: string;
          created_at: string;
          currency: string;
          effective_from: string;
          fee_version: number;
          id: string;
          inception_date: string;
          mgmt_fee_bps: number;
          name: string;
          perf_fee_bps: number;
          status: Database["public"]["Enums"]["fund_status"];
          updated_at: string;
        };
        Insert: {
          benchmark?: Database["public"]["Enums"]["benchmark_type"];
          code: string;
          created_at?: string;
          currency?: string;
          effective_from?: string;
          fee_version?: number;
          id?: string;
          inception_date?: string;
          mgmt_fee_bps?: number;
          name: string;
          perf_fee_bps?: number;
          status?: Database["public"]["Enums"]["fund_status"];
          updated_at?: string;
        };
        Update: {
          benchmark?: Database["public"]["Enums"]["benchmark_type"];
          code?: string;
          created_at?: string;
          currency?: string;
          effective_from?: string;
          fee_version?: number;
          id?: string;
          inception_date?: string;
          mgmt_fee_bps?: number;
          name?: string;
          perf_fee_bps?: number;
          status?: Database["public"]["Enums"]["fund_status"];
          updated_at?: string;
        };
        Relationships: [];
      };
      fund_daily_aum: {
        Row: {
          aum_date: string;
          created_at: string | null;
          fees_accrued: number | null;
          fund_id: string;
          id: string;
          inflows: number | null;
          investor_count: number | null;
          outflows: number | null;
          total_aum: number;
          yield_accrued: number | null;
        };
        Insert: {
          aum_date: string;
          created_at?: string | null;
          fees_accrued?: number | null;
          fund_id: string;
          id?: string;
          inflows?: number | null;
          investor_count?: number | null;
          outflows?: number | null;
          total_aum: number;
          yield_accrued?: number | null;
        };
        Update: {
          aum_date?: string;
          created_at?: string | null;
          fees_accrued?: number | null;
          fund_id?: string;
          id?: string;
          inflows?: number | null;
          investor_count?: number | null;
          outflows?: number | null;
          total_aum?: number;
          yield_accrued?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "fund_daily_aum_fund_id_fkey";
            columns: ["fund_id"];
            isOneToOne: false;
            referencedRelation: "funds";
            referencedColumns: ["id"];
          },
        ];
      };
      fund_fee_history: {
        Row: {
          created_at: string;
          created_by: string;
          effective_from: string;
          fund_id: string;
          id: string;
          mgmt_fee_bps: number;
          perf_fee_bps: number;
        };
        Insert: {
          created_at?: string;
          created_by: string;
          effective_from: string;
          fund_id: string;
          id?: string;
          mgmt_fee_bps: number;
          perf_fee_bps: number;
        };
        Update: {
          created_at?: string;
          created_by?: string;
          effective_from?: string;
          fund_id?: string;
          id?: string;
          mgmt_fee_bps?: number;
          perf_fee_bps?: number;
        };
        Relationships: [
          {
            foreignKeyName: "fund_fee_history_fund_id_fkey";
            columns: ["fund_id"];
            isOneToOne: false;
            referencedRelation: "fund_configurations";
            referencedColumns: ["id"];
          },
        ];
      };
      funds: {
        Row: {
          asset: string;
          asset_symbol: string | null;
          code: string;
          created_at: string | null;
          fund_class: string;
          high_water_mark: number | null;
          id: string;
          inception_date: string;
          lock_period_days: number | null;
          mgmt_fee_bps: number | null;
          min_investment: number | null;
          name: string;
          perf_fee_bps: number | null;
          status: Database["public"]["Enums"]["fund_status"] | null;
          total_aum: number | null;
          updated_at: string | null;
        };
        Insert: {
          asset: string;
          asset_symbol?: string | null;
          code: string;
          created_at?: string | null;
          fund_class: string;
          high_water_mark?: number | null;
          id?: string;
          inception_date?: string;
          lock_period_days?: number | null;
          mgmt_fee_bps?: number | null;
          min_investment?: number | null;
          name: string;
          perf_fee_bps?: number | null;
          status?: Database["public"]["Enums"]["fund_status"] | null;
          total_aum?: number | null;
          updated_at?: string | null;
        };
        Update: {
          asset?: string;
          asset_symbol?: string | null;
          code?: string;
          created_at?: string | null;
          fund_class?: string;
          high_water_mark?: number | null;
          id?: string;
          inception_date?: string;
          lock_period_days?: number | null;
          mgmt_fee_bps?: number | null;
          min_investment?: number | null;
          name?: string;
          perf_fee_bps?: number | null;
          status?: Database["public"]["Enums"]["fund_status"] | null;
          total_aum?: number | null;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      generated_reports: {
        Row: {
          created_at: string | null;
          date_range_end: string | null;
          date_range_start: string | null;
          download_count: number | null;
          download_url: string | null;
          download_url_expires_at: string | null;
          error_details: Json | null;
          error_message: string | null;
          file_size_bytes: number | null;
          filters: Json | null;
          format: string;
          generated_by_user_id: string | null;
          generated_for_user_id: string | null;
          id: string;
          page_count: number | null;
          parameters: Json | null;
          processing_completed_at: string | null;
          processing_duration_ms: number | null;
          processing_started_at: string | null;
          report_definition_id: string | null;
          report_type: string;
          schedule_id: string | null;
          status: string | null;
          storage_path: string | null;
          updated_at: string | null;
        };
        Insert: {
          created_at?: string | null;
          date_range_end?: string | null;
          date_range_start?: string | null;
          download_count?: number | null;
          download_url?: string | null;
          download_url_expires_at?: string | null;
          error_details?: Json | null;
          error_message?: string | null;
          file_size_bytes?: number | null;
          filters?: Json | null;
          format: string;
          generated_by_user_id?: string | null;
          generated_for_user_id?: string | null;
          id?: string;
          page_count?: number | null;
          parameters?: Json | null;
          processing_completed_at?: string | null;
          processing_duration_ms?: number | null;
          processing_started_at?: string | null;
          report_definition_id?: string | null;
          report_type: string;
          schedule_id?: string | null;
          status?: string | null;
          storage_path?: string | null;
          updated_at?: string | null;
        };
        Update: {
          created_at?: string | null;
          date_range_end?: string | null;
          date_range_start?: string | null;
          download_count?: number | null;
          download_url?: string | null;
          download_url_expires_at?: string | null;
          error_details?: Json | null;
          error_message?: string | null;
          file_size_bytes?: number | null;
          filters?: Json | null;
          format?: string;
          generated_by_user_id?: string | null;
          generated_for_user_id?: string | null;
          id?: string;
          page_count?: number | null;
          parameters?: Json | null;
          processing_completed_at?: string | null;
          processing_duration_ms?: number | null;
          processing_started_at?: string | null;
          report_definition_id?: string | null;
          report_type?: string;
          schedule_id?: string | null;
          status?: string | null;
          storage_path?: string | null;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      generated_statements: {
        Row: {
          created_at: string | null;
          fund_names: string[] | null;
          generated_by: string | null;
          html_content: string | null;
          id: string;
          pdf_storage_path: string | null;
          period_id: string;
          updated_at: string | null;
          user_id: string;
        };
        Insert: {
          created_at?: string | null;
          fund_names?: string[] | null;
          generated_by?: string | null;
          html_content?: string | null;
          id?: string;
          pdf_storage_path?: string | null;
          period_id: string;
          updated_at?: string | null;
          user_id: string;
        };
        Update: {
          created_at?: string | null;
          fund_names?: string[] | null;
          generated_by?: string | null;
          html_content?: string | null;
          id?: string;
          pdf_storage_path?: string | null;
          period_id?: string;
          updated_at?: string | null;
          user_id?: string;
        };
        Relationships: [];
      };
      investments: {
        Row: {
          amount: number;
          asset_code: string | null;
          created_at: string | null;
          fund_id: string;
          id: string;
          investment_date: string;
          investor_id: string;
          nav_at_investment: number | null;
          notes: string | null;
          shares: number | null;
          status: string | null;
          updated_at: string | null;
        };
        Insert: {
          amount: number;
          asset_code?: string | null;
          created_at?: string | null;
          fund_id: string;
          id?: string;
          investment_date?: string;
          investor_id: string;
          nav_at_investment?: number | null;
          notes?: string | null;
          shares?: number | null;
          status?: string | null;
          updated_at?: string | null;
        };
        Update: {
          amount?: number;
          asset_code?: string | null;
          created_at?: string | null;
          fund_id?: string;
          id?: string;
          investment_date?: string;
          investor_id?: string;
          nav_at_investment?: number | null;
          notes?: string | null;
          shares?: number | null;
          status?: string | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "investments_fund_id_fkey";
            columns: ["fund_id"];
            isOneToOne: false;
            referencedRelation: "funds";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "investments_investor_id_fkey";
            columns: ["investor_id"];
            isOneToOne: false;
            referencedRelation: "investor_directory";
            referencedColumns: ["investor_id"];
          },
          {
            foreignKeyName: "investments_investor_id_fkey";
            columns: ["investor_id"];
            isOneToOne: false;
            referencedRelation: "investors";
            referencedColumns: ["id"];
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
            foreignKeyName: "investor_emails_investor_id_fkey";
            columns: ["investor_id"];
            isOneToOne: false;
            referencedRelation: "investor_directory";
            referencedColumns: ["investor_id"];
          },
          {
            foreignKeyName: "investor_emails_investor_id_fkey";
            columns: ["investor_id"];
            isOneToOne: false;
            referencedRelation: "investors";
            referencedColumns: ["id"];
          },
        ];
      };
      investor_fund_performance: {
        Row: {
          created_at: string | null;
          fund_name: string;
          id: string;
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
          qtd_additions: number | null;
          qtd_beginning_balance: number | null;
          qtd_ending_balance: number | null;
          qtd_net_income: number | null;
          qtd_rate_of_return: number | null;
          qtd_redemptions: number | null;
          updated_at: string | null;
          user_id: string;
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
          qtd_additions?: number | null;
          qtd_beginning_balance?: number | null;
          qtd_ending_balance?: number | null;
          qtd_net_income?: number | null;
          qtd_rate_of_return?: number | null;
          qtd_redemptions?: number | null;
          updated_at?: string | null;
          user_id: string;
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
          qtd_additions?: number | null;
          qtd_beginning_balance?: number | null;
          qtd_ending_balance?: number | null;
          qtd_net_income?: number | null;
          qtd_rate_of_return?: number | null;
          qtd_redemptions?: number | null;
          updated_at?: string | null;
          user_id?: string;
          ytd_additions?: number | null;
          ytd_beginning_balance?: number | null;
          ytd_ending_balance?: number | null;
          ytd_net_income?: number | null;
          ytd_rate_of_return?: number | null;
          ytd_redemptions?: number | null;
        };
        Relationships: [];
      };
      investor_monthly_reports: {
        Row: {
          additions: number | null;
          asset_code: string;
          aum_manual_override: number | null;
          closing_balance: number | null;
          created_at: string;
          edited_by: string | null;
          entry_date: string | null;
          exit_date: string | null;
          id: string;
          investor_id: string;
          opening_balance: number | null;
          report_month: string;
          updated_at: string;
          withdrawals: number | null;
          yield_earned: number | null;
        };
        Insert: {
          additions?: number | null;
          asset_code: string;
          aum_manual_override?: number | null;
          closing_balance?: number | null;
          created_at?: string;
          edited_by?: string | null;
          entry_date?: string | null;
          exit_date?: string | null;
          id?: string;
          investor_id: string;
          opening_balance?: number | null;
          report_month: string;
          updated_at?: string;
          withdrawals?: number | null;
          yield_earned?: number | null;
        };
        Update: {
          additions?: number | null;
          asset_code?: string;
          aum_manual_override?: number | null;
          closing_balance?: number | null;
          created_at?: string;
          edited_by?: string | null;
          entry_date?: string | null;
          exit_date?: string | null;
          id?: string;
          investor_id?: string;
          opening_balance?: number | null;
          report_month?: string;
          updated_at?: string;
          withdrawals?: number | null;
          yield_earned?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "investor_monthly_reports_investor_id_fkey";
            columns: ["investor_id"];
            isOneToOne: false;
            referencedRelation: "investor_directory";
            referencedColumns: ["investor_id"];
          },
          {
            foreignKeyName: "investor_monthly_reports_investor_id_fkey";
            columns: ["investor_id"];
            isOneToOne: false;
            referencedRelation: "investors";
            referencedColumns: ["id"];
          },
        ];
      };
      investor_positions: {
        Row: {
          aum_percentage: number | null;
          cost_basis: number;
          current_value: number;
          fund_class: string | null;
          fund_id: string;
          high_water_mark: number | null;
          investor_id: string;
          last_modified_at: string | null;
          last_modified_by: string | null;
          last_transaction_date: string | null;
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
          current_value?: number;
          fund_class?: string | null;
          fund_id: string;
          high_water_mark?: number | null;
          investor_id: string;
          last_modified_at?: string | null;
          last_modified_by?: string | null;
          last_transaction_date?: string | null;
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
          current_value?: number;
          fund_class?: string | null;
          fund_id?: string;
          high_water_mark?: number | null;
          investor_id?: string;
          last_modified_at?: string | null;
          last_modified_by?: string | null;
          last_transaction_date?: string | null;
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
            foreignKeyName: "investor_positions_fund_id_fkey";
            columns: ["fund_id"];
            isOneToOne: false;
            referencedRelation: "funds";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "investor_positions_investor_id_fkey";
            columns: ["investor_id"];
            isOneToOne: false;
            referencedRelation: "investor_directory";
            referencedColumns: ["investor_id"];
          },
          {
            foreignKeyName: "investor_positions_investor_id_fkey";
            columns: ["investor_id"];
            isOneToOne: false;
            referencedRelation: "investors";
            referencedColumns: ["id"];
          },
        ];
      };
      investors: {
        Row: {
          accredited: boolean | null;
          aml_status: string | null;
          created_at: string | null;
          email: string;
          entity_type: string | null;
          id: string;
          kyc_date: string | null;
          kyc_status: string | null;
          name: string;
          onboarding_date: string | null;
          phone: string | null;
          profile_id: string | null;
          status: string;
          tax_id: string | null;
          updated_at: string | null;
        };
        Insert: {
          accredited?: boolean | null;
          aml_status?: string | null;
          created_at?: string | null;
          email: string;
          entity_type?: string | null;
          id?: string;
          kyc_date?: string | null;
          kyc_status?: string | null;
          name: string;
          onboarding_date?: string | null;
          phone?: string | null;
          profile_id?: string | null;
          status?: string;
          tax_id?: string | null;
          updated_at?: string | null;
        };
        Update: {
          accredited?: boolean | null;
          aml_status?: string | null;
          created_at?: string | null;
          email?: string;
          entity_type?: string | null;
          id?: string;
          kyc_date?: string | null;
          kyc_status?: string | null;
          name?: string;
          onboarding_date?: string | null;
          phone?: string | null;
          profile_id?: string | null;
          status?: string;
          tax_id?: string | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "investors_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: false;
            referencedRelation: "investor_directory";
            referencedColumns: ["profile_id"];
          },
          {
            foreignKeyName: "investors_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      notification_settings: {
        Row: {
          alert_notifications: boolean | null;
          created_at: string | null;
          document_notifications: boolean | null;
          email_enabled: boolean | null;
          email_frequency: string | null;
          id: string;
          in_app_enabled: boolean | null;
          portfolio_notifications: boolean | null;
          push_enabled: boolean | null;
          quiet_hours_end: string | null;
          quiet_hours_start: string | null;
          security_notifications: boolean | null;
          support_notifications: boolean | null;
          system_notifications: boolean | null;
          transaction_notifications: boolean | null;
          updated_at: string | null;
          user_id: string;
          yield_notifications: boolean | null;
        };
        Insert: {
          alert_notifications?: boolean | null;
          created_at?: string | null;
          document_notifications?: boolean | null;
          email_enabled?: boolean | null;
          email_frequency?: string | null;
          id?: string;
          in_app_enabled?: boolean | null;
          portfolio_notifications?: boolean | null;
          push_enabled?: boolean | null;
          quiet_hours_end?: string | null;
          quiet_hours_start?: string | null;
          security_notifications?: boolean | null;
          support_notifications?: boolean | null;
          system_notifications?: boolean | null;
          transaction_notifications?: boolean | null;
          updated_at?: string | null;
          user_id: string;
          yield_notifications?: boolean | null;
        };
        Update: {
          alert_notifications?: boolean | null;
          created_at?: string | null;
          document_notifications?: boolean | null;
          email_enabled?: boolean | null;
          email_frequency?: string | null;
          id?: string;
          in_app_enabled?: boolean | null;
          portfolio_notifications?: boolean | null;
          push_enabled?: boolean | null;
          quiet_hours_end?: string | null;
          quiet_hours_start?: string | null;
          security_notifications?: boolean | null;
          support_notifications?: boolean | null;
          system_notifications?: boolean | null;
          transaction_notifications?: boolean | null;
          updated_at?: string | null;
          user_id?: string;
          yield_notifications?: boolean | null;
        };
        Relationships: [];
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
      onboarding_submissions: {
        Row: {
          accreditation_documents: string[] | null;
          accreditation_type: string | null;
          accredited_investor: boolean | null;
          address: string | null;
          admin_notes: string | null;
          airtable_record_id: string | null;
          airtable_synced_at: string | null;
          approved_at: string | null;
          approved_by: string | null;
          city: string | null;
          company_name: string | null;
          country: string | null;
          created_at: string | null;
          email: string;
          entity_type: string | null;
          first_name: string | null;
          full_name: string | null;
          id: string;
          id_document_expiry: string | null;
          id_document_number: string | null;
          id_document_type: string | null;
          id_document_url: string | null;
          investment_amount: number | null;
          investment_horizon: string | null;
          investor_id: string | null;
          last_name: string | null;
          notes: string | null;
          phone: string | null;
          postal_code: string | null;
          preferred_assets: string[] | null;
          proof_of_address_url: string | null;
          rejection_reason: string | null;
          reviewed_at: string | null;
          reviewed_by: string | null;
          risk_tolerance: string | null;
          state: string | null;
          status: string | null;
          submitted_at: string | null;
          tax_id: string | null;
          updated_at: string | null;
        };
        Insert: {
          accreditation_documents?: string[] | null;
          accreditation_type?: string | null;
          accredited_investor?: boolean | null;
          address?: string | null;
          admin_notes?: string | null;
          airtable_record_id?: string | null;
          airtable_synced_at?: string | null;
          approved_at?: string | null;
          approved_by?: string | null;
          city?: string | null;
          company_name?: string | null;
          country?: string | null;
          created_at?: string | null;
          email: string;
          entity_type?: string | null;
          first_name?: string | null;
          full_name?: string | null;
          id?: string;
          id_document_expiry?: string | null;
          id_document_number?: string | null;
          id_document_type?: string | null;
          id_document_url?: string | null;
          investment_amount?: number | null;
          investment_horizon?: string | null;
          investor_id?: string | null;
          last_name?: string | null;
          notes?: string | null;
          phone?: string | null;
          postal_code?: string | null;
          preferred_assets?: string[] | null;
          proof_of_address_url?: string | null;
          rejection_reason?: string | null;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          risk_tolerance?: string | null;
          state?: string | null;
          status?: string | null;
          submitted_at?: string | null;
          tax_id?: string | null;
          updated_at?: string | null;
        };
        Update: {
          accreditation_documents?: string[] | null;
          accreditation_type?: string | null;
          accredited_investor?: boolean | null;
          address?: string | null;
          admin_notes?: string | null;
          airtable_record_id?: string | null;
          airtable_synced_at?: string | null;
          approved_at?: string | null;
          approved_by?: string | null;
          city?: string | null;
          company_name?: string | null;
          country?: string | null;
          created_at?: string | null;
          email?: string;
          entity_type?: string | null;
          first_name?: string | null;
          full_name?: string | null;
          id?: string;
          id_document_expiry?: string | null;
          id_document_number?: string | null;
          id_document_type?: string | null;
          id_document_url?: string | null;
          investment_amount?: number | null;
          investment_horizon?: string | null;
          investor_id?: string | null;
          last_name?: string | null;
          notes?: string | null;
          phone?: string | null;
          postal_code?: string | null;
          preferred_assets?: string[] | null;
          proof_of_address_url?: string | null;
          rejection_reason?: string | null;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          risk_tolerance?: string | null;
          state?: string | null;
          status?: string | null;
          submitted_at?: string | null;
          tax_id?: string | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "onboarding_submissions_approved_by_fkey";
            columns: ["approved_by"];
            isOneToOne: false;
            referencedRelation: "investor_directory";
            referencedColumns: ["profile_id"];
          },
          {
            foreignKeyName: "onboarding_submissions_approved_by_fkey";
            columns: ["approved_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "onboarding_submissions_investor_id_fkey";
            columns: ["investor_id"];
            isOneToOne: false;
            referencedRelation: "investor_directory";
            referencedColumns: ["investor_id"];
          },
          {
            foreignKeyName: "onboarding_submissions_investor_id_fkey";
            columns: ["investor_id"];
            isOneToOne: false;
            referencedRelation: "investors";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "onboarding_submissions_reviewed_by_fkey";
            columns: ["reviewed_by"];
            isOneToOne: false;
            referencedRelation: "investor_directory";
            referencedColumns: ["profile_id"];
          },
          {
            foreignKeyName: "onboarding_submissions_reviewed_by_fkey";
            columns: ["reviewed_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      platform_fees_collected: {
        Row: {
          created_at: string | null;
          fee_amount: number;
          fee_date: string;
          fee_type: string | null;
          fund_id: string | null;
          gross_yield: number | null;
          id: string;
          investor_id: string;
          net_yield: number | null;
          transaction_id: string | null;
        };
        Insert: {
          created_at?: string | null;
          fee_amount: number;
          fee_date?: string;
          fee_type?: string | null;
          fund_id?: string | null;
          gross_yield?: number | null;
          id?: string;
          investor_id: string;
          net_yield?: number | null;
          transaction_id?: string | null;
        };
        Update: {
          created_at?: string | null;
          fee_amount?: number;
          fee_date?: string;
          fee_type?: string | null;
          fund_id?: string | null;
          gross_yield?: number | null;
          id?: string;
          investor_id?: string;
          net_yield?: number | null;
          transaction_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "platform_fees_collected_fund_id_fkey";
            columns: ["fund_id"];
            isOneToOne: false;
            referencedRelation: "funds";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "platform_fees_collected_investor_id_fkey";
            columns: ["investor_id"];
            isOneToOne: false;
            referencedRelation: "investor_directory";
            referencedColumns: ["investor_id"];
          },
          {
            foreignKeyName: "platform_fees_collected_investor_id_fkey";
            columns: ["investor_id"];
            isOneToOne: false;
            referencedRelation: "investors";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "platform_fees_collected_transaction_id_fkey";
            columns: ["transaction_id"];
            isOneToOne: false;
            referencedRelation: "transactions_v2";
            referencedColumns: ["id"];
          },
        ];
      };
      platform_settings: {
        Row: {
          allow_new_registrations: boolean | null;
          created_at: string | null;
          enable_2fa: boolean | null;
          id: string;
          maintenance_mode: boolean | null;
          min_deposit: number | null;
          min_withdrawal: number | null;
          notification_email: string | null;
          platform_name: string | null;
          require_email_verification: boolean | null;
          require_kyc: boolean | null;
          support_email: string | null;
          updated_at: string | null;
        };
        Insert: {
          allow_new_registrations?: boolean | null;
          created_at?: string | null;
          enable_2fa?: boolean | null;
          id?: string;
          maintenance_mode?: boolean | null;
          min_deposit?: number | null;
          min_withdrawal?: number | null;
          notification_email?: string | null;
          platform_name?: string | null;
          require_email_verification?: boolean | null;
          require_kyc?: boolean | null;
          support_email?: string | null;
          updated_at?: string | null;
        };
        Update: {
          allow_new_registrations?: boolean | null;
          created_at?: string | null;
          enable_2fa?: boolean | null;
          id?: string;
          maintenance_mode?: boolean | null;
          min_deposit?: number | null;
          min_withdrawal?: number | null;
          notification_email?: string | null;
          platform_name?: string | null;
          require_email_verification?: boolean | null;
          require_kyc?: boolean | null;
          support_email?: string | null;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      portfolio_history: {
        Row: {
          created_at: string | null;
          id: string;
          investor_id: string;
          positions_data: Json | null;
          realized_pnl: number | null;
          snapshot_date: string;
          total_cost_basis: number | null;
          total_value: number;
          unrealized_pnl: number | null;
        };
        Insert: {
          created_at?: string | null;
          id?: string;
          investor_id: string;
          positions_data?: Json | null;
          realized_pnl?: number | null;
          snapshot_date: string;
          total_cost_basis?: number | null;
          total_value: number;
          unrealized_pnl?: number | null;
        };
        Update: {
          created_at?: string | null;
          id?: string;
          investor_id?: string;
          positions_data?: Json | null;
          realized_pnl?: number | null;
          snapshot_date?: string;
          total_cost_basis?: number | null;
          total_value?: number;
          unrealized_pnl?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "portfolio_history_investor_id_fkey";
            columns: ["investor_id"];
            isOneToOne: false;
            referencedRelation: "investor_directory";
            referencedColumns: ["investor_id"];
          },
          {
            foreignKeyName: "portfolio_history_investor_id_fkey";
            columns: ["investor_id"];
            isOneToOne: false;
            referencedRelation: "investors";
            referencedColumns: ["id"];
          },
        ];
      };
      price_alerts: {
        Row: {
          alert_type: string;
          asset_symbol: string;
          created_at: string | null;
          id: string;
          is_active: boolean | null;
          threshold_value: number;
          triggered_at: string | null;
          updated_at: string | null;
          user_id: string;
        };
        Insert: {
          alert_type: string;
          asset_symbol: string;
          created_at?: string | null;
          id?: string;
          is_active?: boolean | null;
          threshold_value: number;
          triggered_at?: string | null;
          updated_at?: string | null;
          user_id: string;
        };
        Update: {
          alert_type?: string;
          asset_symbol?: string;
          created_at?: string | null;
          id?: string;
          is_active?: boolean | null;
          threshold_value?: number;
          triggered_at?: string | null;
          updated_at?: string | null;
          user_id?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          address: string | null;
          avatar_url: string | null;
          city: string | null;
          country: string | null;
          created_at: string;
          date_of_birth: string | null;
          email: string;
          fee_percentage: number | null;
          first_name: string | null;
          full_name: string | null;
          id: string;
          is_admin: boolean;
          kyc_rejection_reason: string | null;
          kyc_status: string | null;
          kyc_verified_at: string | null;
          last_name: string | null;
          phone: string | null;
          postal_code: string | null;
          state: string | null;
          status: string | null;
          totp_enabled: boolean | null;
          totp_verified: boolean | null;
          updated_at: string;
          user_type: string | null;
        };
        Insert: {
          address?: string | null;
          avatar_url?: string | null;
          city?: string | null;
          country?: string | null;
          created_at?: string;
          date_of_birth?: string | null;
          email: string;
          fee_percentage?: number | null;
          first_name?: string | null;
          full_name?: string | null;
          id: string;
          is_admin?: boolean;
          kyc_rejection_reason?: string | null;
          kyc_status?: string | null;
          kyc_verified_at?: string | null;
          last_name?: string | null;
          phone?: string | null;
          postal_code?: string | null;
          state?: string | null;
          status?: string | null;
          totp_enabled?: boolean | null;
          totp_verified?: boolean | null;
          updated_at?: string;
          user_type?: string | null;
        };
        Update: {
          address?: string | null;
          avatar_url?: string | null;
          city?: string | null;
          country?: string | null;
          created_at?: string;
          date_of_birth?: string | null;
          email?: string;
          fee_percentage?: number | null;
          first_name?: string | null;
          full_name?: string | null;
          id?: string;
          is_admin?: boolean;
          kyc_rejection_reason?: string | null;
          kyc_status?: string | null;
          kyc_verified_at?: string | null;
          last_name?: string | null;
          phone?: string | null;
          postal_code?: string | null;
          state?: string | null;
          status?: string | null;
          totp_enabled?: boolean | null;
          totp_verified?: boolean | null;
          updated_at?: string;
          user_type?: string | null;
        };
        Relationships: [];
      };
      report_access_logs: {
        Row: {
          action: string;
          created_at: string | null;
          id: string;
          ip_address: unknown;
          metadata: Json | null;
          report_id: string | null;
          user_agent: string | null;
          user_id: string | null;
        };
        Insert: {
          action: string;
          created_at?: string | null;
          id?: string;
          ip_address?: unknown;
          metadata?: Json | null;
          report_id?: string | null;
          user_agent?: string | null;
          user_id?: string | null;
        };
        Update: {
          action?: string;
          created_at?: string | null;
          id?: string;
          ip_address?: unknown;
          metadata?: Json | null;
          report_id?: string | null;
          user_agent?: string | null;
          user_id?: string | null;
        };
        Relationships: [];
      };
      report_definitions: {
        Row: {
          available_formats: string[] | null;
          created_at: string | null;
          created_by: string | null;
          default_filters: Json | null;
          description: string | null;
          id: string;
          is_active: boolean | null;
          is_admin_only: boolean | null;
          name: string;
          report_type: string;
          template_config: Json | null;
          updated_at: string | null;
        };
        Insert: {
          available_formats?: string[] | null;
          created_at?: string | null;
          created_by?: string | null;
          default_filters?: Json | null;
          description?: string | null;
          id?: string;
          is_active?: boolean | null;
          is_admin_only?: boolean | null;
          name: string;
          report_type: string;
          template_config?: Json | null;
          updated_at?: string | null;
        };
        Update: {
          available_formats?: string[] | null;
          created_at?: string | null;
          created_by?: string | null;
          default_filters?: Json | null;
          description?: string | null;
          id?: string;
          is_active?: boolean | null;
          is_admin_only?: boolean | null;
          name?: string;
          report_type?: string;
          template_config?: Json | null;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      report_schedules: {
        Row: {
          created_at: string | null;
          created_by: string | null;
          day_of_month: number | null;
          day_of_week: number | null;
          delivery_method: string[] | null;
          description: string | null;
          failure_count: number | null;
          filters: Json | null;
          formats: string[] | null;
          frequency: string;
          id: string;
          is_active: boolean | null;
          last_run_at: string | null;
          last_run_status: string | null;
          name: string;
          next_run_at: string | null;
          parameters: Json | null;
          recipient_emails: string[] | null;
          recipient_user_ids: string[] | null;
          report_definition_id: string;
          run_count: number | null;
          time_of_day: string | null;
          timezone: string | null;
          updated_at: string | null;
        };
        Insert: {
          created_at?: string | null;
          created_by?: string | null;
          day_of_month?: number | null;
          day_of_week?: number | null;
          delivery_method?: string[] | null;
          description?: string | null;
          failure_count?: number | null;
          filters?: Json | null;
          formats?: string[] | null;
          frequency: string;
          id?: string;
          is_active?: boolean | null;
          last_run_at?: string | null;
          last_run_status?: string | null;
          name: string;
          next_run_at?: string | null;
          parameters?: Json | null;
          recipient_emails?: string[] | null;
          recipient_user_ids?: string[] | null;
          report_definition_id: string;
          run_count?: number | null;
          time_of_day?: string | null;
          timezone?: string | null;
          updated_at?: string | null;
        };
        Update: {
          created_at?: string | null;
          created_by?: string | null;
          day_of_month?: number | null;
          day_of_week?: number | null;
          delivery_method?: string[] | null;
          description?: string | null;
          failure_count?: number | null;
          filters?: Json | null;
          formats?: string[] | null;
          frequency?: string;
          id?: string;
          is_active?: boolean | null;
          last_run_at?: string | null;
          last_run_status?: string | null;
          name?: string;
          next_run_at?: string | null;
          parameters?: Json | null;
          recipient_emails?: string[] | null;
          recipient_user_ids?: string[] | null;
          report_definition_id?: string;
          run_count?: number | null;
          time_of_day?: string | null;
          timezone?: string | null;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      secure_shares: {
        Row: {
          created_at: string;
          created_by: string | null;
          expires_at: string;
          fund_id: string | null;
          id: string;
          max_views: number | null;
          owner_user_id: string;
          revoked_at: string | null;
          scope: Database["public"]["Enums"]["share_scope"];
          token: string;
          views_count: number;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          expires_at: string;
          fund_id?: string | null;
          id?: string;
          max_views?: number | null;
          owner_user_id: string;
          revoked_at?: string | null;
          scope: Database["public"]["Enums"]["share_scope"];
          token: string;
          views_count?: number;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          expires_at?: string;
          fund_id?: string | null;
          id?: string;
          max_views?: number | null;
          owner_user_id?: string;
          revoked_at?: string | null;
          scope?: Database["public"]["Enums"]["share_scope"];
          token?: string;
          views_count?: number;
        };
        Relationships: [];
      };
      statement_email_delivery: {
        Row: {
          created_at: string | null;
          error_message: string | null;
          failed_at: string | null;
          id: string;
          period_id: string;
          recipient_email: string;
          sent_at: string | null;
          statement_id: string;
          status: string | null;
          subject: string | null;
          user_id: string;
        };
        Insert: {
          created_at?: string | null;
          error_message?: string | null;
          failed_at?: string | null;
          id?: string;
          period_id: string;
          recipient_email: string;
          sent_at?: string | null;
          statement_id: string;
          status?: string | null;
          subject?: string | null;
          user_id: string;
        };
        Update: {
          created_at?: string | null;
          error_message?: string | null;
          failed_at?: string | null;
          id?: string;
          period_id?: string;
          recipient_email?: string;
          sent_at?: string | null;
          statement_id?: string;
          status?: string | null;
          subject?: string | null;
          user_id?: string;
        };
        Relationships: [];
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
          period_start_date: string;
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
          period_start_date: string;
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
          period_start_date?: string;
          status?: string | null;
          updated_at?: string | null;
          year?: number;
        };
        Relationships: [];
      };
      transactions_v2: {
        Row: {
          amount: number;
          approved_at: string | null;
          approved_by: string | null;
          asset: string;
          balance_after: number | null;
          balance_before: number | null;
          created_at: string | null;
          created_by: string | null;
          fund_id: string;
          id: string;
          investor_id: string;
          notes: string | null;
          reference_id: string | null;
          tx_date: string;
          tx_hash: string | null;
          type: Database["public"]["Enums"]["tx_type"];
          value_date: string;
        };
        Insert: {
          amount: number;
          approved_at?: string | null;
          approved_by?: string | null;
          asset: string;
          balance_after?: number | null;
          balance_before?: number | null;
          created_at?: string | null;
          created_by?: string | null;
          fund_id: string;
          id?: string;
          investor_id: string;
          notes?: string | null;
          reference_id?: string | null;
          tx_date?: string;
          tx_hash?: string | null;
          type: Database["public"]["Enums"]["tx_type"];
          value_date?: string;
        };
        Update: {
          amount?: number;
          approved_at?: string | null;
          approved_by?: string | null;
          asset?: string;
          balance_after?: number | null;
          balance_before?: number | null;
          created_at?: string | null;
          created_by?: string | null;
          fund_id?: string;
          id?: string;
          investor_id?: string;
          notes?: string | null;
          reference_id?: string | null;
          tx_date?: string;
          tx_hash?: string | null;
          type?: Database["public"]["Enums"]["tx_type"];
          value_date?: string;
        };
        Relationships: [
          {
            foreignKeyName: "transactions_v2_approved_by_fkey";
            columns: ["approved_by"];
            isOneToOne: false;
            referencedRelation: "investor_directory";
            referencedColumns: ["profile_id"];
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
            referencedRelation: "investor_directory";
            referencedColumns: ["profile_id"];
          },
          {
            foreignKeyName: "transactions_v2_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "transactions_v2_fund_id_fkey";
            columns: ["fund_id"];
            isOneToOne: false;
            referencedRelation: "funds";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "transactions_v2_investor_id_fkey";
            columns: ["investor_id"];
            isOneToOne: false;
            referencedRelation: "investor_directory";
            referencedColumns: ["investor_id"];
          },
          {
            foreignKeyName: "transactions_v2_investor_id_fkey";
            columns: ["investor_id"];
            isOneToOne: false;
            referencedRelation: "investors";
            referencedColumns: ["id"];
          },
        ];
      };
      user_sessions: {
        Row: {
          created_at: string;
          device_label: string | null;
          id: string;
          ip: unknown;
          last_seen_at: string;
          refresh_token_id: string | null;
          revoked_at: string | null;
          revoked_by: string | null;
          user_agent: string | null;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          device_label?: string | null;
          id?: string;
          ip?: unknown;
          last_seen_at?: string;
          refresh_token_id?: string | null;
          revoked_at?: string | null;
          revoked_by?: string | null;
          user_agent?: string | null;
          user_id: string;
        };
        Update: {
          created_at?: string;
          device_label?: string | null;
          id?: string;
          ip?: unknown;
          last_seen_at?: string;
          refresh_token_id?: string | null;
          revoked_at?: string | null;
          revoked_by?: string | null;
          user_agent?: string | null;
          user_id?: string;
        };
        Relationships: [];
      };
      web_push_subscriptions: {
        Row: {
          auth: string;
          created_at: string;
          endpoint: string;
          id: string;
          p256dh: string;
          revoked_at: string | null;
          user_id: string;
        };
        Insert: {
          auth: string;
          created_at?: string;
          endpoint: string;
          id?: string;
          p256dh: string;
          revoked_at?: string | null;
          user_id: string;
        };
        Update: {
          auth?: string;
          created_at?: string;
          endpoint?: string;
          id?: string;
          p256dh?: string;
          revoked_at?: string | null;
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
          fund_class: string | null;
          fund_id: string;
          id: string;
          investor_id: string;
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
          fund_class?: string | null;
          fund_id: string;
          id?: string;
          investor_id: string;
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
          fund_class?: string | null;
          fund_id?: string;
          id?: string;
          investor_id?: string;
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
          withdrawal_type?: string;
        };
        Relationships: [
          {
            foreignKeyName: "withdrawal_requests_approved_by_fkey";
            columns: ["approved_by"];
            isOneToOne: false;
            referencedRelation: "investor_directory";
            referencedColumns: ["profile_id"];
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
            referencedRelation: "investor_directory";
            referencedColumns: ["profile_id"];
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
            referencedRelation: "investor_directory";
            referencedColumns: ["profile_id"];
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
            referencedRelation: "funds";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "withdrawal_requests_investor_id_fkey";
            columns: ["investor_id"];
            isOneToOne: false;
            referencedRelation: "investor_directory";
            referencedColumns: ["investor_id"];
          },
          {
            foreignKeyName: "withdrawal_requests_investor_id_fkey";
            columns: ["investor_id"];
            isOneToOne: false;
            referencedRelation: "investors";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "withdrawal_requests_rejected_by_fkey";
            columns: ["rejected_by"];
            isOneToOne: false;
            referencedRelation: "investor_directory";
            referencedColumns: ["profile_id"];
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
      yield_settings: {
        Row: {
          created_at: string;
          created_by: string | null;
          effective_from: string;
          frequency: string;
          id: string;
          rate_bps: number;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          effective_from?: string;
          frequency?: string;
          id?: string;
          rate_bps: number;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          effective_from?: string;
          frequency?: string;
          id?: string;
          rate_bps?: number;
        };
        Relationships: [];
      };
    };
    Views: {
      assets: {
        Row: {
          id: string | null;
          name: string | null;
          symbol: string | null;
        };
        Relationships: [];
      };
      daily_rate_notification_history: {
        Row: {
          body: string | null;
          btc_rate: number | null;
          created_at: string | null;
          data_jsonb: Json | null;
          eth_rate: number | null;
          id: string | null;
          investor_email: string | null;
          investor_name: string | null;
          priority: Database["public"]["Enums"]["notification_priority"] | null;
          rate_date: string | null;
          read_at: string | null;
          sol_rate: number | null;
          title: string | null;
          user_id: string | null;
        };
        Relationships: [];
      };
      investment_summary: {
        Row: {
          asset: string | null;
          first_investment: string | null;
          fund_id: string | null;
          fund_name: string | null;
          investment_count: number | null;
          investor_id: string | null;
          last_investment: string | null;
          total_invested: number | null;
          total_shares: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "investments_fund_id_fkey";
            columns: ["fund_id"];
            isOneToOne: false;
            referencedRelation: "funds";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "investments_investor_id_fkey";
            columns: ["investor_id"];
            isOneToOne: false;
            referencedRelation: "investor_directory";
            referencedColumns: ["investor_id"];
          },
          {
            foreignKeyName: "investments_investor_id_fkey";
            columns: ["investor_id"];
            isOneToOne: false;
            referencedRelation: "investors";
            referencedColumns: ["id"];
          },
        ];
      };
      investor_directory: {
        Row: {
          aml_status: string | null;
          created_at: string | null;
          email: string | null;
          fee_percentage: number | null;
          first_name: string | null;
          investor_id: string | null;
          investor_name: string | null;
          investor_status: string | null;
          kyc_status: string | null;
          last_name: string | null;
          profile_id: string | null;
        };
        Relationships: [];
      };
      investor_positions_by_class: {
        Row: {
          fund_class: string | null;
          fund_count: number | null;
          investor_id: string | null;
          latest_transaction: string | null;
          total_cost_basis: number | null;
          total_current_value: number | null;
          total_mgmt_fees: number | null;
          total_perf_fees: number | null;
          total_realized_pnl: number | null;
          total_shares: number | null;
          total_unrealized_pnl: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "investor_positions_investor_id_fkey";
            columns: ["investor_id"];
            isOneToOne: false;
            referencedRelation: "investor_directory";
            referencedColumns: ["investor_id"];
          },
          {
            foreignKeyName: "investor_positions_investor_id_fkey";
            columns: ["investor_id"];
            isOneToOne: false;
            referencedRelation: "investors";
            referencedColumns: ["id"];
          },
        ];
      };
      monthly_fee_summary: {
        Row: {
          fee_type: string | null;
          fund_id: string | null;
          month: string | null;
          total_fees_collected: number | null;
          total_gross_yield: number | null;
          total_net_yield: number | null;
          transaction_count: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "platform_fees_collected_fund_id_fkey";
            columns: ["fund_id"];
            isOneToOne: false;
            referencedRelation: "funds";
            referencedColumns: ["id"];
          },
        ];
      };
      positions: {
        Row: {
          aum_percentage: number | null;
          cost_basis: number | null;
          current_value: number | null;
          fund_class: string | null;
          fund_id: string | null;
          high_water_mark: number | null;
          investor_id: string | null;
          last_transaction_date: string | null;
          lock_until_date: string | null;
          mgmt_fees_paid: number | null;
          perf_fees_paid: number | null;
          realized_pnl: number | null;
          shares: number | null;
          unrealized_pnl: number | null;
          updated_at: string | null;
          user_id: string | null;
        };
        Insert: {
          aum_percentage?: number | null;
          cost_basis?: number | null;
          current_value?: number | null;
          fund_class?: string | null;
          fund_id?: string | null;
          high_water_mark?: number | null;
          investor_id?: string | null;
          last_transaction_date?: string | null;
          lock_until_date?: string | null;
          mgmt_fees_paid?: number | null;
          perf_fees_paid?: number | null;
          realized_pnl?: number | null;
          shares?: number | null;
          unrealized_pnl?: number | null;
          updated_at?: string | null;
          user_id?: string | null;
        };
        Update: {
          aum_percentage?: number | null;
          cost_basis?: number | null;
          current_value?: number | null;
          fund_class?: string | null;
          fund_id?: string | null;
          high_water_mark?: number | null;
          investor_id?: string | null;
          last_transaction_date?: string | null;
          lock_until_date?: string | null;
          mgmt_fees_paid?: number | null;
          perf_fees_paid?: number | null;
          realized_pnl?: number | null;
          shares?: number | null;
          unrealized_pnl?: number | null;
          updated_at?: string | null;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "investor_positions_fund_id_fkey";
            columns: ["fund_id"];
            isOneToOne: false;
            referencedRelation: "funds";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "investor_positions_investor_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "investor_directory";
            referencedColumns: ["investor_id"];
          },
          {
            foreignKeyName: "investor_positions_investor_id_fkey";
            columns: ["investor_id"];
            isOneToOne: false;
            referencedRelation: "investor_directory";
            referencedColumns: ["investor_id"];
          },
          {
            foreignKeyName: "investor_positions_investor_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "investors";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "investor_positions_investor_id_fkey";
            columns: ["investor_id"];
            isOneToOne: false;
            referencedRelation: "investors";
            referencedColumns: ["id"];
          },
        ];
      };
      withdrawal_queue: {
        Row: {
          approved_amount: number | null;
          current_position_value: number | null;
          current_shares: number | null;
          expected_withdrawal: number | null;
          fund_class: string | null;
          fund_code: string | null;
          fund_id: string | null;
          fund_name: string | null;
          id: string | null;
          investor_email: string | null;
          investor_id: string | null;
          investor_name: string | null;
          notes: string | null;
          request_date: string | null;
          requested_amount: number | null;
          status: Database["public"]["Enums"]["withdrawal_status"] | null;
          withdrawal_type: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "withdrawal_requests_fund_id_fkey";
            columns: ["fund_id"];
            isOneToOne: false;
            referencedRelation: "funds";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "withdrawal_requests_investor_id_fkey";
            columns: ["investor_id"];
            isOneToOne: false;
            referencedRelation: "investor_directory";
            referencedColumns: ["investor_id"];
          },
          {
            foreignKeyName: "withdrawal_requests_investor_id_fkey";
            columns: ["investor_id"];
            isOneToOne: false;
            referencedRelation: "investors";
            referencedColumns: ["id"];
          },
        ];
      };
      yield_rates: {
        Row: {
          asset_id: string | null;
          created_at: string | null;
          created_by: string | null;
          daily_yield_percentage: number | null;
          effective_date: string | null;
          id: string | null;
        };
        Relationships: [];
      };
    };
    Functions: {
      add_fund_to_investor: {
        Args: {
          p_fund_id: string;
          p_initial_investment?: number;
          p_investor_id: string;
        };
        Returns: boolean;
      };
      add_investor_email: {
        Args: {
          investor_uuid: string;
          new_email: string;
          set_as_primary?: boolean;
        };
        Returns: string;
      };
      admin_create_transaction: {
        Args: {
          p_amount: number;
          p_description?: string;
          p_fund_id: string;
          p_investor_id: string;
          p_tx_hash?: string;
          p_type: string;
        };
        Returns: Json;
      };
      apply_daily_yield: {
        Args: {
          p_application_date?: string;
          p_asset_code: string;
          p_daily_yield_percentage: number;
        };
        Returns: Json;
      };
      apply_daily_yield_to_fund: {
        Args: {
          p_application_date?: string;
          p_daily_yield_percentage: number;
          p_fund_id: string;
        };
        Returns: Json;
      };
      apply_daily_yield_with_fees: {
        Args: {
          p_application_date?: string;
          p_daily_yield_percentage: number;
          p_fund_id: string;
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
      backfill_historical_positions: {
        Args: { p_end_date?: string; p_start_date?: string };
        Returns: Json;
      };
      calculate_next_run_time: {
        Args: {
          p_current_time?: string;
          p_day_of_month: number;
          p_day_of_week: number;
          p_frequency: Database["public"]["Enums"]["report_schedule_frequency"];
          p_time_of_day: string;
          p_timezone: string;
        };
        Returns: string;
      };
      calculate_positions: {
        Args: { p_portfolio_id: string };
        Returns: {
          asset_id: string;
          last_price_usd: number;
          quantity: number;
          value_usd: number;
        }[];
      };
      can_access_notification: {
        Args: { notification_id: string };
        Returns: boolean;
      };
      can_access_user: { Args: { user_uuid: string }; Returns: boolean };
      can_withdraw: {
        Args: { p_amount: number; p_fund_id: string; p_investor_id: string };
        Returns: Json;
      };
      cancel_withdrawal_by_admin: {
        Args: { p_admin_notes?: string; p_reason: string; p_request_id: string };
        Returns: boolean;
      };
      check_is_admin: { Args: { user_id: string }; Returns: boolean };
      check_portfolio_access: {
        Args: { p_portfolio_id: string; p_user_id: string };
        Returns: boolean;
      };
      cleanup_expired_reports: {
        Args: { p_retention_days?: number };
        Returns: {
          deleted_count: number;
          storage_paths: string[];
        }[];
      };
      complete_withdrawal: {
        Args: {
          p_admin_notes?: string;
          p_request_id: string;
          p_tx_hash?: string;
        };
        Returns: boolean;
      };
      create_daily_aum_entry: {
        Args: { p_entry_date?: string; p_fund_id?: string };
        Returns: Json;
      };
      create_investor_profile: {
        Args: {
          p_email: string;
          p_first_name: string;
          p_last_name: string;
          p_phone?: string;
          p_send_invite?: boolean;
        };
        Returns: Json;
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
      create_withdrawal_request_secure: {
        Args: {
          p_amount: number;
          p_fund_id: string;
          p_investor_id: string;
          p_notes?: string;
          p_type?: string;
        };
        Returns: string;
      };
      create_withdrawal_request_v2: {
        Args: {
          p_amount: number;
          p_fund_id: string;
          p_investor_id: string;
          p_notes?: string;
          p_type?: string;
        };
        Returns: string;
      };
      decrypt_totp_secret: {
        Args: { encrypted_secret: string };
        Returns: string;
      };
      distribute_monthly_yield: {
        Args: {
          p_admin_id: string;
          p_fund_id: string;
          p_new_aum: number;
          p_report_month: string;
        };
        Returns: Json;
      };
      encrypt_totp_secret: { Args: { secret_text: string }; Returns: string };
      ensure_admin: { Args: never; Returns: undefined };
      finalize_statement_period: {
        Args: {
          p_investor_id: string;
          p_period_end: string;
          p_statement_data?: Json;
        };
        Returns: Json;
      };
      fund_period_return: {
        Args: { d1: string; d2: string; f: string; net?: boolean };
        Returns: number;
      };
      generate_document_path: {
        Args: { document_type: string; filename: string; user_id: string };
        Returns: string;
      };
      generate_historical_statements: { Args: never; Returns: Json };
      generate_monthly_report_template: {
        Args: { p_investor_id?: string; p_month?: string };
        Returns: Json;
      };
      generate_statement_data: {
        Args: {
          p_investor_id: string;
          p_period_month: number;
          p_period_year: number;
        };
        Returns: Json;
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
      get_24h_interest: {
        Args: never;
        Returns: {
          interest: number;
        }[];
      };
      get_admin_name: { Args: { admin_id: string }; Returns: string };
      get_all_investors_with_details: {
        Args: never;
        Returns: {
          aml_status: string;
          created_at: string;
          email: string;
          first_name: string;
          id: string;
          investor_status: string;
          kyc_status: string;
          last_name: string;
          phone: string;
          status: string;
        }[];
      };
      get_all_investors_with_summary: {
        Args: never;
        Returns: {
          email: string;
          first_name: string;
          id: string;
          last_name: string;
          last_statement_date: string;
          total_aum: number;
        }[];
      };
      get_all_non_admin_profiles: {
        Args: never;
        Returns: {
          created_at: string;
          email: string;
          fee_percentage: number;
          first_name: string;
          id: string;
          last_name: string;
        }[];
      };
      get_fund_net_flows: {
        Args: { p_end_date: string; p_fund_id: string; p_start_date: string };
        Returns: {
          total_deposits: number;
          total_withdrawals: number;
        }[];
      };
      get_historical_position_data: {
        Args: {
          p_asset_code?: string;
          p_end_date?: string;
          p_start_date?: string;
          p_user_id?: string;
        };
        Returns: {
          asset_code: string;
          balance: number;
          balance_date: string;
          email: string;
          first_name: string;
          last_name: string;
          principal: number;
          user_id: string;
          yield_earned: number;
        }[];
      };
      get_investor_count: {
        Args: never;
        Returns: {
          count: number;
        }[];
      };
      get_investor_emails: {
        Args: { investor_uuid: string };
        Returns: {
          created_at: string;
          email: string;
          is_primary: boolean;
          verified: boolean;
        }[];
      };
      get_investor_period_summary: {
        Args: {
          p_as_of_date?: string;
          p_asset_code: string;
          p_investor_id: string;
        };
        Returns: Json;
      };
      get_investor_portfolio_summary: {
        Args: { p_investor_id: string };
        Returns: {
          last_statement_date: string;
          portfolio_count: number;
          total_aum: number;
        }[];
      };
      get_investor_positions_by_class: {
        Args: { p_investor_id: string };
        Returns: {
          allocation_pct: number;
          fund_class: string;
          total_pnl: number;
          total_value: number;
        }[];
      };
      get_pending_withdrawals: {
        Args: never;
        Returns: {
          count: number;
        }[];
      };
      get_primary_email: { Args: { investor_uuid: string }; Returns: string };
      get_profile_basic: {
        Args: { user_id: string };
        Returns: {
          first_name: string;
          last_name: string;
        }[];
      };
      get_profile_by_id: {
        Args: { profile_id: string };
        Returns: {
          created_at: string;
          email: string;
          fee_percentage: number;
          first_name: string;
          id: string;
          is_admin: boolean;
          last_name: string;
        }[];
      };
      get_report_statistics: {
        Args: { p_days_back?: number; p_user_id: string };
        Returns: {
          avg_processing_ms: number;
          completed_count: number;
          failed_count: number;
          report_type: string;
          total_count: number;
        }[];
      };
      get_security_headers: { Args: never; Returns: Json };
      get_statement_period_summary: {
        Args: {
          p_end_date: string;
          p_investor_id: string;
          p_start_date: string;
        };
        Returns: Json;
      };
      get_total_aum: {
        Args: never;
        Returns: {
          total_aum: number;
        }[];
      };
      get_user_admin_status: { Args: { user_id: string }; Returns: boolean };
      get_user_portfolio_summary: {
        Args: { p_user_id: string };
        Returns: {
          last_statement_date: string;
          portfolio_count: number;
          total_aum: number;
        }[];
      };
      get_user_reports:
        | {
            Args: {
              p_limit?: number;
              p_offset?: number;
              p_report_type?: Database["public"]["Enums"]["report_type"];
              p_status?: Database["public"]["Enums"]["report_status"];
              p_user_id: string;
            };
            Returns: {
              created_at: string;
              date_range_end: string;
              date_range_start: string;
              download_count: number;
              download_url: string;
              download_url_expires_at: string;
              file_size_bytes: number;
              format: Database["public"]["Enums"]["report_format"];
              id: string;
              processing_completed_at: string;
              report_type: Database["public"]["Enums"]["report_type"];
              status: Database["public"]["Enums"]["report_status"];
              storage_path: string;
            }[];
          }
        | {
            Args: {
              p_limit?: number;
              p_offset?: number;
              p_report_type?: string;
              p_status?: string;
              p_user_id: string;
            };
            Returns: {
              created_at: string | null;
              date_range_end: string | null;
              date_range_start: string | null;
              download_count: number | null;
              download_url: string | null;
              download_url_expires_at: string | null;
              error_details: Json | null;
              error_message: string | null;
              file_size_bytes: number | null;
              filters: Json | null;
              format: string;
              generated_by_user_id: string | null;
              generated_for_user_id: string | null;
              id: string;
              page_count: number | null;
              parameters: Json | null;
              processing_completed_at: string | null;
              processing_duration_ms: number | null;
              processing_started_at: string | null;
              report_definition_id: string | null;
              report_type: string;
              schedule_id: string | null;
              status: string | null;
              storage_path: string | null;
              updated_at: string | null;
            }[];
            SetofOptions: {
              from: "*";
              to: "generated_reports";
              isOneToOne: false;
              isSetofReturn: true;
            };
          };
      has_portfolio_access: {
        Args: { p_portfolio_id: string };
        Returns: boolean;
      };
      is_2fa_required: { Args: { p_user_id: string }; Returns: boolean };
      is_admin: { Args: never; Returns: boolean };
      is_admin_safe: { Args: never; Returns: boolean };
      is_admin_secure: { Args: never; Returns: boolean };
      is_admin_v2: { Args: never; Returns: boolean };
      is_valid_share_token: { Args: { token_value: string }; Returns: boolean };
      is_within_edit_window: {
        Args: { p_created_at: string };
        Returns: boolean;
      };
      log_access_event: {
        Args: {
          p_event: string;
          p_failure_reason?: string;
          p_ip_address?: unknown;
          p_metadata?: Json;
          p_success?: boolean;
          p_user_agent?: string;
          p_user_id: string;
        };
        Returns: string;
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
      log_security_event: {
        Args: { details?: Json; event_type: string; user_id_param?: string };
        Returns: undefined;
      };
      log_withdrawal_action: {
        Args: {
          p_action: Database["public"]["Enums"]["withdrawal_action"];
          p_details?: Json;
          p_request_id: string;
        };
        Returns: undefined;
      };
      migrate_legacy_positions: { Args: never; Returns: Json };
      migrate_legacy_positions_temp: { Args: never; Returns: Json };
      migrate_legacy_to_new_system: { Args: never; Returns: Json };
      populate_yield_sources: { Args: never; Returns: Json };
      populate_yield_sources_simple: { Args: never; Returns: Json };
      populate_yield_sources_temp: { Args: never; Returns: Json };
      recalculate_aum_percentages: {
        Args: { p_asset_code: string };
        Returns: boolean;
      };
      reject_withdrawal:
        | {
            Args: {
              p_admin_notes?: string;
              p_reason: string;
              p_request_id: string;
            };
            Returns: boolean;
          }
        | {
            Args: { p_reason?: string; p_request_id: string };
            Returns: boolean;
          };
      remove_investor_email: {
        Args: { email_to_remove: string; investor_uuid: string };
        Returns: boolean;
      };
      send_daily_rate_notifications: {
        Args: {
          p_btc_rate: number;
          p_eth_rate: number;
          p_eurc_rate: number;
          p_notes?: string;
          p_rate_date: string;
          p_sol_rate: number;
          p_usdc_rate: number;
          p_usdt_rate: number;
        };
        Returns: {
          notification_ids: string[];
          notifications_sent: number;
        }[];
      };
      set_fund_daily_aum: {
        Args: { p_aum_amount: number; p_aum_date?: string; p_fund_id: string };
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
      test_profiles_access: {
        Args: never;
        Returns: {
          details: string;
          result: boolean;
          test_name: string;
        }[];
      };
      update_fund_aum_baseline: {
        Args: { p_admin_id: string; p_fund_id: string; p_new_aum: number };
        Returns: Json;
      };
      update_investor_aum_percentages: {
        Args: { p_fund_id: string; p_total_aum?: number };
        Returns: boolean;
      };
      update_user_profile_secure: {
        Args: {
          p_first_name?: string;
          p_last_name?: string;
          p_phone?: string;
          p_status?: string;
          p_user_id: string;
        };
        Returns: Json;
      };
      validate_investment_integrity: {
        Args: never;
        Returns: {
          check_name: string;
          details: string;
          status: string;
        }[];
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
      asset_code: "BTC" | "ETH" | "SOL" | "USDT" | "USDC" | "EURC";
      benchmark_type: "BTC" | "ETH" | "STABLE" | "CUSTOM";
      document_type: "statement" | "notice" | "terms" | "tax" | "other";
      fee_kind: "mgmt" | "perf";
      fund_status: "active" | "inactive" | "suspended";
      notification_priority: "low" | "medium" | "high";
      notification_type:
        | "deposit"
        | "statement"
        | "performance"
        | "system"
        | "support"
        | "daily_rate";
      report_format: "pdf" | "excel" | "csv" | "json";
      report_schedule_frequency: "daily" | "weekly" | "monthly" | "quarterly" | "yearly";
      report_status: "queued" | "processing" | "completed" | "failed" | "cancelled";
      report_type:
        | "portfolio_performance"
        | "transaction_history"
        | "tax_report"
        | "monthly_statement"
        | "annual_summary"
        | "custom_date_range"
        | "aum_report"
        | "investor_activity"
        | "transaction_volume"
        | "compliance_report"
        | "fund_performance"
        | "fee_analysis"
        | "audit_trail";
      share_scope: "portfolio" | "documents" | "statement";
      ticket_category: "account" | "portfolio" | "statement" | "technical" | "general";
      ticket_priority: "low" | "medium" | "high" | "urgent";
      ticket_status: "open" | "in_progress" | "waiting_on_lp" | "closed";
      transaction_status: "pending" | "confirmed" | "failed" | "cancelled";
      transaction_type: "DEPOSIT" | "WITHDRAWAL" | "INTEREST" | "FEE";
      tx_type: "DEPOSIT" | "WITHDRAWAL" | "INTEREST" | "FEE" | "ADJUSTMENT";
      withdrawal_action:
        | "create"
        | "approve"
        | "reject"
        | "processing"
        | "complete"
        | "cancel"
        | "update";
      withdrawal_status:
        | "pending"
        | "approved"
        | "processing"
        | "completed"
        | "rejected"
        | "cancelled";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  storage: {
    Tables: {
      buckets: {
        Row: {
          allowed_mime_types: string[] | null;
          avif_autodetection: boolean | null;
          created_at: string | null;
          file_size_limit: number | null;
          id: string;
          name: string;
          owner: string | null;
          owner_id: string | null;
          public: boolean | null;
          type: Database["storage"]["Enums"]["buckettype"];
          updated_at: string | null;
        };
        Insert: {
          allowed_mime_types?: string[] | null;
          avif_autodetection?: boolean | null;
          created_at?: string | null;
          file_size_limit?: number | null;
          id: string;
          name: string;
          owner?: string | null;
          owner_id?: string | null;
          public?: boolean | null;
          type?: Database["storage"]["Enums"]["buckettype"];
          updated_at?: string | null;
        };
        Update: {
          allowed_mime_types?: string[] | null;
          avif_autodetection?: boolean | null;
          created_at?: string | null;
          file_size_limit?: number | null;
          id?: string;
          name?: string;
          owner?: string | null;
          owner_id?: string | null;
          public?: boolean | null;
          type?: Database["storage"]["Enums"]["buckettype"];
          updated_at?: string | null;
        };
        Relationships: [];
      };
      buckets_analytics: {
        Row: {
          created_at: string;
          deleted_at: string | null;
          format: string;
          id: string;
          name: string;
          type: Database["storage"]["Enums"]["buckettype"];
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          deleted_at?: string | null;
          format?: string;
          id?: string;
          name: string;
          type?: Database["storage"]["Enums"]["buckettype"];
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          deleted_at?: string | null;
          format?: string;
          id?: string;
          name?: string;
          type?: Database["storage"]["Enums"]["buckettype"];
          updated_at?: string;
        };
        Relationships: [];
      };
      buckets_vectors: {
        Row: {
          created_at: string;
          id: string;
          type: Database["storage"]["Enums"]["buckettype"];
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          id: string;
          type?: Database["storage"]["Enums"]["buckettype"];
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          type?: Database["storage"]["Enums"]["buckettype"];
          updated_at?: string;
        };
        Relationships: [];
      };
      migrations: {
        Row: {
          executed_at: string | null;
          hash: string;
          id: number;
          name: string;
        };
        Insert: {
          executed_at?: string | null;
          hash: string;
          id: number;
          name: string;
        };
        Update: {
          executed_at?: string | null;
          hash?: string;
          id?: number;
          name?: string;
        };
        Relationships: [];
      };
      objects: {
        Row: {
          bucket_id: string | null;
          created_at: string | null;
          id: string;
          last_accessed_at: string | null;
          level: number | null;
          metadata: Json | null;
          name: string | null;
          owner: string | null;
          owner_id: string | null;
          path_tokens: string[] | null;
          updated_at: string | null;
          user_metadata: Json | null;
          version: string | null;
        };
        Insert: {
          bucket_id?: string | null;
          created_at?: string | null;
          id?: string;
          last_accessed_at?: string | null;
          level?: number | null;
          metadata?: Json | null;
          name?: string | null;
          owner?: string | null;
          owner_id?: string | null;
          path_tokens?: string[] | null;
          updated_at?: string | null;
          user_metadata?: Json | null;
          version?: string | null;
        };
        Update: {
          bucket_id?: string | null;
          created_at?: string | null;
          id?: string;
          last_accessed_at?: string | null;
          level?: number | null;
          metadata?: Json | null;
          name?: string | null;
          owner?: string | null;
          owner_id?: string | null;
          path_tokens?: string[] | null;
          updated_at?: string | null;
          user_metadata?: Json | null;
          version?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "objects_bucketId_fkey";
            columns: ["bucket_id"];
            isOneToOne: false;
            referencedRelation: "buckets";
            referencedColumns: ["id"];
          },
        ];
      };
      prefixes: {
        Row: {
          bucket_id: string;
          created_at: string | null;
          level: number;
          name: string;
          updated_at: string | null;
        };
        Insert: {
          bucket_id: string;
          created_at?: string | null;
          level?: number;
          name: string;
          updated_at?: string | null;
        };
        Update: {
          bucket_id?: string;
          created_at?: string | null;
          level?: number;
          name?: string;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "prefixes_bucketId_fkey";
            columns: ["bucket_id"];
            isOneToOne: false;
            referencedRelation: "buckets";
            referencedColumns: ["id"];
          },
        ];
      };
      s3_multipart_uploads: {
        Row: {
          bucket_id: string;
          created_at: string;
          id: string;
          in_progress_size: number;
          key: string;
          owner_id: string | null;
          upload_signature: string;
          user_metadata: Json | null;
          version: string;
        };
        Insert: {
          bucket_id: string;
          created_at?: string;
          id: string;
          in_progress_size?: number;
          key: string;
          owner_id?: string | null;
          upload_signature: string;
          user_metadata?: Json | null;
          version: string;
        };
        Update: {
          bucket_id?: string;
          created_at?: string;
          id?: string;
          in_progress_size?: number;
          key?: string;
          owner_id?: string | null;
          upload_signature?: string;
          user_metadata?: Json | null;
          version?: string;
        };
        Relationships: [
          {
            foreignKeyName: "s3_multipart_uploads_bucket_id_fkey";
            columns: ["bucket_id"];
            isOneToOne: false;
            referencedRelation: "buckets";
            referencedColumns: ["id"];
          },
        ];
      };
      s3_multipart_uploads_parts: {
        Row: {
          bucket_id: string;
          created_at: string;
          etag: string;
          id: string;
          key: string;
          owner_id: string | null;
          part_number: number;
          size: number;
          upload_id: string;
          version: string;
        };
        Insert: {
          bucket_id: string;
          created_at?: string;
          etag: string;
          id?: string;
          key: string;
          owner_id?: string | null;
          part_number: number;
          size?: number;
          upload_id: string;
          version: string;
        };
        Update: {
          bucket_id?: string;
          created_at?: string;
          etag?: string;
          id?: string;
          key?: string;
          owner_id?: string | null;
          part_number?: number;
          size?: number;
          upload_id?: string;
          version?: string;
        };
        Relationships: [
          {
            foreignKeyName: "s3_multipart_uploads_parts_bucket_id_fkey";
            columns: ["bucket_id"];
            isOneToOne: false;
            referencedRelation: "buckets";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "s3_multipart_uploads_parts_upload_id_fkey";
            columns: ["upload_id"];
            isOneToOne: false;
            referencedRelation: "s3_multipart_uploads";
            referencedColumns: ["id"];
          },
        ];
      };
      vector_indexes: {
        Row: {
          bucket_id: string;
          created_at: string;
          data_type: string;
          dimension: number;
          distance_metric: string;
          id: string;
          metadata_configuration: Json | null;
          name: string;
          updated_at: string;
        };
        Insert: {
          bucket_id: string;
          created_at?: string;
          data_type: string;
          dimension: number;
          distance_metric: string;
          id?: string;
          metadata_configuration?: Json | null;
          name: string;
          updated_at?: string;
        };
        Update: {
          bucket_id?: string;
          created_at?: string;
          data_type?: string;
          dimension?: number;
          distance_metric?: string;
          id?: string;
          metadata_configuration?: Json | null;
          name?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "vector_indexes_bucket_id_fkey";
            columns: ["bucket_id"];
            isOneToOne: false;
            referencedRelation: "buckets_vectors";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      add_prefixes: {
        Args: { _bucket_id: string; _name: string };
        Returns: undefined;
      };
      can_insert_object: {
        Args: { bucketid: string; metadata: Json; name: string; owner: string };
        Returns: undefined;
      };
      delete_leaf_prefixes: {
        Args: { bucket_ids: string[]; names: string[] };
        Returns: undefined;
      };
      delete_prefix: {
        Args: { _bucket_id: string; _name: string };
        Returns: boolean;
      };
      extension: { Args: { name: string }; Returns: string };
      filename: { Args: { name: string }; Returns: string };
      foldername: { Args: { name: string }; Returns: string[] };
      get_level: { Args: { name: string }; Returns: number };
      get_prefix: { Args: { name: string }; Returns: string };
      get_prefixes: { Args: { name: string }; Returns: string[] };
      get_size_by_bucket: {
        Args: never;
        Returns: {
          bucket_id: string;
          size: number;
        }[];
      };
      list_multipart_uploads_with_delimiter: {
        Args: {
          bucket_id: string;
          delimiter_param: string;
          max_keys?: number;
          next_key_token?: string;
          next_upload_token?: string;
          prefix_param: string;
        };
        Returns: {
          created_at: string;
          id: string;
          key: string;
        }[];
      };
      list_objects_with_delimiter: {
        Args: {
          bucket_id: string;
          delimiter_param: string;
          max_keys?: number;
          next_token?: string;
          prefix_param: string;
          start_after?: string;
        };
        Returns: {
          id: string;
          metadata: Json;
          name: string;
          updated_at: string;
        }[];
      };
      lock_top_prefixes: {
        Args: { bucket_ids: string[]; names: string[] };
        Returns: undefined;
      };
      operation: { Args: never; Returns: string };
      search: {
        Args: {
          bucketname: string;
          levels?: number;
          limits?: number;
          offsets?: number;
          prefix: string;
          search?: string;
          sortcolumn?: string;
          sortorder?: string;
        };
        Returns: {
          created_at: string;
          id: string;
          last_accessed_at: string;
          metadata: Json;
          name: string;
          updated_at: string;
        }[];
      };
      search_legacy_v1: {
        Args: {
          bucketname: string;
          levels?: number;
          limits?: number;
          offsets?: number;
          prefix: string;
          search?: string;
          sortcolumn?: string;
          sortorder?: string;
        };
        Returns: {
          created_at: string;
          id: string;
          last_accessed_at: string;
          metadata: Json;
          name: string;
          updated_at: string;
        }[];
      };
      search_v1_optimised: {
        Args: {
          bucketname: string;
          levels?: number;
          limits?: number;
          offsets?: number;
          prefix: string;
          search?: string;
          sortcolumn?: string;
          sortorder?: string;
        };
        Returns: {
          created_at: string;
          id: string;
          last_accessed_at: string;
          metadata: Json;
          name: string;
          updated_at: string;
        }[];
      };
      search_v2: {
        Args: {
          bucket_name: string;
          levels?: number;
          limits?: number;
          prefix: string;
          sort_column?: string;
          sort_column_after?: string;
          sort_order?: string;
          start_after?: string;
        };
        Returns: {
          created_at: string;
          id: string;
          key: string;
          last_accessed_at: string;
          metadata: Json;
          name: string;
          updated_at: string;
        }[];
      };
    };
    Enums: {
      buckettype: "STANDARD" | "ANALYTICS" | "VECTOR";
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
  graphql_public: {
    Enums: {},
  },
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
      notification_type: ["deposit", "statement", "performance", "system", "support", "daily_rate"],
      report_format: ["pdf", "excel", "csv", "json"],
      report_schedule_frequency: ["daily", "weekly", "monthly", "quarterly", "yearly"],
      report_status: ["queued", "processing", "completed", "failed", "cancelled"],
      report_type: [
        "portfolio_performance",
        "transaction_history",
        "tax_report",
        "monthly_statement",
        "annual_summary",
        "custom_date_range",
        "aum_report",
        "investor_activity",
        "transaction_volume",
        "compliance_report",
        "fund_performance",
        "fee_analysis",
        "audit_trail",
      ],
      share_scope: ["portfolio", "documents", "statement"],
      ticket_category: ["account", "portfolio", "statement", "technical", "general"],
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
  storage: {
    Enums: {
      buckettype: ["STANDARD", "ANALYTICS", "VECTOR"],
    },
  },
} as const;
