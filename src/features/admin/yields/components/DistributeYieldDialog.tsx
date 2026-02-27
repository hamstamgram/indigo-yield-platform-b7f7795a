/**
 * DistributeYieldDialog — ceremonious confirmation modal for yield distribution.
 * Three states: confirm → processing (1.5s) → success.
 */
import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Loader2, TrendingUp, Users } from "lucide-react";
import { cn } from "@/lib/utils";

interface DistributeYieldDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  grossYield: string;
  asset: string;
  fundName: string;
  investorCount: number;
  onConfirm: () => void;
  isLoading: boolean;
}

type Phase = "confirm" | "processing" | "success";

export function DistributeYieldDialog({
  open,
  onOpenChange,
  grossYield,
  asset,
  fundName,
  investorCount,
  onConfirm,
  isLoading,
}: DistributeYieldDialogProps) {
  const [phase, setPhase] = useState<Phase>("confirm");

  // Reset phase when dialog opens
  useEffect(() => {
    if (open) setPhase("confirm");
  }, [open]);

  // When external loading starts, move to processing then success
  useEffect(() => {
    if (isLoading && phase === "confirm") {
      setPhase("processing");
    }
    if (!isLoading && phase === "processing") {
      // Brief processing display before success
      const t = setTimeout(() => setPhase("success"), 400);
      return () => clearTimeout(t);
    }
  }, [isLoading, phase]);

  const handleConfirm = () => {
    setPhase("processing");
    onConfirm();
  };

  const handleClose = () => {
    if (phase === "processing") return; // block close during processing
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        className="max-w-md glass-panel border-white/10 p-0 overflow-hidden"
        onInteractOutside={(e) => {
          if (phase === "processing") e.preventDefault();
        }}
      >
        {/* Top accent bar */}
        <div
          className="h-1 w-full"
          style={{
            background: "linear-gradient(90deg, hsl(var(--indigo-brand)), hsl(var(--yield-neon)))",
          }}
        />

        <div className="p-7">
          {/* CONFIRM PHASE */}
          {phase === "confirm" && (
            <>
              <DialogHeader className="mb-6">
                <DialogTitle className="flex items-center gap-3 text-xl text-white">
                  <div className="h-9 w-9 rounded-full bg-indigo-500/15 flex items-center justify-center border border-indigo-500/20">
                    <TrendingUp className="h-4 w-4 text-indigo-400" />
                  </div>
                  Distribute Yield
                </DialogTitle>
                <DialogDescription className="text-slate-400 mt-1">
                  Review and confirm the distribution below.
                </DialogDescription>
              </DialogHeader>

              {/* Stats */}
              <div className="rounded-xl border border-white/8 bg-white/[0.03] divide-y divide-white/5 mb-6">
                <div className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <TrendingUp className="h-3.5 w-3.5" />
                    Gross Yield
                  </div>
                  <span
                    className="text-xl font-bold tabular-nums tracking-tight"
                    style={{ color: "hsl(var(--yield-neon))" }}
                  >
                    +{grossYield} {asset}
                  </span>
                </div>
                <div className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Users className="h-3.5 w-3.5" />
                    Recipients
                  </div>
                  <span className="text-sm font-semibold text-white">
                    {investorCount} investor{investorCount !== 1 ? "s" : ""}
                  </span>
                </div>
                <div className="flex items-center justify-between px-4 py-3">
                  <span className="text-sm text-muted-foreground">Fund</span>
                  <span className="text-sm font-semibold text-white">{fundName}</span>
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1 border-white/10 text-muted-foreground hover:text-white"
                  onClick={handleClose}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/25"
                  onClick={handleConfirm}
                >
                  Confirm Distribution
                </Button>
              </div>
            </>
          )}

          {/* PROCESSING PHASE */}
          {phase === "processing" && (
            <div className="flex flex-col items-center justify-center py-10 gap-5">
              <div className="h-14 w-14 rounded-full bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
                <Loader2 className="h-6 w-6 text-indigo-400 animate-spin" />
              </div>
              <div className="text-center">
                <p className="text-white font-semibold text-lg">Processing distribution…</p>
                <p className="text-muted-foreground text-sm mt-1">
                  Distributing yield to {investorCount} investor{investorCount !== 1 ? "s" : ""}
                </p>
              </div>
            </div>
          )}

          {/* SUCCESS PHASE */}
          {phase === "success" && (
            <div className="flex flex-col items-center justify-center py-10 gap-5">
              <div
                className={cn(
                  "h-14 w-14 rounded-full flex items-center justify-center border",
                  "bg-emerald-500/10 border-emerald-500/20"
                )}
              >
                <CheckCircle2 className="h-7 w-7 text-emerald-400" />
              </div>
              <div className="text-center">
                <p className="text-white font-semibold text-lg">Distribution complete</p>
                <p className="text-muted-foreground text-sm mt-1">
                  {grossYield} {asset} distributed to {investorCount} investor
                  {investorCount !== 1 ? "s" : ""}
                </p>
              </div>
              <Button
                className="mt-2 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/20"
                onClick={handleClose}
              >
                Done
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
