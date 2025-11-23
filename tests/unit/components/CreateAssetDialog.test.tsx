import { describe, it, expect, vi } from '@jest/globals';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import CreateAssetDialog from '@/components/admin/assets/CreateAssetDialog';

describe('CreateAssetDialog', () => {
  it('should render without crashing', () => {
    render(<CreateAssetDialog />);
    expect(screen.getByTestId('createassetdialog')).toBeInTheDocument();
  });

  it('should apply custom className', () => {
    render(<CreateAssetDialog className="custom-class" />);
    expect(screen.getByTestId('createassetdialog')).toHaveClass('custom-class');
  });

  it('should handle props correctly', () => {
    const props = { testProp: 'test-value' };
    render(<CreateAssetDialog {...props} />);
    expect(screen.getByTestId('createassetdialog')).toBeInTheDocument();
  });

  it('should be accessible', () => {
    const { container } = render(<CreateAssetDialog />);
    expect(container.querySelector('[role]')).toBeInTheDocument();
  });
});
