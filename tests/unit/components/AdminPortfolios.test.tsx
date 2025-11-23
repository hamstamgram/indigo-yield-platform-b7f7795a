import { describe, it, expect, vi } from '@jest/globals';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import AdminPortfolios from '@/components/admin/AdminPortfolios';

describe('AdminPortfolios', () => {
  it('should render without crashing', () => {
    render(<AdminPortfolios />);
    expect(screen.getByTestId('adminportfolios')).toBeInTheDocument();
  });

  it('should apply custom className', () => {
    render(<AdminPortfolios className="custom-class" />);
    expect(screen.getByTestId('adminportfolios')).toHaveClass('custom-class');
  });

  it('should handle props correctly', () => {
    const props = { testProp: 'test-value' };
    render(<AdminPortfolios {...props} />);
    expect(screen.getByTestId('adminportfolios')).toBeInTheDocument();
  });

  it('should be accessible', () => {
    const { container } = render(<AdminPortfolios />);
    expect(container.querySelector('[role]')).toBeInTheDocument();
  });
});
