/**
 * Admin Onboarding Page
 * View and process investor onboarding submissions from Airtable
 *
 * Features:
 * - View pending submissions from Airtable
 * - Filter by status and search
 * - Create investor action with multi-email support
 * - Real-time statistics dashboard
 * - Bulk actions for efficiency
 */

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Users,
  Clock,
  CheckCircle2,
  XCircle,
  Copy,
  Search,
  Filter,
  RefreshCw,
  Mail,
  Phone,
  Building2,
  Calendar,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { MultiEmailInput, InvestorEmailAddress } from '@/components/admin/MultiEmailInput';
import { getOnboardingService, OnboardingSubmission } from '@/services/onboardingService';
import { getOnboardingSyncService } from '@/services/onboardingSyncService';

// =====================================================
// TYPES & INTERFACES
// =====================================================

interface OnboardingFilters {
  status: 'all' | 'pending' | 'processing' | 'approved' | 'rejected' | 'duplicate';
  search: string;
}

interface OnboardingStats {
  total: number;
  pending: number;
  processing: number;
  approved: number;
  rejected: number;
  duplicate: number;
  todayCount: number;
}

interface CreateInvestorDialogState {
  open: boolean;
  submission: OnboardingSubmission | null;
  emails: InvestorEmailAddress[];
  notes: string;
}

// =====================================================
// ADMIN ONBOARDING PAGE COMPONENT
// =====================================================

export default function AdminOnboardingPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const onboardingService = getOnboardingService();
  const syncService = getOnboardingSyncService();

  const [filters, setFilters] = useState<OnboardingFilters>({
    status: 'all',
    search: '',
  });

  const [createInvestorDialog, setCreateInvestorDialog] = useState<CreateInvestorDialogState>({
    open: false,
    submission: null,
    emails: [],
    notes: '',
  });

  // =====================================================
  // DATA FETCHING
  // =====================================================

  // Fetch onboarding statistics
  const { data: stats, isLoading: statsLoading } = useQuery<OnboardingStats>({
    queryKey: ['onboarding-stats'],
    queryFn: async () => {
      return await onboardingService.getOnboardingStats();
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Fetch onboarding submissions
  const {
    data: submissions,
    isLoading: submissionsLoading,
    refetch: refetchSubmissions,
  } = useQuery<OnboardingSubmission[]>({
    queryKey: ['onboarding-submissions', filters],
    queryFn: async () => {
      return await onboardingService.getSubmissions({
        status: filters.status === 'all' ? undefined : filters.status,
        search: filters.search || undefined,
      });
    },
  });

  // =====================================================
  // MUTATIONS
  // =====================================================

  // Sync from Airtable mutation
  const syncMutation = useMutation({
    mutationFn: async () => {
      return await syncService.syncPendingSubmissions();
    },
    onSuccess: (result) => {
      toast({
        title: 'Sync Complete',
        description: `Synced ${result.recordsSynced} submissions from Airtable. ${result.recordsSkipped} skipped.`,
      });
      queryClient.invalidateQueries({ queryKey: ['onboarding-stats'] });
      queryClient.invalidateQueries({ queryKey: ['onboarding-submissions'] });
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Sync Failed',
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    },
  });

  // Create investor mutation
  const createInvestorMutation = useMutation({
    mutationFn: async () => {
      if (!createInvestorDialog.submission) throw new Error('No submission selected');

      // Get current admin user ID (from auth context)
      const user = JSON.parse(localStorage.getItem('sb-user') || '{}');
      const adminUserId = user?.id;

      if (!adminUserId) throw new Error('Admin user not found');

      return await onboardingService.createInvestorFromSubmission({
        submissionId: createInvestorDialog.submission.id,
        emails: createInvestorDialog.emails.map((e) => e.email),
        processedBy: adminUserId,
        notes: createInvestorDialog.notes || undefined,
      });
    },
    onSuccess: (result) => {
      if (result.success) {
        toast({
          title: 'Investor Created',
          description: `Successfully created investor with ID: ${result.investorId}`,
        });
        setCreateInvestorDialog({ open: false, submission: null, emails: [], notes: '' });
        queryClient.invalidateQueries({ queryKey: ['onboarding-stats'] });
        queryClient.invalidateQueries({ queryKey: ['onboarding-submissions'] });
      } else {
        toast({
          variant: 'destructive',
          title: 'Failed to Create Investor',
          description: result.error,
        });
      }
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    },
  });

  // =====================================================
  // EVENT HANDLERS
  // =====================================================

  const handleOpenCreateInvestor = (submission: OnboardingSubmission) => {
    // Initialize emails with primary email from submission
    const initialEmails: InvestorEmailAddress[] = [
      { email: submission.email, isPrimary: true, isValid: true },
    ];

    // Add additional emails if present
    if (submission.additional_emails && submission.additional_emails.length > 0) {
      submission.additional_emails.forEach((email) => {
        if (email && email.trim()) {
          initialEmails.push({ email: email.trim(), isPrimary: false, isValid: true });
        }
      });
    }

    setCreateInvestorDialog({
      open: true,
      submission,
      emails: initialEmails,
      notes: '',
    });
  };

  const handleCreateInvestor = () => {
    if (createInvestorDialog.emails.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Validation Error',
        description: 'At least one email is required',
      });
      return;
    }

    createInvestorMutation.mutate();
  };

  const handleSync = () => {
    syncMutation.mutate();
  };

  // =====================================================
  // RENDER HELPERS
  // =====================================================

  const getStatusBadge = (status: OnboardingSubmission['status']) => {
    const variants: Record<OnboardingSubmission['status'], { variant: any; icon: any; label: string }> = {
      pending: { variant: 'secondary', icon: Clock, label: 'Pending' },
      processing: { variant: 'default', icon: RefreshCw, label: 'Processing' },
      approved: { variant: 'default', icon: CheckCircle2, label: 'Approved' },
      rejected: { variant: 'destructive', icon: XCircle, label: 'Rejected' },
      duplicate: { variant: 'secondary', icon: Copy, label: 'Duplicate' },
    };

    const config = variants[status];
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // =====================================================
  // RENDER
  // =====================================================

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Investor Onboarding</h1>
          <p className="text-muted-foreground mt-1">
            Review and process investor onboarding submissions from Airtable
          </p>
        </div>
        <Button onClick={handleSync} disabled={syncMutation.isPending}>
          <RefreshCw className={`h-4 w-4 mr-2 ${syncMutation.isPending ? 'animate-spin' : ''}`} />
          {syncMutation.isPending ? 'Syncing...' : 'Sync from Airtable'}
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats?.pending || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats?.approved || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rejected</CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats?.rejected || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today</CardTitle>
            <Calendar className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats?.todayCount || 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, or company..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                className="pl-10"
              />
            </div>
          </div>
          <Select
            value={filters.status}
            onValueChange={(value: any) => setFilters({ ...filters, status: value })}
          >
            <SelectTrigger className="w-[200px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="processing">Processing</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
              <SelectItem value="duplicate">Duplicate</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Submissions Table */}
      <Card>
        <CardHeader>
          <CardTitle>Submissions ({submissions?.length || 0})</CardTitle>
          <CardDescription>Review and process investor onboarding submissions</CardDescription>
        </CardHeader>
        <CardContent>
          {submissionsLoading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : submissions && submissions.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Submitted</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {submissions.map((submission) => (
                  <TableRow key={submission.id}>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(submission.submitted_at)}
                    </TableCell>
                    <TableCell className="font-medium">{submission.full_name}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{submission.email}</span>
                      </div>
                      {submission.additional_emails && submission.additional_emails.length > 0 && (
                        <Badge variant="secondary" className="ml-6 mt-1">
                          +{submission.additional_emails.length} more
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {submission.company_name ? (
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{submission.company_name}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {submission.phone ? (
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{submission.phone}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">—</span>
                      )}
                    </TableCell>
                    <TableCell>{getStatusBadge(submission.status)}</TableCell>
                    <TableCell>
                      {submission.status === 'pending' && (
                        <Button
                          size="sm"
                          onClick={() => handleOpenCreateInvestor(submission)}
                          className="bg-indigo-600 hover:bg-indigo-700"
                        >
                          <Users className="h-4 w-4 mr-1" />
                          Create Investor
                        </Button>
                      )}
                      {submission.status === 'approved' && submission.created_investor_id && (
                        <span className="text-sm text-muted-foreground">
                          Created: {submission.created_investor_id.slice(0, 8)}...
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8">
              <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No submissions found</p>
              <Button onClick={handleSync} variant="link" className="mt-2">
                Sync from Airtable
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Investor Dialog */}
      <Dialog
        open={createInvestorDialog.open}
        onOpenChange={(open) =>
          !createInvestorMutation.isPending &&
          setCreateInvestorDialog({ open, submission: null, emails: [], notes: '' })
        }
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create Investor</DialogTitle>
            <DialogDescription>
              Create a new investor account from this onboarding submission
            </DialogDescription>
          </DialogHeader>

          {createInvestorDialog.submission && (
            <div className="space-y-6">
              {/* Submission Details */}
              <div className="p-4 bg-gray-50 rounded-lg space-y-2">
                <div>
                  <span className="text-sm font-medium text-gray-700">Name:</span>
                  <span className="ml-2 text-sm">{createInvestorDialog.submission.full_name}</span>
                </div>
                {createInvestorDialog.submission.company_name && (
                  <div>
                    <span className="text-sm font-medium text-gray-700">Company:</span>
                    <span className="ml-2 text-sm">{createInvestorDialog.submission.company_name}</span>
                  </div>
                )}
                {createInvestorDialog.submission.phone && (
                  <div>
                    <span className="text-sm font-medium text-gray-700">Phone:</span>
                    <span className="ml-2 text-sm">{createInvestorDialog.submission.phone}</span>
                  </div>
                )}
              </div>

              {/* Multi-Email Input */}
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Email Addresses <span className="text-red-500">*</span>
                </label>
                <MultiEmailInput
                  emails={createInvestorDialog.emails}
                  onChange={(emails) =>
                    setCreateInvestorDialog({ ...createInvestorDialog, emails })
                  }
                  maxEmails={5}
                  placeholder="Add additional email addresses"
                  disabled={createInvestorMutation.isPending}
                />
              </div>

              {/* Notes */}
              <div>
                <label className="text-sm font-medium mb-2 block">Notes (Optional)</label>
                <Textarea
                  value={createInvestorDialog.notes}
                  onChange={(e) =>
                    setCreateInvestorDialog({ ...createInvestorDialog, notes: e.target.value })
                  }
                  placeholder="Add any notes about this investor..."
                  disabled={createInvestorMutation.isPending}
                  rows={3}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() =>
                setCreateInvestorDialog({ open: false, submission: null, emails: [], notes: '' })
              }
              disabled={createInvestorMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateInvestor}
              disabled={
                createInvestorMutation.isPending || createInvestorDialog.emails.length === 0
              }
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              {createInvestorMutation.isPending ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Users className="h-4 w-4 mr-2" />
                  Create Investor
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
