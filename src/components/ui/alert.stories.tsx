import type { Meta, StoryObj } from '@storybook/react';
import { Alert, AlertTitle, AlertDescription } from './alert';
import { InfoIcon, AlertCircleIcon, CheckCircleIcon, AlertTriangleIcon } from 'lucide-react';

const meta = {
  title: 'UI/Alert',
  component: Alert,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'destructive'],
    },
  },
} satisfies Meta<typeof Alert>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Alert className="w-[500px]">
      <InfoIcon className="h-4 w-4" />
      <AlertTitle>Information</AlertTitle>
      <AlertDescription>
        Your portfolio performance has been updated with the latest market data.
      </AlertDescription>
    </Alert>
  ),
};

export const Destructive: Story = {
  render: () => (
    <Alert variant="destructive" className="w-[500px]">
      <AlertCircleIcon className="h-4 w-4" />
      <AlertTitle>Error</AlertTitle>
      <AlertDescription>
        Unable to process your withdrawal request. Please try again later.
      </AlertDescription>
    </Alert>
  ),
};

export const Success: Story = {
  render: () => (
    <Alert className="w-[500px] border-green-500 bg-green-50 text-green-900 dark:bg-green-950 dark:text-green-100">
      <CheckCircleIcon className="h-4 w-4 text-green-600 dark:text-green-400" />
      <AlertTitle>Success</AlertTitle>
      <AlertDescription>
        Your deposit of $10,000 has been successfully processed.
      </AlertDescription>
    </Alert>
  ),
};

export const Warning: Story = {
  render: () => (
    <Alert className="w-[500px] border-yellow-500 bg-yellow-50 text-yellow-900 dark:bg-yellow-950 dark:text-yellow-100">
      <AlertTriangleIcon className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
      <AlertTitle>Warning</AlertTitle>
      <AlertDescription>
        Your account verification is pending. Some features may be limited.
      </AlertDescription>
    </Alert>
  ),
};

export const WithoutTitle: Story = {
  render: () => (
    <Alert className="w-[500px]">
      <InfoIcon className="h-4 w-4" />
      <AlertDescription>
        This is a simple alert without a title.
      </AlertDescription>
    </Alert>
  ),
};

export const AllVariants: Story = {
  render: () => (
    <div className="space-y-4 w-[500px]">
      <Alert>
        <InfoIcon className="h-4 w-4" />
        <AlertTitle>Information</AlertTitle>
        <AlertDescription>
          Portfolio performance updated successfully.
        </AlertDescription>
      </Alert>

      <Alert variant="destructive">
        <AlertCircleIcon className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>
          Failed to process transaction. Please try again.
        </AlertDescription>
      </Alert>

      <Alert className="border-green-500 bg-green-50 text-green-900 dark:bg-green-950 dark:text-green-100">
        <CheckCircleIcon className="h-4 w-4 text-green-600 dark:text-green-400" />
        <AlertTitle>Success</AlertTitle>
        <AlertDescription>
          Deposit processed successfully.
        </AlertDescription>
      </Alert>

      <Alert className="border-yellow-500 bg-yellow-50 text-yellow-900 dark:bg-yellow-950 dark:text-yellow-100">
        <AlertTriangleIcon className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
        <AlertTitle>Warning</AlertTitle>
        <AlertDescription>
          Account verification pending.
        </AlertDescription>
      </Alert>
    </div>
  ),
};

export const LongContent: Story = {
  render: () => (
    <Alert className="w-[500px]">
      <InfoIcon className="h-4 w-4" />
      <AlertTitle>Portfolio Rebalancing Notice</AlertTitle>
      <AlertDescription>
        Your portfolio will be automatically rebalanced on November 25, 2025.
        This process will adjust your asset allocation to match your target strategy.
        The rebalancing may result in some buy or sell transactions.
        You will receive a detailed report once the rebalancing is complete.
        No action is required from you at this time.
      </AlertDescription>
    </Alert>
  ),
};
