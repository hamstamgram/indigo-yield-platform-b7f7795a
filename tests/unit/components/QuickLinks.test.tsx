import { describe, it, expect, vi } from '@jest/globals';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import QuickLinks from '@/components/admin/QuickLinks';

describe('QuickLinks', () => {
  it('should render without crashing', () => {
    render(<QuickLinks />);
    expect(screen.getByTestId('quicklinks')).toBeInTheDocument();
  });

  it('should apply custom className', () => {
    render(<QuickLinks className="custom-class" />);
    expect(screen.getByTestId('quicklinks')).toHaveClass('custom-class');
  });

  it('should handle props correctly', () => {
    const props = { testProp: 'test-value' };
    render(<QuickLinks {...props} />);
    expect(screen.getByTestId('quicklinks')).toBeInTheDocument();
  });

  it('should be accessible', () => {
    const { container } = render(<QuickLinks />);
    expect(container.querySelector('[role]')).toBeInTheDocument();
  });
});
