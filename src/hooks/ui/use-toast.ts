/**
 * useToast shim - Routes all toast calls through Sonner.
 *
 * The shadcn Toaster component is NOT mounted in App.tsx (only Sonner is).
 * This shim ensures all legacy `useToast` / `toast()` calls render via Sonner.
 */

import { toast as sonnerToast } from "sonner";

interface ToastParams {
  title?: string;
  description?: string;
  variant?: "default" | "destructive";
  [key: string]: unknown;
}

function toast(params: ToastParams) {
  const { title, description, variant } = params;
  const message = typeof title === "string" ? title : "";
  const opts = description ? { description } : undefined;

  if (variant === "destructive") {
    sonnerToast.error(message, opts);
  } else {
    sonnerToast.success(message, opts);
  }
}

function useToast() {
  return {
    toast,
    dismiss: sonnerToast.dismiss,
    toasts: [] as never[],
  };
}

export { useToast, toast };
