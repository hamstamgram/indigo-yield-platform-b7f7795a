/**
 * IB (Introducing Broker) Settings Section
 * Allows Super Admins to configure IB parent and percentage for investors
 */

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, Users, Percent, Save, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useSuperAdmin } from "@/components/admin/SuperAdminGuard";
import {
  getInvestorIBConfig,
  updateInvestorIBConfig,
  getIBReferrals,
  getAvailableIBParents,
} from "@/services/ibService";

interface IBSettingsSectionProps {
  investorId: string;
  onUpdate?: () => void;
}

interface IBParentOption {
  id: string;
  email: string;
  name: string;
}

interface Referral {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  ibPercentage: number;
}

export function IBSettingsSection({ investorId, onUpdate }: IBSettingsSectionProps) {
  const { toast } = useToast();
  const { isSuperAdmin, loading: roleLoading } = useSuperAdmin();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [ibParentId, setIbParentId] = useState<string | null>(null);
  const [ibPercentage, setIbPercentage] = useState<number>(0);
  const [availableParents, setAvailableParents] = useState<IBParentOption[]>([]);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [investorId]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      // Load IB config, available parents, and referrals in parallel
      const [config, parents, refs] = await Promise.all([
        getInvestorIBConfig(investorId),
        getAvailableIBParents(investorId),
        getIBReferrals(investorId),
      ]);

      if (config) {
        setIbParentId(config.ibParentId);
        setIbPercentage(config.ibPercentage);
      } else {
        setIbParentId(null);
        setIbPercentage(0);
      }

      setAvailableParents(parents);
      setReferrals(refs);
    } catch (err) {
      console.error("Failed to load IB settings:", err);
      setError("Failed to load IB settings");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const result = await updateInvestorIBConfig(investorId, ibParentId, ibPercentage);
      
      if (result.success) {
        toast({
          title: "IB Settings Updated",
          description: "The IB configuration has been saved successfully.",
        });
        onUpdate?.();
      } else {
        throw new Error(result.error || "Failed to update IB settings");
      }
    } catch (err) {
      console.error("Failed to save IB settings:", err);
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to save IB settings",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (roleLoading || loading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show read-only view for non-super admins
  const isReadOnly = !isSuperAdmin;

  return (
    <div className="space-y-4">
      {/* IB Parent Configuration */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            IB (Introducing Broker) Settings
          </CardTitle>
          <CardDescription>
            Configure referral relationships and commission percentages
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {isReadOnly && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Only Super Admins can modify IB settings. You have read-only access.
              </AlertDescription>
            </Alert>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            {/* IB Parent Selection */}
            <div className="space-y-2">
              <Label htmlFor="ib-parent">IB Parent (Referrer)</Label>
              <Select
                value={ibParentId || "none"}
                onValueChange={(value) => setIbParentId(value === "none" ? null : value)}
                disabled={isReadOnly}
              >
                <SelectTrigger id="ib-parent">
                  <SelectValue placeholder="Select IB parent..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No IB Parent</SelectItem>
                  {availableParents.map((parent) => (
                    <SelectItem key={parent.id} value={parent.id}>
                      {parent.name || parent.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                The investor who referred this account
              </p>
            </div>

            {/* IB Percentage */}
            <div className="space-y-2">
              <Label htmlFor="ib-percentage">IB Commission (%)</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="ib-percentage"
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={ibPercentage}
                  onChange={(e) => setIbPercentage(parseFloat(e.target.value) || 0)}
                  disabled={isReadOnly || !ibParentId}
                  className="font-mono"
                />
                <Percent className="h-4 w-4 text-muted-foreground" />
              </div>
              <p className="text-xs text-muted-foreground">
                Percentage of net income allocated to IB parent
              </p>
            </div>
          </div>

          {!isReadOnly && (
            <Button onClick={handleSave} disabled={saving} className="w-full sm:w-auto">
              {saving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Save IB Settings
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Referrals List */}
      {referrals.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Referrals (This Investor is IB Parent)</CardTitle>
            <CardDescription>
              Investors who have this account as their IB parent
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {referrals.map((ref) => (
                <div
                  key={ref.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                >
                  <div>
                    <p className="font-medium">
                      {ref.firstName || ref.lastName
                        ? `${ref.firstName || ""} ${ref.lastName || ""}`.trim()
                        : ref.email}
                    </p>
                    <p className="text-sm text-muted-foreground">{ref.email}</p>
                  </div>
                  <Badge variant="outline" className="font-mono">
                    {ref.ibPercentage}%
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
