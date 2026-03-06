'use client';

import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';

interface Player {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
}

interface Game {
  id: string;
  whitePlayer: Player;
  blackPlayer: Player;
  timeControl: string;
  initialTimeMinutes: number;
  incrementSeconds: number;
  result?: 'white_win' | 'black_win' | 'draw';
  terminationReason?: string;
  moveCount: number;
  whiteRatingBefore?: number;
  blackRatingBefore?: number;
  whiteRatingAfter?: number;
  blackRatingAfter?: number;
  completedAt?: Date;
  createdAt: Date;
}

interface GameHistoryCardProps {
  game: Game;
  currentUserId: string;
}

export default function GameHistoryCard({ game, currentUserId }: GameHistoryCardProps) {
  const isWhite = game.whitePlayer.id === currentUserId;
  const opponent = isWhite ? game.blackPlayer : game.whitePlayer;
  const myColor = isWhite ? 'white' : 'black';
  const opponentColor = isWhite ? 'black' : 'white';

  // Determine result from current user's perspective
  let resultText = '';
  let resultColor = '';
  let ratingChange = 0;

  if (game.result === 'white_win') {
    if (isWhite) {
      resultText = 'Win';
      resultColor = 'text-green-500';
      ratingChange = (game.whiteRatingAfter || 0) - (game.whiteRatingBefore || 0);
    } else {
      resultText = 'Loss';
      resultColor = 'text-red-500';
      ratingChange = (game.blackRatingAfter || 0) - (game.blackRatingBefore || 0);
    }
  } else if (game.result === 'black_win') {
    if (isWhite) {
      resultText = 'Loss';
      resultColor = 'text-red-500';
      ratingChange = (game.whiteRatingAfter || 0) - (game.whiteRatingBefore || 0);
    } else {
      resultText = 'Win';
      resultColor = 'text-green-500';
      ratingChange = (game.blackRatingAfter || 0) - (game.blackRatingBefore || 0);
    }
  } else if (game.result === 'draw') {
    resultText = 'Draw';
    resultColor = 'text-gray-500';
    ratingChange = isWhite
      ? (game.whiteRatingAfter || 0) - (game.whiteRatingBefore || 0)
      : (game.blackRatingAfter || 0) - (game.blackRatingBefore || 0);
  }

  const timeControlDisplay = `${game.initialTimeMinutes}+${game.incrementSeconds}`;
  const timeAgo = game.completedAt
    ? formatDistanceToNow(new Date(game.completedAt), { addSuffix: true })
    : formatDistanceToNow(new Date(game.createdAt), { addSuffix: true });

  return (
    <Link href={`/history/${game.id}`}>
      <div className="bg-background-secondary border border-border rounded-lg p-4 hover:border-primary transition-colors cursor-pointer">
        <div className="flex items-center justify-between">
          {/* Left: Opponent Info */}
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-full bg-background flex items-center justify-center text-foreground font-semibold">
              {opponent.avatarUrl ? (
                <img
                  src={opponent.avatarUrl}
                  alt={opponent.displayName}
                  className="w-12 h-12 rounded-full object-cover"
                />
              ) : (
                opponent.displayName.charAt(0).toUpperCase()
              )}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-semibold text-foreground">{opponent.displayName}</span>
                <span className="text-sm text-foreground-secondary">
                  ({isWhite ? game.blackRatingBefore : game.whiteRatingBefore})
                </span>
              </div>
              <div className="text-sm text-foreground-secondary">
                {timeControlDisplay} • {game.timeControl.charAt(0).toUpperCase() + game.timeControl.slice(1)}
              </div>
            </div>
          </div>

          {/* Center: Result */}
          <div className="text-center">
            <div className={`text-2xl font-bold ${resultColor}`}>{resultText}</div>
            {ratingChange !== 0 && (
              <div className={`text-sm ${ratingChange > 0 ? 'text-green-500' : 'text-red-500'}`}>
                {ratingChange > 0 ? '+' : ''}{ratingChange}
              </div>
            )}
          </div>

          {/* Right: Game Info */}
          <div className="text-right">
            <div className="text-sm text-foreground-secondary">{game.moveCount} moves</div>
            <div className="text-sm text-foreground-secondary">{timeAgo}</div>
            {game.terminationReason && (
              <div className="text-xs text-foreground-secondary mt-1">
                {game.terminationReason.replace(/_/g, ' ')}
              </div>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
