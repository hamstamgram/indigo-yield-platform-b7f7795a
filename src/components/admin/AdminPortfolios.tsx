
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save, Search, X } from "lucide-react";

type UserPortfolio = {
  id: string;
  user_id: string;
  asset_id: number;
  balance: number;
  updated_at: string;
  user_email?: string;
  asset_symbol?: string;
  asset_name?: string;
};

type UserProfile = {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
};

type Asset = {
  id: number;
  symbol: string;
  name: string;
};

const AdminPortfolios = () => {
  const [portfolios, setPortfolios] = useState<UserPortfolio[]>([]);
  const [filteredPortfolios, setFilteredPortfolios] = useState<UserPortfolio[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch all required data in parallel
        const [portfoliosResult, usersResult, assetsResult] = await Promise.all([
          supabase
            .from('portfolios')
            .select('id, user_id, asset_id, balance, updated_at')
            .order('updated_at', { ascending: false }),
          
          supabase
            .from('profiles')
            .select('id, email, first_name, last_name'),
            
          supabase
            .from('assets')
            .select('id, symbol, name')
        ]);
        
        if (portfoliosResult.error) throw portfoliosResult.error;
        if (usersResult.error) throw usersResult.error;
        if (assetsResult.error) throw assetsResult.error;
        
        const portfolioData = portfoliosResult.data || [];
        const userData = usersResult.data || [];
        const assetData = assetsResult.data || [];
        
        setUsers(userData);
        setAssets(assetData);
        
        // Enrich portfolio data with user and asset information
        const enrichedPortfolios = portfolioData.map(portfolio => {
          const user = userData.find(u => u.id === portfolio.user_id);
          const asset = assetData.find(a => a.id === portfolio.asset_id);
          
          return {
            ...portfolio,
            user_email: user?.email || '',
            asset_symbol: asset?.symbol || '',
            asset_name: asset?.name || ''
          };
        });
        
        setPortfolios(enrichedPortfolios);
        setFilteredPortfolios(enrichedPortfolios);
      } catch (error) {
        console.error('Error fetching portfolio data:', error);
        toast({
          title: 'Error',
          description: 'Failed to fetch portfolio data',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);

  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredPortfolios(portfolios);
    } else {
      const term = searchTerm.toLowerCase();
      const filtered = portfolios.filter(portfolio => 
        portfolio.user_email?.toLowerCase().includes(term) || 
        portfolio.asset_symbol?.toLowerCase().includes(term) ||
        portfolio.asset_name?.toLowerCase().includes(term)
      );
      setFilteredPortfolios(filtered);
    }
  }, [searchTerm, portfolios]);

  const handleBalanceChange = (portfolioId: string, value: string) => {
    const numValue = parseFloat(value);
    if (isNaN(numValue)) return;
    
    setPortfolios(prev => prev.map(p => 
      p.id === portfolioId ? { ...p, balance: numValue } : p
    ));
    
    setFilteredPortfolios(prev => prev.map(p => 
      p.id === portfolioId ? { ...p, balance: numValue } : p
    ));
  };

  const savePortfolioChanges = async (portfolioId: string) => {
    try {
      setSaving(true);
      
      const portfolioToUpdate = portfolios.find(p => p.id === portfolioId);
      if (!portfolioToUpdate) return;
      
      const { error } = await supabase
        .from('portfolios')
        .update({ 
          balance: portfolioToUpdate.balance,
          updated_at: new Date().toISOString()
        })
        .eq('id', portfolioId);
        
      if (error) throw error;
      
      toast({
        title: 'Success',
        description: `Portfolio balance updated for ${portfolioToUpdate.user_email} (${portfolioToUpdate.asset_symbol})`,
      });
    } catch (error) {
      console.error('Error updating portfolio balance:', error);
      toast({
        title: 'Error',
        description: 'Failed to update portfolio balance',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const clearSearch = () => {
    setSearchTerm("");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Investor Portfolio Management</CardTitle>
        <CardDescription>View and modify investor portfolio balances</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex mb-4">
          <div className="relative flex-grow">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by email or asset..."
              className="pl-8 pr-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button
                onClick={clearSearch}
                className="absolute right-2.5 top-2.5"
                aria-label="Clear search"
              >
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            )}
          </div>
        </div>
        
        {loading ? (
          <div className="flex justify-center p-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Asset</TableHead>
                  <TableHead>Symbol</TableHead>
                  <TableHead>Balance</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPortfolios.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-6">
                      {searchTerm ? "No portfolios match your search" : "No portfolio data available"}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredPortfolios.map((portfolio) => (
                    <TableRow key={portfolio.id}>
                      <TableCell>{portfolio.user_email}</TableCell>
                      <TableCell>{portfolio.asset_name}</TableCell>
                      <TableCell>{portfolio.asset_symbol}</TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          step="0.00000001"
                          min="0"
                          value={portfolio.balance}
                          onChange={(e) => handleBalanceChange(portfolio.id, e.target.value)}
                          className="w-32"
                        />
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => savePortfolioChanges(portfolio.id)}
                          disabled={saving}
                        >
                          {saving ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Save className="h-4 w-4" />
                          )}
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
  );
};

export default AdminPortfolios;
