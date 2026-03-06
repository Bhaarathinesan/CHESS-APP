'use client';

import React, { useState, useEffect } from 'react';
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';

interface Standing {
  id: string;
  userId: string;
  score: number;
  wins: number;
  losses: number;
  draws: number;
  buchholzScore?: number;
  sonnebornBerger?: number;
  rank: number;
  user: {
    displayName: string;
    username: string;
    avatarUrl?: string;
  };
}

interface StandingsTableProps {
  standings: Standing[];
  format: string;
  currentUserId?: string | null;
  loading?: boolean;
}

type SortField = 'rank' | 'player' | 'score' | 'wins' | 'draws' | 'losses' | 'buchholz' | 'sb';
type SortDirection = 'asc' | 'desc';

/**
 * StandingsTable Component
 * 
 * Displays tournament standings with sortable columns.
 * 
 * Features:
 * - Sortable columns for all fields (Requirement 12.2)
 * - Display rank, player, points, W/L/D, tiebreaks (Requirement 12.4)
 * - Highlight current user's row (visual distinction)
 * - Real-time updates via props (Requirement 12.1)
 * - Tiebreak scores for Swiss/Round Robin (Requirement 12.3)
 * 
 * @param standings - Array of player standings
 * @param format - Tournament format (SWISS, ROUND_ROBIN, etc.)
 * @param currentUserId - ID of the current logged-in user
 * @param loading - Loading state indicator
 */
export const StandingsTable: React.FC<StandingsTableProps> = ({
  standings,
  format,
  currentUserId,
  loading = false,
}) => {
  const [sortField, setSortField] = useState<SortField>('rank');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [sortedStandings, setSortedStandings] = useState<Standing[]>(standings);

  // Show tiebreak columns for Swiss and Round Robin formats
  const showTiebreaks = format === 'SWISS' || format === 'ROUND_ROBIN';

  // Update sorted standings when standings or sort changes
  useEffect(() => {
    const sorted = [...standings].sort((a, b) => {
      let comparison = 0;

      switch (sortField) {
        case 'rank':
          comparison = a.rank - b.rank;
          break;
        case 'player':
          comparison = a.user.displayName.localeCompare(b.user.displayName);
          break;
        case 'score':
          comparison = a.score - b.score;
          break;
        case 'wins':
          comparison = a.wins - b.wins;
          break;
        case 'draws':
          comparison = a.draws - b.draws;
          break;
        case 'losses':
          comparison = a.losses - b.losses;
          break;
        case 'buchholz':
          comparison = (a.buchholzScore || 0) - (b.buchholzScore || 0);
          break;
        case 'sb':
          comparison = (a.sonnebornBerger || 0) - (b.sonnebornBerger || 0);
          break;
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });

    setSortedStandings(sorted);
  }, [standings, sortField, sortDirection]);

  // Handle column header click for sorting
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      // Toggle direction if same field
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // Set new field with default direction
      setSortField(field);
      setSortDirection(field === 'rank' ? 'asc' : 'desc');
    }
  };

  // Render sort icon for column headers
  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ChevronsUpDown className="w-4 h-4 text-gray-400" />;
    }
    return sortDirection === 'asc' ? (
      <ChevronUp className="w-4 h-4 text-blue-600 dark:text-blue-400" />
    ) : (
      <ChevronDown className="w-4 h-4 text-blue-600 dark:text-blue-400" />
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-blue-400"></div>
      </div>
    );
  }

  if (sortedStandings.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600 dark:text-gray-400">
          No standings available yet. Standings will appear once games are played.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b-2 border-gray-200 dark:border-gray-700">
            {/* Rank Column */}
            <th
              className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
              onClick={() => handleSort('rank')}
            >
              <div className="flex items-center gap-2">
                <span>Rank</span>
                {renderSortIcon('rank')}
              </div>
            </th>

            {/* Player Column */}
            <th
              className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
              onClick={() => handleSort('player')}
            >
              <div className="flex items-center gap-2">
                <span>Player</span>
                {renderSortIcon('player')}
              </div>
            </th>

            {/* Score Column */}
            <th
              className="text-center py-3 px-4 font-semibold text-gray-900 dark:text-white cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
              onClick={() => handleSort('score')}
            >
              <div className="flex items-center justify-center gap-2">
                <span>Points</span>
                {renderSortIcon('score')}
              </div>
            </th>

            {/* Wins Column */}
            <th
              className="text-center py-3 px-4 font-semibold text-gray-900 dark:text-white cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
              onClick={() => handleSort('wins')}
            >
              <div className="flex items-center justify-center gap-2">
                <span>W</span>
                {renderSortIcon('wins')}
              </div>
            </th>

            {/* Draws Column */}
            <th
              className="text-center py-3 px-4 font-semibold text-gray-900 dark:text-white cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
              onClick={() => handleSort('draws')}
            >
              <div className="flex items-center justify-center gap-2">
                <span>D</span>
                {renderSortIcon('draws')}
              </div>
            </th>

            {/* Losses Column */}
            <th
              className="text-center py-3 px-4 font-semibold text-gray-900 dark:text-white cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
              onClick={() => handleSort('losses')}
            >
              <div className="flex items-center justify-center gap-2">
                <span>L</span>
                {renderSortIcon('losses')}
              </div>
            </th>

            {/* Tiebreak Columns (Swiss/Round Robin only) */}
            {showTiebreaks && (
              <>
                <th
                  className="text-center py-3 px-4 font-semibold text-gray-900 dark:text-white cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                  onClick={() => handleSort('buchholz')}
                  title="Buchholz Score - Sum of opponents' scores"
                >
                  <div className="flex items-center justify-center gap-2">
                    <span>Buchholz</span>
                    {renderSortIcon('buchholz')}
                  </div>
                </th>
                <th
                  className="text-center py-3 px-4 font-semibold text-gray-900 dark:text-white cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                  onClick={() => handleSort('sb')}
                  title="Sonneborn-Berger Score - Weighted sum of opponents' scores"
                >
                  <div className="flex items-center justify-center gap-2">
                    <span>SB</span>
                    {renderSortIcon('sb')}
                  </div>
                </th>
              </>
            )}
          </tr>
        </thead>
        <tbody>
          {sortedStandings.map((standing, index) => {
            const isCurrentUser = currentUserId && standing.userId === currentUserId;
            const isTopThree = standing.rank <= 3;

            return (
              <tr
                key={standing.id}
                className={`
                  border-b border-gray-100 dark:border-gray-800 
                  transition-colors
                  ${isCurrentUser 
                    ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800' 
                    : isTopThree 
                      ? 'bg-yellow-50 dark:bg-yellow-900/10' 
                      : 'hover:bg-gray-50 dark:hover:bg-gray-700/30'
                  }
                `}
              >
                {/* Rank */}
                <td className="py-3 px-4">
                  <div className="flex items-center gap-2">
                    <span className={`font-bold ${isCurrentUser ? 'text-blue-700 dark:text-blue-300' : 'text-gray-900 dark:text-white'}`}>
                      {standing.rank}
                    </span>
                    {standing.rank === 1 && <span className="text-yellow-500" title="1st Place">🏆</span>}
                    {standing.rank === 2 && <span className="text-gray-400" title="2nd Place">🥈</span>}
                    {standing.rank === 3 && <span className="text-orange-600" title="3rd Place">🥉</span>}
                  </div>
                </td>

                {/* Player */}
                <td className="py-3 px-4">
                  <div className="flex items-center gap-3">
                    {standing.user.avatarUrl ? (
                      <img
                        src={standing.user.avatarUrl}
                        alt={standing.user.displayName}
                        className="w-8 h-8 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-sm font-semibold">
                        {standing.user.displayName.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <p className={`font-medium ${isCurrentUser ? 'text-blue-700 dark:text-blue-300' : 'text-gray-900 dark:text-white'}`}>
                        {standing.user.displayName}
                        {isCurrentUser && (
                          <span className="ml-2 text-xs font-semibold text-blue-600 dark:text-blue-400">(You)</span>
                        )}
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        @{standing.user.username}
                      </p>
                    </div>
                  </div>
                </td>

                {/* Score */}
                <td className={`py-3 px-4 text-center font-bold ${isCurrentUser ? 'text-blue-700 dark:text-blue-300' : 'text-gray-900 dark:text-white'}`}>
                  {standing.score}
                </td>

                {/* Wins */}
                <td className="py-3 px-4 text-center text-green-600 dark:text-green-400 font-medium">
                  {standing.wins}
                </td>

                {/* Draws */}
                <td className="py-3 px-4 text-center text-gray-600 dark:text-gray-400">
                  {standing.draws}
                </td>

                {/* Losses */}
                <td className="py-3 px-4 text-center text-red-600 dark:text-red-400 font-medium">
                  {standing.losses}
                </td>

                {/* Tiebreak Scores */}
                {showTiebreaks && (
                  <>
                    <td className="py-3 px-4 text-center text-gray-600 dark:text-gray-400">
                      {standing.buchholzScore !== undefined ? standing.buchholzScore.toFixed(1) : '-'}
                    </td>
                    <td className="py-3 px-4 text-center text-gray-600 dark:text-gray-400">
                      {standing.sonnebornBerger !== undefined ? standing.sonnebornBerger.toFixed(1) : '-'}
                    </td>
                  </>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
