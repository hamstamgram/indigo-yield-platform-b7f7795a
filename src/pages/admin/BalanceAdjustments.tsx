import React, { useState } from 'react';
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
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { supabase } from '@/lib/supabase';
import { redactForAdmin } from '@/lib/security/redact-pii';
import { DollarSign, AlertTriangle, TrendingUp, TrendingDown, FileText, Users } from 'lucide-react';

const adjustmentSchema = z.object({
  user_id: z.string().uuid('Please select a valid investor'),
  fund_id: z.string().uuid().optional(),
  amount: z.string()
    .refine((val) => !isNaN(parseFloat(val)), 'Amount must be a valid number')
    .transform((val) => parseFloat(val))
    .refine((val) => val !== 0, 'Amount cannot be zero')
    .refine((val) => Math.abs(val) >= 0.01, 'Minimum adjustment is $0.01'),
  currency: z.string().default('USD'),
  reason: z.string().min(10, 'Reason must be at least 10 characters'),
  notes: z.string().optional(),
  audit_ref: z.string().optional(),
});

type AdjustmentForm = z.infer<typeof adjustmentSchema>;

interface Investor {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  status: string;
}

interface Fund {
  id: string;
  code: string;
  name: string;
}

interface AdjustmentPreview {
  investor: Investor;
  fund?: Fund;
  amount: number;
  type: 'credit' | 'debit';
  reason: string;
  notes?: string;
  audit_ref?: string;
}

export function BalanceAdjustments() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [investors, setInvestors] = useState<Investor[]>([]);
  const [funds, setFunds] = useState<Fund[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [adjustmentPreview, setAdjustmentPreview] = useState<AdjustmentPreview | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset,
    trigger,
    getValues
  } = useForm<AdjustmentForm>({
    resolver: zodResolver(adjustmentSchema),
    defaultValues: {
      currency: 'USD',
    }
  });

  // Load data on component mount
  React.useEffect(() => {
    loadInvestors();
    loadFunds();
  }, []);

  const loadInvestors = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, first_name, last_name, status')
        .eq('is_admin', false)
        .order('email');

      if (error) throw error;
      setInvestors(data || []);
    } catch (error) {
      console.error('Error loading investors:', error);
      toast.error('Failed to load investors');
    }
  };

  const loadFunds = async () => {
    try {
      const { data, error } = await supabase
        .from('fund_configurations')
        .select('id, code, name')
        .eq('status', 'active')
        .order('name');

      if (error) throw error;
      setFunds(data || []);
    } catch (error) {
      console.error('Error loading funds:', error);
      toast.error('Failed to load funds');
    }
  };

  const generateAuditRef = () => {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 6).toUpperCase();
    return `ADJ-${timestamp}-${random}`;
  };

  const onPreview = async (data: AdjustmentForm) => {
    const isValid = await trigger();
    if (!isValid) return;

    const selectedInvestor = investors.find(inv => inv.id === data.user_id);
    const selectedFund = data.fund_id ? funds.find(fund => fund.id === data.fund_id) : undefined;

    if (!selectedInvestor) {
      toast.error('Selected investor not found');
      return;
    }

    setAdjustmentPreview({
      investor: selectedInvestor,
      fund: selectedFund,
      amount: Math.abs(data.amount),
      type: data.amount > 0 ? 'credit' : 'debit',
      reason: data.reason,
      notes: data.notes,
      audit_ref: data.audit_ref || generateAuditRef(),
    });

    setShowPreview(true);
  };

  const onConfirmAdjustment = async () => {
    if (!adjustmentPreview) return;

    setIsSubmitting(true);
    
    try {
      const formData = getValues();
      
      // Insert balance adjustment record
      const { data: adjustment, error: adjustmentError } = await supabase
        .from('balance_adjustments')
        .insert({
          user_id: formData.user_id,
          fund_id: formData.fund_id || null,
          amount: formData.amount,
          currency: formData.currency,
          reason: formData.reason,
          notes: formData.notes || null,
          audit_ref: adjustmentPreview.audit_ref,
          created_by: (await supabase.auth.getUser()).data.user?.id,
        })
        .select()
        .single();

      if (adjustmentError) {
        throw new Error(`Failed to create adjustment: ${adjustmentError.message}`);
      }

      // Log audit event with redacted PII
      const auditData = {
        investor_id: formData.user_id,
        investor_email: redactForAdmin(adjustmentPreview.investor.email),
        amount: formData.amount,
        currency: formData.currency,
        fund: adjustmentPreview.fund?.code,
        reason: formData.reason,
        audit_ref: adjustmentPreview.audit_ref,
      };

      await supabase
        .from('audit_log')
        .insert({
          actor_user: (await supabase.auth.getUser()).data.user?.id,
          action: 'CREATE_BALANCE_ADJUSTMENT',
          entity: 'balance_adjustments',
          entity_id: adjustment.id,
          new_values: auditData,
          meta: {
            adjustment_type: adjustmentPreview.type,
            has_notes: !!formData.notes,
          }
        });

      // Send notification to investor
      try {
        await supabase.functions.invoke('ef_send_notification', {
          body: {
            user_id: formData.user_id,
            type: 'system',
            title: 'Balance Adjustment Applied',
            body: `A ${adjustmentPreview.type} of $${adjustmentPreview.amount.toLocaleString()} has been applied to your account. Reference: ${adjustmentPreview.audit_ref}`,
            data: {
              adjustment_id: adjustment.id,
              amount: formData.amount,
              type: adjustmentPreview.type,
              audit_ref: adjustmentPreview.audit_ref,
            },
            priority: 'medium',
            send_email: true,
          }
        });
      } catch (notificationError) {
        console.warn('Failed to send notification:', notificationError);
      }

      toast.success(`Balance adjustment applied successfully. Reference: ${adjustmentPreview.audit_ref}`);
      
      // Reset form and close dialog
      reset();
      setShowPreview(false);
      setAdjustmentPreview(null);

    } catch (error: any) {
      console.error('Error creating balance adjustment:', error);
      toast.error(error.message || 'Failed to create balance adjustment');
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedAmount = watch('amount');
  const adjustmentType = selectedAmount ? (selectedAmount > 0 ? 'credit' : 'debit') : null;

  return (
    <AdminOnly>
      <div className="container mx-auto py-8 px-4 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <DollarSign className="h-8 w-8" />
            Balance Adjustments
          </h1>
          <p className="text-muted-foreground mt-2">
            Apply manual credit or debit adjustments to investor accounts with full audit trail.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Create Balance Adjustment</CardTitle>
            <CardDescription>
              All adjustments require a detailed reason and will be logged for audit purposes.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onPreview)} className="space-y-6">
              {/* Investor Selection */}
              <div className="space-y-2">
                <Label htmlFor="user_id">Select Investor *</Label>
                <Select
                  value={watch('user_id') || ''}
                  onValueChange={(value) => setValue('user_id', value)}
                  disabled={isSubmitting}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose investor account" />
                  </SelectTrigger>
                  <SelectContent>
                    <div className="p-2 text-sm text-muted-foreground border-b">
                      <Users className="h-4 w-4 inline mr-2" />
                      {investors.length} investors available
                    </div>
                    {investors.map((investor) => (
                      <SelectItem key={investor.id} value={investor.id}>
                        <div className="flex flex-col">
                          <span className="font-medium">
                            {investor.first_name && investor.last_name
                              ? `${investor.first_name} ${investor.last_name}`
                              : investor.email
                            }
                          </span>
                          <span className="text-sm text-muted-foreground">
                            {redactForAdmin(investor.email)} • Status: {investor.status}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.user_id && (
                  <p className="text-sm text-red-600">{errors.user_id.message}</p>
                )}
              </div>

              {/* Fund Selection (Optional) */}
              <div className="space-y-2">
                <Label htmlFor="fund_id">Fund (Optional)</Label>
                <Select
                  value={watch('fund_id') || ''}
                  onValueChange={(value) => setValue('fund_id', value || undefined)}
                  disabled={isSubmitting}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select fund or leave empty for general adjustment" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">No specific fund</SelectItem>
                    {funds.map((fund) => (
                      <SelectItem key={fund.id} value={fund.id}>
                        {fund.name} ({fund.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Amount and Currency */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2 space-y-2">
                  <Label htmlFor="amount">Adjustment Amount *</Label>
                  <div className="relative">
                    <Input
                      id="amount"
                      type="number"
                      step="0.01"
                      placeholder="Enter amount (positive for credit, negative for debit)"
                      {...register('amount')}
                      disabled={isSubmitting}
                      className="pr-20"
                    />
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center gap-1 text-sm text-muted-foreground">
                      {adjustmentType === 'credit' && <TrendingUp className="h-4 w-4 text-green-600" />}
                      {adjustmentType === 'debit' && <TrendingDown className="h-4 w-4 text-red-600" />}
                      {adjustmentType && (
                        <span className={adjustmentType === 'credit' ? 'text-green-600' : 'text-red-600'}>
                          {adjustmentType}
                        </span>
                      )}
                    </div>
                  </div>
                  {errors.amount && (
                    <p className="text-sm text-red-600">{errors.amount.message}</p>
                  )}
                  <p className="text-sm text-muted-foreground">
                    Use positive values for credits (adding funds) and negative values for debits (removing funds).
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="currency">Currency *</Label>
                  <Select
                    value={watch('currency')}
                    onValueChange={(value) => setValue('currency', value)}
                    disabled={isSubmitting}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USD">USD</SelectItem>
                      <SelectItem value="EUR">EUR</SelectItem>
                      <SelectItem value="GBP">GBP</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Reason and Notes */}
              <div className="space-y-2">
                <Label htmlFor="reason">Reason for Adjustment *</Label>
                <Textarea
                  id="reason"
                  placeholder="Provide a detailed explanation for this balance adjustment..."
                  {...register('reason')}
                  disabled={isSubmitting}
                  className="min-h-[100px]"
                />
                {errors.reason && (
                  <p className="text-sm text-red-600">{errors.reason.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Additional Notes</Label>
                <Textarea
                  id="notes"
                  placeholder="Any additional information or context..."
                  {...register('notes')}
                  disabled={isSubmitting}
                />
              </div>

              {/* Audit Reference */}
              <div className="space-y-2">
                <Label htmlFor="audit_ref">Audit Reference (Optional)</Label>
                <Input
                  id="audit_ref"
                  placeholder="Custom reference ID (auto-generated if empty)"
                  {...register('audit_ref')}
                  disabled={isSubmitting}
                />
                <p className="text-sm text-muted-foreground">
                  Leave empty to auto-generate a unique reference ID.
                </p>
              </div>

              {/* Warning Alert */}
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Important:</strong> Balance adjustments directly affect investor portfolios and are 
                  permanent. Ensure all information is accurate before proceeding. This action will be logged 
                  and the investor will be notified.
                </AlertDescription>
              </Alert>

              {/* Action Buttons */}
              <div className="flex justify-between pt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => reset()}
                  disabled={isSubmitting}
                >
                  Clear Form
                </Button>
                
                <Button
                  type="submit"
                  disabled={isSubmitting || !watch('user_id') || !watch('amount') || !watch('reason')}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Preview Adjustment
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Preview Dialog */}
        <Dialog open={showPreview} onOpenChange={setShowPreview}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Review Balance Adjustment
              </DialogTitle>
              <DialogDescription>
                Please review the adjustment details before confirming. This action cannot be undone.
              </DialogDescription>
            </DialogHeader>

            {adjustmentPreview && (
              <div className="space-y-4">
                <div className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Investor:</span>
                    <span>
                      {adjustmentPreview.investor.first_name && adjustmentPreview.investor.last_name
                        ? `${adjustmentPreview.investor.first_name} ${adjustmentPreview.investor.last_name}`
                        : redactForAdmin(adjustmentPreview.investor.email)
                      }
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="font-medium">Email:</span>
                    <span>{redactForAdmin(adjustmentPreview.investor.email)}</span>
                  </div>

                  {adjustmentPreview.fund && (
                    <div className="flex items-center justify-between">
                      <span className="font-medium">Fund:</span>
                      <span>{adjustmentPreview.fund.name} ({adjustmentPreview.fund.code})</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <span className="font-medium">Adjustment Type:</span>
                    <span className={`flex items-center gap-1 font-medium ${
                      adjustmentPreview.type === 'credit' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {adjustmentPreview.type === 'credit' ? (
                        <TrendingUp className="h-4 w-4" />
                      ) : (
                        <TrendingDown className="h-4 w-4" />
                      )}
                      {adjustmentPreview.type.toUpperCase()}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="font-medium">Amount:</span>
                    <span className={`text-lg font-bold ${
                      adjustmentPreview.type === 'credit' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      ${adjustmentPreview.amount.toLocaleString()} USD
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="font-medium">Reference:</span>
                    <span className="font-mono text-sm">{adjustmentPreview.audit_ref}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Reason:</Label>
                  <p className="text-sm text-muted-foreground p-3 bg-gray-50 rounded border">
                    {adjustmentPreview.reason}
                  </p>
                </div>

                {adjustmentPreview.notes && (
                  <div className="space-y-2">
                    <Label>Notes:</Label>
                    <p className="text-sm text-muted-foreground p-3 bg-gray-50 rounded border">
                      {adjustmentPreview.notes}
                    </p>
                  </div>
                )}
              </div>
            )}

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowPreview(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                onClick={onConfirmAdjustment}
                disabled={isSubmitting}
                className={adjustmentPreview?.type === 'credit' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}
              >
                {isSubmitting ? 'Processing...' : `Confirm ${adjustmentPreview?.type?.toUpperCase()}`}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminOnly>
  );
}
