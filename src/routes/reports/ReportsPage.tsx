import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Filter } from "lucide-react";
import { Link } from "react-router-dom";
import { useState } from "react";

export default function ReportsPage() {
  const [searchTerm, setSearchTerm] = useState("");

  const { data: items, isLoading } = useQuery({
    queryKey: ["investor_fund_performance", searchTerm],
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("No user");

      // Get investor ID (One ID: it's the user.id)
      const investorId = user.id;

      // Query investor_fund_performance (V2) with investor_id
      let query = supabase
        .from("investor_fund_performance")
        .select(`
          id,
          fund_name,
          period:statement_periods(period_end_date, year, month),
          created_at
        `)
        .eq("investor_id", investorId);

      if (searchTerm) {
        query = query.ilike("fund_name", `%${searchTerm}%`);
      }

      const { data, error } = await query.order("period(period_end_date)", { ascending: false });
      if (error) {
        console.error("Error fetching reports:", error);
        return [];
      }
      return data.map(item => ({
        id: item.id,
        asset_code: item.fund_name,
        report_month: `${item.period?.year}-${String(item.period?.month).padStart(2, '0')}`,
        created_at: item.created_at,
      }));
    },
  });

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
                      <div>
                        <h3 className="font-semibold">
                          {item.asset_code?.replace(/_/g, " ").toUpperCase() || "Report"} - {item.report_month}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {new Date(item.created_at).toLocaleDateString()}
                        </p>
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
