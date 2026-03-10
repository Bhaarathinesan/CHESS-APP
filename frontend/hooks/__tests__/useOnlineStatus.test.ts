import { renderHook, act, waitFor } from '@testing-library/react';
import { useOnlineStatus } from '../useOnlineStatus';
import { vi } from 'vitest';

describe('useOnlineStatus', () => {
  let onlineGetter: any;

  beforeEach(() => {
    // Mock navigator.onLine
    onlineGetter = vi.spyOn(navigator, 'onLine', 'get');
    onlineGetter.mockReturnValue(true);
  });

  afterEach(() => {
    onlineGetter.mockRestore();
  });

  it('should return online status initially', () => {
    const { result } = renderHook(() => useOnlineStatus());

    expect(result.current.isOnline).toBe(true);
    expect(result.current.isOffline).toBe(false);
    expect(result.current.wasOffline).toBe(false);
  });

  it('should detect offline status', () => {
    onlineGetter.mockReturnValue(false);

    const { result } = renderHook(() => useOnlineStatus());

    expect(result.current.isOnline).toBe(false);
    expect(result.current.isOffline).toBe(true);
  });

  it('should update status when going offline', () => {
    const { result } = renderHook(() => useOnlineStatus());

    expect(result.current.isOnline).toBe(true);

    // Simulate going offline
    act(() => {
      window.dispatchEvent(new Event('offline'));
    });

    expect(result.current.isOnline).toBe(false);
    expect(result.current.isOffline).toBe(true);
  });

  it('should update status when going online', () => {
    onlineGetter.mockReturnValue(false);
    const { result } = renderHook(() => useOnlineStatus());

    expect(result.current.isOnline).toBe(false);

    // Simulate going online
    onlineGetter.mockReturnValue(true);
    act(() => {
      window.dispatchEvent(new Event('online'));
    });

    expect(result.current.isOnline).toBe(true);
    expect(result.current.isOffline).toBe(false);
    expect(result.current.wasOffline).toBe(true);
  });

  it('should reset wasOffline after 5 seconds', async () => {
    vi.useFakeTimers();
    onlineGetter.mockReturnValue(false);
    const { result } = renderHook(() => useOnlineStatus());

    // Go online
    onlineGetter.mockReturnValue(true);
    act(() => {
      window.dispatchEvent(new Event('online'));
    });

    expect(result.current.wasOffline).toBe(true);

    // Fast-forward 5 seconds and run all timers
    await act(async () => {
      vi.advanceTimersByTime(5000);
      await vi.runAllTimersAsync();
    });

    expect(result.current.wasOffline).toBe(false);

    vi.useRealTimers();
  });

  it('should clean up event listeners on unmount', () => {
    const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');
    const { unmount } = renderHook(() => useOnlineStatus());

    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith('online', expect.any(Function));
    expect(removeEventListenerSpy).toHaveBeenCalledWith('offline', expect.any(Function));

    removeEventListenerSpy.mockRestore();
  });
});
