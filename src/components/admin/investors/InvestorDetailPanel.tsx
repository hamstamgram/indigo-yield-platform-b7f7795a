/**
 * Investor Detail Panel
 * Right-side panel for 2-panel layout on /admin/investors
 * Uses InvestorTabs for consistent experience with full workspace
 */

import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  X,
  ExternalLink,
  User,
  Loader2,
  AlertCircle,
  RotateCcw,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { InvestorSummaryV2, forceDeleteInvestorUser } from "@/services/admin";
import { InvestorTabs } from "./InvestorTabs";
import { toast } from "sonner";

interface InvestorDetailPanelProps {
  investorId: string | null;
  investorSummary: InvestorSummaryV2 | null;
  onClose: () => void;
  onDataChange?: () => void;
}

export function InvestorDetailPanel({
  investorId,
  investorSummary,
  onClose,
  onDataChange,
}: InvestorDetailPanelProps) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [pendingWithdrawalsCount, setPendingWithdrawalsCount] = useState(0);

  // Load pending withdrawals count
  const loadPendingWithdrawals = useCallback(async () => {
    if (!investorId) return;
    
    try {
      const { count, error: wdError } = await supabase
        .from("withdrawal_requests")
        .select("id", { count: "exact", head: true })
        .eq("investor_id", investorId)
        .eq("status", "pending");

      if (!wdError) {
        setPendingWithdrawalsCount(count || 0);
      }
    } catch (err) {
      console.warn("Failed to load pending withdrawals count:", err);
    }
  }, [investorId]);

  useEffect(() => {
    if (investorId) {
      loadPendingWithdrawals();
    }
  }, [investorId, loadPendingWithdrawals]);

  const handleOpenWorkspace = () => {
    if (investorId) {
      navigate(`/admin/investors/${investorId}`);
    }
  };

  const handleDelete = async () => {
    if (!investorId) return;
    
    try {
      await forceDeleteInvestorUser(investorId);
      toast.success("Investor deleted", {
        description: "The investor and all associated data have been removed.",
      });
      onClose();
      onDataChange?.();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to delete investor";
      toast.error("Error", { description: message });
      throw err;
    }
  };

  const handleDataChange = () => {
    loadPendingWithdrawals();
    onDataChange?.();
  };

  // No investor selected state
  if (!investorId || !investorSummary) {
    return (
      <div className="h-full flex items-center justify-center p-8">
        <div className="text-center text-muted-foreground">
          <User className="h-12 w-12 mx-auto mb-4 opacity-30" />
          <p className="font-medium">Select an investor</p>
          <p className="text-sm mt-1">Click a row to view details</p>
        </div>
      </div>
    );
  }

  const investorName = `${investorSummary.firstName} ${investorSummary.lastName}`.trim();

  // Error state
  if (error) {
    return (
      <div className="h-full flex flex-col">
        <div className="p-4 border-b flex items-center justify-between">
          <span className="font-medium">Error</span>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 mx-auto text-destructive mb-3" />
            <p className="text-destructive font-medium">Failed to load investor details</p>
            <p className="text-muted-foreground text-sm mt-1">{error.message}</p>
            <Button variant="outline" className="mt-4" onClick={() => setError(null)}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b flex items-center justify-between bg-background shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <User className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-semibold truncate">{investorName}</span>
              <Badge variant={investorSummary.status === "active" ? "default" : "secondary"} className="shrink-0">
                {investorSummary.status || "active"}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground truncate">{investorSummary.email}</p>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Button variant="ghost" size="sm" onClick={handleOpenWorkspace}>
            <ExternalLink className="h-4 w-4 mr-1" />
            <span className="hidden sm:inline">Open Workspace</span>
          </Button>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Tabs Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : (
          <InvestorTabs
            investorId={investorId}
            investorName={investorName}
            investorEmail={investorSummary.email}
            compact={true}
            onDataChange={handleDataChange}
            onDelete={handleDelete}
            pendingWithdrawalsCount={pendingWithdrawalsCount}
          />
        )}
      </div>
    </div>
  );
}

export default InvestorDetailPanel;
