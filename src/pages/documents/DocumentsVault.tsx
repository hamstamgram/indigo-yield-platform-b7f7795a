import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { FileText, Filter } from 'lucide-react';
import DocumentRow, { type Document } from '@/components/documents/DocumentRow';
import { listDocuments, getSignedUrl } from '@/server/documents';

export default function DocumentsVault() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [filteredDocuments, setFilteredDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<string>('all');

  useEffect(() => {
    loadDocuments();
  }, []);

  useEffect(() => {
    filterDocuments();
  }, [documents, typeFilter]);

  const loadDocuments = async () => {
    try {
      setLoading(true);
      const docs = await listDocuments();
      setDocuments(docs);
    } catch (error) {
      console.error('Failed to load documents:', error);
      toast.error('Failed to load documents');
    } finally {
      setLoading(false);
    }
  };

  const filterDocuments = () => {
    if (typeFilter === 'all') {
      setFilteredDocuments(documents);
    } else {
      setFilteredDocuments(documents.filter(doc => doc.type === typeFilter));
    }
  };

  const handleDownload = async (document: Document): Promise<string> => {
    try {
      const signedUrl = await getSignedUrl(document.id);
      toast.success('Download started');
      return signedUrl;
    } catch (error) {
      console.error('Failed to get download link:', error);
      toast.error('Failed to download document');
      throw error;
    }
  };

  const getDocumentTypeLabel = (type: string) => {
    switch (type) {
      case 'statement': return 'Statements';
      case 'legal': return 'Legal Documents';
      case 'notice': return 'Notices';
      case 'other': return 'Other';
      default: return 'All Documents';
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="max-w-4xl mx-auto">
          <div className="h-8 w-48 bg-gray-200 rounded mb-6 animate-pulse"></div>
          <Card>
            <CardContent className="p-6 space-y-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="border rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <div className="h-8 w-8 bg-gray-200 rounded animate-pulse"></div>
                    <div className="flex-1 space-y-2">
                      <div className="h-4 w-3/4 bg-gray-200 rounded animate-pulse"></div>
                      <div className="h-3 w-1/2 bg-gray-100 rounded animate-pulse"></div>
                    </div>
                    <div className="h-8 w-24 bg-gray-200 rounded animate-pulse"></div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-gray-900 mb-2">Document Vault</h1>
          <p className="text-gray-600">Access your statements and other important files</p>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center space-x-2">
                <FileText className="h-5 w-5" />
                <span>Your Documents</span>
              </CardTitle>
              
              {/* Filter */}
              <div className="flex items-center space-x-2">
                <Filter className="h-4 w-4 text-gray-500" />
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Filter by type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Documents</SelectItem>
                    <SelectItem value="statement">Statements</SelectItem>
                    <SelectItem value="legal">Legal Documents</SelectItem>
                    <SelectItem value="notice">Notices</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {filteredDocuments.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {typeFilter === 'all' ? 'No documents available' : `No ${getDocumentTypeLabel(typeFilter).toLowerCase()}`}
                </h3>
                <p className="text-gray-600">
                  {typeFilter === 'all' 
                    ? 'Documents will appear here as they become available'
                    : 'Try selecting a different document type'
                  }
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredDocuments.map(document => (
                  <DocumentRow
                    key={document.id}
                    document={document}
                    onDownload={handleDownload}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Info Box */}
        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <h3 className="text-sm font-medium text-blue-800 mb-2">Document Access</h3>
          <ul className="text-xs text-blue-700 space-y-1">
            <li>• Monthly statements are available within 5 business days of month-end</li>
            <li>• All downloads use secure, time-limited links for your protection</li>
            <li>• Contact support if you're missing any expected documents</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
