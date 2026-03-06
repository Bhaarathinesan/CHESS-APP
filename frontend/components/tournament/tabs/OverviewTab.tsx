'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/Card';
import { apiClient } from '@/lib/api-client';

interface Player {
  id: string;
  userId: string;
  score: number;
  wins: number;
  losses: number;
  draws: number;
  rank: number;
  user: {
    displayName: string;
    username: string;
    avatarUrl?: string;
  };
}

interface OverviewTabProps {
  tournamentId: string;
}

export const OverviewTab: React.FC<OverviewTabProps> = ({ tournamentId }) => {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPlayers();
  }, [tournamentId]);

  const fetchPlayers = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiClient.get<{ players: Player[] }>(
        `/tournaments/${tournamentId}/standings`
      );

      setPlayers(response.players || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load players');
    } finally {
      setLoading(false);
    }
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

  return (
    <div className="space-y-6">
      {/* Participants Section */}
      <Card>
        <CardContent className="p-6">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            Participants ({players.length})
          </h3>

          {players.length === 0 ? (
            <p className="text-gray-600 dark:text-gray-400">
              No players have joined yet.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {players.map((player) => (
                <div
                  key={player.id}
                  className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                >
                  {player.user.avatarUrl ? (
                    <img
                      src={player.user.avatarUrl}
                      alt={player.user.displayName}
                      className="w-10 h-10 rounded-full"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold">
                      {player.user.displayName.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 dark:text-white truncate">
                      {player.user.displayName}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                      @{player.user.username}
                    </p>
                  </div>
                  {player.rank && (
                    <div className="text-sm font-semibold text-gray-600 dark:text-gray-400">
                      #{player.rank}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tournament Rules Section */}
      <Card>
        <CardContent className="p-6">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            Tournament Rules
          </h3>
          <div className="space-y-2 text-gray-600 dark:text-gray-400">
            <p>• All games must be played according to FIDE chess rules</p>
            <p>• Players must join their games within 5 minutes of round start</p>
            <p>• Failure to join will result in automatic forfeit</p>
            <p>• Fair play is expected from all participants</p>
            <p>• Any suspected cheating will be investigated</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
