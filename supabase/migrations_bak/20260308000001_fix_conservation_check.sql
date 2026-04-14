-- Fix conservation check in both preview and apply segmented yield RPCs.
-- SKIPPED: The functions are redefined in later migrations with the fix included.
-- Original fix used dynamic SQL with nested dollar-quoting that breaks local migration runner.
SELECT 1;
