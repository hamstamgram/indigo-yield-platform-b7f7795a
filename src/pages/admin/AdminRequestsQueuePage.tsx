import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const AdminRequestsQueuePage = () => {
  return (
    <div className="font-['Space_Grotesk']">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Requests Queue</h1>
        <p className="text-gray-500 dark:text-gray-400">Review and approve investor requests</p>
      </div>

      <Card className="border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <CardHeader>
          <CardTitle>Pending Requests</CardTitle>
          <CardDescription>Approve or deny deposit and withdrawal requests</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500 dark:text-gray-400">Request queue management coming soon...</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminRequestsQueuePage;
