/**
 * Investor Reports Tab
 * Shows report status and provides quick actions for investor reports
 */

import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, Button, Badge } from "@/components/ui";
import { FileText, ExternalLink, Eye, Send, Loader2, Calendar, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";
import { useInvestorReportPeriods } from "@/features/investor/settings/hooks/useInvestorSettings";
interface InvestorReportsTabProps {
  investorId: string;
  investorName?: string;
}

export function InvestorReportsTab({ investorId, investorName }: InvestorReportsTabProps) {
  const navigate = useNavigate();

  const { data, isLoading: loading } = useInvestorReportPeriods(investorId);
  const periods = data?.periods || [];
  const latestPeriod = data?.latestPeriod || null;

  const handleOpenFullReports = () => {
    navigate(`/admin/investor-reports?investorId=${investorId}`);
  };

  const handlePreviewLatest = () => {
    if (!latestPeriod) return;
    const monthStr = `${latestPeriod.year}-${String(latestPeriod.month).padStart(2, "0")}`;
    navigate(`/admin/investor-reports?investorId=${investorId}&month=${monthStr}`);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-muted-foreground" />
          <h3 className="font-semibold">Investor Reports</h3>
        </div>
        <Button variant="outline" size="sm" onClick={handleOpenFullReports}>
          <ExternalLink className="h-4 w-4 mr-2" />
          Open Full Reports
        </Button>
      </div>

      {/* Latest Report Status */}
      {latestPeriod ? (
        <Card className="border-l-4 border-l-primary">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Latest Report:{" "}
              {format(new Date(latestPeriod.year, latestPeriod.month - 1), "MMMM yyyy")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant="default" className="gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  Data Available
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {latestPeriod.fundCount} fund{latestPeriod.fundCount !== 1 ? "s" : ""}
                </span>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handlePreviewLatest}>
                <Eye className="h-4 w-4 mr-2" />
                Preview
              </Button>
              <Button variant="outline" size="sm" onClick={handleOpenFullReports}>
                <Send className="h-4 w-4 mr-2" />
                Send Report
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>No report data available for this investor</p>
            <Button variant="outline" className="mt-4" onClick={handleOpenFullReports}>
              Open Reports Page
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Recent Periods */}
      {periods.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Recent Periods</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-2">
              {periods.slice(0, 6).map((period) => (
                <div
                  key={period.id}
                  className={`p-3 rounded-lg text-center text-sm ${
                    period.hasData
                      ? "bg-primary/10 text-primary font-medium"
                      : "bg-muted/50 text-muted-foreground"
                  }`}
                >
                  {format(new Date(period.year, period.month - 1), "MMM yyyy")}
                  {period.hasData && <div className="text-xs mt-1">{period.fundCount} funds</div>}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default InvestorReportsTab;
