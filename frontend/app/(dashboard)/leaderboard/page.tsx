'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

type TimeControl = 'BULLET' | 'BLITZ' | 'RAPID' | 'CLASSICAL';

interface LeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  rating: number;
  gamesPlayed: number;
  ratingTrend: 'up' | 'down' | 'stable';
  collegeName?: string;
  collegeDomain?: string;
}

export default function LeaderboardPage() {
  const [timeControl, setTimeControl] = useState<TimeControl>('BLITZ');
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResult, setSearchResult] = useState<LeaderboardEntry | null>(null);
  const [viewMode, setViewMode] = useState<'global' | 'college' | 'weekly'>('global');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    fetchLeaderboard();
  }, [timeControl, viewMode]);

  const fetchLeaderboard = async () => {
    setLoading(true);
    try {
      let url = '';
      if (viewMode === 'global') {
        url = `/api/leaderboards/${timeControl}?page=1&limit=100`;
      } else if (viewMode === 'weekly') {
        url = `/api/leaderboards/weekly?timeControl=${timeControl}&limit=100`;
      } else if (viewMode === 'college') {
        // Get user's college domain from localStorage or API
        const userCollege = localStorage.getItem('userCollegeDomain') || 'example.edu';
        url = `/api/leaderboards/${timeControl}/college/${userCollege}?page=1&limit=100`;
      }

      const response = await fetch(url);
      const data = await response.json();
      
      if (viewMode === 'weekly') {
        setLeaderboard(data.leaderboard || []);
      } else {
        setLeaderboard(data.leaderboard || []);
      }
    } catch (error) {
      console.error('Failed to fetch leaderboard:', error);
      setLeaderboard([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    try {
      const response = await fetch(
        `/api/leaderboards/${timeControl}/search?username=${encodeURIComponent(searchQuery)}`
      );
      const data = await response.json();
      setSearchResult(data.player);
    } catch (error) {
      console.error('Failed to search player:', error);
      setSearchResult(null);
    }
  };

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    if (trend === 'up') return '↑';
    if (trend === 'down') return '↓';
    return '→';
  };

  const getTrendColor = (trend: 'up' | 'down' | 'stable') => {
    if (trend === 'up') return 'text-green-500';
    if (trend === 'down') return 'text-red-500';
    return 'text-gray-500';
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Leaderboard</h1>
        <p className="text-foreground-secondary mt-2">
          Top players across all time controls
        </p>
      </div>

      {/* Time Control Tabs */}
      <div className="flex gap-2 border-b border-border">
        {[
          { label: 'Bullet', value: 'BULLET' },
          { label: 'Blitz', value: 'BLITZ' },
          { label: 'Rapid', value: 'RAPID' },
          { label: 'Classical', value: 'CLASSICAL' },
        ].map((control) => (
          <button
            key={control.value}
            onClick={() => setTimeControl(control.value as TimeControl)}
            className={`px-4 py-2 transition-colors ${
              timeControl === control.value
                ? 'text-foreground border-b-2 border-primary'
                : 'text-foreground-secondary hover:text-foreground border-b-2 border-transparent hover:border-primary'
            }`}
          >
            {control.label}
          </button>
        ))}
      </div>

      {/* View Mode Tabs */}
      <div className="flex gap-2">
        {[
          { label: 'Global', value: 'global' },
          { label: 'My College', value: 'college' },
          { label: 'Weekly', value: 'weekly' },
        ].map((mode) => (
          <Button
            key={mode.value}
            variant={viewMode === mode.value ? 'primary' : 'secondary'}
            onClick={() => setViewMode(mode.value as any)}
          >
            {mode.label}
          </Button>
        ))}
      </div>

      {/* Search */}
      <Card>
        <div className="flex gap-2">
          <Input
            type="text"
            placeholder="Search for a player..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            className="flex-1"
          />
          <Button onClick={handleSearch}>Search</Button>
        </div>
        {searchResult && (
          <div className="mt-4 p-4 bg-background-secondary rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="text-2xl font-bold text-foreground">
                  #{searchResult.rank}
                </span>
                {searchResult.avatarUrl ? (
                  <img
                    src={searchResult.avatarUrl}
                    alt={searchResult.displayName}
                    className="w-10 h-10 rounded-full"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white font-bold">
                    {searchResult.displayName[0].toUpperCase()}
                  </div>
                )}
                <div>
                  <div className="font-semibold text-foreground">
                    {searchResult.displayName}
                  </div>
                  <div className="text-sm text-foreground-secondary">
                    @{searchResult.username}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className="text-2xl font-bold text-foreground">
                    {searchResult.rating}
                  </div>
                  <div className="text-sm text-foreground-secondary">
                    {searchResult.gamesPlayed} games
                  </div>
                </div>
                <span
                  className={`text-2xl ${getTrendColor(searchResult.ratingTrend)}`}
                >
                  {getTrendIcon(searchResult.ratingTrend)}
                </span>
              </div>
            </div>
          </div>
        )}
        {searchQuery && !searchResult && (
          <div className="mt-4 text-center text-foreground-secondary">
            No player found
          </div>
        )}
      </Card>

      {/* Leaderboard Table */}
      <Card>
        {loading ? (
          <div className="text-center py-8 text-foreground-secondary">
            Loading leaderboard...
          </div>
        ) : leaderboard.length === 0 ? (
          <div className="text-center py-8 text-foreground-secondary">
            No players on the leaderboard yet
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 text-foreground-secondary font-medium">
                    Rank
                  </th>
                  <th className="text-left py-3 px-4 text-foreground-secondary font-medium">
                    Player
                  </th>
                  <th className="text-left py-3 px-4 text-foreground-secondary font-medium">
                    College
                  </th>
                  <th className="text-right py-3 px-4 text-foreground-secondary font-medium">
                    Rating
                  </th>
                  <th className="text-right py-3 px-4 text-foreground-secondary font-medium">
                    Games
                  </th>
                  <th className="text-center py-3 px-4 text-foreground-secondary font-medium">
                    Trend
                  </th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.map((entry) => (
                  <tr
                    key={entry.userId}
                    className={`border-b border-border hover:bg-background-secondary transition-colors ${
                      entry.userId === currentUserId ? 'bg-primary/10' : ''
                    }`}
                  >
                    <td className="py-3 px-4">
                      <span
                        className={`font-bold ${
                          entry.rank === 1
                            ? 'text-yellow-500'
                            : entry.rank === 2
                            ? 'text-gray-400'
                            : entry.rank === 3
                            ? 'text-orange-600'
                            : 'text-foreground'
                        }`}
                      >
                        #{entry.rank}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        {entry.avatarUrl ? (
                          <img
                            src={entry.avatarUrl}
                            alt={entry.displayName}
                            className="w-8 h-8 rounded-full"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white text-sm font-bold">
                            {entry.displayName[0].toUpperCase()}
                          </div>
                        )}
                        <div>
                          <div className="font-semibold text-foreground">
                            {entry.displayName}
                          </div>
                          <div className="text-sm text-foreground-secondary">
                            @{entry.username}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-foreground-secondary text-sm">
                      {entry.collegeName || '-'}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className="text-lg font-bold text-foreground">
                        {entry.rating}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right text-foreground-secondary">
                      {entry.gamesPlayed}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`text-xl ${getTrendColor(entry.ratingTrend)}`}
                      >
                        {getTrendIcon(entry.ratingTrend)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Info Card */}
      <Card>
        <div className="text-sm text-foreground-secondary">
          <p>
            <strong>Note:</strong> Players must have at least 20 games to appear on
            the leaderboard.
          </p>
          <p className="mt-2">
            Leaderboards are updated within 10 seconds after each rated game
            completes.
          </p>
        </div>
      </Card>
    </div>
  );
}
