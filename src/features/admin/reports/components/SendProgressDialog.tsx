/**
 * Send Progress Dialog
 * Shows real-time progress during bulk email sends with failure tracking.
 */

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Button,
  Progress,
  Badge,
  ScrollArea,
} from "@/components/ui";
import { CheckCircle2, XCircle, Loader2, Send } from "lucide-react";

export interface SendProgress {
  total: number;
  sent: number;
  failed: number;
  current: string;
  failures: Array<{ name: string; error: string }>;
  isComplete: boolean;
}

interface SendProgressDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  progress: SendProgress;
}

export function SendProgressDialog({ open, onOpenChange, progress }: SendProgressDialogProps) {
  const { total, sent, failed, current, failures, isComplete } = progress;
  const processed = sent + failed;
  const pct = total > 0 ? Math.round((processed / total) * 100) : 0;

  return (
    <Dialog open={open} onOpenChange={isComplete ? onOpenChange : undefined}>
      <DialogContent
        className="max-w-md"
        onInteractOutside={(e) => !isComplete && e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isComplete ? (
              <CheckCircle2 className="h-5 w-5 text-yield" />
            ) : (
              <Loader2 className="h-5 w-5 animate-spin" />
            )}
            {isComplete ? "Delivery Complete" : "Sending Reports..."}
          </DialogTitle>
          <DialogDescription>
            {isComplete
              ? `${sent} of ${total} emails delivered successfully.`
              : `Sending to ${current}...`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Progress value={pct} className="h-2" />

          <div className="flex items-center justify-between text-sm">
            <div className="flex gap-3">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-yield" />
                {sent} sent
              </span>
              {failed > 0 && (
                <span className="flex items-center gap-1.5 text-destructive">
                  <XCircle className="h-3.5 w-3.5" />
                  {failed} failed
                </span>
              )}
            </div>
            <Badge variant="outline" className="text-xs">
              {processed}/{total}
            </Badge>
          </div>

          {failures.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-destructive">Failed deliveries:</p>
              <ScrollArea className="max-h-32 rounded-md border p-2">
                <div className="space-y-1.5">
                  {failures.map((f, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs">
                      <XCircle className="h-3.5 w-3.5 text-destructive shrink-0 mt-0.5" />
                      <div>
                        <span className="font-medium">{f.name}</span>
                        <span className="text-muted-foreground"> - {f.error}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}
        </div>

        {isComplete && (
          <DialogFooter>
            <Button onClick={() => onOpenChange(false)}>Close</Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
