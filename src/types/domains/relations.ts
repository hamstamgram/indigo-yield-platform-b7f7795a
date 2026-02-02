/** Common relation shapes returned by PostgREST joins */
export interface FundRelation {
  name: string;
  asset: string;
  fund_class?: string;
  status?: string;
  code?: string;
}

export interface ProfileRelation {
  first_name: string | null;
  last_name: string | null;
  email: string;
  account_type?: string;
}

export interface StatementPeriodRelation {
  period_name?: string;
  period_end_date?: string;
  year?: number;
  month?: number;
}
