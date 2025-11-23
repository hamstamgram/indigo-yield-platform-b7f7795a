import { describe, it, expect, vi } from '@jest/globals';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import AppLogo from '@/components/AppLogo';

describe('AppLogo', () => {
  it('should render without crashing', () => {
    render(<AppLogo />);
    expect(screen.getByTestId('applogo')).toBeInTheDocument();
  });

  it('should apply custom className', () => {
    render(<AppLogo className="custom-class" />);
    expect(screen.getByTestId('applogo')).toHaveClass('custom-class');
  });

  it('should handle props correctly', () => {
    const props = { testProp: 'test-value' };
    render(<AppLogo {...props} />);
    expect(screen.getByTestId('applogo')).toBeInTheDocument();
  });

  it('should be accessible', () => {
    const { container } = render(<AppLogo />);
    expect(container.querySelector('[role]')).toBeInTheDocument();
  });
});
