export interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  required: boolean;
  order: number;
}

export interface AvailableAsset {
  symbol: string;
  name: string;
  current_apy: number;
  min_investment: number;
  description: string;
  risk_level: 'low' | 'medium' | 'high';
  category: 'crypto' | 'stablecoin' | 'defi';
}

export interface OnboardingProfile {
  investor_id: string;
  current_step: number;
  profile_completed: boolean;
  documents_acknowledged: boolean;
  assets_selected: string[];
  risk_assessment_completed: boolean;
}

const mockSteps: OnboardingStep[] = [
  {
    id: 'profile-review',
    title: 'Profile Review',
    description: 'Review and confirm your personal information',
    completed: false,
    required: true,
    order: 1,
  },
  {
    id: 'risk-assessment',
    title: 'Risk Assessment',
    description: 'Complete investment risk questionnaire',
    completed: false,
    required: true,
    order: 2,
  },
  {
    id: 'document-acknowledgement',
    title: 'Document Acknowledgement',
    description: 'Read and acknowledge key documents',
    completed: false,
    required: true,
    order: 3,
  },
  {
    id: 'asset-selection',
    title: 'Asset Selection',
    description: 'Choose your initial yield assets',
    completed: false,
    required: true,
    order: 4,
  },
  {
    id: 'final-confirmation',
    title: 'Final Confirmation',
    description: 'Review and confirm your setup',
    completed: false,
    required: true,
    order: 5,
  },
];

const mockAssets: AvailableAsset[] = [
  {
    symbol: 'BTC',
    name: 'Bitcoin',
    current_apy: 4.2,
    min_investment: 1000,
    description: 'The original cryptocurrency with proven track record',
    risk_level: 'medium',
    category: 'crypto',
  },
  {
    symbol: 'ETH',
    name: 'Ethereum',
    current_apy: 5.1,
    min_investment: 500,
    description: 'Leading smart contract platform with staking rewards',
    risk_level: 'medium',
    category: 'crypto',
  },
  {
    symbol: 'SOL',
    name: 'Solana',
    current_apy: 6.8,
    min_investment: 250,
    description: 'High-performance blockchain with growing ecosystem',
    risk_level: 'high',
    category: 'crypto',
  },
  {
    symbol: 'USDT',
    name: 'Tether USD',
    current_apy: 8.5,
    min_investment: 100,
    description: 'USD-pegged stablecoin for stable returns',
    risk_level: 'low',
    category: 'stablecoin',
  },
  {
    symbol: 'USDC',
    name: 'USD Coin',
    current_apy: 8.2,
    min_investment: 100,
    description: 'Regulated USD stablecoin with institutional backing',
    risk_level: 'low',
    category: 'stablecoin',
  },
  {
    symbol: 'EURC',
    name: 'Euro Coin',
    current_apy: 7.8,
    min_investment: 100,
    description: 'EUR-pegged stablecoin for European investors',
    risk_level: 'low',
    category: 'stablecoin',
  },
];

// API endpoints (would be replaced with real backend calls)
const API_BASE = '/api/onboarding';

export async function getSteps(): Promise<OnboardingStep[]> {
  // Simulate API call
  await new Promise(resolve => setTimeout(resolve, 300));
  
  if (import.meta.env.VITE_USE_MOCK_DATA !== 'false') {
    return mockSteps;
  }

  try {
    const response = await fetch(`${API_BASE}/steps`);
    if (!response.ok) throw new Error('Failed to fetch steps');
    return await response.json();
  } catch (error) {
    console.warn('Using mock data for onboarding steps:', error);
    return mockSteps;
  }
}

export async function completeStep(stepId: string): Promise<{ success: boolean; nextStep?: string }> {
  // Simulate API call
  await new Promise(resolve => setTimeout(resolve, 500));
  
  if (import.meta.env.VITE_USE_MOCK_DATA !== 'false') {
    // Mock successful completion
    return { 
      success: true, 
      nextStep: mockSteps.find(s => s.order > mockSteps.find(s => s.id === stepId)?.order!)?.id 
    };
  }

  try {
    const response = await fetch(`${API_BASE}/steps/${stepId}/complete`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    if (!response.ok) throw new Error('Failed to complete step');
    return await response.json();
  } catch (error) {
    console.warn('Using mock data for step completion:', error);
    return { success: true };
  }
}

export async function getAvailableAssets(): Promise<AvailableAsset[]> {
  // Simulate API call
  await new Promise(resolve => setTimeout(resolve, 200));
  
  if (import.meta.env.VITE_USE_MOCK_DATA !== 'false') {
    return mockAssets;
  }

  try {
    const response = await fetch(`${API_BASE}/assets`);
    if (!response.ok) throw new Error('Failed to fetch assets');
    return await response.json();
  } catch (error) {
    console.warn('Using mock data for available assets:', error);
    return mockAssets;
  }
}

export async function getOnboardingProfile(): Promise<OnboardingProfile | null> {
  // Simulate API call
  await new Promise(resolve => setTimeout(resolve, 250));
  
  if (import.meta.env.VITE_USE_MOCK_DATA !== 'false') {
    return {
      investor_id: 'mock-investor-123',
      current_step: 1,
      profile_completed: false,
      documents_acknowledged: false,
      assets_selected: [],
      risk_assessment_completed: false,
    };
  }

  try {
    const response = await fetch(`${API_BASE}/profile`);
    if (!response.ok) throw new Error('Failed to fetch profile');
    return await response.json();
  } catch (error) {
    console.warn('Using mock data for onboarding profile:', error);
    return null;
  }
}

export async function updateAssetSelection(assetSymbols: string[]): Promise<{ success: boolean }> {
  // Simulate API call
  await new Promise(resolve => setTimeout(resolve, 400));
  
  if (import.meta.env.VITE_USE_MOCK_DATA !== 'false') {
    return { success: true };
  }

  try {
    const response = await fetch(`${API_BASE}/assets/select`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ assets: assetSymbols }),
    });
    if (!response.ok) throw new Error('Failed to update asset selection');
    return await response.json();
  } catch (error) {
    console.warn('Using mock data for asset selection:', error);
    return { success: true };
  }
}
