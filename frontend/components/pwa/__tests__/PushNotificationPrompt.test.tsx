import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PushNotificationPrompt } from '../PushNotificationPrompt';
import { usePushNotifications } from '@/hooks/usePushNotifications';

jest.mock('@/hooks/usePushNotifications');

describe('PushNotificationPrompt', () => {
  const mockSubscribe = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    jest.useFakeTimers();

    (usePushNotifications as jest.Mock).mockReturnValue({
      isSupported: true,
      permission: 'default',
      isSubscribed: false,
      isLoading: false,
      isPWA: false,
      subscribe: mockSubscribe,
    });
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('should not show prompt initially', () => {
    render(<PushNotificationPrompt />);
    expect(screen.queryByText('Enable Push Notifications')).not.toBeInTheDocument();
  });

  it('should show prompt after 10 seconds', async () => {
    render(<PushNotificationPrompt />);

    jest.advanceTimersByTime(10000);

    await waitFor(() => {
      expect(screen.getByText('Enable Push Notifications')).toBeInTheDocument();
    });
  });

  it('should not show if already subscribed', () => {
    (usePushNotifications as jest.Mock).mockReturnValue({
      isSupported: true,
      permission: 'granted',
      isSubscribed: true,
      isLoading: false,
      isPWA: false,
      subscribe: mockSubscribe,
    });

    render(<PushNotificationPrompt />);
    jest.advanceTimersByTime(10000);

    expect(screen.queryByText('Enable Push Notifications')).not.toBeInTheDocument();
  });

  it('should not show if not supported', () => {
    (usePushNotifications as jest.Mock).mockReturnValue({
      isSupported: false,
      permission: 'default',
      isSubscribed: false,
      isLoading: false,
      isPWA: false,
      subscribe: mockSubscribe,
    });

    render(<PushNotificationPrompt />);
    jest.advanceTimersByTime(10000);

    expect(screen.queryByText('Enable Push Notifications')).not.toBeInTheDocument();
  });

  it('should not show if dismissed permanently', () => {
    localStorage.setItem('push-prompt-dismissed', 'true');

    render(<PushNotificationPrompt />);
    jest.advanceTimersByTime(10000);

    expect(screen.queryByText('Enable Push Notifications')).not.toBeInTheDocument();
  });

  it('should handle enable button click', async () => {
    mockSubscribe.mockResolvedValue(true);

    render(<PushNotificationPrompt />);
    jest.advanceTimersByTime(10000);

    await waitFor(() => {
      expect(screen.getByText('Enable Push Notifications')).toBeInTheDocument();
    });

    const enableButton = screen.getByText('Enable');
    fireEvent.click(enableButton);

    await waitFor(() => {
      expect(mockSubscribe).toHaveBeenCalled();
    });
  });

  it('should handle dismiss button click', async () => {
    render(<PushNotificationPrompt />);
    jest.advanceTimersByTime(10000);

    await waitFor(() => {
      expect(screen.getByText('Enable Push Notifications')).toBeInTheDocument();
    });

    const dismissButton = screen.getByText('Later');
    fireEvent.click(dismissButton);

    await waitFor(() => {
      expect(screen.queryByText('Enable Push Notifications')).not.toBeInTheDocument();
    });
  });

  it('should handle never show button click', async () => {
    render(<PushNotificationPrompt />);
    jest.advanceTimersByTime(10000);

    await waitFor(() => {
      expect(screen.getByText('Enable Push Notifications')).toBeInTheDocument();
    });

    const neverButton = screen.getByText('Never');
    fireEvent.click(neverButton);

    await waitFor(() => {
      expect(screen.queryByText('Enable Push Notifications')).not.toBeInTheDocument();
      expect(localStorage.getItem('push-prompt-dismissed')).toBe('true');
    });
  });

  it('should show PWA message when in PWA mode', async () => {
    (usePushNotifications as jest.Mock).mockReturnValue({
      isSupported: true,
      permission: 'default',
      isSubscribed: false,
      isLoading: false,
      isPWA: true,
      subscribe: mockSubscribe,
    });

    render(<PushNotificationPrompt />);
    jest.advanceTimersByTime(10000);

    await waitFor(() => {
      expect(screen.getByText(/Perfect for PWA users!/)).toBeInTheDocument();
    });
  });

  it('should show loading state when subscribing', async () => {
    (usePushNotifications as jest.Mock).mockReturnValue({
      isSupported: true,
      permission: 'default',
      isSubscribed: false,
      isLoading: true,
      isPWA: false,
      subscribe: mockSubscribe,
    });

    render(<PushNotificationPrompt />);
    jest.advanceTimersByTime(10000);

    await waitFor(() => {
      expect(screen.getByText('Enabling...')).toBeInTheDocument();
    });
  });
});
