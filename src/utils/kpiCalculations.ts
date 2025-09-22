// KPI Calculations - Temporarily simplified
export const calculateTotalAUM = () => Promise.resolve(0);
export const calculateDailyInterest = () => Promise.resolve(0);
export const calculateInvestorCount = () => Promise.resolve(0);
export const calculateAllKPIs = () => Promise.resolve({});
export const formatAssetValue = (value: number) => value.toString();
export interface AssetKPI { id: number; symbol: string; value: number; }