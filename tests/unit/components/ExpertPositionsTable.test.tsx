import { describe, it, expect, vi } from '@jest/globals';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import ExpertPositionsTable from '@/components/admin/expert/ExpertPositionsTable';

describe('ExpertPositionsTable', () => {
  it('should render without crashing', () => {
    render(<ExpertPositionsTable />);
    expect(screen.getByTestId('expertpositionstable')).toBeInTheDocument();
  });

  it('should apply custom className', () => {
    render(<ExpertPositionsTable className="custom-class" />);
    expect(screen.getByTestId('expertpositionstable')).toHaveClass('custom-class');
  });

  it('should handle props correctly', () => {
    const props = { testProp: 'test-value' };
    render(<ExpertPositionsTable {...props} />);
    expect(screen.getByTestId('expertpositionstable')).toBeInTheDocument();
  });

  it('should be accessible', () => {
    const { container } = render(<ExpertPositionsTable />);
    expect(container.querySelector('[role]')).toBeInTheDocument();
  });
});
