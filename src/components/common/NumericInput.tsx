/**
 * NumericInput - Asset-aware numeric input with live formatting
 *
 * Features:
 * - Uses asset-specific precision from getAssetStep()
 * - Formats with thousand separators on blur
 * - Shows raw number on focus for editing
 * - Validates input against asset precision
 */

import { useState, useCallback, useRef, useEffect } from "react";
import { Input, type InputProps } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { getAssetStep, getAssetPrecision } from "@/types/asset";
import { toNum, parseFinancial } from "@/utils/numeric";
import Decimal from "decimal.js";

export interface NumericInputProps extends Omit<InputProps, "value" | "onChange" | "type"> {
  /** Asset symbol for precision (e.g., "BTC", "USDT") */
  asset?: string;
  /** Current value (string or number) */
  value: string | number;
  /** Called when value changes */
  onChange: (value: string) => void;
  /** Format with commas while not focused */
  showFormatted?: boolean;
  /** Minimum allowed value */
  min?: number;
  /** Maximum allowed value */
  max?: number;
  /** Custom precision override (otherwise uses asset precision) */
  precision?: number;
}

/**
 * Format a number string with thousand separators
 */
function formatWithCommas(value: string | number, decimals: number): string {
  const strValue = typeof value === "number" ? String(value) : value;
  const dec = new Decimal(strValue || 0);
  if (dec.isNaN()) return "";

  // Use Decimal to get fixed string, then format with commas manually
  const fixed = dec.toFixed(decimals);
  const [whole, fraction = ""] = fixed.split(".");
  const formattedWhole = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return fraction ? `${formattedWhole}.${fraction}` : formattedWhole;
}

/**
 * Remove thousand separators and validate numeric input
 */
function parseNumericInput(value: string): string {
  // Remove spaces
  let cleaned = value.replace(/\s/g, "");

  // Smart comma handling:
  // If exactly one comma and no dot, treat comma as decimal separator (European notation)
  // e.g. "1,01" -> "1.01", but "1,000,000" -> "1000000"
  const commaCount = (cleaned.match(/,/g) || []).length;
  const hasDot = cleaned.includes(".");

  if (commaCount === 1 && !hasDot) {
    // Single comma, no dot -> treat as decimal separator
    cleaned = cleaned.replace(",", ".");
  } else {
    // Multiple commas or mixed -> strip commas (thousand separators)
    cleaned = cleaned.replace(/,/g, "");
  }

  return cleaned;
}

export function NumericInput({
  asset,
  value,
  onChange,
  showFormatted = true,
  min,
  max,
  precision: customPrecision,
  className,
  placeholder,
  ...props
}: NumericInputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [displayValue, setDisplayValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Get precision from asset or custom value
  const precision = customPrecision ?? (asset ? getAssetPrecision(asset) : 8);
  const step = asset ? getAssetStep(asset) : `0.${"0".repeat(precision - 1)}1`;

  // Sync display value with external value
  useEffect(() => {
    if (!isFocused) {
      const strValue = String(value);
      if (strValue && strValue !== "" && !isNaN(toNum(strValue))) {
        setDisplayValue(showFormatted ? formatWithCommas(strValue, precision) : strValue);
      } else {
        setDisplayValue("");
      }
    }
  }, [value, isFocused, showFormatted, precision]);

  const handleFocus = useCallback(() => {
    setIsFocused(true);
    // Show raw value for editing
    const rawValue = String(value);
    setDisplayValue(rawValue === "0" ? "" : rawValue);
  }, [value]);

  const handleBlur = useCallback(() => {
    setIsFocused(false);
    const parsed = parseNumericInput(displayValue);

    if (parsed === "" || isNaN(toNum(parsed))) {
      setDisplayValue("");
      onChange("");
      return;
    }

    // Use Decimal.js for precision-safe rounding (no IEEE 754 float loss)
    let decValue = new Decimal(parsed);

    // Apply min/max constraints
    if (min !== undefined && decValue.lt(min)) {
      decValue = new Decimal(min);
    }
    if (max !== undefined && decValue.gt(max)) {
      decValue = new Decimal(max);
    }

    // Round to precision using Decimal.js (not Math.round)
    decValue = decValue.toDecimalPlaces(precision, Decimal.ROUND_HALF_UP);

    const finalValue = decValue.toString();
    onChange(finalValue);
    setDisplayValue(showFormatted ? formatWithCommas(finalValue, precision) : finalValue);
  }, [displayValue, onChange, min, max, precision, showFormatted]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const rawValue = e.target.value;

      // Allow empty, negative sign, decimal point at start
      if (rawValue === "" || rawValue === "-" || rawValue === ".") {
        setDisplayValue(rawValue);
        if (rawValue === "") {
          onChange("");
        }
        return;
      }

      // Parse and validate
      const parsed = parseNumericInput(rawValue);

      // Check if it's a valid number in progress
      const isValidInProgress = /^-?\d*\.?\d*$/.test(parsed) && !isNaN(toNum(parsed || "0"));

      if (isValidInProgress) {
        // Check decimal places
        const decimalIndex = parsed.indexOf(".");
        if (decimalIndex !== -1) {
          const decimalPlaces = parsed.length - decimalIndex - 1;
          if (decimalPlaces > precision) {
            // Too many decimals, don't update
            return;
          }
        }

        setDisplayValue(parsed);
        onChange(parsed);
      }
    },
    [onChange, precision]
  );

  return (
    <Input
      ref={inputRef}
      type="text"
      inputMode="decimal"
      value={displayValue}
      onChange={handleChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
      placeholder={placeholder ?? (asset ? `Enter ${asset} amount` : "Enter amount")}
      className={cn("font-mono", className)}
      step={step}
      min={min}
      max={max}
      {...props}
    />
  );
}

export default NumericInput;
