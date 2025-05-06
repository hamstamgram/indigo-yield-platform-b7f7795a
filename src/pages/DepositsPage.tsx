
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { 
  CreditCard, 
  Plus, 
  Check, 
  Clock, 
  AlertCircle, 
  ChevronDown 
} from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";

// Types
interface Deposit {
  id: string;
  amount: number;
  asset_id: number;
  status: string;
  created_at: string;
  tx_hash?: string;
  asset?: {
    name: string;
    symbol: string;
  }
}

interface Asset {
  id: number;
  name: string;
  symbol: string;
}

const DepositsPage = () => {
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState("");
  const [amount, setAmount] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    const fetchDeposits = async () => {
      try {
        setLoading(true);
        
        // Fetch user's deposits
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user) {
          const { data: depositsData, error: depositsError } = await supabase
            .from('deposits')
            .select(`
              *,
              asset:asset_id (
                name,
                symbol
              )
            `)
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });
            
          if (depositsError) throw depositsError;
          
          setDeposits(depositsData || []);
          
          // Fetch available assets
          const { data: assetsData, error: assetsError } = await supabase
            .from('assets')
            .select('*')
            .eq('is_active', true);
            
          if (assetsError) throw assetsError;
          
          setAssets(assetsData || []);
        }
      } catch (error: any) {
        console.error("Error fetching deposits:", error);
        toast({
          title: "Error loading deposits",
          description: error.message || "Failed to load deposit history",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchDeposits();
  }, [toast]);

  const handleSubmitDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedAsset || !amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      toast({
        title: "Invalid input",
        description: "Please select an asset and enter a valid amount",
        variant: "destructive",
      });
      return;
    }
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) throw new Error("User not authenticated");
      
      const selectedAssetId = parseInt(selectedAsset);
      const amountValue = parseFloat(amount);
      
      // Create a new deposit request
      const { error } = await supabase
        .from('deposits')
        .insert({
          user_id: user.id,
          asset_id: selectedAssetId,
          amount: amountValue,
          status: 'pending'
        });
        
      if (error) throw error;
      
      toast({
        title: "Deposit request submitted",
        description: "Your deposit request has been submitted for processing.",
      });
      
      // Refresh deposits list
      const { data: depositsData } = await supabase
        .from('deposits')
        .select(`
          *,
          asset:asset_id (
            name,
            symbol
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
        
      setDeposits(depositsData || []);
      setOpen(false);
      setSelectedAsset("");
      setAmount("");
      
    } catch (error: any) {
      console.error("Error creating deposit:", error);
      toast({
        title: "Deposit request failed",
        description: error.message || "Failed to submit deposit request",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'confirmed':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
            <Check className="w-3 h-3 mr-1" /> Confirmed
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
            <Clock className="w-3 h-3 mr-1" /> Pending
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
            <AlertCircle className="w-3 h-3 mr-1" /> Failed
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400">
            {status}
          </span>
        );
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="font-['Space_Grotesk']">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Deposits</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" /> New Deposit
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Create Deposit Request</DialogTitle>
              <DialogDescription>
                Fill in the details to request a new deposit. You will receive instructions for completing the deposit.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmitDeposit}>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <label htmlFor="asset" className="text-sm font-medium">
                    Asset
                  </label>
                  <Select value={selectedAsset} onValueChange={setSelectedAsset}>
                    <SelectTrigger id="asset">
                      <SelectValue placeholder="Select asset to deposit" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectLabel>Available Assets</SelectLabel>
                        {assets.map((asset) => (
                          <SelectItem key={asset.id} value={asset.id.toString()}>
                            {asset.name} ({asset.symbol.toUpperCase()})
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <label htmlFor="amount" className="text-sm font-medium">
                    Amount
                  </label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.000001"
                    min="0.000001"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit">Submit Request</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="all" className="w-full">
        <TabsList className="mb-4 bg-gray-100 dark:bg-gray-800">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="confirmed">Confirmed</TabsTrigger>
        </TabsList>
        
        <TabsContent value="all">
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="flex flex-col items-center gap-2">
                <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-indigo-600"></div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Loading deposits...</p>
              </div>
            </div>
          ) : deposits.length > 0 ? (
            <div className="space-y-4">
              {deposits.map((deposit) => (
                <Card key={deposit.id} className="overflow-hidden border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">{deposit.asset?.symbol.toUpperCase()} Deposit</CardTitle>
                        <CardDescription>{formatDate(deposit.created_at)}</CardDescription>
                      </div>
                      {getStatusBadge(deposit.status)}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex justify-between items-center">
                      <span className="text-2xl font-semibold">{deposit.amount.toFixed(6)} {deposit.asset?.symbol.toUpperCase()}</span>
                      {deposit.tx_hash && (
                        <Button variant="outline" size="sm" className="text-xs">
                          View Transaction
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="text-center py-12 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
              <CardContent>
                <div className="mx-auto w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center mb-4">
                  <CreditCard className="h-6 w-6 text-gray-500 dark:text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No deposits yet</h3>
                <p className="text-gray-500 dark:text-gray-400 mb-6">You haven't made any deposits to your account yet.</p>
                <Button onClick={() => setOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" /> New Deposit
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>
        
        <TabsContent value="pending">
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="flex flex-col items-center gap-2">
                <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-indigo-600"></div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Loading deposits...</p>
              </div>
            </div>
          ) : deposits.filter(d => d.status === 'pending').length > 0 ? (
            <div className="space-y-4">
              {deposits.filter(d => d.status === 'pending').map((deposit) => (
                <Card key={deposit.id} className="overflow-hidden border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">{deposit.asset?.symbol.toUpperCase()} Deposit</CardTitle>
                        <CardDescription>{formatDate(deposit.created_at)}</CardDescription>
                      </div>
                      {getStatusBadge(deposit.status)}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex justify-between items-center">
                      <span className="text-2xl font-semibold">{deposit.amount.toFixed(6)} {deposit.asset?.symbol.toUpperCase()}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="text-center py-8 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
              <CardContent>
                <p className="text-gray-500 dark:text-gray-400 mb-2">No pending deposits</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
        
        <TabsContent value="confirmed">
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="flex flex-col items-center gap-2">
                <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-indigo-600"></div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Loading deposits...</p>
              </div>
            </div>
          ) : deposits.filter(d => d.status === 'confirmed').length > 0 ? (
            <div className="space-y-4">
              {deposits.filter(d => d.status === 'confirmed').map((deposit) => (
                <Card key={deposit.id} className="overflow-hidden border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">{deposit.asset?.symbol.toUpperCase()} Deposit</CardTitle>
                        <CardDescription>{formatDate(deposit.created_at)}</CardDescription>
                      </div>
                      {getStatusBadge(deposit.status)}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex justify-between items-center">
                      <span className="text-2xl font-semibold">{deposit.amount.toFixed(6)} {deposit.asset?.symbol.toUpperCase()}</span>
                      {deposit.tx_hash && (
                        <Button variant="outline" size="sm" className="text-xs">
                          View Transaction
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="text-center py-8 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
              <CardContent>
                <p className="text-gray-500 dark:text-gray-400 mb-2">No confirmed deposits</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DepositsPage;
