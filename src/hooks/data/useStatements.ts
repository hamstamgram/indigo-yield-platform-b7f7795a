/**
 * Statements Data Hooks
 * Abstracts statement operations from components
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface StatementDraft {
  id: string;
  investor_name: string;
  period: string;
  status: "draft" | "published";
  created_at: string;
  storage_path: string;
}

/**
 * Fetch statements for a given month
 */
async function fetchStatements(selectedMonth: string): Promise<StatementDraft[]> {
  const [year, month] = selectedMonth.split("-").map(Number);

  const { data, error } = await supabase
    .from("statements")
    .select(
      `
      id,
      period_year,
      period_month,
      storage_path,
      created_at,
      investor_id,
      profile:profiles(first_name, last_name, email)
    `
    )
    .eq("period_year", year)
    .eq("period_month", month)
    .order("created_at", { ascending: false });

  if (error) throw error;

  return (data || []).map((item: any) => ({
    id: item.id,
    investor_name:
      `${item.profile?.first_name || ""} ${item.profile?.last_name || ""}`.trim() ||
      item.profile?.email ||
      "Unknown Investor",
    period: `${item.period_year}-${String(item.period_month).padStart(2, "0")}`,
    status: (item.storage_path ? "published" : "draft") as "draft" | "published",
    created_at: item.created_at,
    storage_path: item.storage_path,
  }));
}

/**
 * Hook to fetch statements for a selected month
 */
export function useStatements(selectedMonth: string) {
  return useQuery<StatementDraft[], Error>({
    queryKey: ["statements", selectedMonth],
    queryFn: () => fetchStatements(selectedMonth),
    enabled: !!selectedMonth,
  });
}

/**
 * Hook to publish statements
 */
export function usePublishStatements() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (draftsToPublish: StatementDraft[]) => {
      if (draftsToPublish.length === 0) {
        throw new Error("No drafts to publish");
      }
      // Mark drafts as published by ensuring they have storage_path
      // (current implementation just returns success)
      return { count: draftsToPublish.length };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["statements"] });
      toast.success(`${result.count} statements are ready`);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to publish");
    },
  });
}
