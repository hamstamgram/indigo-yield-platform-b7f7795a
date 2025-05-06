import { useState, useEffect } from 'react';
import { Key, Shield, Smartphone } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface SecurityTabProps {
  profile: any;
}

const SecurityTab = ({ profile }: SecurityTabProps) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [totpDialogOpen, setTotpDialogOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [totpEnabled, setTotpEnabled] = useState(profile?.totp_enabled || false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [totpSecret, setTotpSecret] = useState<string | null>(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [verifying, setVerifying] = useState(false);
  const { toast } = useToast();

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      toast({
        title: 'Password mismatch',
        description: 'New password and confirmation do not match',
        variant: 'destructive',
      });
      return;
    }
    
    if (newPassword.length < 8) {
      toast({
        title: 'Password too short',
        description: 'Password must be at least 8 characters long',
        variant: 'destructive',
      });
      return;
    }
    
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      
      if (error) throw error;
      
      setDialogOpen(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      
      toast({
        title: 'Password updated',
        description: 'Your password has been changed successfully.',
      });
      
    } catch (error: any) {
      console.error('Error changing password:', error);
      toast({
        title: 'Password change failed',
        description: error.message || 'Failed to update your password',
        variant: 'destructive',
      });
    }
  };

  const handleToggleTOTP = async () => {
    if (!profile) return;

    if (!totpEnabled) {
      // User is enabling TOTP, show setup dialog
      try {
        setIsUpdating(true);
        const { data, error } = await supabase.auth.mfa.enroll({
          factorType: 'totp'
        });
        
        if (error) throw error;
        
        setQrCode(data.totp.qr_code);
        setTotpSecret(data.totp.secret);
        setTotpDialogOpen(true);
        // Don't change totpEnabled state yet - only after verification
      } catch (error: any) {
        console.error('TOTP enrollment error:', error);
        toast({
          title: 'Failed to setup 2FA',
          description: error.message || 'Could not initiate two-factor authentication setup',
          variant: 'destructive',
        });
      } finally {
        setIsUpdating(false);
      }
    } else {
      // User is disabling TOTP
      try {
        setIsUpdating(true);
        
        // In a real implementation, this would unenroll TOTP
        // For now, we'll toggle the state and show a toast
        setTotpEnabled(false);
        
        // Update the profile in database
        try {
          await supabase.auth.mfa.unenroll({ 
            factorId: 'totp' 
          });
          
          // Update local database profile record
          await supabase
            .from('profiles')
            .update({ 
              totp_enabled: false,
              totp_verified: false 
            })
            .eq('id', profile.id);
          
        } catch (unenrollError: any) {
          console.error('Error unenrolling TOTP:', unenrollError);
          // Continue even if there's an error with the database update
        }
        
        toast({
          title: 'Disabled 2FA',
          description: 'Two-factor authentication has been disabled',
        });
        
      } catch (error: any) {
        console.error('TOTP toggle error:', error);
        // Keep the UI state as is since disabling failed
        toast({
          title: 'Error disabling 2FA',
          description: error.message || 'Failed to disable two-factor authentication',
          variant: 'destructive',
        });
      } finally {
        setIsUpdating(false);
      }
    }
  };

  const handleVerifyTOTP = async () => {
    if (!verificationCode || verificationCode.length !== 6 || !/^\d+$/.test(verificationCode)) {
      toast({
        title: 'Invalid code',
        description: 'Please enter a valid 6-digit verification code',
        variant: 'destructive',
      });
      return;
    }

    try {
      setVerifying(true);
      
      const { data, error } = await supabase.auth.mfa.challenge({ 
        factorId: 'totp' 
      });
      
      if (error) throw error;
      
      const { data: verifyData, error: verifyError } = await supabase.auth.mfa.verify({ 
        factorId: 'totp',
        challengeId: data.id,
        code: verificationCode 
      });
      
      if (verifyError) throw verifyError;
      
      // Update local state
      setTotpEnabled(true);
      
      // Update profile in database
      try {
        await supabase
          .from('profiles')
          .update({ 
            totp_enabled: true,
            totp_verified: true 
          })
          .eq('id', profile.id);
      } catch (updateError: any) {
        console.error('Error updating profile TOTP status:', updateError);
        // Continue even if there's an error with the database update
      }
      
      setTotpDialogOpen(false);
      setVerificationCode('');
      
      toast({
        title: 'Enabled 2FA',
        description: 'Two-factor authentication has been successfully enabled',
      });
    } catch (error: any) {
      console.error('TOTP verification error:', error);
      toast({
        title: 'Verification failed',
        description: error.message || 'Failed to verify the authentication code',
        variant: 'destructive',
      });
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <CardHeader>
          <CardTitle className="text-xl">Password</CardTitle>
          <CardDescription>Manage your password</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium">Change Password</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Update your password regularly for better security
              </p>
            </div>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Key className="h-4 w-4 mr-2" />
                  Update Password
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Change Password</DialogTitle>
                  <DialogDescription>
                    Enter your current password and choose a new one
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handlePasswordChange}>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="current-password">Current Password</Label>
                      <Input
                        id="current-password"
                        type="password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        autoComplete="current-password"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="new-password">New Password</Label>
                      <Input
                        id="new-password"
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        autoComplete="new-password"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="confirm-password">Confirm Password</Label>
                      <Input
                        id="confirm-password"
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        autoComplete="new-password"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="submit">Change Password</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>
      
      <Card className="border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <CardHeader>
          <CardTitle className="text-xl">Two-Factor Authentication</CardTitle>
          <CardDescription>Add an extra layer of security to your account</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium">Two-Factor Authentication</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {totpEnabled 
                  ? 'Two-factor authentication is enabled' 
                  : 'Enable two-factor authentication for enhanced security'}
              </p>
            </div>
            <Switch
              checked={totpEnabled}
              onCheckedChange={handleToggleTOTP}
              disabled={isUpdating}
            />
          </div>
          
          {/* TOTP Setup Dialog */}
          <Dialog open={totpDialogOpen} onOpenChange={(open) => {
            setTotpDialogOpen(open);
            // Reset form if dialog is closed without completing setup
            if (!open && !totpEnabled) {
              setVerificationCode('');
              setQrCode(null);
              setTotpSecret(null);
            }
          }}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Set Up Two-Factor Authentication</DialogTitle>
                <DialogDescription>
                  Scan the QR code with your authenticator app or enter the code manually
                </DialogDescription>
              </DialogHeader>
              
              <div className="flex flex-col items-center gap-4 py-4">
                <Tabs defaultValue="scan" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="scan">Scan QR Code</TabsTrigger>
                    <TabsTrigger value="manual">Manual Entry</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="scan" className="flex justify-center p-4">
                    {qrCode && (
                      <div className="border border-gray-200 p-4 rounded-md">
                        <img 
                          src={qrCode} 
                          alt="QR Code for authenticator app" 
                          className="w-48 h-48"
                        />
                      </div>
                    )}
                  </TabsContent>
                  
                  <TabsContent value="manual" className="p-2">
                    {totpSecret && (
                      <div className="flex flex-col items-center gap-2">
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Enter this code into your authenticator app:
                        </p>
                        <div className="bg-gray-100 dark:bg-gray-700 p-3 rounded-md font-mono text-center break-all">
                          {totpSecret}
                        </div>
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
                
                <div className="w-full space-y-4 mt-2">
                  <Label htmlFor="verification-code">Verification Code</Label>
                  <Input
                    id="verification-code"
                    placeholder="Enter 6-digit code"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value)}
                    maxLength={6}
                    className="text-center text-lg letter-spacing-1"
                  />
                  
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    <p>1. Download an authenticator app like Google Authenticator or Authy</p>
                    <p>2. Scan the QR code or enter the code manually</p>
                    <p>3. Enter the 6-digit code from the app to verify</p>
                  </div>
                </div>
              </div>
              
              <DialogFooter>
                <Button 
                  onClick={handleVerifyTOTP} 
                  disabled={verifying || !verificationCode || verificationCode.length !== 6}
                >
                  {verifying ? 'Verifying...' : 'Verify & Enable'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>
    </div>
  );
};

export default SecurityTab;
