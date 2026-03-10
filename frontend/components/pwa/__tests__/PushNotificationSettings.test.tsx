import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PushNotificationSettings } from '../PushNotificationSettings';
import { usePushNotifications } from '@/hooks/usePushNotifications';

jest.mock('@/hooks/usePushNotifications');

describe('PushNotificationSettings', () => {
  const mockSubscribe = jest.fn();
  const mockUnsubscribe = jest.fn();
  const mockTestNotification = jest.fn();
  const mockTestServerPush = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    (usePushNotifications as jest.Mock).mockReturnValue({
      isSupported: true,
      permission: 'default',
      isSubscribed: false,
      isLoading: false,
      isPWA: false,
      subscribe: mockSubscribe,
      unsubscribe: mockUnsubscribe,
      testNotification: mockTestNotification,
      testServerPush: mockTestServerPush,
    });
  });

  it('should render settings component', () => {
    render(<PushNotificationSettings />);
    expect(screen.getByText('Push Notifications')).toBeInTheDocument();
    expect(screen.getByText('Receive notifications about game events')).toBeInTheDocument();
  });

  it('should show not supported message when not supported', () => {
    (usePushNotifications as jest.Mock).mockReturnValue({
      isSupported: false,
      permission: 'default',
      isSubscribed: false,
      isLoading: false,
      isPWA: false,
      subscribe: mockSubscribe,
      unsubscribe: mockUnsubscribe,
      testNotification: mockTestNotification,
      testServerPush: mockTestServerPush,
    });

    render(<PushNotificationSettings />);
    expect(screen.getByText('Push Notifications Not Supported')).toBeInTheDocument();
  });

  it('should show correct status for default permission', () => {
    render(<PushNotificationSettings />);
    expect(screen.getByText('○ Not Requested')).toBeInTheDocument();
  });

  it('should show correct status for granted permission and subscribed', () => {
    (usePushNotifications as jest.Mock).mockReturnValue({
      isSupported: true,
      permission: 'granted',
      isSubscribed: true,
      isLoading: false,
      isPWA: false,
      subscribe: mockSubscribe,
      unsubscribe: mockUnsubscribe,
      testNotification: mockTestNotification,
      testServerPush: mockTestServerPush,
    });

    render(<PushNotificationSettings />);
    expect(screen.getByText('✓ Enabled')).toBeInTheDocument();
  });

  it('should show correct status for denied permission', () => {
    (usePushNotifications as jest.Mock).mockReturnValue({
      isSupported: true,
      permission: 'denied',
      isSubscribed: false,
      isLoading: false,
      isPWA: false,
      subscribe: mockSubscribe,
      unsubscribe: mockUnsubscribe,
      testNotification: mockTestNotification,
      testServerPush: mockTestServerPush,
    });

    render(<PushNotificationSettings />);
    expect(screen.getByText('✗ Blocked')).toBeInTheDocument();
    expect(screen.getByText(/Notifications are blocked/)).toBeInTheDocument();
  });

  it('should show PWA badge when in PWA mode', () => {
    (usePushNotifications as jest.Mock).mockReturnValue({
      isSupported: true,
      permission: 'default',
      isSubscribed: false,
      isLoading: false,
      isPWA: true,
      subscribe: mockSubscribe,
      unsubscribe: mockUnsubscribe,
      testNotification: mockTestNotification,
      testServerPush: mockTestServerPush,
    });

    render(<PushNotificationSettings />);
    expect(screen.getByText('PWA')).toBeInTheDocument();
  });

  it('should handle enable notifications click', async () => {
    mockSubscribe.mockResolvedValue(true);

    render(<PushNotificationSettings />);

    const enableButton = screen.getByText('Enable Notifications');
    fireEvent.click(enableButton);

    await waitFor(() => {
      expect(mockSubscribe).toHaveBeenCalled();
    });
  });

  it('should handle disable notifications click', async () => {
    (usePushNotifications as jest.Mock).mockReturnValue({
      isSupported: true,
      permission: 'granted',
      isSubscribed: true,
      isLoading: false,
      isPWA: false,
      subscribe: mockSubscribe,
      unsubscribe: mockUnsubscribe,
      testNotification: mockTestNotification,
      testServerPush: mockTestServerPush,
    });

    mockUnsubscribe.mockResolvedValue(true);

    render(<PushNotificationSettings />);

    const disableButton = screen.getByText('Disable Notifications');
    fireEvent.click(disableButton);

    await waitFor(() => {
      expect(mockUnsubscribe).toHaveBeenCalled();
    });
  });

  it('should handle test local notification click', async () => {
    (usePushNotifications as jest.Mock).mockReturnValue({
      isSupported: true,
      permission: 'granted',
      isSubscribed: false,
      isLoading: false,
      isPWA: false,
      subscribe: mockSubscribe,
      unsubscribe: mockUnsubscribe,
      testNotification: mockTestNotification,
      testServerPush: mockTestServerPush,
    });

    render(<PushNotificationSettings />);

    const testButton = screen.getByText('Test Local');
    fireEvent.click(testButton);

    expect(mockTestNotification).toHaveBeenCalled();

    await waitFor(() => {
      expect(screen.getByText('Sent!')).toBeInTheDocument();
    });
  });

  it('should handle test server push click', async () => {
    (usePushNotifications as jest.Mock).mockReturnValue({
      isSupported: true,
      permission: 'granted',
      isSubscribed: true,
      isLoading: false,
      isPWA: false,
      subscribe: mockSubscribe,
      unsubscribe: mockUnsubscribe,
      testNotification: mockTestNotification,
      testServerPush: mockTestServerPush,
    });

    mockTestServerPush.mockResolvedValue(true);

    render(<PushNotificationSettings />);

    const testButton = screen.getByText('Test Server Push');
    fireEvent.click(testButton);

    await waitFor(() => {
      expect(mockTestServerPush).toHaveBeenCalled();
    });
  });

  it('should show loading state', () => {
    (usePushNotifications as jest.Mock).mockReturnValue({
      isSupported: true,
      permission: 'default',
      isSubscribed: false,
      isLoading: true,
      isPWA: false,
      subscribe: mockSubscribe,
      unsubscribe: mockUnsubscribe,
      testNotification: mockTestNotification,
      testServerPush: mockTestServerPush,
    });

    render(<PushNotificationSettings />);
    expect(screen.getByText('Processing...')).toBeInTheDocument();
  });

  it('should not show enable button when permission is denied', () => {
    (usePushNotifications as jest.Mock).mockReturnValue({
      isSupported: true,
      permission: 'denied',
      isSubscribed: false,
      isLoading: false,
      isPWA: false,
      subscribe: mockSubscribe,
      unsubscribe: mockUnsubscribe,
      testNotification: mockTestNotification,
      testServerPush: mockTestServerPush,
    });

    render(<PushNotificationSettings />);
    expect(screen.queryByText('Enable Notifications')).not.toBeInTheDocument();
  });
});
