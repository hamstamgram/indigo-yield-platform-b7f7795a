
import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Search, Eye, Users as UsersIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { listInvestors } from "@/services/adminService";
import type { InvestorSummary } from "@/server/admin";
import LoadingSpinner from "@/components/common/LoadingSpinner";

const AdminInvestors = () => {
  const [loading, setLoading] = useState(true);
  const [investors, setInvestors] = useState<InvestorSummary[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredInvestors, setFilteredInvestors] = useState<InvestorSummary[]>([]);
  const { toast } = useToast();
  
  const fetchInvestors = async () => {
    try {
      setLoading(true);
      const data = await listInvestors({ search: searchTerm });
      setInvestors(data);
      setFilteredInvestors(data);
    } catch (error) {
      console.error('Error fetching investors:', error);
      toast({
        title: 'Error',
        description: 'Failed to load investors. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    fetchInvestors();
  }, []);
  
  // Filter investors based on search term
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredInvestors(investors);
    } else {
      const filtered = investors.filter(
        (investor) =>
          investor.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
          investor.name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredInvestors(filtered);
    }
  }, [searchTerm, investors]);
  
  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'active':
        return 'default';
      case 'pending':
        return 'secondary';
      case 'inactive':
        return 'outline';
      default:
        return 'secondary';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Investor Management</h1>
          <p className="text-muted-foreground">
            View and manage all investor accounts and portfolios
          </p>
        </div>
        <Button onClick={fetchInvestors} variant="outline" disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>
      
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <UsersIcon className="h-5 w-5" />
                All Investors
              </CardTitle>
              <CardDescription>
                {filteredInvestors.length} investor{filteredInvestors.length === 1 ? '' : 's'} found
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by email or name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <LoadingSpinner />
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Investor</TableHead>
                    <TableHead className="text-right">Principal</TableHead>
                    <TableHead className="text-right">Earned</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInvestors.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        {searchTerm ? 'No investors found matching your search.' : 'No investors found.'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredInvestors.map((investor) => (
                      <TableRow key={investor.id}>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="font-medium">
                              {investor.name || 'Unnamed'}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {investor.email}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {investor.totalPrincipal}
                        </TableCell>
                        <TableCell className="text-right font-mono text-green-600">
                          {investor.totalEarned}
                        </TableCell>
                        <TableCell>
                          <Badge variant={getStatusVariant(investor.status)}>
                            {investor.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            asChild
                          >
                            <Link to={`/admin/investors/${investor.id}`}>
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminInvestors;
