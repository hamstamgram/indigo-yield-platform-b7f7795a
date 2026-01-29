begin;

create or replace view public.v_yield_conservation_violations as
select
  yd.id as distribution_id,
  yd.fund_id,
  f.code as fund_code,
  yd.period_start,
  yd.period_end,
  yd.purpose,
  coalesce(yd.gross_yield_amount, yd.gross_yield) as header_gross,
  coalesce(nullif(yd.total_net_amount, 0::numeric), yd.net_yield) as header_net,
  coalesce(nullif(yd.total_fee_amount, 0::numeric), yd.total_fees) as header_fee,
  coalesce(nullif(yd.total_ib_amount, 0::numeric), yd.total_ib) as header_ib,
  coalesce(yd.dust_amount, 0::numeric) as header_dust,
  coalesce(yd.gross_yield_amount, yd.gross_yield)
    - (
      coalesce(nullif(yd.total_net_amount, 0::numeric), yd.net_yield, 0::numeric)
      + coalesce(nullif(yd.total_fee_amount, 0::numeric), yd.total_fees, 0::numeric)
      + coalesce(nullif(yd.total_ib_amount, 0::numeric), yd.total_ib, 0::numeric)
      + coalesce(yd.dust_amount, 0::numeric)
    ) as header_variance,
  abs(
    coalesce(yd.gross_yield_amount, yd.gross_yield)
      - (
        coalesce(nullif(yd.total_net_amount, 0::numeric), yd.net_yield, 0::numeric)
        + coalesce(nullif(yd.total_fee_amount, 0::numeric), yd.total_fees, 0::numeric)
        + coalesce(nullif(yd.total_ib_amount, 0::numeric), yd.total_ib, 0::numeric)
        + coalesce(yd.dust_amount, 0::numeric)
      )
  ) > 0.01 as has_violation,
  yd.status,
  coalesce(yd.is_voided, false) as is_voided,
  yd.created_at
from yield_distributions yd
join funds f on f.id = yd.fund_id
where (yd.is_voided is null or yd.is_voided = false)
  and yd.status = 'applied'::text
  and abs(
    coalesce(yd.gross_yield_amount, yd.gross_yield)
      - (
        coalesce(nullif(yd.total_net_amount, 0::numeric), yd.net_yield, 0::numeric)
        + coalesce(nullif(yd.total_fee_amount, 0::numeric), yd.total_fees, 0::numeric)
        + coalesce(nullif(yd.total_ib_amount, 0::numeric), yd.total_ib, 0::numeric)
        + coalesce(yd.dust_amount, 0::numeric)
      )
  ) > 0.01;

create or replace view public.yield_distribution_conservation_check as
select
  yd.id as distribution_id,
  yd.fund_id,
  f.code as fund_code,
  yd.effective_date,
  coalesce(yd.gross_yield_amount, yd.gross_yield) as gross_yield,
  coalesce(yd.total_fee_amount, yd.total_fees, 0::numeric) as calculated_fees,
  coalesce(yd.total_ib_amount, yd.total_ib, 0::numeric) as calculated_ib,
  coalesce(yd.total_net_amount, yd.net_yield, 0::numeric) as net_to_investors,
  coalesce(yd.gross_yield_amount, yd.gross_yield)
    - coalesce(yd.total_net_amount, yd.net_yield, 0::numeric) as expected_deductions,
  coalesce(yd.total_fee_amount, yd.total_fees, 0::numeric)
    + coalesce(yd.total_ib_amount, yd.total_ib, 0::numeric) as actual_deductions,
  abs(
    coalesce(yd.gross_yield_amount, yd.gross_yield)
      - coalesce(yd.total_net_amount, yd.net_yield, 0::numeric)
      - coalesce(yd.total_fee_amount, yd.total_fees, 0::numeric)
      - coalesce(yd.total_ib_amount, yd.total_ib, 0::numeric)
  ) as conservation_error
from yield_distributions yd
left join funds f on f.id = yd.fund_id
where is_admin()
  and (yd.is_voided is null or yd.is_voided = false)
  and yd.status = 'applied'::text
  and abs(
    coalesce(yd.gross_yield_amount, yd.gross_yield)
      - coalesce(yd.total_net_amount, yd.net_yield, 0::numeric)
      - coalesce(yd.total_fee_amount, yd.total_fees, 0::numeric)
      - coalesce(yd.total_ib_amount, yd.total_ib, 0::numeric)
  ) > 0.01;

create or replace view public.v_aum_position_mismatch as
select
  f.id as fund_id,
  f.name as fund_name,
  f.asset,
  coalesce(sum(ip.current_value), 0::numeric) as sum_positions,
  coalesce(dn.aum, fda.total_aum)::numeric(28,10) as latest_nav_aum,
  coalesce(sum(ip.current_value), 0::numeric) - coalesce(dn.aum, fda.total_aum, 0::numeric) as mismatch_amount,
  abs(coalesce(sum(ip.current_value), 0::numeric) - coalesce(dn.aum, fda.total_aum, 0::numeric)) > 0.01 as has_mismatch
from funds f
left join investor_positions ip on ip.fund_id = f.id
left join lateral (
  select dn2.aum
  from daily_nav dn2
  where dn2.fund_id = f.id
  order by dn2.nav_date desc
  limit 1
) dn on true
left join lateral (
  select fda2.total_aum
  from fund_daily_aum fda2
  where fda2.fund_id = f.id
    and fda2.is_voided = false
  order by fda2.aum_date desc
  limit 1
) fda on true
where f.status = 'active'::fund_status
group by f.id, f.name, f.asset, dn.aum, fda.total_aum;

commit;
