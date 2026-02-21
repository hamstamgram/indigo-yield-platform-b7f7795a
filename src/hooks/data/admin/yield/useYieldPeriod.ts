import { useState, useCallback } from "react";
import { format, startOfMonth, endOfMonth, isWithinInterval } from "date-fns";

export type YieldPurpose = "reporting" | "transaction";

export interface YieldPeriodState {
  yieldPurpose: YieldPurpose;
  aumDate: string;
  datePickerOpen: boolean;
  reportingMonth: string;
  asOfDateIso: string | null;
  aumTime: string;
  distributionDate: Date;
}

export const initialPeriodState: YieldPeriodState = {
  yieldPurpose: "transaction",
  aumDate: format(new Date(), "yyyy-MM-dd"),
  datePickerOpen: false,
  reportingMonth: "",
  asOfDateIso: null,
  aumTime: format(new Date(), "HH:mm"),
  distributionDate: new Date(),
};

export function useYieldPeriod() {
  const [period, setPeriod] = useState<YieldPeriodState>(initialPeriodState);

  const setYieldPurpose = useCallback((purpose: YieldPurpose) => {
    setPeriod((prev) => ({ ...prev, yieldPurpose: purpose }));
  }, []);

  const setAumDate = useCallback((dateStr: string) => {
    setPeriod((prev) => ({
      ...prev,
      aumDate: dateStr,
      asOfDateIso: dateStr,
    }));
  }, []);

  const setDatePickerOpen = useCallback((open: boolean) => {
    setPeriod((prev) => ({ ...prev, datePickerOpen: open }));
  }, []);

  const setReportingMonth = useCallback((month: string) => {
    setPeriod((prev) => ({ ...prev, reportingMonth: month }));
  }, []);

  const setAumTime = useCallback((time: string) => {
    setPeriod((prev) => ({ ...prev, aumTime: time }));
  }, []);

  const setDistributionDate = useCallback((date: Date) => {
    setPeriod((prev) => ({ ...prev, distributionDate: date }));
  }, []);

  const getAvailableMonths = useCallback((): { value: string; label: string }[] => {
    const months: { value: string; label: string }[] = [];
    const now = new Date();
    const startDate = new Date(2024, 0, 1);
    let current = new Date(now.getFullYear(), now.getMonth(), 1);

    while (current >= startDate) {
      const value = format(current, "yyyy-MM-dd");
      const label = format(current, "MMMM yyyy");
      months.push({ value, label });
      current = new Date(current.getFullYear(), current.getMonth() - 1, 1);
    }
    return months;
  }, []);

  const validateEffectiveDate = useCallback(
    (
      aumDateStr: string,
      yieldPurpose: YieldPurpose,
      reportingMonth: string
    ): { valid: boolean; error?: string } => {
      const today = new Date();
      today.setHours(23, 59, 59, 999);

      const aumDate = new Date(aumDateStr + "T12:00:00");

      if (aumDate > today) {
        return { valid: false, error: "Yield cannot be distributed for future dates." };
      }

      if (yieldPurpose !== "reporting" || !reportingMonth) {
        return { valid: true };
      }

      const monthStart = startOfMonth(new Date(reportingMonth + "T12:00:00"));
      const monthEnd = endOfMonth(monthStart);

      const normalizedAumDate = new Date(aumDate);
      normalizedAumDate.setHours(12, 0, 0, 0);

      if (!isWithinInterval(normalizedAumDate, { start: monthStart, end: monthEnd })) {
        return {
          valid: false,
          error: `Effective date must be within ${format(monthStart, "MMMM yyyy")} (${format(monthStart, "MMM d")} - ${format(monthEnd, "MMM d")})`,
        };
      }

      return { valid: true };
    },
    []
  );

  return {
    ...period,
    setYieldPurpose,
    setAumDate,
    setDatePickerOpen,
    setReportingMonth,
    setAumTime,
    setDistributionDate,
    getAvailableMonths,
    validateEffectiveDate,
    setPeriod,
  };
}
