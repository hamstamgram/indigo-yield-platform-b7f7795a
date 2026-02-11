/**
 * Fee Schedule Section
 * Displays and manages per-fund fee schedule entries for an investor
 */

import { useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Button,
  Input,
  Label,
  Badge,
} from "@/components/ui";
import { Loader2, Plus, Trash2, Calendar, Percent } from "lucide-react";
import {
  useFeeSchedule,
  useAddFeeScheduleEntry,
  useDeleteFeeScheduleEntry,
} from "@/hooks/data/investor";
import { useFunds } from "@/hooks/data";
import { format } from "date-fns";

interface FeeScheduleSectionProps {
  investorId: string;
}

export function FeeScheduleSection({ investorId }: FeeScheduleSectionProps) {
  const { data: entries, isLoading } = useFeeSchedule(investorId);
  const { data: funds } = useFunds();
  const addEntry = useAddFeeScheduleEntry();
  const deleteEntry = useDeleteFeeScheduleEntry();

  const [showForm, setShowForm] = useState(false);
  const [fundId, setFundId] = useState<string>("");
  const [feePct, setFeePct] = useState("");
  const [effectiveDate, setEffectiveDate] = useState(
    format(new Date(), "yyyy-MM-dd")
  );

  const handleAdd = async () => {
    const pct = parseFloat(feePct);
    if (isNaN(pct) || pct < 0 || pct > 100) return;

    await addEntry.mutateAsync({
      investorId,
      fundId: fundId || null,
      feePct: pct,
      effectiveDate,
    });

    setShowForm(false);
    setFundId("");
    setFeePct("");
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Calendar className="h-5 w-5" />
              Per-Fund Fee Schedule
            </CardTitle>
            <CardDescription>
              Date-based fee overrides per fund (higher priority than global fee)
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowForm(!showForm)}
          >
            <Plus className="h-4 w-4 mr-1" />
            Add
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {showForm && (
          <div className="p-3 rounded-lg border bg-muted/30 space-y-3">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-1">
                <Label className="text-xs">Fund</Label>
                <select
                  className="w-full h-9 rounded-md border bg-background px-3 text-sm"
                  value={fundId}
                  onChange={(e) => setFundId(e.target.value)}
                >
                  <option value="">All Funds</option>
                  {(funds || [])
                    .filter((f: any) => f.status === "active")
                    .map((f: any) => (
                      <option key={f.id} value={f.id}>
                        {f.name}
                      </option>
                    ))}
                </select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Fee %</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  placeholder="e.g. 25"
                  value={feePct}
                  onChange={(e) => setFeePct(e.target.value)}
                  className="font-mono"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Effective Date</Label>
                <Input
                  type="date"
                  value={effectiveDate}
                  onChange={(e) => setEffectiveDate(e.target.value)}
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleAdd}
                disabled={addEntry.isPending || !feePct}
              >
                {addEntry.isPending && (
                  <Loader2 className="h-3 w-3 animate-spin mr-1" />
                )}
                Save
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowForm(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {(!entries || entries.length === 0) && !showForm && (
          <p className="text-sm text-muted-foreground text-center py-4">
            No per-fund fee schedule entries. The global fee or fund default
            applies.
          </p>
        )}

        {(entries || []).map((entry) => (
          <div
            key={entry.id}
            className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
          >
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="font-mono">
                <Percent className="h-3 w-3 mr-1" />
                {entry.fee_pct}%
              </Badge>
              <div>
                <p className="text-sm font-medium">
                  {entry.fund?.name || "All Funds"}
                </p>
                <p className="text-xs text-muted-foreground">
                  From {entry.effective_date}
                  {entry.end_date ? ` to ${entry.end_date}` : ""}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="text-destructive hover:text-destructive"
              onClick={() =>
                deleteEntry.mutate({ entryId: entry.id, investorId })
              }
              disabled={deleteEntry.isPending}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
