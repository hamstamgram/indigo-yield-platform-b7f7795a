
-- Fix the ON CONFLICT clause in sync_yield_to_investor_yield_events
-- The unique index is: (reference_id) WHERE (is_voided = false)
-- But the trigger uses: ON CONFLICT (reference_id) WHERE reference_id IS NOT NULL
-- These must match for ON CONFLICT to work.

CREATE OR REPLACE FUNCTION public.sync_yield_to_investor_yield_events()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_fund record;
  v_aum_event record;
  v_trigger_type text;
BEGIN
  IF NEW.type = 'YIELD'::public.tx_type AND NOT NEW.is_voided THEN
    SELECT * INTO v_fund FROM funds WHERE id = NEW.fund_id;
    
    SELECT * INTO v_aum_event
    FROM fund_aum_events
    WHERE fund_id = NEW.fund_id AND event_date = NEW.tx_date AND is_voided = false
    ORDER BY event_ts DESC LIMIT 1;
    
    -- Map trigger_type to allowed values for investor_yield_events
    v_trigger_type := CASE 
      WHEN v_aum_event.trigger_type IN ('deposit', 'withdrawal', 'month_end', 'manual') 
        THEN v_aum_event.trigger_type
      ELSE 'manual'
    END;
    
    INSERT INTO public.investor_yield_events (
      investor_id, fund_id, event_date, trigger_type, trigger_transaction_id,
      fund_aum_before, fund_aum_after, investor_balance, investor_share_pct,
      fund_yield_pct, gross_yield_amount, fee_pct, fee_amount, net_yield_amount,
      period_start, period_end, days_in_period, visibility_scope, reference_id, created_by
    )
    VALUES (
      NEW.investor_id, NEW.fund_id, NEW.tx_date,
      v_trigger_type,
      NEW.id,
      COALESCE(v_aum_event.opening_aum, 0),
      COALESCE(v_aum_event.closing_aum, 0),
      0, 0, 0, NEW.amount, 0, 0, NEW.amount,
      COALESCE(v_aum_event.event_date, NEW.tx_date), NEW.tx_date, 1,
      COALESCE(NEW.visibility_scope, 'investor_visible'),
      NEW.reference_id, NEW.created_by
    )
    ON CONFLICT (reference_id) WHERE is_voided = false DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$function$;
;
