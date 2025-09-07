/**
 * Admin Batch Report Generation Page
 * Generate monthly statements for all LPs/funds with progress tracking
 */

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
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
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { cn } from '@/lib/utils';
import { 
  PlayCircle, 
  PauseCircle,
  StopCircle,
  RefreshCw,
  Download,
  Calendar as CalendarIcon,
  FileText,
  Users,
  CheckCircle2,
  AlertCircle,
  Clock,
  BarChart3,
  AlertTriangle,
  Eye,
  Mail
} from 'lucide-react';

type BatchJobStatus = 'idle' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled';

type BatchJobType = 'monthly_statements' | 'tax_documents' | 'performance_reports' | 'quarterly_reports';

interface BatchJob {
  id: string;
  type: BatchJobType;
  title: string;
  description: string;
  status: BatchJobStatus;
  total_count: number;
  processed_count: number;
  success_count: number;
  failed_count: number;
  progress_percent: number;
  period_start: Date;
  period_end: Date;
  fund_ids: string[];
  user_filter?: 'all' | 'active' | 'specific';
  specific_users?: string[];
  created_at: Date;
  started_at?: Date;
  completed_at?: Date;
  created_by: string;
  error_message?: string;
  estimated_duration?: number;
  elapsed_time?: number;
}

interface BatchJobItem {
  id: string;
  job_id: string;
  user_id: string;
  user_name: string;
  fund_code: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'skipped';
  document_id?: string;
  error_message?: string;
  processed_at?: Date;
  file_size?: number;
  retry_count: number;
}

// Sample data for demonstration
const sampleBatchJobs: BatchJob[] = [
  {
    id: 'batch_001',
    type: 'monthly_statements',
    title: 'January 2024 Monthly Statements',
    description: 'Generate monthly account statements for all active investors',
    status: 'completed',
    total_count: 245,
    processed_count: 245,
    success_count: 243,
    failed_count: 2,
    progress_percent: 100,
    period_start: new Date('2024-01-01'),
    period_end: new Date('2024-01-31'),
    fund_ids: ['fund_001'],
    user_filter: 'active',
    created_at: new Date('2024-02-01T09:00:00'),
    started_at: new Date('2024-02-01T09:05:00'),
    completed_at: new Date('2024-02-01T11:30:00'),
    created_by: 'admin_user',
    estimated_duration: 8400,
    elapsed_time: 8700,
  },
  {
    id: 'batch_002',
    type: 'quarterly_reports',
    title: 'Q4 2023 Performance Reports',
    description: 'Generate quarterly performance reports with benchmarking',
    status: 'running',
    total_count: 245,
    processed_count: 120,
    success_count: 118,
    failed_count: 2,
    progress_percent: 49,
    period_start: new Date('2023-10-01'),
    period_end: new Date('2023-12-31'),
    fund_ids: ['fund_001'],
    user_filter: 'all',
    created_at: new Date('2024-01-15T14:00:00'),
    started_at: new Date('2024-01-15T14:05:00'),
    created_by: 'admin_user',
    estimated_duration: 10800,
    elapsed_time: 5400,
  },
];

const sampleJobItems: BatchJobItem[] = [
  {
    id: 'item_001',
    job_id: 'batch_001',
    user_id: 'user_123',
    user_name: 'John Smith',
    fund_code: 'INDIGO',
    status: 'completed',
    document_id: 'doc_001',
    processed_at: new Date('2024-02-01T09:15:00'),
    file_size: 256000,
    retry_count: 0,
  },
  {
    id: 'item_002',
    job_id: 'batch_001',
    user_id: 'user_456',
    user_name: 'Jane Doe',
    fund_code: 'INDIGO',
    status: 'failed',
    error_message: 'Insufficient data for period',
    processed_at: new Date('2024-02-01T09:20:00'),
    retry_count: 2,
  },
];

const JOB_TYPE_CONFIG = {
  monthly_statements: {
    label: 'Monthly Statements',
    icon: FileText,
    description: 'Generate monthly account statements for investors',
    defaultPeriod: 'last_month',
    estimatedTimePerItem: 15, // seconds
  },
  tax_documents: {
    label: 'Tax Documents',
    icon: FileText,
    description: 'Generate year-end tax documents and forms',
    defaultPeriod: 'last_year',
    estimatedTimePerItem: 30,
  },
  performance_reports: {
    label: 'Performance Reports',
    icon: BarChart3,
    description: 'Generate detailed performance analysis reports',
    defaultPeriod: 'custom',
    estimatedTimePerItem: 45,
  },
  quarterly_reports: {
    label: 'Quarterly Reports',
    icon: BarChart3,
    description: 'Generate quarterly performance and holdings reports',
    defaultPeriod: 'last_quarter',
    estimatedTimePerItem: 60,
  },
};

export default function AdminBatchReportsPage() {
  const [batchJobs, setBatchJobs] = useState<BatchJob[]>(sampleBatchJobs);
  const [jobItems, setJobItems] = useState<BatchJobItem[]>(sampleJobItems);
  const [selectedJob, setSelectedJob] = useState<BatchJob | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  
  // New job form state
  const [newJob, setNewJob] = useState<{
    type: BatchJobType;
    title: string;
    description: string;
    period_start: Date;
    period_end: Date;
    fund_ids: string[];
    user_filter: 'all' | 'active' | 'specific';
    specific_users: string[];
  }>({
    type: 'monthly_statements',
    title: '',
    description: '',
    period_start: startOfMonth(subMonths(new Date(), 1)),
    period_end: endOfMonth(subMonths(new Date(), 1)),
    fund_ids: ['fund_001'],
    user_filter: 'active',
    specific_users: [],
  });

  // Simulate real-time updates for running jobs
  useEffect(() => {
    const interval = setInterval(() => {
      setBatchJobs(prev => prev.map(job => {
        if (job.status === 'running') {
          const newProcessedCount = Math.min(job.processed_count + Math.floor(Math.random() * 3), job.total_count);
          const newProgressPercent = Math.round((newProcessedCount / job.total_count) * 100);
          const newElapsedTime = (job.elapsed_time || 0) + 2000;
          
          if (newProcessedCount >= job.total_count) {
            return {
              ...job,
              status: 'completed' as BatchJobStatus,
              processed_count: job.total_count,
              success_count: job.total_count - job.failed_count,
              progress_percent: 100,
              completed_at: new Date(),
              elapsed_time: newElapsedTime,
            };
          }
          
          return {
            ...job,
            processed_count: newProcessedCount,
            success_count: newProcessedCount - job.failed_count,
            progress_percent: newProgressPercent,
            elapsed_time: newElapsedTime,
          };
        }
        return job;
      }));
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  const handleCreateJob = async () => {
    const jobConfig = JOB_TYPE_CONFIG[newJob.type];
    const estimatedCount = newJob.user_filter === 'specific' ? newJob.specific_users.length : 245; // Mock count
    
    const job: BatchJob = {
      id: `batch_${Date.now()}`,
      type: newJob.type,
      title: newJob.title || `${jobConfig.label} - ${format(newJob.period_start, 'MMM yyyy')}`,
      description: newJob.description || jobConfig.description,
      status: 'idle',
      total_count: estimatedCount,
      processed_count: 0,
      success_count: 0,
      failed_count: 0,
      progress_percent: 0,
      period_start: newJob.period_start,
      period_end: newJob.period_end,
      fund_ids: newJob.fund_ids,
      user_filter: newJob.user_filter,
      specific_users: newJob.specific_users,
      created_at: new Date(),
      created_by: 'admin_user',
      estimated_duration: estimatedCount * jobConfig.estimatedTimePerItem,
    };

    setBatchJobs(prev => [job, ...prev]);
    setShowCreateDialog(false);
    
    // Reset form
    setNewJob({
      type: 'monthly_statements',
      title: '',
      description: '',
      period_start: startOfMonth(subMonths(new Date(), 1)),
      period_end: endOfMonth(subMonths(new Date(), 1)),
      fund_ids: ['fund_001'],
      user_filter: 'active',
      specific_users: [],
    });
  };

  const handleJobAction = (jobId: string, action: 'start' | 'pause' | 'cancel' | 'retry') => {
    setBatchJobs(prev => prev.map(job => {
      if (job.id === jobId) {
        switch (action) {
          case 'start':
            return { ...job, status: 'running', started_at: new Date() };
          case 'pause':
            return { ...job, status: 'paused' };
          case 'cancel':
            return { ...job, status: 'cancelled' };
          case 'retry':
            return { 
              ...job, 
              status: 'running', 
              processed_count: 0, 
              success_count: 0, 
              failed_count: 0,
              progress_percent: 0,
              started_at: new Date(),
              completed_at: undefined,
              error_message: undefined 
            };
          default:
            return job;
        }
      }
      return job;
    }));
  };

  const getStatusBadgeVariant = (status: BatchJobStatus) => {
    switch (status) {
      case 'completed': return 'default';
      case 'running': return 'secondary';
      case 'paused': return 'outline';
      case 'failed': return 'destructive';
      case 'cancelled': return 'secondary';
      default: return 'outline';
    }
  };

  const getStatusIcon = (status: BatchJobStatus) => {
    switch (status) {
      case 'completed': return <CheckCircle2 className="w-4 h-4" />;
      case 'running': return <Clock className="w-4 h-4" />;
      case 'paused': return <PauseCircle className="w-4 h-4" />;
      case 'failed': return <AlertCircle className="w-4 h-4" />;
      case 'cancelled': return <StopCircle className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '—';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
  };

  const getJobItemsForJob = (jobId: string) => {
    return jobItems.filter(item => item.job_id === jobId);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Batch Report Generation</h1>
          <p className="text-gray-600 mt-2">
            Generate monthly statements and reports for all investors
          </p>
        </div>
        <div className="flex gap-2">
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2">
                <PlayCircle className="w-4 h-4" />
                New Batch Job
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl">
              <DialogHeader>
                <DialogTitle>Create New Batch Job</DialogTitle>
                <DialogDescription>
                  Set up a new batch report generation job for investors
                </DialogDescription>
              </DialogHeader>
              <CreateJobForm
                job={newJob}
                onJobChange={setNewJob}
              />
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateJob}>
                  Create Job
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs defaultValue="jobs" className="space-y-4">
        <TabsList>
          <TabsTrigger value="jobs" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Batch Jobs ({batchJobs.length})
          </TabsTrigger>
          <TabsTrigger value="details" className="flex items-center gap-2" disabled={!selectedJob}>
            <Eye className="w-4 h-4" />
            Job Details
            {selectedJob && (
              <Badge variant="secondary" className="ml-1">
                {selectedJob.title}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="jobs" className="space-y-4">
          {/* Active Jobs Summary */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-50 rounded-lg">
                    <PlayCircle className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">
                      {batchJobs.filter(j => j.status === 'running').length}
                    </p>
                    <p className="text-sm text-gray-600">Running Jobs</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-50 rounded-lg">
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">
                      {batchJobs.filter(j => j.status === 'completed').length}
                    </p>
                    <p className="text-sm text-gray-600">Completed Today</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-red-50 rounded-lg">
                    <AlertCircle className="w-5 h-5 text-red-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">
                      {batchJobs.filter(j => j.status === 'failed').length}
                    </p>
                    <p className="text-sm text-gray-600">Failed Jobs</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-50 rounded-lg">
                    <FileText className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">
                      {batchJobs.reduce((acc, job) => acc + job.success_count, 0)}
                    </p>
                    <p className="text-sm text-gray-600">Reports Generated</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Jobs Table */}
          <Card>
            <CardHeader>
              <CardTitle>Batch Jobs</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Job</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Period</TableHead>
                    <TableHead>Progress</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {batchJobs.map((job) => {
                    const jobConfig = JOB_TYPE_CONFIG[job.type];
                    const IconComponent = jobConfig.icon;
                    
                    return (
                      <TableRow 
                        key={job.id}
                        className={selectedJob?.id === job.id ? 'bg-blue-50' : ''}
                        onClick={() => setSelectedJob(job)}
                      >
                        <TableCell>
                          <div className="flex items-start gap-3">
                            <IconComponent className="w-4 h-4 mt-0.5" />
                            <div>
                              <div className="font-medium">{job.title}</div>
                              <div className="text-sm text-gray-500 mt-1">
                                {job.description}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {jobConfig.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {format(job.period_start, 'MMM yyyy')}
                            {job.period_start.getTime() !== job.period_end.getTime() && 
                              ` - ${format(job.period_end, 'MMM yyyy')}`
                            }
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-2 min-w-32">
                            <div className="flex justify-between text-sm">
                              <span>{job.processed_count} / {job.total_count}</span>
                              <span>{job.progress_percent}%</span>
                            </div>
                            <Progress value={job.progress_percent} className="w-full" />
                            {job.failed_count > 0 && (
                              <div className="text-xs text-red-600">
                                {job.failed_count} failed
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getStatusIcon(job.status)}
                            <Badge variant={getStatusBadgeVariant(job.status)}>
                              {job.status}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {job.status === 'running' ? (
                              <div>
                                <div>{formatDuration(job.elapsed_time)}</div>
                                <div className="text-gray-500">
                                  ETA: {formatDuration(job.estimated_duration)}
                                </div>
                              </div>
                            ) : job.elapsed_time ? (
                              formatDuration(job.elapsed_time)
                            ) : (
                              '—'
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-gray-600">
                          {format(job.created_at, 'MMM d, HH:mm')}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            {job.status === 'idle' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleJobAction(job.id, 'start');
                                }}
                              >
                                <PlayCircle className="w-3 h-3" />
                              </Button>
                            )}
                            {job.status === 'running' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleJobAction(job.id, 'pause');
                                }}
                              >
                                <PauseCircle className="w-3 h-3" />
                              </Button>
                            )}
                            {(job.status === 'paused' || job.status === 'failed') && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleJobAction(job.id, 'retry');
                                }}
                              >
                                <RefreshCw className="w-3 h-3" />
                              </Button>
                            )}
                            {job.status !== 'completed' && job.status !== 'cancelled' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleJobAction(job.id, 'cancel');
                                }}
                              >
                                <StopCircle className="w-3 h-3" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="details" className="space-y-4">
          {selectedJob && (
            <JobDetailsView
              job={selectedJob}
              items={getJobItemsForJob(selectedJob.id)}
              onRetryItem={(itemId) => {
                // Implement item retry logic
                console.log('Retry item:', itemId);
              }}
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Create Job Form Component
function CreateJobForm({ 
  job, 
  onJobChange 
}: {
  job: any;
  onJobChange: (job: any) => void;
}) {
  return (
    <div className="grid gap-6">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Report Type</label>
          <Select
            value={job.type}
            onValueChange={(value: BatchJobType) => onJobChange({ ...job, type: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(JOB_TYPE_CONFIG).map(([type, config]) => (
                <SelectItem key={type} value={type}>
                  {config.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Target Investors</label>
          <Select
            value={job.user_filter}
            onValueChange={(value: 'all' | 'active' | 'specific') => 
              onJobChange({ ...job, user_filter: value })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Investors</SelectItem>
              <SelectItem value="active">Active Investors Only</SelectItem>
              <SelectItem value="specific">Specific Investors</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Period Start</label>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full justify-start text-left font-normal">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {format(job.period_start, 'PPP')}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={job.period_start}
                onSelect={(date) => date && onJobChange({ ...job, period_start: date })}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Period End</label>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full justify-start text-left font-normal">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {format(job.period_end, 'PPP')}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={job.period_end}
                onSelect={(date) => date && onJobChange({ ...job, period_end: date })}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Job Title (Optional)</label>
        <input
          type="text"
          value={job.title}
          onChange={(e) => onJobChange({ ...job, title: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
          placeholder="Auto-generated if left empty"
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Description (Optional)</label>
        <textarea
          value={job.description}
          onChange={(e) => onJobChange({ ...job, description: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
          rows={3}
          placeholder="Optional job description"
        />
      </div>

      {/* Job Configuration Summary */}
      <Alert>
        <FileText className="h-4 w-4" />
        <AlertDescription>
          <strong>Estimated Impact:</strong> This job will generate approximately{' '}
          {job.user_filter === 'all' ? '245' : job.user_filter === 'active' ? '220' : '...'}{' '}
          reports for the period {format(job.period_start, 'MMM yyyy')} to{' '}
          {format(job.period_end, 'MMM yyyy')}. Estimated duration:{' '}
          {formatDuration(
            (job.user_filter === 'all' ? 245 : 220) * JOB_TYPE_CONFIG[job.type].estimatedTimePerItem
          )}.
        </AlertDescription>
      </Alert>
    </div>
  );
}

// Job Details View Component
function JobDetailsView({ 
  job, 
  items, 
  onRetryItem 
}: {
  job: BatchJob;
  items: BatchJobItem[];
  onRetryItem: (itemId: string) => void;
}) {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {getStatusIcon(job.status)}
            {job.title}
            <Badge variant={getStatusBadgeVariant(job.status)}>
              {job.status}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <div className="text-sm text-gray-600">Total Items</div>
              <div className="text-2xl font-bold">{job.total_count}</div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Completed</div>
              <div className="text-2xl font-bold text-green-600">{job.success_count}</div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Failed</div>
              <div className="text-2xl font-bold text-red-600">{job.failed_count}</div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Progress</div>
              <div className="text-2xl font-bold">{job.progress_percent}%</div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Overall Progress</span>
              <span>{job.processed_count} / {job.total_count}</span>
            </div>
            <Progress value={job.progress_percent} className="w-full" />
          </div>

          {job.error_message && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{job.error_message}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Individual Items ({items.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Investor</TableHead>
                <TableHead>Fund</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Document</TableHead>
                <TableHead>Processed</TableHead>
                <TableHead>Retries</TableHead>
                <TableHead>Error</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      {item.user_name}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{item.fund_code}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={
                      item.status === 'completed' ? 'default' :
                      item.status === 'failed' ? 'destructive' :
                      item.status === 'processing' ? 'secondary' : 'outline'
                    }>
                      {item.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {item.document_id ? (
                      <div className="flex items-center gap-2">
                        <FileText className="w-3 h-3" />
                        <span className="text-sm">{item.file_size && formatFileSize(item.file_size)}</span>
                      </div>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-gray-600">
                    {item.processed_at ? format(item.processed_at, 'MMM d, HH:mm') : '—'}
                  </TableCell>
                  <TableCell>
                    {item.retry_count > 0 ? (
                      <Badge variant="outline">{item.retry_count}</Badge>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {item.error_message ? (
                      <div className="text-sm text-red-600 max-w-48 truncate" title={item.error_message}>
                        {item.error_message}
                      </div>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      {item.document_id && (
                        <Button variant="ghost" size="sm">
                          <Download className="w-3 h-3" />
                        </Button>
                      )}
                      {item.status === 'failed' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onRetryItem(item.id)}
                        >
                          <RefreshCw className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function formatFileSize(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(1)} ${units[unitIndex]}`;
}
