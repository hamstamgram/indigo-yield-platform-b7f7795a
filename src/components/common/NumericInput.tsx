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
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(num)) return "";

  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  }).format(num);
}

/**
 * Remove thousand separators and validate numeric input
 */
function parseNumericInput(value: string): string {
  // Remove commas and spaces
  return value.replace(/[,\s]/g, "");
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
      if (strValue && strValue !== "" && !isNaN(parseFloat(strValue))) {
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

    if (parsed === "" || isNaN(parseFloat(parsed))) {
      setDisplayValue("");
      onChange("");
      return;
    }

    let numValue = parseFloat(parsed);

    // Apply min/max constraints
    if (min !== undefined && numValue < min) {
      numValue = min;
    }
    if (max !== undefined && numValue > max) {
      numValue = max;
    }

    // Round to precision
    const factor = Math.pow(10, precision);
    numValue = Math.round(numValue * factor) / factor;

    const finalValue = numValue.toString();
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
      const isValidInProgress = /^-?\d*\.?\d*$/.test(parsed) && !isNaN(parseFloat(parsed || "0"));

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
