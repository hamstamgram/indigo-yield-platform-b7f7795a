import { useState, useEffect } from "react";
import { useToast } from "@/hooks";
import { AlertTriangle, Moon, Sun, Settings } from "lucide-react";
import { PageHeader } from "@/components/layout";
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Button,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Switch,
  Separator,
  Label,
} from "@/components/ui";
import ProfileTab from "@/components/account/ProfileTab";
import SecurityTab from "@/components/account/SecurityTab";
import { useAuth } from "@/services/auth";
import {
  useInvestorProfileData,
  useUserPreferences,
  useSaveUserPreferences,
  type UserSettings,
} from "@/hooks/data";
import { logError } from "@/lib/logger";
import { PageShell } from "@/components/layout/PageShell";

const SETTINGS_KEY = "indigo_user_settings";

const defaultSettings: UserSettings = {
  theme: "system",
  language: "en",
  timezone: "UTC",
  emailNotifications: true,
  marketingEmails: false,
  twoFactorEnabled: false,
  currency: "USD",
  reduceAnimations: false,
  hidePortfolioValues: false,
  dashboardTimeframe: "7d",
};

export default function InvestorSettingsPage() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<UserSettings>(defaultSettings);
  const { toast } = useToast();

  const { data: profile, isLoading: isLoadingProfile } = useInvestorProfileData();
  const { data: dbPrefs } = useUserPreferences();
  const savePrefsMutation = useSaveUserPreferences();

  // Initialize from DB if available, otherwise localStorage
  useEffect(() => {
    if (dbPrefs) {
      setSettings(dbPrefs);
    } else {
      const saved = localStorage.getItem(SETTINGS_KEY);
      if (saved) {
        try {
          setSettings(JSON.parse(saved));
        } catch (e) {
          logError("settings.parse", e);
        }
      }
    }
  }, [dbPrefs]);

  const updateSetting = (key: keyof UserSettings, value: any) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);

    // Optimistically save to localStorage
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(newSettings));

    // Persist to database
    savePrefsMutation.mutate(newSettings, {
      onError: () => {
        toast({
          title: "Failed to save preferences",
          description: "Your settings were saved locally but not synced to the cloud.",
          variant: "destructive",
        });
      }
    });
  };

  const isDark = settings.theme === "dark" || (settings.theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);

  return (
    <PageShell>
      <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <PageHeader
          title="Account Settings"
          subtitle="Manage your profile, security, and application preferences."
          icon={Settings}
        />

        <Tabs defaultValue="profile" className="w-full">
          <TabsList className="bg-white/5 border border-white/10 p-1 mb-8 w-fit">
            <TabsTrigger value="profile" className="px-6 data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400">
              Profile
            </TabsTrigger>
            <TabsTrigger value="preferences" className="px-6 data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400">
              Preferences
            </TabsTrigger>
            <TabsTrigger value="security" className="px-6 data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400">
              Security
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="space-y-6 focus-visible:outline-none focus-visible:ring-0">
            <ProfileTab profile={profile || null} loading={isLoadingProfile} />
          </TabsContent>

          <TabsContent value="preferences" className="space-y-6 focus-visible:outline-none focus-visible:ring-0">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="bg-card/30 backdrop-blur-md border-white/5 shadow-2xl">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {isDark ? <Moon className="h-5 w-5 text-emerald-400" /> : <Sun className="h-5 w-5 text-emerald-400" />}
                    Appearance
                  </CardTitle>
                  <CardDescription>
                    Customize the look and feel of the platform.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Theme</Label>
                      <p className="text-xs text-muted-foreground">Select your preferred color scheme.</p>
                    </div>
                    <select
                      value={settings.theme}
                      onChange={(e) => updateSetting("theme", e.target.value)}
                      className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-emerald-500/50"
                    >
                      <option value="light">Light</option>
                      <option value="dark">Dark</option>
                      <option value="system">System</option>
                    </select>
                  </div>
                  <Separator className="bg-white/5" />
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Reduce Animations</Label>
                      <p className="text-xs text-muted-foreground">Minimize motion for a faster feel.</p>
                    </div>
                    <Switch
                      checked={settings.reduceAnimations}
                      onCheckedChange={(checked) => updateSetting("reduceAnimations", checked)}
                    />
                  </div>
                  <Separator className="bg-white/5" />
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Privacy Mode</Label>
                      <p className="text-xs text-muted-foreground">Hide sensitive balances by default.</p>
                    </div>
                    <Switch
                      checked={settings.hidePortfolioValues}
                      onCheckedChange={(checked) => updateSetting("hidePortfolioValues", checked)}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card/30 backdrop-blur-md border-white/5 shadow-2xl">
                <CardHeader>
                  <CardTitle>Regional & Display</CardTitle>
                  <CardDescription>
                    Set your preferred language and reporting timeframes.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Language</Label>
                      <p className="text-xs text-muted-foreground">The platform will use this language.</p>
                    </div>
                    <select
                      value={settings.language}
                      onChange={(e) => updateSetting("language", e.target.value)}
                      className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-emerald-500/50"
                    >
                      <option value="en">English (US)</option>
                      <option value="en-GB">English (UK)</option>
                      <option value="de">German</option>
                    </select>
                  </div>
                  <Separator className="bg-white/5" />
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Default View</Label>
                      <p className="text-xs text-muted-foreground">Default timeframe for dashboard charts.</p>
                    </div>
                    <select
                      value={settings.dashboardTimeframe}
                      onChange={(e) => updateSetting("dashboardTimeframe", e.target.value)}
                      className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-emerald-500/50"
                    >
                      <option value="7d">Last 7 Days</option>
                      <option value="30d">Last 30 Days</option>
                      <option value="90d">Last Quarter</option>
                      <option value="ytd">Year to Date</option>
                    </select>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="security" className="space-y-6 focus-visible:outline-none focus-visible:ring-0">
            <SecurityTab />
          </TabsContent>
        </Tabs>
      </div>
    </PageShell>
  );
}
