import { describe, it, expect, vi } from '@jest/globals';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import CryptoIcons from '@/components/CryptoIcons';

describe('CryptoIcons', () => {
  it('should render without crashing', () => {
    render(<CryptoIcons />);
    expect(screen.getByTestId('cryptoicons')).toBeInTheDocument();
  });

  it('should apply custom className', () => {
    render(<CryptoIcons className="custom-class" />);
    expect(screen.getByTestId('cryptoicons')).toHaveClass('custom-class');
  });

  it('should handle props correctly', () => {
    const props = { testProp: 'test-value' };
    render(<CryptoIcons {...props} />);
    expect(screen.getByTestId('cryptoicons')).toBeInTheDocument();
  });

  it('should be accessible', () => {
    const { container } = render(<CryptoIcons />);
    expect(container.querySelector('[role]')).toBeInTheDocument();
  });
});
