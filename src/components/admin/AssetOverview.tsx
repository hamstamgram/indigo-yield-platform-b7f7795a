
import React from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import AssetSummaryCard from "./AssetSummaryCard";

interface AssetSummary {
  id: number;
  symbol: string;
  name: string;
  totalBalance: number;
  usdValue: number;
  totalUsers: number;
  avgYield: number;
}

interface AssetOverviewProps {
  loading: boolean;
  assetSummaries: AssetSummary[];
}

const AssetOverview: React.FC<AssetOverviewProps> = ({ loading, assetSummaries }) => {
  return (
    <Card className="border-0 shadow-md">
      <CardHeader>
        <CardTitle>Asset Overview</CardTitle>
        <CardDescription>Summary of all assets under management</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {assetSummaries.map((asset) => (
              <AssetSummaryCard 
                key={asset.id}
                id={asset.id}
                symbol={asset.symbol}
                name={asset.name}
                totalBalance={asset.totalBalance}
                usdValue={asset.usdValue}
                totalUsers={asset.totalUsers}
                avgYield={asset.avgYield}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AssetOverview;
