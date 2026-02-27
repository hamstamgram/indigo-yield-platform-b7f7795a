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
import { cn } from "@/lib/utils";
import { PageShell } from "@/components/layout/PageShell";

const SETTINGS_KEY = "indigo_user_settings";

const defaultSettings: UserSettings = {
  theme: "system",
  language: "en",
  reduceAnimations: false,
  hidePortfolioValues: false,
  dashboardTimeframe: "7d",
};

export default function InvestorSettingsPage() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<UserSettings>(defaultSettings);
  const { toast } = useToast();

  const { data: profile, isLoading: loading, error: profileError } = useInvestorProfileData();
  const { data: dbPreferences } = useUserPreferences();
  const savePreferencesMutation = useSaveUserPreferences();

  const error = profileError ? (profileError as Error).message : null;

  useEffect(() => {
    const loadSettings = () => {
      const localSettings = localStorage.getItem(SETTINGS_KEY);
      if (localSettings) {
        try {
          setSettings({ ...defaultSettings, ...JSON.parse(localSettings) });
        } catch (e) {
          logError("InvestorSettingsPage.loadSettings", e);
        }
      }

      if (dbPreferences) {
        setSettings((prev) => ({ ...prev, ...dbPreferences }));
      }
    };

    loadSettings();
  }, [dbPreferences]);

  // Dark theme is always forced
  useEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);

  const handleSaveSettings = async () => {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));

      if (user) {
        await savePreferencesMutation.mutateAsync(settings);
      }

      toast({
        title: "Settings saved",
        description: "Your preferences have been updated.",
      });
    } catch (error) {
      logError("InvestorSettingsPage.handleSaveSettings", error);
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
          <p className="text-sm text-muted-foreground">Loading your settings...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-3xl mx-auto p-4">
        <Alert variant="destructive">
          <AlertTriangle className="h-5 w-5" />
          <AlertTitle>Error loading settings</AlertTitle>
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
    <PageShell maxWidth="narrow">
      {/* Background Decoration */}
      <div className="fixed top-20 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-indigo-500/5 blur-[120px] pointer-events-none -z-10 rounded-full" />

      <div className="flex items-center gap-4 py-4">
        <div className="p-3 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md">
          <Settings className="h-8 w-8 text-indigo-400" />
        </div>
        <div>
          <h1 className="text-2xl font-display font-bold text-white tracking-tight">Settings</h1>
        </div>
      </div>

      <Tabs defaultValue="profile" className="w-full space-y-8">
        <TabsList className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-xl p-1 h-auto w-full md:w-auto flex-wrap justify-start">
          <TabsTrigger
            value="profile"
            className="rounded-lg data-[state=active]:bg-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-lg hover:bg-white/5 transition-all text-indigo-200/70 px-6 py-2.5"
          >
            Profile
          </TabsTrigger>
          <TabsTrigger
            value="security"
            className="rounded-lg data-[state=active]:bg-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-lg hover:bg-white/5 transition-all text-indigo-200/70 px-6 py-2.5"
          >
            Security
          </TabsTrigger>
          <TabsTrigger
            value="appearance"
            className="rounded-lg data-[state=active]:bg-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-lg hover:bg-white/5 transition-all text-indigo-200/70 px-6 py-2.5"
          >
            Appearance
          </TabsTrigger>
        </TabsList>

        <div className="glass-panel rounded-3xl border border-white/10 bg-black/40 backdrop-blur-xl shadow-2xl overflow-hidden min-h-[400px]">
          <div className="p-6 md:p-8">
            <TabsContent value="profile" className="mt-0 space-y-6">
              <ProfileTab profile={profile || null} loading={loading} />
            </TabsContent>

            <TabsContent value="security" className="mt-0 space-y-6">
              <SecurityTab />
            </TabsContent>

            <TabsContent value="appearance" className="mt-0 space-y-8">
              <div>
                <h2 className="text-xl font-bold text-white mb-1">Appearance</h2>
              </div>

              <Separator className="bg-white/10" />

              <Separator className="bg-white/10" />

              <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/5">
                <div className="space-y-0.5">
                  <Label className="text-base font-medium text-white">Reduce Animations</Label>
                  <p className="text-sm text-indigo-200/50">
                    Minimize animations for better performance
                  </p>
                </div>
                <Switch
                  checked={settings.reduceAnimations}
                  onCheckedChange={(checked) => updateSetting("reduceAnimations", checked)}
                />
              </div>

              <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/5">
                <div className="space-y-0.5">
                  <Label className="text-base font-medium text-white">Hide Portfolio Values</Label>
                  <p className="text-sm text-indigo-200/50">
                    Mask your portfolio values for privacy
                  </p>
                </div>
                <Switch
                  checked={settings.hidePortfolioValues}
                  onCheckedChange={(checked) => updateSetting("hidePortfolioValues", checked)}
                />
              </div>

              <div className="pt-4 flex justify-end">
                <Button
                  onClick={handleSaveSettings}
                  disabled={savePreferencesMutation.isPending}
                  className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold px-8 rounded-xl h-12"
                >
                  {savePreferencesMutation.isPending ? "Saving..." : "Save Preferences"}
                </Button>
              </div>
            </TabsContent>
          </div>
        </div>
      </Tabs>
    </PageShell>
  );
}
