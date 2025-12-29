import { Tabs, TabsList, TabsTrigger } from "@/components/ui";

export type PerformancePeriod = "mtd" | "qtd" | "ytd" | "itd";

interface PeriodSelectorProps {
  value: PerformancePeriod;
  onChange: (period: PerformancePeriod) => void;
}

export function PeriodSelector({ value, onChange }: PeriodSelectorProps) {
  return (
    <Tabs value={value} onValueChange={(v) => onChange(v as PerformancePeriod)}>
      <TabsList className="grid w-full max-w-md grid-cols-4">
        <TabsTrigger value="mtd">MTD</TabsTrigger>
        <TabsTrigger value="qtd">QTD</TabsTrigger>
        <TabsTrigger value="ytd">YTD</TabsTrigger>
        <TabsTrigger value="itd">ITD</TabsTrigger>
      </TabsList>
    </Tabs>
  );
}

export const PERIOD_LABELS: Record<PerformancePeriod, string> = {
  mtd: "Month-to-Date",
  qtd: "Quarter-to-Date",
  ytd: "Year-to-Date",
  itd: "Inception-to-Date",
};
