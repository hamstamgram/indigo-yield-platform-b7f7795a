import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download, TrendingUp, TrendingDown, Loader2 } from "lucide-react";
import { PerformanceRecord } from "@/types/performance";
import { getAssetLogo } from "@/utils/assets";
import { cn } from "@/lib/utils";

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
  const formatVal = (val: number, asset: string, showSign = false) => {
    const absVal = Math.abs(val);
    const sign = val > 0 ? "+" : val < 0 ? "-" : "";
    const formatted = absVal.toLocaleString("en-US", {
      minimumFractionDigits: 4,
      maximumFractionDigits: 4,
    });
    
    // Color logic handled in render, this just returns string
    return showSign ? `${sign}${formatted}` : formatted;
  };

  const formatPct = (val: number) => {
    return `${(val * 100).toFixed(2)}%`;
  };

  return (
    <div className="rounded-md border shadow-sm bg-card overflow-x-auto">
      <Table className="text-xs md:text-sm">
        <TableHeader className="bg-muted/50">
          <TableRow className="border-b-2 border-border">
            <TableHead className="w-[200px] font-bold uppercase text-muted-foreground border-r">
              Period
            </TableHead>
            
            {/* MTD Group */}
            <TableHead
              colSpan={3}
              className="text-center font-bold uppercase text-muted-foreground border-r bg-blue-50/50 dark:bg-blue-900/10"
            >
              Month to Date (MTD)
            </TableHead>
            
            {/* QTD Group */}
            <TableHead
              colSpan={3}
              className="text-center font-bold uppercase text-muted-foreground border-r"
            >
              Quarter to Date (QTD)
            </TableHead>
            
            {/* YTD Group */}
            <TableHead
              colSpan={3}
              className="text-center font-bold uppercase text-muted-foreground border-r bg-yellow-50/50 dark:bg-yellow-900/10"
            >
              Year to Date (YTD)
            </TableHead>

            {/* ITD Group */}
            <TableHead
              colSpan={3}
              className="text-center font-bold uppercase text-muted-foreground border-r bg-purple-50/50 dark:bg-purple-900/10"
            >
              Inception to Date (ITD)
            </TableHead>

            <TableHead className="text-right">Action</TableHead>
          </TableRow>
          
          {/* Sub-headers */}
          <TableRow className="border-b border-border/50 text-[10px] uppercase tracking-wider">
            <TableHead className="border-r">Fund / Month</TableHead>
            
            {/* MTD Columns */}
            <TableHead className="text-right bg-blue-50/30 dark:bg-blue-900/5">Net Income</TableHead>
            <TableHead className="text-right bg-blue-50/30 dark:bg-blue-900/5">End Bal</TableHead>
            <TableHead className="text-right border-r bg-blue-50/30 dark:bg-blue-900/5">% Ret</TableHead>
            
            {/* QTD Columns */}
            <TableHead className="text-right">Net Income</TableHead>
            <TableHead className="text-right">End Bal</TableHead>
            <TableHead className="text-right border-r">% Ret</TableHead>
            
            {/* YTD Columns */}
            <TableHead className="text-right bg-yellow-50/30 dark:bg-yellow-900/5">Net Income</TableHead>
            <TableHead className="text-right bg-yellow-50/30 dark:bg-yellow-900/5">End Bal</TableHead>
            <TableHead className="text-right border-r bg-yellow-50/30 dark:bg-yellow-900/5">% Ret</TableHead>

            {/* ITD Columns */}
            <TableHead className="text-right bg-purple-50/30 dark:bg-purple-900/5">Net Income</TableHead>
            <TableHead className="text-right bg-purple-50/30 dark:bg-purple-900/5">End Bal</TableHead>
            <TableHead className="text-right border-r bg-purple-50/30 dark:bg-purple-900/5">% Ret</TableHead>
            
            <TableHead className="text-right"></TableHead>
          </TableRow>
        </TableHeader>
        
        <TableBody>
          {data.map((record) => {
            const isPositiveMTD = record.mtd_net_income >= 0;
            
            return (
              <TableRow key={record.id} className="hover:bg-muted/50 group">
                {/* Asset & Period */}
                <TableCell className="font-medium border-r">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-background border flex items-center justify-center p-1">
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
                      <div className="font-bold">{record.period?.period_name}</div>
                      <Badge variant="outline" className="text-[10px] h-4 px-1">
                        {record.fund_name}
                      </Badge>
                    </div>
                  </div>
                </TableCell>

                {/* MTD Data */}
                <TableCell className={cn("text-right font-mono bg-blue-50/30 dark:bg-blue-900/5", isPositiveMTD ? "text-green-600" : "text-red-600")}>
                  {formatVal(record.mtd_net_income, record.fund_name, true)}
                </TableCell>
                <TableCell className="text-right font-mono font-medium bg-blue-50/30 dark:bg-blue-900/5">
                  {formatVal(record.mtd_ending_balance, record.fund_name)}
                </TableCell>
                <TableCell className={cn("text-right font-mono border-r bg-blue-50/30 dark:bg-blue-900/5", record.mtd_rate_of_return >= 0 ? "text-green-600" : "text-red-600")}>
                  {formatPct(record.mtd_rate_of_return)}
                </TableCell>

                {/* QTD Data */}
                <TableCell className={cn("text-right font-mono text-muted-foreground", record.qtd_net_income >= 0 ? "text-green-600/70" : "text-red-600/70")}>
                  {formatVal(record.qtd_net_income, record.fund_name, true)}
                </TableCell>
                <TableCell className="text-right font-mono text-muted-foreground">
                  {formatVal(record.qtd_ending_balance, record.fund_name)}
                </TableCell>
                <TableCell className={cn("text-right font-mono text-muted-foreground border-r", record.qtd_rate_of_return >= 0 ? "text-green-600/70" : "text-red-600/70")}>
                  {formatPct(record.qtd_rate_of_return)}
                </TableCell>

                {/* YTD Data */}
                <TableCell className={cn("text-right font-mono bg-yellow-50/30 dark:bg-yellow-900/5", record.ytd_net_income >= 0 ? "text-green-600" : "text-red-600")}>
                  {formatVal(record.ytd_net_income, record.fund_name, true)}
                </TableCell>
                <TableCell className="text-right font-mono bg-yellow-50/30 dark:bg-yellow-900/5">
                  {formatVal(record.ytd_ending_balance, record.fund_name)}
                </TableCell>
                <TableCell className={cn("text-right font-mono border-r bg-yellow-50/30 dark:bg-yellow-900/5", record.ytd_rate_of_return >= 0 ? "text-green-600" : "text-red-600")}>
                  {formatPct(record.ytd_rate_of_return)}
                </TableCell>

                {/* ITD Data */}
                <TableCell className={cn("text-right font-mono bg-purple-50/30 dark:bg-purple-900/5", (record.itd_net_income || 0) >= 0 ? "text-green-600" : "text-red-600")}>
                  {formatVal(record.itd_net_income || 0, record.fund_name, true)}
                </TableCell>
                <TableCell className="text-right font-mono bg-purple-50/30 dark:bg-purple-900/5">
                  {formatVal(record.itd_ending_balance || 0, record.fund_name)}
                </TableCell>
                <TableCell className={cn("text-right font-mono border-r bg-purple-50/30 dark:bg-purple-900/5", (record.itd_rate_of_return || 0) >= 0 ? "text-green-600" : "text-red-600")}>
                  {formatPct(record.itd_rate_of_return || 0)}
                </TableCell>

                {/* Action */}
                <TableCell className="text-right">
                  {onDownload && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => onDownload(record)}
                      disabled={downloadingId === record.id}
                    >
                      {downloadingId === record.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Download className="h-4 w-4 text-muted-foreground hover:text-primary" />
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
