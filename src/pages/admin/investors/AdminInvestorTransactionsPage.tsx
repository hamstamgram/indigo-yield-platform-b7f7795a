import { useParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const AdminInvestorTransactionsPage = () => {
  const { id } = useParams();
  
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Transaction Management</h1>
        <p className="text-gray-500 dark:text-gray-400">Manage transactions for investor #{id}</p>
      </div>

      <Card className="border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
          <CardDescription>View and add manual transactions</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500 dark:text-gray-400">Transaction management coming soon...</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminInvestorTransactionsPage;
