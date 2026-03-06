'use client';

import React from 'react';
import { AchievementsSection } from '@/components/profile/AchievementsSection';

interface OverviewTabProps {
  profile: {
    user: any;
    ratings: any[];
    recentGames: any[];
    achievements: any[];
  };
  userId: string;
}

export const OverviewTab: React.FC<OverviewTabProps> = ({ profile, userId }) => {
  const { recentGames, achievements } = profile;

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

  const getResultBadge = (game: any, userId: string) => {
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

  return (
    <div className="space-y-6">
      {/* Recent Games */}
      <div>
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
          Recent Games
        </h3>
        
        {recentGames.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            No games played yet
          </div>
        ) : (
          <div className="space-y-3">
            {recentGames.slice(0, 5).map((game) => {
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
                      {getResultBadge(game, userId)}
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
        )}
      </div>

      {/* Achievements */}
      <div>
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
          Achievements
        </h3>
        <AchievementsSection achievements={achievements} />
      </div>
    </div>
  );
};
