import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, FileText, Download, Send, Calendar, User } from "lucide-react";

export default function AdminStatementsPage() {
  const [selectedInvestor, setSelectedInvestor] = useState<string>("");
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());
  const [selectedMonth, setSelectedMonth] = useState<string>((new Date().getMonth() + 1).toString());
  const [generatingStatement, setGeneratingStatement] = useState<string | null>(null);
  const queryClient = useQueryClient();

  // Get current year and previous years for selection
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);
  const months = [
    { value: "1", label: "January" },
    { value: "2", label: "February" },
    { value: "3", label: "March" },
    { value: "4", label: "April" },
    { value: "5", label: "May" },
    { value: "6", label: "June" },
    { value: "7", label: "July" },
    { value: "8", label: "August" },
    { value: "9", label: "September" },
    { value: "10", label: "October" },
    { value: "11", label: "November" },
    { value: "12", label: "December" },
  ];

  // Fetch all investors
  const { data: investors, isLoading: investorsLoading } = useQuery({
    queryKey: ['investors-all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('investors')
        .select('id, name, email')
        .eq('status', 'active')
        .order('name');
      if (error) throw error;
      return data;
    }
  });

  // Fetch existing statements
  const { data: statements, isLoading: statementsLoading } = useQuery({
    queryKey: ['statements-admin'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('type', 'statement')
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    }
  });

  // Generate statement mutation
  const generateStatementMutation = useMutation({
    mutationFn: async (params: { investorId: string; year: number; month: number }) => {
      setGeneratingStatement(params.investorId);
      
      // First get the statement data
      const { data: statementData, error: dataError } = await supabase.rpc('generate_statement_data', {
        p_investor_id: params.investorId,
        p_period_year: params.year,
        p_period_month: params.month
      });
      
      if (dataError) throw dataError;
      
      // Generate PDF (placeholder - would need actual PDF generation service)
      const pdfContent = generatePDF(statementData);
      
      // Upload to storage
      const fileName = `statement-${params.year}-${params.month.toString().padStart(2, '0')}.pdf`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('statements')
        .upload(`${params.investorId}/${fileName}`, pdfContent, {
          contentType: 'application/pdf',
          upsert: true
        });
      
      if (uploadError) throw uploadError;
      
      // Save document record
      const { data: docData, error: docError } = await supabase
        .from('documents')
        .insert({
          user_id: (statementData as any).investor.profile_id,
          type: 'statement',
          title: `Statement - ${months.find(m => m.value === params.month.toString())?.label} ${params.year}`,
          storage_path: uploadData.path,
          period_start: `${params.year}-${params.month.toString().padStart(2, '0')}-01`,
          period_end: new Date(params.year, params.month, 0).toISOString().split('T')[0],
          created_by: (await supabase.auth.getUser()).data.user?.id
        });
      
      if (docError) throw docError;
      
      return { statementData, document: docData };
    },
    onSuccess: (result, variables) => {
      toast.success("Statement generated successfully");
      queryClient.invalidateQueries({ queryKey: ['statements-admin'] });
      setGeneratingStatement(null);
    },
    onError: (error, variables) => {
      toast.error(`Failed to generate statement: ${error.message}`);
      setGeneratingStatement(null);
    }
  });

  // Send statement email mutation
  const sendStatementMutation = useMutation({
    mutationFn: async (params: { investorId: string; statementId: string; email: string }) => {
      const { data, error } = await supabase.functions.invoke('send-notification-email', {
        body: {
          to: params.email,
          template: 'statement_ready',
          subject: 'Your Monthly Statement is Ready',
          data: {
            name: investors?.find(i => i.id === params.investorId)?.name || 'Investor',
            period: `${months.find(m => m.value === selectedMonth)?.label} ${selectedYear}`,
            link: `${window.location.origin}/investor/statements`
          }
        }
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Statement notification sent successfully");
    },
    onError: (error) => {
      toast.error(`Failed to send notification: ${error.message}`);
    }
  });

  // Placeholder PDF generation function
  const generatePDF = (statementData: any): Blob => {
    // In a real implementation, this would use jsPDF or similar library
    const content = `
      MONTHLY STATEMENT
      
      Investor: ${statementData.investor.name}
      Period: ${statementData.period.month}/${statementData.period.year}
      
      Positions:
      ${JSON.stringify(statementData.positions, null, 2)}
      
      Summary:
      Total AUM: $${statementData.summary.total_aum}
      Total P&L: $${statementData.summary.total_pnl}
      Total Fees: $${statementData.summary.total_fees}
    `;
    return new Blob([content], { type: 'application/pdf' });
  };

  const handleGenerateStatement = () => {
    if (!selectedInvestor || !selectedYear || !selectedMonth) {
      toast.error("Please select investor, year, and month");
      return;
    }

    generateStatementMutation.mutate({
      investorId: selectedInvestor,
      year: parseInt(selectedYear),
      month: parseInt(selectedMonth)
    });
  };

  const handleSendStatement = (investorId: string, statementId: string, email: string) => {
    sendStatementMutation.mutate({ investorId, statementId, email });
  };

  if (investorsLoading || statementsLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Statement Management</h1>
        <p className="text-muted-foreground">
          Generate and manage investor monthly statements
        </p>
      </div>

      {/* Generate New Statement */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Generate New Statement
          </CardTitle>
          <CardDescription>
            Create monthly statements for investors
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Investor</Label>
              <Select value={selectedInvestor} onValueChange={setSelectedInvestor}>
                <SelectTrigger>
                  <SelectValue placeholder="Select investor" />
                </SelectTrigger>
                <SelectContent>
                  {investors?.map((investor) => (
                    <SelectItem key={investor.id} value={investor.id}>
                      {investor.name} ({investor.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Year</Label>
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger>
                  <SelectValue placeholder="Select year" />
                </SelectTrigger>
                <SelectContent>
                  {years.map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Month</Label>
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger>
                  <SelectValue placeholder="Select month" />
                </SelectTrigger>
                <SelectContent>
                  {months.map((month) => (
                    <SelectItem key={month.value} value={month.value}>
                      {month.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button 
            onClick={handleGenerateStatement}
            disabled={generateStatementMutation.isPending || !!generatingStatement}
            className="w-full md:w-auto"
          >
            {generateStatementMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Generating Statement...
              </>
            ) : (
              <>
                <FileText className="h-4 w-4 mr-2" />
                Generate Statement
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Existing Statements */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Statements</CardTitle>
          <CardDescription>
            Previously generated statements
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {statements?.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No statements generated yet
              </div>
            ) : (
              statements?.map((statement) => (
                <div key={statement.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      <span className="font-semibold">
                        Statement User
                      </span>
                      <span className="text-sm text-muted-foreground">
                        (User ID: {statement.user_id})
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">
                        <Calendar className="h-3 w-3 mr-1" />
                        {new Date(statement.period_start).toLocaleDateString()}
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{statement.title}</div>
                      <div className="text-sm text-muted-foreground">
                        Created: {new Date(statement.created_at).toLocaleDateString()}
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">
                        <Download className="h-4 w-4 mr-1" />
                        Download
                      </Button>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button size="sm">
                            <Send className="h-4 w-4 mr-1" />
                            Send
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Send Statement</DialogTitle>
                            <DialogDescription>
                              Send statement notification to user
                            </DialogDescription>
                          </DialogHeader>
                          <div className="py-4">
                            <p>This will send an email notification with a link to access the statement.</p>
                          </div>
                          <DialogFooter>
                            <Button 
                              onClick={() => handleSendStatement(
                                statement.user_id, 
                                statement.id, 
                                'user@example.com'
                              )}
                              disabled={sendStatementMutation.isPending}
                            >
                              {sendStatementMutation.isPending ? (
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                              ) : (
                                <Send className="h-4 w-4 mr-2" />
                              )}
                              Send Email
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
