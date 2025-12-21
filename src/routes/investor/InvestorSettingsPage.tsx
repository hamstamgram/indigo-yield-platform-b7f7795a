import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { AlertTriangle, Moon, Sun, Settings } from "lucide-react";
import PageHeader from "@/components/layout/PageHeader";
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

interface Profile {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  totp_enabled: boolean;
  totp_verified: boolean;
  avatar_url: string | null;
}

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

export default function InvestorSettingsPage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [settings, setSettings] = useState<UserSettings>(defaultSettings);
  const [saveLoading, setSaveLoading] = useState(false);
  const { toast } = useToast();

  const fetchProfile = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("User not authenticated");
      }

      const minimalProfile: Profile = {
        id: user.id,
        email: user.email || "",
        first_name: null,
        last_name: null,
        phone: null,
        totp_enabled: false,
        totp_verified: false,
        avatar_url: null,
      };

      setProfile(minimalProfile);

      try {
        const { data: profileData, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .maybeSingle();

        if (error) {
          console.error("Error fetching profile:", error);
        } else if (profileData) {
          setProfile({
            id: profileData.id,
            email: profileData.email,
            first_name: profileData.first_name,
            last_name: profileData.last_name,
            phone: profileData.phone,
            totp_enabled: profileData.totp_enabled || false,
            totp_verified: profileData.totp_verified || false,
            avatar_url: profileData.avatar_url,
          });
        }
      } catch (profileError) {
        console.error("Profile fetch error:", profileError);
      }
    } catch (authError) {
      const errorMessage = authError instanceof Error ? authError.message : "Failed to load profile";
      console.error("Authentication error:", authError);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const loadSettings = async () => {
      const localSettings = localStorage.getItem(SETTINGS_KEY);
      if (localSettings) {
        try {
          setSettings({ ...defaultSettings, ...JSON.parse(localSettings) });
        } catch (e) {
          console.error("Failed to parse local settings:", e);
        }
      }

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

  useEffect(() => {
    const root = document.documentElement;
    if (settings.theme === "dark") {
      root.classList.add("dark");
    } else if (settings.theme === "light") {
      root.classList.remove("dark");
    } else {
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      root.classList.toggle("dark", prefersDark);
    }
  }, [settings.theme]);

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleSaveSettings = async () => {
    setSaveLoading(true);

    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));

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
    <div className="space-y-6 max-w-4xl mx-auto pb-20 px-4 md:px-6 lg:px-0">
      <PageHeader title="Settings" icon={Settings} />

      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="mb-4 bg-muted">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="appearance">Appearance</TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <ProfileTab profile={profile} loading={loading} />
        </TabsContent>

        <TabsContent value="security">
          <SecurityTab />
        </TabsContent>

        <TabsContent value="notifications">
          <NotificationsTab />
        </TabsContent>

        <TabsContent value="appearance">
          <Card>
            <CardHeader>
              <CardTitle>Appearance</CardTitle>
              <CardDescription>Customize how the dashboard looks</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Theme</Label>
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

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-sm font-medium">Hide Portfolio Values</Label>
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
                onClick={handleSaveSettings}
                disabled={saveLoading}
              >
                {saveLoading ? "Saving..." : "Save Settings"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
