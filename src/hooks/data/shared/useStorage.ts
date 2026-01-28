/**
 * Storage Hooks
 * React Query hooks for file upload operations
 */

import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { storageService } from "@/services/shared";

/**
 * Hook to upload a fund logo
 */
export function useUploadFundLogo() {
  return useMutation({
    mutationFn: storageService.uploadFundLogo,
    onSuccess: () => {
      toast.success("Logo uploaded successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to upload logo");
    },
  });
}
