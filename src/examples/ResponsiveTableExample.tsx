import React, { useState } from 'react';
import { ResponsiveTable, PaginatedResponsiveTable, Column } from '@/components/ui/responsive-table';
import { NoTransactions } from '@/components/ui/empty-state';
import { DashboardSkeleton } from '@/components/ui/loading-skeletons';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';

interface Transaction {
  id: string;
  date: Date;
  type: 'deposit' | 'withdrawal' | 'interest';
  amount: number;
  status: 'pending' | 'completed' | 'failed';
  description: string;
  currency: string;
}

/**
 * Example implementation of ResponsiveTable with loading states and empty states
 */
export const TransactionsTableExample: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  
  // Example data
  const transactions: Transaction[] = [
    {
      id: '1',
      date: new Date('2025-09-08'),
      type: 'deposit',
      amount: 10000,
      status: 'completed',
      description: 'Initial deposit',
      currency: 'USDC'
    },
    {
      id: '2',
      date: new Date('2025-09-07'),
      type: 'interest',
      amount: 125.50,
      status: 'completed',
      description: 'Monthly interest payment',
      currency: 'USDC'
    },
    {
      id: '3',
      date: new Date('2025-09-06'),
      type: 'withdrawal',
      amount: 5000,
      status: 'pending',
      description: 'Partial withdrawal',
      currency: 'USDC'
    }
  ];

  // Define table columns with mobile priorities
  const columns: Column<Transaction>[] = [
    {
      key: 'date',
      header: 'Date',
      accessor: (row) => formatDistanceToNow(row.date, { addSuffix: true }),
      sortable: true,
      priority: 'high',
      mobileLabel: 'Date'
    },
    {
      key: 'type',
      header: 'Type',
      accessor: (row) => (
        <Badge variant={
          row.type === 'deposit' ? 'default' :
          row.type === 'withdrawal' ? 'destructive' : 
          'secondary'
        }>
          {row.type.charAt(0).toUpperCase() + row.type.slice(1)}
        </Badge>
      ),
      priority: 'high'
    },
    {
      key: 'amount',
      header: 'Amount',
      accessor: (row) => (
        <span className={row.type === 'withdrawal' ? 'text-red-600' : 'text-green-600'}>
          {row.type === 'withdrawal' ? '-' : '+'} 
          {new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
          }).format(row.amount)}
        </span>
      ),
      sortable: true,
      align: 'right',
      priority: 'high'
    },
    {
      key: 'currency',
      header: 'Currency',
      accessor: (row) => (
        <span className="font-mono text-sm">{row.currency}</span>
      ),
      priority: 'medium'
    },
    {
      key: 'status',
      header: 'Status',
      accessor: (row) => (
        <Badge 
          variant={
            row.status === 'completed' ? 'default' :
            row.status === 'pending' ? 'secondary' :
            'destructive'
          }
        >
          {row.status}
        </Badge>
      ),
      priority: 'medium'
    },
    {
      key: 'description',
      header: 'Description',
      accessor: (row) => row.description,
      priority: 'low'
    }
  ];

  // Simulate loading state
  const handleRefresh = () => {
    setLoading(true);
    setTimeout(() => setLoading(false), 2000);
  };

  // Example with loading state
  if (loading) {
    return <DashboardSkeleton />;
  }

  // Example with empty state
  if (transactions.length === 0) {
    return (
      <NoTransactions 
        onAction={() => console.log('Learn about investing')}
      />
    );
  }

  // Example with data
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Transaction History</h2>
        <button 
          onClick={handleRefresh}
          className="text-sm text-indigo-600 hover:text-indigo-700"
        >
          Refresh
        </button>
      </div>

      {/* Basic responsive table */}
      <ResponsiveTable
        data={transactions}
        columns={columns}
        keyExtractor={(row) => row.id}
        loading={loading}
        emptyState={<NoTransactions />}
        stickyHeader
        onRowClick={(row) => console.log('Clicked row:', row)}
      />

      {/* Paginated responsive table example */}
      <div className="mt-8">
        <h3 className="text-lg font-semibold mb-4">Paginated Example</h3>
        <PaginatedResponsiveTable
          data={[...transactions, ...transactions, ...transactions]} // Duplicate for pagination demo
          columns={columns}
          keyExtractor={(row) => `${row.id}`}
          pageSize={5}
          currentPage={currentPage}
          onPageChange={setCurrentPage}
          loading={loading}
          emptyState={<NoTransactions />}
        />
      </div>
    </div>
  );
};

/**
 * Implementation guide for using in existing pages
 */
export const ImplementationGuide = () => {
  return (
    <div className="prose max-w-none">
      <h2>How to Implement in Existing Pages</h2>
      
      <h3>1. Import Required Components</h3>
      <pre className="bg-gray-100 p-4 rounded">
{`import { ResponsiveTable } from '@/components/ui/responsive-table';
import { NoTransactions } from '@/components/ui/empty-state';
import { TableSkeleton } from '@/components/ui/loading-skeletons';`}
      </pre>

      <h3>2. Define Your Columns</h3>
      <pre className="bg-gray-100 p-4 rounded">
{`const columns: Column<YourDataType>[] = [
  {
    key: 'field1',
    header: 'Column Header',
    accessor: (row) => row.field1,
    priority: 'high', // Shows on mobile
    sortable: true
  },
  // ... more columns
];`}
      </pre>

      <h3>3. Replace Existing Table</h3>
      <pre className="bg-gray-100 p-4 rounded">
{`// Old table implementation
<table>...</table>

// New responsive implementation
<ResponsiveTable
  data={yourData}
  columns={columns}
  loading={isLoading}
  emptyState={<NoTransactions />}
  keyExtractor={(row) => row.id}
/>`}
      </pre>

      <h3>4. Mobile Priority Guidelines</h3>
      <ul>
        <li><strong>high</strong>: Always visible on mobile (max 3-4 columns)</li>
        <li><strong>medium</strong>: Shown in expanded view</li>
        <li><strong>low</strong>: Only shown when expanded</li>
      </ul>
    </div>
  );
};

export default TransactionsTableExample;
