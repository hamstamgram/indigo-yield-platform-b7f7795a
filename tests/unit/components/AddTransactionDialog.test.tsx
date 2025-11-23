import { describe, it, expect, vi } from '@jest/globals';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import AddTransactionDialog from '@/components/admin/AddTransactionDialog';

describe('AddTransactionDialog', () => {
  it('should render without crashing', () => {
    render(<AddTransactionDialog />);
    expect(screen.getByTestId('addtransactiondialog')).toBeInTheDocument();
  });

  it('should apply custom className', () => {
    render(<AddTransactionDialog className="custom-class" />);
    expect(screen.getByTestId('addtransactiondialog')).toHaveClass('custom-class');
  });

  it('should handle props correctly', () => {
    const props = { testProp: 'test-value' };
    render(<AddTransactionDialog {...props} />);
    expect(screen.getByTestId('addtransactiondialog')).toBeInTheDocument();
  });

  it('should be accessible', () => {
    const { container } = render(<AddTransactionDialog />);
    expect(container.querySelector('[role]')).toBeInTheDocument();
  });
});
