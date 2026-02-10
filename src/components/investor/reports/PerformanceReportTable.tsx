import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Badge,
  Button,
} from "@/components/ui";
import { Download, TrendingUp, TrendingDown, Loader2 } from "lucide-react";
import { PerformanceRecord } from "@/types/domains";
import { getAssetLogo } from "@/utils/assets";
import { cn } from "@/lib/utils";
import { toNum } from "@/utils/numeric";

interface PerformanceReportTableProps {
  data: PerformanceRecord[];
  isLoading?: boolean;
  onDownload?: (record: PerformanceRecord) => void;
  downloadingId?: string | null;
}

export function PerformanceReportTable({
  data,
  isLoading,
  onDownload,
  downloadingId,
}: PerformanceReportTableProps) {
  if (isLoading) {
    return (
      <div className="w-full h-64 flex items-center justify-center border rounded-lg bg-muted/5">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="w-full h-32 flex items-center justify-center border rounded-lg bg-muted/5 text-muted-foreground">
        No performance records found.
      </div>
    );
  }

  // Helper to format currency
  const formatVal = (val: string | number, asset: string, showSign = false) => {
    const numVal = toNum(val);
    const absVal = Math.abs(numVal);
    const sign = numVal > 0 ? "+" : numVal < 0 ? "-" : "";
    const formatted = absVal.toLocaleString("en-US", {
      minimumFractionDigits: 4,
      maximumFractionDigits: 4,
    });

    // Color logic handled in render, this just returns string
    return showSign ? `${sign}${formatted}` : formatted;
  };

  const formatPct = (val: string | number) => {
    // DB stores rate_of_return already as percentage (e.g. 1.29 = 1.29%)
    return `${toNum(val).toFixed(2)}%`;
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-black/40 backdrop-blur-xl shadow-lg overflow-hidden">
      <Table className="text-xs md:text-sm">
        <TableHeader className="bg-white/5 backdrop-blur-md">
          <TableRow className="border-b border-white/10 hover:bg-transparent">
            <TableHead className="w-[200px] font-bold uppercase text-indigo-200/50 border-r border-white/10 py-4">
              Period
            </TableHead>

            {/* MTD Group */}
            <TableHead
              colSpan={3}
              className="text-center font-bold uppercase text-yield-neon border-r border-white/10 bg-yield-neon/5"
            >
              Month to Date (MTD)
            </TableHead>

            {/* QTD Group */}
            <TableHead
              colSpan={3}
              className="text-center font-bold uppercase text-indigo-200/50 border-r border-white/10"
            >
              Quarter to Date (QTD)
            </TableHead>

            {/* YTD Group */}
            <TableHead
              colSpan={3}
              className="text-center font-bold uppercase text-indigo-400 border-r border-white/10 bg-indigo-500/10"
            >
              Year to Date (YTD)
            </TableHead>

            {/* ITD Group */}
            <TableHead
              colSpan={3}
              className="text-center font-bold uppercase text-purple-400 border-r border-white/10 bg-purple-500/10"
            >
              Inception to Date (ITD)
            </TableHead>

            <TableHead className="text-right py-4 pr-6 text-indigo-200/50">Download</TableHead>
          </TableRow>

          {/* Sub-headers */}
          <TableRow className="border-b border-white/10 text-[10px] uppercase tracking-wider hover:bg-transparent">
            <TableHead className="border-r border-white/10 h-10 text-indigo-200/50">
              Fund / Month
            </TableHead>

            {/* MTD Columns */}
            <TableHead className="text-right h-10 text-yield-neon/70">Net Income</TableHead>
            <TableHead className="text-right h-10 text-yield-neon/70">End Bal</TableHead>
            <TableHead className="text-right border-r border-white/10 h-10 text-yield-neon/70">
              % Ret
            </TableHead>

            {/* QTD Columns */}
            <TableHead className="text-right h-10 text-indigo-200/50">Net Income</TableHead>
            <TableHead className="text-right h-10 text-indigo-200/50">End Bal</TableHead>
            <TableHead className="text-right border-r border-white/10 h-10 text-indigo-200/50">
              % Ret
            </TableHead>

            {/* YTD Columns */}
            <TableHead className="text-right h-10 text-indigo-400/70">Net Income</TableHead>
            <TableHead className="text-right h-10 text-indigo-400/70">End Bal</TableHead>
            <TableHead className="text-right border-r border-white/10 h-10 text-indigo-400/70">
              % Ret
            </TableHead>

            {/* ITD Columns */}
            <TableHead className="text-right h-10 text-purple-400/70">Net Income</TableHead>
            <TableHead className="text-right h-10 text-purple-400/70">End Bal</TableHead>
            <TableHead className="text-right border-r border-white/10 h-10 text-purple-400/70">
              % Ret
            </TableHead>

            <TableHead className="text-right h-10"></TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {data.map((record) => {
            const isPositiveMTD = toNum(record.mtd_net_income) >= 0;

            return (
              <TableRow
                key={record.id}
                className="border-b border-white/10 hover:bg-white/5 group transition-colors duration-200"
              >
                {/* Asset & Period */}
                <TableCell className="font-medium border-r border-white/10 py-4 pl-4">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-xl bg-black/40 border border-white/10 shadow-sm flex items-center justify-center p-1.5 transition-transform group-hover:scale-110">
                      <img
                        src={getAssetLogo(record.fund_name)}
                        alt={record.fund_name}
                        className="h-full w-full object-contain"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
                        }}
                      />
                    </div>
                    <div>
                      <div className="font-bold text-white font-display text-sm group-hover:text-indigo-400 transition-colors">
                        {record.period?.period_name}
                      </div>
                    </div>
                  </div>
                </TableCell>

                {/* MTD Data */}
                <TableCell
                  className={cn(
                    "text-right font-mono bg-yield-neon/5",
                    isPositiveMTD ? "text-yield-neon font-semibold" : "text-rose-500"
                  )}
                >
                  {formatVal(record.mtd_net_income, record.fund_name, true)}
                </TableCell>
                <TableCell className="text-right font-mono font-medium bg-yield-neon/5 text-white/80">
                  {formatVal(record.mtd_ending_balance, record.fund_name)}
                </TableCell>
                <TableCell
                  className={cn(
                    "text-right font-mono border-r border-white/10 bg-yield-neon/5",
                    toNum(record.mtd_rate_of_return) >= 0
                      ? "text-yield-neon font-bold"
                      : "text-rose-500"
                  )}
                >
                  {formatPct(record.mtd_rate_of_return)}
                </TableCell>

                {/* QTD Data */}
                <TableCell
                  className={cn(
                    "text-right font-mono text-indigo-200/70",
                    toNum(record.qtd_net_income) >= 0 ? "text-indigo-200/70" : "text-rose-500/70"
                  )}
                >
                  {formatVal(record.qtd_net_income, record.fund_name, true)}
                </TableCell>
                <TableCell className="text-right font-mono text-indigo-200/70">
                  {formatVal(record.qtd_ending_balance, record.fund_name)}
                </TableCell>
                <TableCell
                  className={cn(
                    "text-right font-mono text-indigo-200/70 border-r border-white/10",
                    toNum(record.qtd_rate_of_return) >= 0
                      ? "text-indigo-200/70"
                      : "text-rose-500/70"
                  )}
                >
                  {formatPct(record.qtd_rate_of_return)}
                </TableCell>

                {/* YTD Data */}
                <TableCell
                  className={cn(
                    "text-right font-mono bg-indigo-500/5",
                    toNum(record.ytd_net_income) >= 0 ? "text-indigo-400" : "text-rose-500"
                  )}
                >
                  {formatVal(record.ytd_net_income, record.fund_name, true)}
                </TableCell>
                <TableCell className="text-right font-mono bg-indigo-500/5 text-white/80">
                  {formatVal(record.ytd_ending_balance, record.fund_name)}
                </TableCell>
                <TableCell
                  className={cn(
                    "text-right font-mono border-r border-white/10 bg-indigo-500/5",
                    toNum(record.ytd_rate_of_return) >= 0
                      ? "text-indigo-400 font-bold"
                      : "text-rose-500"
                  )}
                >
                  {formatPct(record.ytd_rate_of_return)}
                </TableCell>

                {/* ITD Data */}
                <TableCell
                  className={cn(
                    "text-right font-mono bg-purple-500/5",
                    toNum(record.itd_net_income ?? 0) >= 0 ? "text-purple-400" : "text-rose-500"
                  )}
                >
                  {formatVal(record.itd_net_income ?? "0", record.fund_name, true)}
                </TableCell>
                <TableCell className="text-right font-mono bg-purple-500/5 text-white/80">
                  {formatVal(record.itd_ending_balance ?? "0", record.fund_name)}
                </TableCell>
                <TableCell
                  className={cn(
                    "text-right font-mono border-r border-white/10 bg-purple-500/5",
                    toNum(record.itd_rate_of_return ?? 0) >= 0
                      ? "text-purple-400 font-bold"
                      : "text-rose-500"
                  )}
                >
                  {formatPct(record.itd_rate_of_return ?? "0")}
                </TableCell>

                {/* Action */}
                <TableCell className="text-right pr-6">
                  {onDownload && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="opacity-0 group-hover:opacity-100 transition-all scale-90 group-hover:scale-100 hover:bg-white/10 hover:text-white rounded-full text-white/50"
                      onClick={() => onDownload(record)}
                      disabled={downloadingId === record.id}
                    >
                      {downloadingId === record.id ? (
                        <Loader2 className="h-4 w-4 animate-spin text-white" />
                      ) : (
                        <Download className="h-4 w-4" />
                      )}
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
