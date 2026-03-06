'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Dropdown } from '@/components/ui/Dropdown';
import { apiClient } from '@/lib/api-client';

interface Tournament {
  id: string;
  name: string;
  description?: string;
  format: string;
  timeControl: string;
  status: string;
  currentPlayers: number;
  minPlayers: number;
  maxPlayers: number;
  isRated: boolean;
  startTime: string;
  registrationDeadline: string;
  creator: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl?: string;
  };
  createdAt: string;
}

interface TournamentsResponse {
  tournaments: Tournament[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export default function TournamentManagementPage() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [formatFilter, setFormatFilter] = useState<string>('');
  const [timeControlFilter, setTimeControlFilter] = useState<string>('');
  const [startDateFrom, setStartDateFrom] = useState('');
  const [startDateTo, setStartDateTo] = useState('');

  // Modals
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [selectedTournament, setSelectedTournament] = useState<Tournament | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchTournaments();
  }, [currentPage, statusFilter, formatFilter, timeControlFilter, startDateFrom, startDateTo]);

  const fetchTournaments = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '20',
      });

      if (searchQuery) params.append('search', searchQuery);
      if (statusFilter) params.append('status', statusFilter);
      if (formatFilter) params.append('format', formatFilter);
      if (timeControlFilter) params.append('timeControl', timeControlFilter);
      if (startDateFrom) params.append('startDateFrom', startDateFrom);
      if (startDateTo) params.append('startDateTo', startDateTo);

      const data = await apiClient.get<TournamentsResponse>(
        `/admin/tournaments?${params.toString()}`
      );
      
      setTournaments(data.tournaments);
      setTotalPages(data.totalPages);
      setTotal(data.total);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch tournaments');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchTournaments();
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setStatusFilter('');
    setFormatFilter('');
    setTimeControlFilter('');
    setStartDateFrom('');
    setStartDateTo('');
    setCurrentPage(1);
  };

  const handleCancelTournament = async () => {
    if (!selectedTournament || !cancelReason.trim()) {
      alert('Please provide a cancellation reason');
      return;
    }

    try {
      setSubmitting(true);
      await apiClient.post(
        `/admin/tournaments/${selectedTournament.id}/cancel`,
        { reason: cancelReason }
      );

      setShowCancelModal(false);
      setCancelReason('');
      setSelectedTournament(null);
      await fetchTournaments();
    } catch (err: any) {
      alert(err.message || 'Failed to cancel tournament');
    } finally {
      setSubmitting(false);
    }
  };

  const openCancelModal = (tournament: Tournament) => {
    setSelectedTournament(tournament);
    setShowCancelModal(true);
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'CREATED':
        return 'bg-gray-100 text-gray-800';
      case 'REGISTRATION_OPEN':
        return 'bg-blue-100 text-blue-800';
      case 'REGISTRATION_CLOSED':
        return 'bg-yellow-100 text-yellow-800';
      case 'IN_PROGRESS':
      case 'ROUND_IN_PROGRESS':
        return 'bg-green-100 text-green-800';
      case 'COMPLETED':
        return 'bg-purple-100 text-purple-800';
      case 'CANCELLED':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatStatus = (status: string) => {
    return status.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (l) => l.toUpperCase());
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getTournamentActions = (tournament: Tournament) => {
    const actions = [];

    // View action
    actions.push({
      id: 'view',
      label: 'View Details',
      onClick: () => window.open(`/tournaments/${tournament.id}`, '_blank'),
    });

    // Cancel action (only for non-completed/cancelled tournaments)
    if (tournament.status !== 'COMPLETED' && tournament.status !== 'CANCELLED') {
      actions.push({
        id: 'cancel',
        label: 'Cancel Tournament',
        onClick: () => openCancelModal(tournament),
      });
    }

    return actions;
  };

  if (loading && tournaments.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading tournaments...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Tournament Management</h1>
          <p className="text-sm text-gray-500 mt-1">
            View and manage all tournaments on the platform
          </p>
        </div>
      </div>

      {/* Filters */}
      <Card className="p-6">
        <form onSubmit={handleSearch} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Search */}
            <div>
              <label htmlFor="search" className="block text-sm font-medium mb-1">
                Search
              </label>
              <Input
                id="search"
                type="text"
                placeholder="Search by name or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Status Filter */}
            <div>
              <label htmlFor="status" className="block text-sm font-medium mb-1">
                Status
              </label>
              <select
                id="status"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Statuses</option>
                <option value="CREATED">Created</option>
                <option value="REGISTRATION_OPEN">Registration Open</option>
                <option value="REGISTRATION_CLOSED">Registration Closed</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="ROUND_IN_PROGRESS">Round In Progress</option>
                <option value="COMPLETED">Completed</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>

            {/* Format Filter */}
            <div>
              <label htmlFor="format" className="block text-sm font-medium mb-1">
                Format
              </label>
              <select
                id="format"
                value={formatFilter}
                onChange={(e) => setFormatFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Formats</option>
                <option value="SWISS">Swiss</option>
                <option value="ROUND_ROBIN">Round Robin</option>
                <option value="SINGLE_ELIMINATION">Single Elimination</option>
                <option value="DOUBLE_ELIMINATION">Double Elimination</option>
                <option value="ARENA">Arena</option>
              </select>
            </div>

            {/* Time Control Filter */}
            <div>
              <label htmlFor="timeControl" className="block text-sm font-medium mb-1">
                Time Control
              </label>
              <select
                id="timeControl"
                value={timeControlFilter}
                onChange={(e) => setTimeControlFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Time Controls</option>
                <option value="BULLET">Bullet</option>
                <option value="BLITZ">Blitz</option>
                <option value="RAPID">Rapid</option>
                <option value="CLASSICAL">Classical</option>
              </select>
            </div>

            {/* Start Date From */}
            <div>
              <label htmlFor="startDateFrom" className="block text-sm font-medium mb-1">
                Start Date From
              </label>
              <Input
                id="startDateFrom"
                type="date"
                value={startDateFrom}
                onChange={(e) => setStartDateFrom(e.target.value)}
              />
            </div>

            {/* Start Date To */}
            <div>
              <label htmlFor="startDateTo" className="block text-sm font-medium mb-1">
                Start Date To
              </label>
              <Input
                id="startDateTo"
                type="date"
                value={startDateTo}
                onChange={(e) => setStartDateTo(e.target.value)}
              />
            </div>
          </div>

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="secondary" onClick={handleClearFilters}>
              Clear Filters
            </Button>
            <Button type="submit">Apply Filters</Button>
          </div>
        </form>
      </Card>

      {/* Error State */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}

      {/* Results Summary */}
      <div className="text-sm text-gray-600">
        Showing {tournaments.length} of {total} tournaments
      </div>

      {/* Tournaments Table */}
      <Card className="p-6">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-4">Name</th>
                <th className="text-left py-3 px-4">Format</th>
                <th className="text-left py-3 px-4">Time Control</th>
                <th className="text-left py-3 px-4">Status</th>
                <th className="text-left py-3 px-4">Players</th>
                <th className="text-left py-3 px-4">Start Time</th>
                <th className="text-left py-3 px-4">Creator</th>
                <th className="text-right py-3 px-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {tournaments.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-gray-500">
                    No tournaments found matching your criteria
                  </td>
                </tr>
              ) : (
                tournaments.map((tournament) => (
                  <tr key={tournament.id} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <div className="font-medium">{tournament.name}</div>
                      {tournament.isRated && (
                        <span className="text-xs text-green-600">Rated</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-sm">
                      {formatStatus(tournament.format)}
                    </td>
                    <td className="py-3 px-4 text-sm">
                      {formatStatus(tournament.timeControl)}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-block px-2 py-1 rounded text-xs font-semibold ${getStatusBadgeColor(
                          tournament.status
                        )}`}
                      >
                        {formatStatus(tournament.status)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm">
                      {tournament.currentPlayers} / {tournament.maxPlayers}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-500">
                      {formatDate(tournament.startTime)}
                    </td>
                    <td className="py-3 px-4 text-sm">
                      {tournament.creator.displayName}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Dropdown
                        trigger={
                          <Button variant="secondary" size="sm">
                            Actions
                          </Button>
                        }
                        items={getTournamentActions(tournament)}
                        align="right"
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center space-x-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
          >
            Previous
          </Button>
          <span className="text-sm text-gray-600">
            Page {currentPage} of {totalPages}
          </span>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
          >
            Next
          </Button>
        </div>
      )}

      {/* Cancel Tournament Modal */}
      <Modal
        isOpen={showCancelModal}
        onClose={() => {
          setShowCancelModal(false);
          setCancelReason('');
          setSelectedTournament(null);
        }}
        title="Cancel Tournament"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Are you sure you want to cancel the tournament &quot;{selectedTournament?.name}&quot;?
            All registered players will be notified.
          </p>

          <div>
            <label htmlFor="cancelReason" className="block text-sm font-medium mb-1">
              Cancellation Reason *
            </label>
            <textarea
              id="cancelReason"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={4}
              placeholder="Provide a reason for cancellation..."
              required
            />
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setShowCancelModal(false);
                setCancelReason('');
                setSelectedTournament(null);
              }}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="danger"
              onClick={handleCancelTournament}
              disabled={submitting || !cancelReason.trim()}
            >
              {submitting ? 'Cancelling...' : 'Cancel Tournament'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
