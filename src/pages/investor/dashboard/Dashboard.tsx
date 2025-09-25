import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Coins, TrendingUp, TrendingDown, Info } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAssetData } from "@/hooks/useAssetData";
import { useNavigate } from "react-router-dom";
import { formatTokenBalance } from "@/utils/tokenFormatting";

const Dashboard = () => {
  const navigate = useNavigate();
  const { assetSummaries, loading, error, userName } = useAssetData();
  const [portfolioData, setPortfolioData] = useState<any[]>([]);

  useEffect(() => {
    // Portfolio data loading is temporarily disabled during schema migration
    setPortfolioData([]);
  }, []);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="h-32 bg-gray-200 rounded"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
          </div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="p-6">
            <div className="text-center text-red-600">
              Error loading dashboard: {error}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleAssetClick = (symbol: string) => {
    navigate(`/asset/${symbol.toLowerCase()}`);
  };

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      {/* Welcome Header */}
      <div>
        <h1 className="text-3xl font-bold">Welcome back{userName ? `, ${userName}` : ''}!</h1>
        <p className="text-muted-foreground">Here's an overview of your portfolio</p>
      </div>

      {/* Portfolio Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Assets</CardTitle>
            <Coins className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{assetSummaries.length}</div>
            <p className="text-xs text-muted-foreground">
              Different cryptocurrencies
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Portfolio Status</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Active</div>
            <p className="text-xs text-muted-foreground">
              All positions tracked
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Asset Portfolio */}
      <Card>
        <CardHeader>
          <CardTitle>Your Portfolio</CardTitle>
          <CardDescription>
            Your cryptocurrency holdings in native token amounts
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {assetSummaries.map((asset) => (
              <div
                key={asset.symbol}
                className="p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                onClick={() => handleAssetClick(asset.symbol)}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Coins className="h-5 w-5 text-primary" />
                    <div>
                      <div className="font-semibold">{asset.symbol}</div>
                      <div className="text-sm text-muted-foreground">{asset.name}</div>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span>Balance:</span>
                    <span className="font-mono font-semibold">
                      {formatTokenBalance(asset.balance || 0, asset.symbol)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {assetSummaries.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Coins className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No assets found in your portfolio</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;