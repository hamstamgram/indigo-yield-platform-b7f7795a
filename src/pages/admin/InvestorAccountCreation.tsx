import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { supabase } from '@/integrations/supabase/client';
import { UserPlus, AlertTriangle, CheckCircle } from 'lucide-react';

const createInvestorSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  phone: z.string().optional(),
  role: z.enum(['LP', 'admin']).default('LP'),
  selectedFunds: z.array(z.string()).min(1, 'At least one fund must be selected'),
  sendWelcomeEmail: z.boolean().default(true),
});

type CreateInvestorForm = z.infer<typeof createInvestorSchema>;

interface Fund {
  id: string;
  code: string;
  name: string;
  status: 'active' | 'inactive';
}

export function InvestorAccountCreation() {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [availableFunds, setAvailableFunds] = useState<Fund[]>([]);
  const [creationResult, setCreationResult] = useState<{
    success: boolean;
    message: string;
    inviteId?: string;
  } | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch
  } = useForm<CreateInvestorForm>({
    resolver: zodResolver(createInvestorSchema),
    defaultValues: {
      role: 'LP',
      selectedFunds: [],
      sendWelcomeEmail: true,
    }
  });

  // Load available funds on component mount
  React.useEffect(() => {
    loadAvailableFunds();
  }, []);

  const loadAvailableFunds = async () => {
    try {
      const { data, error } = await supabase
        .from('fund_configurations')
        .select('id, code, name, status')
        .eq('status', 'active')
        .order('name');

      if (error) throw error;
      
      const transformedFunds: Fund[] = (data || []).map(fund => ({
        ...fund,
        status: fund.status === 'suspended' ? 'inactive' : fund.status
      }));
      setAvailableFunds(transformedFunds);
    } catch (error) {
      console.error('Error loading funds:', error);
      toast.error('Failed to load available funds');
    }
  };

  const selectedFunds = watch('selectedFunds');

  const toggleFundSelection = (fundId: string) => {
    const current = selectedFunds || [];
    const updated = current.includes(fundId)
      ? current.filter(id => id !== fundId)
      : [...current, fundId];
    setValue('selectedFunds', updated);
  };

  const onSubmit = async (data: CreateInvestorForm) => {
    setIsSubmitting(true);
    setCreationResult(null);

    try {
      // Create user via Supabase Admin API
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email: data.email,
        email_confirm: false, // Will be confirmed via invite link
        user_metadata: {
          first_name: data.firstName,
          last_name: data.lastName,
          phone: data.phone || null,
          is_admin: data.role === 'admin',
          created_by_admin: true,
        }
      });

      if (createError) {
        throw new Error(`Failed to create user: ${createError.message}`);
      }

      if (!newUser.user) {
        throw new Error('User creation failed - no user returned');
      }

      // Create profile record
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: newUser.user.id,
          email: data.email,
          first_name: data.firstName,
          last_name: data.lastName,
          phone: data.phone || null,
          is_admin: data.role === 'admin',
          status: 'Pending',
        });

      if (profileError) {
        throw new Error(`Failed to create profile: ${profileError.message}`);
      }

      // Create fund associations if LP
      if (data.role === 'LP' && data.selectedFunds.length > 0) {
        // Note: This would require a user_funds table or similar
        // For now, we'll store the fund preferences in the user metadata
        const { error: updateError } = await supabase.auth.admin.updateUserById(
          newUser.user.id,
          {
            user_metadata: {
              ...newUser.user.user_metadata,
              fund_preferences: data.selectedFunds,
            }
          }
        );

        if (updateError) {
          console.warn('Failed to store fund preferences:', updateError);
        }
      }

      // Create admin invite record
      const inviteCode = `invite_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

      const { data: invite, error: inviteError } = await supabase
        .from('admin_invites')
        .insert({
          email: data.email,
          invite_code: inviteCode,
          expires_at: expiresAt.toISOString(),
          created_by: (await supabase.auth.getUser()).data.user?.id,
        })
        .select()
        .single();

      if (inviteError) {
        throw new Error(`Failed to create invite: ${inviteError.message}`);
      }

      // Send welcome email if requested
      if (data.sendWelcomeEmail) {
        try {
          const { error: notificationError } = await supabase.functions.invoke('ef_send_notification', {
            body: {
              user_id: newUser.user.id,
              type: 'system',
              title: 'Welcome to Indigo Yield',
              body: `Your investor account has been created. Please check your email for setup instructions.`,
              data: {
                invite_code: inviteCode,
                expires_at: expiresAt.toISOString(),
              },
              send_email: true,
            }
          });

          if (notificationError) {
            console.warn('Failed to send welcome notification:', notificationError);
          }
        } catch (emailError) {
          console.warn('Email sending failed:', emailError);
        }
      }

      // Log audit event
      await supabase
        .from('audit_log')
        .insert({
          actor_user: (await supabase.auth.getUser()).data.user?.id,
          action: 'CREATE_INVESTOR_ACCOUNT',
          entity: 'profiles',
          entity_id: newUser.user.id,
          new_values: {
            email: data.email,
            role: data.role,
            fund_count: data.selectedFunds.length,
          },
          meta: {
            invite_sent: data.sendWelcomeEmail,
            invite_code: inviteCode,
          }
        });

      setCreationResult({
        success: true,
        message: `Investor account created successfully for ${data.email}. ${data.sendWelcomeEmail ? 'Welcome email sent.' : 'No email sent.'}`,
        inviteId: invite.id,
      });

      toast.success('Investor account created successfully');

    } catch (error: any) {
      console.error('Error creating investor account:', error);
      setCreationResult({
        success: false,
        message: error.message || 'Failed to create investor account',
      });
      toast.error('Failed to create investor account');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AdminOnly>
      <div className="container mx-auto py-8 px-4 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <UserPlus className="h-8 w-8" />
            Create New Investor Account
          </h1>
          <p className="text-muted-foreground mt-2">
            Create a new investor account with role assignment and fund pre-selection.
          </p>
        </div>

        {creationResult && (
          <Alert className={`mb-6 ${creationResult.success ? 'border-green-200 bg-green-50' : ''}`} 
                variant={creationResult.success ? 'default' : 'destructive'}>
            {creationResult.success ? (
              <CheckCircle className="h-4 w-4 text-green-600" />
            ) : (
              <AlertTriangle className="h-4 w-4" />
            )}
            <AlertDescription className={creationResult.success ? 'text-green-700' : ''}>
              {creationResult.message}
            </AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Account Details</CardTitle>
            <CardDescription>
              Fill in the investor information and select appropriate settings.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address *</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="investor@example.com"
                    {...register('email')}
                    disabled={isSubmitting}
                  />
                  {errors.email && (
                    <p className="text-sm text-red-600">{errors.email.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="+1 (555) 123-4567"
                    {...register('phone')}
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name *</Label>
                  <Input
                    id="firstName"
                    placeholder="John"
                    {...register('firstName')}
                    disabled={isSubmitting}
                  />
                  {errors.firstName && (
                    <p className="text-sm text-red-600">{errors.firstName.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name *</Label>
                  <Input
                    id="lastName"
                    placeholder="Smith"
                    {...register('lastName')}
                    disabled={isSubmitting}
                  />
                  {errors.lastName && (
                    <p className="text-sm text-red-600">{errors.lastName.message}</p>
                  )}
                </div>
              </div>

              {/* Role Selection */}
              <div className="space-y-2">
                <Label htmlFor="role">Account Role *</Label>
                <Select
                  value={watch('role')}
                  onValueChange={(value: 'LP' | 'admin') => setValue('role', value)}
                  disabled={isSubmitting}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LP">Limited Partner (Investor)</SelectItem>
                    <SelectItem value="admin">Administrator</SelectItem>
                  </SelectContent>
                </Select>
                {errors.role && (
                  <p className="text-sm text-red-600">{errors.role.message}</p>
                )}
              </div>

              {/* Fund Selection (only for LP role) */}
              {watch('role') === 'LP' && (
                <div className="space-y-4">
                  <Label>Fund Access *</Label>
                  <p className="text-sm text-muted-foreground">
                    Select which funds this investor will have access to:
                  </p>
                  
                  {availableFunds.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {availableFunds.map((fund) => (
                        <div key={fund.id} className="flex items-center space-x-2 p-3 border rounded-lg">
                          <Checkbox
                            id={`fund-${fund.id}`}
                            checked={selectedFunds?.includes(fund.id) || false}
                            onCheckedChange={() => toggleFundSelection(fund.id)}
                            disabled={isSubmitting}
                          />
                          <div className="flex-1">
                            <Label 
                              htmlFor={`fund-${fund.id}`} 
                              className="font-medium cursor-pointer"
                            >
                              {fund.name}
                            </Label>
                            <p className="text-sm text-muted-foreground">
                              Code: {fund.code}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <Alert>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        No active funds available. Please create fund configurations first.
                      </AlertDescription>
                    </Alert>
                  )}

                  {errors.selectedFunds && (
                    <p className="text-sm text-red-600">{errors.selectedFunds.message}</p>
                  )}
                </div>
              )}

              {/* Email Settings */}
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="sendWelcomeEmail"
                    checked={watch('sendWelcomeEmail')}
                    onCheckedChange={(checked) => setValue('sendWelcomeEmail', checked as boolean)}
                    disabled={isSubmitting}
                  />
                  <Label htmlFor="sendWelcomeEmail">
                    Send welcome email with account setup instructions
                  </Label>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-between pt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate('/admin/investors')}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                
                <Button
                  type="submit"
                  disabled={isSubmitting || (watch('role') === 'LP' && selectedFunds?.length === 0)}
                >
                  {isSubmitting ? 'Creating Account...' : 'Create Account'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </AdminOnly>
  );
}
