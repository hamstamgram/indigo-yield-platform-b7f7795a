import { describe, it, expect, vi } from '@jest/globals';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import SentryTestButton from '@/components/SentryTestButton';

describe('SentryTestButton', () => {
  it('should render without crashing', () => {
    render(<SentryTestButton />);
    expect(screen.getByTestId('sentrytestbutton')).toBeInTheDocument();
  });

  it('should apply custom className', () => {
    render(<SentryTestButton className="custom-class" />);
    expect(screen.getByTestId('sentrytestbutton')).toHaveClass('custom-class');
  });

  it('should handle props correctly', () => {
    const props = { testProp: 'test-value' };
    render(<SentryTestButton {...props} />);
    expect(screen.getByTestId('sentrytestbutton')).toBeInTheDocument();
  });

  it('should be accessible', () => {
    const { container } = render(<SentryTestButton />);
    expect(container.querySelector('[role]')).toBeInTheDocument();
  });
});
