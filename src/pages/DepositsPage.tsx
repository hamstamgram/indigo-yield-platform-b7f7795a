
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { 
  CreditCard, 
  Check, 
  Clock, 
  AlertCircle
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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

const DepositsPage = () => {
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [loading, setLoading] = useState(true);
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
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Deposits</h1>
        <p className="text-gray-500 dark:text-gray-400">View your deposit history</p>
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
                        <div className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                          TX: {deposit.tx_hash.substring(0, 10)}...
                        </div>
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
                <p className="text-gray-500 dark:text-gray-400">Your deposits will be managed by the fund administrators.</p>
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
                        <div className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                          TX: {deposit.tx_hash.substring(0, 10)}...
                        </div>
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
