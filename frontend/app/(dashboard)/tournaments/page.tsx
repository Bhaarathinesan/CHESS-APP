'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { TournamentCard } from '@/components/tournament/TournamentCard';
import { TournamentFilters } from '@/components/tournament/TournamentFilters';
import { Pagination } from '@/components/ui/Pagination';
import { Button } from '@/components/ui/Button';
import { apiClient } from '@/lib/api-client';
import { authService } from '@/lib/auth';

interface Tournament {
  id: string;
  name: string;
  description?: string;
  format: string;
  timeControl: string;
  status: string;
  currentPlayers: number;
  maxPlayers: number;
  startTime: string;
  bannerUrl?: string;
  creator: {
    displayName: string;
  };
}

interface TournamentsResponse {
  tournaments: Tournament[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export default function TournamentsPage() {
  const router = useRouter();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filters, setFilters] = useState({
    status: undefined,
    format: undefined,
    timeControl: undefined,
    search: undefined,
  });
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    // Get user role from token
    const token = authService.getToken();
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setUserRole(payload.role);
      } catch (e) {
        console.error('Failed to parse token:', e);
      }
    }
  }, []);

  useEffect(() => {
    fetchTournaments();
  }, [currentPage, filters]);

  const fetchTournaments = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '12',
      });

      if (filters.status) params.append('status', filters.status);
      if (filters.format) params.append('format', filters.format);
      if (filters.timeControl) params.append('timeControl', filters.timeControl);
      if (filters.search) params.append('search', filters.search);

      const response = await apiClient.get<TournamentsResponse>(
        `/tournaments?${params.toString()}`
      );

      setTournaments(response.tournaments);
      setTotalPages(response.totalPages);
    } catch (err: any) {
      setError(err.message || 'Failed to load tournaments');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (newFilters: any) => {
    setFilters(newFilters);
    setCurrentPage(1); // Reset to first page when filters change
  };

  const handleCreateTournament = () => {
    router.push('/tournaments/create');
  };

  const canCreateTournament = userRole === 'TOURNAMENT_ADMIN' || userRole === 'SUPER_ADMIN';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Tournaments</h1>
          <p className="text-foreground-secondary mt-2">
            Browse and join chess tournaments
          </p>
        </div>
        {canCreateTournament && (
          <Button onClick={handleCreateTournament}>
            Create Tournament
          </Button>
        )}
      </div>

      {/* Filters */}
      <TournamentFilters filters={filters} onFilterChange={handleFilterChange} />

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && tournaments.length === 0 && (
        <div className="bg-background-secondary border border-border rounded-lg p-8 text-center">
          <p className="text-foreground-secondary">
            No tournaments found matching your criteria
          </p>
        </div>
      )}

      {/* Tournaments Grid */}
      {!loading && !error && tournaments.length > 0 && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tournaments.map((tournament) => (
              <TournamentCard key={tournament.id} tournament={tournament} />
            ))}
          </div>

          {/* Pagination */}
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        </>
      )}
    </div>
  );
}
