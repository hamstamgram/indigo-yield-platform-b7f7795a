import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { Settings, Moon, Sun } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth/context";
import { supabase } from "@/integrations/supabase/client";

const SETTINGS_KEY = "indigo_user_settings";

interface UserSettings {
  theme: string;
  language: string;
  reduceAnimations: boolean;
  hidePortfolioValues: boolean;
  dashboardTimeframe: string;
}

const defaultSettings: UserSettings = {
  theme: "system",
  language: "en",
  reduceAnimations: false,
  hidePortfolioValues: false,
  dashboardTimeframe: "7d",
};

const SettingsPage = () => {
  const { user } = useAuth();
  const [settings, setSettings] = useState<UserSettings>(defaultSettings);
  const [saveLoading, setSaveLoading] = useState(false);
  const { toast } = useToast();

  // Load settings on mount
  useEffect(() => {
    const loadSettings = async () => {
      // Load from localStorage first for immediate display
      const localSettings = localStorage.getItem(SETTINGS_KEY);
      if (localSettings) {
        try {
          setSettings({ ...defaultSettings, ...JSON.parse(localSettings) });
        } catch (e) {
          console.error("Failed to parse local settings:", e);
        }
      }

      // Then sync with database if user is logged in
      if (user) {
        try {
          const { data } = await supabase
            .from("profiles")
            .select("preferences")
            .eq("id", user.id)
            .single();

          if (data?.preferences) {
            const dbSettings = data.preferences as Partial<UserSettings>;
            setSettings((prev) => ({ ...prev, ...dbSettings }));
          }
        } catch (error) {
          console.error("Failed to load settings from database:", error);
        }
      }
    };

    loadSettings();
  }, [user]);

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
    setSaveLoading(true);

    try {
      // Save to localStorage for immediate persistence
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));

      // Save to database for cross-device sync
      if (user) {
        const { error } = await supabase
          .from("profiles")
          .update({ preferences: settings as any })
          .eq("id", user.id);

        if (error) throw error;
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
    } finally {
      setSaveLoading(false);
    }
  };

  const updateSetting = <K extends keyof UserSettings>(key: K, value: UserSettings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-6">Settings</h1>

      <Tabs defaultValue="appearance" className="w-full">
        <TabsList className="mb-4 bg-gray-100 dark:bg-gray-800">
          <TabsTrigger value="appearance">Appearance</TabsTrigger>
          <TabsTrigger value="preferences">Preferences</TabsTrigger>
          <TabsTrigger value="developer">Developer</TabsTrigger>
        </TabsList>

        <TabsContent value="appearance">
          <Card className="border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
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
                    variant={settings.theme === "light" ? "default" : "outline"}
                    className="justify-start"
                    onClick={() => updateSetting("theme", "light")}
                  >
                    <Sun className="h-4 w-4 mr-2" />
                    Light
                  </Button>
                  <Button
                    variant={settings.theme === "dark" ? "default" : "outline"}
                    className="justify-start"
                    onClick={() => updateSetting("theme", "dark")}
                  >
                    <Moon className="h-4 w-4 mr-2" />
                    Dark
                  </Button>
                  <Button
                    variant={settings.theme === "system" ? "default" : "outline"}
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
                  <p className="text-sm text-gray-500 dark:text-gray-400">
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
                disabled={saveLoading}
              >
                {saveLoading ? "Saving..." : "Save Appearance Settings"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preferences">
          <Card className="border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
            <CardHeader>
              <CardTitle className="text-xl">Preferences</CardTitle>
              <CardDescription>Customize your investment dashboard experience</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">Dashboard Timeframe</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
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
                  <p className="text-sm text-gray-500 dark:text-gray-400">
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
                disabled={saveLoading}
              >
                {saveLoading ? "Saving..." : "Save Preferences"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SettingsPage;
