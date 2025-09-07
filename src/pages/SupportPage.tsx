import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const SupportPage = () => {
  return (
    <div className="font-['Space_Grotesk']">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Support</h1>
        <p className="text-gray-500 dark:text-gray-400">Get help and create support tickets</p>
      </div>

      <Card className="border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <CardHeader>
          <CardTitle>Support Tickets</CardTitle>
          <CardDescription>Create and manage your support requests</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500 dark:text-gray-400">Support functionality coming soon...</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default SupportPage;
