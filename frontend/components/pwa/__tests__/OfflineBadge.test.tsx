import { render, screen } from '@testing-library/react';
import { OfflineBadge } from '../OfflineBadge';

describe('OfflineBadge', () => {
  it('should render cached badge', () => {
    render(<OfflineBadge />);

    expect(screen.getByText('Cached')).toBeInTheDocument();
  });

  it('should have proper accessibility attributes', () => {
    render(<OfflineBadge />);

    const badge = screen.getByRole('status');
    expect(badge).toHaveAttribute('aria-label', 'Viewing cached data');
  });

  it('should apply custom className', () => {
    const { container } = render(<OfflineBadge className="custom-class" />);

    const badge = container.firstChild;
    expect(badge).toHaveClass('custom-class');
  });

  it('should render clock icon', () => {
    const { container } = render(<OfflineBadge />);

    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });

  it('should have proper styling', () => {
    const { container } = render(<OfflineBadge />);

    const badge = container.firstChild;
    expect(badge).toHaveClass('bg-yellow-100');
    expect(badge).toHaveClass('text-yellow-800');
  });
});
