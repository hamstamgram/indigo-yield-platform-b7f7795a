/**
 * Admin Settings Page - Consolidated Settings Hub
 * Combines platform settings, admin tools, admin management, and invites
 */

import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Settings,
  Wrench,
  Shield,
  UserPlus,
  Database,
  RefreshCw,
  Activity,
  AlertTriangle,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Button,
  Badge,
} from "@/components/ui";
import { AdminGuard } from "@/components/admin";
import { PageHeader } from "@/components/layout";
import { useIsSuperAdmin } from "@/hooks/data";
import { useToast } from "@/hooks";
import { adminToolsService } from "@/services";

// Admin Tools Configuration
const ADMIN_TOOLS = [
  {
    id: "refresh-aum",
    title: "Refresh AUM Cache",
    description: "Recalculate all fund AUM values from positions",
    icon: RefreshCw,
    dangerous: false,
  },
  {
    id: "run-integrity",
    title: "Run Integrity Checks",
    description: "Execute full data integrity validation suite",
    icon: Activity,
    dangerous: false,
  },
  {
    id: "reconcile-positions",
    title: "Reconcile All Positions",
    description: "Recompute investor positions from transaction ledger",
    icon: Database,
    dangerous: true,
  },
  {
    id: "refresh-performance",
    title: "Refresh Performance Cache",
    description: "Rebuild performance metrics for all investors",
    icon: RefreshCw,
    dangerous: false,
  },
];

function AdminSettingsContent() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "platform";
  const { data: isSuperAdmin = false } = useIsSuperAdmin();
  const { toast } = useToast();
  const [runningTool, setRunningTool] = useState<string | null>(null);

  const handleTabChange = (value: string) => {
    setSearchParams({ tab: value });
  };

  const runTool = async (toolId: string) => {
    setRunningTool(toolId);
    try {
      let result;
      switch (toolId) {
        case "refresh-aum":
          result = await adminToolsService.refreshAumCache();
          break;
        case "run-integrity":
          result = await adminToolsService.runIntegrityChecks();
          break;
        case "reconcile-positions":
          result = await adminToolsService.runTool("reconcile_positions");
          break;
        case "refresh-performance":
          result = await adminToolsService.refreshPerformanceCache();
          break;
        default:
          throw new Error("Unknown tool");
      }
      toast({
        title: "Tool executed successfully",
        description: result?.message || "Operation completed",
      });
    } catch (error) {
      toast({
        title: "Tool execution failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setRunningTool(null);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        subtitle="Platform configuration and admin tools"
      />

      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4">
          <TabsTrigger value="platform" className="gap-2">
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">Platform</span>
          </TabsTrigger>
          <TabsTrigger value="tools" className="gap-2">
            <Wrench className="h-4 w-4" />
            <span className="hidden sm:inline">Tools</span>
          </TabsTrigger>
          {isSuperAdmin && (
            <>
              <TabsTrigger value="admins" className="gap-2">
                <Shield className="h-4 w-4" />
                <span className="hidden sm:inline">Admins</span>
              </TabsTrigger>
              <TabsTrigger value="invites" className="gap-2">
                <UserPlus className="h-4 w-4" />
                <span className="hidden sm:inline">Invites</span>
              </TabsTrigger>
            </>
          )}
        </TabsList>

        {/* Platform Settings Tab */}
        <TabsContent value="platform" className="space-y-4 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Platform Settings</CardTitle>
              <CardDescription>
                General platform configuration and preferences
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Platform settings configuration will be added here.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Admin Tools Tab */}
        <TabsContent value="tools" className="space-y-4 mt-6">
          <div className="grid gap-4 md:grid-cols-2">
            {ADMIN_TOOLS.map((tool) => (
              <Card key={tool.id} className={tool.dangerous ? "border-amber-500/30" : ""}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <tool.icon className="h-5 w-5 text-muted-foreground" />
                      <CardTitle className="text-base">{tool.title}</CardTitle>
                    </div>
                    {tool.dangerous && (
                      <Badge variant="outline" className="text-amber-600 border-amber-500/50">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        Caution
                      </Badge>
                    )}
                  </div>
                  <CardDescription>{tool.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    variant={tool.dangerous ? "outline" : "secondary"}
                    size="sm"
                    onClick={() => runTool(tool.id)}
                    disabled={runningTool === tool.id}
                    className={tool.dangerous ? "border-amber-500/50 hover:bg-amber-500/10" : ""}
                  >
                    {runningTool === tool.id ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Running...
                      </>
                    ) : (
                      "Run"
                    )}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Admin Management Tab (Super Admin only) */}
        {isSuperAdmin && (
          <TabsContent value="admins" className="space-y-4 mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Admin Management</CardTitle>
                <CardDescription>
                  Manage administrator accounts and permissions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Admin management interface will be loaded here.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* Admin Invites Tab (Super Admin only) */}
        {isSuperAdmin && (
          <TabsContent value="invites" className="space-y-4 mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Admin Invites</CardTitle>
                <CardDescription>
                  Create and manage admin invitation codes
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Admin invites interface will be loaded here.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}

export default function AdminSettingsPage() {
  return (
    <AdminGuard>
      <AdminSettingsContent />
    </AdminGuard>
  );
}
