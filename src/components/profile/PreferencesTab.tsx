import { useState, useEffect } from "react";
import { Bell, Globe, Mail, Save, Loader2 } from "lucide-react";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
  Button, Label, Switch, Separator,
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui";
import { useLocalPreferences, useSaveLocalPreferences } from "@/hooks/data";

interface PreferencesData {
  // Notifications
  emailNotifications: boolean;
  emailTransactions: boolean;
  emailStatements: boolean;
  emailMarketing: boolean;
  pushNotifications: boolean;
  pushTransactions: boolean;
  pushPriceAlerts: boolean;

  // Localization (Local state only for now as DB columns might not exist)
  language: string;
  timezone: string;
  dateFormat: string;
  currencyDisplay: string;

  // Display
  theme: string;
}

const defaultPreferences: PreferencesData = {
  emailNotifications: true,
  emailTransactions: true,
  emailStatements: true,
  emailMarketing: false,
  pushNotifications: true,
  pushTransactions: true,
  pushPriceAlerts: false,
  language: "en",
  timezone: "America/New_York",
  dateFormat: "MM/DD/YYYY",
  currencyDisplay: "USD",
  theme: "system",
};

export default function PreferencesTab() {
  const { data: savedPrefs, isLoading } = useLocalPreferences();
  const saveMutation = useSaveLocalPreferences();

  const [preferences, setPreferences] = useState<PreferencesData>(defaultPreferences);

  useEffect(() => {
    if (savedPrefs) {
      setPreferences((prev) => ({ ...prev, ...savedPrefs }));
    }
  }, [savedPrefs]);

  const handleSave = async () => {
    saveMutation.mutate(preferences as unknown as Record<string, unknown>);
  };

  const updatePreference = <K extends keyof PreferencesData>(key: K, value: PreferencesData[K]) => {
    setPreferences((prev) => ({ ...prev, [key]: value }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Email Notifications */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            <CardTitle>Email Notifications</CardTitle>
          </div>
          <CardDescription>Manage what emails you receive from us</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="emailNotifications" className="text-base">
                All Email Notifications
              </Label>
              <p className="text-sm text-muted-foreground">
                Master switch for all email notifications
              </p>
            </div>
            <Switch
              id="emailNotifications"
              checked={preferences.emailNotifications}
              onCheckedChange={(checked) => updatePreference("emailNotifications", checked)}
            />
          </div>

          <Separator />

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="emailTransactions">Transaction Notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Receive emails for deposits, withdrawals, and trades
                </p>
              </div>
              <Switch
                id="emailTransactions"
                checked={preferences.emailTransactions}
                onCheckedChange={(checked) => updatePreference("emailTransactions", checked)}
                disabled={!preferences.emailNotifications}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="emailStatements">Monthly Statements</Label>
                <p className="text-sm text-muted-foreground">Receive monthly account statements</p>
              </div>
              <Switch
                id="emailStatements"
                checked={preferences.emailStatements}
                onCheckedChange={(checked) => updatePreference("emailStatements", checked)}
                disabled={!preferences.emailNotifications}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="emailMarketing">Marketing & Updates</Label>
                <p className="text-sm text-muted-foreground">
                  Product updates, promotions, and market insights
                </p>
              </div>
              <Switch
                id="emailMarketing"
                checked={preferences.emailMarketing}
                onCheckedChange={(checked) => updatePreference("emailMarketing", checked)}
                disabled={!preferences.emailNotifications}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Push Notifications */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            <CardTitle>Push Notifications</CardTitle>
          </div>
          <CardDescription>Manage real-time notifications on your devices</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="pushNotifications" className="text-base">
                Enable Push Notifications
              </Label>
              <p className="text-sm text-muted-foreground">Receive notifications on your devices</p>
            </div>
            <Switch
              id="pushNotifications"
              checked={preferences.pushNotifications}
              onCheckedChange={(checked) => updatePreference("pushNotifications", checked)}
            />
          </div>

          <Separator />

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="pushTransactions">Transaction Alerts</Label>
                <p className="text-sm text-muted-foreground">
                  Get notified of all account transactions
                </p>
              </div>
              <Switch
                id="pushTransactions"
                checked={preferences.pushTransactions}
                onCheckedChange={(checked) => updatePreference("pushTransactions", checked)}
                disabled={!preferences.pushNotifications}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="pushPriceAlerts">Price Alerts</Label>
                <p className="text-sm text-muted-foreground">
                  Alerts when asset prices reach your targets
                </p>
              </div>
              <Switch
                id="pushPriceAlerts"
                checked={preferences.pushPriceAlerts}
                onCheckedChange={(checked) => updatePreference("pushPriceAlerts", checked)}
                disabled={!preferences.pushNotifications}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Localization */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            <CardTitle>Localization</CardTitle>
          </div>
          <CardDescription>Language and regional settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="language">Language</Label>
            <Select
              value={preferences.language}
              onValueChange={(val) => updatePreference("language", val)}
            >
              <SelectTrigger id="language">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="es">Español</SelectItem>
                <SelectItem value="fr">Français</SelectItem>
                <SelectItem value="de">Deutsch</SelectItem>
                <SelectItem value="ja">日本語</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="timezone">Timezone</Label>
            <Select
              value={preferences.timezone}
              onValueChange={(val) => updatePreference("timezone", val)}
            >
              <SelectTrigger id="timezone">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="America/New_York">Eastern Time (ET)</SelectItem>
                <SelectItem value="America/Chicago">Central Time (CT)</SelectItem>
                <SelectItem value="America/Denver">Mountain Time (MT)</SelectItem>
                <SelectItem value="America/Los_Angeles">Pacific Time (PT)</SelectItem>
                <SelectItem value="Europe/London">London (GMT)</SelectItem>
                <SelectItem value="Europe/Paris">Paris (CET)</SelectItem>
                <SelectItem value="Asia/Tokyo">Tokyo (JST)</SelectItem>
                <SelectItem value="Asia/Singapore">Singapore (SGT)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="dateFormat">Date Format</Label>
              <Select
                value={preferences.dateFormat}
                onValueChange={(val) => updatePreference("dateFormat", val)}
              >
                <SelectTrigger id="dateFormat">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                  <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                  <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="currency">Currency Display</Label>
              <Select
                value={preferences.currencyDisplay}
                onValueChange={(val) => updatePreference("currencyDisplay", val)}
              >
                <SelectTrigger id="currency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD ($)</SelectItem>
                  <SelectItem value="EUR">EUR (€)</SelectItem>
                  <SelectItem value="GBP">GBP (£)</SelectItem>
                  <SelectItem value="JPY">JPY (¥)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saveMutation.isPending}>
          {saveMutation.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Save Preferences
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
