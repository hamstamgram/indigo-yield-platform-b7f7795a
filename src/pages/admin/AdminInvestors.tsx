
import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { RefreshCw, Search, Eye, Users as UsersIcon, AlertCircle } from "lucide-react";
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

  // Format currency with locale support
  const formatCurrency = (value: string | number): string => {
    // Remove $ and commas if it's already formatted
    const cleanValue = typeof value === 'string' ? 
      parseFloat(value.replace(/[$,]/g, '')) : value;
    
    if (isNaN(cleanValue)) return '$0.00';
    
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(cleanValue);
  };

  // Format date with locale support
  const formatDate = (dateString?: string): string => {
    if (!dateString) return 'N/A';
    
    try {
      const date = new Date(dateString);
      return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      }).format(date);
    } catch {
      return dateString;
    }
  };

  // Loading skeleton component
  const LoadingSkeleton = () => (
    <>
      {[...Array(5)].map((_, i) => (
        <TableRow key={i}>
          <TableCell>
            <div className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-48" />
            </div>
          </TableCell>
          <TableCell><Skeleton className="h-4 w-24" /></TableCell>
          <TableCell><Skeleton className="h-4 w-24" /></TableCell>
          <TableCell><Skeleton className="h-6 w-16" /></TableCell>
          <TableCell><Skeleton className="h-8 w-24" /></TableCell>
        </TableRow>
      ))}
    </>
  );

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
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" aria-hidden="true" />
              <Input
                placeholder="Search by email or name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
                aria-label="Search investors"
                type="search"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead role="columnheader" aria-sort="none">
                    Investor
                  </TableHead>
                  <TableHead className="text-right" role="columnheader">
                    Principal
                  </TableHead>
                  <TableHead className="text-right" role="columnheader">
                    Earned
                  </TableHead>
                  <TableHead role="columnheader">
                    Last Active
                  </TableHead>
                  <TableHead role="columnheader">
                    Status
                  </TableHead>
                  <TableHead className="text-right" role="columnheader">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <LoadingSkeleton />
                ) : filteredInvestors.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12">
                      <div className="flex flex-col items-center justify-center space-y-3">
                        <AlertCircle className="h-12 w-12 text-muted-foreground" />
                        <div className="space-y-1">
                          <p className="text-sm font-medium text-muted-foreground">
                            {searchTerm ? 'No investors found matching your search' : 'No investors found'}
                          </p>
                          {searchTerm && (
                            <p className="text-xs text-muted-foreground">
                              Try adjusting your search terms
                            </p>
                          )}
                        </div>
                        {searchTerm && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSearchTerm('')}
                          >
                            Clear search
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredInvestors.map((investor) => (
                    <TableRow key={investor.id} className="hover:bg-muted/50 transition-colors">
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
                      <TableCell className="text-right font-mono tabular-nums">
                        {formatCurrency(investor.totalPrincipal)}
                      </TableCell>
                      <TableCell className="text-right font-mono tabular-nums text-green-600 dark:text-green-400">
                        {formatCurrency(investor.totalEarned)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(investor.lastActive)}
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
                          aria-label={`View details for ${investor.name || investor.email}`}
                        >
                          <Link to={`/admin/investors/${investor.id}`}>
                            <Eye className="h-4 w-4 mr-2" aria-hidden="true" />
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
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminInvestors;
