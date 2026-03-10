/**
 * useServiceWorker Hook Tests
 * Requirements: 21.14, 33.13
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useServiceWorker } from '../useServiceWorker';
import * as serviceWorkerLib from '@/lib/service-worker';

// Mock the service worker library
vi.mock('@/lib/service-worker');

const mockServiceWorkerLib = serviceWorkerLib as any;

describe('useServiceWorker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with loading state', () => {
    mockServiceWorkerLib.registerServiceWorker.mockResolvedValue(null);
    mockServiceWorkerLib.getServiceWorkerStatus.mockResolvedValue({
      isSupported: true,
      isRegistered: false,
      isActive: false,
      registration: null,
    });
    mockServiceWorkerLib.getCacheStorageUsage.mockResolvedValue(null);

    const { result } = renderHook(() => useServiceWorker());

    expect(result.current.isLoading).toBe(true);
  });

  it('should register service worker on mount', async () => {
    const mockStatus = {
      isSupported: true,
      isRegistered: true,
      isActive: true,
      registration: {} as ServiceWorkerRegistration,
    };

    mockServiceWorkerLib.registerServiceWorker.mockResolvedValue({} as ServiceWorkerRegistration);
    mockServiceWorkerLib.getServiceWorkerStatus.mockResolvedValue(mockStatus);
    mockServiceWorkerLib.getCacheStorageUsage.mockResolvedValue({
      usage: 1024,
      quota: 1024 * 100,
      percentage: 1,
    });

    const { result } = renderHook(() => useServiceWorker());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(mockServiceWorkerLib.registerServiceWorker).toHaveBeenCalled();
    expect(result.current.status).toEqual(mockStatus);
    expect(result.current.cacheUsage).toEqual({
      usage: 1024,
      quota: 1024 * 100,
      percentage: 1,
    });
  });

  it('should handle registration errors gracefully', async () => {
    mockServiceWorkerLib.registerServiceWorker.mockRejectedValue(new Error('Registration failed'));
    mockServiceWorkerLib.getServiceWorkerStatus.mockResolvedValue({
      isSupported: true,
      isRegistered: false,
      isActive: false,
      registration: null,
    });
    mockServiceWorkerLib.getCacheStorageUsage.mockResolvedValue(null);

    const { result } = renderHook(() => useServiceWorker());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Should not throw and should complete loading
    expect(result.current.isLoading).toBe(false);
  });

  it('should refresh status when refreshStatus is called', async () => {
    const initialStatus = {
      isSupported: true,
      isRegistered: false,
      isActive: false,
      registration: null,
    };

    const updatedStatus = {
      isSupported: true,
      isRegistered: true,
      isActive: true,
      registration: {} as ServiceWorkerRegistration,
    };

    mockServiceWorkerLib.registerServiceWorker.mockResolvedValue(null);
    mockServiceWorkerLib.getServiceWorkerStatus
      .mockResolvedValueOnce(initialStatus)
      .mockResolvedValueOnce(updatedStatus);
    mockServiceWorkerLib.getCacheStorageUsage.mockResolvedValue(null);

    const { result } = renderHook(() => useServiceWorker());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.status).toEqual(initialStatus);

    // Refresh status
    await result.current.refreshStatus();

    await waitFor(() => {
      expect(result.current.status).toEqual(updatedStatus);
    });
  });

  it('should unregister service worker', async () => {
    mockServiceWorkerLib.registerServiceWorker.mockResolvedValue({} as ServiceWorkerRegistration);
    mockServiceWorkerLib.getServiceWorkerStatus.mockResolvedValue({
      isSupported: true,
      isRegistered: true,
      isActive: true,
      registration: {} as ServiceWorkerRegistration,
    });
    mockServiceWorkerLib.getCacheStorageUsage.mockResolvedValue(null);
    mockServiceWorkerLib.unregisterServiceWorker.mockResolvedValue(true);

    const { result } = renderHook(() => useServiceWorker());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const success = await result.current.unregister();

    expect(mockServiceWorkerLib.unregisterServiceWorker).toHaveBeenCalled();
    expect(success).toBe(true);
  });

  it('should clear caches', async () => {
    mockServiceWorkerLib.registerServiceWorker.mockResolvedValue({} as ServiceWorkerRegistration);
    mockServiceWorkerLib.getServiceWorkerStatus.mockResolvedValue({
      isSupported: true,
      isRegistered: true,
      isActive: true,
      registration: {} as ServiceWorkerRegistration,
    });
    mockServiceWorkerLib.getCacheStorageUsage.mockResolvedValue({
      usage: 1024,
      quota: 1024 * 100,
      percentage: 1,
    });
    mockServiceWorkerLib.clearAllCaches.mockResolvedValue();

    const { result } = renderHook(() => useServiceWorker());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await result.current.clearCaches();

    expect(mockServiceWorkerLib.clearAllCaches).toHaveBeenCalled();
  });

  it('should update cache usage after clearing caches', async () => {
    mockServiceWorkerLib.registerServiceWorker.mockResolvedValue({} as ServiceWorkerRegistration);
    mockServiceWorkerLib.getServiceWorkerStatus.mockResolvedValue({
      isSupported: true,
      isRegistered: true,
      isActive: true,
      registration: {} as ServiceWorkerRegistration,
    });
    mockServiceWorkerLib.getCacheStorageUsage
      .mockResolvedValueOnce({
        usage: 1024,
        quota: 1024 * 100,
        percentage: 1,
      })
      .mockResolvedValueOnce({
        usage: 0,
        quota: 1024 * 100,
        percentage: 0,
      });
    mockServiceWorkerLib.clearAllCaches.mockResolvedValue();

    const { result } = renderHook(() => useServiceWorker());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.cacheUsage?.usage).toBe(1024);

    await result.current.clearCaches();

    await waitFor(() => {
      expect(result.current.cacheUsage?.usage).toBe(0);
    });
  });
});
