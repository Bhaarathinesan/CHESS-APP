'use client';

import { formatDistanceToNow, format } from 'date-fns';

interface Player {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
}

interface GameInfoProps {
  game: {
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
    openingName?: string;
    completedAt?: Date;
    createdAt: Date;
  };
}

export default function GameInfo({ game }: GameInfoProps) {
  const timeControlDisplay = `${game.initialTimeMinutes}+${game.incrementSeconds}`;

  let resultText = '';
  let resultColor = '';

  if (game.result === 'white_win') {
    resultText = '1-0';
    resultColor = 'text-foreground';
  } else if (game.result === 'black_win') {
    resultText = '0-1';
    resultColor = 'text-foreground';
  } else if (game.result === 'draw') {
    resultText = '½-½';
    resultColor = 'text-gray-500';
  }

  const whiteRatingChange = game.whiteRatingAfter && game.whiteRatingBefore
    ? game.whiteRatingAfter - game.whiteRatingBefore
    : 0;

  const blackRatingChange = game.blackRatingAfter && game.blackRatingBefore
    ? game.blackRatingAfter - game.blackRatingBefore
    : 0;

  return (
    <div className="bg-background-secondary border border-border rounded-lg p-6 space-y-6">
      <h2 className="text-xl font-bold text-foreground">Game Information</h2>

      {/* Players */}
      <div className="space-y-4">
        {/* White Player */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-gray-800 font-semibold border-2 border-gray-300">
              {game.whitePlayer.avatarUrl ? (
                <img
                  src={game.whitePlayer.avatarUrl}
                  alt={game.whitePlayer.displayName}
                  className="w-10 h-10 rounded-full object-cover"
                />
              ) : (
                game.whitePlayer.displayName.charAt(0).toUpperCase()
              )}
            </div>
            <div>
              <div className="font-semibold text-foreground">
                {game.whitePlayer.displayName}
              </div>
              <div className="text-sm text-foreground-secondary">
                {game.whiteRatingBefore || 'Unrated'}
              </div>
            </div>
          </div>
          {whiteRatingChange !== 0 && (
            <div className={`text-sm font-medium ${whiteRatingChange > 0 ? 'text-green-500' : 'text-red-500'}`}>
              {whiteRatingChange > 0 ? '+' : ''}{whiteRatingChange}
            </div>
          )}
        </div>

        {/* Black Player */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center text-white font-semibold border-2 border-gray-600">
              {game.blackPlayer.avatarUrl ? (
                <img
                  src={game.blackPlayer.avatarUrl}
                  alt={game.blackPlayer.displayName}
                  className="w-10 h-10 rounded-full object-cover"
                />
              ) : (
                game.blackPlayer.displayName.charAt(0).toUpperCase()
              )}
            </div>
            <div>
              <div className="font-semibold text-foreground">
                {game.blackPlayer.displayName}
              </div>
              <div className="text-sm text-foreground-secondary">
                {game.blackRatingBefore || 'Unrated'}
              </div>
            </div>
          </div>
          {blackRatingChange !== 0 && (
            <div className={`text-sm font-medium ${blackRatingChange > 0 ? 'text-green-500' : 'text-red-500'}`}>
              {blackRatingChange > 0 ? '+' : ''}{blackRatingChange}
            </div>
          )}
        </div>
      </div>

      {/* Result */}
      <div className="border-t border-border pt-4">
        <div className="flex items-center justify-between">
          <span className="text-foreground-secondary">Result</span>
          <span className={`text-2xl font-bold ${resultColor}`}>{resultText}</span>
        </div>
        {game.terminationReason && (
          <div className="text-sm text-foreground-secondary mt-1 text-right">
            {game.terminationReason.replace(/_/g, ' ')}
          </div>
        )}
      </div>

      {/* Game Details */}
      <div className="border-t border-border pt-4 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-foreground-secondary">Time Control</span>
          <span className="text-foreground font-medium">
            {timeControlDisplay} • {game.timeControl.charAt(0).toUpperCase() + game.timeControl.slice(1)}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-foreground-secondary">Moves</span>
          <span className="text-foreground font-medium">{game.moveCount}</span>
        </div>

        {game.openingName && (
          <div className="flex items-center justify-between">
            <span className="text-foreground-secondary">Opening</span>
            <span className="text-foreground font-medium">{game.openingName}</span>
          </div>
        )}

        <div className="flex items-center justify-between">
          <span className="text-foreground-secondary">Date</span>
          <span className="text-foreground font-medium">
            {game.completedAt
              ? format(new Date(game.completedAt), 'MMM d, yyyy')
              : format(new Date(game.createdAt), 'MMM d, yyyy')}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-foreground-secondary">Time</span>
          <span className="text-foreground font-medium">
            {game.completedAt
              ? format(new Date(game.completedAt), 'h:mm a')
              : format(new Date(game.createdAt), 'h:mm a')}
          </span>
        </div>
      </div>

      {/* Share Button */}
      <div className="border-t border-border pt-4">
        <button
          onClick={() => {
            const url = `${window.location.origin}/games/${game.id}`;
            navigator.clipboard.writeText(url);
            alert('Game link copied to clipboard!');
          }}
          className="w-full px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
        >
          Share Game
        </button>
      </div>
    </div>
  );
}
