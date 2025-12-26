import { usePerAssetStats } from "@/hooks/useInvestorPerformance";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ResponsiveTable } from "@/components/ui/responsive-table";
import { EmptyState } from "@/components/ui/empty-state";
import { getAssetLogo, getAssetName, formatAssetAmount, formatSignedAssetAmount } from "@/utils/assets";
import PageHeader from "@/components/layout/PageHeader";
import { Wallet, Loader2 } from "lucide-react";
import { format } from "date-fns";

export default function InvestorPortfolioPage() {
  const { data: assetStats, isLoading } = usePerAssetStats();

  const positions = assetStats?.assets?.map((asset) => ({
    fundName: asset.fundName,
    assetSymbol: asset.assetSymbol,
    tokenAmount: asset.mtd.endingBalance || 0,
    costBasis: (asset as any).itd?.endingBalance || asset.mtd.endingBalance || 0,
    netChanges: asset.mtd.netIncome || 0,
    lastUpdated: new Date().toISOString(),
  })) || [];

  const columns = [
    {
      header: "Asset",
      cell: (item: typeof positions[0]) => (
        <div className="flex items-center gap-3">
          <img
            src={getAssetLogo(item.assetSymbol)}
            alt={item.assetSymbol}
            className="h-8 w-8 rounded-full"
          />
          <div>
            <p className="font-medium">{getAssetName(item.assetSymbol)}</p>
            <p className="text-xs text-muted-foreground">{item.assetSymbol}</p>
          </div>
        </div>
      ),
    },
    {
      header: "Token Amount",
      cell: (item: typeof positions[0]) => (
        <span className="font-mono font-semibold">
          {formatAssetAmount(item.tokenAmount, item.assetSymbol)}
        </span>
      ),
    },
    {
      header: "Cost Basis",
      cell: (item: typeof positions[0]) => (
        <span className="font-mono text-muted-foreground">
          {formatAssetAmount(item.costBasis, item.assetSymbol)}
        </span>
      ),
    },
    {
      header: "Net Changes (MTD)",
      cell: (item: typeof positions[0]) => (
        <span
          className={`font-mono font-medium ${
            item.netChanges >= 0 ? "text-green-600" : "text-red-600"
          }`}
        >
          {formatSignedAssetAmount(item.netChanges, item.assetSymbol)}
        </span>
      ),
    },
    {
      header: "Last Updated",
      cell: (item: typeof positions[0]) => (
        <span className="text-muted-foreground text-sm">
          {format(new Date(item.lastUpdated), "MMM d, yyyy")}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-20 px-4 md:px-6 lg:px-0">
      <PageHeader
        title="Portfolio"
        subtitle="Your fund asset positions"
        icon={Wallet}
      />

      <Card>
        <CardHeader>
          <CardTitle>Positions by Fund</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : positions.length > 0 ? (
            <ResponsiveTable
              data={positions}
              columns={columns}
              keyExtractor={(item) => item.fundName}
            />
          ) : (
            <EmptyState
              icon={Wallet}
              title="No Positions"
              description="Your fund positions will appear here once you have active investments."
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
