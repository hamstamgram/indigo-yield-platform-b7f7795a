import { useState, useEffect } from "react";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
  Switch, Label, Button, Separator,
} from "@/components/ui";
import { Bell, Mail, FileText, TrendingUp, AlertTriangle } from "lucide-react";
import {
  useNotificationPreferences,
  useUpdateNotificationPreferences,
  type NotificationPreferences,
  DEFAULT_NOTIFICATION_PREFERENCES,
} from "@/hooks/data/useProfileSettings";

const NotificationSettingsPage = () => {
  const { data: savedPreferences, isLoading } = useNotificationPreferences();
  const updateMutation = useUpdateNotificationPreferences();

  const [preferences, setPreferences] = useState<NotificationPreferences>(
    DEFAULT_NOTIFICATION_PREFERENCES
  );

  useEffect(() => {
    if (savedPreferences) {
      setPreferences(savedPreferences);
    }
  }, [savedPreferences]);

  const handleSave = async () => {
    updateMutation.mutate(preferences);
  };

  const updatePreference = <K extends keyof NotificationPreferences>(
    key: K,
    value: NotificationPreferences[K]
  ) => {
    setPreferences((prev) => ({ ...prev, [key]: value }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

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
          <Button onClick={handleSave} disabled={updateMutation.isPending}>
            {updateMutation.isPending ? "Saving..." : "Save Preferences"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NotificationSettingsPage;
