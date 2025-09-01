import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const AdminInvestorNewPage = () => {
  return (
    <div className="font-['Space_Grotesk']">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Create New Investor</h1>
        <p className="text-gray-500 dark:text-gray-400">Invite a new investor to the platform</p>
      </div>

      <Card className="border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <CardHeader>
          <CardTitle>Investor Invitation</CardTitle>
          <CardDescription>Create and send an invitation to a new investor</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500 dark:text-gray-400">New investor creation coming soon...</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminInvestorNewPage;
