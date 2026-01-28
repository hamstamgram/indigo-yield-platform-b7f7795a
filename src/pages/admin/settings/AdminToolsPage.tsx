/**
 * Admin Tools Page
 * System utilities and maintenance actions for administrators
 */

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Button,
  Input,
  Badge,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui";
import { useToast } from "@/hooks";
import { adminToolsService } from "@/services/admin";
import { type ToolResult } from "@/services/shared";
import { AdminGuard } from "@/components/admin";
import {
  Wrench,
  RefreshCw,
  Database,
  AlertTriangle,
  CheckCircle2,
  Search,
  Loader2,
  ArrowLeft,
} from "lucide-react";
import { Link } from "react-router-dom";

interface ToolAction {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  dangerous?: boolean;
}

const TOOLS: ToolAction[] = [
  {
    id: "refresh_aum_cache",
    title: "Refresh AUM Cache",
    description: "Recalculate fund AUM aggregates from transactions",
    icon: <RefreshCw className="h-5 w-5" />,
  },
  {
    id: "integrity_check",
    title: "Run Integrity Checks",
    description: "Check for duplicate positions, orphaned records, and data inconsistencies",
    icon: <Search className="h-5 w-5" />,
  },
  {
    id: "refresh_performance",
    title: "Refresh Performance Cache",
    description: "Recalculate investor performance metrics",
    icon: <Database className="h-5 w-5" />,
  },
];

function AdminToolsContent() {
  const { toast } = useToast();
  const [confirmDialog, setConfirmDialog] = useState<ToolAction | null>(null);
  const [confirmText, setConfirmText] = useState("");
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<Record<string, ToolResult>>({});

  const runTool = async (toolId: string) => {
    setRunning(true);
    setConfirmDialog(null);
    setConfirmText("");

    try {
      const result = await adminToolsService.runTool(toolId);
      setResults((prev) => ({ ...prev, [toolId]: result }));

      toast({
        title: result.success ? "Success" : "Warning",
        description: result.message,
        variant: result.success ? "default" : "destructive",
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "An error occurred";
      setResults((prev) => ({ ...prev, [toolId]: { success: false, message } }));
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="container max-w-4xl mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/admin/settings-platform">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Wrench className="h-8 w-8" />
            Admin Tools
          </h1>
          <p className="text-muted-foreground mt-1">System utilities and maintenance actions</p>
        </div>
      </div>

      <div className="grid gap-4">
        {TOOLS.map((tool) => (
          <Card key={tool.id}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  {tool.icon}
                  {tool.title}
                  {tool.dangerous && (
                    <Badge variant="destructive" className="ml-2">
                      Dangerous
                    </Badge>
                  )}
                </CardTitle>
                <div className="flex items-center gap-2">
                  {results[tool.id] && (
                    <Badge variant={results[tool.id].success ? "default" : "destructive"}>
                      {results[tool.id].success ? (
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                      ) : (
                        <AlertTriangle className="h-3 w-3 mr-1" />
                      )}
                      {results[tool.id].success ? "Success" : "Failed"}
                    </Badge>
                  )}
                  <Button
                    variant={tool.dangerous ? "destructive" : "outline"}
                    size="sm"
                    onClick={() => setConfirmDialog(tool)}
                    disabled={running}
                  >
                    {running ? <Loader2 className="h-4 w-4 animate-spin" /> : "Run"}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription>{tool.description}</CardDescription>
              {results[tool.id] && (
                <p className="text-sm mt-2 text-muted-foreground">{results[tool.id].message}</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Empty state info */}
      <Card className="border-dashed">
        <CardContent className="py-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5" />
            <div>
              <p className="font-medium">Use with caution</p>
              <p className="text-sm text-muted-foreground">
                All actions are logged to the audit trail. Running maintenance tools during peak
                hours may affect performance.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <Dialog open={!!confirmDialog} onOpenChange={() => setConfirmDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Action</DialogTitle>
            <DialogDescription>
              You are about to run: <strong>{confirmDialog?.title}</strong>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">{confirmDialog?.description}</p>
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Type <code className="bg-muted px-1 rounded">RUN</code> to confirm
              </label>
              <Input
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value.toUpperCase())}
                placeholder="Type RUN"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDialog(null)}>
              Cancel
            </Button>
            <Button
              variant={confirmDialog?.dangerous ? "destructive" : "secondary"}
              onClick={() => confirmDialog && runTool(confirmDialog.id)}
              disabled={confirmText !== "RUN" || running}
            >
              {running ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function AdminToolsPage() {
  return (
    <AdminGuard>
      <AdminToolsContent />
    </AdminGuard>
  );
}
