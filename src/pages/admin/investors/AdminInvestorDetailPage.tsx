import { useParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const AdminInvestorDetailPage = () => {
  const { id } = useParams();
  
  return (
    <div className="font-['Space_Grotesk']">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Investor Details</h1>
        <p className="text-gray-500 dark:text-gray-400">View and manage investor #{id}</p>
      </div>

      <Card className="border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <CardHeader>
          <CardTitle>Investor Information</CardTitle>
          <CardDescription>Detailed view of investor profile and activity</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500 dark:text-gray-400">Investor detail view coming soon...</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminInvestorDetailPage;
