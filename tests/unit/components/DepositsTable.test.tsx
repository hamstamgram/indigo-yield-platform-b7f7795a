import { describe, it, expect, vi } from '@jest/globals';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import DepositsTable from '@/components/admin/deposits/DepositsTable';

describe('DepositsTable', () => {
  it('should render without crashing', () => {
    render(<DepositsTable />);
    expect(screen.getByTestId('depositstable')).toBeInTheDocument();
  });

  it('should apply custom className', () => {
    render(<DepositsTable className="custom-class" />);
    expect(screen.getByTestId('depositstable')).toHaveClass('custom-class');
  });

  it('should handle props correctly', () => {
    const props = { testProp: 'test-value' };
    render(<DepositsTable {...props} />);
    expect(screen.getByTestId('depositstable')).toBeInTheDocument();
  });

  it('should be accessible', () => {
    const { container } = render(<DepositsTable />);
    expect(container.querySelector('[role]')).toBeInTheDocument();
  });
});
