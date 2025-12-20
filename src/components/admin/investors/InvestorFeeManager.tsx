/**
 * Investor Fee Manager - Compact fee schedule management
 * Used within InvestorYieldManager as a collapsible section
 */

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Trash2, Percent, History } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";

interface FeeScheduleEntry {
  id: string;
  investor_id: string;
  fund_id: string | null;
  fee_pct: number;
  effective_date: string;
  fund?: { name: string } | null;
}

interface Fund {
  id: string;
  name: string;
}

interface InvestorFeeManagerProps {
  investorId: string;
  onUpdate?: () => void;
}

export function InvestorFeeManager({ investorId, onUpdate }: InvestorFeeManagerProps) {
  const [feeSchedule, setFeeSchedule] = useState<FeeScheduleEntry[]>([]);
  const [funds, setFunds] = useState<Fund[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteEntry, setDeleteEntry] = useState<{ id: string; fundName: string } | null>(null);
  
  // Form state
  const [newFeeFundId, setNewFeeFundId] = useState<string>("all");
  const [newFeePercent, setNewFeePercent] = useState<string>("");
  const [newFeeEffectiveDate, setNewFeeEffectiveDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [isAdding, setIsAdding] = useState(false);

  const fetchFeeSchedule = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("investor_fee_schedule")
        .select("*, fund:funds(name)")
        .eq("investor_id", investorId)
        .order("effective_date", { ascending: false });

      if (error) throw error;
      setFeeSchedule(data || []);
    } catch (error) {
      console.error("Error loading fee schedule:", error);
    }
  }, [investorId]);

  const fetchFunds = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("funds")
        .select("id, name")
        .eq("status", "active")
        .order("name");

      if (error) throw error;
      setFunds(data || []);
    } catch (error) {
      console.error("Error loading funds:", error);
    }
  }, []);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchFeeSchedule(), fetchFunds()]);
      setLoading(false);
    };
    loadData();
  }, [fetchFeeSchedule, fetchFunds]);

  const getCurrentFee = () => {
    const today = new Date().toISOString().split("T")[0];
    const activeFees = feeSchedule.filter((f) => f.effective_date <= today);
    return activeFees.length > 0 ? activeFees[0] : null;
  };

  const handleAddFee = async () => {
    if (!newFeePercent || isNaN(parseFloat(newFeePercent))) {
      toast.error("Please enter a valid fee percentage");
      return;
    }

    const feeValue = parseFloat(newFeePercent);
    if (feeValue < 0 || feeValue > 100) {
      toast.error("Fee must be between 0 and 100%");
      return;
    }

    setIsAdding(true);
    try {
      const { error } = await supabase.from("investor_fee_schedule").insert({
        investor_id: investorId,
        fund_id: newFeeFundId === "all" ? null : newFeeFundId,
        fee_pct: feeValue / 100, // Convert to decimal
        effective_date: newFeeEffectiveDate,
      });

      if (error) throw error;

      toast.success("Fee schedule entry added");
      setNewFeePercent("");
      setNewFeeFundId("all");
      setNewFeeEffectiveDate(new Date().toISOString().split("T")[0]);
      
      await fetchFeeSchedule();
      onUpdate?.();
    } catch (error) {
      console.error("Error adding fee:", error);
      toast.error("Failed to add fee schedule entry");
    } finally {
      setIsAdding(false);
    }
  };

  const handleDeleteFee = async (id: string) => {
    try {
      const { error } = await supabase
        .from("investor_fee_schedule")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast.success("Fee entry deleted");
      await fetchFeeSchedule();
      onUpdate?.();
    } catch (error) {
      console.error("Error deleting fee:", error);
      toast.error("Failed to delete fee entry");
    }
  };

  const currentFee = getCurrentFee();

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Percent className="h-4 w-4" />
          Fee Schedule
        </CardTitle>
        <CardDescription>Manage fee percentages by fund</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Active Fee */}
        <div className="p-3 bg-muted/50 rounded-lg flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">Current Active Fee</p>
            <p className="text-xl font-bold font-mono">
              {currentFee ? `${(currentFee.fee_pct * 100).toFixed(2)}%` : "2.00% (default)"}
            </p>
          </div>
          {currentFee?.fund && (
            <Badge variant="outline">{currentFee.fund.name}</Badge>
          )}
        </div>

        {/* Add New Fee Form */}
        <div className="grid grid-cols-4 gap-3 items-end">
          <div className="space-y-1">
            <Label className="text-xs">Fund</Label>
            <Select value={newFeeFundId} onValueChange={setNewFeeFundId}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Select fund" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Funds</SelectItem>
                {funds.map((fund) => (
                  <SelectItem key={fund.id} value={fund.id}>
                    {fund.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-1">
            <Label className="text-xs">Fee %</Label>
            <div className="relative">
              <Input
                type="number"
                step="0.01"
                min="0"
                max="100"
                placeholder="2.00"
                value={newFeePercent}
                onChange={(e) => setNewFeePercent(e.target.value)}
                className="h-9 pr-6"
              />
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                %
              </span>
            </div>
          </div>
          
          <div className="space-y-1">
            <Label className="text-xs">Effective Date</Label>
            <Input
              type="date"
              value={newFeeEffectiveDate}
              onChange={(e) => setNewFeeEffectiveDate(e.target.value)}
              className="h-9"
            />
          </div>
          
          <Button onClick={handleAddFee} disabled={isAdding} size="sm" className="h-9">
            <Plus className="h-4 w-4 mr-1" />
            Add
          </Button>
        </div>

        {/* Fee History */}
        {feeSchedule.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <History className="h-3 w-3" />
              Fee History
            </div>
            <div className="border rounded-md overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead className="text-xs h-8">Fund</TableHead>
                    <TableHead className="text-xs h-8">Fee</TableHead>
                    <TableHead className="text-xs h-8">Effective</TableHead>
                    <TableHead className="text-xs h-8 w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {feeSchedule.slice(0, 5).map((entry) => {
                    const isActive = entry.id === currentFee?.id;
                    return (
                      <TableRow key={entry.id} className={isActive ? "bg-primary/5" : ""}>
                        <TableCell className="text-xs py-2">
                          {entry.fund?.name || "All Funds"}
                          {isActive && (
                            <Badge variant="default" className="ml-2 text-[10px] px-1 py-0">
                              Active
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-xs py-2 font-mono">
                          {(entry.fee_pct * 100).toFixed(2)}%
                        </TableCell>
                        <TableCell className="text-xs py-2">
                          {format(new Date(entry.effective_date), "MMM d, yyyy")}
                        </TableCell>
                        <TableCell className="py-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => setDeleteEntry({ 
                              id: entry.id, 
                              fundName: entry.fund?.name || "All Funds" 
                            })}
                          >
                            <Trash2 className="h-3 w-3 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
            {feeSchedule.length > 5 && (
              <p className="text-xs text-muted-foreground text-center">
                +{feeSchedule.length - 5} more entries
              </p>
            )}
          </div>
        )}

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={!!deleteEntry} onOpenChange={(open) => !open && setDeleteEntry(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Fee Entry</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete the fee entry for {deleteEntry?.fundName}? 
                This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={() => {
                  if (deleteEntry) {
                    handleDeleteFee(deleteEntry.id);
                    setDeleteEntry(null);
                  }
                }}
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}
