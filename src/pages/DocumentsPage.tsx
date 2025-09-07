/**
 * Documents Page - LP View
 * Secure document vault for investors
 */

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
  Document, 
  DocumentType, 
  DocumentFilter,
  DOCUMENT_TYPE_CONFIG,
  formatFileSize 
} from '@/lib/documents/types';
import { format } from 'date-fns';
import { 
  Search, 
  Download, 
  FileText, 
  Filter,
  Calendar,
  Eye,
  Bell,
  ScrollText,
  Receipt,
  FileSignature,
  BarChart3,
  Award,
  File as FileIcon,
  LoaderIcon
} from 'lucide-react';

// Sample data for demonstration
const sampleDocuments: Document[] = [
  {
    id: 'doc_001',
    user_id: 'user_123',
    fund_id: 'fund_001',
    type: 'statement',
    title: 'January 2024 Account Statement',
    description: 'Monthly account statement showing portfolio performance and transactions',
    storage_path: 'documents/user_123/2024/01/statement/doc_001',
    filename: 'statement_jan_2024_doc_001.pdf',
    file_size: 256000,
    mime_type: 'application/pdf',
    period_start: new Date('2024-01-01'),
    period_end: new Date('2024-01-31'),
    status: 'ready',
    created_at: new Date('2024-02-01'),
    created_by: 'system',
    checksum: 'abc123def456',
    metadata: {
      confidentiality: 'confidential',
      category: 'monthly',
    },
  },
  {
    id: 'doc_002',
    user_id: 'user_123',
    fund_id: 'fund_001',
    type: 'tax',
    title: '2023 Tax Documents',
    description: 'Year-end tax forms and supporting documentation',
    storage_path: 'documents/user_123/2024/01/tax/doc_002',
    filename: 'tax_2023_doc_002.pdf',
    file_size: 1024000,
    mime_type: 'application/pdf',
    tax_year: 2023,
    status: 'ready',
    created_at: new Date('2024-01-15'),
    created_by: 'admin_456',
    checksum: 'def456ghi789',
    metadata: {
      confidentiality: 'restricted',
    },
  },
  {
    id: 'doc_003',
    fund_id: 'fund_001',
    type: 'notice',
    title: 'Fund Performance Update - Q4 2023',
    description: 'Quarterly performance review and market outlook',
    storage_path: 'documents/fund/2024/01/notice/doc_003',
    filename: 'fund_notice_q4_2023_doc_003.pdf',
    file_size: 512000,
    mime_type: 'application/pdf',
    status: 'ready',
    created_at: new Date('2024-01-10'),
    created_by: 'admin_456',
    checksum: 'ghi789jkl012',
    metadata: {
      confidentiality: 'public',
      category: 'quarterly',
    },
  },
];

// Icon mapping for document types
const typeIcons: Record<DocumentType, React.ComponentType<any>> = {
  statement: FileText,
  notice: Bell,
  terms: ScrollText,
  tax: Receipt,
  agreement: FileSignature,
  report: BarChart3,
  certificate: Award,
  other: FileIcon,
};

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>(sampleDocuments);
  const [filteredDocuments, setFilteredDocuments] = useState<Document[]>(sampleDocuments);
  const [filter, setFilter] = useState<DocumentFilter>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [downloadingDoc, setDownloadingDoc] = useState<string | null>(null);

  // Filter documents based on current filters and search
  useEffect(() => {
    let filtered = [...documents];

    // Apply type filter
    if (filter.type && filter.type.length > 0) {
      filtered = filtered.filter(doc => filter.type!.includes(doc.type));
    }

    // Apply status filter
    if (filter.status && filter.status.length > 0) {
      filtered = filtered.filter(doc => filter.status!.includes(doc.status));
    }

    // Apply search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(doc => 
        doc.title.toLowerCase().includes(query) ||
        doc.description?.toLowerCase().includes(query) ||
        doc.type.toLowerCase().includes(query)
      );
    }

    // Sort by creation date (newest first)
    filtered.sort((a, b) => b.created_at.getTime() - a.created_at.getTime());

    setFilteredDocuments(filtered);
  }, [documents, filter, searchQuery]);

  const handleDownload = async (document: Document) => {
    setDownloadingDoc(document.id);
    
    try {
      // Simulate API call to get signed URL
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // In a real implementation, this would call the backend Edge Function
      // const response = await fetch(`/api/documents/${document.id}/download`);
      // const data = await response.json();
      // window.open(data.signed_url, '_blank');
      
      console.log(`Downloading document: ${document.title}`);
      // For demo purposes, we'll just show success
      
    } catch (error) {
      console.error('Download failed:', error);
    } finally {
      setDownloadingDoc(null);
    }
  };

  const handlePreview = (document: Document) => {
    if (document.mime_type === 'application/pdf') {
      // In a real implementation, this would open a PDF viewer modal
      console.log(`Previewing document: ${document.title}`);
    }
  };

  const getStatusBadgeVariant = (status: Document['status']) => {
    switch (status) {
      case 'ready': return 'default';
      case 'processing': return 'secondary';
      case 'pending': return 'secondary';
      case 'error': return 'destructive';
      case 'expired': return 'outline';
      default: return 'secondary';
    }
  };

  const getTypeIcon = (type: DocumentType) => {
    const IconComponent = typeIcons[type];
    return <IconComponent className="w-4 h-4" />;
  };

  const myDocuments = filteredDocuments.filter(doc => doc.user_id);
  const fundDocuments = filteredDocuments.filter(doc => !doc.user_id);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Documents</h1>
          <p className="text-gray-600 mt-2">
            Access your account statements, tax documents, and fund information
          </p>
        </div>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Search & Filter
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search documents..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select
              value={filter.type?.[0] || 'all'}
              onValueChange={(value) => 
                setFilter(prev => ({
                  ...prev, 
                  type: value === 'all' ? undefined : [value as DocumentType]
                }))
              }
            >
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Document Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {Object.entries(DOCUMENT_TYPE_CONFIG).map(([type, config]) => (
                  <SelectItem key={type} value={type}>
                    {config.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={filter.status?.[0] || 'all'}
              onValueChange={(value) => 
                setFilter(prev => ({
                  ...prev, 
                  status: value === 'all' ? undefined : [value as any]
                }))
              }
            >
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="ready">Ready</SelectItem>
                <SelectItem value="processing">Processing</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="my-documents" className="space-y-4">
        <TabsList>
          <TabsTrigger value="my-documents" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            My Documents ({myDocuments.length})
          </TabsTrigger>
          <TabsTrigger value="fund-documents" className="flex items-center gap-2">
            <Bell className="w-4 h-4" />
            Fund Documents ({fundDocuments.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="my-documents" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Personal Account Documents</CardTitle>
            </CardHeader>
            <CardContent>
              {myDocuments.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No documents found</h3>
                  <p className="text-gray-600">
                    {searchQuery || filter.type || filter.status 
                      ? 'Try adjusting your search or filters' 
                      : 'Your personal documents will appear here'
                    }
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Document</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Period</TableHead>
                      <TableHead>Size</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {myDocuments.map((document) => (
                      <TableRow key={document.id}>
                        <TableCell>
                          <div className="flex items-start gap-3">
                            {getTypeIcon(document.type)}
                            <div>
                              <div className="font-medium">{document.title}</div>
                              {document.description && (
                                <div className="text-sm text-gray-500 mt-1">
                                  {document.description}
                                </div>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {DOCUMENT_TYPE_CONFIG[document.type].label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {document.period_start && document.period_end ? (
                            <div className="flex items-center gap-1 text-sm">
                              <Calendar className="w-3 h-3" />
                              {format(document.period_start, 'MMM yyyy')} - {format(document.period_end, 'MMM yyyy')}
                            </div>
                          ) : document.tax_year ? (
                            <div className="flex items-center gap-1 text-sm">
                              <Calendar className="w-3 h-3" />
                              Tax Year {document.tax_year}
                            </div>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm">
                          {formatFileSize(document.file_size)}
                        </TableCell>
                        <TableCell>
                          <Badge variant={getStatusBadgeVariant(document.status)}>
                            {document.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-gray-600">
                          {format(document.created_at, 'MMM d, yyyy')}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            {document.mime_type === 'application/pdf' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handlePreview(document)}
                                className="flex items-center gap-1"
                              >
                                <Eye className="w-3 h-3" />
                                Preview
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDownload(document)}
                              disabled={downloadingDoc === document.id || document.status !== 'ready'}
                              className="flex items-center gap-1"
                            >
                              {downloadingDoc === document.id ? (
                                <LoaderIcon className="w-3 h-3 animate-spin" />
                              ) : (
                                <Download className="w-3 h-3" />
                              )}
                              Download
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="fund-documents" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Fund-Wide Documents</CardTitle>
            </CardHeader>
            <CardContent>
              {fundDocuments.length === 0 ? (
                <div className="text-center py-8">
                  <Bell className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No fund documents found</h3>
                  <p className="text-gray-600">
                    {searchQuery || filter.type || filter.status 
                      ? 'Try adjusting your search or filters' 
                      : 'Fund-wide documents will appear here'
                    }
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Document</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Period</TableHead>
                      <TableHead>Size</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {fundDocuments.map((document) => (
                      <TableRow key={document.id}>
                        <TableCell>
                          <div className="flex items-start gap-3">
                            {getTypeIcon(document.type)}
                            <div>
                              <div className="font-medium">{document.title}</div>
                              {document.description && (
                                <div className="text-sm text-gray-500 mt-1">
                                  {document.description}
                                </div>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {DOCUMENT_TYPE_CONFIG[document.type].label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {document.period_start && document.period_end ? (
                            <div className="flex items-center gap-1 text-sm">
                              <Calendar className="w-3 h-3" />
                              {format(document.period_start, 'MMM yyyy')} - {format(document.period_end, 'MMM yyyy')}
                            </div>
                          ) : document.tax_year ? (
                            <div className="flex items-center gap-1 text-sm">
                              <Calendar className="w-3 h-3" />
                              Tax Year {document.tax_year}
                            </div>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm">
                          {formatFileSize(document.file_size)}
                        </TableCell>
                        <TableCell>
                          <Badge variant={getStatusBadgeVariant(document.status)}>
                            {document.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-gray-600">
                          {format(document.created_at, 'MMM d, yyyy')}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            {document.mime_type === 'application/pdf' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handlePreview(document)}
                                className="flex items-center gap-1"
                              >
                                <Eye className="w-3 h-3" />
                                Preview
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDownload(document)}
                              disabled={downloadingDoc === document.id || document.status !== 'ready'}
                              className="flex items-center gap-1"
                            >
                              {downloadingDoc === document.id ? (
                                <LoaderIcon className="w-3 h-3 animate-spin" />
                              ) : (
                                <Download className="w-3 h-3" />
                              )}
                              Download
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {Object.entries(DOCUMENT_TYPE_CONFIG).slice(0, 4).map(([type, config]) => {
          const count = documents.filter(doc => doc.type === type).length;
          const IconComponent = typeIcons[type as DocumentType];
          
          return (
            <Card key={type}>
              <CardContent className="flex items-center p-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-50 rounded-lg">
                    <IconComponent className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{count}</p>
                    <p className="text-sm text-gray-600">{config.label}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
