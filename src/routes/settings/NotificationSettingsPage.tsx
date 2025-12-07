import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth/context";
import { supabase } from "@/integrations/supabase/client";
import { Bell, Mail, FileText, TrendingUp, AlertTriangle } from "lucide-react";

interface NotificationPreferences {
  emailStatements: boolean;
  emailPerformance: boolean;
  emailAlerts: boolean;
  emailMarketing: boolean;
  pushEnabled: boolean;
  digestFrequency: "daily" | "weekly" | "monthly";
}

const defaultPreferences: NotificationPreferences = {
  emailStatements: true,
  emailPerformance: true,
  emailAlerts: true,
  emailMarketing: false,
  pushEnabled: true,
  digestFrequency: "weekly",
};

const NotificationSettingsPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [preferences, setPreferences] = useState<NotificationPreferences>(defaultPreferences);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const loadPreferences = async () => {
      if (!user) return;

      try {
        const { data } = await supabase
          .from("profiles")
          .select("preferences")
          .eq("id", user.id)
          .single();

        if (data?.preferences?.notifications) {
          const notifications = data.preferences.notifications as Partial<NotificationPreferences>;
          setPreferences((prev) => ({
            ...prev,
            ...notifications,
          }));
        }
      } catch (error) {
        console.error("Failed to load notification preferences:", error);
      }
    };

    loadPreferences();
  }, [user]);

  const handleSave = async () => {
    if (!user) return;

    setSaving(true);
    try {
      // Fetch current preferences first
      const { data: profile } = await supabase
        .from("profiles")
        .select("preferences")
        .eq("id", user.id)
        .single();

      const currentPrefs = (profile?.preferences as Record<string, unknown>) || {};

      // Merge notification preferences
      const { error } = await supabase
        .from("profiles")
        .update({
          preferences: {
            ...currentPrefs,
            notifications: preferences,
          } as any,
        })
        .eq("id", user.id);

      if (error) throw error;

      toast({
        title: "Preferences saved",
        description: "Your notification preferences have been updated.",
      });
    } catch (error) {
      console.error("Failed to save preferences:", error);
      toast({
        title: "Error",
        description: "Failed to save preferences. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const updatePreference = <K extends keyof NotificationPreferences>(
    key: K,
    value: NotificationPreferences[K]
  ) => {
    setPreferences((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Notification Settings</h1>
        <p className="text-gray-500 dark:text-gray-400">
          Manage your email and notification preferences
        </p>
      </div>

      <div className="space-y-6">
        <Card className="border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Email Notifications
            </CardTitle>
            <CardDescription>Control which emails you receive from us</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-start gap-3">
                <FileText className="h-5 w-5 mt-0.5 text-muted-foreground" />
                <div>
                  <Label className="text-sm font-medium">Account Statements</Label>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Monthly account statements and transaction summaries
                  </p>
                </div>
              </div>
              <Switch
                checked={preferences.emailStatements}
                onCheckedChange={(checked) => updatePreference("emailStatements", checked)}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="flex items-start gap-3">
                <TrendingUp className="h-5 w-5 mt-0.5 text-muted-foreground" />
                <div>
                  <Label className="text-sm font-medium">Performance Reports</Label>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Weekly or monthly fund performance updates
                  </p>
                </div>
              </div>
              <Switch
                checked={preferences.emailPerformance}
                onCheckedChange={(checked) => updatePreference("emailPerformance", checked)}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 mt-0.5 text-muted-foreground" />
                <div>
                  <Label className="text-sm font-medium">Important Alerts</Label>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Security alerts, account changes, and critical updates
                  </p>
                </div>
              </div>
              <Switch
                checked={preferences.emailAlerts}
                onCheckedChange={(checked) => updatePreference("emailAlerts", checked)}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="flex items-start gap-3">
                <Bell className="h-5 w-5 mt-0.5 text-muted-foreground" />
                <div>
                  <Label className="text-sm font-medium">Marketing & Updates</Label>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    News, investment opportunities, and product updates
                  </p>
                </div>
              </div>
              <Switch
                checked={preferences.emailMarketing}
                onCheckedChange={(checked) => updatePreference("emailMarketing", checked)}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Digest Frequency
            </CardTitle>
            <CardDescription>How often would you like to receive summary emails?</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              {(["daily", "weekly", "monthly"] as const).map((freq) => (
                <Button
                  key={freq}
                  variant={preferences.digestFrequency === freq ? "primary" : "outline"}
                  onClick={() => updatePreference("digestFrequency", freq)}
                  className="capitalize"
                >
                  {freq}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save Preferences"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NotificationSettingsPage;
