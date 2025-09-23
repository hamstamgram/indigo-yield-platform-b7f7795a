import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { BookOpen, Search, Filter, Download, Plus, DollarSign, TrendingUp, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface InvestorPosition {
  investor_id: string;
  fund_id: string;
  fund_class: string;
  shares: number;
  current_value: number;
  cost_basis: number;
  unrealized_pnl: number;
  realized_pnl: number;
  last_transaction_date?: string;
  lock_until_date?: string;
  investors: {
    name: string;
    email: string;
    status: string;
  };
  funds: {
    name: string;
    code: string;
    asset: string;
  };
}

interface LedgerSummary {
  total_aum: number;
  total_investors: number;
  total_positions: number;
  total_pnl: number;
}

const AdminInvestmentsLedgerPage = () => {
  const [positions, setPositions] = useState<InvestorPosition[]>([]);
  const [filteredPositions, setFilteredPositions] = useState<InvestorPosition[]>([]);
  const [summary, setSummary] = useState<LedgerSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFund, setSelectedFund] = useState<string>('all');
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [funds, setFunds] = useState<any[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [positions, searchTerm, selectedFund, selectedClass]);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch all positions with related data
      const { data: positionsData, error: positionsError } = await supabase
        .from('investor_positions')
        .select(`
          *,
          investors (
            name,
            email,
            status
          ),
          funds (
            name,
            code,
            asset
          )
        `)
        .gt('current_value', 0)
        .order('current_value', { ascending: false });

      if (positionsError) throw positionsError;

      setPositions(positionsData || []);

      // Fetch funds for filtering
      const { data: fundsData, error: fundsError } = await supabase
        .from('funds')
        .select('id, name, code, fund_class')
        .order('name');

      if (fundsError) throw fundsError;
      setFunds(fundsData || []);

      // Calculate summary
      if (positionsData) {
        const summaryData: LedgerSummary = {
          total_aum: positionsData.reduce((sum, pos) => sum + pos.current_value, 0),
          total_investors: new Set(positionsData.map(pos => pos.investor_id)).size,
          total_positions: positionsData.length,
          total_pnl: positionsData.reduce((sum, pos) => sum + (pos.unrealized_pnl + pos.realized_pnl), 0)
        };
        setSummary(summaryData);
      }

    } catch (error: any) {
      console.error('Error fetching ledger data:', error);
      toast({
        title: 'Error loading ledger',
        description: error.message || 'Failed to load investments ledger',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = positions;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(pos =>
        pos.investors.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        pos.investors.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        pos.funds.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        pos.funds.code.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Fund filter
    if (selectedFund !== 'all') {
      filtered = filtered.filter(pos => pos.fund_id === selectedFund);
    }

    // Class filter
    if (selectedClass !== 'all') {
      filtered = filtered.filter(pos => pos.fund_class === selectedClass);
    }

    setFilteredPositions(filtered);
  };

  const exportToCSV = () => {
    const csvHeaders = [
      'Investor Name',
      'Email',
      'Fund Name',
      'Fund Code',
      'Fund Class',
      'Shares',
      'Current Value',
      'Cost Basis',
      'Unrealized P&L',
      'Realized P&L',
      'Total P&L',
      'Return %',
      'Last Transaction',
      'Lock Until'
    ];

    const csvData = filteredPositions.map(pos => [
      pos.investors.name,
      pos.investors.email,
      pos.funds.name,
      pos.funds.code,
      pos.fund_class || '',
      pos.shares.toString(),
      pos.current_value.toFixed(2),
      pos.cost_basis.toFixed(2),
      pos.unrealized_pnl.toFixed(2),
      pos.realized_pnl.toFixed(2),
      (pos.unrealized_pnl + pos.realized_pnl).toFixed(2),
      pos.cost_basis > 0 ? (((pos.current_value - pos.cost_basis) / pos.cost_basis) * 100).toFixed(2) + '%' : '0%',
      pos.last_transaction_date || '',
      pos.lock_until_date || ''
    ]);

    const csvContent = [csvHeaders, ...csvData]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `investments-ledger-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);

    toast({
      title: 'Export completed',
      description: 'Investments ledger exported successfully',
    });
  };

  const uniqueClasses = [...new Set(positions.map(pos => pos.fund_class).filter(Boolean))];

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <BookOpen className="h-8 w-8 text-primary" />
            Investments Ledger
          </h1>
          <p className="text-muted-foreground">Complete view of all investor positions and holdings</p>
        </div>
        
        <Button onClick={exportToCSV} className="flex items-center gap-2">
          <Download className="h-4 w-4" />
          Export CSV
        </Button>
      </div>

      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total AUM</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${summary.total_aum.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">
                Across all funds
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Investors</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.total_investors}</div>
              <p className="text-xs text-muted-foreground">
                {summary.total_positions} positions
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total P&L</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${
                summary.total_pnl >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {summary.total_pnl >= 0 ? '+' : ''}${summary.total_pnl.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">
                Realized + Unrealized
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Average Return</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {summary.total_aum > 0 ? 
                  ((summary.total_pnl / (summary.total_aum - summary.total_pnl)) * 100).toFixed(1) 
                  : '0'}%
              </div>
              <p className="text-xs text-muted-foreground">
                Portfolio weighted
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Filter & Search</CardTitle>
          <CardDescription>Filter positions by investor, fund, or class</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search investors, funds, or codes..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <Select value={selectedFund} onValueChange={setSelectedFund}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="All Funds" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Funds</SelectItem>
                {funds.map((fund) => (
                  <SelectItem key={fund.id} value={fund.id}>
                    {fund.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedClass} onValueChange={setSelectedClass}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="All Classes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Classes</SelectItem>
                {uniqueClasses.map((fundClass) => (
                  <SelectItem key={fundClass} value={fundClass}>
                    Class {fundClass}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Investor Positions</CardTitle>
          <CardDescription>
            Showing {filteredPositions.length} positions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Investor</TableHead>
                  <TableHead>Fund</TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead className="text-right">Shares</TableHead>
                  <TableHead className="text-right">Current Value</TableHead>
                  <TableHead className="text-right">Cost Basis</TableHead>
                  <TableHead className="text-right">P&L</TableHead>
                  <TableHead className="text-right">Return %</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPositions.map((position, index) => {
                  const totalPnl = position.unrealized_pnl + position.realized_pnl;
                  const returnPct = position.cost_basis > 0 ? 
                    ((position.current_value - position.cost_basis) / position.cost_basis) * 100 : 0;
                  const isLocked = position.lock_until_date && new Date(position.lock_until_date) > new Date();

                  return (
                    <TableRow key={`${position.investor_id}-${position.fund_id}-${index}`}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{position.investors.name}</div>
                          <div className="text-sm text-muted-foreground">{position.investors.email}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{position.funds.name}</div>
                          <div className="text-sm text-muted-foreground">{position.funds.code}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {position.fund_class && (
                          <Badge variant="outline">Class {position.fund_class}</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {position.shares.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        ${position.current_value.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        ${position.cost_basis.toLocaleString()}
                      </TableCell>
                      <TableCell className={`text-right font-medium ${
                        totalPnl >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {totalPnl >= 0 ? '+' : ''}${totalPnl.toLocaleString()}
                      </TableCell>
                      <TableCell className={`text-right font-medium ${
                        returnPct >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {returnPct >= 0 ? '+' : ''}{returnPct.toFixed(2)}%
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <Badge variant={position.investors.status === 'active' ? 'default' : 'secondary'}>
                            {position.investors.status}
                          </Badge>
                          {isLocked && (
                            <Badge variant="outline" className="text-xs">
                              Locked until {new Date(position.lock_until_date!).toLocaleDateString()}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>

            {filteredPositions.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No positions found matching your criteria</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminInvestmentsLedgerPage;