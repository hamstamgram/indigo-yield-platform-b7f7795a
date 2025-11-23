import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { AdminOnly } from "@/components/ui/RoleGate";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { redactForAdmin } from "@/lib/security/redact-pii";
import {
  Users,
  Filter,
  Search,
  UserCheck,
  UserX,
  Clock,
  AlertTriangle,
  CheckCircle,
  Mail,
  Download,
  RefreshCw,
} from "lucide-react";

const statusUpdateSchema = z.object({
  selectedUsers: z.array(z.string().uuid()).min(1, "At least one investor must be selected"),
  newStatus: z.enum(["Active", "Pending", "Closed"]),
  reason: z.string().min(10, "Reason must be at least 10 characters"),
  notifyInvestors: z.boolean().default(true),
});

type StatusUpdateForm = z.infer<typeof statusUpdateSchema>;

interface Investor {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  status: "Active" | "Pending" | "Closed";
  created_at: string;
  updated_at: string;
  is_admin: boolean;
}

interface StatusStats {
  active: number;
  pending: number;
  closed: number;
  total: number;
}

type StatusFilter = "all" | "Active" | "Pending" | "Closed";

export function InvestorStatusTracking() {
  const [investors, setInvestors] = useState<Investor[]>([]);
  const [filteredInvestors, setFilteredInvestors] = useState<Investor[]>([]);
  const [stats, setStats] = useState<StatusStats>({ active: 0, pending: 0, closed: 0, total: 0 });
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedInvestors, setSelectedInvestors] = useState<string[]>([]);
  const [showBulkUpdateDialog, setShowBulkUpdateDialog] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset,
  } = useForm<StatusUpdateForm>({
    resolver: zodResolver(statusUpdateSchema),
    defaultValues: {
      selectedUsers: [],
      notifyInvestors: true,
    },
  });

  useEffect(() => {
    loadInvestors();
  }, []);

  useEffect(() => {
    filterInvestors();
  }, [investors, statusFilter, searchQuery]);

  useEffect(() => {
    setValue("selectedUsers", selectedInvestors);
  }, [selectedInvestors, setValue]);

  const loadInvestors = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase.rpc("get_all_investors_with_details");

      if (error) throw error;

      const transformedInvestors: Investor[] = (data || []).map((investor: any) => ({
        id: investor.id,
        email: investor.email,
        first_name: investor.first_name,
        last_name: investor.last_name,
        status: investor.status || "Active",
        created_at: investor.created_at,
        updated_at: investor.created_at, // Use created_at as fallback
        is_admin: false,
      }));
      setInvestors(transformedInvestors);

      // Calculate stats
      const stats = investors.reduce(
        (acc, inv) => {
          acc.total += 1;
          acc[inv.status?.toLowerCase() as keyof Omit<StatusStats, "total">] += 1;
          return acc;
        },
        { active: 0, pending: 0, closed: 0, total: 0 }
      );
      setStats(stats);
    } catch (error) {
      console.error("Error loading investors:", error);
      toast.error("Failed to load investors");
    } finally {
      setIsLoading(false);
    }
  };

  const filterInvestors = () => {
    let filtered = investors;

    // Apply status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter((inv) => inv.status === statusFilter);
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (inv) =>
          inv.email.toLowerCase().includes(query) ||
          inv.first_name?.toLowerCase().includes(query) ||
          inv.last_name?.toLowerCase().includes(query)
      );
    }

    setFilteredInvestors(filtered);
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "Active":
        return "default";
      case "Pending":
        return "secondary";
      case "Closed":
        return "destructive";
      default:
        return "outline";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "Active":
        return <UserCheck className="h-4 w-4" />;
      case "Pending":
        return <Clock className="h-4 w-4" />;
      case "Closed":
        return <UserX className="h-4 w-4" />;
      default:
        return <Users className="h-4 w-4" />;
    }
  };

  const handleSelectAll = () => {
    if (selectedInvestors.length === filteredInvestors.length) {
      setSelectedInvestors([]);
    } else {
      setSelectedInvestors(filteredInvestors.map((inv) => inv.id));
    }
  };

  const handleSelectInvestor = (investorId: string) => {
    setSelectedInvestors((prev) =>
      prev.includes(investorId) ? prev.filter((id) => id !== investorId) : [...prev, investorId]
    );
  };

  const openBulkUpdateDialog = () => {
    if (selectedInvestors.length === 0) {
      toast.error("Please select at least one investor");
      return;
    }
    setShowBulkUpdateDialog(true);
  };

  const onSubmitStatusUpdate = async (data: StatusUpdateForm) => {
    setIsSubmitting(true);

    try {
      const currentUser = await supabase.auth.getUser();
      if (!currentUser.data.user) throw new Error("Not authenticated");

      // Update investor statuses using secure RPC function
      const updatePromises = data.selectedUsers.map(async (userId) => {
        return supabase.rpc("update_user_profile_secure", {
          p_user_id: userId,
          p_status: data.newStatus,
        });
      });

      const updateResults = await Promise.allSettled(updatePromises);
      const failedUpdates = updateResults.filter((result) => result.status === "rejected");

      if (failedUpdates.length > 0) {
        throw new Error(`Failed to update ${failedUpdates.length} investor(s)`);
      }

      // Log audit events for each investor
      const auditPromises = data.selectedUsers.map(async (userId) => {
        const investor = investors.find((inv) => inv.id === userId);
        if (!investor) return;

        return supabase.from("audit_log").insert({
          actor_user: currentUser.data.user?.id || "",
          action: "UPDATE_INVESTOR_STATUS",
          entity: "profiles",
          entity_id: userId,
          old_values: { status: investor.status },
          new_values: { status: data.newStatus },
          meta: {
            reason: data.reason,
            investor_email: redactForAdmin(investor.email),
            bulk_operation: data.selectedUsers.length > 1,
          },
        });
      });

      await Promise.all(auditPromises);

      // Send notifications to affected investors if requested
      if (data.notifyInvestors) {
        const notificationPromises = data.selectedUsers.map(async (userId) => {
          try {
            return supabase.functions.invoke("ef_send_notification", {
              body: {
                user_id: userId,
                type: "system",
                title: "Account Status Updated",
                body: `Your account status has been updated to ${data.newStatus}. ${data.reason}`,
                data: {
                  old_status: investors.find((inv) => inv.id === userId)?.status,
                  new_status: data.newStatus,
                  reason: data.reason,
                },
                priority: "medium",
                send_email: true,
              },
            });
          } catch (notificationError) {
            console.warn("Failed to send notification to user:", userId, notificationError);
          }
        });

        await Promise.allSettled(notificationPromises);
      }

      toast.success(
        `Successfully updated status for ${data.selectedUsers.length} investor(s) to ${data.newStatus}`
      );

      // Refresh data and reset form
      await loadInvestors();
      setSelectedInvestors([]);
      setShowBulkUpdateDialog(false);
      reset();
    } catch (error: any) {
      console.error("Error updating investor status:", error);
      toast.error(error.message || "Failed to update investor status");
    } finally {
      setIsSubmitting(false);
    }
  };

  const exportToCSV = () => {
    const headers = ["Email", "Name", "Status", "Created At", "Updated At"];
    const rows = filteredInvestors.map((inv) => [
      redactForAdmin(inv.email),
      `${inv.first_name || ""} ${inv.last_name || ""}`.trim() || "N/A",
      inv.status,
      new Date(inv.created_at).toLocaleDateString(),
      new Date(inv.updated_at).toLocaleDateString(),
    ]);

    const csvContent = [headers, ...rows]
      .map((row) => row.map((field) => `"${field}"`).join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `investor-status-${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success("Investor status data exported successfully");
  };

  return (
    <AdminOnly>
      <div className="container mx-auto py-8 px-4 max-w-7xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Users className="h-8 w-8" />
            Investor Status Tracking
          </h1>
          <p className="text-muted-foreground mt-2">
            Manage investor account statuses and track changes with bulk operations support.
          </p>
        </div>

        {/* Status Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Investors</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
                <Users className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Active</p>
                  <p className="text-2xl font-bold text-green-600">{stats.active}</p>
                </div>
                <UserCheck className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Pending</p>
                  <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
                </div>
                <Clock className="h-8 w-8 text-yellow-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Closed</p>
                  <p className="text-2xl font-bold text-red-600">{stats.closed}</p>
                </div>
                <UserX className="h-8 w-8 text-red-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Investor Management</CardTitle>
                <CardDescription>
                  Filter, search, and manage investor account statuses
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={loadInvestors} disabled={isLoading}>
                  <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
                  Refresh
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={exportToCSV}
                  disabled={filteredInvestors.length === 0}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export CSV
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Filters and Search */}
            <div className="flex flex-col md:flex-row gap-4 mb-6">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4" />
                <Label>Status:</Label>
                <Select
                  value={statusFilter}
                  onValueChange={(value: StatusFilter) => setStatusFilter(value)}
                >
                  <SelectTrigger className="w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Pending">Pending</SelectItem>
                    <SelectItem value="Closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2 flex-1">
                <Search className="h-4 w-4" />
                <Input
                  placeholder="Search by name or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="max-w-sm"
                />
              </div>

              {selectedInvestors.length > 0 && (
                <Button onClick={openBulkUpdateDialog}>
                  Update Status ({selectedInvestors.length})
                </Button>
              )}
            </div>

            {/* Investors Table */}
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
                <span className="ml-2 text-muted-foreground">Loading investors...</span>
              </div>
            ) : filteredInvestors.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {investors.length === 0
                  ? "No investors found"
                  : "No investors match the current filters"}
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox
                          checked={
                            selectedInvestors.length === filteredInvestors.length &&
                            filteredInvestors.length > 0
                          }
                          onCheckedChange={handleSelectAll}
                        />
                      </TableHead>
                      <TableHead>Investor</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Last Updated</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredInvestors.map((investor) => (
                      <TableRow key={investor.id}>
                        <TableCell>
                          <Checkbox
                            checked={selectedInvestors.includes(investor.id)}
                            onCheckedChange={() => handleSelectInvestor(investor.id)}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium">
                              {investor.first_name && investor.last_name
                                ? `${investor.first_name} ${investor.last_name}`
                                : "No name provided"}
                            </span>
                            <span className="text-sm text-muted-foreground">
                              {redactForAdmin(investor.email)}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={getStatusBadgeVariant(investor.status)}
                            className="flex items-center gap-1 w-fit"
                          >
                            {getStatusIcon(investor.status)}
                            {investor.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{new Date(investor.created_at).toLocaleDateString()}</TableCell>
                        <TableCell>{new Date(investor.updated_at).toLocaleDateString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {filteredInvestors.length > 0 && (
              <div className="text-sm text-muted-foreground mt-4">
                Showing {filteredInvestors.length} of {investors.length} total investors
              </div>
            )}
          </CardContent>
        </Card>

        {/* Bulk Status Update Dialog */}
        <Dialog open={showBulkUpdateDialog} onOpenChange={setShowBulkUpdateDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Update Investor Status
              </DialogTitle>
              <DialogDescription>
                Update the status for {selectedInvestors.length} selected investor(s). This action
                will be logged for audit purposes.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit(onSubmitStatusUpdate)} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="newStatus">New Status *</Label>
                <Select
                  value={watch("newStatus")}
                  onValueChange={(value: "Active" | "Pending" | "Closed") =>
                    setValue("newStatus", value)
                  }
                  disabled={isSubmitting}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select new status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Active">
                      <div className="flex items-center gap-2">
                        <UserCheck className="h-4 w-4 text-green-600" />
                        Active
                      </div>
                    </SelectItem>
                    <SelectItem value="Pending">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-yellow-600" />
                        Pending
                      </div>
                    </SelectItem>
                    <SelectItem value="Closed">
                      <div className="flex items-center gap-2">
                        <UserX className="h-4 w-4 text-red-600" />
                        Closed
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                {errors.newStatus && (
                  <p className="text-sm text-red-600">{errors.newStatus.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="reason">Reason for Status Change *</Label>
                <textarea
                  id="reason"
                  placeholder="Provide a detailed reason for this status change..."
                  {...register("reason")}
                  disabled={isSubmitting}
                  className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                />
                {errors.reason && <p className="text-sm text-red-600">{errors.reason.message}</p>}
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="notifyInvestors"
                  checked={watch("notifyInvestors")}
                  onCheckedChange={(checked) => setValue("notifyInvestors", checked as boolean)}
                  disabled={isSubmitting}
                />
                <Label htmlFor="notifyInvestors" className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Notify affected investors via email
                </Label>
              </div>

              {watch("newStatus") === "Closed" && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Warning:</strong> Setting status to "Closed" may restrict access to the
                    platform. Ensure this is intentional and properly communicated to affected
                    investors.
                  </AlertDescription>
                </Alert>
              )}
            </form>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowBulkUpdateDialog(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmit(onSubmitStatusUpdate)}
                disabled={isSubmitting || !watch("newStatus") || !watch("reason")}
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Updating...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Update Status
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminOnly>
  );
}

export default InvestorStatusTracking;
