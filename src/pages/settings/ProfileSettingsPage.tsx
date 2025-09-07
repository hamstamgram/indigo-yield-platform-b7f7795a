import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const ProfileSettingsPage = () => {
  return (
    <div className="font-['Space_Grotesk']">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Profile Settings</h1>
        <p className="text-gray-500 dark:text-gray-400">Manage your personal information</p>
      </div>

      <Card className="border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <CardHeader>
          <CardTitle>Personal Information</CardTitle>
          <CardDescription>Update your name, timezone, and other details</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500 dark:text-gray-400">Profile settings coming soon...</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProfileSettingsPage;
