'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/Card';

interface DashboardMetrics {
  userMetrics: {
    totalUsers: number;
    dailyActiveUsers: number;
    weeklyActiveUsers: number;
    monthlyActiveUsers: number;
    newRegistrations: number;
  };
  gameMetrics: {
    totalGames: number;
    averageDuration: number;
    popularTimeControls: {
      timeControl: string;
      count: number;
      percentage: number;
    }[];
  };
  usageMetrics: {
    peakUsageHours: {
      hour: number;
      count: number;
    }[];
    tournamentParticipationRate: number;
  };
  serverMetrics: {
    uptime: number;
    memoryUsage: {
      used: number;
      total: number;
      percentage: number;
    };
    cpuUsage: number;
  };
}

export default function AdminDashboardPage() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboardMetrics();
  }, []);

  const fetchDashboardMetrics = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/dashboard', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch dashboard metrics');
      }

      const data = await response.json();
      setMetrics(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const formatUptime = (seconds: number): string => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${days}d ${hours}h ${minutes}m`;
  };

  const formatDuration = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}m ${secs}s`;
  };

  const handleExport = async (type: 'users' | 'analytics', format: 'csv' | 'pdf') => {
    try {
      setExporting(`${type}-${format}`);
      
      const response = await fetch(`/api/admin/export/${type}/${format}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to export ${type} as ${format.toUpperCase()}`);
      }

      const data = await response.json();
      
      // Decode base64 and create download
      const binaryString = atob(data.data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      const blob = new Blob([bytes], { type: data.contentType });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = data.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Export failed');
    } finally {
      setExporting(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading dashboard...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-red-500">Error: {error}</div>
      </div>
    );
  }

  if (!metrics) {
    return null;
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold mb-6">Admin Dashboard</h1>

      {/* User Metrics */}
      <section>
        <h2 className="text-2xl font-semibold mb-4">User Metrics</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card className="p-4">
            <div className="text-sm text-gray-500">Total Users</div>
            <div className="text-3xl font-bold">{metrics.userMetrics.totalUsers.toLocaleString()}</div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-gray-500">Daily Active Users</div>
            <div className="text-3xl font-bold">{metrics.userMetrics.dailyActiveUsers.toLocaleString()}</div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-gray-500">Weekly Active Users</div>
            <div className="text-3xl font-bold">{metrics.userMetrics.weeklyActiveUsers.toLocaleString()}</div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-gray-500">Monthly Active Users</div>
            <div className="text-3xl font-bold">{metrics.userMetrics.monthlyActiveUsers.toLocaleString()}</div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-gray-500">New Registrations (30d)</div>
            <div className="text-3xl font-bold">{metrics.userMetrics.newRegistrations.toLocaleString()}</div>
          </Card>
        </div>
      </section>

      {/* Game Metrics */}
      <section>
        <h2 className="text-2xl font-semibold mb-4">Game Metrics</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="p-4">
            <div className="text-sm text-gray-500">Total Games</div>
            <div className="text-3xl font-bold">{metrics.gameMetrics.totalGames.toLocaleString()}</div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-gray-500">Average Game Duration</div>
            <div className="text-3xl font-bold">{formatDuration(metrics.gameMetrics.averageDuration)}</div>
          </Card>
        </div>

        <Card className="p-4 mt-4">
          <h3 className="text-lg font-semibold mb-3">Popular Time Controls</h3>
          <div className="space-y-2">
            {metrics.gameMetrics.popularTimeControls.map((tc) => (
              <div key={tc.timeControl} className="flex items-center justify-between">
                <span className="capitalize">{tc.timeControl.toLowerCase()}</span>
                <div className="flex items-center gap-4">
                  <span className="text-gray-500">{tc.count.toLocaleString()} games</span>
                  <span className="font-semibold">{tc.percentage}%</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </section>

      {/* Usage Metrics */}
      <section>
        <h2 className="text-2xl font-semibold mb-4">Usage Metrics</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="p-4">
            <h3 className="text-lg font-semibold mb-3">Peak Usage Hours</h3>
            <div className="space-y-2">
              {metrics.usageMetrics.peakUsageHours.map((peak, index) => (
                <div key={peak.hour} className="flex items-center justify-between">
                  <span>#{index + 1}: {peak.hour}:00</span>
                  <span className="font-semibold">{peak.count} games</span>
                </div>
              ))}
            </div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-gray-500">Tournament Participation Rate</div>
            <div className="text-3xl font-bold">{metrics.usageMetrics.tournamentParticipationRate}%</div>
            <div className="text-sm text-gray-500 mt-2">
              Percentage of users who have participated in tournaments
            </div>
          </Card>
        </div>
      </section>

      {/* Server Metrics */}
      <section>
        <h2 className="text-2xl font-semibold mb-4">Server Performance</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-4">
            <div className="text-sm text-gray-500">Server Uptime</div>
            <div className="text-2xl font-bold">{formatUptime(metrics.serverMetrics.uptime)}</div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-gray-500">Memory Usage</div>
            <div className="text-2xl font-bold">{metrics.serverMetrics.memoryUsage.percentage}%</div>
            <div className="text-sm text-gray-500 mt-1">
              {metrics.serverMetrics.memoryUsage.used} MB / {metrics.serverMetrics.memoryUsage.total} MB
            </div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-gray-500">CPU Usage</div>
            <div className="text-2xl font-bold">{metrics.serverMetrics.cpuUsage}s</div>
            <div className="text-sm text-gray-500 mt-1">Total CPU time used</div>
          </Card>
        </div>
      </section>

      {/* Data Export */}
      <section>
        <h2 className="text-2xl font-semibold mb-4">Data Export</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-3">User Data Export</h3>
            <p className="text-sm text-gray-500 mb-4">
              Export all user data including profiles, roles, and account status
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => handleExport('users', 'csv')}
                disabled={exporting === 'users-csv'}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {exporting === 'users-csv' ? 'Exporting...' : 'Export as CSV'}
              </button>
              <button
                onClick={() => handleExport('users', 'pdf')}
                disabled={exporting === 'users-pdf'}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {exporting === 'users-pdf' ? 'Exporting...' : 'Export as PDF'}
              </button>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-3">Analytics Report Export</h3>
            <p className="text-sm text-gray-500 mb-4">
              Export comprehensive analytics including user metrics, game statistics, and usage patterns
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => handleExport('analytics', 'csv')}
                disabled={exporting === 'analytics-csv'}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {exporting === 'analytics-csv' ? 'Exporting...' : 'Export as CSV'}
              </button>
              <button
                onClick={() => handleExport('analytics', 'pdf')}
                disabled={exporting === 'analytics-pdf'}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {exporting === 'analytics-pdf' ? 'Exporting...' : 'Export as PDF'}
              </button>
            </div>
          </Card>
        </div>
      </section>
    </div>
  );
}
