import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PieChart, TrendingUp, Users, DollarSign } from 'lucide-react';

interface SimplePortfolio {
  id: string;
  name: string;
  owner_name: string;
  email: string;
  total_value_usd: number;
  asset_count: number;
  status: string;
}

export default function AdminPortfolioDashboard() {
  const [portfolios] = useState<SimplePortfolio[]>([
    {
      id: '1',
      name: 'Growth Portfolio',
      owner_name: 'REDACTED',
      email: 'REDACTED',
      total_value_usd: 125000,
      asset_count: 5,
      status: 'active'
    },
    {
      id: '2',
      name: 'Conservative Portfolio',
      owner_name: 'REDACTED',
      email: 'REDACTED', 
      total_value_usd: 75000,
      asset_count: 3,
      status: 'active'
    },
    {
      id: '3',
      name: 'High Risk Portfolio',
      owner_name: 'REDACTED',
      email: 'REDACTED',
      total_value_usd: 200000,
      asset_count: 8,
      status: 'active'
    }
  ]);

  const totalValue = portfolios.reduce((sum, p) => sum + p.total_value_usd, 0);
  const totalAssets = portfolios.reduce((sum, p) => sum + p.asset_count, 0);

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Portfolio Dashboard</h1>
          <p className="text-muted-foreground">Administrative overview of all portfolios</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Portfolios</CardTitle>
            <PieChart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{portfolios.length}</div>
            <p className="text-xs text-muted-foreground">
              Active portfolios
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Value</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${totalValue.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              Combined portfolio value
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Assets</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalAssets}</div>
            <p className="text-xs text-muted-foreground">
              Across all portfolios
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{portfolios.length}</div>
            <p className="text-xs text-muted-foreground">
              Portfolio owners
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PieChart className="h-5 w-5" />
            Portfolio Overview
          </CardTitle>
          <CardDescription>
            Detailed view of all managed portfolios
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {portfolios.map((portfolio) => (
              <div
                key={portfolio.id}
                className="flex items-center justify-between p-4 border rounded-lg bg-card"
              >
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium">{portfolio.name}</h3>
                    <Badge variant="default">{portfolio.status}</Badge>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>Owner: {portfolio.owner_name}</span>
                    <span>•</span>
                    <span>Email: {portfolio.email}</span>
                    <span>•</span>
                    <span>Assets: {portfolio.asset_count}</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-semibold">
                    ${portfolio.total_value_usd.toLocaleString()}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Portfolio Value
                  </div>
                </div>
              </div>
            ))}
          </div>

          {portfolios.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No portfolios found
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}