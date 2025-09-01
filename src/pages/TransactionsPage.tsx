import { useState, useEffect } from "react";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { Calendar, ArrowUpCircle, ArrowDownCircle, DollarSign, Percent, ChevronLeft, ChevronRight, Filter, Search } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

interface Transaction {
  id: string;
  investor_id: string;
  asset_code: string;
  amount: number;
  type: 'DEPOSIT' | 'WITHDRAWAL' | 'INTEREST' | 'FEE';
  status: 'pending' | 'confirmed' | 'failed' | 'cancelled';
  tx_hash: string | null;
  note: string | null;
  created_at: string;
  confirmed_at: string | null;
  profiles?: {
    first_name: string | null;
    last_name: string | null;
    email: string;
  };
}

const ITEMS_PER_PAGE = 10;

const TransactionsPage = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  // Filters
  const [assetFilter, setAssetFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState<string>("");

  useEffect(() => {
    fetchTransactions();
    checkAdminStatus();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [transactions, assetFilter, typeFilter, searchTerm, dateFilter, currentPage]);

  const checkAdminStatus = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    setIsAdmin(profile?.is_admin || false);
  };

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Please sign in to view transactions");
        return;
      }

      // Check if user is admin to fetch all transactions
      const { data: profile } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', user.id)
        .single();

      let query = supabase
        .from('transactions')
        .select(`
          *,
          profiles!investor_id (
            first_name,
            last_name,
            email
          )
        `)
        .order('created_at', { ascending: false });

      // If not admin, only fetch own transactions
      if (!profile?.is_admin) {
        query = query.eq('investor_id', user.id);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching transactions:', error);
        toast.error("Failed to load transactions");
        return;
      }

      setTransactions(data || []);
    } catch (error) {
      console.error('Error:', error);
      toast.error("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...transactions];

    // Asset filter
    if (assetFilter !== "all") {
      filtered = filtered.filter(tx => tx.asset_code === assetFilter);
    }

    // Type filter
    if (typeFilter !== "all") {
      filtered = filtered.filter(tx => tx.type === typeFilter);
    }

    // Search filter (search in note, tx_hash, or investor name for admins)
    if (searchTerm) {
      filtered = filtered.filter(tx => {
        const searchLower = searchTerm.toLowerCase();
        return (
          tx.note?.toLowerCase().includes(searchLower) ||
          tx.tx_hash?.toLowerCase().includes(searchLower) ||
          (isAdmin && (
            tx.profiles?.email.toLowerCase().includes(searchLower) ||
            tx.profiles?.first_name?.toLowerCase().includes(searchLower) ||
            tx.profiles?.last_name?.toLowerCase().includes(searchLower)
          ))
        );
      });
    }

    // Date filter
    if (dateFilter) {
      filtered = filtered.filter(tx => {
        const txDate = format(new Date(tx.created_at), 'yyyy-MM-dd');
        return txDate === dateFilter;
      });
    }

    // Pagination
    const totalItems = filtered.length;
    setTotalPages(Math.ceil(totalItems / ITEMS_PER_PAGE));
    
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    
    setFilteredTransactions(filtered.slice(startIndex, endIndex));
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'DEPOSIT':
        return <ArrowDownCircle className="h-4 w-4 text-green-600" />;
      case 'WITHDRAWAL':
        return <ArrowUpCircle className="h-4 w-4 text-red-600" />;
      case 'INTEREST':
        return <Percent className="h-4 w-4 text-blue-600" />;
      case 'FEE':
        return <DollarSign className="h-4 w-4 text-orange-600" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      confirmed: "default",
      pending: "secondary",
      failed: "destructive",
      cancelled: "outline"
    };
    
    return <Badge variant={variants[status] || "outline"}>{status}</Badge>;
  };

  const formatAmount = (amount: number, assetCode: string) => {
    const decimals = ['USDC', 'USDT', 'EURC'].includes(assetCode) ? 2 : 8;
    return `${amount.toFixed(decimals)} ${assetCode}`;
  };

  const uniqueAssets = Array.from(new Set(transactions.map(tx => tx.asset_code)));

  if (loading) {
    return (
      <div className="space-y-6 px-6 py-8">
        <Skeleton className="h-12 w-64" />
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map(i => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 px-6 py-8">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Transactions</h1>
        <p className="text-muted-foreground mt-1">
          View all your deposits, withdrawals, and yield payments
          {isAdmin && " (Admin: viewing all investors)"}
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Asset</label>
              <Select value={assetFilter} onValueChange={setAssetFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All assets" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All assets</SelectItem>
                  {uniqueAssets.map(asset => (
                    <SelectItem key={asset} value={asset}>{asset}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="text-sm font-medium mb-1 block">Type</label>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  <SelectItem value="DEPOSIT">Deposits</SelectItem>
                  <SelectItem value="WITHDRAWAL">Withdrawals</SelectItem>
                  <SelectItem value="INTEREST">Interest</SelectItem>
                  <SelectItem value="FEE">Fees</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="text-sm font-medium mb-1 block">Date</label>
              <Input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="w-full"
              />
            </div>
            
            <div>
              <label className="text-sm font-medium mb-1 block">Search</label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search notes, tx hash..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
          </div>
          
          <div className="mt-4 flex justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setAssetFilter("all");
                setTypeFilter("all");
                setDateFilter("");
                setSearchTerm("");
                setCurrentPage(1);
              }}
            >
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Transactions Table */}
      <Card>
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
          <CardDescription>
            {filteredTransactions.length} of {transactions.length} transactions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Asset</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Status</TableHead>
                  {isAdmin && <TableHead>Investor</TableHead>}
                  <TableHead>Note</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTransactions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={isAdmin ? 7 : 6} className="text-center py-8">
                      <div className="text-muted-foreground">
                        No transactions found
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTransactions.map((tx) => (
                    <TableRow key={tx.id}>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <div className="font-medium">
                              {format(new Date(tx.created_at), 'MMM d, yyyy')}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {format(new Date(tx.created_at), 'h:mm a')}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          {getTransactionIcon(tx.type)}
                          <span className="font-medium">{tx.type}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{tx.asset_code}</Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        <span className={
                          tx.type === 'DEPOSIT' || tx.type === 'INTEREST' 
                            ? "text-green-600" 
                            : "text-red-600"
                        }>
                          {tx.type === 'DEPOSIT' || tx.type === 'INTEREST' ? '+' : '-'}
                          {formatAmount(Number(tx.amount), tx.asset_code)}
                        </span>
                      </TableCell>
                      <TableCell>{getStatusBadge(tx.status)}</TableCell>
                      {isAdmin && (
                        <TableCell>
                          <div className="text-sm">
                            <div className="font-medium">
                              {tx.profiles?.first_name} {tx.profiles?.last_name}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {tx.profiles?.email}
                            </div>
                          </div>
                        </TableCell>
                      )}
                      <TableCell>
                        <div className="max-w-[200px]">
                          <p className="text-sm truncate" title={tx.note || ''}>
                            {tx.note || '-'}
                          </p>
                          {tx.tx_hash && (
                            <code className="text-xs text-muted-foreground truncate block" title={tx.tx_hash}>
                              {tx.tx_hash.substring(0, 10)}...
                            </code>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-muted-foreground">
                Page {currentPage} of {totalPages}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default TransactionsPage;
