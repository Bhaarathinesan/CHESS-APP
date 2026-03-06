'use client';

import { useState, useEffect } from 'react';
import GameFilters, { GameFiltersState } from '@/components/history/GameFilters';
import GameHistoryCard from '@/components/history/GameHistoryCard';
import Pagination from '@/components/history/Pagination';

interface GameHistoryResponse {
  games: any[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export default function HistoryPage() {
  const [filters, setFilters] = useState<GameFiltersState>({
    timeControl: '',
    result: '',
    opponentId: '',
    dateFrom: '',
    dateTo: '',
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [history, setHistory] = useState<GameHistoryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string>('');

  useEffect(() => {
    // Get current user ID from auth
    const fetchCurrentUser = async () => {
      try {
        const token = localStorage.getItem('accessToken');
        if (!token) {
          setError('Not authenticated');
          setLoading(false);
          return;
        }

        const response = await fetch('http://localhost:3001/api/users/me', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const user = await response.json();
          setCurrentUserId(user.id);
        }
      } catch (err) {
        console.error('Failed to fetch current user:', err);
      }
    };

    fetchCurrentUser();
  }, []);

  useEffect(() => {
    if (!currentUserId) return;

    const fetchHistory = async () => {
      setLoading(true);
      setError(null);

      try {
        const token = localStorage.getItem('accessToken');
        if (!token) {
          setError('Not authenticated');
          setLoading(false);
          return;
        }

        // Build query parameters
        const params = new URLSearchParams({
          page: currentPage.toString(),
          limit: '10',
        });

        if (filters.timeControl) params.append('timeControl', filters.timeControl);
        if (filters.result) {
          // Map UI result to backend format
          const resultMap: Record<string, string> = {
            win: currentUserId ? 'win' : '',
            loss: currentUserId ? 'loss' : '',
            draw: 'draw',
          };
          const mappedResult = resultMap[filters.result];
          if (mappedResult) params.append('result', mappedResult);
        }
        if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
        if (filters.dateTo) params.append('dateTo', filters.dateTo);

        const response = await fetch(
          `http://localhost:3001/api/games/users/${currentUserId}/history?${params.toString()}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (!response.ok) {
          throw new Error('Failed to fetch game history');
        }

        const data = await response.json();
        setHistory(data);
      } catch (err) {
        console.error('Error fetching game history:', err);
        setError('Failed to load game history');
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [currentUserId, currentPage, filters]);

  const handleFiltersChange = (newFilters: GameFiltersState) => {
    setFilters(newFilters);
    setCurrentPage(1); // Reset to first page when filters change
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Game History</h1>
        <p className="text-foreground-secondary mt-2">
          Review your past games and analyze your performance
        </p>
      </div>

      {/* Filters */}
      <GameFilters filters={filters} onFiltersChange={handleFiltersChange} />

      {/* Loading State */}
      {loading && (
        <div className="bg-background-secondary border border-border rounded-lg p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-foreground-secondary mt-4">Loading games...</p>
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div className="bg-red-500/10 border border-red-500 rounded-lg p-4 text-center">
          <p className="text-red-500">{error}</p>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && history && history.games.length === 0 && (
        <div className="bg-background-secondary border border-border rounded-lg p-8 text-center">
          <p className="text-foreground-secondary">
            {Object.values(filters).some((v) => v)
              ? 'No games found matching your filters.'
              : 'No games in your history yet. Play your first game!'}
          </p>
        </div>
      )}

      {/* Game List */}
      {!loading && !error && history && history.games.length > 0 && (
        <>
          <div className="space-y-4">
            {history.games.map((game) => (
              <GameHistoryCard key={game.id} game={game} currentUserId={currentUserId} />
            ))}
          </div>

          {/* Pagination */}
          <Pagination
            currentPage={currentPage}
            totalPages={history.totalPages}
            onPageChange={handlePageChange}
          />

          {/* Results Summary */}
          <div className="text-center text-sm text-foreground-secondary">
            Showing {(currentPage - 1) * history.limit + 1} to{' '}
            {Math.min(currentPage * history.limit, history.total)} of {history.total} games
          </div>
        </>
      )}
    </div>
  );
}
