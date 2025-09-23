import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { InvestorSummaryV2, adminServiceV2 } from "@/services/adminServiceV2";
import { useRealtimeSubscription } from "@/hooks/useRealtimeSubscription";
import { toast } from "sonner";
import { Eye, UserCheck, UserX, Search } from "lucide-react";

interface InvestorManagementPanelProps {
  investors: InvestorSummaryV2[];
  onDataChange: () => void;
}

export function InvestorManagementPanel({ investors, onDataChange }: InvestorManagementPanelProps) {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [updating, setUpdating] = useState<string | null>(null);

  // Real-time subscription for investor updates
  useRealtimeSubscription({
    table: 'investors',
    event: 'UPDATE',
    onUpdate: () => {
      console.log('Investor data updated, refreshing...');
      onDataChange();
    }
  });

  // Real-time subscription for investor positions
  useRealtimeSubscription({
    table: 'investor_positions',
    event: '*',
    onUpdate: () => {
      console.log('Investor positions updated, refreshing...');
      onDataChange();
    }
  });

  const filteredInvestors = investors.filter(investor => {
    const matchesSearch = 
      investor.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      investor.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      investor.lastName?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || true; // Status filtering removed since it's not in new interface
    
    return matchesSearch && matchesStatus;
  });

  const updateInvestorStatus = async (investorId: string, newStatus: string) => {
    try {
      setUpdating(investorId);
      await adminServiceV2.updateInvestorStatus(investorId, newStatus);
      toast.success('Investor status updated successfully');
      onDataChange();
    } catch (error) {
      console.error('Error updating investor status:', error);
      toast.error('Failed to update investor status');
    } finally {
      setUpdating(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-800">Active</Badge>;
      case 'inactive':
        return <Badge variant="secondary">Inactive</Badge>;
      case 'suspended':
        return <Badge variant="destructive">Suspended</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Investor Management
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
            Live
          </Badge>
        </CardTitle>
        <CardDescription>
          Manage investor accounts and positions ({investors.length} total)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex gap-4 items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Investor Table */}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Total AUM</TableHead>
                <TableHead>Position Count</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredInvestors.map((investor) => (
                <TableRow key={investor.id}>
                  <TableCell className="font-medium">
                    {investor.firstName && investor.lastName 
                      ? `${investor.firstName} ${investor.lastName}`
                      : investor.email.split('@')[0]
                    }
                  </TableCell>
                  <TableCell>{investor.email}</TableCell>
                  <TableCell>{investor.totalAum?.toLocaleString() || '0'}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{Object.keys(investor.portfolioDetails.assetBreakdown).length || 0}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className="bg-green-100 text-green-800">Active</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => navigate(`/admin/investors/${investor.id}`)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateInvestorStatus(investor.id, 'active')}
                        disabled={updating === investor.id}
                      >
                        <UserCheck className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {filteredInvestors.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No investors found matching your criteria.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}