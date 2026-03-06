import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import AdminDashboardPage from '../page';

// Mock fetch
global.fetch = vi.fn();

describe('AdminDashboardPage', () => {
  const mockMetrics = {
    userMetrics: {
      totalUsers: 1000,
      dailyActiveUsers: 150,
      weeklyActiveUsers: 400,
      monthlyActiveUsers: 700,
      newRegistrations: 50,
    },
    gameMetrics: {
      totalGames: 5000,
      averageDuration: 900,
      popularTimeControls: [
        { timeControl: 'BLITZ', count: 2500, percentage: 50 },
        { timeControl: 'RAPID', count: 1500, percentage: 30 },
      ],
    },
    usageMetrics: {
      peakUsageHours: [
        { hour: 19, count: 150 },
        { hour: 20, count: 140 },
      ],
      tournamentParticipationRate: 30,
    },
    serverMetrics: {
      uptime: 86400,
      memoryUsage: {
        used: 512,
        total: 1024,
        percentage: 50,
      },
      cpuUsage: 25,
    },
  };

  beforeEach(() => {
    (global.fetch as any).mockClear();
    localStorage.setItem('token', 'test-token');
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should render loading state initially', () => {
    (global.fetch as any).mockImplementation(
      () => new Promise(() => {}), // Never resolves
    );

    render(<AdminDashboardPage />);
    expect(screen.getByText('Loading dashboard...')).toBeInTheDocument();
  });

  it('should render dashboard metrics after successful fetch', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockMetrics,
    });

    render(<AdminDashboardPage />);

    await waitFor(() => {
      expect(screen.getByText('Admin Dashboard')).toBeInTheDocument();
    });

    // Check user metrics
    expect(screen.getByText('1,000')).toBeInTheDocument();
    expect(screen.getByText('150')).toBeInTheDocument();

    // Check game metrics
    expect(screen.getByText('5,000')).toBeInTheDocument();
    expect(screen.getByText('15m 0s')).toBeInTheDocument();

    // Check tournament participation rate text
    expect(screen.getByText('Tournament Participation Rate')).toBeInTheDocument();
  });

  it('should render error state on fetch failure', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
    });

    render(<AdminDashboardPage />);

    await waitFor(() => {
      expect(screen.getByText(/Error:/)).toBeInTheDocument();
    });
  });

  it('should include authorization header in fetch request', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockMetrics,
    });

    render(<AdminDashboardPage />);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/admin/dashboard',
        expect.objectContaining({
          headers: {
            Authorization: 'Bearer test-token',
          },
        }),
      );
    });
  });

  it('should display time control data', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockMetrics,
    });

    render(<AdminDashboardPage />);

    await waitFor(() => {
      expect(screen.getByText('blitz')).toBeInTheDocument();
      expect(screen.getByText('rapid')).toBeInTheDocument();
      expect(screen.getByText('2,500 games')).toBeInTheDocument();
    });
  });

  it('should format uptime correctly', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockMetrics,
    });

    render(<AdminDashboardPage />);

    await waitFor(() => {
      expect(screen.getByText('1d 0h 0m')).toBeInTheDocument();
    });
  });
});
