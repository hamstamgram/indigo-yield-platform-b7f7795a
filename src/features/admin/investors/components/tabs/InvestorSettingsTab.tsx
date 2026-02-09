/**
 * Investor Settings Tab
 * Consolidated settings for IB configuration, fee schedule, and danger zone
 */

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Button,
  Badge,
  Input,
  Label,
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui";
import {
  Trash2,
  ExternalLink,
  Mail,
  AlertTriangle,
  Loader2,
  Percent,
  Save,
  RotateCcw,
} from "lucide-react";
import { IBSettingsSection } from "../shared/IBSettingsSection";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { QUERY_KEYS } from "@/constants/queryKeys";

interface InvestorSettingsTabProps {
  investorId: string;
  investorName: string;
  onDelete?: () => Promise<void>;
  onDataChange?: () => void;
  /** If true, shows compact version for drawer */
  compact?: boolean;
}

function useFeeConfig(investorId: string) {
  return useQuery({
    queryKey: ["investor-fee-config", investorId],
    queryFn: async () => {
      // Get profile fee_pct
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("fee_pct")
        .eq("id", investorId)
        .single();

      if (profileError) throw profileError;

      // Get fund default fees from active positions
      const { data: positions, error: posError } = await supabase
        .from("investor_positions")
        .select("fund_id, funds(name, perf_fee_bps)")
        .eq("investor_id", investorId)
        .eq("is_active", true);

      if (posError) throw posError;

      const fundDefaults = (positions || []).map((p) => {
        const fund = p.funds as unknown as { name: string; perf_fee_bps: number } | null;
        return {
          fund_id: p.fund_id,
          fund_name: fund?.name || "Unknown",
          default_fee_pct: (fund?.perf_fee_bps || 0) / 100,
        };
      });

      return {
        customFeePct: profile?.fee_pct as number | null,
        fundDefaults,
      };
    },
    enabled: !!investorId,
  });
}

function useUpdateFeePct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ investorId, feePct }: { investorId: string; feePct: number | null }) => {
      const { error } = await supabase
        .from("profiles")
        .update({ fee_pct: feePct, updated_at: new Date().toISOString() })
        .eq("id", investorId);

      if (error) throw error;
    },
    onSuccess: (_, { investorId }) => {
      queryClient.invalidateQueries({ queryKey: ["investor-fee-config", investorId] });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.profile(investorId) });
    },
  });
}

function FeeConfigSection({ investorId }: { investorId: string }) {
  const { data, isLoading } = useFeeConfig(investorId);
  const updateMutation = useUpdateFeePct();
  const [feeInput, setFeeInput] = useState("");
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    if (data?.customFeePct !== undefined) {
      setFeeInput(data.customFeePct !== null ? String(data.customFeePct) : "");
      setIsDirty(false);
    }
  }, [data?.customFeePct]);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-6">
          <div className="animate-pulse h-16 bg-muted rounded" />
        </CardContent>
      </Card>
    );
  }

  const customFeePct = data?.customFeePct ?? null;
  const fundDefaults = data?.fundDefaults ?? [];
  const primaryDefault = fundDefaults.length > 0 ? fundDefaults[0].default_fee_pct : 30;

  const effectiveFee = customFeePct !== null ? customFeePct : primaryDefault;
  const isCustom = customFeePct !== null;

  const handleSave = () => {
    const val = parseFloat(feeInput);
    if (isNaN(val) || val < 0 || val > 100) {
      toast.error("Fee must be between 0 and 100");
      return;
    }

    updateMutation.mutate(
      { investorId, feePct: val },
      {
        onSuccess: () => {
          toast.success("Fee override saved");
          setIsDirty(false);
        },
        onError: (err) => {
          toast.error("Failed to save fee", {
            description: err instanceof Error ? err.message : "Unknown error",
          });
        },
      }
    );
  };

  const handleReset = () => {
    updateMutation.mutate(
      { investorId, feePct: null },
      {
        onSuccess: () => {
          toast.success("Fee reset to fund default");
          setFeeInput("");
          setIsDirty(false);
        },
        onError: (err) => {
          toast.error("Failed to reset fee", {
            description: err instanceof Error ? err.message : "Unknown error",
          });
        },
      }
    );
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Percent className="h-4 w-4" />
          Fee Configuration
        </CardTitle>
        <CardDescription>
          Performance fee applied to yield distributions for this investor
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Fund defaults context */}
        {fundDefaults.length > 0 && (
          <div className="text-sm space-y-1">
            {fundDefaults.map((f) => (
              <div key={f.fund_id} className="flex justify-between text-muted-foreground">
                <span>{f.fund_name} default:</span>
                <span className="font-mono">{f.default_fee_pct}%</span>
              </div>
            ))}
          </div>
        )}

        {/* Custom override input */}
        <div className="space-y-2">
          <Label htmlFor="fee-override">Custom Fee Override (%)</Label>
          <div className="flex gap-2">
            <Input
              id="fee-override"
              type="number"
              min={0}
              max={100}
              step={0.1}
              value={feeInput}
              onChange={(e) => {
                setFeeInput(e.target.value);
                setIsDirty(true);
              }}
              placeholder={`${primaryDefault}% (fund default)`}
              className="font-mono"
            />
            <Button size="sm" onClick={handleSave} disabled={!isDirty || updateMutation.isPending}>
              {updateMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        {/* Effective fee display */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
          <span className="text-sm font-medium">Effective fee:</span>
          <div className="flex items-center gap-2">
            <span className="font-mono font-bold">{effectiveFee}%</span>
            {isCustom ? (
              <Badge variant="default" className="text-xs">
                Custom
              </Badge>
            ) : (
              <Badge variant="outline" className="text-xs">
                Fund Default
              </Badge>
            )}
          </div>
        </div>

        {/* Reset to default */}
        {isCustom && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleReset}
            disabled={updateMutation.isPending}
            className="text-xs text-muted-foreground"
          >
            <RotateCcw className="h-3 w-3 mr-1" />
            Reset to Fund Default
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

export function InvestorSettingsTab({
  investorId,
  investorName,
  onDelete,
  onDataChange,
  compact = false,
}: InvestorSettingsTabProps) {
  const navigate = useNavigate();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteConfirm = async () => {
    if (!onDelete) return;

    setIsDeleting(true);
    try {
      await onDelete();
      setDeleteDialogOpen(false);
    } catch (error) {
      // Error handled by parent
    } finally {
      setIsDeleting(false);
    }
  };

  const handleOpenFullProfile = () => {
    navigate(`/admin/investors/${investorId}`);
  };

  return (
    <div className="space-y-6">
      {/* Fee Configuration */}
      <FeeConfigSection investorId={investorId} />

      {/* IB Settings */}
      <IBSettingsSection investorId={investorId} onUpdate={onDataChange} />

      {/* Report Recipients Link (drawer only) */}
      {compact && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Report Recipients
            </CardTitle>
            <CardDescription>Configure email recipients for investor reports</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full" onClick={handleOpenFullProfile}>
              <ExternalLink className="h-4 w-4 mr-2" />
              Manage in Full Profile
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Danger Zone */}
      {onDelete && (
        <Card className="border-destructive/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-4 w-4" />
              Danger Zone
            </CardTitle>
            <CardDescription>
              Irreversible actions that permanently affect this investor
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="destructive"
              className="w-full"
              onClick={() => setDeleteDialogOpen(true)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Investor
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Delete Investor
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{investorName}</strong>? This action cannot be
              undone and will remove all associated data including:
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>All fund positions</li>
                <li>Transaction history</li>
                <li>Withdrawal requests</li>
                <li>Report data</li>
              </ul>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Investor
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default InvestorSettingsTab;
