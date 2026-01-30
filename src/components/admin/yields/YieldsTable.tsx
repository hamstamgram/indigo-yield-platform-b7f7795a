/**
 * Yields Table
 * Main yields table using ResponsiveTable
 */

import { useMemo, useState } from "react";
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
  SortableTableHead,
  Input,
} from "@/components/ui";
import { TrendingUp } from "lucide-react";
import { CryptoIcon } from "@/components/CryptoIcons";
import { FinancialValue } from "@/components/common/FinancialValue";
import { YieldActionsColumn } from "./YieldActionsColumn";
import type { RecordedYieldRecord } from "@/hooks";
import { useSortableColumns } from "@/hooks/ui/useSortableColumns";

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
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({
    fund: "",
    date: "",
    aum: "",
    purpose: "",
    monthEnd: "",
    source: "",
    created: "",
  });

  // Sort state
  const { sortConfig, requestSort, sortedData } = useSortableColumns(yields, {
    column: "aum_date", // Default sort by date
    direction: "desc",
  });

  const filteredData = useMemo(() => {
    const activeFilters = Object.entries(columnFilters).filter(([, value]) => value.trim() !== "");
    if (activeFilters.length === 0) return sortedData;

    return sortedData.filter((record) => {
      // Filter out internal system sync records (Ghost Records)
      if (
        record.source?.includes("trigger:position_sync") ||
        record.source?.includes("position_sync")
      ) {
        return false;
      }

      const effectiveDate = record.as_of_date || record.aum_date;
      const columnValues: Record<string, string> = {
        fund: `${record.fund_name ?? ""} ${record.fund_asset ?? ""}`.trim(),
        date: format(new Date(effectiveDate), "MMM d, yyyy HH:mm"),
        aum: `${record.total_aum}`,
        purpose: record.purpose ?? "",
        monthEnd: record.is_month_end ? "yes" : "no",
        source: record.source ?? "",
        created: `${format(new Date(record.created_at), "MMM d, yyyy HH:mm")} ${
          record.created_by_name ?? ""
        }`.trim(),
      };

      return activeFilters.every(([key, value]) =>
        (columnValues[key] || "").toLowerCase().includes(value.toLowerCase())
      );
    });
  }, [columnFilters, sortedData]);

  const allColumns = [
    {
      id: "fund",
      header: (
        <SortableTableHead column="fund_name" currentSort={sortConfig} onSort={requestSort}>
          Fund
        </SortableTableHead>
      ),
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
      header: (
        <SortableTableHead column="aum_date" currentSort={sortConfig} onSort={requestSort}>
          Effective Date
        </SortableTableHead>
      ),
      cell: (record: RecordedYieldRecord) => {
        const isVoided = record.is_voided;
        const correctionKey = `${record.fund_id}:${record.aum_date}:${record.purpose}`;
        const correctionInfo = correctedRecordsMap.get(correctionKey);
        const effectiveDate = record.as_of_date || record.aum_date;
        return (
          <div className="flex items-center gap-2">
            {format(new Date(effectiveDate), "MMM d, yyyy HH:mm")}
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
      header: (
        <SortableTableHead
          column="total_aum"
          currentSort={sortConfig}
          onSort={requestSort}
          className="justify-end w-full"
        >
          AUM
        </SortableTableHead>
      ),
      className: "text-right",
      cell: (record: RecordedYieldRecord) => (
        <FinancialValue value={record.total_aum} asset={record.fund_asset} />
      ),
    },
    {
      id: "purpose",
      header: (
        <SortableTableHead column="purpose" currentSort={sortConfig} onSort={requestSort}>
          Purpose
        </SortableTableHead>
      ),
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
      header: (
        <SortableTableHead column="created_at" currentSort={sortConfig} onSort={requestSort}>
          Created
        </SortableTableHead>
      ),
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
              {filteredData.length} record{filteredData.length !== 1 ? "s" : ""} found
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
                    {typeof column.header === "string" ? column.header : column.id}
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
        ) : filteredData.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            No yield records found. Adjust filters or record yields first.
          </div>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
              <Input
                placeholder="Filter fund"
                value={columnFilters.fund}
                onChange={(event) =>
                  setColumnFilters((prev) => ({ ...prev, fund: event.target.value }))
                }
              />
              <Input
                placeholder="Filter effective date"
                value={columnFilters.date}
                onChange={(event) =>
                  setColumnFilters((prev) => ({ ...prev, date: event.target.value }))
                }
              />
              <Input
                placeholder="Filter AUM"
                value={columnFilters.aum}
                onChange={(event) =>
                  setColumnFilters((prev) => ({ ...prev, aum: event.target.value }))
                }
              />
              <Input
                placeholder="Filter purpose"
                value={columnFilters.purpose}
                onChange={(event) =>
                  setColumnFilters((prev) => ({ ...prev, purpose: event.target.value }))
                }
              />
              <Input
                placeholder="Filter month end (yes/no)"
                value={columnFilters.monthEnd}
                onChange={(event) =>
                  setColumnFilters((prev) => ({ ...prev, monthEnd: event.target.value }))
                }
              />
              <Input
                placeholder="Filter source"
                value={columnFilters.source}
                onChange={(event) =>
                  setColumnFilters((prev) => ({ ...prev, source: event.target.value }))
                }
              />
              <Input
                placeholder="Filter created"
                value={columnFilters.created}
                onChange={(event) =>
                  setColumnFilters((prev) => ({ ...prev, created: event.target.value }))
                }
              />
              <Button
                variant="outline"
                onClick={() =>
                  setColumnFilters({
                    fund: "",
                    date: "",
                    aum: "",
                    purpose: "",
                    monthEnd: "",
                    source: "",
                    created: "",
                  })
                }
              >
                Clear column filters
              </Button>
            </div>
            <ResponsiveTable<RecordedYieldRecord>
              data={filteredData}
              keyExtractor={(r) => r.id}
              emptyMessage="No yield records found"
              columns={visibleColumnsList}
              mobileCardRenderer={(record) => {
                const correctionKey = `${record.fund_id}:${record.aum_date}:${record.purpose}`;
                const correctionInfo = correctedRecordsMap.get(correctionKey);
                const effectiveDate = record.as_of_date || record.aum_date;
                return (
                  <Card className={`p-4 ${record.is_voided ? "opacity-50" : ""}`}>
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-2">
                        <CryptoIcon symbol={record.fund_asset || ""} className="h-6 w-6" />
                        <div>
                          <p className="font-medium">{record.fund_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(effectiveDate), "MMM d, yyyy HH:mm")}
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
          </div>
        )}
      </CardContent>
    </Card>
  );
}
