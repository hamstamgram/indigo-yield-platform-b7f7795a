import { useState } from "react";
import { AlertTriangle, Database, Loader2, CheckCircle, XCircle, Archive } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface PreviewData {
  positions: number;
  performance_records: number;
  aum_records: number;
  transactions: number;
  investors_affected: number;
  funds_affected: number;
  total_aum: number;
}

interface ResetResult {
  success: boolean;
  batch_id: string;
  positions_reset: number;
  performance_archived: number;
  aum_archived: number;
  transactions_archived: number;
  total_aum_before: number;
}

export function PositionResetDialog() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"initial" | "preview" | "confirm" | "executing" | "complete" | "error">("initial");
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [confirmationCode, setConfirmationCode] = useState("");
  const [result, setResult] = useState<ResetResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const formatTokenAmount = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 8,
    }).format(value);
  };

  const resetState = () => {
    setStep("initial");
    setPreview(null);
    setConfirmationCode("");
    setResult(null);
    setError(null);
    setLoading(false);
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      resetState();
    }
    setOpen(newOpen);
  };

  const fetchPreview = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("Not authenticated");
      }

      const response = await supabase.functions.invoke("reset-positions", {
        body: { action: "preview" },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      if (response.data?.success) {
        setPreview(response.data.preview);
        setStep("preview");
      } else {
        throw new Error(response.data?.error || "Failed to fetch preview");
      }
    } catch (err) {
      console.error("Preview error:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch preview");
      setStep("error");
    } finally {
      setLoading(false);
    }
  };

  const executeReset = async () => {
    if (confirmationCode !== "RESET POSITIONS") {
      toast.error("Please type exactly: RESET POSITIONS");
      return;
    }

    setLoading(true);
    setStep("executing");
    setError(null);

    try {
      const response = await supabase.functions.invoke("reset-positions", {
        body: { 
          action: "execute",
          confirmationCode: confirmationCode 
        },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      if (response.data?.success) {
        setResult(response.data.result);
        setStep("complete");
        toast.success("All positions have been reset to zero");
      } else {
        throw new Error(response.data?.error || "Reset failed");
      }
    } catch (err) {
      console.error("Reset error:", err);
      setError(err instanceof Error ? err.message : "Reset failed");
      setStep("error");
      toast.error("Reset failed: " + (err instanceof Error ? err.message : "Unknown error"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="destructive" className="gap-2">
          <Database className="h-4 w-4" />
          Reset All Positions
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Reset All Investor Positions
          </DialogTitle>
          <DialogDescription>
            This will archive all current positions and reset balances to zero.
            This action is auditable and reversible via database restore.
          </DialogDescription>
        </DialogHeader>

        {/* Initial Step */}
        {step === "initial" && (
          <div className="space-y-4 py-4">
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Destructive Operation</AlertTitle>
              <AlertDescription>
                This will reset ALL investor positions, AUM, transactions, and performance data to zero.
                Use this only when preparing for a clean data re-entry.
              </AlertDescription>
            </Alert>

            <div className="text-sm text-muted-foreground space-y-2">
              <p><strong>What will be archived:</strong></p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>All investor positions (balances reset to 0)</li>
                <li>All fund performance records</li>
                <li>All fund daily AUM records</li>
                <li>All transaction history</li>
              </ul>
              <p className="mt-3"><strong>What will be preserved:</strong></p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Investor profiles and accounts</li>
                <li>Fund definitions</li>
                <li>User authentication</li>
                <li>Documents and KYC records</li>
              </ul>
            </div>
          </div>
        )}

        {/* Preview Step */}
        {step === "preview" && preview && (
          <div className="space-y-4 py-4">
            <Alert>
              <Archive className="h-4 w-4" />
              <AlertTitle>Data to be Archived & Reset</AlertTitle>
              <AlertDescription>
                Review the following data that will be affected by this operation.
              </AlertDescription>
            </Alert>

            <div className="grid grid-cols-2 gap-3">
              <Card>
                <CardContent className="pt-4">
                  <div className="text-2xl font-bold">{preview.positions}</div>
                  <div className="text-sm text-muted-foreground">Position Records</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="text-2xl font-bold">{formatTokenAmount(preview.total_aum)}</div>
                  <div className="text-sm text-muted-foreground">Total AUM</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="text-2xl font-bold">{preview.investors_affected}</div>
                  <div className="text-sm text-muted-foreground">Investors Affected</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="text-2xl font-bold">{preview.funds_affected}</div>
                  <div className="text-sm text-muted-foreground">Funds Affected</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="text-2xl font-bold">{preview.transactions}</div>
                  <div className="text-sm text-muted-foreground">Transactions</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="text-2xl font-bold">{preview.performance_records}</div>
                  <div className="text-sm text-muted-foreground">Performance Records</div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Confirm Step */}
        {step === "confirm" && (
          <div className="space-y-4 py-4">
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Final Confirmation Required</AlertTitle>
              <AlertDescription>
                Type <strong>RESET POSITIONS</strong> below to confirm this operation.
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Label htmlFor="confirmation">Confirmation Code</Label>
              <Input
                id="confirmation"
                placeholder="Type RESET POSITIONS"
                value={confirmationCode}
                onChange={(e) => setConfirmationCode(e.target.value)}
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground">
                This action cannot be undone through the UI. Archive data will be preserved for manual restoration.
              </p>
            </div>
          </div>
        )}

        {/* Executing Step */}
        {step === "executing" && (
          <div className="flex flex-col items-center justify-center py-8 space-y-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <div className="text-lg font-medium">Resetting Positions...</div>
            <div className="text-sm text-muted-foreground">
              Archiving data and resetting all balances to zero.
            </div>
          </div>
        )}

        {/* Complete Step */}
        {step === "complete" && result && (
          <div className="space-y-4 py-4">
            <Alert className="border-green-500 bg-green-50 dark:bg-green-950">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertTitle className="text-green-600">Reset Complete</AlertTitle>
              <AlertDescription>
                All positions have been archived and reset to zero.
              </AlertDescription>
            </Alert>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Batch ID:</span>
                <span className="font-mono text-xs">{result.batch_id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Positions Reset:</span>
                <span className="font-medium">{result.positions_reset}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Transactions Archived:</span>
                <span className="font-medium">{result.transactions_archived}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Previous AUM:</span>
                <span className="font-medium">{formatTokenAmount(result.total_aum_before)}</span>
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              Archive data is stored in *_archive tables and can be restored by database administrators.
            </p>
          </div>
        )}

        {/* Error Step */}
        {step === "error" && (
          <div className="space-y-4 py-4">
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertTitle>Operation Failed</AlertTitle>
              <AlertDescription>{error || "An unexpected error occurred"}</AlertDescription>
            </Alert>
          </div>
        )}

        <DialogFooter>
          {step === "initial" && (
            <>
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button 
                variant="destructive" 
                onClick={fetchPreview}
                disabled={loading}
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                View Impact
              </Button>
            </>
          )}

          {step === "preview" && (
            <>
              <Button variant="outline" onClick={() => setStep("initial")}>
                Back
              </Button>
              <Button 
                variant="destructive" 
                onClick={() => setStep("confirm")}
              >
                Proceed to Confirmation
              </Button>
            </>
          )}

          {step === "confirm" && (
            <>
              <Button variant="outline" onClick={() => setStep("preview")}>
                Back
              </Button>
              <Button 
                variant="destructive" 
                onClick={executeReset}
                disabled={loading || confirmationCode !== "RESET POSITIONS"}
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Execute Reset
              </Button>
            </>
          )}

          {(step === "complete" || step === "error") && (
            <Button onClick={() => handleOpenChange(false)}>
              Close
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
