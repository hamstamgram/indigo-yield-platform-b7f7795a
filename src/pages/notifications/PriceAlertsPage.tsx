import React, { useState, useEffect } from "react";
import { usePriceAlerts } from "@/hooks/useNotifications";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Bell, Plus, Trash2, TrendingUp, TrendingDown, Activity } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";

const PriceAlertsPage: React.FC = () => {
  const { toast } = useToast();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const { alerts, loading, createAlert, updateAlert, deleteAlert } = usePriceAlerts(
    currentUser?.id
  );

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newAlert, setNewAlert] = useState({
    asset_symbol: "BTC",
    alert_type: "above" as "above" | "below" | "change_percent",
    threshold_value: 0,
    is_active: true,
  });

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setCurrentUser(user);
    };
    getUser();
  }, []);

  const handleCreateAlert = async () => {
    if (!currentUser) return;

    try {
      await createAlert({
        ...newAlert,
        user_id: currentUser.id,
      });

      toast({
        title: "Alert created",
        description: "Your price alert has been set successfully.",
      });

      setIsDialogOpen(false);
      setNewAlert({
        asset_symbol: "BTC",
        alert_type: "above",
        threshold_value: 0,
        is_active: true,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create price alert.",
        variant: "destructive",
      });
    }
  };

  const handleToggleAlert = async (alertId: string, isActive: boolean) => {
    try {
      await updateAlert(alertId, { is_active: isActive });
      toast({
        title: isActive ? "Alert enabled" : "Alert disabled",
        description: `Price alert has been ${isActive ? "enabled" : "disabled"}.`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update price alert.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteAlert = async (alertId: string) => {
    try {
      await deleteAlert(alertId);
      toast({
        title: "Alert deleted",
        description: "Price alert has been removed.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete price alert.",
        variant: "destructive",
      });
    }
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case "above":
        return <TrendingUp className="h-4 w-4" />;
      case "below":
        return <TrendingDown className="h-4 w-4" />;
      case "change_percent":
        return <Activity className="h-4 w-4" />;
      default:
        return <Bell className="h-4 w-4" />;
    }
  };

  const getAlertTypeLabel = (type: string) => {
    switch (type) {
      case "above":
        return "Above";
      case "below":
        return "Below";
      case "change_percent":
        return "Change %";
      default:
        return type;
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Bell className="h-8 w-8" />
            Price Alerts
          </h1>
          <p className="text-muted-foreground mt-1">
            Get notified when asset prices reach your target levels
          </p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Create Alert
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Price Alert</DialogTitle>
              <DialogDescription>
                Set up a new price alert to get notified when conditions are met
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="asset">Asset</Label>
                <Select
                  value={newAlert.asset_symbol}
                  onValueChange={(value) => setNewAlert({ ...newAlert, asset_symbol: value })}
                >
                  <SelectTrigger id="asset">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BTC">Bitcoin (BTC)</SelectItem>
                    <SelectItem value="ETH">Ethereum (ETH)</SelectItem>
                    <SelectItem value="USDC">USD Coin (USDC)</SelectItem>
                    <SelectItem value="USDT">Tether (USDT)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="alert-type">Alert Type</Label>
                <Select
                  value={newAlert.alert_type}
                  onValueChange={(value: any) => setNewAlert({ ...newAlert, alert_type: value })}
                >
                  <SelectTrigger id="alert-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="above">Price Above</SelectItem>
                    <SelectItem value="below">Price Below</SelectItem>
                    <SelectItem value="change_percent">% Change</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="threshold">
                  {newAlert.alert_type === "change_percent" ? "Percentage" : "Price"} Threshold
                </Label>
                <Input
                  id="threshold"
                  type="number"
                  step={newAlert.alert_type === "change_percent" ? "0.1" : "0.01"}
                  value={newAlert.threshold_value}
                  onChange={(e) =>
                    setNewAlert({ ...newAlert, threshold_value: parseFloat(e.target.value) })
                  }
                  placeholder={newAlert.alert_type === "change_percent" ? "5.0" : "50000.00"}
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="active"
                  checked={newAlert.is_active}
                  onCheckedChange={(checked) => setNewAlert({ ...newAlert, is_active: checked })}
                />
                <Label htmlFor="active">Enable alert immediately</Label>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateAlert}>Create Alert</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <Card>
          <CardContent className="p-6">
            <p className="text-center text-muted-foreground">Loading alerts...</p>
          </CardContent>
        </Card>
      ) : alerts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Bell className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No price alerts</h3>
            <p className="text-muted-foreground text-center mb-4">
              Create your first price alert to get notified when market conditions are met
            </p>
            <Button onClick={() => setIsDialogOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Create Your First Alert
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Active Alerts ({alerts.filter((a) => a.is_active).length})</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Asset</TableHead>
                  <TableHead>Condition</TableHead>
                  <TableHead>Threshold</TableHead>
                  <TableHead>Current</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {alerts.map((alert) => (
                  <TableRow key={alert.id}>
                    <TableCell className="font-medium">{alert.asset_symbol}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getAlertIcon(alert.alert_type)}
                        {getAlertTypeLabel(alert.alert_type)}
                      </div>
                    </TableCell>
                    <TableCell>
                      {alert.alert_type === "change_percent"
                        ? `${alert.threshold_value}%`
                        : `$${alert.threshold_value.toLocaleString()}`}
                    </TableCell>
                    <TableCell>
                      {alert.current_value ? (
                        alert.alert_type === "change_percent" ? (
                          `${alert.current_value}%`
                        ) : (
                          `$${alert.current_value.toLocaleString()}`
                        )
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={alert.is_active}
                          onCheckedChange={(checked) => handleToggleAlert(alert.id, checked)}
                        />
                        {alert.triggered_at ? (
                          <Badge variant="outline">Triggered</Badge>
                        ) : alert.is_active ? (
                          <Badge>Active</Badge>
                        ) : (
                          <Badge variant="secondary">Inactive</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDistanceToNow(new Date(alert.created_at), { addSuffix: true })}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteAlert(alert.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default PriceAlertsPage;
