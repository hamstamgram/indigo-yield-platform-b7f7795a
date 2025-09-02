export interface DocumentFilter {
  type?: 'statement' | 'tax' | 'legal' | 'notice' | 'other';
  date_from?: string;
  date_to?: string;
}

export interface Document {
  id: string;
  name: string;
  type: 'statement' | 'tax' | 'legal' | 'notice' | 'other';
  size: number;
  created_at: string;
  investor_id?: string;
  is_public: boolean;
  metadata?: Record<string, any>;
}

const mockDocuments: Document[] = [
  {
    id: 'doc-001',
    name: 'August 2024 Monthly Statement.pdf',
    type: 'statement',
    size: 245760,
    created_at: '2024-09-01T00:00:00Z',
    investor_id: 'user-123',
    is_public: false,
    metadata: { month: '2024-08', total_balance: 25750.85 },
  },
  {
    id: 'doc-002', 
    name: '2024 Tax Information Summary.pdf',
    type: 'tax',
    size: 156430,
    created_at: '2024-08-15T00:00:00Z',
    investor_id: 'user-123',
    is_public: false,
  },
  {
    id: 'doc-003',
    name: 'Platform Terms Update.pdf',
    type: 'legal',
    size: 89750,
    created_at: '2024-08-01T00:00:00Z',
    is_public: true,
  },
];

export async function listDocuments(filter?: DocumentFilter): Promise<Document[]> {
  await new Promise(resolve => setTimeout(resolve, 300));
  
  if (import.meta.env.VITE_USE_MOCK_DATA !== 'false') {
    let filtered = [...mockDocuments];
    if (filter?.type) filtered = filtered.filter(d => d.type === filter.type);
    return filtered;
  }

  try {
    const params = new URLSearchParams();
    if (filter?.type) params.append('type', filter.type);
    if (filter?.date_from) params.append('date_from', filter.date_from);
    if (filter?.date_to) params.append('date_to', filter.date_to);

    const response = await fetch(`/api/documents?${params}`, { credentials: 'include' });
    if (!response.ok) throw new Error('Failed to fetch documents');
    return await response.json();
  } catch (error) {
    console.warn('Using mock documents:', error);
    return mockDocuments;
  }
}

export async function getSignedUrl(docId: string): Promise<string> {
  await new Promise(resolve => setTimeout(resolve, 200));
  
  if (import.meta.env.VITE_USE_MOCK_DATA !== 'false') {
    return `https://example.com/signed/${docId}?expires=${Date.now() + 3600000}`;
  }

  try {
    const response = await fetch(`/api/documents/${docId}/signed-url`, { credentials: 'include' });
    if (!response.ok) throw new Error('Failed to get signed URL');
    const result = await response.json();
    return result.signed_url;
  } catch (error) {
    console.warn('Using mock signed URL:', error);
    return `https://example.com/signed/${docId}?expires=${Date.now() + 3600000}`;
  }
}
