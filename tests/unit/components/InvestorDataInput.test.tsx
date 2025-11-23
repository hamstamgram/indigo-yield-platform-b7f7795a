import { describe, it, expect, vi } from '@jest/globals';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import InvestorDataInput from '@/components/admin/InvestorDataInput';

describe('InvestorDataInput', () => {
  it('should render without crashing', () => {
    render(<InvestorDataInput />);
    expect(screen.getByTestId('investordatainput')).toBeInTheDocument();
  });

  it('should apply custom className', () => {
    render(<InvestorDataInput className="custom-class" />);
    expect(screen.getByTestId('investordatainput')).toHaveClass('custom-class');
  });

  it('should handle props correctly', () => {
    const props = { testProp: 'test-value' };
    render(<InvestorDataInput {...props} />);
    expect(screen.getByTestId('investordatainput')).toBeInTheDocument();
  });

  it('should be accessible', () => {
    const { container } = render(<InvestorDataInput />);
    expect(container.querySelector('[role]')).toBeInTheDocument();
  });
});
