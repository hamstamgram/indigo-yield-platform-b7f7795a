/**
 * Performance Data Editor
 * Comprehensive editor for all 24 columns of investor_fund_performance
 */

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Save, Loader2, Plus, Trash2 } from "lucide-react";
import {
  updatePerformanceData,
  createPerformanceRecord,
  deletePerformanceRecord,
  getAvailableFunds,
  PerformanceUpdateData,
} from "@/services/shared/performanceDataService";

interface AssetData {
  asset_code: string;
  report_id: string;
  mtd_beginning_balance: number;
  mtd_additions: number;
  mtd_redemptions: number;
  mtd_net_income: number;
  mtd_ending_balance: number;
  mtd_rate_of_return: number;
  qtd_beginning_balance: number;
  qtd_additions: number;
  qtd_redemptions: number;
  qtd_net_income: number;
  qtd_ending_balance: number;
  qtd_rate_of_return: number;
  ytd_beginning_balance: number;
  ytd_additions: number;
  ytd_redemptions: number;
  ytd_net_income: number;
  ytd_ending_balance: number;
  ytd_rate_of_return: number;
  itd_beginning_balance: number;
  itd_additions: number;
  itd_redemptions: number;
  itd_net_income: number;
  itd_ending_balance: number;
  itd_rate_of_return: number;
}

interface PerformanceDataEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  investorId: string;
  investorName: string;
  periodId: string;
  periodName: string;
  assets: AssetData[];
  onSaved: () => void;
}

type TimeFrame = "mtd" | "qtd" | "ytd" | "itd";

const TIME_FRAME_LABELS: Record<TimeFrame, string> = {
  mtd: "Month-to-Date",
  qtd: "Quarter-to-Date",
  ytd: "Year-to-Date",
  itd: "Inception-to-Date",
};

const FIELD_LABELS = {
  beginning_balance: "Beginning Balance",
  additions: "Additions",
  redemptions: "Redemptions",
  net_income: "Net Income",
  ending_balance: "Ending Balance",
  rate_of_return: "Rate of Return (%)",
};

export function PerformanceDataEditor({
  open,
  onOpenChange,
  investorId,
  investorName,
  periodId,
  periodName,
  assets,
  onSaved,
}: PerformanceDataEditorProps) {
  const [selectedAsset, setSelectedAsset] = useState<string>(assets[0]?.asset_code || "");
  const [formData, setFormData] = useState<Record<string, AssetData>>({});
  const [saving, setSaving] = useState(false);
  const [availableFunds, setAvailableFunds] = useState<string[]>([]);
  const [showAddFund, setShowAddFund] = useState(false);
  const [newFundName, setNewFundName] = useState("");
  
  // Delete confirmation state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Initialize form data from assets
  useEffect(() => {
    const data: Record<string, AssetData> = {};
    assets.forEach((asset) => {
      data[asset.asset_code] = { ...asset };
    });
    setFormData(data);
    if (assets.length > 0 && !selectedAsset) {
      setSelectedAsset(assets[0].asset_code);
    }
  }, [assets]);

  // Load available funds
  useEffect(() => {
    getAvailableFunds().then(setAvailableFunds);
  }, []);

  const currentAsset = formData[selectedAsset];

  const handleFieldChange = (
    timeFrame: TimeFrame,
    field: keyof typeof FIELD_LABELS,
    value: string
  ) => {
    if (!currentAsset) return;

    const fieldKey = `${timeFrame}_${field}` as keyof AssetData;
    const numValue = parseFloat(value) || 0;

    setFormData((prev) => ({
      ...prev,
      [selectedAsset]: {
        ...prev[selectedAsset],
        [fieldKey]: numValue,
      },
    }));
  };

  const getFieldValue = (timeFrame: TimeFrame, field: keyof typeof FIELD_LABELS): number => {
    if (!currentAsset) return 0;
    const fieldKey = `${timeFrame}_${field}` as keyof AssetData;
    return (currentAsset[fieldKey] as number) || 0;
  };

  const handleSave = async () => {
    if (!currentAsset) return;

    setSaving(true);
    try {
      const updateData: PerformanceUpdateData = {
        mtd_beginning_balance: currentAsset.mtd_beginning_balance,
        mtd_additions: currentAsset.mtd_additions,
        mtd_redemptions: currentAsset.mtd_redemptions,
        mtd_net_income: currentAsset.mtd_net_income,
        mtd_ending_balance: currentAsset.mtd_ending_balance,
        mtd_rate_of_return: currentAsset.mtd_rate_of_return,
        qtd_beginning_balance: currentAsset.qtd_beginning_balance,
        qtd_additions: currentAsset.qtd_additions,
        qtd_redemptions: currentAsset.qtd_redemptions,
        qtd_net_income: currentAsset.qtd_net_income,
        qtd_ending_balance: currentAsset.qtd_ending_balance,
        qtd_rate_of_return: currentAsset.qtd_rate_of_return,
        ytd_beginning_balance: currentAsset.ytd_beginning_balance,
        ytd_additions: currentAsset.ytd_additions,
        ytd_redemptions: currentAsset.ytd_redemptions,
        ytd_net_income: currentAsset.ytd_net_income,
        ytd_ending_balance: currentAsset.ytd_ending_balance,
        ytd_rate_of_return: currentAsset.ytd_rate_of_return,
        itd_beginning_balance: currentAsset.itd_beginning_balance,
        itd_additions: currentAsset.itd_additions,
        itd_redemptions: currentAsset.itd_redemptions,
        itd_net_income: currentAsset.itd_net_income,
        itd_ending_balance: currentAsset.itd_ending_balance,
        itd_rate_of_return: currentAsset.itd_rate_of_return,
      };

      const result = await updatePerformanceData(currentAsset.report_id, updateData);

      if (result.success) {
        toast.success("Saved", {
          description: `Performance data for ${selectedAsset} updated successfully.`,
        });
        onSaved();
      } else {
        throw new Error(result.error);
      }
    } catch (error: any) {
      toast.error("Error", {
        description: error.message || "Failed to save performance data",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleAddFund = async () => {
    if (!newFundName.trim()) return;

    setSaving(true);
    try {
      const result = await createPerformanceRecord(investorId, periodId, newFundName.toUpperCase(), {
        mtd_beginning_balance: 0,
        mtd_additions: 0,
        mtd_redemptions: 0,
        mtd_net_income: 0,
        mtd_ending_balance: 0,
        mtd_rate_of_return: 0,
        qtd_beginning_balance: 0,
        qtd_additions: 0,
        qtd_redemptions: 0,
        qtd_net_income: 0,
        qtd_ending_balance: 0,
        qtd_rate_of_return: 0,
        ytd_beginning_balance: 0,
        ytd_additions: 0,
        ytd_redemptions: 0,
        ytd_net_income: 0,
        ytd_ending_balance: 0,
        ytd_rate_of_return: 0,
        itd_beginning_balance: 0,
        itd_additions: 0,
        itd_redemptions: 0,
        itd_net_income: 0,
        itd_ending_balance: 0,
        itd_rate_of_return: 0,
      });

      if (result.success) {
        toast.success("Fund Added", {
          description: `${newFundName.toUpperCase()} added for this investor.`,
        });
        setNewFundName("");
        setShowAddFund(false);
        onSaved();
      } else {
        throw new Error(result.error);
      }
    } catch (error: any) {
      toast.error("Error", {
        description: error.message || "Failed to add fund",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteFundClick = () => {
    if (!currentAsset?.report_id) return;
    setDeleteDialogOpen(true);
  };

  const confirmDeleteFund = async () => {
    if (!currentAsset?.report_id) return;

    setSaving(true);
    try {
      const result = await deletePerformanceRecord(currentAsset.report_id);

      if (result.success) {
        toast.success("Deleted", {
          description: `${selectedAsset} data removed.`,
        });
        onSaved();
      } else {
        throw new Error(result.error);
      }
    } catch (error: any) {
      toast.error("Error", {
        description: error.message || "Failed to delete fund",
      });
    } finally {
      setSaving(false);
      setDeleteDialogOpen(false);
    }
  };

  const renderTimeFrameFields = (timeFrame: TimeFrame) => (
    <div className="grid grid-cols-2 gap-4">
      {(Object.keys(FIELD_LABELS) as Array<keyof typeof FIELD_LABELS>).map((field) => (
        <div key={field} className="space-y-2">
          <Label htmlFor={`${timeFrame}-${field}`} className="text-sm">
            {FIELD_LABELS[field]}
          </Label>
          <Input
            id={`${timeFrame}-${field}`}
            type="number"
            step="any"
            value={getFieldValue(timeFrame, field)}
            onChange={(e) => handleFieldChange(timeFrame, field, e.target.value)}
            className="font-mono"
          />
        </div>
      ))}
    </div>
  );

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Performance Data</DialogTitle>
            <DialogDescription>
              {investorName} • {periodName}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Asset Selector */}
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <Label className="text-sm text-muted-foreground mb-2 block">Select Fund</Label>
                <div className="flex flex-wrap gap-2">
                  {Object.keys(formData).map((assetCode) => (
                    <Button
                      key={assetCode}
                      variant={selectedAsset === assetCode ? "secondary" : "outline"}
                      size="sm"
                      onClick={() => setSelectedAsset(assetCode)}
                    >
                      {assetCode}
                    </Button>
                  ))}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowAddFund(true)}
                    className="text-muted-foreground"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Fund
                  </Button>
                </div>
              </div>
            </div>

            {/* Add Fund Dialog */}
            {showAddFund && (
              <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                <Select value={newFundName} onValueChange={setNewFundName}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Select fund" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableFunds
                      .filter((f) => !Object.keys(formData).includes(f))
                      .map((fund) => (
                        <SelectItem key={fund} value={fund}>
                          {fund}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <Input
                  placeholder="Or enter custom fund code"
                  value={newFundName}
                  onChange={(e) => setNewFundName(e.target.value.toUpperCase())}
                  className="w-[180px]"
                />
                <Button size="sm" onClick={handleAddFund} disabled={!newFundName || saving}>
                  Add
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setShowAddFund(false)}>
                  Cancel
                </Button>
              </div>
            )}

            {/* Time Frame Tabs */}
            {currentAsset && (
              <Tabs defaultValue="mtd" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  {(Object.keys(TIME_FRAME_LABELS) as TimeFrame[]).map((tf) => (
                    <TabsTrigger key={tf} value={tf} className="text-xs sm:text-sm">
                      {tf.toUpperCase()}
                    </TabsTrigger>
                  ))}
                </TabsList>

                {(Object.keys(TIME_FRAME_LABELS) as TimeFrame[]).map((tf) => (
                  <TabsContent key={tf} value={tf} className="mt-4">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="font-medium">{TIME_FRAME_LABELS[tf]}</h3>
                        <Badge variant="secondary">{selectedAsset}</Badge>
                      </div>
                      {renderTimeFrameFields(tf)}
                    </div>
                  </TabsContent>
                ))}
              </Tabs>
            )}

            {!currentAsset && Object.keys(formData).length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <p>No fund data for this investor in this period.</p>
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => setShowAddFund(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add First Fund
                </Button>
              </div>
            )}
          </div>

          <DialogFooter className="flex justify-between sm:justify-between">
            <div>
              {currentAsset && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleDeleteFundClick}
                  disabled={saving}
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Delete {selectedAsset}
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={saving || !currentAsset}>
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Fund Data</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedAsset} data for this investor? This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteFund}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}