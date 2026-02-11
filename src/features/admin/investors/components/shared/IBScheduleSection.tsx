/**
 * IB Commission Schedule Section
 *
 * Displays per-fund IB commission schedule entries for an investor.
 * Allows add/delete of IB commission schedule overrides.
 * Mirrors FeeScheduleSection pattern.
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
import { useIBSchedule, useDeleteIBScheduleEntry } from "@/hooks/data/investor/useIBSchedule";
import { AddIBScheduleDialog } from "./AddIBScheduleDialog";

interface IBScheduleSectionProps {
  investorId: string;
}

export function IBScheduleSection({ investorId }: IBScheduleSectionProps) {
  const { data: entries, isLoading } = useIBSchedule(investorId);
  const deleteMutation = useDeleteIBScheduleEntry();
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
          toast.success("IB schedule entry removed");
          setDeleteTarget(null);
        },
        onError: (err) => {
          toast.error("Failed to delete IB entry", {
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
                IB Commission Schedule
              </CardTitle>
              <CardDescription>
                Per-fund IB commission overrides with date ranges. Takes priority over the global IB
                percentage above.
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
              No per-fund IB commission schedule entries. The global IB percentage or profile
              default will be used.
            </p>
          ) : (
            <div className="space-y-2">
              {/* Header */}
              <div className="grid grid-cols-[1fr_80px_100px_100px_40px] gap-2 text-xs font-medium text-muted-foreground px-2">
                <span>Fund</span>
                <span>IB %</span>
                <span>Effective</span>
                <span>Ends</span>
                <span />
              </div>

              {/* Rows */}
              {scheduleEntries.map((entry) => {
                const fundName =
                  (entry.fund as { name: string } | null)?.name ||
                  (entry.fund_id ? "Unknown Fund" : "All Funds");

                return (
                  <div
                    key={entry.id}
                    className="grid grid-cols-[1fr_80px_100px_100px_40px] gap-2 items-center text-sm px-2 py-1.5 rounded hover:bg-muted/50"
                  >
                    <span className="truncate font-medium">{fundName}</span>
                    <Badge variant="outline" className="font-mono text-xs w-fit">
                      {entry.ib_percentage}%
                    </Badge>
                    <span className="text-muted-foreground text-xs">{entry.effective_date}</span>
                    <span className="text-muted-foreground text-xs">{entry.end_date || "-"}</span>
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
      <AddIBScheduleDialog
        investorId={investorId}
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete IB Commission Schedule Entry</AlertDialogTitle>
            <AlertDialogDescription>
              Remove the IB commission schedule entry for <strong>{deleteTarget?.fundName}</strong>?
              The investor will fall back to their global IB percentage or profile default.
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
