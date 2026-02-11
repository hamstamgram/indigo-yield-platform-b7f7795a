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
import { CalendarDays, Plus, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useFeeSchedule, useDeleteFeeScheduleEntry } from "@/hooks/data/investor/useFeeSchedule";
import { AddFeeScheduleDialog } from "./AddFeeScheduleDialog";

interface FeeScheduleSectionProps {
  investorId: string;
}

export function FeeScheduleSection({ investorId }: FeeScheduleSectionProps) {
  const { data: entries, isLoading } = useFeeSchedule(investorId);
  const deleteMutation = useDeleteFeeScheduleEntry();
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    fundName: string;
  } | null>(null);

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
                Fee Schedule
              </CardTitle>
              <CardDescription>
                Per-fund fee overrides with date ranges. Takes priority over the global fee override
                above.
              </CardDescription>
            </div>
            <Button size="sm" variant="outline" onClick={() => setAddDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-1" />
              Add
            </Button>
          </div>
        </CardHeader>
        <CardContent>
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
