
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save, Search, X, Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Investor, Asset } from "@/types/investorTypes";

type UserPortfolio = {
  id: string;
  user_id: string;
  asset_id: number;
  asset_code: string;
  balance: number;
  current_balance: number;
  updated_at: string;
  user_email?: string;
  user_name?: string;
  asset_symbol?: string;
  asset_name?: string;
};

type UserProfile = {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
};

interface AdminPortfoliosProps {
  investors?: Investor[];
  assets?: Asset[];
  loading?: boolean;
  onRefresh?: () => void;
}

const AdminPortfolios = ({
  investors: providedInvestors,
  assets: providedAssets,
  loading: providedLoading,
  onRefresh
}: AdminPortfoliosProps) => {
  const [portfolios, setPortfolios] = useState<UserPortfolio[]>([]);
  const [filteredPortfolios, setFilteredPortfolios] = useState<UserPortfolio[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<string>("");
  const [selectedAsset, setSelectedAsset] = useState<number>(0);
  const [newBalance, setNewBalance] = useState<string>("0");
  const { toast } = useToast();

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // If assets and investors are provided as props, use them
      if (providedAssets && providedAssets.length > 0) {
        setAssets(providedAssets);
      } else {
        // Otherwise fetch assets
        const { data: assetsResult, error: assetsError } = await supabase
          .from('assets')
          .select('id, symbol, name')
          .order('symbol');
          
        if (assetsError) throw assetsError;
        setAssets(assetsResult || []);
      }
      
      // Use provided investors or fetch them
      let userData: UserProfile[] = [];
      if (providedInvestors && providedInvestors.length > 0) {
        userData = providedInvestors.map(investor => ({
          id: investor.id,
          email: investor.email,
          first_name: investor.first_name,
          last_name: investor.last_name
        }));
        setUsers(userData);
      } else {
        // Fallback to fetching users directly
        const { data: usersResult, error: usersError } = await supabase
          .from('profiles')
          .select('id, email, first_name, last_name');
          
        if (usersError) throw usersError;
        userData = usersResult || [];
        setUsers(userData);
      }
      
      console.log("Fetched users:", userData.length);
      
      // Fetch all portfolios (using positions table)
      const { data: portfoliosResult, error: portfoliosError } = await supabase
        .from('positions')
        .select('id, user_id, asset_code, current_balance, updated_at');
      
      if (portfoliosError) throw portfoliosError;
      
      const portfolioData = portfoliosResult || [];
      console.log("Fetched portfolios:", portfolioData.length);
      
      // Enrich portfolio data with user and asset information
      const enrichedPortfolios = portfolioData.map(portfolio => {
        const user = userData.find(u => u.id === portfolio.user_id);
        const asset = assets.find(a => a.symbol === portfolio.asset_code);
        
        const userName = user ? 
          `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email.split('@')[0] 
          : '';
        
        return {
          ...portfolio,
          asset_id: asset?.id || 0,
          balance: portfolio.current_balance,
          user_email: user?.email || '',
          user_name: userName,
          asset_symbol: asset?.symbol || portfolio.asset_code,
          asset_name: asset?.name || ''
        };
      });
      
      console.log("Enriched portfolios:", enrichedPortfolios.length);
      setPortfolios(enrichedPortfolios);
      setFilteredPortfolios(enrichedPortfolios);
      
      // If we have users but no portfolios, create empty portfolios for the users
      if (userData.length > 0 && portfolioData.length === 0) {
        console.log("No portfolios found, but we have users. Creating skeleton view.");
        
        // Create skeleton portfolios for UI display
        const skeletonPortfolios: UserPortfolio[] = [];
        userData.forEach(user => {
          const userName = 
            `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email.split('@')[0];
          
          // Add a skeleton portfolio entry for this user
            skeletonPortfolios.push({
              id: `skeleton-${user.id}`,
              user_id: user.id,
              asset_id: 0, // No asset assigned yet
              asset_code: 'USD',
              balance: 0,
              current_balance: 0,
              updated_at: new Date().toISOString(),
              user_email: user.email,
              user_name: userName,
              asset_symbol: '-',
              asset_name: 'No assets yet'
            });
        });
        
        if (skeletonPortfolios.length > 0) {
          console.log("Created skeleton portfolios:", skeletonPortfolios.length);
          setPortfolios(skeletonPortfolios);
          setFilteredPortfolios(skeletonPortfolios);
        }
      }
      
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

  // Use both provided loading state and internal state
  const isLoading = providedLoading !== undefined ? providedLoading : loading;

  useEffect(() => {
    fetchData();
  }, [providedInvestors, providedAssets]);

  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredPortfolios(portfolios);
    } else {
      const term = searchTerm.toLowerCase();
      const filtered = portfolios.filter(portfolio => 
        portfolio.user_email?.toLowerCase().includes(term) || 
        portfolio.user_name?.toLowerCase().includes(term) || 
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
      
      // Check if this is a skeleton portfolio (no real portfolio entry yet)
      if (portfolioId.startsWith('skeleton-')) {
        // This is just a placeholder, don't try to update
        toast({
          title: 'Info',
          description: 'Please add an asset using the Add Portfolio button first',
        });
        setSaving(false);
        return;
      }
      
      const { error } = await supabase
        .from('positions')
        .update({ 
          current_balance: portfolioToUpdate.balance,
          updated_at: new Date().toISOString()
        })
        .eq('id', portfolioId);
        
      if (error) throw error;
      
      toast({
        title: 'Success',
        description: `Portfolio balance updated for ${portfolioToUpdate.user_name} (${portfolioToUpdate.asset_symbol})`,
      });

      // Add timeout to ensure UI feedback before completing
      setTimeout(() => {
        setSaving(false);
        // Call onRefresh if provided
        if (onRefresh) onRefresh();
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
          description: 'Please select both an investor and an asset',
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

      // Find the asset symbol for the selected asset (ensure it's a valid asset code)
      const selectedAssetData = assets.find(a => a.id === selectedAsset);
      const assetSymbol = selectedAssetData?.symbol as "BTC" | "ETH" | "SOL" | "USDT" | "USDC" | "EURC" || 'USDT';

      // Check if this user-asset combination already exists
      const { data: existingEntry } = await supabase
        .from('positions')
        .select('id')
        .eq('user_id', selectedUser)
        .eq('asset_code', assetSymbol)
        .maybeSingle();

      if (existingEntry) {
        // Update existing entry
        const { error } = await supabase
          .from('positions')
          .update({ 
            current_balance: balance,
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
          .from('positions')
          .insert({
            user_id: selectedUser,
            asset_code: assetSymbol,
            current_balance: balance,
            principal: balance, // Set initial principal
            total_earned: 0,
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
      if (onRefresh) onRefresh();
      
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

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Portfolio Management</CardTitle>
          <CardDescription>View and modify investor portfolio balances</CardDescription>
        </div>
        <Button onClick={() => setAddDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Portfolio
        </Button>
      </CardHeader>
      <CardContent>
        <div className="flex mb-4">
          <div className="relative flex-grow">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by investor or asset..."
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
        
        {isLoading ? (
          <div className="flex justify-center p-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Investor</TableHead>
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
                      <TableCell>{portfolio.user_name || portfolio.user_email}</TableCell>
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
                          disabled={portfolio.id.startsWith('skeleton-')}
                        />
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => savePortfolioChanges(portfolio.id)}
                          disabled={saving || portfolio.id.startsWith('skeleton-')}
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
