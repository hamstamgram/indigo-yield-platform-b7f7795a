// scripts/audit/fund-configs.mjs

export const FUND_CONFIGS = [
  {
    sheet: 'BTC Yield Fund',
    label: 'TEST BTC Yield Fund',
    fundId: '00746a0e-6054-4474-981c-0853d5d4f9b7',
    investmentsCurrency: 'BTC',
    namePrefix: 'TEST ',
    nameOverrides: {
      'Kabbaj': 'TEST Family Kabbaj',
      'Blondish': 'TEST Blondish Music',
      'INDIGO Fees': 'Indigo Fees',
    },
  },
  {
    sheet: 'BTC Yield Fund',
    label: 'Bitcoin Yield Fund (Production)',
    fundId: '0a048d9b-c4cf-46eb-b428-59e10307df93',
    investmentsCurrency: 'BTC',
    namePrefix: '',
    nameOverrides: {
      'Kabbaj': 'Family Kabbaj',
      'Blondish': 'Blondish Music',
      'INDIGO Fees': 'Indigo Fees',
    },
  },
  {
    sheet: 'ETH Yield Fund',
    label: 'Ethereum Yield Fund',
    fundId: '717614a2-9e24-4abc-a89d-02209a3a772a',
    investmentsCurrency: 'ETH',
    namePrefix: '',
    nameOverrides: {
      'INDIGO Fees': 'Indigo Fees',
      'INDIGO DIGITAL ASSET FUND LP': 'Indigo Digital Asset Fund LP',
    },
  },
  {
    sheet: 'USDT Yield Fund',
    label: 'Stablecoin Fund',
    fundId: '8ef9dc49-e76c-4882-84ab-a449ef4326db',
    investmentsCurrency: 'USDT',
    namePrefix: '',
    nameOverrides: {
      'INDIGO Fees': 'Indigo Fees',
      'INDIGO DIGITAL ASSET FUND LP': 'Indigo Digital Asset Fund LP',
      'INDIGO Ventures': 'Indigo Ventures',
    },
  },
  {
    sheet: 'SOL Yield Fund',
    label: 'Solana Yield Fund',
    fundId: '7574bc81-aab3-4175-9e7f-803aa6f9eb8f',
    investmentsCurrency: 'SOL',
    namePrefix: '',
    nameOverrides: {
      'INDIGO Fees': 'Indigo Fees',
      'INDIGO DIGITAL ASSET FUND LP': 'Indigo Digital Asset Fund LP',
    },
  },
  {
    sheet: 'XRP Yield Fund',
    label: 'Ripple Yield Fund',
    fundId: '2c123c4f-76b4-4504-867e-059649855417',
    investmentsCurrency: 'XRP',
    namePrefix: '',
    nameOverrides: {
      'INDIGO Fees': 'Indigo Fees',
    },
  },
];
