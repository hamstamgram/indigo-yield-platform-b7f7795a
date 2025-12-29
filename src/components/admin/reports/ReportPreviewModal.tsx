import { useState } from "react";
import { sanitizeHtml } from "@/utils/sanitize";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
  Button, Badge,
  ToggleGroup, ToggleGroupItem,
} from "@/components/ui";
import { Monitor, Smartphone, Download, X } from "lucide-react";

interface ReportPreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  htmlContent: string;
  investorName: string;
  periodName: string;
  recipientEmails?: string[];
}

export function ReportPreviewModal({
  open,
  onOpenChange,
  htmlContent,
  investorName,
  periodName,
  recipientEmails = [],
}: ReportPreviewModalProps) {
  const [viewMode, setViewMode] = useState<"desktop" | "mobile">("desktop");

  const handleDownloadHTML = () => {
    const blob = new Blob([htmlContent], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `statement-${investorName.replace(/\s+/g, "-").toLowerCase()}-${periodName.replace(/\s+/g, "-").toLowerCase()}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[95vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="flex items-center gap-2">
                Statement Preview
                <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20">
                  PREVIEW ONLY – NOT SENT
                </Badge>
              </DialogTitle>
              <DialogDescription className="mt-1">
                {investorName} • {periodName}
                {recipientEmails.length > 0 && (
                  <span className="ml-2 text-muted-foreground">
                    → {recipientEmails.length} recipient{recipientEmails.length !== 1 ? "s" : ""}
                  </span>
                )}
              </DialogDescription>
            </div>
            <div className="flex items-center gap-2">
              <ToggleGroup
                type="single"
                value={viewMode}
                onValueChange={(v) => v && setViewMode(v as "desktop" | "mobile")}
                className="border rounded-md"
              >
                <ToggleGroupItem value="desktop" aria-label="Desktop view" className="px-3">
                  <Monitor className="h-4 w-4" />
                </ToggleGroupItem>
                <ToggleGroupItem value="mobile" aria-label="Mobile view" className="px-3">
                  <Smartphone className="h-4 w-4" />
                </ToggleGroupItem>
              </ToggleGroup>
            </div>
          </div>
        </DialogHeader>

        {/* Recipients summary */}
        {recipientEmails.length > 0 && (
          <div className="flex flex-wrap gap-1 px-1">
            <span className="text-xs text-muted-foreground mr-1">Recipients:</span>
            {recipientEmails.map((email, i) => (
              <Badge key={i} variant="secondary" className="text-xs font-normal">
                {email}
              </Badge>
            ))}
          </div>
        )}

        {/* Preview container */}
        <div className="flex-1 overflow-hidden border rounded-lg bg-muted/30">
          <div
            className={`mx-auto transition-all duration-300 h-full overflow-auto ${
              viewMode === "mobile" ? "max-w-[375px]" : "max-w-[680px]"
            }`}
          >
            <iframe
              srcDoc={sanitizeHtml(htmlContent)}
              className="w-full h-full min-h-[500px] bg-white"
              title="Statement Preview"
              sandbox="allow-same-origin"
            />
          </div>
        </div>

        <DialogFooter className="flex-row justify-between sm:justify-between">
          <Button variant="outline" onClick={handleDownloadHTML} className="gap-2">
            <Download className="h-4 w-4" />
            Download HTML
          </Button>
          <Button onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
