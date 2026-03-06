'use client';

import React from 'react';
import Link from 'next/link';

interface Player {
  id: string;
  displayName: string;
  username: string;
  avatarUrl?: string;
}

interface Match {
  id: string;
  boardNumber: number;
  whitePlayer?: Player;
  blackPlayer?: Player;
  result?: string;
  isBye: boolean;
  winner?: string | null;
  game?: {
    id: string;
    status: string;
  };
}

interface BracketRound {
  roundNumber: number;
  roundName: string;
  matches: Match[];
}

interface BracketViewProps {
  bracket: BracketRound[];
  format: string;
  currentRound: number;
  loading?: boolean;
}

/**
 * BracketView Component
 * 
 * Displays tournament bracket visualization for elimination tournaments.
 * 
 * Features:
 * - Display single elimination bracket structure (Requirement 12.5)
 * - Display double elimination with winners/losers brackets (Requirement 12.5)
 * - Show match results and progression (Requirement 12.5)
 * - Visual tree structure for bracket rounds
 * - Highlight winners and show match status
 * - Link to live games
 * 
 * @param bracket - Array of bracket rounds with matches
 * @param format - Tournament format (SINGLE_ELIMINATION or DOUBLE_ELIMINATION)
 * @param currentRound - Current active round number
 * @param loading - Loading state indicator
 */
export const BracketView: React.FC<BracketViewProps> = ({
  bracket,
  format,
  currentRound,
  loading = false,
}) => {
  /**
   * Get result display for a match
   */
  const getResultDisplay = (match: Match) => {
    if (match.isBye) {
      return <span className="text-blue-600 dark:text-blue-400 font-semibold text-xs">BYE</span>;
    }

    if (!match.result) {
      if (match.game?.status === 'active') {
        return <span className="text-green-600 dark:text-green-400 font-semibold text-xs">Live</span>;
      }
      return <span className="text-gray-500 dark:text-gray-400 text-xs">TBD</span>;
    }

    switch (match.result) {
      case 'WHITE_WIN':
      case 'white_win':
        return <span className="font-semibold text-xs">1-0</span>;
      case 'BLACK_WIN':
      case 'black_win':
        return <span className="font-semibold text-xs">0-1</span>;
      case 'DRAW':
      case 'draw':
        return <span className="font-semibold text-xs">½-½</span>;
      default:
        return <span className="text-gray-500 dark:text-gray-400 text-xs">-</span>;
    }
  };

  /**
   * Determine if a player is the winner of the match
   */
  const isWinner = (match: Match, playerId?: string) => {
    if (!playerId || !match.winner) return false;
    return match.winner === playerId;
  };

  /**
   * Render a single match card
   */
  const renderMatch = (match: Match, roundNumber: number) => {
    const whiteIsWinner = isWinner(match, match.whitePlayer?.id);
    const blackIsWinner = isWinner(match, match.blackPlayer?.id);
    const isActive = match.game?.status === 'active';
    const isCompleted = !!match.result;

    return (
      <div
        key={match.id}
        className={`
          relative bg-white dark:bg-gray-800 rounded-lg border-2 
          ${isActive ? 'border-green-500 shadow-lg' : 'border-gray-200 dark:border-gray-700'}
          transition-all hover:shadow-md
          min-w-[200px] max-w-[240px]
        `}
      >
        {/* Match Header */}
        <div className="bg-gray-50 dark:bg-gray-700/50 px-3 py-1.5 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">
            Match {match.boardNumber}
          </span>
          {getResultDisplay(match)}
        </div>

        {/* Players */}
        <div className="p-2 space-y-1">
          {/* White Player */}
          <div
            className={`
              flex items-center gap-2 p-2 rounded
              ${whiteIsWinner 
                ? 'bg-green-50 dark:bg-green-900/20 border border-green-300 dark:border-green-700' 
                : 'bg-gray-50 dark:bg-gray-700/30'
              }
            `}
          >
            {match.whitePlayer ? (
              <>
                {match.whitePlayer.avatarUrl ? (
                  <img
                    src={match.whitePlayer.avatarUrl}
                    alt={match.whitePlayer.displayName}
                    className="w-6 h-6 rounded-full flex-shrink-0"
                  />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
                    {match.whitePlayer.displayName.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium truncate ${whiteIsWinner ? 'text-green-700 dark:text-green-300' : 'text-gray-900 dark:text-white'}`}>
                    {match.whitePlayer.displayName}
                    {whiteIsWinner && <span className="ml-1">✓</span>}
                  </p>
                </div>
              </>
            ) : (
              <span className="text-sm text-gray-500 dark:text-gray-400 italic">TBD</span>
            )}
          </div>

          {/* Black Player */}
          <div
            className={`
              flex items-center gap-2 p-2 rounded
              ${blackIsWinner 
                ? 'bg-green-50 dark:bg-green-900/20 border border-green-300 dark:border-green-700' 
                : 'bg-gray-50 dark:bg-gray-700/30'
              }
            `}
          >
            {match.blackPlayer ? (
              <>
                {match.blackPlayer.avatarUrl ? (
                  <img
                    src={match.blackPlayer.avatarUrl}
                    alt={match.blackPlayer.displayName}
                    className="w-6 h-6 rounded-full flex-shrink-0"
                  />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-gray-700 flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
                    {match.blackPlayer.displayName.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium truncate ${blackIsWinner ? 'text-green-700 dark:text-green-300' : 'text-gray-900 dark:text-white'}`}>
                    {match.blackPlayer.displayName}
                    {blackIsWinner && <span className="ml-1">✓</span>}
                  </p>
                </div>
              </>
            ) : (
              <span className="text-sm text-gray-500 dark:text-gray-400 italic">TBD</span>
            )}
          </div>
        </div>

        {/* View Game Link */}
        {match.game && (
          <div className="px-3 py-1.5 border-t border-gray-200 dark:border-gray-700">
            <Link
              href={`/play/${match.game.id}`}
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
            >
              {isActive ? 'Watch Live →' : 'View Game →'}
            </Link>
          </div>
        )}
      </div>
    );
  };

  /**
   * Render a bracket round column
   */
  const renderRound = (round: BracketRound, index: number) => {
    const isCurrentRound = round.roundNumber === currentRound;

    return (
      <div key={round.roundNumber} className="flex flex-col items-center">
        {/* Round Header */}
        <div className={`
          mb-4 px-4 py-2 rounded-lg font-bold text-center
          ${isCurrentRound 
            ? 'bg-blue-600 text-white' 
            : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'
          }
        `}>
          <div className="text-sm">{round.roundName}</div>
          <div className="text-xs font-normal opacity-80">Round {round.roundNumber}</div>
        </div>

        {/* Matches */}
        <div className="flex flex-col gap-8">
          {round.matches.map((match) => renderMatch(match, round.roundNumber))}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-blue-400"></div>
      </div>
    );
  }

  if (!bracket || bracket.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600 dark:text-gray-400">
          No bracket available yet. The bracket will appear once the tournament starts.
        </p>
      </div>
    );
  }

  // For double elimination, separate winners and losers brackets
  const isDoubleElimination = format === 'DOUBLE_ELIMINATION' || format === 'double_elimination';

  if (isDoubleElimination) {
    // In double elimination, we need to identify winners bracket vs losers bracket
    // This is a simplified implementation - you may need to enhance based on your backend structure
    const winnersBracket = bracket.filter(round => !round.roundName.includes('Losers'));
    const losersBracket = bracket.filter(round => round.roundName.includes('Losers'));

    return (
      <div className="space-y-8">
        {/* Winners Bracket */}
        {winnersBracket.length > 0 && (
          <div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              Winners Bracket
            </h3>
            <div className="overflow-x-auto pb-4">
              <div className="flex gap-8 items-start min-w-max px-4">
                {winnersBracket.map((round, index) => renderRound(round, index))}
              </div>
            </div>
          </div>
        )}

        {/* Losers Bracket */}
        {losersBracket.length > 0 && (
          <div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              Losers Bracket
            </h3>
            <div className="overflow-x-auto pb-4">
              <div className="flex gap-8 items-start min-w-max px-4">
                {losersBracket.map((round, index) => renderRound(round, index))}
              </div>
            </div>
          </div>
        )}

        {/* Grand Finals */}
        {winnersBracket.length === 0 && losersBracket.length === 0 && (
          <div className="overflow-x-auto pb-4">
            <div className="flex gap-8 items-start min-w-max px-4">
              {bracket.map((round, index) => renderRound(round, index))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Single elimination - simple horizontal bracket
  return (
    <div className="overflow-x-auto pb-4">
      <div className="flex gap-8 items-start min-w-max px-4">
        {bracket.map((round, index) => renderRound(round, index))}
      </div>
    </div>
  );
};
