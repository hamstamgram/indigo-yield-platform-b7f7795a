import { describe, it, expect, vi } from '@jest/globals';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import DepositStats from '@/components/admin/deposits/DepositStats';

describe('DepositStats', () => {
  it('should render without crashing', () => {
    render(<DepositStats />);
    expect(screen.getByTestId('depositstats')).toBeInTheDocument();
  });

  it('should apply custom className', () => {
    render(<DepositStats className="custom-class" />);
    expect(screen.getByTestId('depositstats')).toHaveClass('custom-class');
  });

  it('should handle props correctly', () => {
    const props = { testProp: 'test-value' };
    render(<DepositStats {...props} />);
    expect(screen.getByTestId('depositstats')).toBeInTheDocument();
  });

  it('should be accessible', () => {
    const { container } = render(<DepositStats />);
    expect(container.querySelector('[role]')).toBeInTheDocument();
  });
});
