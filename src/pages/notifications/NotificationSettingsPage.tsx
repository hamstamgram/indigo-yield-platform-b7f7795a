import { useState, useEffect } from "react";
import { useNotifications } from "@/hooks/useNotifications";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Bell, Mail, Smartphone, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { NotificationPreference } from "@/types/notifications";

const notificationTypes: NotificationPreference[] = [
  {
    type: "transaction",
    label: "Transactions",
    description: "Deposits, withdrawals, and transfers",
    email: true,
    push: true,
    inApp: true,
  },
  {
    type: "alert",
    label: "Price Alerts",
    description: "When your price alerts are triggered",
    email: true,
    push: true,
    inApp: true,
  },
  {
    type: "yield",
    label: "Yield Updates",
    description: "Interest credits and yield distributions",
    email: true,
    push: false,
    inApp: true,
  },
  {
    type: "security",
    label: "Security",
    description: "Login attempts, password changes, and security alerts",
    email: true,
    push: true,
    inApp: true,
  },
  {
    type: "document",
    label: "Documents",
    description: "New statements, tax forms, and documents",
    email: true,
    push: false,
    inApp: true,
  },
  {
    type: "support",
    label: "Support",
    description: "Support ticket updates and responses",
    email: true,
    push: true,
    inApp: true,
  },
  {
    type: "portfolio",
    label: "Portfolio",
    description: "Portfolio performance and rebalancing notifications",
    email: false,
    push: false,
    inApp: true,
  },
  {
    type: "system",
    label: "System",
    description: "Platform updates and maintenance notifications",
    email: true,
    push: false,
    inApp: true,
  },
];

const NotificationSettingsPage: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const { settings, updateSettings } = useNotifications(currentUser?.id);
  const [preferences, setPreferences] = useState<NotificationPreference[]>(notificationTypes);
  const [emailFrequency, setEmailFrequency] = useState<"realtime" | "daily" | "weekly">("realtime");
  const [quietHoursStart, setQuietHoursStart] = useState("22:00");
  const [quietHoursEnd, setQuietHoursEnd] = useState("08:00");

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setCurrentUser(user);
    };
    getUser();
  }, []);

  useEffect(() => {
    if (settings) {
      setEmailFrequency(settings.email_frequency);
      setQuietHoursStart(settings.quiet_hours_start || "22:00");
      setQuietHoursEnd(settings.quiet_hours_end || "08:00");
    }
  }, [settings]);

  const handleToggle = (type: string, channel: "email" | "push" | "inApp", value: boolean) => {
    setPreferences((prev) => prev.map((p) => (p.type === type ? { ...p, [channel]: value } : p)));
  };

  const handleSave = async () => {
    const updates: any = {
      email_frequency: emailFrequency,
      quiet_hours_start: quietHoursStart,
      quiet_hours_end: quietHoursEnd,
    };

    preferences.forEach((pref) => {
      updates[`${pref.type}_notifications`] = pref.inApp;
    });

    await updateSettings(updates);
  };

  return (
    <div className="container mx-auto p-6 space-y-6 max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Bell className="h-8 w-8" />
          Notification Settings
        </h1>
        <p className="text-muted-foreground mt-1">
          Manage how you receive notifications across email, push, and in-app channels
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Notification Preferences</CardTitle>
          <CardDescription>
            Choose which notifications you'd like to receive and through which channels
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-1">
            <div className="grid grid-cols-4 gap-4 text-sm font-medium text-muted-foreground mb-4">
              <div>Type</div>
              <div className="text-center flex items-center justify-center gap-2">
                <Mail className="h-4 w-4" />
                Email
              </div>
              <div className="text-center flex items-center justify-center gap-2">
                <Smartphone className="h-4 w-4" />
                Push
              </div>
              <div className="text-center flex items-center justify-center gap-2">
                <Bell className="h-4 w-4" />
                In-App
              </div>
            </div>

            {preferences.map((pref, index) => (
              <div key={pref.type}>
                <div className="grid grid-cols-4 gap-4 py-4 items-center">
                  <div>
                    <Label className="font-semibold">{pref.label}</Label>
                    <p className="text-xs text-muted-foreground">{pref.description}</p>
                  </div>
                  <div className="flex justify-center">
                    <Switch
                      checked={pref.email}
                      onCheckedChange={(checked) => handleToggle(pref.type, "email", checked)}
                    />
                  </div>
                  <div className="flex justify-center">
                    <Switch
                      checked={pref.push}
                      onCheckedChange={(checked) => handleToggle(pref.type, "push", checked)}
                    />
                  </div>
                  <div className="flex justify-center">
                    <Switch
                      checked={pref.inApp}
                      onCheckedChange={(checked) => handleToggle(pref.type, "inApp", checked)}
                    />
                  </div>
                </div>
                {index < preferences.length - 1 && <Separator />}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Email Preferences</CardTitle>
          <CardDescription>Control how often you receive email notifications</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email-frequency">Email Frequency</Label>
            <Select value={emailFrequency} onValueChange={(value: any) => setEmailFrequency(value)}>
              <SelectTrigger id="email-frequency">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="realtime">Real-time (immediate)</SelectItem>
                <SelectItem value="daily">Daily digest</SelectItem>
                <SelectItem value="weekly">Weekly digest</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {emailFrequency === "realtime" && "Receive emails immediately as notifications occur"}
              {emailFrequency === "daily" && "Receive a daily summary of notifications"}
              {emailFrequency === "weekly" && "Receive a weekly summary of notifications"}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Quiet Hours
          </CardTitle>
          <CardDescription>
            Set times when you don't want to receive push notifications
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="quiet-start">Start Time</Label>
              <input
                id="quiet-start"
                type="time"
                value={quietHoursStart}
                onChange={(e) => setQuietHoursStart(e.target.value)}
                className="w-full px-3 py-2 border rounded-md"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="quiet-end">End Time</Label>
              <input
                id="quiet-end"
                type="time"
                value={quietHoursEnd}
                onChange={(e) => setQuietHoursEnd(e.target.value)}
                className="w-full px-3 py-2 border rounded-md"
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Push notifications will be silenced during these hours. Email and in-app notifications
            will still be available.
          </p>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => window.history.back()}>
          Cancel
        </Button>
        <Button onClick={handleSave}>Save Preferences</Button>
      </div>
    </div>
  );
};

export default NotificationSettingsPage;
