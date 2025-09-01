import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const AdminYieldSettingsPage = () => {
  return (
    <div className="font-['Space_Grotesk']">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Yield Settings</h1>
        <p className="text-gray-500 dark:text-gray-400">Manage APR settings for each asset</p>
      </div>

      <Card className="border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <CardHeader>
          <CardTitle>Asset Yield Rates</CardTitle>
          <CardDescription>Configure annual percentage rates for each supported asset</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500 dark:text-gray-400">Yield settings management coming soon...</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminYieldSettingsPage;
