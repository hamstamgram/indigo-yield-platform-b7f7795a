import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const AdminStatementsPage = () => {
  return (
    <div className="font-['Space_Grotesk']">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Statement Management</h1>
        <p className="text-gray-500 dark:text-gray-400">Generate and manage investor statements</p>
      </div>

      <Card className="border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <CardHeader>
          <CardTitle>Monthly Statements</CardTitle>
          <CardDescription>Generate and track statement delivery</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500 dark:text-gray-400">Statement management coming soon...</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminStatementsPage;
