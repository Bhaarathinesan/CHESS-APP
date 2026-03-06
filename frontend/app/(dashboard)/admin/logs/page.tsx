'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

interface SystemLog {
  id: string;
  level: 'ERROR' | 'WARN' | 'INFO' | 'DEBUG';
  message: string;
  context?: string;
  metadata?: any;
  stackTrace?: string;
  userId?: string;
  ipAddress?: string;
  method?: string;
  url?: string;
  statusCode?: number;
  responseTime?: number;
  createdAt: string;
}

interface LogStatistics {
  errorCount: number;
  warnCount: number;
  infoCount: number;
  debugCount: number;
  totalCount: number;
}

export default function AdminLogsPage() {
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [statistics, setStatistics] = useState<LogStatistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [level, setLevel] = useState<string>('');
  const [context, setContext] = useState<string>('');
  const [search, setSearch] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Selected log for details
  const [selectedLog, setSelectedLog] = useState<SystemLog | null>(null);

  useEffect(() => {
    fetchLogs();
    fetchStatistics();
  }, [level, context, search, startDate, endDate, page]);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (level) params.append('level', level);
      if (context) params.append('context', context);
      if (search) params.append('search', search);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      params.append('page', page.toString());
      params.append('limit', '50');

      const response = await fetch(`/api/admin/logs?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch logs');
      }

      const data = await response.json();
      setLogs(data.logs);
      setTotalPages(data.totalPages);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch logs');
    } finally {
      setLoading(false);
    }
  };

  const fetchStatistics = async () => {
    try {
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const response = await fetch(
        `/api/admin/logs/statistics?${params.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        },
      );

      if (!response.ok) {
        throw new Error('Failed to fetch statistics');
      }

      const data = await response.json();
      setStatistics(data);
    } catch (err) {
      console.error('Failed to fetch statistics:', err);
    }
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'ERROR':
        return 'text-red-600 bg-red-100 dark:bg-red-900/20';
      case 'WARN':
        return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/20';
      case 'INFO':
        return 'text-blue-600 bg-blue-100 dark:bg-blue-900/20';
      case 'DEBUG':
        return 'text-gray-600 bg-gray-100 dark:bg-gray-900/20';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const clearFilters = () => {
    setLevel('');
    setContext('');
    setSearch('');
    setStartDate('');
    setEndDate('');
    setPage(1);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">System Logs & Monitoring</h1>
      </div>

      {/* Statistics Cards */}
      {statistics && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card className="p-4">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Total Logs
            </div>
            <div className="text-2xl font-bold">{statistics.totalCount}</div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-red-600">Errors</div>
            <div className="text-2xl font-bold text-red-600">
              {statistics.errorCount}
            </div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-yellow-600">Warnings</div>
            <div className="text-2xl font-bold text-yellow-600">
              {statistics.warnCount}
            </div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-blue-600">Info</div>
            <div className="text-2xl font-bold text-blue-600">
              {statistics.infoCount}
            </div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-gray-600">Debug</div>
            <div className="text-2xl font-bold text-gray-600">
              {statistics.debugCount}
            </div>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Level</label>
            <select
              value={level}
              onChange={(e) => setLevel(e.target.value)}
              className="w-full px-3 py-2 border rounded-md dark:bg-gray-800 dark:border-gray-700"
            >
              <option value="">All Levels</option>
              <option value="ERROR">Error</option>
              <option value="WARN">Warning</option>
              <option value="INFO">Info</option>
              <option value="DEBUG">Debug</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Context</label>
            <Input
              value={context}
              onChange={(e) => setContext(e.target.value)}
              placeholder="e.g., HTTP, Auth"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Search</label>
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search message..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Start Date</label>
            <Input
              type="datetime-local"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">End Date</label>
            <Input
              type="datetime-local"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>

          <div className="flex items-end">
            <Button onClick={clearFilters} variant="secondary" className="w-full">
              Clear Filters
            </Button>
          </div>
        </div>
      </Card>

      {/* Logs Table */}
      <Card>
        {loading ? (
          <div className="p-8 text-center">Loading logs...</div>
        ) : error ? (
          <div className="p-8 text-center text-red-600">{error}</div>
        ) : logs.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No logs found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Time
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Level
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Context
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Message
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Details
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {logs.map((log) => (
                  <tr
                    key={log.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-800"
                  >
                    <td className="px-4 py-3 text-sm whitespace-nowrap">
                      {formatDate(log.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-1 text-xs font-semibold rounded ${getLevelColor(log.level)}`}
                      >
                        {log.level}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">{log.context || '-'}</td>
                    <td className="px-4 py-3 text-sm max-w-md truncate">
                      {log.message}
                    </td>
                    <td className="px-4 py-3">
                      <Button
                        onClick={() => setSelectedLog(log)}
                        variant="secondary"
                        size="sm"
                      >
                        View
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-2 p-4 border-t dark:border-gray-700">
            <Button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              variant="secondary"
              size="sm"
            >
              Previous
            </Button>
            <span className="text-sm">
              Page {page} of {totalPages}
            </span>
            <Button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              variant="secondary"
              size="sm"
            >
              Next
            </Button>
          </div>
        )}
      </Card>

      {/* Log Details Modal */}
      {selectedLog && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          onClick={() => setSelectedLog(null)}
        >
          <Card
            className="max-w-4xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 space-y-4">
              <div className="flex justify-between items-start">
                <h2 className="text-xl font-bold">Log Details</h2>
                <Button
                  onClick={() => setSelectedLog(null)}
                  variant="secondary"
                  size="sm"
                >
                  Close
                </Button>
              </div>

              <div className="space-y-3">
                <div>
                  <span className="font-semibold">Level:</span>{' '}
                  <span
                    className={`px-2 py-1 text-xs font-semibold rounded ${getLevelColor(selectedLog.level)}`}
                  >
                    {selectedLog.level}
                  </span>
                </div>

                <div>
                  <span className="font-semibold">Time:</span>{' '}
                  {formatDate(selectedLog.createdAt)}
                </div>

                {selectedLog.context && (
                  <div>
                    <span className="font-semibold">Context:</span>{' '}
                    {selectedLog.context}
                  </div>
                )}

                <div>
                  <span className="font-semibold">Message:</span>
                  <div className="mt-1 p-3 bg-gray-100 dark:bg-gray-800 rounded">
                    {selectedLog.message}
                  </div>
                </div>

                {selectedLog.method && selectedLog.url && (
                  <div>
                    <span className="font-semibold">HTTP Request:</span>
                    <div className="mt-1 p-3 bg-gray-100 dark:bg-gray-800 rounded">
                      {selectedLog.method} {selectedLog.url}
                      {selectedLog.statusCode && ` - ${selectedLog.statusCode}`}
                      {selectedLog.responseTime &&
                        ` (${selectedLog.responseTime}ms)`}
                    </div>
                  </div>
                )}

                {selectedLog.userId && (
                  <div>
                    <span className="font-semibold">User ID:</span>{' '}
                    {selectedLog.userId}
                  </div>
                )}

                {selectedLog.ipAddress && (
                  <div>
                    <span className="font-semibold">IP Address:</span>{' '}
                    {selectedLog.ipAddress}
                  </div>
                )}

                {selectedLog.metadata &&
                  Object.keys(selectedLog.metadata).length > 0 && (
                    <div>
                      <span className="font-semibold">Metadata:</span>
                      <pre className="mt-1 p-3 bg-gray-100 dark:bg-gray-800 rounded overflow-x-auto text-xs">
                        {JSON.stringify(selectedLog.metadata, null, 2)}
                      </pre>
                    </div>
                  )}

                {selectedLog.stackTrace && (
                  <div>
                    <span className="font-semibold">Stack Trace:</span>
                    <pre className="mt-1 p-3 bg-gray-100 dark:bg-gray-800 rounded overflow-x-auto text-xs">
                      {selectedLog.stackTrace}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
