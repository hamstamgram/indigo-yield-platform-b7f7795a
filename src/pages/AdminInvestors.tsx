
import { useState, useEffect } from "react";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import SearchBar from "@/components/admin/investors/SearchBar";
import InvestorsTable from "@/components/admin/investors/InvestorsTable";
import InvestorsHeader from "@/components/admin/investors/InvestorsHeader";

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
      <InvestorsHeader onCreateInvestor={handleCreateInvestor} />
      
      <Card className="border-0 shadow-md">
        <CardHeader>
          <CardTitle>All Investors</CardTitle>
          <CardDescription>
            View and manage all investor accounts and their portfolio data
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex mb-4">
            <SearchBar 
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
            />
          </div>
          
          <InvestorsTable
            investors={filteredInvestors}
            assets={assets}
            loading={loading}
            searchTerm={searchTerm}
            onViewDetails={viewInvestorDetails}
            onSendEmail={sendEmailToInvestor}
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminInvestors;
