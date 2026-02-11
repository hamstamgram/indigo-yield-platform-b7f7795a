/**
 * Add IB Commission Schedule Dialog
 *
 * Dialog for adding a new IB commission schedule entry with fund selector,
 * IB percentage, and effective date. Mirrors AddFeeScheduleDialog pattern.
 */

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Button,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAddIBScheduleEntry } from "@/hooks/data/investor/useIBSchedule";
import { getTodayString } from "@/utils/dateUtils";
import { QUERY_KEYS } from "@/constants/queryKeys";

interface AddIBScheduleDialogProps {
  investorId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddIBScheduleDialog({ investorId, open, onOpenChange }: AddIBScheduleDialogProps) {
  const [fundId, setFundId] = useState<string>("__all__");
  const [ibPct, setIbPct] = useState("");
  const [effectiveDate, setEffectiveDate] = useState(getTodayString());
  const [endDate, setEndDate] = useState("");

  const addMutation = useAddIBScheduleEntry();

  // Fetch active funds for the selector
  const { data: funds } = useQuery({
    queryKey: QUERY_KEYS.funds,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("funds")
        .select("id, name, code, asset")
        .eq("status", "active")
        .order("name");
      if (error) throw error;
      return data || [];
    },
    enabled: open,
  });

  const handleSubmit = () => {
    const pct = parseFloat(ibPct);
    if (isNaN(pct) || pct < 0 || pct > 100) {
      toast.error("IB percentage must be between 0 and 100");
      return;
    }

    if (!effectiveDate) {
      toast.error("Effective date is required");
      return;
    }

    if (endDate && endDate < effectiveDate) {
      toast.error("End date must be after effective date");
      return;
    }

    addMutation.mutate(
      {
        investorId,
        fundId: fundId === "__all__" ? null : fundId,
        ibPercentage: pct,
        effectiveDate,
        endDate: endDate || null,
      },
      {
        onSuccess: () => {
          toast.success("IB commission schedule entry added");
          resetForm();
          onOpenChange(false);
        },
        onError: (err) => {
          toast.error("Failed to add IB entry", {
            description: err instanceof Error ? err.message : "Unknown error",
          });
        },
      }
    );
  };

  const resetForm = () => {
    setFundId("__all__");
    setIbPct("");
    setEffectiveDate(getTodayString());
    setEndDate("");
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(val) => {
        if (!val) resetForm();
        onOpenChange(val);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add IB Commission Schedule Entry</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Fund Selector */}
          <div className="space-y-2">
            <Label>Fund</Label>
            <Select value={fundId} onValueChange={setFundId}>
              <SelectTrigger>
                <SelectValue placeholder="Select fund" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All Funds (global)</SelectItem>
                {(funds || []).map((f) => (
                  <SelectItem key={f.id} value={f.id}>
                    {f.name} ({f.asset})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* IB Percentage */}
          <div className="space-y-2">
            <Label htmlFor="ib-schedule-pct">IB Commission (%)</Label>
            <Input
              id="ib-schedule-pct"
              type="number"
              min={0}
              max={100}
              step={0.1}
              value={ibPct}
              onChange={(e) => setIbPct(e.target.value)}
              placeholder="e.g. 5"
              className="font-mono"
            />
          </div>

          {/* Effective Date */}
          <div className="space-y-2">
            <Label htmlFor="ib-schedule-effective">Effective Date</Label>
            <Input
              id="ib-schedule-effective"
              type="date"
              value={effectiveDate}
              onChange={(e) => setEffectiveDate(e.target.value)}
            />
          </div>

          {/* End Date (optional) */}
          <div className="space-y-2">
            <Label htmlFor="ib-schedule-end">
              End Date <span className="text-muted-foreground text-xs">(optional)</span>
            </Label>
            <Input
              id="ib-schedule-end"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={addMutation.isPending}
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={addMutation.isPending}>
            {addMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
            Add Entry
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
