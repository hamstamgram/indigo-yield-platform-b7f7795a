export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
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
      admin_invites: {
        Row: {
          created_at: string | null;
          email: string;
          expires_at: string;
          id: string;
          invite_code: string;
          used: boolean | null;
        };
        Insert: {
          created_at?: string | null;
          email: string;
          expires_at: string;
          id?: string;
          invite_code: string;
          used?: boolean | null;
        };
        Update: {
          created_at?: string | null;
          email?: string;
          expires_at?: string;
          id?: string;
          invite_code?: string;
          used?: boolean | null;
        };
        Relationships: [];
      };
      audit_log: {
        Row: {
          action: string;
          actor_user: string | null;
          created_at: string | null;
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
          created_at?: string | null;
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
          created_at?: string | null;
          entity?: string;
          entity_id?: string | null;
          id?: string;
          meta?: Json | null;
          new_values?: Json | null;
          old_values?: Json | null;
        };
        Relationships: [
          {
            foreignKeyName: "audit_log_actor_user_fkey";
            columns: ["actor_user"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      fee_allocations: {
        Row: {
          base_net_income: number | null;
          created_at: string | null;
          created_by: string | null;
          credit_transaction_id: string | null;
          distribution_id: string | null;
          fee_amount: number | null;
          fee_percentage: number | null;
          fees_account_id: string | null;
          fund_id: string | null;
          id: string;
          investor_id: string | null;
          is_voided: boolean | null;
          period_end: string | null;
          period_start: string | null;
          purpose: Database["public"]["Enums"]["aum_purpose"] | null;
        };
        Insert: {
          base_net_income?: number | null;
          created_at?: string | null;
          created_by?: string | null;
          credit_transaction_id?: string | null;
          distribution_id?: string | null;
          fee_amount?: number | null;
          fee_percentage?: number | null;
          fees_account_id?: string | null;
          fund_id?: string | null;
          id?: string;
          investor_id?: string | null;
          is_voided?: boolean | null;
          period_end?: string | null;
          period_start?: string | null;
          purpose?: Database["public"]["Enums"]["aum_purpose"] | null;
        };
        Update: {
          base_net_income?: number | null;
          created_at?: string | null;
          created_by?: string | null;
          credit_transaction_id?: string | null;
          distribution_id?: string | null;
          fee_amount?: number | null;
          fee_percentage?: number | null;
          fees_account_id?: string | null;
          fund_id?: string | null;
          id?: string;
          investor_id?: string | null;
          is_voided?: boolean | null;
          period_end?: string | null;
          period_start?: string | null;
          purpose?: Database["public"]["Enums"]["aum_purpose"] | null;
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
            foreignKeyName: "fee_allocations_distribution_id_fkey";
            columns: ["distribution_id"];
            isOneToOne: false;
            referencedRelation: "yield_distributions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "fee_allocations_fees_account_id_fkey";
            columns: ["fees_account_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "fee_allocations_fund_id_fkey";
            columns: ["fund_id"];
            isOneToOne: false;
            referencedRelation: "funds";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "fee_allocations_investor_id_fkey";
            columns: ["investor_id"];
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
          fund_id: string | null;
          gross_yield: number | null;
          id: string;
          investor_count: number | null;
          is_month_end: boolean | null;
          is_voided: boolean | null;
          net_yield: number | null;
          purpose: Database["public"]["Enums"]["aum_purpose"] | null;
          source: string | null;
          status: string | null;
          total_aum: number | null;
          updated_at: string | null;
          yield_percentage: number | null;
        };
        Insert: {
          as_of_date?: string | null;
          aum_date: string;
          created_at?: string | null;
          created_by?: string | null;
          fund_id?: string | null;
          gross_yield?: number | null;
          id?: string;
          investor_count?: number | null;
          is_month_end?: boolean | null;
          is_voided?: boolean | null;
          net_yield?: number | null;
          purpose?: Database["public"]["Enums"]["aum_purpose"] | null;
          source?: string | null;
          status?: string | null;
          total_aum?: number | null;
          updated_at?: string | null;
          yield_percentage?: number | null;
        };
        Update: {
          as_of_date?: string | null;
          aum_date?: string;
          created_at?: string | null;
          created_by?: string | null;
          fund_id?: string | null;
          gross_yield?: number | null;
          id?: string;
          investor_count?: number | null;
          is_month_end?: boolean | null;
          is_voided?: boolean | null;
          net_yield?: number | null;
          purpose?: Database["public"]["Enums"]["aum_purpose"] | null;
          source?: string | null;
          status?: string | null;
          total_aum?: number | null;
          updated_at?: string | null;
          yield_percentage?: number | null;
        };
        Relationships: [
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
            referencedRelation: "funds";
            referencedColumns: ["id"];
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
          inception_date: string | null;
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
          total_aum: number | null;
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
          inception_date?: string | null;
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
          total_aum?: number | null;
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
          inception_date?: string | null;
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
          total_aum?: number | null;
          updated_at?: string | null;
        };
        Relationships: [];
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
          is_voided: boolean | null;
          paid_at: string | null;
          paid_by: string | null;
          payout_status: string | null;
          period_end: string | null;
          period_start: string | null;
          purpose: Database["public"]["Enums"]["aum_purpose"] | null;
          source: string | null;
          source_investor_id: string;
          source_net_income: number;
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
          is_voided?: boolean | null;
          paid_at?: string | null;
          paid_by?: string | null;
          payout_status?: string | null;
          period_end?: string | null;
          period_start?: string | null;
          purpose?: Database["public"]["Enums"]["aum_purpose"] | null;
          source?: string | null;
          source_investor_id: string;
          source_net_income: number;
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
          is_voided?: boolean | null;
          paid_at?: string | null;
          paid_by?: string | null;
          payout_status?: string | null;
          period_end?: string | null;
          period_start?: string | null;
          purpose?: Database["public"]["Enums"]["aum_purpose"] | null;
          source?: string | null;
          source_investor_id?: string;
          source_net_income?: number;
        };
        Relationships: [
          {
            foreignKeyName: "ib_allocations_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ib_allocations_distribution_id_fkey";
            columns: ["distribution_id"];
            isOneToOne: false;
            referencedRelation: "yield_distributions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ib_allocations_fund_id_fkey";
            columns: ["fund_id"];
            isOneToOne: false;
            referencedRelation: "funds";
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
            foreignKeyName: "ib_allocations_paid_by_fkey";
            columns: ["paid_by"];
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
            referencedRelation: "funds";
            referencedColumns: ["id"];
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
            referencedRelation: "yield_distributions";
            referencedColumns: ["id"];
          },
        ];
      };
      investor_fee_schedule: {
        Row: {
          created_at: string | null;
          effective_date: string;
          end_date: string | null;
          fee_pct: number;
          fund_id: string | null;
          ib_pct: number | null;
          id: string;
          investor_id: string;
        };
        Insert: {
          created_at?: string | null;
          effective_date: string;
          end_date?: string | null;
          fee_pct: number;
          fund_id?: string | null;
          ib_pct?: number | null;
          id?: string;
          investor_id: string;
        };
        Update: {
          created_at?: string | null;
          effective_date?: string;
          end_date?: string | null;
          fee_pct?: number;
          fund_id?: string | null;
          ib_pct?: number | null;
          id?: string;
          investor_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "investor_fee_schedule_fund_id_fkey";
            columns: ["fund_id"];
            isOneToOne: false;
            referencedRelation: "funds";
            referencedColumns: ["id"];
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
      investor_positions: {
        Row: {
          cost_basis: number | null;
          cumulative_yield_earned: number | null;
          current_value: number | null;
          fund_class: string | null;
          fund_id: string;
          investor_id: string;
          is_active: boolean | null;
          last_transaction_date: string | null;
          last_yield_crystallization_date: string | null;
          lock_until_date: string | null;
          mgmt_fees_paid: number | null;
          perf_fees_paid: number | null;
          realized_pnl: number | null;
          shares: number | null;
          unrealized_pnl: number | null;
          updated_at: string | null;
        };
        Insert: {
          cost_basis?: number | null;
          cumulative_yield_earned?: number | null;
          current_value?: number | null;
          fund_class?: string | null;
          fund_id: string;
          investor_id: string;
          is_active?: boolean | null;
          last_transaction_date?: string | null;
          last_yield_crystallization_date?: string | null;
          lock_until_date?: string | null;
          mgmt_fees_paid?: number | null;
          perf_fees_paid?: number | null;
          realized_pnl?: number | null;
          shares?: number | null;
          unrealized_pnl?: number | null;
          updated_at?: string | null;
        };
        Update: {
          cost_basis?: number | null;
          cumulative_yield_earned?: number | null;
          current_value?: number | null;
          fund_class?: string | null;
          fund_id?: string;
          investor_id?: string;
          is_active?: boolean | null;
          last_transaction_date?: string | null;
          last_yield_crystallization_date?: string | null;
          lock_until_date?: string | null;
          mgmt_fees_paid?: number | null;
          perf_fees_paid?: number | null;
          realized_pnl?: number | null;
          shares?: number | null;
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
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      investor_yield_events: {
        Row: {
          created_at: string;
          days_in_period: number;
          event_date: string;
          fee_amount: number | null;
          fee_pct: number | null;
          fund_aum_after: number;
          fund_aum_before: number;
          fund_id: string;
          fund_yield_pct: number;
          gross_yield_amount: number;
          id: string;
          investor_balance: number;
          investor_id: string;
          investor_share_pct: number;
          is_voided: boolean;
          net_yield_amount: number;
          period_end: string;
          period_start: string;
          reference_id: string;
          trigger_transaction_id: string | null;
          trigger_type: string;
          visibility_scope: Database["public"]["Enums"]["visibility_scope"];
        };
        Insert: {
          created_at?: string;
          days_in_period: number;
          event_date: string;
          fee_amount?: number | null;
          fee_pct?: number | null;
          fund_aum_after: number;
          fund_aum_before: number;
          fund_id: string;
          fund_yield_pct: number;
          gross_yield_amount: number;
          id?: string;
          investor_balance: number;
          investor_id: string;
          investor_share_pct: number;
          is_voided?: boolean;
          net_yield_amount: number;
          period_end: string;
          period_start: string;
          reference_id: string;
          trigger_transaction_id?: string | null;
          trigger_type: string;
          visibility_scope?: Database["public"]["Enums"]["visibility_scope"];
        };
        Update: {
          created_at?: string;
          days_in_period?: number;
          event_date?: string;
          fee_amount?: number | null;
          fee_pct?: number | null;
          fund_aum_after?: number;
          fund_aum_before?: number;
          fund_id?: string;
          fund_yield_pct?: number;
          gross_yield_amount?: number;
          id?: string;
          investor_balance?: number;
          investor_id?: string;
          investor_share_pct?: number;
          is_voided?: boolean;
          net_yield_amount?: number;
          period_end?: string;
          period_start?: string;
          reference_id?: string;
          trigger_transaction_id?: string | null;
          trigger_type?: string;
          visibility_scope?: Database["public"]["Enums"]["visibility_scope"];
        };
        Relationships: [
          {
            foreignKeyName: "investor_yield_events_fund_id_fkey";
            columns: ["fund_id"];
            isOneToOne: false;
            referencedRelation: "funds";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "investor_yield_events_investor_id_fkey";
            columns: ["investor_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "investor_yield_events_trigger_transaction_id_fkey";
            columns: ["trigger_transaction_id"];
            isOneToOne: false;
            referencedRelation: "transactions_v2";
            referencedColumns: ["id"];
          },
        ];
      };
      notifications: {
        Row: {
          body: string | null;
          created_at: string | null;
          data_jsonb: Json | null;
          id: string;
          priority: string | null;
          read_at: string | null;
          title: string | null;
          type: string | null;
          user_id: string | null;
        };
        Insert: {
          body?: string | null;
          created_at?: string | null;
          data_jsonb?: Json | null;
          id?: string;
          priority?: string | null;
          read_at?: string | null;
          title?: string | null;
          type?: string | null;
          user_id?: string | null;
        };
        Update: {
          body?: string | null;
          created_at?: string | null;
          data_jsonb?: Json | null;
          id?: string;
          priority?: string | null;
          read_at?: string | null;
          title?: string | null;
          type?: string | null;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      onboarding_submissions: {
        Row: {
          created_at: string | null;
          id: string;
          investor_id: string | null;
          status: string | null;
          submission_data: Json | null;
        };
        Insert: {
          created_at?: string | null;
          id?: string;
          investor_id?: string | null;
          status?: string | null;
          submission_data?: Json | null;
        };
        Update: {
          created_at?: string | null;
          id?: string;
          investor_id?: string | null;
          status?: string | null;
          submission_data?: Json | null;
        };
        Relationships: [
          {
            foreignKeyName: "onboarding_submissions_investor_id_fkey";
            columns: ["investor_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
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
            referencedRelation: "funds";
            referencedColumns: ["id"];
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
            referencedRelation: "yield_distributions";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          account_type: Database["public"]["Enums"]["account_type"] | null;
          created_at: string | null;
          email: string;
          entity_type: string | null;
          fee_pct: number | null;
          first_name: string | null;
          ib_commission_source: string | null;
          ib_parent_id: string | null;
          ib_percentage: number | null;
          id: string;
          include_in_reporting: boolean | null;
          is_admin: boolean | null;
          is_system_account: boolean | null;
          kyc_status: string | null;
          last_name: string | null;
          onboarding_date: string | null;
          phone: string | null;
          preferences: Json | null;
          role: string | null;
          status: string | null;
          totp_enabled: boolean | null;
          totp_verified: boolean | null;
          updated_at: string | null;
        };
        Insert: {
          account_type?: Database["public"]["Enums"]["account_type"] | null;
          created_at?: string | null;
          email: string;
          entity_type?: string | null;
          fee_pct?: number | null;
          first_name?: string | null;
          ib_commission_source?: string | null;
          ib_parent_id?: string | null;
          ib_percentage?: number | null;
          id: string;
          include_in_reporting?: boolean | null;
          is_admin?: boolean | null;
          is_system_account?: boolean | null;
          kyc_status?: string | null;
          last_name?: string | null;
          onboarding_date?: string | null;
          phone?: string | null;
          preferences?: Json | null;
          role?: string | null;
          status?: string | null;
          totp_enabled?: boolean | null;
          totp_verified?: boolean | null;
          updated_at?: string | null;
        };
        Update: {
          account_type?: Database["public"]["Enums"]["account_type"] | null;
          created_at?: string | null;
          email?: string;
          entity_type?: string | null;
          fee_pct?: number | null;
          first_name?: string | null;
          ib_commission_source?: string | null;
          ib_parent_id?: string | null;
          ib_percentage?: number | null;
          id?: string;
          include_in_reporting?: boolean | null;
          is_admin?: boolean | null;
          is_system_account?: boolean | null;
          kyc_status?: string | null;
          last_name?: string | null;
          onboarding_date?: string | null;
          phone?: string | null;
          preferences?: Json | null;
          role?: string | null;
          status?: string | null;
          totp_enabled?: boolean | null;
          totp_verified?: boolean | null;
          updated_at?: string | null;
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
          id: number;
          run_tag: string;
        };
        Insert: {
          created_at?: string | null;
          entity_id: string;
          entity_label?: string | null;
          entity_type: string;
          id?: number;
          run_tag: string;
        };
        Update: {
          created_at?: string | null;
          entity_id?: string;
          entity_label?: string | null;
          entity_type?: string;
          id?: number;
          run_tag?: string;
        };
        Relationships: [];
      };
      qa_scenario_manifest: {
        Row: {
          depends_on_step: number | null;
          executed: boolean | null;
          executed_at: string | null;
          execution_result: Json | null;
          expected_position_delta: number | null;
          expected_success: boolean;
          id: number;
          invariants_to_check: string[] | null;
          params: Json;
          reference_id: string;
          rpc_name: string;
          run_tag: string | null;
          scenario_category: string;
          scenario_id: string;
          step_number: number;
        };
        Insert: {
          depends_on_step?: number | null;
          executed?: boolean | null;
          executed_at?: string | null;
          execution_result?: Json | null;
          expected_position_delta?: number | null;
          expected_success?: boolean;
          id?: number;
          invariants_to_check?: string[] | null;
          params: Json;
          reference_id: string;
          rpc_name: string;
          run_tag?: string | null;
          scenario_category: string;
          scenario_id: string;
          step_number: number;
        };
        Update: {
          depends_on_step?: number | null;
          executed?: boolean | null;
          executed_at?: string | null;
          execution_result?: Json | null;
          expected_position_delta?: number | null;
          expected_success?: boolean;
          id?: number;
          invariants_to_check?: string[] | null;
          params?: Json;
          reference_id?: string;
          rpc_name?: string;
          run_tag?: string | null;
          scenario_category?: string;
          scenario_id?: string;
          step_number?: number;
        };
        Relationships: [];
      };
      qa_test_results: {
        Row: {
          details: Json | null;
          duration_ms: number | null;
          executed_at: string | null;
          id: number;
          run_tag: string;
          status: string;
          test_category: string;
          test_name: string;
        };
        Insert: {
          details?: Json | null;
          duration_ms?: number | null;
          executed_at?: string | null;
          id?: number;
          run_tag: string;
          status: string;
          test_category: string;
          test_name: string;
        };
        Update: {
          details?: Json | null;
          duration_ms?: number | null;
          executed_at?: string | null;
          id?: number;
          run_tag?: string;
          status?: string;
          test_category?: string;
          test_name?: string;
        };
        Relationships: [];
      };
      statement_periods: {
        Row: {
          created_at: string | null;
          id: string;
          month: number;
          period_end_date: string;
          period_name: string;
          status: string | null;
          updated_at: string | null;
          year: number;
        };
        Insert: {
          created_at?: string | null;
          id?: string;
          month: number;
          period_end_date: string;
          period_name: string;
          status?: string | null;
          updated_at?: string | null;
          year: number;
        };
        Update: {
          created_at?: string | null;
          id?: string;
          month?: number;
          period_end_date?: string;
          period_name?: string;
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
          correction_id: string | null;
          created_at: string | null;
          created_by: string | null;
          fund_class: string | null;
          fund_id: string | null;
          id: string;
          investor_id: string | null;
          is_system_generated: boolean | null;
          is_voided: boolean | null;
          meta: Json | null;
          notes: string | null;
          reference_id: string | null;
          source: Database["public"]["Enums"]["tx_source"] | null;
          transfer_id: string | null;
          tx_date: string;
          tx_hash: string | null;
          tx_subtype: string | null;
          type: Database["public"]["Enums"]["tx_type"];
          value_date: string;
          visibility_scope: Database["public"]["Enums"]["visibility_scope"] | null;
          void_reason: string | null;
          voided_at: string | null;
          voided_by: string | null;
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
          fund_class?: string | null;
          fund_id?: string | null;
          id?: string;
          investor_id?: string | null;
          is_system_generated?: boolean | null;
          is_voided?: boolean | null;
          meta?: Json | null;
          notes?: string | null;
          reference_id?: string | null;
          source?: Database["public"]["Enums"]["tx_source"] | null;
          transfer_id?: string | null;
          tx_date?: string;
          tx_hash?: string | null;
          tx_subtype?: string | null;
          type: Database["public"]["Enums"]["tx_type"];
          value_date?: string;
          visibility_scope?: Database["public"]["Enums"]["visibility_scope"] | null;
          void_reason?: string | null;
          voided_at?: string | null;
          voided_by?: string | null;
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
          fund_class?: string | null;
          fund_id?: string | null;
          id?: string;
          investor_id?: string | null;
          is_system_generated?: boolean | null;
          is_voided?: boolean | null;
          meta?: Json | null;
          notes?: string | null;
          reference_id?: string | null;
          source?: Database["public"]["Enums"]["tx_source"] | null;
          transfer_id?: string | null;
          tx_date?: string;
          tx_hash?: string | null;
          tx_subtype?: string | null;
          type?: Database["public"]["Enums"]["tx_type"];
          value_date?: string;
          visibility_scope?: Database["public"]["Enums"]["visibility_scope"] | null;
          void_reason?: string | null;
          voided_at?: string | null;
          voided_by?: string | null;
        };
        Relationships: [
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
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "transactions_v2_voided_by_fkey";
            columns: ["voided_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      withdrawal_requests: {
        Row: {
          admin_notes: string | null;
          amount: number;
          approved_by: string | null;
          cancelled_by: string | null;
          created_at: string | null;
          fund_id: string | null;
          id: string;
          investor_id: string | null;
          processed_at: string | null;
          rejected_by: string | null;
          rejection_reason: string | null;
          request_date: string | null;
          requested_amount: number | null;
          requested_shares: number | null;
          settlement_date: string | null;
          status: Database["public"]["Enums"]["withdrawal_status"] | null;
          tx_hash: string | null;
          updated_at: string | null;
          version: number | null;
          withdrawal_type: string;
        };
        Insert: {
          admin_notes?: string | null;
          amount: number;
          approved_by?: string | null;
          cancelled_by?: string | null;
          created_at?: string | null;
          fund_id?: string | null;
          id?: string;
          investor_id?: string | null;
          processed_at?: string | null;
          rejected_by?: string | null;
          rejection_reason?: string | null;
          request_date?: string | null;
          requested_amount?: number | null;
          requested_shares?: number | null;
          settlement_date?: string | null;
          status?: Database["public"]["Enums"]["withdrawal_status"] | null;
          tx_hash?: string | null;
          updated_at?: string | null;
          version?: number | null;
          withdrawal_type?: string;
        };
        Update: {
          admin_notes?: string | null;
          amount?: number;
          approved_by?: string | null;
          cancelled_by?: string | null;
          created_at?: string | null;
          fund_id?: string | null;
          id?: string;
          investor_id?: string | null;
          processed_at?: string | null;
          rejected_by?: string | null;
          rejection_reason?: string | null;
          request_date?: string | null;
          requested_amount?: number | null;
          requested_shares?: number | null;
          settlement_date?: string | null;
          status?: Database["public"]["Enums"]["withdrawal_status"] | null;
          tx_hash?: string | null;
          updated_at?: string | null;
          version?: number | null;
          withdrawal_type?: string;
        };
        Relationships: [
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
            referencedRelation: "profiles";
            referencedColumns: ["id"];
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
          created_at: string;
          distribution_id: string;
          fee_amount: number;
          fee_pct: number | null;
          fee_transaction_id: string | null;
          fund_id: string | null;
          gross_amount: number;
          ib_amount: number;
          ib_pct: number | null;
          ib_transaction_id: string | null;
          id: string;
          investor_id: string;
          net_amount: number;
          transaction_id: string | null;
        };
        Insert: {
          adb_share?: number | null;
          created_at?: string;
          distribution_id: string;
          fee_amount?: number;
          fee_pct?: number | null;
          fee_transaction_id?: string | null;
          fund_id?: string | null;
          gross_amount: number;
          ib_amount?: number;
          ib_pct?: number | null;
          ib_transaction_id?: string | null;
          id?: string;
          investor_id: string;
          net_amount: number;
          transaction_id?: string | null;
        };
        Update: {
          adb_share?: number | null;
          created_at?: string;
          distribution_id?: string;
          fee_amount?: number;
          fee_pct?: number | null;
          fee_transaction_id?: string | null;
          fund_id?: string | null;
          gross_amount?: number;
          ib_amount?: number;
          ib_pct?: number | null;
          ib_transaction_id?: string | null;
          id?: string;
          investor_id?: string;
          net_amount?: number;
          transaction_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "yield_allocations_distribution_id_fkey";
            columns: ["distribution_id"];
            isOneToOne: false;
            referencedRelation: "yield_distributions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "yield_allocations_fee_transaction_id_fkey";
            columns: ["fee_transaction_id"];
            isOneToOne: false;
            referencedRelation: "transactions_v2";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "yield_allocations_fund_id_fkey";
            columns: ["fund_id"];
            isOneToOne: false;
            referencedRelation: "funds";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "yield_allocations_ib_transaction_id_fkey";
            columns: ["ib_transaction_id"];
            isOneToOne: false;
            referencedRelation: "transactions_v2";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "yield_allocations_investor_id_fkey";
            columns: ["investor_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "yield_allocations_transaction_id_fkey";
            columns: ["transaction_id"];
            isOneToOne: false;
            referencedRelation: "transactions_v2";
            referencedColumns: ["id"];
          },
        ];
      };
      yield_distributions: {
        Row: {
          allocation_count: number;
          calculation_method: string | null;
          closing_aum: number;
          created_at: string;
          created_by: string | null;
          distribution_type: string | null;
          dust_amount: number;
          effective_date: string | null;
          fund_id: string;
          gross_yield: number;
          gross_yield_amount: number | null;
          id: string;
          investor_count: number;
          is_month_end: boolean | null;
          is_voided: boolean;
          net_yield: number;
          opening_aum: number;
          period_end: string;
          period_start: string;
          previous_aum: number;
          purpose: Database["public"]["Enums"]["aum_purpose"] | null;
          recorded_aum: number;
          reference_id: string | null;
          status: Database["public"]["Enums"]["yield_distribution_status"];
          summary_json: Json | null;
          total_fee_amount: number;
          total_fees: number;
          total_ib: number;
          total_ib_amount: number;
          total_net_amount: number;
          void_reason: string | null;
          voided_at: string | null;
          voided_by: string | null;
          yield_date: string | null;
          yield_percentage: number | null;
        };
        Insert: {
          allocation_count?: number;
          calculation_method?: string | null;
          closing_aum?: number;
          created_at?: string;
          created_by?: string | null;
          distribution_type?: string | null;
          dust_amount?: number;
          effective_date?: string | null;
          fund_id: string;
          gross_yield?: number;
          gross_yield_amount?: number | null;
          id?: string;
          investor_count?: number;
          is_month_end?: boolean | null;
          is_voided?: boolean;
          net_yield?: number;
          opening_aum?: number;
          period_end: string;
          period_start: string;
          previous_aum?: number;
          purpose?: Database["public"]["Enums"]["aum_purpose"] | null;
          recorded_aum?: number;
          reference_id?: string | null;
          status?: Database["public"]["Enums"]["yield_distribution_status"];
          summary_json?: Json | null;
          total_fee_amount?: number;
          total_fees?: number;
          total_ib?: number;
          total_ib_amount?: number;
          total_net_amount?: number;
          void_reason?: string | null;
          voided_at?: string | null;
          voided_by?: string | null;
          yield_date?: string | null;
          yield_percentage?: number | null;
        };
        Update: {
          allocation_count?: number;
          calculation_method?: string | null;
          closing_aum?: number;
          created_at?: string;
          created_by?: string | null;
          distribution_type?: string | null;
          dust_amount?: number;
          effective_date?: string | null;
          fund_id?: string;
          gross_yield?: number;
          gross_yield_amount?: number | null;
          id?: string;
          investor_count?: number;
          is_month_end?: boolean | null;
          is_voided?: boolean;
          net_yield?: number;
          opening_aum?: number;
          period_end?: string;
          period_start?: string;
          previous_aum?: number;
          purpose?: Database["public"]["Enums"]["aum_purpose"] | null;
          recorded_aum?: number;
          reference_id?: string | null;
          status?: Database["public"]["Enums"]["yield_distribution_status"];
          summary_json?: Json | null;
          total_fee_amount?: number;
          total_fees?: number;
          total_ib?: number;
          total_ib_amount?: number;
          total_net_amount?: number;
          void_reason?: string | null;
          voided_at?: string | null;
          voided_by?: string | null;
          yield_date?: string | null;
          yield_percentage?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "yield_distributions_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "yield_distributions_fund_id_fkey";
            columns: ["fund_id"];
            isOneToOne: false;
            referencedRelation: "funds";
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
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      apply_adb_yield_distribution_v3: {
        Args: {
          p_admin_id?: string;
          p_distribution_date?: string;
          p_fund_id: string;
          p_gross_yield_amount: number;
          p_period_end: string;
          p_period_start: string;
          p_purpose?: Database["public"]["Enums"]["aum_purpose"];
        };
        Returns: Json;
      };
      apply_transaction_with_crystallization: {
        Args: {
          p_admin_id?: string;
          p_amount: number;
          p_fund_id: string;
          p_investor_id: string;
          p_new_total_aum?: number;
          p_notes?: string;
          p_purpose?: Database["public"]["Enums"]["aum_purpose"];
          p_reference_id: string;
          p_tx_date: string;
          p_tx_type: string;
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
      is_admin: { Args: never; Returns: boolean };
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
      qa_admin_id: { Args: never; Returns: string };
      qa_fees_account_id: { Args: never; Returns: string };
      qa_fund_id: { Args: { p_asset: string }; Returns: string };
      qa_investor_id: { Args: { p_name: string }; Returns: string };
      qa_seed_world: { Args: { p_run_tag?: string }; Returns: Json };
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
      void_yield_distribution: {
        Args: {
          p_admin_id: string;
          p_distribution_id: string;
          p_reason?: string;
        };
        Returns: Json;
      };
    };
    Enums: {
      account_type: "investor" | "ib" | "fees_account";
      asset_code: "BTC" | "ETH" | "SOL" | "USDT" | "USDC" | "EURC" | "xAUT" | "XRP" | "ADA";
      aum_purpose: "reporting" | "transaction" | "daily" | "monthly" | "quarterly" | "special";
      fund_status: "active" | "inactive" | "suspended" | "deprecated" | "pending";
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
        | "IB_DEBIT";
      visibility_scope: "investor_visible" | "admin_only";
      withdrawal_status:
        | "pending"
        | "approved"
        | "processing"
        | "completed"
        | "rejected"
        | "cancelled";
      yield_distribution_status:
        | "pending"
        | "applied"
        | "voided"
        | "failed"
        | "draft"
        | "previewed"
        | "corrected"
        | "rolled_back";
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
      iceberg_namespaces: {
        Row: {
          bucket_name: string;
          catalog_id: string;
          created_at: string;
          id: string;
          metadata: Json;
          name: string;
          updated_at: string;
        };
        Insert: {
          bucket_name: string;
          catalog_id: string;
          created_at?: string;
          id?: string;
          metadata?: Json;
          name: string;
          updated_at?: string;
        };
        Update: {
          bucket_name?: string;
          catalog_id?: string;
          created_at?: string;
          id?: string;
          metadata?: Json;
          name?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "iceberg_namespaces_catalog_id_fkey";
            columns: ["catalog_id"];
            isOneToOne: false;
            referencedRelation: "buckets_analytics";
            referencedColumns: ["id"];
          },
        ];
      };
      iceberg_tables: {
        Row: {
          bucket_name: string;
          catalog_id: string;
          created_at: string;
          id: string;
          location: string;
          name: string;
          namespace_id: string;
          remote_table_id: string | null;
          shard_id: string | null;
          shard_key: string | null;
          updated_at: string;
        };
        Insert: {
          bucket_name: string;
          catalog_id: string;
          created_at?: string;
          id?: string;
          location: string;
          name: string;
          namespace_id: string;
          remote_table_id?: string | null;
          shard_id?: string | null;
          shard_key?: string | null;
          updated_at?: string;
        };
        Update: {
          bucket_name?: string;
          catalog_id?: string;
          created_at?: string;
          id?: string;
          location?: string;
          name?: string;
          namespace_id?: string;
          remote_table_id?: string | null;
          shard_id?: string | null;
          shard_key?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "iceberg_tables_catalog_id_fkey";
            columns: ["catalog_id"];
            isOneToOne: false;
            referencedRelation: "buckets_analytics";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "iceberg_tables_namespace_id_fkey";
            columns: ["namespace_id"];
            isOneToOne: false;
            referencedRelation: "iceberg_namespaces";
            referencedColumns: ["id"];
          },
        ];
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
      account_type: ["investor", "ib", "fees_account"],
      asset_code: ["BTC", "ETH", "SOL", "USDT", "USDC", "EURC", "xAUT", "XRP", "ADA"],
      aum_purpose: ["reporting", "transaction", "daily", "monthly", "quarterly", "special"],
      fund_status: ["active", "inactive", "suspended", "deprecated", "pending"],
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
      ],
      visibility_scope: ["investor_visible", "admin_only"],
      withdrawal_status: [
        "pending",
        "approved",
        "processing",
        "completed",
        "rejected",
        "cancelled",
      ],
      yield_distribution_status: [
        "pending",
        "applied",
        "voided",
        "failed",
        "draft",
        "previewed",
        "corrected",
        "rolled_back",
      ],
    },
  },
  storage: {
    Enums: {
      buckettype: ["STANDARD", "ANALYTICS", "VECTOR"],
    },
  },
} as const;
