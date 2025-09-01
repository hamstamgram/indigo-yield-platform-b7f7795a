import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const WithdrawalsPage = () => {
  return (
    <div className="font-['Space_Grotesk']">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Withdrawals</h1>
        <p className="text-gray-500 dark:text-gray-400">Request withdrawals from your portfolio</p>
      </div>

      <Card className="border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <CardHeader>
          <CardTitle>Withdrawal Requests</CardTitle>
          <CardDescription>Submit a request to withdraw funds</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500 dark:text-gray-400">Withdrawal functionality coming soon...</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default WithdrawalsPage;
