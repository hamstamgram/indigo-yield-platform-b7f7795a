import { Card, CardContent, CardHeader, Button, Input } from "@/components/ui";
import { Plus, Search, Filter } from "lucide-react";
import { Link } from "react-router-dom";
import { useState } from "react";
import { CryptoIcon } from "@/components/CryptoIcons";
import { useInvestorPerformanceReports } from "@/hooks/data/useReports";

// Extract symbol from fund name (e.g., "eth_yield_fund" -> "ETH")
const getSymbolFromFundName = (fundName: string) => {
  return fundName?.split(/[_\s]/)[0]?.toUpperCase() || "BTC";
};

export default function ReportsPage() {
  const [searchTerm, setSearchTerm] = useState("");

  const { data: items, isLoading } = useInvestorPerformanceReports(searchTerm);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Reports</h1>
          <p className="text-muted-foreground">Generate and view reports</p>
        </div>
        <Button asChild>
          <Link to="/reports/new">
            <Plus className="mr-2 h-4 w-4" />
            New
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button variant="outline" size="icon">
              <Filter className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-12 text-center text-muted-foreground">Loading...</div>
          ) : items && items.length > 0 ? (
            <div className="space-y-4">
              {items.map((item) => (
                <Card key={item.id}>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <CryptoIcon 
                          symbol={getSymbolFromFundName(item.asset_code || "")} 
                          className="h-8 w-8"
                        />
                        <div>
                          <h3 className="font-semibold">
                            {item.asset_code?.replace(/_/g, " ").toUpperCase() || "Report"} - {item.report_month}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {new Date(item.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <Button variant="outline" size="sm" asChild>
                        <Link to={`/reports/${item.id}`}>View Details</Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center space-y-4">
              <p className="text-muted-foreground">No items found</p>
              <Button asChild>
                <Link to="/reports/new">Create your first item</Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
