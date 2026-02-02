import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, Input } from "@/components/ui";
import { InvestorsTable, AddInvestorDialog } from "@/components/admin";
import { Search } from "lucide-react";
import { useAdminInvestorsWithAssets, useDeleteInvestor } from "@/hooks/data/admin";

export default function InvestorsListPage() {
  const { investors, assets, isLoading, refetch } = useAdminInvestorsWithAssets();
  const deleteInvestorMutation = useDeleteInvestor();
  const [searchTerm, setSearchTerm] = useState("");

  const handleDeleteInvestor = async (investorId: string) => {
    deleteInvestorMutation.mutate(investorId);
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
          <AddInvestorDialog assets={assets} onInvestorAdded={refetch} />
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
            onRefresh={refetch}
            onDelete={handleDeleteInvestor}
          />
        </CardContent>
      </Card>
    </div>
  );
}
