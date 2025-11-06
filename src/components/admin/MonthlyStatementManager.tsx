// @ts-nocheck
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
 * - Individual preview
 * - Batch email sending
 * - Delivery tracking
 * - Error handling
 */

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Check, AlertTriangle, Eye, Send, FileText, Calendar, Users } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { statementsApi } from '@/services/api/statementsApi';

// Validation schema for creating period
const createPeriodSchema = z.object({
  year: z.number().min(2024).max(2100),
  month: z.number().min(1).max(12),
  period_name: z.string().min(1, 'Period name required'),
  period_end_date: z.string().min(1, 'End date required'),
});

// Validation schema for fund performance input
const fundPerformanceSchema = z.object({
  fund_name: z.string().min(1),

  // MTD
  mtd_beginning_balance: z.string(),
  mtd_additions: z.string(),
  mtd_redemptions: z.string(),
  mtd_net_income: z.string(),
  mtd_ending_balance: z.string(),
  mtd_rate_of_return: z.string(),

  // QTD
  qtd_beginning_balance: z.string(),
  qtd_additions: z.string(),
  qtd_redemptions: z.string(),
  qtd_net_income: z.string(),
  qtd_ending_balance: z.string(),
  qtd_rate_of_return: z.string(),

  // YTD
  ytd_beginning_balance: z.string(),
  ytd_additions: z.string(),
  ytd_redemptions: z.string(),
  ytd_net_income: z.string(),
  ytd_ending_balance: z.string(),
  ytd_rate_of_return: z.string(),

  // ITD
  itd_beginning_balance: z.string(),
  itd_additions: z.string(),
  itd_redemptions: z.string(),
  itd_net_income: z.string(),
  itd_ending_balance: z.string(),
  itd_rate_of_return: z.string(),
});

interface StatementPeriod {
  id: string;
  year: number;
  month: number;
  period_name: string;
  period_end_date: string;
  status: 'DRAFT' | 'FINALIZED' | 'SENT';
  created_at: string;
}

interface InvestorSummary {
  id: string;
  name: string;
  email: string;
  fund_count: number;
  statement_generated: boolean;
  statement_sent: boolean;
}

export function MonthlyStatementManager() {
  const [periods, setPeriods] = useState<StatementPeriod[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<StatementPeriod | null>(null);
  const [investors, setInvestors] = useState<InvestorSummary[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [previewHTML, setPreviewHTML] = useState('');
  const { toast } = useToast();

  const {
    register: registerPeriod,
    handleSubmit: handleSubmitPeriod,
    formState: { errors: periodErrors },
    reset: resetPeriod,
  } = useForm({
    resolver: zodResolver(createPeriodSchema),
  });

  // Load periods on mount
  useEffect(() => {
    loadPeriods();
  }, []);

  // Load investors when period selected
  useEffect(() => {
    if (selectedPeriod) {
      loadInvestors(selectedPeriod.id);
    }
  }, [selectedPeriod]);

  const loadPeriods = async () => {
    try {
      const { data, error } = await statementsApi.getPeriods();
      if (error) throw new Error(error);

      setPeriods(data || []);
    } catch (error) {
      console.error('Load periods error:', error);
      toast({
        title: 'Error',
        description: 'Failed to load statement periods',
        variant: 'destructive',
      });
    }
  };

  const loadInvestors = async (periodId: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await statementsApi.getPeriodInvestors(periodId);
      if (error) throw new Error(error);

      setInvestors(data || []);
    } catch (error) {
      console.error('Load investors error:', error);
      toast({
        title: 'Error',
        description: 'Failed to load investors',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreatePeriod = async (data: any) => {
    try {
      const { data: result, error } = await statementsApi.createPeriod(data);
      if (error) throw new Error(error);

      toast({
        title: 'Period Created',
        description: `Statement period for ${data.period_name} created successfully`,
      });

      setShowCreateDialog(false);
      resetPeriod();
      loadPeriods();
    } catch (error) {
      console.error('Create period error:', error);
      toast({
        title: 'Error',
        description: 'Failed to create statement period',
        variant: 'destructive',
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
          title: 'Statements Generated with Errors',
          description: `Generated ${data.success} statements successfully. ${data.failed} failed.`,
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Statements Generated',
          description: `Generated ${data?.success || 0} statements successfully`,
        });
      }

      loadInvestors(selectedPeriod.id);
    } catch (error) {
      console.error('Generate statements error:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate statements',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePreview = async (investorId: string) => {
    if (!selectedPeriod) return;

    try {
      const { data, error } = await statementsApi.previewStatement(selectedPeriod.id, investorId);
      if (error) throw new Error(error);

      setPreviewHTML(data || '');
      setShowPreviewDialog(true);
    } catch (error) {
      console.error('Preview error:', error);
      toast({
        title: 'Error',
        description: 'Failed to load preview',
        variant: 'destructive',
      });
    }
  };

  const handleSendAll = async () => {
    if (!selectedPeriod) return;

    const confirmed = window.confirm(
      `Are you sure you want to send ${investors.filter(i => i.statement_generated && !i.statement_sent).length} statements?\n\nThis action cannot be undone.`
    );

    if (!confirmed) return;

    setIsLoading(true);
    try {
      const { data, error } = await statementsApi.sendAll(selectedPeriod.id);
      if (error) throw new Error(error);

      if (data && data.failed > 0) {
        toast({
          title: 'Statements Sent with Errors',
          description: `Sent ${data.success} statements successfully. ${data.failed} failed.`,
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Statements Sent',
          description: `Sent ${data?.success || 0} statements successfully`,
        });
      }

      loadInvestors(selectedPeriod.id);
    } catch (error) {
      console.error('Send statements error:', error);
      toast({
        title: 'Error',
        description: 'Failed to send statements',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const pendingStatementsCount = investors.filter(i => i.statement_generated && !i.statement_sent).length;

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
                  className={selectedPeriod?.id === period.id ? 'border-primary' : ''}
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
                          period.status === 'SENT' ? 'default' :
                          period.status === 'FINALIZED' ? 'secondary' :
                          'outline'
                        }
                      >
                        {period.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardFooter>
                    <Button
                      onClick={() => setSelectedPeriod(period)}
                      variant={selectedPeriod?.id === period.id ? 'default' : 'outline'}
                    >
                      {selectedPeriod?.id === period.id ? 'Selected' : 'Select Period'}
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
                  <CardDescription>
                    Manage statements for this period
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center p-4 border rounded-lg">
                      <p className="text-2xl font-bold">{investors.length}</p>
                      <p className="text-sm text-muted-foreground">Total Investors</p>
                    </div>
                    <div className="text-center p-4 border rounded-lg">
                      <p className="text-2xl font-bold">
                        {investors.filter(i => i.statement_generated).length}
                      </p>
                      <p className="text-sm text-muted-foreground">Generated</p>
                    </div>
                    <div className="text-center p-4 border rounded-lg">
                      <p className="text-2xl font-bold">
                        {investors.filter(i => i.statement_sent).length}
                      </p>
                      <p className="text-sm text-muted-foreground">Sent</p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={handleGenerateAll}
                      disabled={isLoading || selectedPeriod.status === 'SENT'}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <FileText className="mr-2 h-4 w-4" />
                          Generate All Statements
                        </>
                      )}
                    </Button>

                    <Button
                      onClick={handleSendAll}
                      disabled={isLoading || pendingStatementsCount === 0}
                      variant="default"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <Send className="mr-2 h-4 w-4" />
                          Send All ({pendingStatementsCount})
                        </>
                      )}
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
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Investor</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Funds</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {investors.map((investor) => (
                        <TableRow key={investor.id}>
                          <TableCell className="font-medium">{investor.name}</TableCell>
                          <TableCell>{investor.email}</TableCell>
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
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handlePreview(investor.id)}
                              disabled={!investor.statement_generated}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
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
                    {...registerPeriod('year', { valueAsNumber: true })}
                  />
                  {periodErrors.year && (
                    <p className="text-sm text-destructive">{periodErrors.year.message as string}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="month">Month</Label>
                  <Select
                    onValueChange={(value) => registerPeriod('month').onChange({ target: { value: parseInt(value) } })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select month" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 12 }, (_, i) => (
                        <SelectItem key={i + 1} value={(i + 1).toString()}>
                          {new Date(2024, i).toLocaleString('default', { month: 'long' })}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {periodErrors.month && (
                    <p className="text-sm text-destructive">{periodErrors.month.message as string}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="period_name">Period Name</Label>
                <Input
                  id="period_name"
                  placeholder="October 2025"
                  {...registerPeriod('period_name')}
                />
                {periodErrors.period_name && (
                  <p className="text-sm text-destructive">{periodErrors.period_name.message as string}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="period_end_date">Period End Date</Label>
                <Input
                  id="period_end_date"
                  type="date"
                  {...registerPeriod('period_end_date')}
                />
                {periodErrors.period_end_date && (
                  <p className="text-sm text-destructive">{periodErrors.period_end_date.message as string}</p>
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

      {/* Preview Dialog */}
      <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Statement Preview</DialogTitle>
            <DialogDescription>
              Preview of the HTML email statement
            </DialogDescription>
          </DialogHeader>

          <div className="border rounded-lg overflow-auto max-h-[70vh]">
            <iframe
              srcDoc={previewHTML}
              className="w-full h-[70vh]"
              title="Statement Preview"
            />
          </div>

          <DialogFooter>
            <Button onClick={() => setShowPreviewDialog(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
