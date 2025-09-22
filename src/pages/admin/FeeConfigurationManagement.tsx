import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { AdminOnly } from '@/components/ui/RoleGate';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { 
  Percent, 
  History, 
  AlertTriangle, 
  CheckCircle, 
  Plus,
  Edit,
  Clock,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Calendar,
  DollarSign
} from 'lucide-react';

const feeUpdateSchema = z.object({
  fund_id: z.string().uuid('Please select a valid fund'),
  mgmt_fee_bps: z.number()
    .min(0, 'Management fee cannot be negative')
    .max(10000, 'Management fee cannot exceed 100%'),
  perf_fee_bps: z.number()
    .min(0, 'Performance fee cannot be negative')
    .max(10000, 'Performance fee cannot exceed 100%'),
  effective_from: z.string().min(1, 'Effective date is required'),
  reason: z.string().min(10, 'Reason must be at least 10 characters'),
  override_past_date: z.boolean().default(false),
});

type FeeUpdateForm = z.infer<typeof feeUpdateSchema>;

interface Fund {
  id: string;
  code: string;
  name: string;
  currency: string;
  status: 'active' | 'inactive';
  mgmt_fee_bps: number;
  perf_fee_bps: number;
  fee_version: number;
  effective_from: string;
  created_at: string;
  updated_at: string;
}

interface FeeHistory {
  id: string;
  fund_id: string;
  fund_name: string;
  fund_code: string;
  mgmt_fee_bps: number;
  perf_fee_bps: number;
  effective_from: string;
  created_by: string;
  created_at: string;
  admin_name: string | null;
}

export function FeeConfigurationManagement() {
  const [funds, setFunds] = useState<Fund[]>([]);
  const [feeHistory, setFeeHistory] = useState<FeeHistory[]>([]);
  const [showUpdateDialog, setShowUpdateDialog] = useState(false);
  const [selectedFund, setSelectedFund] = useState<Fund | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<'current' | 'history'>('current');

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset
  } = useForm<FeeUpdateForm>({
    resolver: zodResolver(feeUpdateSchema),
    defaultValues: {
      override_past_date: false,
    }
  });

  useEffect(() => {
    loadFunds();
    loadFeeHistory();
  }, []);

  const loadFunds = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('fund_configurations')
        .select('*')
        .order('name');

      if (error) throw error;
        const transformedFunds: Fund[] = (data || []).map(fund => ({
          ...fund,
          status: fund.status === 'suspended' ? 'inactive' : fund.status
        }));
        setFunds(transformedFunds);
    } catch (error) {
      console.error('Error loading funds:', error);
      toast.error('Failed to load fund configurations');
    } finally {
      setIsLoading(false);
    }
  };

  const loadFeeHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('fund_fee_history')
        .select(`
          *,
          fund_configurations!inner(name, code),
          profiles(first_name, last_name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const history = (data || []).map((item: any) => ({
        ...item,
        fund_name: item.fund_configurations.name,
        fund_code: item.fund_configurations.code,
        admin_name: item.profiles 
          ? `${item.profiles.first_name || ''} ${item.profiles.last_name || ''}`.trim() || null
          : null,
      }));

      setFeeHistory(history);
    } catch (error) {
      console.error('Error loading fee history:', error);
      toast.error('Failed to load fee history');
    }
  };

  const formatFeePercentage = (bps: number) => {
    return `${(bps / 100).toFixed(2)}%`;
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const isEffectiveDateInPast = (effectiveDate: string) => {
    return new Date(effectiveDate) < new Date();
  };

  const openUpdateDialog = (fund: Fund) => {
    setSelectedFund(fund);
    setValue('fund_id', fund.id);
    setValue('mgmt_fee_bps', fund.mgmt_fee_bps);
    setValue('perf_fee_bps', fund.perf_fee_bps);
    
    // Default to tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setValue('effective_from', tomorrow.toISOString().split('T')[0]);
    
    setShowUpdateDialog(true);
  };

  const onSubmitFeeUpdate = async (data: FeeUpdateForm) => {
    if (!selectedFund) return;

    const effectiveDate = new Date(data.effective_from);
    const isPastDate = effectiveDate < new Date();

    // Check for past date without override
    if (isPastDate && !data.override_past_date) {
      toast.error('Cannot set effective date in the past without override confirmation');
      return;
    }

    setIsSubmitting(true);

    try {
      const currentUser = await supabase.auth.getUser();
      if (!currentUser.data.user) throw new Error('Not authenticated');

      // Insert into fee history first
      const { error: historyError } = await supabase
        .from('fund_fee_history')
        .insert({
          fund_id: data.fund_id,
          mgmt_fee_bps: data.mgmt_fee_bps,
          perf_fee_bps: data.perf_fee_bps,
          effective_from: effectiveDate.toISOString(),
          created_by: currentUser.data.user.id,
        });

      if (historyError) {
        throw new Error(`Failed to create fee history: ${historyError.message}`);
      }

      // Update current fund configuration
      const newVersion = selectedFund.fee_version + 1;
      const { error: updateError } = await supabase
        .from('fund_configurations')
        .update({
          mgmt_fee_bps: data.mgmt_fee_bps,
          perf_fee_bps: data.perf_fee_bps,
          fee_version: newVersion,
          effective_from: effectiveDate.toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', data.fund_id);

      if (updateError) {
        throw new Error(`Failed to update fund configuration: ${updateError.message}`);
      }

      // Log audit event
      await supabase
        .from('audit_log')
        .insert({
          actor_user: currentUser.data.user.id,
          action: 'UPDATE_FUND_FEES',
          entity: 'fund_configurations',
          entity_id: data.fund_id,
          old_values: {
            mgmt_fee_bps: selectedFund.mgmt_fee_bps,
            perf_fee_bps: selectedFund.perf_fee_bps,
            fee_version: selectedFund.fee_version,
          },
          new_values: {
            mgmt_fee_bps: data.mgmt_fee_bps,
            perf_fee_bps: data.perf_fee_bps,
            fee_version: newVersion,
            effective_from: effectiveDate.toISOString(),
          },
          meta: {
            fund_code: selectedFund.code,
            fund_name: selectedFund.name,
            reason: data.reason,
            past_date_override: isPastDate && data.override_past_date,
          }
        });

      toast.success(`Fee configuration updated for ${selectedFund.name}. New version: ${newVersion}`);

      // Refresh data
      await Promise.all([loadFunds(), loadFeeHistory()]);
      
      // Reset form and close dialog
      setShowUpdateDialog(false);
      setSelectedFund(null);
      reset();

    } catch (error: any) {
      console.error('Error updating fee configuration:', error);
      toast.error(error.message || 'Failed to update fee configuration');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status: string, effectiveFrom: string) => {
    const isEffective = new Date(effectiveFrom) <= new Date();
    
    if (status === 'active' && isEffective) {
      return <Badge variant="default" className="flex items-center gap-1">
        <CheckCircle className="h-3 w-3" />
        Active
      </Badge>;
    } else if (status === 'active' && !isEffective) {
      return <Badge variant="secondary" className="flex items-center gap-1">
        <Clock className="h-3 w-3" />
        Scheduled
      </Badge>;
    } else {
      return <Badge variant="destructive" className="flex items-center gap-1">
        <AlertTriangle className="h-3 w-3" />
        Inactive
      </Badge>;
    }
  };

  const getFeeChangeIndicator = (currentFee: number, historyItem?: FeeHistory) => {
    if (!historyItem) return null;

    const previousMgmt = feeHistory.find(h => 
      h.fund_id === historyItem.fund_id && 
      h.created_at < historyItem.created_at
    );

    if (!previousMgmt) return null;

    if (currentFee > previousMgmt.mgmt_fee_bps) {
      return <TrendingUp className="h-4 w-4 text-red-500" />;
    } else if (currentFee < previousMgmt.mgmt_fee_bps) {
      return <TrendingDown className="h-4 w-4 text-green-500" />;
    }
    return null;
  };

  return (
    <AdminOnly>
      <div className="container mx-auto py-8 px-4 max-w-7xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Percent className="h-8 w-8" />
            Fee Configuration Management
          </h1>
          <p className="text-muted-foreground mt-2">
            Manage fund management and performance fees with full historical tracking and versioning.
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={(tab) => setActiveTab(tab as typeof activeTab)} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="current" className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Current Fee Configurations
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2">
              <History className="h-4 w-4" />
              Fee History
            </TabsTrigger>
          </TabsList>

          <TabsContent value="current" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Fund Fee Configurations</CardTitle>
                    <CardDescription>
                      Current and scheduled fee configurations for all funds
                    </CardDescription>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={loadFunds}
                    disabled={isLoading}
                  >
                    <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                    Refresh
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
                    <span className="ml-2 text-muted-foreground">Loading fund configurations...</span>
                  </div>
                ) : funds.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No fund configurations found
                  </div>
                ) : (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Fund</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Management Fee</TableHead>
                          <TableHead>Performance Fee</TableHead>
                          <TableHead>Version</TableHead>
                          <TableHead>Effective From</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {funds.map((fund) => (
                          <TableRow key={fund.id}>
                            <TableCell>
                              <div className="flex flex-col">
                                <span className="font-medium">{fund.name}</span>
                                <span className="text-sm text-muted-foreground">
                                  {fund.code} • {fund.currency}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              {getStatusBadge(fund.status, fund.effective_from)}
                            </TableCell>
                            <TableCell className="font-mono">
                              {formatFeePercentage(fund.mgmt_fee_bps)}
                            </TableCell>
                            <TableCell className="font-mono">
                              {formatFeePercentage(fund.perf_fee_bps)}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">v{fund.fee_version}</Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {formatDateTime(fund.effective_from)}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openUpdateDialog(fund)}
                                disabled={fund.status === 'inactive'}
                              >
                                <Edit className="h-4 w-4 mr-1" />
                                Update Fees
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Fee Change History</CardTitle>
                    <CardDescription>
                      Historical record of all fee configuration changes
                    </CardDescription>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={loadFeeHistory}
                    disabled={isLoading}
                  >
                    <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                    Refresh
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {feeHistory.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No fee history found
                  </div>
                ) : (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Fund</TableHead>
                          <TableHead>Management Fee</TableHead>
                          <TableHead>Performance Fee</TableHead>
                          <TableHead>Effective From</TableHead>
                          <TableHead>Changed By</TableHead>
                          <TableHead>Changed At</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {feeHistory.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell>
                              <div className="flex flex-col">
                                <span className="font-medium">{item.fund_name}</span>
                                <span className="text-sm text-muted-foreground">
                                  {item.fund_code}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2 font-mono">
                                {formatFeePercentage(item.mgmt_fee_bps)}
                                {getFeeChangeIndicator(item.mgmt_fee_bps, item)}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2 font-mono">
                                {formatFeePercentage(item.perf_fee_bps)}
                                {getFeeChangeIndicator(item.perf_fee_bps, item)}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {formatDateTime(item.effective_from)}
                              </div>
                            </TableCell>
                            <TableCell>
                              {item.admin_name || 'System'}
                            </TableCell>
                            <TableCell>
                              {formatDateTime(item.created_at)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Fee Update Dialog */}
        <Dialog open={showUpdateDialog} onOpenChange={setShowUpdateDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Edit className="h-5 w-5" />
                Update Fee Configuration
              </DialogTitle>
              <DialogDescription>
                {selectedFund && (
                  <>Update fees for {selectedFund.name} ({selectedFund.code}). 
                  Current version: {selectedFund.fee_version}</>
                )}
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit(onSubmitFeeUpdate)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="mgmt_fee_bps">Management Fee (%) *</Label>
                  <div className="relative">
                    <Input
                      id="mgmt_fee_bps"
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      placeholder="2.00"
                      {...register('mgmt_fee_bps', { valueAsNumber: true })}
                      disabled={isSubmitting}
                      onChange={(e) => {
                        const value = parseFloat(e.target.value) || 0;
                        setValue('mgmt_fee_bps', value * 100); // Convert % to basis points
                      }}
                      defaultValue={selectedFund ? selectedFund.mgmt_fee_bps / 100 : 0}
                    />
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-sm text-muted-foreground">
                      %
                    </div>
                  </div>
                  {errors.mgmt_fee_bps && (
                    <p className="text-sm text-red-600">{errors.mgmt_fee_bps.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="perf_fee_bps">Performance Fee (%) *</Label>
                  <div className="relative">
                    <Input
                      id="perf_fee_bps"
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      placeholder="20.00"
                      {...register('perf_fee_bps', { valueAsNumber: true })}
                      disabled={isSubmitting}
                      onChange={(e) => {
                        const value = parseFloat(e.target.value) || 0;
                        setValue('perf_fee_bps', value * 100); // Convert % to basis points
                      }}
                      defaultValue={selectedFund ? selectedFund.perf_fee_bps / 100 : 0}
                    />
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-sm text-muted-foreground">
                      %
                    </div>
                  </div>
                  {errors.perf_fee_bps && (
                    <p className="text-sm text-red-600">{errors.perf_fee_bps.message}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="effective_from">Effective From *</Label>
                <Input
                  id="effective_from"
                  type="date"
                  {...register('effective_from')}
                  disabled={isSubmitting}
                />
                {errors.effective_from && (
                  <p className="text-sm text-red-600">{errors.effective_from.message}</p>
                )}
                
                {watch('effective_from') && isEffectiveDateInPast(watch('effective_from')) && (
                  <>
                    <Alert>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        <strong>Warning:</strong> The effective date is in the past. 
                        This may retroactively reprice existing positions.
                      </AlertDescription>
                    </Alert>
                    
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="override_past_date"
                        checked={watch('override_past_date')}
                        onCheckedChange={(checked) => setValue('override_past_date', checked as boolean)}
                        disabled={isSubmitting}
                      />
                      <Label htmlFor="override_past_date" className="text-sm">
                        I understand and approve setting an effective date in the past
                      </Label>
                    </div>
                  </>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="reason">Reason for Fee Change *</Label>
                <textarea
                  id="reason"
                  placeholder="Provide a detailed reason for this fee configuration change..."
                  {...register('reason')}
                  disabled={isSubmitting}
                  className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                />
                {errors.reason && (
                  <p className="text-sm text-red-600">{errors.reason.message}</p>
                )}
              </div>

              {selectedFund && (
                <div className="p-4 bg-gray-50 rounded-lg border">
                  <h4 className="font-medium mb-2">Current Configuration:</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Management Fee:</span>
                      <span className="ml-2 font-mono">{formatFeePercentage(selectedFund.mgmt_fee_bps)}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Performance Fee:</span>
                      <span className="ml-2 font-mono">{formatFeePercentage(selectedFund.perf_fee_bps)}</span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-muted-foreground">Version:</span>
                      <span className="ml-2">v{selectedFund.fee_version}</span>
                    </div>
                  </div>
                </div>
              )}
            </form>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowUpdateDialog(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmit(onSubmitFeeUpdate)}
                disabled={isSubmitting || !watch('reason')}
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Updating...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Update Fee Configuration
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminOnly>
  );
}
