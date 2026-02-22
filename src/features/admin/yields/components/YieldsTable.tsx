/**
 * Yields Table
 * Main yields table using ResponsiveTable with expandable rows for distributions
 */

import { useMemo, useState } from "react";
import { format } from "date-fns";
import { Check, X, Loader2, Columns, Users } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Badge,
  ResponsiveTable,
  Button,
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
  SortableTableHead,
  Input,
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui";
import { TrendingUp } from "lucide-react";
import { CryptoIcon } from "@/components/CryptoIcons";
import { FinancialValue } from "@/components/common/FinancialValue";
import { YieldActionsColumn } from "./YieldActionsColumn";
import { useSortableColumns } from "@/hooks/ui/useSortableColumns";
import type {
  DistributionRow,
  AllocationRow,
  InvestorProfile,
} from "@/services/admin/yields/yieldDistributionsPageService";

interface Fund {
  id: string;
  name: string;
  asset: string;
}

interface YieldsTableProps {
  distributions: DistributionRow[];
  allocationsMap: Record<string, AllocationRow[]>;
  investorMap: Record<string, InvestorProfile>;
  funds: Fund[];
  isLoading: boolean;
  canEdit: boolean;
  onVoid: (record: DistributionRow) => void;
}

export function YieldsTable({
  distributions,
  allocationsMap,
  investorMap,
  funds,
  isLoading,
  canEdit,
  onVoid,
}: YieldsTableProps) {
  // Column visibility state
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>({
    fund: true,
    effectiveDate: true,
    aum: false, // Hidden by default, prioritize Yield Deltas
    grossYield: true,
    netYield: true,
    fees: true,
    ib: true,
    investors: true,
    purpose: true,
    created: true,
    actions: true,
  });

  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({
    fund: "",
    effectiveDate: "",
    aum: "",
    purpose: "",
    created: "",
  });

  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  // Sort state
  const { sortConfig, requestSort, sortedData } = useSortableColumns(distributions, {
    column: "effective_date", // Default sort by date
    direction: "desc",
  });

  const getFund = (fundId: string) => funds.find((f) => f.id === fundId);

  const filteredData = useMemo(() => {
    // Step 1: Apply column filters if any are active
    const activeFilters = Object.entries(columnFilters).filter(([, value]) => value.trim() !== "");
    if (activeFilters.length === 0) return sortedData;

    return sortedData.filter((record) => {
      const fund = getFund(record.fund_id);
      const columnValues: Record<string, string> = {
        fund: `${fund?.name ?? ""} ${fund?.asset ?? ""}`.trim(),
        effectiveDate: record.effective_date
          ? format(new Date(record.effective_date), "MMM d, yyyy")
          : "",
        aum: `${record.recorded_aum}`,
        purpose: record.purpose ?? "",
        created: format(new Date(record.created_at), "MMM d, yyyy HH:mm"),
      };

      return activeFilters.every(([key, value]) =>
        (columnValues[key] || "").toLowerCase().includes(value.toLowerCase())
      );
    });
  }, [columnFilters, sortedData, funds]);

  const allColumns = [
    {
      id: "fund",
      header: (
        <SortableTableHead column="fund_id" currentSort={sortConfig} onSort={requestSort}>
          Fund
        </SortableTableHead>
      ),
      cell: (record: DistributionRow) => {
        const fund = getFund(record.fund_id);
        return (
          <div className="flex items-center gap-2">
            <CryptoIcon symbol={fund?.asset || ""} className="h-5 w-5" />
            <div>
              <p className="font-medium">{fund?.name || "Unknown Fund"}</p>
              <p className="text-xs text-muted-foreground">{fund?.asset}</p>
            </div>
          </div>
        );
      },
    },
    {
      id: "effectiveDate",
      header: (
        <SortableTableHead column="effective_date" currentSort={sortConfig} onSort={requestSort}>
          Effective Date
        </SortableTableHead>
      ),
      cell: (record: DistributionRow) => {
        const isVoided = record.is_voided;
        return (
          <div className="flex flex-col items-start gap-1">
            <span>
              {record.effective_date ? format(new Date(record.effective_date), "MMM d, yyyy") : "-"}
            </span>
            {isVoided && (
              <Badge variant="destructive" className="text-xs">
                Voided
              </Badge>
            )}
          </div>
        );
      },
    },
    {
      id: "aum",
      header: (
        <SortableTableHead
          column="recorded_aum"
          currentSort={sortConfig}
          onSort={requestSort}
          className="justify-end w-full"
        >
          AUM
        </SortableTableHead>
      ),
      className: "text-right",
      cell: (record: DistributionRow) => (
        <FinancialValue value={record.recorded_aum} asset={getFund(record.fund_id)?.asset} />
      ),
    },
    {
      id: "grossYield",
      header: (
        <SortableTableHead
          column="gross_yield"
          currentSort={sortConfig}
          onSort={requestSort}
          className="justify-end w-full"
        >
          Gross Yield
        </SortableTableHead>
      ),
      className: "text-right",
      cell: (record: DistributionRow) =>
        record.gross_yield != null ? (
          <FinancialValue value={record.gross_yield} asset={getFund(record.fund_id)?.asset} />
        ) : (
          <span className="text-muted-foreground">-</span>
        ),
    },
    {
      id: "netYield",
      header: (
        <SortableTableHead
          column="net_yield"
          currentSort={sortConfig}
          onSort={requestSort}
          className="justify-end w-full"
        >
          Net Yield
        </SortableTableHead>
      ),
      className: "text-right",
      cell: (record: DistributionRow) =>
        record.net_yield != null ? (
          <FinancialValue value={record.net_yield} asset={getFund(record.fund_id)?.asset} />
        ) : (
          <span className="text-muted-foreground">-</span>
        ),
    },
    {
      id: "fees",
      header: (
        <SortableTableHead
          column="total_fees"
          currentSort={sortConfig}
          onSort={requestSort}
          className="justify-end w-full"
        >
          Fees
        </SortableTableHead>
      ),
      className: "text-right",
      cell: (record: DistributionRow) =>
        record.total_fees != null ? (
          <FinancialValue value={record.total_fees} asset={getFund(record.fund_id)?.asset} />
        ) : (
          <span className="text-muted-foreground">-</span>
        ),
    },
    {
      id: "ib",
      header: (
        <SortableTableHead
          column="total_ib"
          currentSort={sortConfig}
          onSort={requestSort}
          className="justify-end w-full"
        >
          IB
        </SortableTableHead>
      ),
      className: "text-right",
      cell: (record: DistributionRow) =>
        record.total_ib != null ? (
          <FinancialValue value={record.total_ib} asset={getFund(record.fund_id)?.asset} />
        ) : (
          <span className="text-muted-foreground">-</span>
        ),
    },
    {
      id: "investors",
      header: "Investors",
      className: "text-center",
      cell: (record: DistributionRow) => {
        const hasAllocations = (allocationsMap[record.id]?.length || 0) > 0;
        return record.allocation_count != null ? (
          <Badge variant={hasAllocations ? "default" : "secondary"} className="font-mono">
            {record.allocation_count}
          </Badge>
        ) : (
          <span className="text-muted-foreground">-</span>
        );
      },
    },
    {
      id: "purpose",
      header: (
        <SortableTableHead column="purpose" currentSort={sortConfig} onSort={requestSort}>
          Purpose
        </SortableTableHead>
      ),
      cell: (record: DistributionRow) => (
        <Badge
          variant={record.purpose === "reporting" ? "default" : "secondary"}
          className={
            record.purpose === "reporting"
              ? "bg-green-900/30 text-green-400"
              : "bg-orange-900/30 text-orange-400"
          }
        >
          {record.purpose === "reporting" ? "Reporting" : "Transaction"}
        </Badge>
      ),
    },
    {
      id: "created",
      header: (
        <SortableTableHead column="created_at" currentSort={sortConfig} onSort={requestSort}>
          Created At
        </SortableTableHead>
      ),
      cell: (record: DistributionRow) => (
        <div className="text-sm">
          <p>{format(new Date(record.created_at), "MMM d, yyyy")}</p>
        </div>
      ),
    },
    {
      id: "actions",
      header: "Actions",
      className: "text-right",
      cell: (record: DistributionRow) => (
        <YieldActionsColumn
          record={record}
          canEdit={canEdit}
          onVoid={onVoid}
          isExpanded={expandedRows.has(record.id)}
          onViewHistory={() => {
            setExpandedRows((prev) => {
              const next = new Set(prev);
              if (next.has(record.id)) next.delete(record.id);
              else next.add(record.id);
              return next;
            });
          }}
          isVoided={record.is_voided ?? false}
        />
      ),
    },
  ];

  const visibleColumnsList = allColumns.filter((col) => visibleColumns[col.id]);

  const renderExpandedRow = (record: DistributionRow) => {
    const allocations = allocationsMap[record.id] || [];
    const fund = getFund(record.fund_id);
    const asset = fund?.asset;

    if (allocations.length === 0) {
      return (
        <div className="p-4 text-center text-muted-foreground text-sm italic bg-muted/20">
          No detailed allocations found for this distribution.
        </div>
      );
    }

    return (
      <div className="p-4 bg-muted/10">
        <div className="flex items-center gap-2 mb-3">
          <Users className="h-4 w-4 text-primary" />
          <h4 className="font-semibold text-sm">Investor Allocations</h4>
        </div>
        <div className="border rounded-md overflow-hidden bg-background">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow>
                <TableHead>Investor</TableHead>
                <TableHead className="text-right">Gross Amount</TableHead>
                <TableHead className="text-right">Fees</TableHead>
                <TableHead className="text-right">IB Comm.</TableHead>
                <TableHead className="text-right">Net Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {allocations.map((alloc) => {
                const profile = investorMap[alloc.investor_id];
                const name = profile
                  ? `${profile.first_name || ""} ${profile.last_name || ""}`.trim() || profile.email
                  : "Unknown Investor";

                return (
                  <TableRow key={alloc.id} className="text-sm">
                    <TableCell className="font-medium text-muted-foreground">{name}</TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      <FinancialValue value={alloc.gross_amount} asset={asset} />
                    </TableCell>
                    <TableCell className="text-right text-orange-500/80">
                      {alloc.fee_amount != null ? (
                        <FinancialValue value={alloc.fee_amount} asset={asset} />
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell className="text-right text-orange-500/80">
                      {alloc.ib_amount != null ? (
                        <FinancialValue value={alloc.ib_amount} asset={asset} />
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell className="text-right font-medium text-green-500/90">
                      <FinancialValue value={alloc.net_amount} asset={asset} />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>
    );
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Yield Distributions
            </CardTitle>
            <CardDescription>
              {filteredData.length} distribution{filteredData.length !== 1 ? "s" : ""} found
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
            No yield distributions found. Adjust filters or record yields first.
          </div>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
              <Input
                placeholder="Filter fund"
                value={columnFilters.fund}
                onChange={(event) =>
                  setColumnFilters((prev) => ({ ...prev, fund: event.target.value }))
                }
              />
              <Input
                placeholder="Filter effective date"
                value={columnFilters.effectiveDate}
                onChange={(event) =>
                  setColumnFilters((prev) => ({ ...prev, effectiveDate: event.target.value }))
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
              <Button
                variant="outline"
                onClick={() =>
                  setColumnFilters({
                    fund: "",
                    effectiveDate: "",
                    aum: "",
                    purpose: "",
                    created: "",
                  })
                }
                className="w-full"
              >
                Clear column filters
              </Button>
            </div>

            <ResponsiveTable<DistributionRow>
              data={filteredData}
              keyExtractor={(r) => r.id}
              emptyMessage="No distributions found"
              columns={visibleColumnsList}
              expandedRows={expandedRows}
              expandedRowRenderer={renderExpandedRow}
              mobileCardRenderer={(record) => {
                const fund = getFund(record.fund_id);
                const isExpanded = expandedRows.has(record.id);

                return (
                  <Card className={`p-4 ${record.is_voided ? "opacity-50" : ""}`}>
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-2">
                        <CryptoIcon symbol={fund?.asset || ""} className="h-6 w-6" />
                        <div>
                          <p className="font-medium">{fund?.name || "Unknown Fund"}</p>
                          <p className="text-xs text-muted-foreground">
                            {record.effective_date
                              ? format(new Date(record.effective_date), "MMM d, yyyy")
                              : "-"}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <Badge
                          variant={record.purpose === "reporting" ? "default" : "secondary"}
                          className={
                            record.purpose === "reporting"
                              ? "bg-green-900/30 text-green-400"
                              : "bg-orange-900/30 text-orange-400"
                          }
                        >
                          {record.purpose === "reporting" ? "Reporting" : "Transaction"}
                        </Badge>
                        {record.is_voided && (
                          <Badge variant="destructive" className="text-xs">
                            Voided
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                      <div>
                        <span className="text-muted-foreground text-xs">Total AUM</span>
                        <div className="font-medium">
                          <FinancialValue value={record.recorded_aum} asset={fund?.asset} />
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-muted-foreground text-xs">Investors</span>
                        <div className="font-medium">{record.allocation_count || "-"}</div>
                      </div>
                    </div>
                    {record.gross_yield != null && (
                      <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                        <div>
                          <span className="text-muted-foreground text-xs">Gross Yield</span>
                          <div className="font-medium">
                            <FinancialValue value={record.gross_yield} asset={fund?.asset} />
                          </div>
                        </div>
                        <div>
                          <span className="text-muted-foreground text-xs">Net Yield</span>
                          <div className="font-medium">
                            <FinancialValue value={record.net_yield || 0} asset={fund?.asset} />
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="flex justify-between items-center pt-2 border-t">
                      <div className="text-xs text-muted-foreground">
                        {format(new Date(record.created_at), "MMM d, yyyy")}
                      </div>
                      <YieldActionsColumn
                        record={record}
                        canEdit={canEdit}
                        onVoid={onVoid}
                        isExpanded={isExpanded}
                        onViewHistory={() => {
                          setExpandedRows((prev) => {
                            const next = new Set(prev);
                            if (next.has(record.id)) next.delete(record.id);
                            else next.add(record.id);
                            return next;
                          });
                        }}
                        isVoided={record.is_voided ?? false}
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
