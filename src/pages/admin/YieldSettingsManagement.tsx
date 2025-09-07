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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { 
  TrendingUp, 
  Calendar, 
  AlertTriangle, 
  CheckCircle, 
  Plus,
  Edit,
  Clock,
  RefreshCw,
  Target,
  History,
  DollarSign,
  Percent
} from 'lucide-react';

const yieldSettingSchema = z.object({
  frequency: z.enum(['daily', 'weekly']),
  rate_bps: z.number()
    .min(0, 'Yield rate cannot be negative')
    .max(50000, 'Yield rate seems unusually high (max 500%)'), // 500% in basis points
  effective_from: z.string().min(1, 'Effective date is required'),
  reason: z.string().min(10, 'Reason must be at least 10 characters'),
});

type YieldSettingForm = z.infer<typeof yieldSettingSchema>;

interface YieldSetting {
  id: string;
  frequency: 'daily' | 'weekly';
  rate_bps: number;
  effective_from: string;
  created_by: string;
  created_at: string;
  admin_name: string | null;
  is_current: boolean;
}

interface YieldScheduleItem {
  frequency: 'daily' | 'weekly';
  current_rate_bps: number;
  current_effective_from: string;
  next_rate_bps?: number;
  next_effective_from?: string;
}

export function YieldSettingsManagement() {
  const [yieldHistory, setYieldHistory] = useState<YieldSetting[]>([]);
  const [yieldSchedule, setYieldSchedule] = useState<YieldScheduleItem[]>([]);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
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
  } = useForm<YieldSettingForm>({
    resolver: zodResolver(yieldSettingSchema),
    defaultValues: {
      frequency: 'daily',
    }
  });

  useEffect(() => {
    loadYieldData();
  }, []);

  const loadYieldData = async () => {
    try {
      setIsLoading(true);
      await Promise.all([loadYieldHistory(), loadYieldSchedule()]);
    } catch (error) {
      console.error('Error loading yield data:', error);
      toast.error('Failed to load yield settings');
    } finally {
      setIsLoading(false);
    }
  };

  const loadYieldHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('yield_settings')
        .select(`
          *,
          profiles(first_name, last_name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const history = (data || []).map((item: any) => ({
        ...item,
        admin_name: item.profiles 
          ? `${item.profiles.first_name || ''} ${item.profiles.last_name || ''}`.trim() || null
          : null,
        is_current: new Date(item.effective_from) <= new Date(),
      }));

      setYieldHistory(history);
    } catch (error) {
      console.error('Error loading yield history:', error);
      throw error;
    }
  };

  const loadYieldSchedule = async () => {
    try {
      // Get current and next scheduled rates for both frequencies
      const frequencies: Array<'daily' | 'weekly'> = ['daily', 'weekly'];
      const schedule: YieldScheduleItem[] = [];

      for (const frequency of frequencies) {
        // Get current rate (most recent effective rate)
        const { data: currentData, error: currentError } = await supabase
          .from('yield_settings')
          .select('*')
          .eq('frequency', frequency)
          .lte('effective_from', new Date().toISOString())
          .order('effective_from', { ascending: false })
          .limit(1);

        if (currentError) throw currentError;

        // Get next scheduled rate (future effective rate)
        const { data: nextData, error: nextError } = await supabase
          .from('yield_settings')
          .select('*')
          .eq('frequency', frequency)
          .gt('effective_from', new Date().toISOString())
          .order('effective_from', { ascending: true })
          .limit(1);

        if (nextError) throw nextError;

        const current = currentData?.[0];
        const next = nextData?.[0];

        if (current) {
          schedule.push({
            frequency,
            current_rate_bps: current.rate_bps,
            current_effective_from: current.effective_from,
            next_rate_bps: next?.rate_bps,
            next_effective_from: next?.effective_from,
          });
        }
      }

      setYieldSchedule(schedule);
    } catch (error) {
      console.error('Error loading yield schedule:', error);
      throw error;
    }
  };

  const formatRatePercentage = (bps: number) => {
    return `${(bps / 100).toFixed(3)}%`;
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getAnnualizedRate = (rateBps: number, frequency: 'daily' | 'weekly') => {
    const rate = rateBps / 10000; // Convert basis points to decimal
    const periods = frequency === 'daily' ? 365 : 52;
    const annualized = Math.pow(1 + rate, periods) - 1;
    return `${(annualized * 100).toFixed(2)}%`;
  };

  const openCreateDialog = (frequency?: 'daily' | 'weekly') => {
    if (frequency) {
      setValue('frequency', frequency);
    }
    
    // Default to tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setValue('effective_from', tomorrow.toISOString().split('T')[0]);
    
    setShowCreateDialog(true);
  };

  const onSubmitYieldSetting = async (data: YieldSettingForm) => {
    setIsSubmitting(true);

    try {
      const currentUser = await supabase.auth.getUser();
      if (!currentUser.data.user) throw new Error('Not authenticated');

      const effectiveDate = new Date(data.effective_from);
      
      // Insert new yield setting
      const { error: insertError } = await supabase
        .from('yield_settings')
        .insert({
          frequency: data.frequency,
          rate_bps: data.rate_bps,
          effective_from: effectiveDate.toISOString(),
          created_by: currentUser.data.user.id,
        });

      if (insertError) {
        throw new Error(`Failed to create yield setting: ${insertError.message}`);
      }

      // Log audit event
      await supabase
        .from('audit_log')
        .insert({
          actor_user: currentUser.data.user.id,
          action: 'CREATE_YIELD_SETTING',
          entity: 'yield_settings',
          entity_id: null, // New record, no specific ID
          new_values: {
            frequency: data.frequency,
            rate_bps: data.rate_bps,
            effective_from: effectiveDate.toISOString(),
            annualized_rate: getAnnualizedRate(data.rate_bps, data.frequency),
          },
          meta: {
            reason: data.reason,
            rate_percentage: formatRatePercentage(data.rate_bps),
          }
        });

      toast.success(`${data.frequency} yield rate updated successfully. Rate: ${formatRatePercentage(data.rate_bps)}`);

      // Refresh data
      await loadYieldData();
      
      // Reset form and close dialog
      setShowCreateDialog(false);
      reset();

    } catch (error: any) {
      console.error('Error creating yield setting:', error);
      toast.error(error.message || 'Failed to create yield setting');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getFrequencyBadge = (frequency: string) => {
    return frequency === 'daily' 
      ? <Badge variant="default" className="flex items-center gap-1">
          <Calendar className="h-3 w-3" />
          Daily
        </Badge>
      : <Badge variant="secondary" className="flex items-center gap-1">
          <Calendar className="h-3 w-3" />
          Weekly
        </Badge>;
  };

  const getEffectiveStatus = (effectiveFrom: string) => {
    const isEffective = new Date(effectiveFrom) <= new Date();
    
    return isEffective 
      ? <Badge variant="default" className="flex items-center gap-1">
          <CheckCircle className="h-3 w-3" />
          Active
        </Badge>
      : <Badge variant="secondary" className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          Scheduled
        </Badge>;
  };

  return (
    <AdminOnly>
      <div className="container mx-auto py-8 px-4 max-w-7xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <TrendingUp className="h-8 w-8" />
            Yield Settings Management
          </h1>
          <p className="text-muted-foreground mt-2">
            Manage global daily and weekly yield rates with full historical tracking and scheduling.
          </p>
        </div>

        {/* Current Yield Schedule Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {yieldSchedule.map((schedule) => (
            <Card key={schedule.frequency}>
              <CardHeader className="pb-3">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Target className="h-5 w-5" />
                    {schedule.frequency.charAt(0).toUpperCase() + schedule.frequency.slice(1)} Yield Rate
                  </CardTitle>
                  {getFrequencyBadge(schedule.frequency)}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg border border-green-200">
                  <div>
                    <p className="text-sm text-green-700 font-medium">Current Rate</p>
                    <p className="text-2xl font-bold text-green-800">
                      {formatRatePercentage(schedule.current_rate_bps)}
                    </p>
                    <p className="text-xs text-green-600">
                      Annualized: {getAnnualizedRate(schedule.current_rate_bps, schedule.frequency)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-green-600">Effective since</p>
                    <p className="text-sm text-green-700">
                      {formatDateTime(schedule.current_effective_from)}
                    </p>
                  </div>
                </div>

                {schedule.next_rate_bps && schedule.next_effective_from && (
                  <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <div>
                      <p className="text-sm text-blue-700 font-medium">Next Scheduled Rate</p>
                      <p className="text-xl font-bold text-blue-800">
                        {formatRatePercentage(schedule.next_rate_bps)}
                      </p>
                      <p className="text-xs text-blue-600">
                        Annualized: {getAnnualizedRate(schedule.next_rate_bps, schedule.frequency)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-blue-600">Effective from</p>
                      <p className="text-sm text-blue-700">
                        {formatDateTime(schedule.next_effective_from)}
                      </p>
                    </div>
                  </div>
                )}

                <Button 
                  onClick={() => openCreateDialog(schedule.frequency)}
                  className="w-full"
                  variant="outline"
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Update {schedule.frequency.charAt(0).toUpperCase() + schedule.frequency.slice(1)} Rate
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <Tabs value={activeTab} onValueChange={(tab) => setActiveTab(tab as typeof activeTab)} className="space-y-6">
          <div className="flex justify-between items-center">
            <TabsList className="grid w-full max-w-[400px] grid-cols-2">
              <TabsTrigger value="current" className="flex items-center gap-2">
                <Target className="h-4 w-4" />
                Current Settings
              </TabsTrigger>
              <TabsTrigger value="history" className="flex items-center gap-2">
                <History className="h-4 w-4" />
                Rate History
              </TabsTrigger>
            </TabsList>
            
            <Button onClick={() => openCreateDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              New Yield Rate
            </Button>
          </div>

          <TabsContent value="current" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Active Yield Settings</CardTitle>
                    <CardDescription>
                      Current and scheduled yield rates for all frequencies
                    </CardDescription>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={loadYieldData}
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
                    <span className="ml-2 text-muted-foreground">Loading yield settings...</span>
                  </div>
                ) : yieldHistory.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No yield settings found
                  </div>
                ) : (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Frequency</TableHead>
                          <TableHead>Rate</TableHead>
                          <TableHead>Annualized</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Effective From</TableHead>
                          <TableHead>Created By</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {yieldHistory
                          .filter(setting => 
                            activeTab === 'current' 
                              ? new Date(setting.effective_from) >= new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
                              : true
                          )
                          .map((setting) => (
                            <TableRow key={setting.id}>
                              <TableCell>
                                {getFrequencyBadge(setting.frequency)}
                              </TableCell>
                              <TableCell className="font-mono">
                                {formatRatePercentage(setting.rate_bps)}
                              </TableCell>
                              <TableCell className="font-mono">
                                {getAnnualizedRate(setting.rate_bps, setting.frequency)}
                              </TableCell>
                              <TableCell>
                                {getEffectiveStatus(setting.effective_from)}
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  {formatDateTime(setting.effective_from)}
                                </div>
                              </TableCell>
                              <TableCell>
                                {setting.admin_name || 'System'}
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
                    <CardTitle>Yield Rate History</CardTitle>
                    <CardDescription>
                      Complete historical record of all yield rate changes
                    </CardDescription>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={loadYieldData}
                    disabled={isLoading}
                  >
                    <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                    Refresh
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {yieldHistory.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No yield rate history found
                  </div>
                ) : (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Frequency</TableHead>
                          <TableHead>Rate</TableHead>
                          <TableHead>Annualized</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Effective From</TableHead>
                          <TableHead>Created By</TableHead>
                          <TableHead>Created At</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {yieldHistory.map((setting) => (
                          <TableRow key={setting.id}>
                            <TableCell>
                              {getFrequencyBadge(setting.frequency)}
                            </TableCell>
                            <TableCell className="font-mono">
                              {formatRatePercentage(setting.rate_bps)}
                            </TableCell>
                            <TableCell className="font-mono">
                              {getAnnualizedRate(setting.rate_bps, setting.frequency)}
                            </TableCell>
                            <TableCell>
                              {getEffectiveStatus(setting.effective_from)}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {formatDateTime(setting.effective_from)}
                              </div>
                            </TableCell>
                            <TableCell>
                              {setting.admin_name || 'System'}
                            </TableCell>
                            <TableCell>
                              {formatDateTime(setting.created_at)}
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

        {/* Create/Update Yield Setting Dialog */}
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Create New Yield Rate
              </DialogTitle>
              <DialogDescription>
                Set a new yield rate with a future effective date. Historical rates are preserved for audit purposes.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit(onSubmitYieldSetting)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="frequency">Frequency *</Label>
                  <Select
                    value={watch('frequency')}
                    onValueChange={(value: 'daily' | 'weekly') => setValue('frequency', value)}
                    disabled={isSubmitting}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select frequency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          Daily Compounding
                        </div>
                      </SelectItem>
                      <SelectItem value="weekly">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          Weekly Compounding
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.frequency && (
                    <p className="text-sm text-red-600">{errors.frequency.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="rate_bps">Yield Rate (%) *</Label>
                  <div className="relative">
                    <Input
                      id="rate_bps"
                      type="number"
                      step="0.001"
                      min="0"
                      max="500"
                      placeholder="0.150"
                      {...register('rate_bps', { valueAsNumber: true })}
                      disabled={isSubmitting}
                      onChange={(e) => {
                        const value = parseFloat(e.target.value) || 0;
                        setValue('rate_bps', value * 100); // Convert % to basis points
                      }}
                    />
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-sm text-muted-foreground">
                      %
                    </div>
                  </div>
                  {errors.rate_bps && (
                    <p className="text-sm text-red-600">{errors.rate_bps.message}</p>
                  )}
                  {watch('rate_bps') && watch('frequency') && (
                    <p className="text-sm text-muted-foreground">
                      Annualized: {getAnnualizedRate(watch('rate_bps'), watch('frequency'))}
                    </p>
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
                <p className="text-sm text-muted-foreground">
                  The date when this yield rate will become effective for new calculations.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="reason">Reason for Rate Change *</Label>
                <textarea
                  id="reason"
                  placeholder="Provide a detailed reason for this yield rate change..."
                  {...register('reason')}
                  disabled={isSubmitting}
                  className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                />
                {errors.reason && (
                  <p className="text-sm text-red-600">{errors.reason.message}</p>
                )}
              </div>

              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Important:</strong> This will create a new yield rate schedule. 
                  Historical rates are preserved and this change will be logged for audit purposes.
                </AlertDescription>
              </Alert>
            </form>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowCreateDialog(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmit(onSubmitYieldSetting)}
                disabled={isSubmitting || !watch('reason') || !watch('rate_bps')}
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Create Yield Rate
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
