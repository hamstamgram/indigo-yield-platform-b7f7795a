export interface SupportTicket {
  id: string;
  subject: string;
  description: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  status: 'open' | 'pending' | 'in_progress' | 'resolved' | 'closed';
  category: 'account' | 'transactions' | 'statements' | 'technical' | 'general' | 'other';
  user_id: string;
  assigned_to?: string;
  created_at: string;
  updated_at: string;
  resolved_at?: string;
  user_email?: string;
  user_name?: string;
}

export interface CreateTicketPayload {
  subject: string;
  description: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  category?: string;
}

export interface TicketAction {
  action: 'assign' | 'resolve' | 'close' | 'reopen';
  assigned_to?: string;
  note?: string;
}

const mockTickets: SupportTicket[] = [
  {
    id: 'ticket-001',
    subject: 'Issue with withdrawal processing',
    description: 'My withdrawal has been pending for 3 days. Can someone help?',
    priority: 'high',
    status: 'open',
    category: 'transactions',
    user_id: 'user-123',
    user_email: 'investor@example.com',
    user_name: 'John Doe',
    created_at: '2024-09-01T10:00:00Z',
    updated_at: '2024-09-01T10:00:00Z',
  },
  {
    id: 'ticket-002',
    subject: 'Question about monthly statement',
    description: 'I cannot find my August statement in the documents section.',
    priority: 'normal',
    status: 'in_progress',
    category: 'statements',
    user_id: 'user-456',
    user_email: 'jane@example.com',
    user_name: 'Jane Smith',
    assigned_to: 'admin-001',
    created_at: '2024-08-28T14:30:00Z',
    updated_at: '2024-09-01T09:15:00Z',
  },
  {
    id: 'ticket-003',
    subject: 'Account verification status',
    description: 'My account shows pending verification. What documents do I need to provide?',
    priority: 'normal',
    status: 'resolved',
    category: 'account',
    user_id: 'user-789',
    user_email: 'investor3@example.com',
    user_name: 'Mike Johnson',
    assigned_to: 'admin-002',
    created_at: '2024-08-25T16:45:00Z',
    updated_at: '2024-08-26T11:20:00Z',
    resolved_at: '2024-08-26T11:20:00Z',
  },
];

// API endpoints
const API_BASE = '/api/support';

export async function createTicket(payload: CreateTicketPayload): Promise<{ success: boolean; ticketId?: string }> {
  // Simulate API call
  await new Promise(resolve => setTimeout(resolve, 500));
  
  if (import.meta.env.VITE_USE_MOCK_DATA !== 'false') {
    const ticketId = 'ticket-' + Date.now();
    return { success: true, ticketId };
  }

  try {
    const response = await fetch(`${API_BASE}/tickets`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(payload),
    });
    if (!response.ok) throw new Error('Failed to create ticket');
    const result = await response.json();
    return { success: true, ticketId: result.id };
  } catch (error) {
    console.warn('Using mock data for ticket creation:', error);
    return { success: true, ticketId: 'mock-' + Date.now() };
  }
}

export async function listOwnTickets(): Promise<SupportTicket[]> {
  // Simulate API call
  await new Promise(resolve => setTimeout(resolve, 300));
  
  if (import.meta.env.VITE_USE_MOCK_DATA !== 'false') {
    // Return tickets for current user only
    return mockTickets.filter(ticket => ticket.user_id === 'user-123');
  }

  try {
    const response = await fetch(`${API_BASE}/tickets/own`, {
      credentials: 'include',
    });
    if (!response.ok) throw new Error('Failed to fetch own tickets');
    return await response.json();
  } catch (error) {
    console.warn('Using mock data for own tickets:', error);
    return mockTickets.filter(ticket => ticket.user_id === 'user-123');
  }
}

export async function listTickets(filters?: {
  status?: string;
  priority?: string;
  category?: string;
  assigned_to?: string;
  limit?: number;
  offset?: number;
}): Promise<{ tickets: SupportTicket[]; total: number }> {
  // Simulate API call
  await new Promise(resolve => setTimeout(resolve, 400));
  
  if (import.meta.env.VITE_USE_MOCK_DATA !== 'false') {
    let filteredTickets = [...mockTickets];
    
    if (filters?.status) {
      filteredTickets = filteredTickets.filter(t => t.status === filters.status);
    }
    if (filters?.priority) {
      filteredTickets = filteredTickets.filter(t => t.priority === filters.priority);
    }
    if (filters?.category) {
      filteredTickets = filteredTickets.filter(t => t.category === filters.category);
    }
    if (filters?.assigned_to) {
      filteredTickets = filteredTickets.filter(t => t.assigned_to === filters.assigned_to);
    }
    
    const offset = filters?.offset || 0;
    const limit = filters?.limit || 50;
    const paginatedTickets = filteredTickets.slice(offset, offset + limit);
    
    return {
      tickets: paginatedTickets,
      total: filteredTickets.length,
    };
  }

  try {
    const queryParams = new URLSearchParams();
    if (filters?.status) queryParams.append('status', filters.status);
    if (filters?.priority) queryParams.append('priority', filters.priority);
    if (filters?.category) queryParams.append('category', filters.category);
    if (filters?.assigned_to) queryParams.append('assigned_to', filters.assigned_to);
    if (filters?.limit) queryParams.append('limit', filters.limit.toString());
    if (filters?.offset) queryParams.append('offset', filters.offset.toString());

    const response = await fetch(`${API_BASE}/tickets?${queryParams}`, {
      credentials: 'include',
    });
    if (!response.ok) throw new Error('Failed to fetch tickets');
    return await response.json();
  } catch (error) {
    console.warn('Using mock data for tickets list:', error);
    return {
      tickets: mockTickets,
      total: mockTickets.length,
    };
  }
}

export async function actOnTicket(ticketId: string, action: TicketAction): Promise<{ success: boolean; ticket?: SupportTicket }> {
  // Simulate API call
  await new Promise(resolve => setTimeout(resolve, 600));
  
  if (import.meta.env.VITE_USE_MOCK_DATA !== 'false') {
    const ticket = mockTickets.find(t => t.id === ticketId);
    if (!ticket) {
      return { success: false };
    }

    // Mock status update
    let updatedTicket = { ...ticket };
    switch (action.action) {
      case 'assign':
        updatedTicket.assigned_to = action.assigned_to;
        updatedTicket.status = 'in_progress';
        break;
      case 'resolve':
        updatedTicket.status = 'resolved';
        updatedTicket.resolved_at = new Date().toISOString();
        break;
      case 'close':
        updatedTicket.status = 'closed';
        break;
      case 'reopen':
        updatedTicket.status = 'open';
        updatedTicket.resolved_at = undefined;
        break;
    }
    updatedTicket.updated_at = new Date().toISOString();
    
    return { success: true, ticket: updatedTicket };
  }

  try {
    const response = await fetch(`${API_BASE}/tickets/${ticketId}/action`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(action),
    });
    if (!response.ok) throw new Error('Failed to act on ticket');
    const result = await response.json();
    return { success: true, ticket: result };
  } catch (error) {
    console.warn('Using mock data for ticket action:', error);
    return { success: true };
  }
}

export async function getTicketDetails(ticketId: string): Promise<SupportTicket | null> {
  // Simulate API call
  await new Promise(resolve => setTimeout(resolve, 250));
  
  if (import.meta.env.VITE_USE_MOCK_DATA !== 'false') {
    return mockTickets.find(t => t.id === ticketId) || null;
  }

  try {
    const response = await fetch(`${API_BASE}/tickets/${ticketId}`, {
      credentials: 'include',
    });
    if (!response.ok) throw new Error('Failed to fetch ticket details');
    return await response.json();
  } catch (error) {
    console.warn('Using mock data for ticket details:', error);
    return mockTickets.find(t => t.id === ticketId) || null;
  }
}
