import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { QUERY_KEYS } from "@/constants/queryKeys";
import { invalidateInvestorData } from "@/utils/cacheInvalidation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Search, User, MoreHorizontal, Users } from "lucide-react";
import PageHeader from "@/components/layout/PageHeader";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function AdminInvestorsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Deactivate confirmation state
  const [deactivateDialogOpen, setDeactivateDialogOpen] = useState(false);
  const [pendingDeactivateId, setPendingDeactivateId] = useState<string | null>(null);

  const deactivateMutation = useMutation({
    mutationFn: async (investorId: string) => {
      const { error } = await supabase
        .from("profiles")
        .update({ status: "inactive" })
        .eq("id", investorId);
      if (error) throw error;
    },
    onSuccess: (_, investorId) => {
      invalidateInvestorData(queryClient, investorId);
      toast.success("Investor deactivated", {
        description: "The investor account has been deactivated.",
      });
    },
    onError: (error) => {
      toast.error("Error", {
        description: error instanceof Error ? error.message : "Failed to deactivate investor",
      });
    },
  });

  const { data: investors, isLoading } = useQuery({
    queryKey: ["admin-investors"],
    queryFn: async () => {
      // First get admin user IDs from user_roles table
      const { data: adminRoles } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "admin");

      const adminIds = adminRoles?.map((r) => r.user_id) || [];

      // Get all profiles except those with admin role
      const { data, error } = await supabase
        .from("profiles")
        .select("id, status, created_at, email, first_name, last_name")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Filter out admins client-side
      return data?.filter((p) => !adminIds.includes(p.id)) || [];
    },
  });

  const filteredInvestors = investors?.filter((investor: any) => {
    const search = searchTerm.toLowerCase();
    const firstName = investor.first_name?.toLowerCase() || "";
    const lastName = investor.last_name?.toLowerCase() || "";
    const email = investor.email?.toLowerCase() || "";
    const fullName = `${firstName} ${lastName}`.toLowerCase();
    return fullName.includes(search) || email.includes(search);
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
      case "pending":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400";
    }
  };

  const handleDeactivateClick = (investorId: string) => {
    setPendingDeactivateId(investorId);
    setDeactivateDialogOpen(true);
  };

  const confirmDeactivate = () => {
    if (pendingDeactivateId) {
      deactivateMutation.mutate(pendingDeactivateId);
    }
    setDeactivateDialogOpen(false);
    setPendingDeactivateId(null);
  };

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Investors"
        subtitle="Manage investor accounts and portfolios"
        icon={Users}
        actions={
          <div className="flex items-center gap-4">
            <div className="relative w-64">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search investors..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Button onClick={() => navigate("/admin/investors/new")}>Add Investor</Button>
          </div>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>All Investors</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Investor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8">
                      Loading investors...
                    </TableCell>
                  </TableRow>
                ) : filteredInvestors?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                      No investors found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredInvestors?.map((investor: any) => (
                    <TableRow key={investor.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <User className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <div className="font-medium">
                              {investor.first_name || ""}{" "}
                              {investor.last_name || "Unknown"}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {investor.email}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={getStatusColor(investor.status)}>
                          {investor.status || "active"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {investor.created_at
                          ? new Date(investor.created_at).toLocaleDateString()
                          : "N/A"}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem
                              onClick={() => navigate(`/admin/investors/${investor.id}`)}
                            >
                              View Profile
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => navigate(`/admin/investors/${investor.id}/edit`)}
                            >
                              Edit Details
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => handleDeactivateClick(investor.id)}
                            >
                              Deactivate
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Deactivate Confirmation Dialog */}
      <AlertDialog open={deactivateDialogOpen} onOpenChange={setDeactivateDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate Investor</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to deactivate this investor account? They will lose access to
              the platform until reactivated.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeactivate}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Deactivate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}