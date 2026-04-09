import { useState, useEffect } from "react";
import { Bell, Mail, Info } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Button,
  Switch,
  Label,
  Separator,
} from "@/components/ui";
import { useToast } from "@/hooks";
import { useInvestorProfileData, useSaveUserPreferences } from "@/features/investor/transactions/hooks/useInvestorPortal";
import { logError } from "@/lib/logger";

const NotificationsTab = () => {
  const { data: profile } = useInvestorProfileData();
  const savePreferencesMutation = useSaveUserPreferences();
  const { toast } = useToast();

  const [prefs, setPrefs] = useState({
    email: true,
    statement_ready: true,
    withdrawal_status: true,
    deposit_confirmed: true,
    yield_distributed: true,
  });

  useEffect(() => {
    if (profile?.preferences) {
      const dbPrefs = (profile.preferences as any).notifications || {};
      setPrefs((prev) => ({
        ...prev,
        ...dbPrefs,
      }));
    }
  }, [profile]);

  const togglePref = (key: keyof typeof prefs) => {
    setPrefs((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = async () => {
    try {
      const updatedPreferences = {
        ...(profile?.preferences as any || {}),
        notifications: prefs,
      };
      
      await savePreferencesMutation.mutateAsync(updatedPreferences);
      
      toast({
        title: "Preferences updated",
        description: "Your notification settings have been saved.",
      });
    } catch (error) {
      logError("NotificationsTab.handleSave", error);
      toast({
        title: "Error",
        description: "Failed to save notification preferences.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <Card className="border-white/10 bg-card">
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2">
            <Bell className="h-5 w-5 text-indigo-400" />
            Notification Preferences
          </CardTitle>
          <CardDescription>Choose how and when you want to be notified</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/5">
            <div className="space-y-0.5">
              <Label className="text-base font-medium text-white flex items-center gap-2">
                <Mail className="h-4 w-4 text-slate-400" />
                Email Notifications
              </Label>
              <p className="text-sm text-indigo-200/50">
                Receive platform updates and alerts via email
              </p>
            </div>
            <Switch
              checked={prefs.email}
              onCheckedChange={() => togglePref("email")}
            />
          </div>

          <div className="space-y-4 pt-2">
            <h3 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground px-1">
              Activity Alerts
            </h3>
            
            <div className="grid gap-4">
              {[
                { id: "statement_ready", label: "Monthly Statements", desc: "When your monthly report is ready" },
                { id: "yield_distributed", label: "Yield Distributions", desc: "When new yield is credited to your account" },
                { id: "deposit_confirmed", label: "Deposit Confirmations", desc: "When your funds are successfully credited" },
                { id: "withdrawal_status", label: "Withdrawal Updates", desc: "Status changes for your withdrawal requests" },
              ].map((item) => (
                <div key={item.id} className="flex items-center justify-between px-1">
                  <div className="space-y-0.5">
                    <Label htmlFor={item.id} className="text-sm font-medium text-white">
                      {item.label}
                    </Label>
                    <p className="text-xs text-indigo-200/40">
                      {item.desc}
                    </p>
                  </div>
                  <Switch
                    id={item.id}
                    disabled={!prefs.email}
                    checked={prefs[item.id as keyof typeof prefs]}
                    onCheckedChange={() => togglePref(item.id as keyof typeof prefs)}
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="pt-6 flex justify-end">
            <Button
              onClick={handleSave}
              disabled={savePreferencesMutation.isPending}
              className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold px-8 rounded-xl h-11"
            >
              {savePreferencesMutation.isPending ? "Saving..." : "Save Preferences"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-start gap-3 p-4 rounded-2xl bg-indigo-500/5 border border-indigo-500/10">
        <Info className="h-5 w-5 text-indigo-400 shrink-0 mt-0.5" />
        <p className="text-xs text-indigo-200/60 leading-relaxed">
          Critical security alerts, such as password changes or new device logins, cannot be disabled and will always be sent to your primary email address.
        </p>
      </div>
    </div>
  );
};

export default NotificationsTab;
