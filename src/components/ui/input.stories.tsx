import type { Meta, StoryObj } from '@storybook/react';
import { Input } from './input';
import { Label } from './label';
import { SearchIcon, MailIcon, LockIcon } from 'lucide-react';

const meta = {
  title: 'UI/Input',
  component: Input,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    type: {
      control: 'select',
      options: ['text', 'email', 'password', 'number', 'tel', 'url', 'search'],
    },
    disabled: {
      control: 'boolean',
    },
  },
} satisfies Meta<typeof Input>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    placeholder: 'Enter text...',
  },
};

export const WithLabel: Story = {
  render: () => (
    <div className="space-y-2 w-[300px]">
      <Label htmlFor="email">Email</Label>
      <Input
        id="email"
        type="email"
        placeholder="you@example.com"
      />
    </div>
  ),
};

export const Email: Story = {
  args: {
    type: 'email',
    placeholder: 'you@example.com',
  },
};

export const Password: Story = {
  args: {
    type: 'password',
    placeholder: 'Enter password',
  },
};

export const Number: Story = {
  args: {
    type: 'number',
    placeholder: '0.00',
    min: '0',
    step: '0.01',
  },
};

export const Disabled: Story = {
  args: {
    placeholder: 'Disabled input',
    disabled: true,
    value: 'Cannot edit this',
  },
};

export const WithIcon: Story = {
  render: () => (
    <div className="w-[300px] space-y-4">
      <div className="relative">
        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          className="pl-10"
          placeholder="Search..."
        />
      </div>

      <div className="relative">
        <MailIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          className="pl-10"
          type="email"
          placeholder="Email address"
        />
      </div>

      <div className="relative">
        <LockIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          className="pl-10"
          type="password"
          placeholder="Password"
        />
      </div>
    </div>
  ),
};

export const FormExample: Story = {
  render: () => (
    <form className="w-[400px] space-y-4">
      <div className="space-y-2">
        <Label htmlFor="amount">Investment Amount</Label>
        <Input
          id="amount"
          type="number"
          placeholder="10000.00"
          min="1000"
          step="0.01"
        />
        <p className="text-xs text-muted-foreground">
          Minimum investment: $1,000
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="portfolio">Portfolio Name</Label>
        <Input
          id="portfolio"
          type="text"
          placeholder="My Portfolio"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notes (Optional)</Label>
        <Input
          id="notes"
          type="text"
          placeholder="Add any notes..."
        />
      </div>
    </form>
  ),
};

export const Validation: Story = {
  render: () => (
    <div className="w-[300px] space-y-4">
      <div className="space-y-2">
        <Label htmlFor="valid">Valid Input</Label>
        <Input
          id="valid"
          className="border-green-500 focus-visible:ring-green-500"
          placeholder="john@example.com"
          defaultValue="john@example.com"
        />
        <p className="text-xs text-green-600">Email is valid</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="invalid">Invalid Input</Label>
        <Input
          id="invalid"
          className="border-red-500 focus-visible:ring-red-500"
          placeholder="john@example.com"
          defaultValue="invalid-email"
        />
        <p className="text-xs text-red-600">Please enter a valid email</p>
      </div>
    </div>
  ),
};
