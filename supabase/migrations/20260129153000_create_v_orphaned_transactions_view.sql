create or replace view public.v_orphaned_transactions as
select
  t.id,
  t.investor_id,
  t.fund_id,
  t.type::text as type,
  t.amount,
  t.tx_date
from public.transactions_v2 t
left join public.profiles p on p.id = t.investor_id
where t.investor_id is not null
  and p.id is null;
