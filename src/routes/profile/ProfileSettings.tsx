import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import OverviewTab from "@/components/profile/OverviewTab";
import PersonalInfoTab from "@/components/profile/PersonalInfoTab";
import PreferencesTab from "@/components/profile/PreferencesTab";
import PrivacyTab from "@/components/profile/PrivacyTab";

export default function ProfileSettings() {
  const [activeTab, setActiveTab] = useState("overview");

  return (
    <div className="container max-w-7xl mx-auto px-4 py-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Profile & Settings</h1>
        <p className="text-muted-foreground mt-2">
          Manage your account settings, personal information, and preferences
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="personal-info">Personal Info</TabsTrigger>
          <TabsTrigger value="preferences">Preferences</TabsTrigger>
          <TabsTrigger value="privacy">Privacy</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <OverviewTab onTabChange={setActiveTab} />
        </TabsContent>

        <TabsContent value="personal-info">
          <PersonalInfoTab />
        </TabsContent>

        <TabsContent value="preferences">
          <PreferencesTab />
        </TabsContent>

        <TabsContent value="privacy">
          <PrivacyTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
