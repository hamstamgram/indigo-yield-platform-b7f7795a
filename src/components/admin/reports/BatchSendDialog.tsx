import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Button,
  Badge,
  Progress,
  ScrollArea,
  Checkbox,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Alert,
  AlertDescription,
} from "@/components/ui";
import { Loader2, Send, Check, X, AlertTriangle, Mail, FileText, RotateCcw } from "lucide-react";
import { logError } from "@/lib/logger";

interface InvestorSendStatus {
  id: string;
  name: string;
  email: string;
  recipientCount: number;
  recipientEmails: string[];
  isGenerated: boolean;
  isSent: boolean;
  isEligible: boolean;
  sendStatus?: "pending" | "sending" | "success" | "failed";
  error?: string;
}

interface BatchSendDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  periodName: string;
  investors: InvestorSendStatus[];
  onSendBatch: (
    investorIds: string[]
  ) => Promise<{ success: string[]; failed: { id: string; error: string }[] }>;
}

export function BatchSendDialog({
  open,
  onOpenChange,
  periodName,
  investors: initialInvestors,
  onSendBatch,
}: BatchSendDialogProps) {
  const [investors, setInvestors] = useState<InvestorSendStatus[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSending, setIsSending] = useState(false);
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState<"preflight" | "sending" | "complete">("preflight");
  const [results, setResults] = useState<{ success: number; failed: number }>({
    success: 0,
    failed: 0,
  });

  // Initialize investors when dialog opens
  useEffect(() => {
    if (open) {
      const processed = initialInvestors.map((inv) => ({
        ...inv,
        isEligible: inv.isGenerated && !inv.isSent && inv.recipientCount > 0,
        sendStatus: undefined as InvestorSendStatus["sendStatus"],
        error: undefined,
      }));
      setInvestors(processed);

      // Auto-select all eligible
      const eligible = new Set(processed.filter((i) => i.isEligible).map((i) => i.id));
      setSelectedIds(eligible);
      setPhase("preflight");
      setProgress(0);
      setResults({ success: 0, failed: 0 });
    }
  }, [open, initialInvestors]);

  const eligibleCount = investors.filter((i) => i.isEligible).length;
  const selectedCount = selectedIds.size;

  const toggleSelect = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const toggleSelectAll = () => {
    if (selectedCount === eligibleCount) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(investors.filter((i) => i.isEligible).map((i) => i.id)));
    }
  };

  const handleSend = async () => {
    if (selectedCount === 0) return;

    setIsSending(true);
    setPhase("sending");

    // Mark selected as pending
    setInvestors((prev) =>
      prev.map((inv) =>
        selectedIds.has(inv.id) ? { ...inv, sendStatus: "pending" as const } : inv
      )
    );

    try {
      const idsToSend = Array.from(selectedIds);

      // Simulate progress updates (the actual send is done in batch)
      const progressInterval = setInterval(() => {
        setProgress((p) => Math.min(p + 5, 95));
      }, 200);

      const result = await onSendBatch(idsToSend);
      clearInterval(progressInterval);

      // Update investor statuses based on results
      setInvestors((prev) =>
        prev.map((inv) => {
          if (result.success.includes(inv.id)) {
            return { ...inv, sendStatus: "success" as const, isSent: true };
          }
          const failure = result.failed.find((f) => f.id === inv.id);
          if (failure) {
            return { ...inv, sendStatus: "failed" as const, error: failure.error };
          }
          return inv;
        })
      );

      setResults({
        success: result.success.length,
        failed: result.failed.length,
      });
      setProgress(100);
      setPhase("complete");
    } catch (error) {
      logError("report.batchSend", error, { selectedCount: selectedIds.size });
      setInvestors((prev) =>
        prev.map((inv) =>
          selectedIds.has(inv.id)
            ? { ...inv, sendStatus: "failed" as const, error: "Batch operation failed" }
            : inv
        )
      );
      setPhase("complete");
    } finally {
      setIsSending(false);
    }
  };

  const handleRetryFailed = () => {
    const failedIds = investors.filter((i) => i.sendStatus === "failed").map((i) => i.id);
    setSelectedIds(new Set(failedIds));
    setPhase("preflight");
    setProgress(0);
  };

  const getStatusBadge = (investor: InvestorSendStatus) => {
    if (investor.sendStatus === "success") {
      return (
        <Badge variant="default" className="gap-1">
          <Check className="h-3 w-3" />
          Sent
        </Badge>
      );
    }
    if (investor.sendStatus === "failed") {
      return (
        <Badge variant="destructive" className="gap-1">
          <X className="h-3 w-3" />
          Failed
        </Badge>
      );
    }
    if (investor.sendStatus === "sending" || investor.sendStatus === "pending") {
      return (
        <Badge variant="secondary" className="gap-1">
          <Loader2 className="h-3 w-3 animate-spin" />
          Sending
        </Badge>
      );
    }
    if (investor.isSent) {
      return <Badge variant="outline">Already Sent</Badge>;
    }
    if (!investor.isGenerated) {
      return (
        <Badge variant="outline" className="text-muted-foreground">
          Not Generated
        </Badge>
      );
    }
    if (investor.recipientCount === 0) {
      return (
        <Badge variant="outline" className="text-amber-600">
          No Recipients
        </Badge>
      );
    }
    return <Badge variant="secondary">Ready</Badge>;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            Batch Send Statements
          </DialogTitle>
          <DialogDescription>
            Send statements to multiple investors for {periodName}
          </DialogDescription>
        </DialogHeader>

        {/* Progress bar during sending */}
        {phase === "sending" && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Sending statements...</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} />
          </div>
        )}

        {/* Results summary after complete */}
        {phase === "complete" && (
          <Alert className={results.failed > 0 ? "border-amber-500" : "border-green-500"}>
            <AlertDescription className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1 text-green-600">
                  <Check className="h-4 w-4" />
                  {results.success} sent successfully
                </span>
                {results.failed > 0 && (
                  <span className="flex items-center gap-1 text-destructive">
                    <X className="h-4 w-4" />
                    {results.failed} failed
                  </span>
                )}
              </div>
              {results.failed > 0 && (
                <Button variant="outline" size="sm" onClick={handleRetryFailed} className="gap-1">
                  <RotateCcw className="h-3 w-3" />
                  Retry Failed
                </Button>
              )}
            </AlertDescription>
          </Alert>
        )}

        {/* Pre-flight summary */}
        {phase === "preflight" && (
          <div className="flex gap-4 text-sm">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span>{eligibleCount} eligible</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 text-muted-foreground" />
              <span>{selectedCount} selected</span>
            </div>
          </div>
        )}

        {/* Investors table */}
        <ScrollArea className="flex-1 border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox
                    checked={selectedCount === eligibleCount && eligibleCount > 0}
                    onCheckedChange={toggleSelectAll}
                    disabled={phase !== "preflight" || eligibleCount === 0}
                  />
                </TableHead>
                <TableHead>Investor</TableHead>
                <TableHead className="text-center">
                  <div className="flex items-center justify-center gap-1">
                    <Mail className="h-3 w-3" />
                    Recipients
                  </div>
                </TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead>Error</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {investors.map((investor) => (
                <TableRow
                  key={investor.id}
                  className={investor.sendStatus === "failed" ? "bg-destructive/5" : ""}
                >
                  <TableCell>
                    <Checkbox
                      checked={selectedIds.has(investor.id)}
                      onCheckedChange={() => toggleSelect(investor.id)}
                      disabled={!investor.isEligible || phase !== "preflight"}
                    />
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{investor.name}</p>
                      <p className="text-xs text-muted-foreground">{investor.email}</p>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline">{investor.recipientCount}</Badge>
                  </TableCell>
                  <TableCell className="text-center">{getStatusBadge(investor)}</TableCell>
                  <TableCell className="text-sm text-destructive max-w-[200px] truncate">
                    {investor.error}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSending}>
            {phase === "complete" ? "Close" : "Cancel"}
          </Button>
          {phase === "preflight" && (
            <Button
              onClick={handleSend}
              disabled={selectedCount === 0 || isSending}
              className="gap-2"
            >
              <Send className="h-4 w-4" />
              Send {selectedCount} Statement{selectedCount !== 1 ? "s" : ""}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
