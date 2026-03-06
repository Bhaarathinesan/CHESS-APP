'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface OngoingGame {
  id: string;
  whitePlayer: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl?: string;
  };
  blackPlayer: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl?: string;
  };
  timeControl: string;
  initialTimeMinutes: number;
  incrementSeconds: number;
  whiteRatingBefore?: number;
  blackRatingBefore?: number;
  moveCount: number;
  spectatorCount: number;
  startedAt: Date;
}

export default function SpectatePage() {
  const [games, setGames] = useState<OngoingGame[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    const fetchOngoingGames = async () => {
      try {
        const token = localStorage.getItem('accessToken');
        const headers: HeadersInit = {};
        if (token) {
          headers.Authorization = `Bearer ${token}`;
        }

        const params = new URLSearchParams();
        if (filter !== 'all') {
          params.append('timeControl', filter);
        }

        const response = await fetch(
          `http://localhost:3001/api/games/ongoing?${params.toString()}`,
          { headers }
        );

        if (!response.ok) {
          throw new Error('Failed to fetch ongoing games');
        }

        const data = await response.json();
        setGames(data);
      } catch (err) {
        console.error('Error fetching ongoing games:', err);
        setError('Failed to load ongoing games');
      } finally {
        setLoading(false);
      }
    };

    fetchOngoingGames();

    // Refresh every 10 seconds
    const interval = setInterval(fetchOngoingGames, 10000);

    return () => clearInterval(interval);
  }, [filter]);

  const timeControlDisplay = (game: OngoingGame) =>
    `${game.initialTimeMinutes}+${game.incrementSeconds}`;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Spectate Games</h1>
        <p className="text-foreground-secondary mt-2">
          Watch live chess games and learn from other players
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-lg transition-colors ${
            filter === 'all'
              ? 'bg-primary text-white'
              : 'bg-background-secondary border border-border text-foreground hover:border-primary'
          }`}
        >
          All Games
        </button>
        <button
          onClick={() => setFilter('bullet')}
          className={`px-4 py-2 rounded-lg transition-colors ${
            filter === 'bullet'
              ? 'bg-primary text-white'
              : 'bg-background-secondary border border-border text-foreground hover:border-primary'
          }`}
        >
          Bullet
        </button>
        <button
          onClick={() => setFilter('blitz')}
          className={`px-4 py-2 rounded-lg transition-colors ${
            filter === 'blitz'
              ? 'bg-primary text-white'
              : 'bg-background-secondary border border-border text-foreground hover:border-primary'
          }`}
        >
          Blitz
        </button>
        <button
          onClick={() => setFilter('rapid')}
          className={`px-4 py-2 rounded-lg transition-colors ${
            filter === 'rapid'
              ? 'bg-primary text-white'
              : 'bg-background-secondary border border-border text-foreground hover:border-primary'
          }`}
        >
          Rapid
        </button>
        <button
          onClick={() => setFilter('classical')}
          className={`px-4 py-2 rounded-lg transition-colors ${
            filter === 'classical'
              ? 'bg-primary text-white'
              : 'bg-background-secondary border border-border text-foreground hover:border-primary'
          }`}
        >
          Classical
        </button>
      </div>

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
      {!loading && !error && games.length === 0 && (
        <div className="bg-background-secondary border border-border rounded-lg p-8 text-center">
          <p className="text-foreground-secondary">
            No ongoing games at the moment. Check back soon!
          </p>
        </div>
      )}

      {/* Games Grid */}
      {!loading && !error && games.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {games.map((game) => (
            <Link key={game.id} href={`/spectate/${game.id}`}>
              <div className="bg-background-secondary border border-border rounded-lg p-4 hover:border-primary transition-colors cursor-pointer">
                {/* Players */}
                <div className="space-y-3 mb-4">
                  {/* White Player */}
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-gray-800 font-semibold text-sm border-2 border-gray-300">
                      {game.whitePlayer.avatarUrl ? (
                        <img
                          src={game.whitePlayer.avatarUrl}
                          alt={game.whitePlayer.displayName}
                          className="w-8 h-8 rounded-full object-cover"
                        />
                      ) : (
                        game.whitePlayer.displayName.charAt(0).toUpperCase()
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-semibold text-foreground truncate">
                        {game.whitePlayer.displayName}
                      </div>
                      <div className="text-xs text-foreground-secondary">
                        {game.whiteRatingBefore || 'Unrated'}
                      </div>
                    </div>
                  </div>

                  {/* VS */}
                  <div className="text-center text-xs text-foreground-secondary font-semibold">
                    VS
                  </div>

                  {/* Black Player */}
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center text-white font-semibold text-sm border-2 border-gray-600">
                      {game.blackPlayer.avatarUrl ? (
                        <img
                          src={game.blackPlayer.avatarUrl}
                          alt={game.blackPlayer.displayName}
                          className="w-8 h-8 rounded-full object-cover"
                        />
                      ) : (
                        game.blackPlayer.displayName.charAt(0).toUpperCase()
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-semibold text-foreground truncate">
                        {game.blackPlayer.displayName}
                      </div>
                      <div className="text-xs text-foreground-secondary">
                        {game.blackRatingBefore || 'Unrated'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Game Info */}
                <div className="border-t border-border pt-3 space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-foreground-secondary">Time Control</span>
                    <span className="text-foreground font-medium">
                      {timeControlDisplay(game)} •{' '}
                      {game.timeControl.charAt(0).toUpperCase() + game.timeControl.slice(1)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-foreground-secondary">Moves</span>
                    <span className="text-foreground font-medium">{game.moveCount}</span>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-foreground-secondary">Spectators</span>
                    <span className="text-foreground font-medium flex items-center">
                      <svg
                        className="w-4 h-4 mr-1"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                        />
                      </svg>
                      {game.spectatorCount}
                    </span>
                  </div>
                </div>

                {/* Watch Button */}
                <button className="w-full mt-4 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors">
                  Watch Game
                </button>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
