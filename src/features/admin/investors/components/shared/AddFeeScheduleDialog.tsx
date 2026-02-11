/**
 * Add Fee Schedule Dialog
 *
 * Dialog for adding a new fee schedule entry with fund selector,
 * fee percentage, and effective date.
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
import { useAddFeeScheduleEntry } from "@/hooks/data/investor/useFeeSchedule";
import { getTodayString } from "@/utils/dateUtils";
import { QUERY_KEYS } from "@/constants/queryKeys";

interface AddFeeScheduleDialogProps {
  investorId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddFeeScheduleDialog({
  investorId,
  open,
  onOpenChange,
}: AddFeeScheduleDialogProps) {
  const [fundId, setFundId] = useState<string>("__all__");
  const [feePct, setFeePct] = useState("");
  const [effectiveDate, setEffectiveDate] = useState(getTodayString());
  const [endDate, setEndDate] = useState("");

  const addMutation = useAddFeeScheduleEntry();

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
    const pct = parseFloat(feePct);
    if (isNaN(pct) || pct < 0 || pct > 100) {
      toast.error("Fee must be between 0 and 100");
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
        feePct: pct,
        effectiveDate,
        endDate: endDate || null,
      },
      {
        onSuccess: () => {
          toast.success("Fee schedule entry added");
          resetForm();
          onOpenChange(false);
        },
        onError: (err) => {
          toast.error("Failed to add fee entry", {
            description: err instanceof Error ? err.message : "Unknown error",
          });
        },
      }
    );
  };

  const resetForm = () => {
    setFundId("__all__");
    setFeePct("");
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
          <DialogTitle>Add Fee Schedule Entry</DialogTitle>
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

          {/* Fee Percentage */}
          <div className="space-y-2">
            <Label htmlFor="schedule-fee">Fee Percentage (%)</Label>
            <Input
              id="schedule-fee"
              type="number"
              min={0}
              max={100}
              step={0.1}
              value={feePct}
              onChange={(e) => setFeePct(e.target.value)}
              placeholder="e.g. 20"
              className="font-mono"
            />
          </div>

          {/* Effective Date */}
          <div className="space-y-2">
            <Label htmlFor="schedule-effective">Effective Date</Label>
            <Input
              id="schedule-effective"
              type="date"
              value={effectiveDate}
              onChange={(e) => setEffectiveDate(e.target.value)}
            />
          </div>

          {/* End Date (optional) */}
          <div className="space-y-2">
            <Label htmlFor="schedule-end">
              End Date <span className="text-muted-foreground text-xs">(optional)</span>
            </Label>
            <Input
              id="schedule-end"
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
