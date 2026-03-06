'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';

interface Reporter {
  id: string;
  username: string;
  displayName: string;
  email: string;
}

interface ReportedUser {
  id: string;
  username: string;
  displayName: string;
  email: string;
}

interface Report {
  id: string;
  reportType: string;
  status: string;
  description: string;
  gameId: string | null;
  createdAt: string;
  reporter: Reporter;
  reportedUser: ReportedUser;
  reviewedBy?: string;
  reviewedAt?: string;
  adminNotes?: string;
}

interface ChatMessage {
  id: string;
  gameId: string;
  senderId: string;
  message: string;
  isSpectator: boolean;
  createdAt: string;
  sender: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl?: string;
  };
  reports: Array<{
    id: string;
    messageId: string;
    reporterId: string;
    reason: string;
    status: string;
  }>;
}

interface GameDetails {
  id: string;
  whitePlayerId: string;
  blackPlayerId: string;
  timeControl: string;
  status: string;
  result?: string;
  terminationReason?: string;
  pgn?: string;
  whitePlayer: {
    username: string;
    displayName: string;
  };
  blackPlayer: {
    username: string;
    displayName: string;
  };
}

interface ReportDetails extends Report {
  gameDetails?: GameDetails;
}

export default function ModerationPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedReport, setSelectedReport] = useState<ReportDetails | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [chatLogs, setChatLogs] = useState<ChatMessage[]>([]);
  const [loadingChatLogs, setLoadingChatLogs] = useState(false);
  
  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [searchUserId, setSearchUserId] = useState<string>('');
  
  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  
  // Update status
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [newStatus, setNewStatus] = useState<string>('');
  const [adminNotes, setAdminNotes] = useState<string>('');

  useEffect(() => {
    fetchReports();
  }, [page, statusFilter, typeFilter, searchUserId]);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
      });
      
      if (statusFilter) params.append('status', statusFilter);
      if (typeFilter) params.append('reportType', typeFilter);
      if (searchUserId) params.append('reportedUserId', searchUserId);

      const response = await fetch(`/api/admin/reports?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch reports');
      }

      const data = await response.json();
      setReports(data.reports);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const fetchReportDetails = async (reportId: string) => {
    try {
      const response = await fetch(`/api/admin/reports/${reportId}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch report details');
      }

      const data = await response.json();
      setSelectedReport(data);
      setNewStatus(data.status.toLowerCase());
      setAdminNotes(data.adminNotes || '');
      setShowDetailModal(true);
      
      // Fetch chat logs if this is a chat report
      if (data.gameId && data.reportType === 'inappropriate_chat') {
        fetchChatLogs(data.gameId);
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to fetch report details');
    }
  };

  const fetchChatLogs = async (gameId: string) => {
    try {
      setLoadingChatLogs(true);
      const response = await fetch(`/api/admin/reports/chat-logs/${gameId}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch chat logs');
      }

      const data = await response.json();
      setChatLogs(data.messages);
    } catch (err) {
      console.error('Failed to fetch chat logs:', err);
    } finally {
      setLoadingChatLogs(false);
    }
  };

  const handleUpdateStatus = async () => {
    if (!selectedReport) return;

    try {
      setUpdatingStatus(true);
      const response = await fetch(`/api/admin/reports/${selectedReport.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          status: newStatus,
          adminNotes: adminNotes.trim() || undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update report');
      }

      // Close modal and refresh reports
      setShowDetailModal(false);
      setSelectedReport(null);
      setChatLogs([]);
      await fetchReports();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update report');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'reviewed':
        return 'bg-blue-100 text-blue-800';
      case 'resolved':
        return 'bg-green-100 text-green-800';
      case 'dismissed':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeBadgeColor = (type: string) => {
    switch (type.toLowerCase()) {
      case 'cheating':
        return 'bg-red-100 text-red-800';
      case 'harassment':
        return 'bg-orange-100 text-orange-800';
      case 'inappropriate_chat':
        return 'bg-purple-100 text-purple-800';
      case 'other':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatReportType = (type: string) => {
    return type.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  if (loading && reports.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading reports...</div>
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

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Content Moderation</h1>
        <div className="text-sm text-gray-500">
          Total Reports: {total}
        </div>
      </div>

      {/* Filters */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Filters</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label htmlFor="status" className="block text-sm font-medium mb-1">
              Status
            </label>
            <select
              id="status"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 border rounded-md"
            >
              <option value="">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="reviewed">Reviewed</option>
              <option value="resolved">Resolved</option>
              <option value="dismissed">Dismissed</option>
            </select>
          </div>

          <div>
            <label htmlFor="type" className="block text-sm font-medium mb-1">
              Report Type
            </label>
            <select
              id="type"
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 border rounded-md"
            >
              <option value="">All Types</option>
              <option value="cheating">Cheating</option>
              <option value="harassment">Harassment</option>
              <option value="inappropriate_chat">Inappropriate Chat</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label htmlFor="search" className="block text-sm font-medium mb-1">
              Search User ID
            </label>
            <Input
              id="search"
              type="text"
              placeholder="Enter user ID..."
              value={searchUserId}
              onChange={(e) => {
                setSearchUserId(e.target.value);
                setPage(1);
              }}
            />
          </div>
        </div>

        {(statusFilter || typeFilter || searchUserId) && (
          <div className="mt-4">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setStatusFilter('');
                setTypeFilter('');
                setSearchUserId('');
                setPage(1);
              }}
            >
              Clear Filters
            </Button>
          </div>
        )}
      </Card>

      {/* Reports Table */}
      <Card className="p-6">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-4">Type</th>
                <th className="text-left py-3 px-4">Status</th>
                <th className="text-left py-3 px-4">Reporter</th>
                <th className="text-left py-3 px-4">Reported User</th>
                <th className="text-left py-3 px-4">Date</th>
                <th className="text-right py-3 px-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {reports.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-gray-500">
                    No reports found.
                  </td>
                </tr>
              ) : (
                reports.map((report) => (
                  <tr key={report.id} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <span
                        className={`inline-block px-2 py-1 rounded text-xs font-semibold ${getTypeBadgeColor(
                          report.reportType
                        )}`}
                      >
                        {formatReportType(report.reportType)}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-block px-2 py-1 rounded text-xs font-semibold ${getStatusBadgeColor(
                          report.status
                        )}`}
                      >
                        {report.status}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-sm">
                        <div className="font-medium">{report.reporter.displayName}</div>
                        <div className="text-gray-500">@{report.reporter.username}</div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-sm">
                        <div className="font-medium">{report.reportedUser.displayName}</div>
                        <div className="text-gray-500">@{report.reportedUser.username}</div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-500">
                      {new Date(report.createdAt).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => fetchReportDetails(report.id)}
                      >
                        View Details
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-6">
            <div className="text-sm text-gray-500">
              Page {page} of {totalPages}
            </div>
            <div className="flex space-x-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setPage(page - 1)}
                disabled={page === 1}
              >
                Previous
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setPage(page + 1)}
                disabled={page === totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Report Detail Modal */}
      <Modal
        isOpen={showDetailModal}
        onClose={() => {
          setShowDetailModal(false);
          setSelectedReport(null);
          setChatLogs([]);
        }}
        title="Report Details"
      >
        {selectedReport && (
          <div className="space-y-6">
            {/* Report Information */}
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium text-gray-500">Report Type</h3>
                <span
                  className={`inline-block px-2 py-1 rounded text-xs font-semibold mt-1 ${getTypeBadgeColor(
                    selectedReport.reportType
                  )}`}
                >
                  {formatReportType(selectedReport.reportType)}
                </span>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-500">Description</h3>
                <p className="mt-1 text-sm">{selectedReport.description}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Reporter</h3>
                  <div className="mt-1 text-sm">
                    <div className="font-medium">{selectedReport.reporter.displayName}</div>
                    <div className="text-gray-500">@{selectedReport.reporter.username}</div>
                    <div className="text-gray-500">{selectedReport.reporter.email}</div>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-gray-500">Reported User</h3>
                  <div className="mt-1 text-sm">
                    <div className="font-medium">{selectedReport.reportedUser.displayName}</div>
                    <div className="text-gray-500">@{selectedReport.reportedUser.username}</div>
                    <div className="text-gray-500">{selectedReport.reportedUser.email}</div>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-500">Reported Date</h3>
                <p className="mt-1 text-sm">{new Date(selectedReport.createdAt).toLocaleString()}</p>
              </div>

              {selectedReport.reviewedAt && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Reviewed Date</h3>
                  <p className="mt-1 text-sm">{new Date(selectedReport.reviewedAt).toLocaleString()}</p>
                </div>
              )}
            </div>

            {/* Game Details */}
            {selectedReport.gameDetails && (
              <div className="border-t pt-4">
                <h3 className="text-lg font-semibold mb-3">Game Details</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">White Player:</span>
                    <span className="font-medium">{selectedReport.gameDetails.whitePlayer.displayName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Black Player:</span>
                    <span className="font-medium">{selectedReport.gameDetails.blackPlayer.displayName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Time Control:</span>
                    <span className="font-medium">{selectedReport.gameDetails.timeControl}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Result:</span>
                    <span className="font-medium">{selectedReport.gameDetails.result || 'In Progress'}</span>
                  </div>
                  {selectedReport.gameDetails.terminationReason && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Termination:</span>
                      <span className="font-medium">{selectedReport.gameDetails.terminationReason}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Chat Logs */}
            {selectedReport.reportType === 'inappropriate_chat' && selectedReport.gameId && (
              <div className="border-t pt-4">
                <h3 className="text-lg font-semibold mb-3">Chat Logs</h3>
                {loadingChatLogs ? (
                  <div className="text-center py-4 text-gray-500">Loading chat logs...</div>
                ) : chatLogs.length === 0 ? (
                  <div className="text-center py-4 text-gray-500">No chat messages found.</div>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {chatLogs.map((msg) => (
                      <div
                        key={msg.id}
                        className={`p-3 rounded ${
                          msg.reports.length > 0 ? 'bg-red-50 border border-red-200' : 'bg-gray-50'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="text-xs text-gray-500 mb-1">
                              <span className="font-medium">{msg.sender.displayName}</span>
                              {' • '}
                              {new Date(msg.createdAt).toLocaleTimeString()}
                            </div>
                            <div className="text-sm">{msg.message}</div>
                          </div>
                          {msg.reports.length > 0 && (
                            <span className="ml-2 px-2 py-1 bg-red-100 text-red-800 text-xs rounded">
                              Reported
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Moderation Actions */}
            <div className="border-t pt-4 space-y-4">
              <h3 className="text-lg font-semibold">Moderation Actions</h3>
              
              <div>
                <label htmlFor="newStatus" className="block text-sm font-medium mb-1">
                  Update Status
                </label>
                <select
                  id="newStatus"
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md"
                >
                  <option value="pending">Pending</option>
                  <option value="reviewed">Reviewed</option>
                  <option value="resolved">Resolved</option>
                  <option value="dismissed">Dismissed</option>
                </select>
              </div>

              <div>
                <label htmlFor="adminNotes" className="block text-sm font-medium mb-1">
                  Admin Notes
                </label>
                <textarea
                  id="adminNotes"
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md"
                  rows={4}
                  maxLength={1000}
                  placeholder="Add notes about your review and decision..."
                />
                <div className="text-xs text-gray-500 mt-1">
                  {adminNotes.length}/1000 characters
                </div>
              </div>

              {selectedReport.adminNotes && (
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-1">Previous Admin Notes</h4>
                  <div className="p-3 bg-gray-50 rounded text-sm">
                    {selectedReport.adminNotes}
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-2 pt-4 border-t">
              <Button
                variant="secondary"
                onClick={() => {
                  setShowDetailModal(false);
                  setSelectedReport(null);
                  setChatLogs([]);
                }}
                disabled={updatingStatus}
              >
                Cancel
              </Button>
              <Button
                onClick={handleUpdateStatus}
                disabled={updatingStatus}
              >
                {updatingStatus ? 'Updating...' : 'Update Report'}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
