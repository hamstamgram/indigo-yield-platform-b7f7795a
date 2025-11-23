import { describe, it, expect, vi } from '@jest/globals';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import ApproveDepositDialog from '@/components/admin/deposits/ApproveDepositDialog';

describe('ApproveDepositDialog', () => {
  it('should render without crashing', () => {
    render(<ApproveDepositDialog />);
    expect(screen.getByTestId('approvedepositdialog')).toBeInTheDocument();
  });

  it('should apply custom className', () => {
    render(<ApproveDepositDialog className="custom-class" />);
    expect(screen.getByTestId('approvedepositdialog')).toHaveClass('custom-class');
  });

  it('should handle props correctly', () => {
    const props = { testProp: 'test-value' };
    render(<ApproveDepositDialog {...props} />);
    expect(screen.getByTestId('approvedepositdialog')).toBeInTheDocument();
  });

  it('should be accessible', () => {
    const { container } = render(<ApproveDepositDialog />);
    expect(container.querySelector('[role]')).toBeInTheDocument();
  });
});
