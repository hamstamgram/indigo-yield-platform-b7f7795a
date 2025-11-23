import { describe, it, expect, vi } from '@jest/globals';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import InvestorSearch from '@/components/admin/InvestorSearch';

describe('InvestorSearch', () => {
  it('should render without crashing', () => {
    render(<InvestorSearch />);
    expect(screen.getByTestId('investorsearch')).toBeInTheDocument();
  });

  it('should apply custom className', () => {
    render(<InvestorSearch className="custom-class" />);
    expect(screen.getByTestId('investorsearch')).toHaveClass('custom-class');
  });

  it('should handle props correctly', () => {
    const props = { testProp: 'test-value' };
    render(<InvestorSearch {...props} />);
    expect(screen.getByTestId('investorsearch')).toBeInTheDocument();
  });

  it('should be accessible', () => {
    const { container } = render(<InvestorSearch />);
    expect(container.querySelector('[role]')).toBeInTheDocument();
  });
});
