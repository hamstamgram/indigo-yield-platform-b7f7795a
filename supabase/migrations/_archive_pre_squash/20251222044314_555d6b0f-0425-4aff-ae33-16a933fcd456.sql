-- Add dispatch_report_delivery_run RPC for comprehensive delivery workflow
-- This RPC combines eligibility check, queue creation, and returns detailed breakdown

CREATE OR REPLACE FUNCTION public.dispatch_report_delivery_run(
  p_period_id UUID,
  p_channel TEXT DEFAULT 'email'
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_run_id UUID := gen_random_uuid();
  v_eligible_count INTEGER := 0;
  v_queued_count INTEGER := 0;
  v_skipped_no_email INTEGER := 0;
  v_skipped_already_sent INTEGER := 0;
  v_skipped_no_html INTEGER := 0;
  v_period_name TEXT;
  rec RECORD;
BEGIN
  -- Verify admin access
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;
  
  -- Get period name
  SELECT period_name INTO v_period_name 
  FROM statement_periods WHERE id = p_period_id;
  
  IF v_period_name IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Period not found',
      'period_id', p_period_id
    );
  END IF;
  
  -- Count eligible statements with breakdown
  FOR rec IN
    SELECT 
      gs.id as statement_id,
      gs.investor_id,
      gs.user_id,
      gs.html_content,
      p.email,
      p.first_name,
      p.last_name,
      p.status as investor_status,
      EXISTS (
        SELECT 1 FROM statement_email_delivery sed 
        WHERE sed.statement_id = gs.id 
          AND sed.channel = p_channel
          AND sed.status IN ('sent', 'SENT', 'delivered', 'DELIVERED')
      ) as already_sent,
      EXISTS (
        SELECT 1 FROM statement_email_delivery sed 
        WHERE sed.statement_id = gs.id 
          AND sed.channel = p_channel
      ) as already_queued
    FROM generated_statements gs
    JOIN profiles p ON p.id = gs.investor_id
    WHERE gs.period_id = p_period_id
  LOOP
    v_eligible_count := v_eligible_count + 1;
    
    -- Check various skip reasons
    IF rec.already_sent THEN
      v_skipped_already_sent := v_skipped_already_sent + 1;
      CONTINUE;
    END IF;
    
    IF rec.html_content IS NULL OR rec.html_content = '' THEN
      v_skipped_no_html := v_skipped_no_html + 1;
      CONTINUE;
    END IF;
    
    IF p_channel = 'email' AND (rec.email IS NULL OR rec.email = '') THEN
      v_skipped_no_email := v_skipped_no_email + 1;
      CONTINUE;
    END IF;
    
    -- Skip if already queued (but not sent)
    IF rec.already_queued THEN
      CONTINUE;
    END IF;
    
    -- Queue the delivery
    INSERT INTO statement_email_delivery (
      statement_id, investor_id, user_id, period_id,
      recipient_email, subject, status, channel, created_by, attempt_count
    ) VALUES (
      rec.statement_id, rec.investor_id, rec.user_id, p_period_id,
      rec.email, 
      v_period_name || ' Statement - ' || COALESCE(rec.first_name || ' ' || rec.last_name, rec.email),
      'queued', p_channel, auth.uid(), 0
    );
    v_queued_count := v_queued_count + 1;
  END LOOP;
  
  -- Return comprehensive breakdown
  RETURN jsonb_build_object(
    'success', true,
    'run_id', v_run_id,
    'period_id', p_period_id,
    'period_name', v_period_name,
    'channel', p_channel,
    'eligible_count', v_eligible_count,
    'queued_count', v_queued_count,
    'skipped_breakdown', jsonb_build_object(
      'already_sent', v_skipped_already_sent,
      'missing_email', v_skipped_no_email,
      'missing_html', v_skipped_no_html
    ),
    'message', CASE 
      WHEN v_queued_count > 0 THEN format('Queued %s new deliveries', v_queued_count)
      WHEN v_eligible_count = 0 THEN 'No generated statements found for this period'
      WHEN v_skipped_already_sent = v_eligible_count THEN 'All statements have already been sent'
      ELSE format('No new deliveries to queue (%s already sent, %s missing email, %s missing HTML)', 
                  v_skipped_already_sent, v_skipped_no_email, v_skipped_no_html)
    END
  );
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.dispatch_report_delivery_run TO authenticated;