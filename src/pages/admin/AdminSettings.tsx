/**
 * Admin Settings Page - Platform configuration
 */

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks";
import {
  Settings,
  Bell,
  Mail,
  Shield,
  Database,
  Globe,
  Palette,
  Save,
  RefreshCw,
  Users,
  Wrench,
  FileText,
  Activity,
} from "lucide-react";
import { AdminGuard } from "@/components/admin/AdminGuard";
import { Link } from "react-router-dom";

interface PlatformSettings {
  maintenance_mode: boolean;
  allow_new_registrations: boolean;
  require_email_verification: boolean;
  enable_2fa: boolean;
  min_deposit: number;
  min_withdrawal: number;
  notification_email: string;
  support_email: string;
  platform_name: string;
}

const defaultSettings: PlatformSettings = {
  maintenance_mode: false,
  allow_new_registrations: true,
  require_email_verification: true,
  enable_2fa: false,
  min_deposit: 1000,
  min_withdrawal: 100,
  notification_email: "notifications@indigo.fund",
  support_email: "support@indigo.fund",
  platform_name: "Indigo Yield Platform",
};

function AdminSettingsContent() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [settings, setSettings] = useState<PlatformSettings>(defaultSettings);

  // Fetch platform settings from system_config table instead
  const { isLoading } = useQuery({
    queryKey: ["platform-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("system_config")
        .select("key, value")
        .eq("key", "platform_settings")
        .maybeSingle();

      if (error && error.code !== "PGRST116") {
        console.error("Error fetching settings:", error);
      }

      if (data?.value) {
        setSettings({ ...defaultSettings, ...(data.value as any) });
      }
      return data?.value || defaultSettings;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (newSettings: PlatformSettings) => {
      const { error } = await supabase.from("system_config").upsert({
        key: "platform_settings",
        value: newSettings as any,
        updated_at: new Date().toISOString(),
      });
      if (error) throw error;
      return newSettings;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["platform-settings"] });
      toast({
        title: "Settings saved",
        description: "Platform settings have been updated successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error saving settings",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    saveMutation.mutate(settings);
  };

  const quickLinks = [
    {
      title: "Admin Tools",
      description: "Database and system utilities",
      href: "/admin/settings/tools",
      icon: Wrench,
    },
    {
      title: "Admin Invites",
      description: "Invite new administrators",
      href: "/admin/settings/invites",
      icon: Users,
    },
    {
      title: "Audit Logs",
      description: "View system audit trail",
      href: "/admin/audit-logs",
      icon: FileText,
    },
    {
      title: "System Health",
      description: "Monitor service status",
      href: "/admin/system-health",
      icon: Activity,
    },
  ];

  return (
    <div className="container max-w-7xl mx-auto px-4 py-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Settings className="h-8 w-8" />
            Platform Settings
          </h1>
          <p className="text-muted-foreground mt-2">
            Configure platform-wide settings and preferences
          </p>
        </div>
        <Button onClick={handleSave} disabled={saveMutation.isPending || isLoading}>
          {saveMutation.isPending ? (
            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Save Changes
        </Button>
      </div>

      {/* Quick Links */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {quickLinks.map((link) => (
          <Link key={link.href} to={link.href}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <link.icon className="h-4 w-4 text-primary" />
                  {link.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{link.description}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <Separator />

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
          <TabsTrigger value="general" className="flex items-center gap-2">
            <Globe className="h-4 w-4" />
            General
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Security
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="limits" className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            Limits
          </TabsTrigger>
        </TabsList>

        {/* General Settings */}
        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle>General Settings</CardTitle>
              <CardDescription>Configure basic platform settings and appearance</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="platform_name">Platform Name</Label>
                <Input
                  id="platform_name"
                  value={settings.platform_name}
                  onChange={(e) => setSettings({ ...settings, platform_name: e.target.value })}
                  placeholder="Enter platform name"
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Maintenance Mode</Label>
                  <p className="text-sm text-muted-foreground">
                    Temporarily disable access for non-admin users
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {settings.maintenance_mode && <Badge variant="destructive">Active</Badge>}
                  <Switch
                    checked={settings.maintenance_mode}
                    onCheckedChange={(checked) =>
                      setSettings({ ...settings, maintenance_mode: checked })
                    }
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Allow New Registrations</Label>
                  <p className="text-sm text-muted-foreground">Allow new investors to sign up</p>
                </div>
                <Switch
                  checked={settings.allow_new_registrations}
                  onCheckedChange={(checked) =>
                    setSettings({ ...settings, allow_new_registrations: checked })
                  }
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Settings */}
        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle>Security Settings</CardTitle>
              <CardDescription>
                Configure authentication and verification requirements
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Require Email Verification</Label>
                  <p className="text-sm text-muted-foreground">
                    Users must verify email before accessing the platform
                  </p>
                </div>
                <Switch
                  checked={settings.require_email_verification}
                  onCheckedChange={(checked) =>
                    setSettings({ ...settings, require_email_verification: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Enable Two-Factor Authentication</Label>
                  <p className="text-sm text-muted-foreground">Require 2FA for all user accounts</p>
                </div>
                <div className="flex items-center gap-2">
                  {settings.enable_2fa && <Badge>Enabled</Badge>}
                  <Switch
                    checked={settings.enable_2fa}
                    onCheckedChange={(checked) => setSettings({ ...settings, enable_2fa: checked })}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notification Settings */}
        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Notification Settings</CardTitle>
              <CardDescription>Configure email addresses for notifications</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="notification_email">System Notification Email</Label>
                <Input
                  id="notification_email"
                  type="email"
                  value={settings.notification_email}
                  onChange={(e) => setSettings({ ...settings, notification_email: e.target.value })}
                  placeholder="notifications@example.com"
                />
                <p className="text-sm text-muted-foreground">
                  Email address for system alerts and notifications
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="support_email">Support Email</Label>
                <Input
                  id="support_email"
                  type="email"
                  value={settings.support_email}
                  onChange={(e) => setSettings({ ...settings, support_email: e.target.value })}
                  placeholder="support@example.com"
                />
                <p className="text-sm text-muted-foreground">
                  Email address shown to users for support inquiries
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Transaction Limits */}
        <TabsContent value="limits">
          <Card>
            <CardHeader>
              <CardTitle>Transaction Limits</CardTitle>
              <CardDescription>Configure minimum transaction amounts</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="min_deposit">Minimum Deposit (per asset)</Label>
                <Input
                  id="min_deposit"
                  type="number"
                  value={settings.min_deposit}
                  onChange={(e) =>
                    setSettings({ ...settings, min_deposit: Number(e.target.value) })
                  }
                  min={0}
                />
                <p className="text-sm text-muted-foreground">
                  Minimum amount required for deposits (applies to each asset type)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="min_withdrawal">Minimum Withdrawal (per asset)</Label>
                <Input
                  id="min_withdrawal"
                  type="number"
                  value={settings.min_withdrawal}
                  onChange={(e) =>
                    setSettings({ ...settings, min_withdrawal: Number(e.target.value) })
                  }
                  min={0}
                />
                <p className="text-sm text-muted-foreground">
                  Minimum amount required for withdrawals (applies to each asset type)
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function AdminSettings() {
  return (
    <AdminGuard>
      <AdminSettingsContent />
    </AdminGuard>
  );
}
