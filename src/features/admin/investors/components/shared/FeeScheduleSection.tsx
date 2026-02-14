/**
 * Fee Schedule Section
 *
 * Displays per-fund fee schedule entries for an investor.
 * Allows add/delete of fee schedule overrides.
 */

import { useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Button,
  Badge,
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui";
import { CalendarDays, Plus, Trash2, Loader2, Save, Percent } from "lucide-react";
import { toast } from "sonner";
import { useFeeSchedule, useDeleteFeeScheduleEntry } from "@/hooks/data/investor/useFeeSchedule";
import {
  useInvestorProfileSettings,
  useUpdatePerformanceFee,
} from "@/hooks/data/investor/useInvestorSettings";
import { Input, Label } from "@/components/ui";
import { AddFeeScheduleDialog } from "./AddFeeScheduleDialog";

interface FeeScheduleSectionProps {
  investorId: string;
}

export function FeeScheduleSection({ investorId }: FeeScheduleSectionProps) {
  const { data: profile } = useInvestorProfileSettings(investorId);
  const { data: entries, isLoading } = useFeeSchedule(investorId);
  const deleteMutation = useDeleteFeeScheduleEntry();
  const updatePerformanceFeeMutation = useUpdatePerformanceFee();

  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [globalFeePct, setGlobalFeePct] = useState<number>(20);
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    fundName: string;
  } | null>(null);

  // Sync global fee state
  const [initialSync, setInitialSync] = useState(false);
  if (profile && !initialSync) {
    setGlobalFeePct(profile.feePct);
    setInitialSync(true);
  }

  const handleSaveGlobalFee = async () => {
    try {
      await updatePerformanceFeeMutation.mutateAsync({
        investorId,
        feePct: globalFeePct,
      });
      toast.success("Global performance fee updated");
    } catch (err) {
      toast.error("Failed to update global fee");
    }
  };

  const handleDelete = () => {
    if (!deleteTarget) return;

    deleteMutation.mutate(
      { entryId: deleteTarget.id, investorId },
      {
        onSuccess: () => {
          toast.success("Fee schedule entry removed");
          setDeleteTarget(null);
        },
        onError: (err) => {
          toast.error("Failed to delete fee entry", {
            description: err instanceof Error ? err.message : "Unknown error",
          });
        },
      }
    );
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-6">
          <div className="animate-pulse h-16 bg-muted rounded" />
        </CardContent>
      </Card>
    );
  }

  const scheduleEntries = entries || [];

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <CalendarDays className="h-4 w-4" />
                Fee Management
              </CardTitle>
              <CardDescription>Configure global defaults and per-fund overrides</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Global Performance Fee */}
          <div className="space-y-4 pb-4 border-b">
            <div className="space-y-2 max-w-sm">
              <Label htmlFor="global-fee-pct" className="text-sm font-medium">
                Global Performance Fee (%)
              </Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    id="global-fee-pct"
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={globalFeePct}
                    onChange={(e) => setGlobalFeePct(parseFloat(e.target.value) || 0)}
                    className="pr-8 font-mono"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                    %
                  </span>
                </div>
                <Button
                  size="sm"
                  onClick={handleSaveGlobalFee}
                  disabled={updatePerformanceFeeMutation.isPending}
                >
                  {updatePerformanceFeeMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-1 text-xs" />
                  )}
                  Save
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Default performance fee applied to all funds unless overridden below.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-semibold">Per-Fund Fee Overrides</h4>
              <p className="text-xs text-muted-foreground">
                Overrides take priority over the global fee default.
              </p>
            </div>
            <Button size="sm" variant="outline" onClick={() => setAddDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-1" />
              Add Override
            </Button>
          </div>
          {scheduleEntries.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No per-fund fee schedule entries. The global fee override or fund default will be
              used.
            </p>
          ) : (
            <div className="space-y-2">
              {/* Header */}
              <div className="grid grid-cols-[1fr_80px_100px_100px_40px] gap-2 text-xs font-medium text-muted-foreground px-2">
                <span>Fund</span>
                <span>Fee %</span>
                <span>Effective</span>
                <span>Ends</span>
                <span />
              </div>

              {/* Rows */}
              {scheduleEntries.map((entry) => {
                const fundName =
                  (entry.fund as { name: string } | null)?.name ||
                  (entry.fund_id ? "Unknown Fund" : "All Funds");
                const endDate = (entry as Record<string, unknown>).end_date as
                  | string
                  | null
                  | undefined;

                return (
                  <div
                    key={entry.id}
                    className="grid grid-cols-[1fr_80px_100px_100px_40px] gap-2 items-center text-sm px-2 py-1.5 rounded hover:bg-muted/50"
                  >
                    <span className="truncate font-medium">{fundName}</span>
                    <Badge variant="outline" className="font-mono text-xs w-fit">
                      {entry.fee_pct}%
                    </Badge>
                    <span className="text-muted-foreground text-xs">{entry.effective_date}</span>
                    <span className="text-muted-foreground text-xs">{endDate || "-"}</span>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      onClick={() => setDeleteTarget({ id: entry.id, fundName })}
                    >
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Dialog */}
      <AddFeeScheduleDialog
        investorId={investorId}
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Fee Schedule Entry</AlertDialogTitle>
            <AlertDialogDescription>
              Remove the fee schedule entry for <strong>{deleteTarget?.fundName}</strong>? The
              investor will fall back to their global fee override or the fund default.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
              ) : (
                <Trash2 className="h-4 w-4 mr-1" />
              )}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
