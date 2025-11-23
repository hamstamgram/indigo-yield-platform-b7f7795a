import { describe, it, expect, vi } from '@jest/globals';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import WithdrawalApprovalPanel from '@/components/admin/WithdrawalApprovalPanel';

describe('WithdrawalApprovalPanel', () => {
  it('should render without crashing', () => {
    render(<WithdrawalApprovalPanel />);
    expect(screen.getByTestId('withdrawalapprovalpanel')).toBeInTheDocument();
  });

  it('should apply custom className', () => {
    render(<WithdrawalApprovalPanel className="custom-class" />);
    expect(screen.getByTestId('withdrawalapprovalpanel')).toHaveClass('custom-class');
  });

  it('should handle props correctly', () => {
    const props = { testProp: 'test-value' };
    render(<WithdrawalApprovalPanel {...props} />);
    expect(screen.getByTestId('withdrawalapprovalpanel')).toBeInTheDocument();
  });

  it('should be accessible', () => {
    const { container } = render(<WithdrawalApprovalPanel />);
    expect(container.querySelector('[role]')).toBeInTheDocument();
  });
});
