/**
 * Monthly Statement Manager - Admin Component
 *
 * Complete workflow for generating and sending monthly investor statements:
 * 1. Create statement period
 * 2. Input performance data for each investor/fund
 * 3. Generate HTML statements
 * 4. Preview before sending
 * 5. Send emails to all investors
 *
 * Features:
 * - Bulk data input
 * - Individual preview with desktop/mobile toggle
 * - Send confirmation modal with recipient list
 * - Batch send with pre-flight checklist
 * - Delivery tracking
 * - Error handling
 */

import { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Loader2, Check, Eye, Send, FileText, Calendar, Users, Mail, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { statementsApi, type InvestorStatementSummary } from "@/services/api/statementsApi";
import { ReportPreviewModal } from "./reports/ReportPreviewModal";
import { SendConfirmationModal } from "./reports/SendConfirmationModal";
import { BatchSendDialog } from "./reports/BatchSendDialog";

const createPeriodSchema = z.object({
  year: z.number().min(2024).max(2100),
  month: z.number().min(1).max(12),
  period_name: z.string().min(1, "Period name required"),
  period_end_date: z.string().min(1, "End date required"),
});

interface StatementPeriod {
  id: string;
  year: number;
  month: number;
  period_name: string;
  period_end_date: string;
  status: "DRAFT" | "FINALIZED" | "SENT";
  created_at: string;
}

export function MonthlyStatementManager() {
  const [periods, setPeriods] = useState<StatementPeriod[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<StatementPeriod | null>(null);
  const [investors, setInvestors] = useState<InvestorStatementSummary[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  
  // New modal states
  const [previewModal, setPreviewModal] = useState<{
    open: boolean;
    html: string;
    investorName: string;
    recipientEmails: string[];
  }>({ open: false, html: "", investorName: "", recipientEmails: [] });
  
  const [sendModal, setSendModal] = useState<{
    open: boolean;
    investorId: string;
    investorName: string;
    recipientEmails: string[];
    generatedAt?: string;
    isOutdated: boolean;
  }>({ open: false, investorId: "", investorName: "", recipientEmails: [], isOutdated: false });
  
  const [batchSendOpen, setBatchSendOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);
  
  const { toast } = useToast();

  const {
    register: registerPeriod,
    handleSubmit: handleSubmitPeriod,
    formState: { errors: periodErrors },
    reset: resetPeriod,
  } = useForm<z.infer<typeof createPeriodSchema>>({
    resolver: zodResolver(createPeriodSchema),
  });

  // Load periods on mount
  const loadPeriods = useCallback(async () => {
    try {
      const { data, error } = await statementsApi.getPeriods();
      if (error) throw new Error(error);
      setPeriods((data as StatementPeriod[]) || []);
    } catch (error) {
      console.error("Load periods error:", error);
      toast({
        title: "Error",
        description: "Failed to load statement periods",
        variant: "destructive",
      });
    }
  }, [toast]);

  // Load investors when period selected
  const loadInvestors = useCallback(
    async (periodId: string) => {
      setIsLoading(true);
      try {
        const { data, error } = await statementsApi.getPeriodInvestors(periodId);
        if (error) throw new Error(error);
        setInvestors(data || []);
      } catch (error) {
        console.error("Load investors error:", error);
        toast({
          title: "Error",
          description: "Failed to load investors",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    },
    [toast]
  );

  useEffect(() => {
    loadPeriods();
  }, [loadPeriods]);

  useEffect(() => {
    if (selectedPeriod) {
      loadInvestors(selectedPeriod.id);
    }
  }, [loadInvestors, selectedPeriod]);

  const handleCreatePeriod = async (data: z.infer<typeof createPeriodSchema>) => {
    try {
      const { error } = await statementsApi.createPeriod(data as {
        year: number;
        month: number;
        period_name: string;
        period_end_date: string;
      });
      if (error) throw new Error(error);

      toast({
        title: "Period Created",
        description: `Statement period for ${data.period_name} created successfully`,
      });

      setShowCreateDialog(false);
      resetPeriod();
      loadPeriods();
    } catch (error) {
      console.error("Create period error:", error);
      toast({
        title: "Error",
        description: "Failed to create statement period",
        variant: "destructive",
      });
    }
  };

  const handleGenerateAll = async () => {
    if (!selectedPeriod) return;

    setIsLoading(true);
    try {
      const { data, error } = await statementsApi.generateAll(selectedPeriod.id);
      if (error) throw new Error(error);

      if (data && data.failed > 0) {
        toast({
          title: "Statements Generated with Errors",
          description: `Generated ${data.success} statements successfully. ${data.failed} failed.`,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Statements Generated",
          description: `Generated ${data?.success || 0} statements successfully`,
        });
      }

      loadInvestors(selectedPeriod.id);
    } catch (error) {
      console.error("Generate statements error:", error);
      toast({
        title: "Error",
        description: "Failed to generate statements",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePreview = async (investor: InvestorStatementSummary) => {
    if (!selectedPeriod) return;

    try {
      const { data, error } = await statementsApi.previewStatement(selectedPeriod.id, investor.id);
      if (error) throw new Error(error);

      setPreviewModal({
        open: true,
        html: data || "",
        investorName: investor.name,
        recipientEmails: investor.recipient_emails || [],
      });
    } catch (error) {
      console.error("Preview error:", error);
      toast({
        title: "Error",
        description: "Failed to load preview",
        variant: "destructive",
      });
    }
  };

  const handleOpenSendModal = (investor: InvestorStatementSummary) => {
    setSendModal({
      open: true,
      investorId: investor.id,
      investorName: investor.name,
      recipientEmails: investor.recipient_emails || [],
      generatedAt: investor.generated_at,
      isOutdated: false, // Could fetch freshness here if needed
    });
  };

  const handleConfirmSend = async () => {
    if (!selectedPeriod) return;

    setIsSending(true);
    try {
      const { error } = await statementsApi.sendStatement(selectedPeriod.id, sendModal.investorId);
      if (error) throw new Error(error);

      toast({
        title: "Statement Sent",
        description: `Statement sent to ${sendModal.recipientEmails.length} recipient(s)`,
      });

      loadInvestors(selectedPeriod.id);
    } catch (error) {
      console.error("Send error:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to send statement",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleBatchSend = async (investorIds: string[]): Promise<{ success: string[]; failed: { id: string; error: string }[] }> => {
    if (!selectedPeriod) return { success: [], failed: [] };

    const success: string[] = [];
    const failed: { id: string; error: string }[] = [];

    for (const investorId of investorIds) {
      try {
        const { error } = await statementsApi.sendStatement(selectedPeriod.id, investorId);
        if (error) {
          failed.push({ id: investorId, error });
        } else {
          success.push(investorId);
        }
      } catch (error) {
        failed.push({
          id: investorId,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    // Refresh investors list after batch
    loadInvestors(selectedPeriod.id);

    return { success, failed };
  };

  const pendingStatementsCount = investors.filter(
    (i) => i.statement_generated && !i.statement_sent
  ).length;

  const batchInvestors = investors.map((inv) => ({
    id: inv.id,
    name: inv.name,
    email: inv.email,
    recipientCount: inv.recipient_count || 0,
    recipientEmails: inv.recipient_emails || [],
    isGenerated: inv.statement_generated,
    isSent: inv.statement_sent,
    isEligible: inv.statement_generated && !inv.statement_sent && (inv.recipient_count || 0) > 0,
  }));

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Monthly Statements</h1>
          <p className="text-muted-foreground mt-1">
            Generate and send monthly investor statements
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Calendar className="mr-2 h-4 w-4" />
          Create New Period
        </Button>
      </div>

      <Tabs defaultValue="periods" className="w-full">
        <TabsList>
          <TabsTrigger value="periods">
            <FileText className="mr-2 h-4 w-4" />
            Periods
          </TabsTrigger>
          <TabsTrigger value="investors" disabled={!selectedPeriod}>
            <Users className="mr-2 h-4 w-4" />
            Investors
            {selectedPeriod && investors.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {investors.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Periods Tab */}
        <TabsContent value="periods" className="space-y-4">
          {periods.length === 0 ? (
            <Alert>
              <AlertDescription>
                No statement periods created yet. Click "Create New Period" to get started.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="grid gap-4">
              {periods.map((period) => (
                <Card
                  key={period.id}
                  className={selectedPeriod?.id === period.id ? "border-primary" : ""}
                >
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle>{period.period_name}</CardTitle>
                        <CardDescription>
                          Period ended: {new Date(period.period_end_date).toLocaleDateString()}
                        </CardDescription>
                      </div>
                      <Badge
                        variant={
                          period.status === "SENT"
                            ? "default"
                            : period.status === "FINALIZED"
                              ? "secondary"
                              : "outline"
                        }
                      >
                        {period.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardFooter>
                    <Button
                      onClick={() => setSelectedPeriod(period)}
                      variant={selectedPeriod?.id === period.id ? "primary" : "outline"}
                    >
                      {selectedPeriod?.id === period.id ? "Selected" : "Select Period"}
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Investors Tab */}
        <TabsContent value="investors" className="space-y-4">
          {selectedPeriod && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>{selectedPeriod.period_name}</CardTitle>
                  <CardDescription>Manage statements for this period</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center p-4 border rounded-lg">
                      <p className="text-2xl font-bold">{investors.length}</p>
                      <p className="text-sm text-muted-foreground">Total Investors</p>
                    </div>
                    <div className="text-center p-4 border rounded-lg">
                      <p className="text-2xl font-bold">
                        {investors.filter((i) => i.statement_generated).length}
                      </p>
                      <p className="text-sm text-muted-foreground">Generated</p>
                    </div>
                    <div className="text-center p-4 border rounded-lg">
                      <p className="text-2xl font-bold">
                        {investors.filter((i) => i.statement_sent).length}
                      </p>
                      <p className="text-sm text-muted-foreground">Sent</p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={handleGenerateAll}
                      disabled={isLoading || selectedPeriod.status === "SENT"}
                      variant="outline"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="mr-2 h-4 w-4" />
                          Generate All Statements
                        </>
                      )}
                    </Button>

                    <Button
                      onClick={() => setBatchSendOpen(true)}
                      disabled={isLoading || pendingStatementsCount === 0}
                    >
                      <Send className="mr-2 h-4 w-4" />
                      Batch Send ({pendingStatementsCount})
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Investors Table */}
              <Card>
                <CardHeader>
                  <CardTitle>Investor Statements</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto rounded-md border">
                    <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Investor</TableHead>
                        <TableHead>
                          <div className="flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            Recipients
                          </div>
                        </TableHead>
                        <TableHead>Funds</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {investors.map((investor) => (
                        <TableRow key={investor.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{investor.name}</p>
                              <p className="text-xs text-muted-foreground">{investor.email}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Badge
                                    variant={investor.recipient_count === 0 ? "destructive" : "outline"}
                                    className="cursor-help"
                                  >
                                    {investor.recipient_count || 0} recipient{investor.recipient_count !== 1 ? "s" : ""}
                                  </Badge>
                                </TooltipTrigger>
                                <TooltipContent>
                                  {investor.recipient_emails && investor.recipient_emails.length > 0 ? (
                                    <ul className="text-xs">
                                      {investor.recipient_emails.map((email, i) => (
                                        <li key={i}>{email}</li>
                                      ))}
                                    </ul>
                                  ) : (
                                    <span className="text-xs">No recipients configured</span>
                                  )}
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{investor.fund_count} funds</Badge>
                          </TableCell>
                          <TableCell>
                            {investor.statement_sent ? (
                              <Badge variant="default">
                                <Check className="mr-1 h-3 w-3" />
                                Sent
                              </Badge>
                            ) : investor.statement_generated ? (
                              <Badge variant="secondary">Generated</Badge>
                            ) : (
                              <Badge variant="outline">Not Generated</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right space-x-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handlePreview(investor)}
                              disabled={!investor.statement_generated}
                              title="Preview"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleOpenSendModal(investor)}
                              disabled={!investor.statement_generated || investor.statement_sent}
                              title="Send"
                            >
                              <Send className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* Create Period Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Statement Period</DialogTitle>
            <DialogDescription>
              Create a new monthly statement period for investors
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmitPeriod(handleCreatePeriod)}>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="year">Year</Label>
                  <Input
                    id="year"
                    type="number"
                    min="2024"
                    max="2100"
                    {...registerPeriod("year", { valueAsNumber: true })}
                  />
                  {periodErrors.year && (
                    <p className="text-sm text-destructive">
                      {periodErrors.year.message as string}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="month">Month</Label>
                  <Select
                    onValueChange={(value) =>
                      registerPeriod("month").onChange({ target: { value: parseInt(value) } })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select month" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 12 }, (_, i) => (
                        <SelectItem key={i + 1} value={(i + 1).toString()}>
                          {new Date(2024, i).toLocaleString("default", { month: "long" })}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {periodErrors.month && (
                    <p className="text-sm text-destructive">
                      {periodErrors.month.message as string}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="period_name">Period Name</Label>
                <Input
                  id="period_name"
                  placeholder="October 2025"
                  {...registerPeriod("period_name")}
                />
                {periodErrors.period_name && (
                  <p className="text-sm text-destructive">
                    {periodErrors.period_name.message as string}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="period_end_date">Period End Date</Label>
                <Input id="period_end_date" type="date" {...registerPeriod("period_end_date")} />
                {periodErrors.period_end_date && (
                  <p className="text-sm text-destructive">
                    {periodErrors.period_end_date.message as string}
                  </p>
                )}
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowCreateDialog(false)}>
                Cancel
              </Button>
              <Button type="submit">Create Period</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Preview Modal */}
      <ReportPreviewModal
        open={previewModal.open}
        onOpenChange={(open) => setPreviewModal((prev) => ({ ...prev, open }))}
        htmlContent={previewModal.html}
        investorName={previewModal.investorName}
        periodName={selectedPeriod?.period_name || ""}
        recipientEmails={previewModal.recipientEmails}
      />

      {/* Send Confirmation Modal */}
      <SendConfirmationModal
        open={sendModal.open}
        onOpenChange={(open) => setSendModal((prev) => ({ ...prev, open }))}
        investorName={sendModal.investorName}
        periodName={selectedPeriod?.period_name || ""}
        recipientEmails={sendModal.recipientEmails}
        generatedAt={sendModal.generatedAt}
        isOutdated={sendModal.isOutdated}
        onConfirmSend={handleConfirmSend}
        isSending={isSending}
      />

      {/* Batch Send Dialog */}
      <BatchSendDialog
        open={batchSendOpen}
        onOpenChange={setBatchSendOpen}
        periodName={selectedPeriod?.period_name || ""}
        investors={batchInvestors}
        onSendBatch={handleBatchSend}
      />
    </div>
  );
}
