import { render, screen, waitFor, act } from '@testing-library/react';
import { OfflineIndicator } from '../OfflineIndicator';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { vi } from 'vitest';

// Mock the useOnlineStatus hook
vi.mock('@/hooks/useOnlineStatus');

const mockUseOnlineStatus = useOnlineStatus as any;

describe('OfflineIndicator', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('should not render when online and never was offline', () => {
    mockUseOnlineStatus.mockReturnValue({
      isOnline: true,
      isOffline: false,
      wasOffline: false,
    });

    const { container } = render(<OfflineIndicator />);
    expect(container.firstChild).toBeNull();
  });

  it('should render offline message when offline', () => {
    mockUseOnlineStatus.mockReturnValue({
      isOnline: false,
      isOffline: true,
      wasOffline: false,
    });

    render(<OfflineIndicator />);
    
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText(/you are offline/i)).toBeInTheDocument();
  });

  it('should render reconnected message when back online', () => {
    mockUseOnlineStatus.mockReturnValue({
      isOnline: true,
      isOffline: false,
      wasOffline: true,
    });

    render(<OfflineIndicator />);
    
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText(/back online/i)).toBeInTheDocument();
  });

  it('should hide reconnected message after 3 seconds', async () => {
    mockUseOnlineStatus.mockReturnValue({
      isOnline: true,
      isOffline: false,
      wasOffline: true,
    });

    const { unmount } = render(<OfflineIndicator />);
    
    expect(screen.getByText(/back online/i)).toBeInTheDocument();

    // Fast-forward 3 seconds - the component sets internal state to hide
    await act(async () => {
      vi.advanceTimersByTime(3100);
    });

    // The component should have hidden itself
    expect(screen.queryByText(/back online/i)).not.toBeInTheDocument();

    unmount();
  }, 10000);

  it('should have proper accessibility attributes', () => {
    mockUseOnlineStatus.mockReturnValue({
      isOnline: false,
      isOffline: true,
      wasOffline: false,
    });

    render(<OfflineIndicator />);
    
    const alert = screen.getByRole('alert');
    expect(alert).toHaveAttribute('aria-live', 'polite');
  });

  it('should apply correct styling for offline state', () => {
    mockUseOnlineStatus.mockReturnValue({
      isOnline: false,
      isOffline: true,
      wasOffline: false,
    });

    render(<OfflineIndicator />);
    
    const alert = screen.getByRole('alert');
    expect(alert).toHaveClass('bg-yellow-600');
  });

  it('should apply correct styling for online state', () => {
    mockUseOnlineStatus.mockReturnValue({
      isOnline: true,
      isOffline: false,
      wasOffline: true,
    });

    render(<OfflineIndicator />);
    
    const alert = screen.getByRole('alert');
    expect(alert).toHaveClass('bg-green-600');
  });
});
