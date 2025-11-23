import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const NotificationSettingsPage = () => {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Notification Settings</h1>
        <p className="text-gray-500 dark:text-gray-400">Manage your email preferences</p>
      </div>

      <Card className="border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <CardHeader>
          <CardTitle>Email Preferences</CardTitle>
          <CardDescription>Control when and how you receive emails</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500 dark:text-gray-400">Notification settings coming soon...</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default NotificationSettingsPage;
