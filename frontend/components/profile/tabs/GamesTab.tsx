'use client';

import React, { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api-client';
import { Pagination } from '@/components/ui/Pagination';

interface GamesTabProps {
  userId: string;
}

export const GamesTab: React.FC<GamesTabProps> = ({ userId }) => {
  const [games, setGames] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filters, setFilters] = useState({
    timeControl: '',
    result: '',
  });

  useEffect(() => {
    fetchGames();
  }, [userId, page, filters]);

  const fetchGames = async () => {
    try {
      setLoading(true);

      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10',
        ...(filters.timeControl && { timeControl: filters.timeControl }),
        ...(filters.result && { result: filters.result }),
      });

      const response = await apiClient.get<{ games: any[]; total: number; pages: number }>(
        `/users/${userId}/games?${params}`
      );

      setGames(response.games || []);
      setTotalPages(response.pages || 1);
    } catch (err) {
      console.error('Failed to fetch games:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTimeControl = (tc: string) => {
    const map: Record<string, string> = {
      BULLET: 'Bullet',
      BLITZ: 'Blitz',
      RAPID: 'Rapid',
      CLASSICAL: 'Classical',
    };
    return map[tc] || tc;
  };

  const getResultBadge = (game: any) => {
    if (game.result === 'DRAW') {
      return <span className="px-2 py-1 text-xs font-semibold bg-gray-500 text-white rounded">Draw</span>;
    }
    
    const isWhite = game.whitePlayerId === userId;
    const won = (game.result === 'WHITE_WIN' && isWhite) || (game.result === 'BLACK_WIN' && !isWhite);
    
    return won ? (
      <span className="px-2 py-1 text-xs font-semibold bg-green-500 text-white rounded">Win</span>
    ) : (
      <span className="px-2 py-1 text-xs font-semibold bg-red-500 text-white rounded">Loss</span>
    );
  };

  if (loading && games.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <select
          value={filters.timeControl}
          onChange={(e) => setFilters({ ...filters, timeControl: e.target.value })}
          className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
        >
          <option value="">All Time Controls</option>
          <option value="BULLET">Bullet</option>
          <option value="BLITZ">Blitz</option>
          <option value="RAPID">Rapid</option>
          <option value="CLASSICAL">Classical</option>
        </select>

        <select
          value={filters.result}
          onChange={(e) => setFilters({ ...filters, result: e.target.value })}
          className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
        >
          <option value="">All Results</option>
          <option value="win">Wins</option>
          <option value="loss">Losses</option>
          <option value="draw">Draws</option>
        </select>
      </div>

      {/* Games List */}
      {games.length === 0 ? (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          No games found
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {games.map((game) => {
              const isWhite = game.whitePlayerId === userId;
              const opponent = isWhite ? game.blackPlayer : game.whitePlayer;
              
              return (
                <div
                  key={game.id}
                  className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                  onClick={() => window.location.href = `/history/${game.id}`}
                >
                  <div className="flex items-center gap-4 flex-1">
                    <div className="flex items-center gap-2">
                      {getResultBadge(game)}
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900 dark:text-white">
                          vs {opponent.displayName}
                        </span>
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          ({formatTimeControl(game.timeControl)})
                        </span>
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        {game.openingName || 'Unknown Opening'} • {game.moveCount} moves
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {formatDate(game.completedAt)}
                  </div>
                </div>
              );
            })}
          </div>

          {totalPages > 1 && (
            <Pagination
              currentPage={page}
              totalPages={totalPages}
              onPageChange={setPage}
            />
          )}
        </>
      )}
    </div>
  );
};
