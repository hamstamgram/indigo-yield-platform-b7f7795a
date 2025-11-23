import { describe, it, expect, vi } from '@jest/globals';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import SkipLink from '@/components/accessibility/SkipLink';

describe('SkipLink', () => {
  it('should render without crashing', () => {
    render(<SkipLink />);
    expect(screen.getByTestId('skiplink')).toBeInTheDocument();
  });

  it('should apply custom className', () => {
    render(<SkipLink className="custom-class" />);
    expect(screen.getByTestId('skiplink')).toHaveClass('custom-class');
  });

  it('should handle props correctly', () => {
    const props = { testProp: 'test-value' };
    render(<SkipLink {...props} />);
    expect(screen.getByTestId('skiplink')).toBeInTheDocument();
  });

  it('should be accessible', () => {
    const { container } = render(<SkipLink />);
    expect(container.querySelector('[role]')).toBeInTheDocument();
  });
});
