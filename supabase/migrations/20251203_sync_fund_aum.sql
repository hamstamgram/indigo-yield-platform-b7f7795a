
-- Sync Fund AUM with Investor Positions
-- This script recalculates the total AUM for each fund based on the current investor positions
-- and updates the 'funds' table.

UPDATE funds f
SET 
    total_aum = (
        SELECT COALESCE(SUM(current_value), 0)
        FROM investor_positions ip
        WHERE ip.fund_id = f.id
    ),
    updated_at = NOW();

-- Verify the updates
SELECT name, code, total_aum FROM funds ORDER BY name;
