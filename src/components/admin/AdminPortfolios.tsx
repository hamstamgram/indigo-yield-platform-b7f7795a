
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save, Search, X, Plus, Users } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
  const [investors, setInvestors] = useState<UserProfile[]>([]);
  const [filteredInvestors, setFilteredInvestors] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingInvestors, setLoadingInvestors] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [investorSearchTerm, setInvestorSearchTerm] = useState("");
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<string>("");
  const [selectedAsset, setSelectedAsset] = useState<number>(0);
  const [newBalance, setNewBalance] = useState<string>("0");
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("portfolios");

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

  const fetchInvestors = async () => {
    try {
      setLoadingInvestors(true);
      
      // Fetch all investors (non-admin users)
      const { data: investorsData, error } = await supabase
        .from('profiles')
        .select('id, email, first_name, last_name, created_at')
        .eq('is_admin', false)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      console.log("Fetched investors:", investorsData?.length || 0);
      setInvestors(investorsData || []);
      setFilteredInvestors(investorsData || []);
    } catch (error) {
      console.error('Error fetching investors:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch investor data',
        variant: 'destructive',
      });
    } finally {
      setLoadingInvestors(false);
    }
  };

  useEffect(() => {
    fetchData();
    fetchInvestors();
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

  useEffect(() => {
    if (investorSearchTerm.trim() === '') {
      setFilteredInvestors(investors);
    } else {
      const term = investorSearchTerm.toLowerCase();
      const filtered = investors.filter(investor => 
        investor.email?.toLowerCase().includes(term) || 
        investor.first_name?.toLowerCase().includes(term) || 
        investor.last_name?.toLowerCase().includes(term)
      );
      setFilteredInvestors(filtered);
    }
  }, [investorSearchTerm, investors]);

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

      // Add timeout to ensure UI feedback before completing
      setTimeout(() => {
        setSaving(false);
      }, 500);
    } catch (error) {
      console.error('Error updating portfolio balance:', error);
      toast({
        title: 'Error',
        description: 'Failed to update portfolio balance',
        variant: 'destructive',
      });
      setSaving(false);
    }
  };

  const addNewPortfolio = async () => {
    try {
      setSaving(true);
      
      if (!selectedUser || !selectedAsset) {
        toast({
          title: 'Error',
          description: 'Please select both a user and an asset',
          variant: 'destructive',
        });
        return;
      }

      const balance = parseFloat(newBalance);
      if (isNaN(balance) || balance < 0) {
        toast({
          title: 'Error',
          description: 'Please enter a valid balance amount',
          variant: 'destructive',
        });
        return;
      }

      // Check if this user-asset combination already exists
      const { data: existingEntry } = await supabase
        .from('portfolios')
        .select('id')
        .eq('user_id', selectedUser)
        .eq('asset_id', selectedAsset)
        .single();

      if (existingEntry) {
        // Update existing entry
        const { error } = await supabase
          .from('portfolios')
          .update({ 
            balance: balance,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingEntry.id);
          
        if (error) throw error;
        
        toast({
          title: 'Success',
          description: 'Portfolio balance updated successfully',
        });
      } else {
        // Insert new entry
        const { error } = await supabase
          .from('portfolios')
          .insert({
            user_id: selectedUser,
            asset_id: selectedAsset,
            balance: balance,
            updated_at: new Date().toISOString()
          });
          
        if (error) throw error;
        
        toast({
          title: 'Success',
          description: 'New portfolio entry added successfully',
        });
      }
      
      // Close dialog and refresh data
      setAddDialogOpen(false);
      fetchData();
      
      // Reset form values
      setSelectedUser("");
      setSelectedAsset(0);
      setNewBalance("0");
      
    } catch (error) {
      console.error('Error adding portfolio entry:', error);
      toast({
        title: 'Error',
        description: 'Failed to add portfolio entry',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const clearSearch = () => {
    setSearchTerm("");
  };

  const clearInvestorSearch = () => {
    setInvestorSearchTerm("");
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Investor Portfolio Management</CardTitle>
          <CardDescription>View and modify investor portfolio balances and accounts</CardDescription>
        </div>
        <Button onClick={() => setAddDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Portfolio
        </Button>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="portfolios">Portfolio Entries</TabsTrigger>
            <TabsTrigger value="investors">All Investors</TabsTrigger>
          </TabsList>
          
          <TabsContent value="portfolios">
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
                              className="min-w-[150px] h-10"
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
          </TabsContent>
          
          <TabsContent value="investors">
            <div className="flex mb-4">
              <div className="relative flex-grow">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search investors..."
                  className="pl-8 pr-8"
                  value={investorSearchTerm}
                  onChange={(e) => setInvestorSearchTerm(e.target.value)}
                />
                {investorSearchTerm && (
                  <button
                    onClick={clearInvestorSearch}
                    className="absolute right-2.5 top-2.5"
                    aria-label="Clear search"
                  >
                    <X className="h-4 w-4 text-muted-foreground" />
                  </button>
                )}
              </div>
            </div>
            
            {loadingInvestors ? (
              <div className="flex justify-center p-4">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredInvestors.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center py-6">
                          {investorSearchTerm ? "No investors match your search" : "No investors found"}
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredInvestors.map((investor) => (
                        <TableRow key={investor.id}>
                          <TableCell>
                            {investor.first_name || ''} {investor.last_name || ''}
                          </TableCell>
                          <TableCell>{investor.email}</TableCell>
                          <TableCell>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedUser(investor.id);
                                setAddDialogOpen(true);
                              }}
                            >
                              <Plus className="h-4 w-4 mr-2" />
                              Add Asset
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Add Portfolio Dialog */}
        <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Portfolio Entry</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="user">Investor</Label>
                <select 
                  id="user"
                  value={selectedUser}
                  onChange={(e) => setSelectedUser(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Select an investor</option>
                  {users.map(user => (
                    <option key={user.id} value={user.id}>
                      {user.first_name} {user.last_name} ({user.email})
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="asset">Asset</Label>
                <select 
                  id="asset"
                  value={selectedAsset}
                  onChange={(e) => setSelectedAsset(parseInt(e.target.value))}
                  className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="0">Select an asset</option>
                  {assets.map(asset => (
                    <option key={asset.id} value={asset.id}>
                      {asset.name} ({asset.symbol})
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="balance">Balance</Label>
                <Input
                  id="balance"
                  type="number"
                  step="0.00000001"
                  min="0"
                  value={newBalance}
                  onChange={(e) => setNewBalance(e.target.value)}
                  className="h-10"
                />
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setAddDialogOpen(false)}>Cancel</Button>
              <Button onClick={addNewPortfolio} disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : 'Add Portfolio Entry'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};

export default AdminPortfolios;
