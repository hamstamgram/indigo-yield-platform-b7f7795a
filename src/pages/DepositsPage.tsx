
/**
 * Deposits Page - LP Portal
 * Allows investors to request deposits and view wire instructions
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  DollarSign, 
  AlertCircle, 
  CheckCircle, 
  Clock, 
  Copy, 
  Upload,
  FileText,
  TrendingUp,
  Building,
  Hash,
  User,
  CreditCard,
  Check
} from 'lucide-react';
import { depositRequestSchema, type DepositRequestInput } from '@/lib/validation/schemas';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

// Types
interface Deposit {
  id: string;
  amount: number;
  asset_id: number;
  status: string;
  created_at: string;
  tx_hash?: string;
  wire_reference?: string;
  notes?: string;
  proof_document_id?: string;
  approved_at?: string;
  approved_by?: string;
  rejection_reason?: string;
  asset?: {
    name: string;
    symbol: string;
  }
}

interface WireInstructions {
  bank_name: string;
  bank_address: string;
  account_name: string;
  account_number: string;
  routing_number: string;
  swift_code: string;
  reference_prefix: string;
  additional_instructions?: string;
}

const WIRE_INSTRUCTIONS: WireInstructions = {
  bank_name: 'First National Bank',
  bank_address: '123 Financial District, New York, NY 10004',
  account_name: 'Indigo Yield Fund LLC',
  account_number: '****4567',
  routing_number: '021000021',
  swift_code: 'FNBAUS33',
  reference_prefix: 'IYF',
  additional_instructions: 'Please include your investor ID and reference number in the wire memo.'
};

const DepositsPage = () => {
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue
  } = useForm<DepositRequestInput>({
    resolver: zodResolver(depositRequestSchema),
    defaultValues: {
      assetCode: 'USDT',
      amount: 1000
    }
  });

  const selectedAsset = watch('assetCode');
  const amount = watch('amount');

  useEffect(() => {
    const fetchDeposits = async () => {
      try {
        setLoading(true);
        
        // Fetch user's deposits
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user) {
          const { data: depositsData, error: depositsError } = await supabase
            .from('deposits')
            .select(`
              *,
              asset:asset_id (
                name,
                symbol
              )
            `)
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });
            
          if (depositsError) throw depositsError;
          
          setDeposits(depositsData || []);
        }
      } catch (error: any) {
        console.error("Error fetching deposits:", error);
        toast({
          title: "Error loading deposits",
          description: error.message || "Failed to load deposit history",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchDeposits();
  }, [toast]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'confirmed':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
            <Check className="w-3 h-3 mr-1" /> Confirmed
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
            <Clock className="w-3 h-3 mr-1" /> Pending
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
            <AlertCircle className="w-3 h-3 mr-1" /> Failed
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400">
            {status}
          </span>
        );
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const onSubmit = async (data: DepositRequestInput) => {
    try {
      setSubmitting(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Get investor ID from user profile
      const { data: investor } = await supabase
        .from('investors')
        .select('id')
        .eq('profile_id', user.id)
        .single();

      if (!investor) {
        // Create investor record if it doesn't exist
        const { data: newInvestor, error: createError } = await supabase
          .from('investors')
          .insert({
            profile_id: user.id,
            name: user.email?.split('@')[0] || 'Investor',
            email: user.email || '',
            status: 'pending'
          })
          .select()
          .single();

        if (createError) throw createError;
      }

      // Upload proof document if provided
      let proofDocumentId = data.proofDocumentId;
      if (uploadedFile && !proofDocumentId) {
        const fileExt = uploadedFile.name.split('.').pop();
        const fileName = `${user.id}/${Date.now()}.${fileExt}`;
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('deposit-proofs')
          .upload(fileName, uploadedFile);

        if (uploadError) throw uploadError;
        proofDocumentId = uploadData.path;
      }

      // Get asset ID from symbol
      const { data: asset } = await supabase
        .from('assets')
        .select('id')
        .eq('symbol', data.assetCode)
        .single();

      if (!asset) throw new Error('Asset not found');

      // Create deposit request
      const { error } = await supabase
        .from('deposits')
        .insert({
          user_id: user.id,
          amount: data.amount,
          asset_id: asset.id,
          wire_reference: data.wireReference,
          notes: data.notes,
          proof_document_id: proofDocumentId,
          status: 'pending'
        });

      if (error) throw error;

      toast({
        title: 'Deposit Request Submitted',
        description: 'Your deposit request has been submitted for approval.',
      });

      reset();
      setUploadedFile(null);
      await fetchDeposits();
    } catch (error) {
      console.error('Error submitting deposit request:', error);
      toast({
        title: 'Error',
        description: 'Failed to submit deposit request. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setSubmitting(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: 'Copied',
      description: `${label} copied to clipboard`,
    });
  };

  const generateReference = () => {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    const reference = `${WIRE_INSTRUCTIONS.reference_prefix}-${timestamp}-${random}`;
    setValue('wireReference', reference);
    return reference;
  };

  const fetchDeposits = async () => {
    try {
      setLoading(true);
      
      // Fetch user's deposits
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        const { data: depositsData, error: depositsError } = await supabase
          .from('deposits')
          .select(`
            *,
            asset:asset_id (
              name,
              symbol
            )
          `)
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });
          
        if (depositsError) throw depositsError;
        
        setDeposits(depositsData || []);
      }
    } catch (error: any) {
      console.error("Error fetching deposits:", error);
      toast({
        title: "Error loading deposits",
        description: error.message || "Failed to load deposit history",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Deposit Funds</h1>
          <p className="text-muted-foreground mt-1">
            Request a deposit to your investment portfolio
          </p>
        </div>
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-green-600" />
          <span className="text-sm text-muted-foreground">
            Minimum deposit: $100
          </span>
        </div>
      </div>

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Important</AlertTitle>
        <AlertDescription>
          All deposits must be approved by our compliance team. Wire transfers typically take 1-3 business days to process.
        </AlertDescription>
      </Alert>

      <Tabs defaultValue="new-deposit" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="new-deposit">New Deposit</TabsTrigger>
          <TabsTrigger value="instructions">Wire Instructions</TabsTrigger>
          <TabsTrigger value="history">Deposit History</TabsTrigger>
        </TabsList>
        
        <TabsContent value="new-deposit" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Request New Deposit</CardTitle>
              <CardDescription>
                Complete the form below to initiate a deposit request
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="assetCode">Asset</Label>
                    <Select 
                      value={selectedAsset}
                      onValueChange={(value) => setValue('assetCode', value as any)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select asset" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="BTC">Bitcoin (BTC)</SelectItem>
                        <SelectItem value="ETH">Ethereum (ETH)</SelectItem>
                        <SelectItem value="USDT">Tether (USDT)</SelectItem>
                        <SelectItem value="USDC">USD Coin (USDC)</SelectItem>
                      </SelectContent>
                    </Select>
                    {errors.assetCode && (
                      <p className="text-sm text-red-500">{errors.assetCode.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="amount">Amount</Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        {...register('amount', { valueAsNumber: true })}
                        type="number"
                        step="0.01"
                        min="100"
                        className="pl-10"
                        placeholder="1000.00"
                      />
                    </div>
                    {errors.amount && (
                      <p className="text-sm text-red-500">{errors.amount.message}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="wireReference">Wire Reference</Label>
                  <div className="flex gap-2">
                    <Input
                      {...register('wireReference')}
                      placeholder="Wire reference number"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => generateReference()}
                    >
                      Generate
                    </Button>
                  </div>
                  {errors.wireReference && (
                    <p className="text-sm text-red-500">{errors.wireReference.message}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Use this reference number in your wire transfer memo
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Notes (Optional)</Label>
                  <Textarea
                    {...register('notes')}
                    placeholder="Any additional information..."
                    rows={3}
                  />
                  {errors.notes && (
                    <p className="text-sm text-red-500">{errors.notes.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="proof">Proof of Transfer (Optional)</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="file"
                      accept=".pdf,.png,.jpg,.jpeg"
                      onChange={(e) => setUploadedFile(e.target.files?.[0] || null)}
                    />
                    {uploadedFile && (
                      <Badge variant="outline">
                        <FileText className="w-3 h-3 mr-1" />
                        {uploadedFile.name}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Upload wire confirmation or screenshot (PDF, PNG, JPG)
                  </p>
                </div>

                <div className="pt-4">
                  <Button 
                    type="submit" 
                    className="w-full"
                    disabled={submitting}
                  >
                    {submitting ? 'Submitting...' : 'Submit Deposit Request'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="instructions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Wire Transfer Instructions</CardTitle>
              <CardDescription>
                Use these details to send your wire transfer
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4">
                <div className="flex items-start justify-between p-3 border rounded-lg">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Building className="w-4 h-4 text-muted-foreground" />
                      <Label>Bank Name</Label>
                    </div>
                    <p className="font-medium">{WIRE_INSTRUCTIONS.bank_name}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(WIRE_INSTRUCTIONS.bank_name, 'Bank name')}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>

                <div className="flex items-start justify-between p-3 border rounded-lg">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Building className="w-4 h-4 text-muted-foreground" />
                      <Label>Bank Address</Label>
                    </div>
                    <p className="font-medium">{WIRE_INSTRUCTIONS.bank_address}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(WIRE_INSTRUCTIONS.bank_address, 'Bank address')}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>

                <div className="flex items-start justify-between p-3 border rounded-lg">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-muted-foreground" />
                      <Label>Account Name</Label>
                    </div>
                    <p className="font-medium">{WIRE_INSTRUCTIONS.account_name}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(WIRE_INSTRUCTIONS.account_name, 'Account name')}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>

                <div className="flex items-start justify-between p-3 border rounded-lg">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-muted-foreground" />
                      <Label>Account Number</Label>
                    </div>
                    <p className="font-medium">{WIRE_INSTRUCTIONS.account_number}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(WIRE_INSTRUCTIONS.account_number, 'Account number')}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>

                <div className="flex items-start justify-between p-3 border rounded-lg">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Hash className="w-4 h-4 text-muted-foreground" />
                      <Label>Routing Number</Label>
                    </div>
                    <p className="font-medium">{WIRE_INSTRUCTIONS.routing_number}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(WIRE_INSTRUCTIONS.routing_number, 'Routing number')}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>

                <div className="flex items-start justify-between p-3 border rounded-lg">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Hash className="w-4 h-4 text-muted-foreground" />
                      <Label>SWIFT Code</Label>
                    </div>
                    <p className="font-medium">{WIRE_INSTRUCTIONS.swift_code}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(WIRE_INSTRUCTIONS.swift_code, 'SWIFT code')}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Important</AlertTitle>
                <AlertDescription>
                  {WIRE_INSTRUCTIONS.additional_instructions}
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Deposit History</CardTitle>
              <CardDescription>
                Track your deposit requests and their status
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="flex flex-col items-center gap-2">
                <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-indigo-600"></div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Loading deposits...</p>
              </div>
            </div>
          ) : deposits.length > 0 ? (
            <div className="space-y-4">
              {deposits.map((deposit) => (
                <Card key={deposit.id} className="overflow-hidden border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">{deposit.asset?.symbol.toUpperCase()} Deposit</CardTitle>
                        <CardDescription>{formatDate(deposit.created_at)}</CardDescription>
                      </div>
                      {getStatusBadge(deposit.status)}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex justify-between items-center">
                      <span className="text-2xl font-semibold">{deposit.amount.toFixed(6)} {deposit.asset?.symbol.toUpperCase()}</span>
                      {deposit.tx_hash && (
                        <div className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                          TX: {deposit.tx_hash.substring(0, 10)}...
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="text-center py-12 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
              <CardContent>
                <div className="mx-auto w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center mb-4">
                  <CreditCard className="h-6 w-6 text-gray-500 dark:text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No deposits yet</h3>
                <p className="text-gray-500 dark:text-gray-400">Your deposits will be managed by the fund administrators.</p>
              </CardContent>
            </Card>
          )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DepositsPage;
