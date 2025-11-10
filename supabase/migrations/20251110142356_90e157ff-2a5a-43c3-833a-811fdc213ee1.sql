-- Fix search_path for remaining SECURITY DEFINER functions
-- This prevents SQL injection vulnerabilities

-- 1. Fix cleanup_expired_reports
CREATE OR REPLACE FUNCTION public.cleanup_expired_reports(p_retention_days integer DEFAULT 90)
RETURNS TABLE(deleted_count integer, storage_paths text[])
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_deleted_count INTEGER;
  v_storage_paths TEXT[];
BEGIN
  -- Get storage paths before deletion for cleanup
  SELECT ARRAY_AGG(storage_path)
  INTO v_storage_paths
  FROM public.generated_reports
  WHERE created_at < NOW() - (p_retention_days || ' days')::INTERVAL
    AND storage_path IS NOT NULL;

  -- Delete old reports
  WITH deleted AS (
    DELETE FROM public.generated_reports
    WHERE created_at < NOW() - (p_retention_days || ' days')::INTERVAL
    RETURNING id
  )
  SELECT COUNT(*)::INTEGER INTO v_deleted_count FROM deleted;

  RETURN QUERY SELECT v_deleted_count, v_storage_paths;
END;
$function$;

-- 2. Fix get_report_statistics
CREATE OR REPLACE FUNCTION public.get_report_statistics(p_user_id uuid DEFAULT NULL::uuid, p_days_back integer DEFAULT 30)
RETURNS TABLE(report_type report_type, format report_format, total_generated bigint, successful bigint, failed bigint, avg_processing_time_ms numeric, total_downloads bigint, total_file_size_bytes bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    gr.report_type,
    gr.format,
    COUNT(*) AS total_generated,
    COUNT(*) FILTER (WHERE gr.status = 'completed') AS successful,
    COUNT(*) FILTER (WHERE gr.status = 'failed') AS failed,
    AVG(gr.processing_duration_ms) AS avg_processing_time_ms,
    SUM(gr.download_count) AS total_downloads,
    SUM(gr.file_size_bytes) AS total_file_size_bytes
  FROM public.generated_reports gr
  WHERE gr.created_at >= NOW() - (p_days_back || ' days')::INTERVAL
    AND (p_user_id IS NULL OR gr.generated_for_user_id = p_user_id)
  GROUP BY gr.report_type, gr.format
  ORDER BY gr.report_type, gr.format;
END;
$function$;

-- 3. Fix get_user_reports
CREATE OR REPLACE FUNCTION public.get_user_reports(p_user_id uuid, p_report_type report_type DEFAULT NULL::report_type, p_status report_status DEFAULT NULL::report_status, p_limit integer DEFAULT 50, p_offset integer DEFAULT 0)
RETURNS TABLE(id uuid, report_type report_type, format report_format, status report_status, storage_path text, file_size_bytes bigint, download_url text, download_url_expires_at timestamp with time zone, download_count integer, date_range_start date, date_range_end date, created_at timestamp with time zone, processing_completed_at timestamp with time zone)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    gr.id,
    gr.report_type,
    gr.format,
    gr.status,
    gr.storage_path,
    gr.file_size_bytes,
    gr.download_url,
    gr.download_url_expires_at,
    gr.download_count,
    gr.date_range_start,
    gr.date_range_end,
    gr.created_at,
    gr.processing_completed_at
  FROM public.generated_reports gr
  WHERE gr.generated_for_user_id = p_user_id
    AND (p_report_type IS NULL OR gr.report_type = p_report_type)
    AND (p_status IS NULL OR gr.status = p_status)
  ORDER BY gr.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$function$;