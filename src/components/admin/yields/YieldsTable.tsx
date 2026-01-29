/**
 * Yields Table
 * Main yields table using ResponsiveTable
 */

import { useState } from "react";
import { format } from "date-fns";
import { Check, X, Loader2, RefreshCw, Columns } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Badge,
  ResponsiveTable,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  Button,
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui";
import { TrendingUp } from "lucide-react";
import { CryptoIcon } from "@/components/CryptoIcons";
import { FinancialValue } from "@/components/common/FinancialValue";
import { YieldActionsColumn } from "./YieldActionsColumn";
import type { RecordedYieldRecord } from "@/hooks";

interface YieldsTableProps {
  yields: RecordedYieldRecord[];
  isLoading: boolean;
  correctedRecordsMap: Map<string, { count: number; lastCorrectedAt: string }>;
  canEdit: boolean;
  onEdit: (record: RecordedYieldRecord) => void;
  onVoid: (record: RecordedYieldRecord) => void;
  onCorrect: (record: RecordedYieldRecord) => void;
  onViewHistory: (record: RecordedYieldRecord) => void;
  onViewCorrectionHistory: (record: RecordedYieldRecord) => void;
}

export function YieldsTable({
  yields,
  isLoading,
  correctedRecordsMap,
  canEdit,
  onEdit,
  onVoid,
  onCorrect,
  onViewHistory,
  onViewCorrectionHistory,
}: YieldsTableProps) {
  // Column visibility state
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>({
    fund: true,
    date: true,
    aum: true,
    purpose: true,
    monthEnd: true,
    source: true,
    created: true,
    actions: true,
  });

  const allColumns = [
    {
      id: "fund",
      header: "Fund",
      cell: (record: RecordedYieldRecord) => (
        <div className="flex items-center gap-2">
          <CryptoIcon symbol={record.fund_asset || ""} className="h-5 w-5" />
          <div>
            <p className="font-medium">{record.fund_name}</p>
            <p className="text-xs text-muted-foreground">{record.fund_asset}</p>
          </div>
        </div>
      ),
    },
    {
      id: "date",
      header: "Effective Date",
      cell: (record: RecordedYieldRecord) => {
        const isVoided = record.is_voided;
        const correctionKey = `${record.fund_id}:${record.aum_date}:${record.purpose}`;
        const correctionInfo = correctedRecordsMap.get(correctionKey);
        return (
          <div className="flex items-center gap-2">
            {format(new Date(record.aum_date), "MMM d, yyyy")}
            {isVoided && (
              <Badge variant="destructive" className="text-xs">
                Voided
              </Badge>
            )}
            {correctionInfo && !isVoided && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge
                      variant="outline"
                      className="text-xs cursor-pointer bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800"
                      onClick={() => onViewCorrectionHistory(record)}
                    >
                      <RefreshCw className="h-3 w-3 mr-1" />
                      {correctionInfo.count}x Corrected
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    Last corrected:{" "}
                    {format(new Date(correctionInfo.lastCorrectedAt), "MMM d, yyyy HH:mm")}
                    <br />
                    Click to view correction history
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        );
      },
    },
    {
      id: "aum",
      header: "AUM",
      className: "text-right",
      cell: (record: RecordedYieldRecord) => (
        <FinancialValue value={record.total_aum} asset={record.fund_asset} />
      ),
    },
    {
      id: "purpose",
      header: "Purpose",
      cell: (record: RecordedYieldRecord) => (
        <Badge
          variant={record.purpose === "reporting" ? "default" : "secondary"}
          className={
            record.purpose === "reporting"
              ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
              : "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
          }
        >
          {record.purpose === "reporting" ? "🟢 Reporting" : "🟠 Transaction"}
        </Badge>
      ),
    },
    {
      id: "monthEnd",
      header: "Month End",
      cell: (record: RecordedYieldRecord) =>
        record.is_month_end ? (
          <Check className="h-4 w-4 text-green-600" />
        ) : (
          <X className="h-4 w-4 text-muted-foreground" />
        ),
    },
    {
      id: "source",
      header: "Source",
      cell: (record: RecordedYieldRecord) => (
        <span className="text-sm text-muted-foreground max-w-[150px] truncate block">
          {record.source || "-"}
        </span>
      ),
    },
    {
      id: "created",
      header: "Created",
      cell: (record: RecordedYieldRecord) => (
        <div className="text-sm">
          <p>{format(new Date(record.created_at), "MMM d, yyyy")}</p>
          {record.created_by_name && (
            <p className="text-xs text-muted-foreground">{record.created_by_name}</p>
          )}
        </div>
      ),
    },
    {
      id: "actions",
      header: "Actions",
      className: "text-right",
      cell: (record: RecordedYieldRecord) => (
        <YieldActionsColumn
          record={record}
          canEdit={canEdit}
          onEdit={onEdit}
          onVoid={onVoid}
          onViewHistory={onViewHistory}
          onCorrect={onCorrect}
          isVoided={record.is_voided}
        />
      ),
    },
  ];

  const visibleColumnsList = allColumns.filter((col) => visibleColumns[col.id]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Yield Records
            </CardTitle>
            <CardDescription>
              {yields.length} record{yields.length !== 1 ? "s" : ""} found
            </CardDescription>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="ml-auto">
                <Columns className="mr-2 h-4 w-4" />
                Columns
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {allColumns
                .filter((col) => col.id !== "actions") // Actions always visible
                .map((column) => (
                  <DropdownMenuCheckboxItem
                    key={column.id}
                    className="capitalize"
                    checked={visibleColumns[column.id]}
                    onCheckedChange={(checked) =>
                      setVisibleColumns((prev) => ({ ...prev, [column.id]: checked }))
                    }
                  >
                    {column.header}
                  </DropdownMenuCheckboxItem>
                ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : yields.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            No yield records found. Adjust filters or record yields first.
          </div>
        ) : (
          <ResponsiveTable<RecordedYieldRecord>
            data={yields}
            keyExtractor={(r) => r.id}
            emptyMessage="No yield records found"
            columns={visibleColumnsList}
            mobileCardRenderer={(record) => {
              const correctionKey = `${record.fund_id}:${record.aum_date}:${record.purpose}`;
              const correctionInfo = correctedRecordsMap.get(correctionKey);
              return (
                <Card className={`p-4 ${record.is_voided ? "opacity-50" : ""}`}>
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-2">
                      <CryptoIcon symbol={record.fund_asset || ""} className="h-6 w-6" />
                      <div>
                        <p className="font-medium">{record.fund_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(record.aum_date), "MMM d, yyyy")}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Badge
                        variant={record.purpose === "reporting" ? "default" : "secondary"}
                        className={
                          record.purpose === "reporting"
                            ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                            : "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
                        }
                      >
                        {record.purpose === "reporting" ? "Reporting" : "Transaction"}
                      </Badge>
                      {record.is_voided && (
                        <Badge variant="destructive" className="text-xs">
                          Voided
                        </Badge>
                      )}
                      {correctionInfo && !record.is_voided && (
                        <Badge
                          variant="outline"
                          className="text-xs bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400"
                        >
                          {correctionInfo.count}x Corrected
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                    <div>
                      <span className="text-muted-foreground text-xs">AUM</span>
                      <div className="font-medium">
                        <FinancialValue value={record.total_aum} asset={record.fund_asset} />
                      </div>
                    </div>
                    <div className="text-right">
                      {record.is_month_end && (
                        <Badge variant="outline" className="text-xs">
                          <Check className="h-3 w-3 mr-1" />
                          Month End
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-between items-center pt-2 border-t">
                    <div className="text-xs text-muted-foreground">
                      {record.created_by_name && <span>{record.created_by_name} • </span>}
                      {format(new Date(record.created_at), "MMM d, yyyy")}
                    </div>
                    <YieldActionsColumn
                      record={record}
                      canEdit={canEdit}
                      onEdit={onEdit}
                      onVoid={onVoid}
                      onViewHistory={onViewHistory}
                      onCorrect={onCorrect}
                      isVoided={record.is_voided}
                    />
                  </div>
                </Card>
              );
            }}
            className="rounded-md border"
          />
        )}
      </CardContent>
    </Card>
  );
}
