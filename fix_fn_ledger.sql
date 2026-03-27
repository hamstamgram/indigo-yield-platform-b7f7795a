CREATE OR REPLACE FUNCTION "public"."fn_ledger_drives_position"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_delta numeric(38,18);
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.is_voided THEN RETURN NEW; END IF;
    v_delta := NEW.amount;

    IF NEW.type = 'WITHDRAWAL' THEN
      v_delta := -1 * ABS(NEW.amount);
    END IF;

    INSERT INTO investor_positions (investor_id, fund_id, current_value, cost_basis, shares, fund_class, is_active, updated_at)
    VALUES (
      NEW.investor_id,
      NEW.fund_id,
      v_delta,
      CASE
        WHEN NEW.type IN ('DEPOSIT', 'INTERNAL_CREDIT') THEN ABS(NEW.amount)
        WHEN NEW.type IN ('ADJUSTMENT') AND NEW.amount > 0 THEN NEW.amount
        ELSE 0
      END,
      0,
      NEW.fund_class,
      true,
      now()
    )
    ON CONFLICT (investor_id, fund_id)
    DO UPDATE SET
      current_value = investor_positions.current_value + v_delta,
      cost_basis = CASE
        WHEN NEW.type IN ('DEPOSIT', 'INTERNAL_CREDIT') THEN investor_positions.cost_basis + ABS(NEW.amount)
        WHEN NEW.type IN ('WITHDRAWAL', 'INTERNAL_WITHDRAWAL') THEN GREATEST(investor_positions.cost_basis - ABS(NEW.amount), 0)
        WHEN NEW.type = 'ADJUSTMENT' AND NEW.amount > 0 THEN investor_positions.cost_basis + NEW.amount
        WHEN NEW.type = 'ADJUSTMENT' AND NEW.amount < 0 THEN GREATEST(investor_positions.cost_basis + NEW.amount, 0)
        ELSE investor_positions.cost_basis
      END,
      is_active = true,
      updated_at = now();

    RETURN NEW;

  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.is_voided = false AND NEW.is_voided = true THEN
      v_delta := NEW.amount;
      IF NEW.type = 'WITHDRAWAL' THEN
        v_delta := -1 * ABS(NEW.amount);
      END IF;

      UPDATE investor_positions
      SET
        current_value = current_value - v_delta,
        cost_basis = CASE
          WHEN NEW.type IN ('DEPOSIT', 'INTERNAL_CREDIT') THEN GREATEST(cost_basis - ABS(NEW.amount), 0)
          WHEN NEW.type IN ('WITHDRAWAL', 'INTERNAL_WITHDRAWAL') THEN cost_basis + ABS(NEW.amount)
          WHEN NEW.type = 'ADJUSTMENT' AND NEW.amount > 0 THEN GREATEST(cost_basis - NEW.amount, 0)
          WHEN NEW.type = 'ADJUSTMENT' AND NEW.amount < 0 THEN cost_basis + ABS(NEW.amount)
          ELSE cost_basis
        END,
        updated_at = now()
      WHERE investor_id = NEW.investor_id AND fund_id = NEW.fund_id;

    ELSIF OLD.is_voided = true AND NEW.is_voided = false THEN
      v_delta := NEW.amount;
      IF NEW.type = 'WITHDRAWAL' THEN
        v_delta := -1 * ABS(NEW.amount);
      END IF;

      UPDATE investor_positions
      SET
        current_value = current_value + v_delta,
        cost_basis = CASE
          WHEN NEW.type IN ('DEPOSIT', 'INTERNAL_CREDIT') THEN cost_basis + ABS(NEW.amount)
          WHEN NEW.type IN ('WITHDRAWAL', 'INTERNAL_WITHDRAWAL') THEN GREATEST(cost_basis - ABS(NEW.amount), 0)
          WHEN NEW.type = 'ADJUSTMENT' AND NEW.amount > 0 THEN cost_basis + NEW.amount
          WHEN NEW.type = 'ADJUSTMENT' AND NEW.amount < 0 THEN GREATEST(cost_basis + NEW.amount, 0)
          ELSE cost_basis
        END,
        is_active = true,
        updated_at = now()
      WHERE investor_id = NEW.investor_id AND fund_id = NEW.fund_id;
    END IF;

    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;
