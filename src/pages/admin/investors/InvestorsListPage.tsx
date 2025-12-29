import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, Input } from "@/components/ui";
import { InvestorsTable, AddInvestorDialog } from "@/components/admin";
import { Search } from "lucide-react";
import { adminServiceV2, InvestorSummaryV2, deleteInvestorUser } from "@/services/admin";
import { assetService } from "@/services/shared";
import { AssetRef as Asset } from "@/types/asset";
import { useToast } from "@/hooks";

export default function InvestorsListPage() {
  const [investors, setInvestors] = useState<InvestorSummaryV2[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [investorsData, assetsData] = await Promise.all([
        adminServiceV2.getAllInvestorsWithSummary(),
        assetService.getAssets(),
      ]);
      setInvestors(investorsData);
      // Transform Asset type to match investorTypes.Asset
      const transformedAssets: Asset[] = assetsData.map((a) => ({
        id: parseInt(a.asset_id.split("-")[0]) || 0,
        symbol: a.symbol,
        name: a.name,
      }));
      setAssets(transformedAssets);
    } catch (error) {
      console.error("Failed to load investors list:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleDeleteInvestor = async (investorId: string) => {
    try {
      await deleteInvestorUser(investorId);
      toast({
        title: "Investor deleted",
        description: "The investor has been successfully removed.",
      });
      loadData(); // Refresh the list
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to delete investor";
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    }
  };

  const filteredInvestors = investors.filter((inv) => {
    const search = searchTerm.toLowerCase();
    return (
      inv.firstName.toLowerCase().includes(search) ||
      inv.lastName.toLowerCase().includes(search) ||
      inv.email.toLowerCase().includes(search)
    );
  });

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Investor Management</h1>
          <p className="text-muted-foreground">Manage all investor accounts and portfolios</p>
        </div>
        <div className="flex gap-2">
          <AddInvestorDialog assets={assets} onInvestorAdded={loadData} />
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Investors Directory</CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search investors..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <InvestorsTable
            investors={filteredInvestors}
            assets={assets}
            loading={isLoading}
            searchTerm={searchTerm}
            onSendEmail={() => {}}
            onRefresh={loadData}
            onDelete={handleDeleteInvestor}
          />
        </CardContent>
      </Card>
    </div>
  );
}
