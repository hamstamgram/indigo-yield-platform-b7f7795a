import { describe, it, expect, vi } from '@jest/globals';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import InvestmentApprovalDialog from '@/components/admin/investments/InvestmentApprovalDialog';

describe('InvestmentApprovalDialog', () => {
  it('should render without crashing', () => {
    render(<InvestmentApprovalDialog />);
    expect(screen.getByTestId('investmentapprovaldialog')).toBeInTheDocument();
  });

  it('should apply custom className', () => {
    render(<InvestmentApprovalDialog className="custom-class" />);
    expect(screen.getByTestId('investmentapprovaldialog')).toHaveClass('custom-class');
  });

  it('should handle props correctly', () => {
    const props = { testProp: 'test-value' };
    render(<InvestmentApprovalDialog {...props} />);
    expect(screen.getByTestId('investmentapprovaldialog')).toBeInTheDocument();
  });

  it('should be accessible', () => {
    const { container } = render(<InvestmentApprovalDialog />);
    expect(container.querySelector('[role]')).toBeInTheDocument();
  });
});
