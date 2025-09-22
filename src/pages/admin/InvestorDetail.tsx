import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Loader2, Mail, User, Calendar, DollarSign } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getInvestorById } from '@/services/adminService';
import type { InvestorDetail } from '@/server/admin';

const InvestorDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [investor, setInvestor] = useState<InvestorDetail | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const fetchInvestor = async () => {
      if (!id) return;

      try {
        setLoading(true);
        const data = await getInvestorById(id);
        
        if (!data) {
          toast({
            title: 'Not Found',
            description: 'Investor not found',
            variant: 'destructive',
          });
          navigate('/admin/investors');
          return;
        }

        setInvestor({ 
          ...data, 
          status: 'active', 
          kycStatus: 'pending',
          totalPrincipal: '0',
          totalEarned: '0'
        });
      } catch (error) {
        console.error('Error fetching investor:', error);
        toast({
          title: 'Error',
          description: 'Failed to load investor details',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchInvestor();
  }, [id, navigate, toast]);

  if (loading) {
    return (
      <div className="flex h-64 w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!investor) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-2">
          <Button variant="ghost" onClick={() => navigate('/admin/investors')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Investors
          </Button>
        </div>
        <div className="text-center">
          <h1 className="text-2xl font-semibold">Investor not found</h1>
        </div>
      </div>
    );
  }

  const getKycStatusVariant = (status: string) => {
    switch (status) {
      case 'approved':
        return 'default';
      case 'pending':
        return 'secondary';
      case 'rejected':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  const getTransactionStatusVariant = (status: string) => {
    switch (status) {
      case 'completed':
        return 'default';
      case 'pending':
        return 'secondary';
      case 'failed':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  const getTransactionTypeIcon = (type: string) => {
    switch (type) {
      case 'deposit':
        return '↗';
      case 'withdrawal':
        return '↙';
      case 'interest':
        return '⚡';
      default:
        return '•';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" onClick={() => navigate('/admin/investors')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Investors
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Investor Details</h1>
            <p className="text-muted-foreground">
              Detailed information for {investor.name || investor.email}
            </p>
          </div>
        </div>
      </div>

      {/* Investor Header Card */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <User className="h-5 w-5 text-muted-foreground" />
                <CardTitle className="text-xl">
                  {investor.name || 'Unnamed Investor'}
                </CardTitle>
              </div>
              <div className="flex items-center space-x-2 text-muted-foreground">
                <Mail className="h-4 w-4" />
                <span>{investor.email}</span>
              </div>
              {investor.lastActive && (
                <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>Last active: {investor.lastActive}</span>
                </div>
              )}
            </div>
            <div className="flex space-x-2">
              <Badge variant={investor.status === 'active' ? 'default' : 'secondary'}>
                {investor.status}
              </Badge>
              <Badge variant={getKycStatusVariant(investor.kycStatus)}>
                KYC: {investor.kycStatus}
              </Badge>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Summary Cards */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Principal</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{investor.totalPrincipal}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Earned</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{investor.totalEarned}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Positions</CardTitle>
            <span className="h-4 w-4 text-muted-foreground">#</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{investor.positions.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recent Transactions</CardTitle>
            <span className="h-4 w-4 text-muted-foreground">#</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{investor.transactions.length}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 grid-cols-1 xl:grid-cols-2">
        {/* Positions */}
        <Card>
          <CardHeader>
            <CardTitle>Asset Positions</CardTitle>
            <CardDescription>
              Current holdings and performance across all assets
            </CardDescription>
          </CardHeader>
          <CardContent>
            {investor.positions.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">
                No positions found
              </p>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Asset</TableHead>
                      <TableHead className="text-right">Principal</TableHead>
                      <TableHead className="text-right">Earned</TableHead>
                      <TableHead className="text-right">APY</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {investor.positions.map((position, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{position.asset}</TableCell>
                        <TableCell className="text-right">{position.principal}</TableCell>
                        <TableCell className="text-right text-green-600">
                          {position.earned}
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge variant="secondary">{position.apy}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Transactions */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Transactions</CardTitle>
            <CardDescription>
              Last 20 transactions for this investor
            </CardDescription>
          </CardHeader>
          <CardContent>
            {investor.transactions.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">
                No transactions found
              </p>
            ) : (
              <div className="space-y-3">
                {investor.transactions.map((transaction) => (
                  <div key={transaction.id} className="flex items-center justify-between p-3 rounded-lg border">
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted">
                        <span className="text-sm font-medium">
                          {getTransactionTypeIcon(transaction.type)}
                        </span>
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-medium capitalize">{transaction.type}</span>
                          <Badge variant="outline" className="text-xs">
                            {transaction.asset}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{transaction.date}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">{transaction.amount}</div>
                      <Badge variant={getTransactionStatusVariant(transaction.status)} className="text-xs">
                        {transaction.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default InvestorDetailPage;
