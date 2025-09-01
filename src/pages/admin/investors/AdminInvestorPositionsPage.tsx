import { useParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const AdminInvestorPositionsPage = () => {
  const { id } = useParams();
  
  return (
    <div className="font-['Space_Grotesk']">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Position Adjustments</h1>
        <p className="text-gray-500 dark:text-gray-400">Manage positions for investor #{id}</p>
      </div>

      <Card className="border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <CardHeader>
          <CardTitle>Portfolio Positions</CardTitle>
          <CardDescription>View and adjust investor positions by asset</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500 dark:text-gray-400">Position management coming soon...</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminInvestorPositionsPage;
