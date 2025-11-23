import type { Meta, StoryObj } from '@storybook/react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from './card';
import { Button } from './button';

const meta = {
  title: 'UI/Card',
  component: Card,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Card>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Card className="w-[380px]">
      <CardHeader>
        <CardTitle>Portfolio Summary</CardTitle>
        <CardDescription>Your investment performance overview</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Total Value</span>
            <span className="font-semibold">$125,430.00</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Monthly Return</span>
            <span className="font-semibold text-green-600">+5.2%</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">YTD Return</span>
            <span className="font-semibold text-green-600">+18.7%</span>
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <Button className="w-full">View Details</Button>
      </CardFooter>
    </Card>
  ),
};

export const Simple: Story = {
  render: () => (
    <Card className="w-[380px]">
      <CardHeader>
        <CardTitle>Simple Card</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          This is a simple card with just a title and content.
        </p>
      </CardContent>
    </Card>
  ),
};

export const WithoutFooter: Story = {
  render: () => (
    <Card className="w-[380px]">
      <CardHeader>
        <CardTitle>Transaction History</CardTitle>
        <CardDescription>Recent transactions in your portfolio</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <div>
              <p className="font-medium">Deposit</p>
              <p className="text-xs text-muted-foreground">Nov 20, 2025</p>
            </div>
            <span className="font-semibold text-green-600">+$5,000.00</span>
          </div>
          <div className="flex justify-between items-center">
            <div>
              <p className="font-medium">Dividend</p>
              <p className="text-xs text-muted-foreground">Nov 15, 2025</p>
            </div>
            <span className="font-semibold text-green-600">+$250.00</span>
          </div>
          <div className="flex justify-between items-center">
            <div>
              <p className="font-medium">Fee</p>
              <p className="text-xs text-muted-foreground">Nov 1, 2025</p>
            </div>
            <span className="font-semibold text-red-600">-$12.50</span>
          </div>
        </div>
      </CardContent>
    </Card>
  ),
};

export const Interactive: Story = {
  render: () => (
    <Card className="w-[380px] hover:shadow-lg transition-shadow cursor-pointer">
      <CardHeader>
        <CardTitle>Real Estate Portfolio</CardTitle>
        <CardDescription>Click to view details</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-sm">Current Value</span>
            <span className="font-semibold">$450,000</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm">Total Return</span>
            <span className="font-semibold text-green-600">+22.5%</span>
          </div>
        </div>
      </CardContent>
    </Card>
  ),
};

export const Grid: Story = {
  render: () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-4xl p-4">
      <Card>
        <CardHeader>
          <CardTitle>Total Portfolio Value</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold">$1,245,680.50</p>
          <p className="text-sm text-green-600">+12.5% this month</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Total Deposits</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold">$1,050,000.00</p>
          <p className="text-sm text-muted-foreground">Since inception</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Total Returns</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold">$195,680.50</p>
          <p className="text-sm text-green-600">+18.6% ROI</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Active Investments</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold">12</p>
          <p className="text-sm text-muted-foreground">Across 3 portfolios</p>
        </CardContent>
      </Card>
    </div>
  ),
};
