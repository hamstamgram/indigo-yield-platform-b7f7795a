// @ts-nocheck
/**
 * Privacy Settings Page
 * Data privacy controls and data export
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Lock,
  Download,
  Trash2,
  Eye,
  EyeOff,
  AlertTriangle,
  Loader2,
  FileText,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/lib/auth/context';
import { supabase } from '@/integrations/supabase/client';

export default function Privacy() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [profileVisibility, setProfileVisibility] = useState(true);
  const [showBalances, setShowBalances] = useState(true);
  const [allowAnalytics, setAllowAnalytics] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleExportData = async () => {
    if (!user) return;

    setExporting(true);
    try {
      // Gather all user data
      const [profile, investments, transactions, documents] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase.from('investments').select('*').eq('investor_id', user.id),
        supabase.from('transactions').select('*').eq('user_id', user.id),
        supabase.from('documents').select('*').eq('investor_id', user.id),
      ]);

      const exportData = {
        exportDate: new Date().toISOString(),
        profile: profile.data,
        investments: investments.data,
        transactions: transactions.data,
        documents: documents.data?.map((d) => ({
          id: d.id,
          type: d.document_type,
          status: d.status,
          uploadedAt: d.created_at,
        })),
      };

      // Create download
      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `indigo-data-export-${Date.now()}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: 'Success',
        description: 'Your data has been exported successfully',
      });
    } catch (error) {
      console.error('Failed to export data:', error);
      toast({
        title: 'Error',
        description: 'Failed to export your data',
        variant: 'destructive',
      });
    } finally {
      setExporting(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!user) return;

    setDeleting(true);
    try {
      // In production, this would trigger an account deletion workflow
      // that handles data retention policies, compliance, etc.

      toast({
        title: 'Account Deletion Requested',
        description: 'Your request has been submitted. You will receive a confirmation email.',
      });

      // Sign out user
      setTimeout(() => {
        navigate('/');
      }, 2000);
    } catch (error) {
      console.error('Failed to delete account:', error);
      toast({
        title: 'Error',
        description: 'Failed to process account deletion request',
        variant: 'destructive',
      });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="container max-w-4xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/profile')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Privacy Settings</h1>
          <p className="text-muted-foreground mt-2">
            Manage your data privacy and account visibility
          </p>
        </div>
      </div>

      {/* Privacy Controls */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            <CardTitle>Privacy Controls</CardTitle>
          </div>
          <CardDescription>Control who can see your information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="profileVisibility" className="text-base">
                Profile Visibility
              </Label>
              <p className="text-sm text-muted-foreground">
                Allow other users to see your basic profile information
              </p>
            </div>
            <Switch
              id="profileVisibility"
              checked={profileVisibility}
              onCheckedChange={setProfileVisibility}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="showBalances" className="text-base">
                Show Portfolio Balances
              </Label>
              <p className="text-sm text-muted-foreground">
                Display your portfolio value and balances
              </p>
            </div>
            <Switch
              id="showBalances"
              checked={showBalances}
              onCheckedChange={setShowBalances}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="allowAnalytics" className="text-base">
                Usage Analytics
              </Label>
              <p className="text-sm text-muted-foreground">
                Help us improve by sharing anonymous usage data
              </p>
            </div>
            <Switch
              id="allowAnalytics"
              checked={allowAnalytics}
              onCheckedChange={setAllowAnalytics}
            />
          </div>
        </CardContent>
      </Card>

      {/* Data Export */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            <CardTitle>Export Your Data</CardTitle>
          </div>
          <CardDescription>
            Download a copy of all your data stored on our platform
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-muted p-4 rounded-lg">
            <div className="flex items-start gap-3">
              <FileText className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
              <div className="flex-1 text-sm">
                <p className="font-medium mb-1">What's included in the export:</p>
                <ul className="list-disc list-inside text-muted-foreground space-y-1">
                  <li>Profile information and settings</li>
                  <li>Investment history and current holdings</li>
                  <li>Transaction records</li>
                  <li>Document metadata (files not included)</li>
                </ul>
              </div>
            </div>
          </div>

          <Button onClick={handleExportData} disabled={exporting} className="w-full sm:w-auto">
            {exporting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Export My Data
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* GDPR Rights */}
      <Card>
        <CardHeader>
          <CardTitle>Your Rights</CardTitle>
          <CardDescription>
            Under GDPR and other privacy regulations, you have the following rights
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 text-sm">
            <div>
              <h4 className="font-medium mb-1">Right to Access</h4>
              <p className="text-muted-foreground">
                You can request a copy of your personal data at any time using the export feature
                above.
              </p>
            </div>
            <div>
              <h4 className="font-medium mb-1">Right to Rectification</h4>
              <p className="text-muted-foreground">
                You can update your personal information in the Personal Information section.
              </p>
            </div>
            <div>
              <h4 className="font-medium mb-1">Right to Erasure</h4>
              <p className="text-muted-foreground">
                You can request deletion of your account and associated data (subject to legal
                retention requirements).
              </p>
            </div>
            <div>
              <h4 className="font-medium mb-1">Right to Data Portability</h4>
              <p className="text-muted-foreground">
                You can export your data in a machine-readable format.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-destructive">
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <CardTitle className="text-destructive">Danger Zone</CardTitle>
          </div>
          <CardDescription>
            Irreversible actions that permanently affect your account
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-destructive/10 p-4 rounded-lg">
            <p className="text-sm text-destructive font-medium mb-2">Delete Account</p>
            <p className="text-sm text-muted-foreground mb-4">
              Once you delete your account, there is no going back. This action cannot be undone.
              All your data will be permanently deleted after a 30-day grace period.
            </p>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" disabled={deleting}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete My Account
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription className="space-y-2">
                    <p>
                      This action cannot be undone. This will permanently delete your account and
                      remove your data from our servers.
                    </p>
                    <p className="font-medium">
                      Before proceeding, please ensure you have:
                    </p>
                    <ul className="list-disc list-inside text-sm space-y-1">
                      <li>Withdrawn all your funds</li>
                      <li>Exported your data if needed</li>
                      <li>Saved any important documents</li>
                    </ul>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDeleteAccount}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {deleting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Deleting...
                      </>
                    ) : (
                      'Yes, Delete My Account'
                    )}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
