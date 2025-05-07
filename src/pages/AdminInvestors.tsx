
import { useState, useEffect } from "react";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, Search, Mail, Plus, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { CryptoIcon } from "@/components/CryptoIcons";

type Investor = {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  created_at: string;
  portfolio_summary?: {
    [key: string]: {
      balance: number;
      usd_value: number;
    }
  }
};

type Asset = {
  id: number;
  symbol: string;
  name: string;
};

const AdminInvestors = () => {
  const [investors, setInvestors] = useState<Investor[]>([]);
  const [filteredInvestors, setFilteredInvestors] = useState<Investor[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [assets, setAssets] = useState<Asset[]>([]);
  const { toast } = useToast();
  const navigate = useNavigate();

  // Format currency
  const formatCurrency = (value: number = 0) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value);
  };

  // Format crypto amounts
  const formatCrypto = (value: number = 0, symbol: string) => {
    const decimals = symbol.toLowerCase() === 'btc' ? 8 : 
                    symbol.toLowerCase() === 'usdc' ? 2 : 4;
    return `${value.toFixed(decimals)}`;
  };

  useEffect(() => {
    const checkAdminStatus = async () => {
      try {
        // Check if user is logged in
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          navigate('/login');
          return false;
        }
        
        // Check if user is an admin
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('is_admin')
          .eq('id', user.id)
          .single();
        
        if (error || !profile?.is_admin) {
          toast({
            title: "Access Denied",
            description: "You don't have permission to access this page.",
            variant: "destructive",
          });
          navigate('/dashboard');
          return false;
        }
        
        return true;
      } catch (error) {
        console.error("Error checking admin status:", error);
        navigate('/dashboard');
        return false;
      }
    };
    
    const fetchData = async () => {
      try {
        const isAdmin = await checkAdminStatus();
        if (!isAdmin) return;
        
        setLoading(true);
        
        // Fetch all assets
        const { data: assetData, error: assetError } = await supabase
          .from('assets')
          .select('id, symbol, name')
          .order('id');
        
        if (assetError) throw assetError;
        setAssets(assetData || []);
        
        // Get all non-admin users (investors)
        const { data: userData, error: userError } = await supabase
          .from('profiles')
          .select('id, email, first_name, last_name, created_at')
          .eq('is_admin', false)
          .order('created_at', { ascending: false });
        
        if (userError) throw userError;
        
        // Fetch portfolio data for each investor
        const investorsWithPortfolios = await Promise.all((userData || []).map(async (investor) => {
          // Get portfolio data
          const { data: portfolioData } = await supabase
            .from('portfolios')
            .select(`
              balance,
              asset_id,
              assets (
                symbol
              )
            `)
            .eq('user_id', investor.id);
            
          // Create portfolio summary by asset
          const portfolioSummary: { [key: string]: { balance: number, usd_value: number } } = {};
          
          if (portfolioData && portfolioData.length > 0) {
            portfolioData.forEach(item => {
              const symbol = item.assets.symbol;
              const balance = Number(item.balance);
              
              // Mock price calculation (in production, fetch real prices)
              const price = symbol === 'BTC' ? 67500 : 
                          symbol === 'ETH' ? 3200 : 
                          symbol === 'SOL' ? 148 : 
                          symbol === 'USDC' ? 1 : 0;
              
              portfolioSummary[symbol] = {
                balance,
                usd_value: balance * price
              };
            });
          }
          
          return {
            ...investor,
            portfolio_summary: portfolioSummary
          };
        }));
        
        setInvestors(investorsWithPortfolios);
        setFilteredInvestors(investorsWithPortfolios);
      } catch (error) {
        console.error('Error fetching investor data:', error);
        toast({
          title: "Error",
          description: "Failed to load investor data",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [navigate, toast]);
  
  // Handle search
  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredInvestors(investors);
    } else {
      const term = searchTerm.toLowerCase();
      const filtered = investors.filter(investor => 
        investor.email?.toLowerCase().includes(term) || 
        investor.first_name?.toLowerCase().includes(term) ||
        investor.last_name?.toLowerCase().includes(term)
      );
      setFilteredInvestors(filtered);
    }
  }, [searchTerm, investors]);
  
  // Clear search
  const clearSearch = () => {
    setSearchTerm("");
  };
  
  // Navigate to create investor page
  const handleCreateInvestor = () => {
    navigate('/admin?tab=invites');
  };
  
  // View investor details
  const viewInvestorDetails = (investorId: string) => {
    // In a real app, this would navigate to a detailed investor view
    console.log("View investor details:", investorId);
  };
  
  // Send email to investor
  const sendEmailToInvestor = (email: string) => {
    toast({
      title: "Email feature",
      description: `Feature to email ${email} would be implemented here`,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Investor Management</h1>
        <Button onClick={handleCreateInvestor}>
          <Plus className="h-4 w-4 mr-2" />
          Invite New Investor
        </Button>
      </div>
      
      <Card className="border-0 shadow-md">
        <CardHeader>
          <CardTitle>All Investors</CardTitle>
          <CardDescription>
            View and manage all investor accounts and their portfolio data
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex mb-4">
            <div className="relative flex-grow">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or email..."
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
            <div className="flex justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Investor</TableHead>
                    {assets.map(asset => (
                      <TableHead key={asset.id}>
                        <div className="flex items-center">
                          <CryptoIcon symbol={asset.symbol} className="h-5 w-5 mr-2" />
                          {asset.symbol}
                        </div>
                      </TableHead>
                    ))}
                    <TableHead>Total Value</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInvestors.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={assets.length + 3} className="text-center py-6">
                        {searchTerm ? "No investors match your search" : "No investors found"}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredInvestors.map((investor) => {
                      // Calculate total portfolio value
                      let totalValue = 0;
                      if (investor.portfolio_summary) {
                        Object.values(investor.portfolio_summary).forEach(asset => {
                          totalValue += asset.usd_value;
                        });
                      }
                      
                      return (
                        <TableRow key={investor.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">
                                {investor.first_name || ''} {investor.last_name || ''}
                              </div>
                              <div className="text-sm text-gray-500">
                                {investor.email}
                              </div>
                            </div>
                          </TableCell>
                          
                          {assets.map(asset => (
                            <TableCell key={`${investor.id}-${asset.id}`}>
                              {investor.portfolio_summary && investor.portfolio_summary[asset.symbol] ? (
                                <div>
                                  <div className="font-medium">
                                    {formatCrypto(investor.portfolio_summary[asset.symbol].balance, asset.symbol)}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    {formatCurrency(investor.portfolio_summary[asset.symbol].usd_value)}
                                  </div>
                                </div>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </TableCell>
                          ))}
                          
                          <TableCell>
                            <span className="font-medium">
                              {formatCurrency(totalValue)}
                            </span>
                          </TableCell>
                          
                          <TableCell className="text-right">
                            <div className="flex justify-end space-x-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => viewInvestorDetails(investor.id)}
                              >
                                Details
                              </Button>
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={() => sendEmailToInvestor(investor.email)}
                              >
                                <Mail className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
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
