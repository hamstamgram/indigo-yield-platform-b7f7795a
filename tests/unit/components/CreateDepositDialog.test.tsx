import { describe, it, expect, vi } from '@jest/globals';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import CreateDepositDialog from '@/components/admin/deposits/CreateDepositDialog';

describe('CreateDepositDialog', () => {
  it('should render without crashing', () => {
    render(<CreateDepositDialog />);
    expect(screen.getByTestId('createdepositdialog')).toBeInTheDocument();
  });

  it('should apply custom className', () => {
    render(<CreateDepositDialog className="custom-class" />);
    expect(screen.getByTestId('createdepositdialog')).toHaveClass('custom-class');
  });

  it('should handle props correctly', () => {
    const props = { testProp: 'test-value' };
    render(<CreateDepositDialog {...props} />);
    expect(screen.getByTestId('createdepositdialog')).toBeInTheDocument();
  });

  it('should be accessible', () => {
    const { container } = render(<CreateDepositDialog />);
    expect(container.querySelector('[role]')).toBeInTheDocument();
  });
});
