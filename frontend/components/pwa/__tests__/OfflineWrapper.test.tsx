import { render, screen } from '@testing-library/react';
import { OfflineWrapper } from '../OfflineWrapper';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { vi } from 'vitest';

// Mock the useOnlineStatus hook
vi.mock('@/hooks/useOnlineStatus');

const mockUseOnlineStatus = useOnlineStatus as any;

describe('OfflineWrapper', () => {
  beforeEach(() => {
    mockUseOnlineStatus.mockReturnValue({
      isOnline: true,
      isOffline: false,
      wasOffline: false,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should render children when online', () => {
    render(
      <OfflineWrapper>
        <div>Test Content</div>
      </OfflineWrapper>
    );

    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });

  it('should render children when offline but not requiring online', () => {
    mockUseOnlineStatus.mockReturnValue({
      isOnline: false,
      isOffline: true,
      wasOffline: false,
    });

    render(
      <OfflineWrapper requiresOnline={false}>
        <div>Test Content</div>
      </OfflineWrapper>
    );

    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });

  it('should show default offline message when offline and requires online', () => {
    mockUseOnlineStatus.mockReturnValue({
      isOnline: false,
      isOffline: true,
      wasOffline: false,
    });

    render(
      <OfflineWrapper requiresOnline={true}>
        <div>Test Content</div>
      </OfflineWrapper>
    );

    expect(screen.queryByText('Test Content')).not.toBeInTheDocument();
    expect(screen.getByText("You're Offline")).toBeInTheDocument();
    expect(screen.getByText(/this feature requires an internet connection/i)).toBeInTheDocument();
  });

  it('should show custom offline message', () => {
    mockUseOnlineStatus.mockReturnValue({
      isOnline: false,
      isOffline: true,
      wasOffline: false,
    });

    render(
      <OfflineWrapper
        requiresOnline={true}
        offlineMessage="Custom offline message"
      >
        <div>Test Content</div>
      </OfflineWrapper>
    );

    expect(screen.getByText('Custom offline message')).toBeInTheDocument();
  });

  it('should show custom offline fallback', () => {
    mockUseOnlineStatus.mockReturnValue({
      isOnline: false,
      isOffline: true,
      wasOffline: false,
    });

    render(
      <OfflineWrapper
        requiresOnline={true}
        offlineFallback={<div>Custom Fallback</div>}
      >
        <div>Test Content</div>
      </OfflineWrapper>
    );

    expect(screen.queryByText('Test Content')).not.toBeInTheDocument();
    expect(screen.getByText('Custom Fallback')).toBeInTheDocument();
  });

  it('should render offline icon in default message', () => {
    mockUseOnlineStatus.mockReturnValue({
      isOnline: false,
      isOffline: true,
      wasOffline: false,
    });

    const { container } = render(
      <OfflineWrapper requiresOnline={true}>
        <div>Test Content</div>
      </OfflineWrapper>
    );

    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });
});
