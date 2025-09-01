// Safe stub implementations returning static mock data suitable for preview

export interface AdminKPIs {
  totalAUM: string;
  totalInvestors: number;
  last24hInterest: string;
  pendingWithdrawals: number;
}

export interface InvestorSummary {
  id: string;
  email: string;
  name?: string;
  totalPrincipal: string;
  totalEarned: string;
  lastActive?: string;
  status: 'active' | 'inactive' | 'pending';
}

export interface InvestorDetail extends InvestorSummary {
  kycStatus: 'approved' | 'pending' | 'rejected';
  positions: Array<{
    asset: string;
    principal: string;
    earned: string;
    apy: string;
  }>;
  transactions: Array<{
    id: string;
    type: 'deposit' | 'withdrawal' | 'interest';
    asset: string;
    amount: string;
    date: string;
    status: 'completed' | 'pending' | 'failed';
  }>;
}

export interface YieldSource {
  id: string;
  asset: string;
  name: string;
  provider: string;
  currentAPY: number;
  status: 'active' | 'inactive';
  targetYield?: number;
}

/**
 * Returns mock admin KPI data
 */
export async function getAdminKPIs(): Promise<AdminKPIs> {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 300));
  
  return {
    totalAUM: '$2,845,672.50',
    totalInvestors: 127,
    last24hInterest: '$4,892.33',
    pendingWithdrawals: 3
  };
}

/**
 * Returns mock investor list with optional search and pagination
 */
export async function listInvestors(options?: {
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<InvestorSummary[]> {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 400));

  const mockInvestors: InvestorSummary[] = [
    {
      id: 'inv-001',
      email: 'alice@example.com',
      name: 'Alice Johnson',
      totalPrincipal: '$125,000.00',
      totalEarned: '$8,420.50',
      lastActive: '2024-01-15',
      status: 'active'
    },
    {
      id: 'inv-002',
      email: 'bob@example.com',
      name: 'Bob Smith',
      totalPrincipal: '$75,500.00',
      totalEarned: '$4,320.75',
      lastActive: '2024-01-14',
      status: 'active'
    },
    {
      id: 'inv-003',
      email: 'carol@example.com',
      name: 'Carol Davis',
      totalPrincipal: '$200,000.00',
      totalEarned: '$14,890.25',
      lastActive: '2024-01-13',
      status: 'active'
    },
    {
      id: 'inv-004',
      email: 'david@example.com',
      name: 'David Wilson',
      totalPrincipal: '$45,250.00',
      totalEarned: '$2,180.80',
      lastActive: '2024-01-10',
      status: 'pending'
    },
    {
      id: 'inv-005',
      email: 'eve@example.com',
      name: 'Eve Martinez',
      totalPrincipal: '$310,000.00',
      totalEarned: '$21,450.90',
      lastActive: '2024-01-16',
      status: 'active'
    }
  ];

  let filtered = mockInvestors;

  // Apply search filter
  if (options?.search) {
    const searchTerm = options.search.toLowerCase();
    filtered = mockInvestors.filter(
      investor =>
        investor.email.toLowerCase().includes(searchTerm) ||
        investor.name?.toLowerCase().includes(searchTerm)
    );
  }

  // Apply pagination
  const limit = options?.limit || 10;
  const offset = options?.offset || 0;
  
  return filtered.slice(offset, offset + limit);
}

/**
 * Returns mock investor detail by ID
 */
export async function getInvestorById(id: string): Promise<InvestorDetail | null> {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 300));

  // Find base investor
  const investors = await listInvestors();
  const baseInvestor = investors.find(inv => inv.id === id);
  
  if (!baseInvestor) {
    return null;
  }

  // Return enhanced detail
  const detail: InvestorDetail = {
    ...baseInvestor,
    kycStatus: 'approved',
    positions: [
      {
        asset: 'USDC',
        principal: '$85,000.00',
        earned: '$5,420.30',
        apy: '7.2%'
      },
      {
        asset: 'BTC',
        principal: '$40,000.00',
        earned: '$3,000.20',
        apy: '8.5%'
      }
    ],
    transactions: [
      {
        id: 'tx-001',
        type: 'deposit',
        asset: 'USDC',
        amount: '$25,000.00',
        date: '2024-01-15',
        status: 'completed'
      },
      {
        id: 'tx-002',
        type: 'interest',
        asset: 'USDC',
        amount: '$142.50',
        date: '2024-01-14',
        status: 'completed'
      },
      {
        id: 'tx-003',
        type: 'deposit',
        asset: 'BTC',
        amount: '$15,000.00',
        date: '2024-01-12',
        status: 'completed'
      }
    ]
  };

  return detail;
}

/**
 * Returns mock yield sources
 */
export async function listYieldSources(): Promise<YieldSource[]> {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 200));

  return [
    {
      id: 'yield-btc-001',
      asset: 'BTC',
      name: 'Bitcoin Yield Strategy',
      provider: 'DeFi Protocol A',
      currentAPY: 8.5,
      status: 'active',
      targetYield: 8.5
    },
    {
      id: 'yield-eth-001',
      asset: 'ETH',
      name: 'Ethereum Staking',
      provider: 'Ethereum 2.0',
      currentAPY: 5.2,
      status: 'active',
      targetYield: 5.5
    },
    {
      id: 'yield-usdc-001',
      asset: 'USDC',
      name: 'USDC Lending',
      provider: 'Lending Protocol B',
      currentAPY: 7.2,
      status: 'active',
      targetYield: 7.0
    },
    {
      id: 'yield-sol-001',
      asset: 'SOL',
      name: 'Solana Staking',
      provider: 'Solana Network',
      currentAPY: 6.8,
      status: 'active',
      targetYield: 7.0
    },
    {
      id: 'yield-usdt-001',
      asset: 'USDT',
      name: 'USDT Yield Farm',
      provider: 'DeFi Protocol C',
      currentAPY: 6.5,
      status: 'inactive',
      targetYield: 6.5
    },
    {
      id: 'yield-eurc-001',
      asset: 'EURC',
      name: 'Euro Coin Yield',
      provider: 'European DeFi',
      currentAPY: 4.8,
      status: 'active',
      targetYield: 5.0
    }
  ];
}

/**
 * Mock update yield source function
 */
export async function updateYieldSource(id: string, updates: Partial<YieldSource>): Promise<{ success: boolean }> {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 500));

  console.log(`Mock: Updated yield source ${id} with:`, updates);
  
  return { success: true };
}
