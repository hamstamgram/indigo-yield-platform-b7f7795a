import { useState, useEffect } from "react";
import { useToast } from "@/hooks";
import { AlertTriangle, Moon, Sun, Settings } from "lucide-react";
import { PageHeader } from "@/components/layout";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import ProfileTab from "@/components/account/ProfileTab";
import SecurityTab from "@/components/account/SecurityTab";
import NotificationsTab from "@/components/account/NotificationsTab";
import { useAuth } from "@/lib/auth/context";
import {
  useInvestorProfileData,
  useUserPreferences,
  useSaveUserPreferences,
  type UserSettings,
} from "@/hooks/data/useInvestorPortal";

const SETTINGS_KEY = "indigo_user_settings";

const defaultSettings: UserSettings = {
  theme: "system",
  language: "en",
  reduceAnimations: false,
  hidePortfolioValues: false,
  dashboardTimeframe: "7d",
};

const AccountPage = () => {
  const { user } = useAuth();
  const [settings, setSettings] = useState<UserSettings>(defaultSettings);
  const { toast } = useToast();

  const { data: profile, isLoading: loading, error: profileError } = useInvestorProfileData();
  const { data: dbPreferences } = useUserPreferences();
  const savePreferencesMutation = useSaveUserPreferences();

  const error = profileError ? (profileError as Error).message : null;

  // Load settings on mount
  useEffect(() => {
    const loadSettings = () => {
      // Load from localStorage first for immediate display
      const localSettings = localStorage.getItem(SETTINGS_KEY);
      if (localSettings) {
        try {
          setSettings({ ...defaultSettings, ...JSON.parse(localSettings) });
        } catch (e) {
          console.error("Failed to parse local settings:", e);
        }
      }

      // Then sync with database if available
      if (dbPreferences) {
        setSettings((prev) => ({ ...prev, ...dbPreferences }));
      }
    };

    loadSettings();
  }, [dbPreferences]);

  // Apply theme whenever it changes
  useEffect(() => {
    const root = document.documentElement;
    if (settings.theme === "dark") {
      root.classList.add("dark");
    } else if (settings.theme === "light") {
      root.classList.remove("dark");
    } else {
      // System preference
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      root.classList.toggle("dark", prefersDark);
    }
  }, [settings.theme]);

  const handleSaveSettings = async () => {
    try {
      // Save to localStorage for immediate persistence
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));

      // Save to database for cross-device sync
      if (user) {
        await savePreferencesMutation.mutateAsync(settings);
      }

      toast({
        title: "Settings saved",
        description: "Your preferences have been updated.",
      });
    } catch (error) {
      console.error("Failed to save settings:", error);
      toast({
        title: "Error",
        description: "Failed to save settings. Please try again.",
        variant: "destructive",
      });
    }
  };

  const updateSetting = <K extends keyof UserSettings>(key: K, value: UserSettings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
          <p className="text-sm text-muted-foreground">Loading your profile...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-3xl mx-auto">
        <Alert variant="destructive" className="mb-8">
          <AlertTriangle className="h-5 w-5" />
          <AlertTitle>Error loading profile</AlertTitle>
          <AlertDescription>
            {error}
            <div className="mt-4">
              <Button onClick={() => window.location.reload()}>Try Again</Button>
            </div>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Account" icon={Settings} />

      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="mb-4 bg-muted">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="appearance">Appearance</TabsTrigger>
          <TabsTrigger value="preferences">Preferences</TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <ProfileTab profile={profile || null} loading={loading} />
        </TabsContent>

        <TabsContent value="security">
          <SecurityTab />
        </TabsContent>

        <TabsContent value="notifications">
          <NotificationsTab />
        </TabsContent>

        <TabsContent value="appearance">
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="text-xl">Appearance</CardTitle>
              <CardDescription>Customize how the dashboard looks</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="theme" className="text-sm font-medium">
                  Theme
                </Label>
                <div className="grid grid-cols-3 gap-2">
                  <Button
                    variant={settings.theme === "light" ? "primary" : "outline"}
                    className="justify-start"
                    onClick={() => updateSetting("theme", "light")}
                  >
                    <Sun className="h-4 w-4 mr-2" />
                    Light
                  </Button>
                  <Button
                    variant={settings.theme === "dark" ? "primary" : "outline"}
                    className="justify-start"
                    onClick={() => updateSetting("theme", "dark")}
                  >
                    <Moon className="h-4 w-4 mr-2" />
                    Dark
                  </Button>
                  <Button
                    variant={settings.theme === "system" ? "primary" : "outline"}
                    className="justify-start"
                    onClick={() => updateSetting("theme", "system")}
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    System
                  </Button>
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label htmlFor="language" className="text-sm font-medium">
                  Language
                </Label>
                <Select
                  value={settings.language}
                  onValueChange={(v) => updateSetting("language", v)}
                >
                  <SelectTrigger id="language" className="w-full sm:w-[280px]">
                    <SelectValue placeholder="Select language" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="es">Español</SelectItem>
                    <SelectItem value="fr">Français</SelectItem>
                    <SelectItem value="de">Deutsch</SelectItem>
                    <SelectItem value="zh">中文</SelectItem>
                    <SelectItem value="ja">日本語</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-sm font-medium">Reduce Animations</Label>
                  <p className="text-sm text-muted-foreground">
                    Minimize animations for better performance
                  </p>
                </div>
                <Switch
                  checked={settings.reduceAnimations}
                  onCheckedChange={(checked) => updateSetting("reduceAnimations", checked)}
                />
              </div>

              <Button
                className="w-full sm:w-auto"
                onClick={handleSaveSettings}
                disabled={savePreferencesMutation.isPending}
              >
                {savePreferencesMutation.isPending ? "Saving..." : "Save Appearance Settings"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preferences">
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="text-xl">Preferences</CardTitle>
              <CardDescription>Customize your investment dashboard experience</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">Dashboard Timeframe</h3>
                  <p className="text-sm text-muted-foreground">
                    Default timeframe for analytics
                  </p>
                </div>
                <Select
                  value={settings.dashboardTimeframe}
                  onValueChange={(v) => updateSetting("dashboardTimeframe", v)}
                >
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Select timeframe" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="24h">24 Hours</SelectItem>
                    <SelectItem value="7d">7 Days</SelectItem>
                    <SelectItem value="30d">30 Days</SelectItem>
                    <SelectItem value="90d">90 Days</SelectItem>
                    <SelectItem value="1y">1 Year</SelectItem>
                    <SelectItem value="all">All Time</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">Hide Portfolio Values</h3>
                  <p className="text-sm text-muted-foreground">
                    Mask your portfolio values for privacy
                  </p>
                </div>
                <Switch
                  checked={settings.hidePortfolioValues}
                  onCheckedChange={(checked) => updateSetting("hidePortfolioValues", checked)}
                />
              </div>

              <Button
                className="w-full sm:w-auto"
                onClick={handleSaveSettings}
                disabled={savePreferencesMutation.isPending}
              >
                {savePreferencesMutation.isPending ? "Saving..." : "Save Preferences"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AccountPage;
