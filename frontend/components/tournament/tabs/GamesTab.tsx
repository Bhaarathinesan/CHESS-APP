'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/Card';
import { Pagination } from '@/components/ui/Pagination';
import { apiClient } from '@/lib/api-client';
import Link from 'next/link';

interface Game {
  id: string;
  whitePlayer: {
    id: string;
    displayName: string;
    username: string;
    avatarUrl?: string;
  };
  blackPlayer: {
    id: string;
    displayName: string;
    username: string;
    avatarUrl?: string;
  };
  status: string;
  result?: string;
  terminationReason?: string;
  moveCount: number;
  startedAt?: string;
  completedAt?: string;
  pairingInfo?: {
    roundNumber: number;
    boardNumber: number;
  };
}

interface GamesTabProps {
  tournamentId: string;
}

export const GamesTab: React.FC<GamesTabProps> = ({ tournamentId }) => {
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchGames();
  }, [tournamentId, currentPage]);

  const fetchGames = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch games for this tournament
      const response = await apiClient.get<{
        games: Game[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
      }>(`/games?tournamentId=${tournamentId}&page=${currentPage}&limit=20`);

      setGames(response.games || []);
      setTotalPages(response.totalPages || 1);
    } catch (err: any) {
      setError(err.message || 'Failed to load games');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getResultDisplay = (game: Game) => {
    if (game.status === 'active') {
      return <span className="text-green-600 dark:text-green-400 font-semibold">In Progress</span>;
    }

    if (!game.result) {
      return <span className="text-gray-500 dark:text-gray-400">-</span>;
    }

    switch (game.result) {
      case 'white_win':
        return <span className="font-semibold">1 - 0</span>;
      case 'black_win':
        return <span className="font-semibold">0 - 1</span>;
      case 'draw':
        return <span className="font-semibold">½ - ½</span>;
      default:
        return <span className="text-gray-500 dark:text-gray-400">-</span>;
    }
  };

  const getTerminationDisplay = (reason?: string) => {
    if (!reason) return '';

    const reasonMap: Record<string, string> = {
      checkmate: 'Checkmate',
      resignation: 'Resignation',
      timeout: 'Timeout',
      draw_agreement: 'Draw Agreement',
      stalemate: 'Stalemate',
      threefold_repetition: 'Threefold Repetition',
      fifty_move_rule: 'Fifty-Move Rule',
      insufficient_material: 'Insufficient Material',
    };

    return reasonMap[reason] || reason;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
        <p className="text-red-800 dark:text-red-200">{error}</p>
      </div>
    );
  }

  if (games.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-gray-600 dark:text-gray-400">
            No games have been played yet.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-6">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            Tournament Games
          </h3>

          <div className="space-y-3">
            {games.map((game) => (
              <Link
                key={game.id}
                href={`/history/${game.id}`}
                className="block p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
              >
                <div className="flex items-center justify-between">
                  {/* Round Info */}
                  {game.pairingInfo && (
                    <div className="w-20 text-center">
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        Round {game.pairingInfo.roundNumber}
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        Board {game.pairingInfo.boardNumber}
                      </p>
                    </div>
                  )}

                  {/* White Player */}
                  <div className="flex-1 flex items-center gap-3">
                    {game.whitePlayer.avatarUrl ? (
                      <img
                        src={game.whitePlayer.avatarUrl}
                        alt={game.whitePlayer.displayName}
                        className="w-8 h-8 rounded-full"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-sm font-semibold">
                        {game.whitePlayer.displayName.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {game.whitePlayer.displayName}
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        @{game.whitePlayer.username}
                      </p>
                    </div>
                  </div>

                  {/* Result */}
                  <div className="px-4 text-center min-w-[120px]">
                    <div className="mb-1">{getResultDisplay(game)}</div>
                    {game.terminationReason && (
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        {getTerminationDisplay(game.terminationReason)}
                      </p>
                    )}
                  </div>

                  {/* Black Player */}
                  <div className="flex-1 flex items-center gap-3 justify-end">
                    <div className="text-right">
                      <p className="font-medium text-gray-900 dark:text-white">
                        {game.blackPlayer.displayName}
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        @{game.blackPlayer.username}
                      </p>
                    </div>
                    {game.blackPlayer.avatarUrl ? (
                      <img
                        src={game.blackPlayer.avatarUrl}
                        alt={game.blackPlayer.displayName}
                        className="w-8 h-8 rounded-full"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-white text-sm font-semibold">
                        {game.blackPlayer.displayName.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>

                  {/* Game Info */}
                  <div className="w-32 text-right text-xs text-gray-600 dark:text-gray-400">
                    <p>{game.moveCount} moves</p>
                    <p>{formatDate(game.completedAt || game.startedAt)}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />
      )}
    </div>
  );
};
