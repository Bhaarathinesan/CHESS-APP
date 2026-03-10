import { renderHook, act, waitFor } from '@testing-library/react';
import { usePWAInstall } from '../usePWAInstall';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

/**
 * Tests for usePWAInstall hook
 * Requirements: 21.15
 */

describe('usePWAInstall', () => {
  let mockPrompt: ReturnType<typeof vi.fn>;
  let mockUserChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;

  beforeEach(() => {
    // Clear localStorage
    localStorage.clear();

    // Mock prompt and userChoice
    mockPrompt = vi.fn();
    mockUserChoice = Promise.resolve({ outcome: 'accepted' as const, platform: 'web' });

    // Reset window.matchMedia
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });

    // Reset navigator.userAgent
    Object.defineProperty(window.navigator, 'userAgent', {
      writable: true,
      value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/91.0.4472.124',
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Initial State', () => {
    it('should initialize with correct default state', () => {
      const { result } = renderHook(() => usePWAInstall());

      expect(result.current.isInstallable).toBe(false);
      expect(result.current.isInstalled).toBe(false);
      expect(result.current.isIOS).toBe(false);
      expect(result.current.canPrompt).toBe(false);
      expect(result.current.isDismissed).toBe(false);
    });

    it('should detect iOS devices', () => {
      Object.defineProperty(window.navigator, 'userAgent', {
        writable: true,
        value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)',
      });

      const { result } = renderHook(() => usePWAInstall());

      expect(result.current.isIOS).toBe(true);
    });

    it('should detect installed PWA (standalone mode)', () => {
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn().mockImplementation((query) => ({
          matches: query === '(display-mode: standalone)',
          media: query,
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        })),
      });

      const { result } = renderHook(() => usePWAInstall());

      expect(result.current.isInstalled).toBe(true);
    });

    it('should detect installed PWA on iOS', () => {
      Object.defineProperty(window.navigator, 'userAgent', {
        writable: true,
        value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)',
      });

      (window.navigator as any).standalone = true;

      const { result } = renderHook(() => usePWAInstall());

      expect(result.current.isInstalled).toBe(true);
    });
  });

  describe('beforeinstallprompt Event', () => {
    it('should handle beforeinstallprompt event', async () => {
      const { result } = renderHook(() => usePWAInstall());

      // Simulate beforeinstallprompt event
      const event = new Event('beforeinstallprompt') as any;
      event.prompt = mockPrompt;
      event.userChoice = mockUserChoice;
      event.preventDefault = vi.fn();

      act(() => {
        window.dispatchEvent(event);
      });

      await waitFor(() => {
        expect(result.current.isInstallable).toBe(true);
        expect(result.current.canPrompt).toBe(true);
      });
    });

    it('should not show prompt if dismissed recently', async () => {
      // Set dismissal timestamp (1 day ago)
      const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
      localStorage.setItem('pwa-install-dismissed', oneDayAgo.toString());

      const { result } = renderHook(() => usePWAInstall());

      // Simulate beforeinstallprompt event
      const event = new Event('beforeinstallprompt') as any;
      event.prompt = mockPrompt;
      event.userChoice = mockUserChoice;
      event.preventDefault = vi.fn();

      act(() => {
        window.dispatchEvent(event);
      });

      await waitFor(() => {
        expect(result.current.isInstallable).toBe(true);
        expect(result.current.canPrompt).toBe(false);
        expect(result.current.isDismissed).toBe(true);
      });
    });

    it('should show prompt if dismissal expired', async () => {
      // Set dismissal timestamp (8 days ago)
      const eightDaysAgo = Date.now() - 8 * 24 * 60 * 60 * 1000;
      localStorage.setItem('pwa-install-dismissed', eightDaysAgo.toString());

      const { result } = renderHook(() => usePWAInstall());

      // Simulate beforeinstallprompt event
      const event = new Event('beforeinstallprompt') as any;
      event.prompt = mockPrompt;
      event.userChoice = mockUserChoice;
      event.preventDefault = vi.fn();

      act(() => {
        window.dispatchEvent(event);
      });

      await waitFor(() => {
        expect(result.current.isInstallable).toBe(true);
        expect(result.current.canPrompt).toBe(true);
        expect(result.current.isDismissed).toBe(false);
      });

      // Dismissal should be cleared from localStorage
      expect(localStorage.getItem('pwa-install-dismissed')).toBeNull();
    });
  });

  describe('appinstalled Event', () => {
    it('should handle appinstalled event', async () => {
      const { result } = renderHook(() => usePWAInstall());

      // First trigger beforeinstallprompt
      const beforeEvent = new Event('beforeinstallprompt') as any;
      beforeEvent.prompt = mockPrompt;
      beforeEvent.userChoice = mockUserChoice;
      beforeEvent.preventDefault = vi.fn();

      act(() => {
        window.dispatchEvent(beforeEvent);
      });

      await waitFor(() => {
        expect(result.current.isInstallable).toBe(true);
      });

      // Then trigger appinstalled
      const installedEvent = new Event('appinstalled');

      act(() => {
        window.dispatchEvent(installedEvent);
      });

      await waitFor(() => {
        expect(result.current.isInstalled).toBe(true);
        expect(result.current.isInstallable).toBe(false);
        expect(result.current.canPrompt).toBe(false);
      });
    });
  });

  describe('promptInstall', () => {
    it('should show install prompt when available', async () => {
      const { result } = renderHook(() => usePWAInstall());

      // Simulate beforeinstallprompt event
      const event = new Event('beforeinstallprompt') as any;
      event.prompt = mockPrompt;
      event.userChoice = mockUserChoice;
      event.preventDefault = vi.fn();

      act(() => {
        window.dispatchEvent(event);
      });

      await waitFor(() => {
        expect(result.current.canPrompt).toBe(true);
      });

      // Call promptInstall
      let installResult: any;
      await act(async () => {
        installResult = await result.current.promptInstall();
      });

      expect(mockPrompt).toHaveBeenCalled();
      expect(installResult.outcome).toBe('accepted');
    });

    it('should return unavailable if prompt not available', async () => {
      const { result } = renderHook(() => usePWAInstall());

      let installResult: any;
      await act(async () => {
        installResult = await result.current.promptInstall();
      });

      expect(installResult.outcome).toBe('unavailable');
      expect(mockPrompt).not.toHaveBeenCalled();
    });

    it('should handle user dismissal', async () => {
      mockUserChoice = Promise.resolve({ outcome: 'dismissed' as const, platform: 'web' });

      const { result } = renderHook(() => usePWAInstall());

      // Simulate beforeinstallprompt event
      const event = new Event('beforeinstallprompt') as any;
      event.prompt = mockPrompt;
      event.userChoice = mockUserChoice;
      event.preventDefault = vi.fn();

      act(() => {
        window.dispatchEvent(event);
      });

      await waitFor(() => {
        expect(result.current.canPrompt).toBe(true);
      });

      // Call promptInstall
      let installResult: any;
      await act(async () => {
        installResult = await result.current.promptInstall();
      });

      expect(mockPrompt).toHaveBeenCalled();
      expect(installResult.outcome).toBe('dismissed');
      expect(result.current.canPrompt).toBe(false);
    });

    it('should handle errors gracefully', async () => {
      const { result } = renderHook(() => usePWAInstall());

      // Simulate beforeinstallprompt event with error
      const event = new Event('beforeinstallprompt') as any;
      event.prompt = vi.fn().mockRejectedValue(new Error('Prompt failed'));
      event.userChoice = mockUserChoice;
      event.preventDefault = vi.fn();

      act(() => {
        window.dispatchEvent(event);
      });

      await waitFor(() => {
        expect(result.current.canPrompt).toBe(true);
      });

      // Call promptInstall
      let installResult: any;
      await act(async () => {
        installResult = await result.current.promptInstall();
      });

      expect(installResult.outcome).toBe('error');
    });
  });

  describe('dismissPrompt', () => {
    it('should dismiss prompt and store timestamp', async () => {
      const { result } = renderHook(() => usePWAInstall());

      // Simulate beforeinstallprompt event
      const event = new Event('beforeinstallprompt') as any;
      event.prompt = mockPrompt;
      event.userChoice = mockUserChoice;
      event.preventDefault = vi.fn();

      act(() => {
        window.dispatchEvent(event);
      });

      await waitFor(() => {
        expect(result.current.canPrompt).toBe(true);
      });

      // Dismiss prompt
      act(() => {
        result.current.dismissPrompt();
      });

      expect(result.current.canPrompt).toBe(false);
      expect(result.current.isDismissed).toBe(true);
      expect(localStorage.getItem('pwa-install-dismissed')).toBeTruthy();
    });
  });

  describe('resetDismissal', () => {
    it('should reset dismissal state', async () => {
      const { result } = renderHook(() => usePWAInstall());

      // Set dismissal
      localStorage.setItem('pwa-install-dismissed', Date.now().toString());

      // Simulate beforeinstallprompt event
      const event = new Event('beforeinstallprompt') as any;
      event.prompt = mockPrompt;
      event.userChoice = mockUserChoice;
      event.preventDefault = vi.fn();

      act(() => {
        window.dispatchEvent(event);
      });

      await waitFor(() => {
        expect(result.current.isDismissed).toBe(true);
      });

      // Reset dismissal
      act(() => {
        result.current.resetDismissal();
      });

      expect(result.current.isDismissed).toBe(false);
      expect(localStorage.getItem('pwa-install-dismissed')).toBeNull();
    });
  });
});

