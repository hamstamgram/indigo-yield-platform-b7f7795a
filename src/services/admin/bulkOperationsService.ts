// Minimal stubs to avoid runtime/type errors; bulk import/export not implemented yet.
export type ImportResult = { success: boolean; message: string };

export const exportInvestorPositions = async (): Promise<ImportResult> => {
  return { success: false, message: "Bulk export not supported in this build." };
};

export const importPositionsFromCSV = async (_file: File): Promise<ImportResult> => {
  return { success: false, message: "Bulk import not supported in this build." };
};

export const generateSampleCSV = async (): Promise<string> => {
  return "investor_id,fund_id,shares,current_value,cost_basis";
};
