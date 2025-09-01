import { useState, useEffect } from "react";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { Download, FileText, Calendar, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

interface Statement {
  id: string;
  period_year: number;
  period_month: number;
  asset_code: string;
  begin_balance: number;
  end_balance: number;
  net_income: number;
  storage_path: string | null;
  created_at: string;
}

const StatementsPage = () => {
  const [statements, setStatements] = useState<Statement[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState<string | null>(null);

  useEffect(() => {
    fetchStatements();
  }, []);

  const fetchStatements = async () => {
    try {
      setLoading(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Please sign in to view statements");
        return;
      }

      const { data, error } = await supabase
        .from('statements')
        .select('*')
        .eq('investor_id', user.id)
        .order('period_year', { ascending: false })
        .order('period_month', { ascending: false });

      if (error) {
        console.error('Error fetching statements:', error);
        toast.error("Failed to load statements");
        return;
      }

      setStatements(data || []);
    } catch (error) {
      console.error('Error:', error);
      toast.error("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (statement: Statement) => {
    if (!statement.storage_path) {
      toast.error("Statement PDF not available");
      return;
    }

    try {
      setDownloading(statement.id);

      // Generate a signed URL for the statement PDF
      const { data, error } = await supabase.storage
        .from('statements')
        .createSignedUrl(statement.storage_path, 60); // URL valid for 60 seconds

      if (error || !data) {
        throw new Error('Failed to generate download link');
      }

      // Open the signed URL in a new tab to trigger download
      window.open(data.signedUrl, '_blank');
      toast.success("Statement download started");
      
    } catch (error) {
      console.error('Error downloading statement:', error);
      toast.error("Failed to download statement");
    } finally {
      setDownloading(null);
    }
  };

  const formatPeriod = (year: number, month: number) => {
    const date = new Date(year, month - 1);
    return format(date, 'MMMM yyyy');
  };

  const formatCurrency = (value: number, assetCode: string) => {
    const decimals = ['USDC', 'USDT', 'EURC'].includes(assetCode) ? 2 : 8;
    return `${value.toFixed(decimals)} ${assetCode}`;
  };

  if (loading) {
    return (
      <div className="space-y-6 px-6 py-8">
        <Skeleton className="h-12 w-64" />
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 px-6 py-8">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Statements</h1>
        <p className="text-muted-foreground mt-1">
          View and download your monthly portfolio statements
        </p>
      </div>

      {/* Statements List */}
      {statements.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="flex flex-col items-center justify-center space-y-4">
              <div className="rounded-full bg-muted p-4">
                <FileText className="h-8 w-8 text-muted-foreground" />
              </div>
              <div className="text-center">
                <h3 className="text-lg font-semibold">No statements yet</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Your monthly statements will appear here once generated
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Available Statements</CardTitle>
            <CardDescription>
              Click download to get your statement PDF
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Period</TableHead>
                    <TableHead>Asset</TableHead>
                    <TableHead className="text-right">Beginning Balance</TableHead>
                    <TableHead className="text-right">Net Income</TableHead>
                    <TableHead className="text-right">Ending Balance</TableHead>
                    <TableHead>Generated</TableHead>
                    <TableHead className="text-center">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {statements.map((statement) => (
                    <TableRow key={statement.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center space-x-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span>{formatPeriod(statement.period_year, statement.period_month)}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{statement.asset_code}</Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatCurrency(Number(statement.begin_balance), statement.asset_code)}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        <span className={Number(statement.net_income) >= 0 ? "text-green-600" : "text-red-600"}>
                          {Number(statement.net_income) >= 0 ? '+' : ''}
                          {formatCurrency(Number(statement.net_income), statement.asset_code)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatCurrency(Number(statement.end_balance), statement.asset_code)}
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {format(new Date(statement.created_at), 'MMM d, yyyy')}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        {statement.storage_path ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDownload(statement)}
                            disabled={downloading === statement.id}
                          >
                            {downloading === statement.id ? (
                              <>
                                <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent mr-2" />
                                Downloading...
                              </>
                            ) : (
                              <>
                                <Download className="h-4 w-4 mr-2" />
                                Download
                              </>
                            )}
                          </Button>
                        ) : (
                          <Badge variant="secondary">Pending</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Information Alert */}
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Statement Generation</AlertTitle>
        <AlertDescription>
          Statements are automatically generated at the end of each month. 
          You'll receive an email notification when your new statement is ready.
        </AlertDescription>
      </Alert>
    </div>
  );
};

export default StatementsPage;
