'use client';

import { Card } from '@/components/ui/Card';
import Link from 'next/link';

interface Achievement {
  id: string;
  code: string;
  name: string;
  description: string;
  category: string;
  points: number;
  iconUrl?: string;
}

interface UserAchievement {
  id: string;
  earnedAt: string;
  achievement: Achievement;
}

interface AchievementsSectionProps {
  achievements: UserAchievement[];
}

export function AchievementsSection({ achievements }: AchievementsSectionProps) {
  // Show only the most recent 8 achievements
  const displayedAchievements = achievements.slice(0, 8);
  const totalPoints = achievements.reduce(
    (sum, ua) => sum + ua.achievement.points,
    0
  );

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Achievements</h2>
        <div className="text-sm text-gray-600 dark:text-gray-400">
          {achievements.length} earned • {totalPoints} points
        </div>
      </div>

      {achievements.length === 0 ? (
        <p className="text-gray-600 dark:text-gray-400 text-center py-8">
          No achievements earned yet
        </p>
      ) : (
        <>
          <div className="grid grid-cols-4 gap-2 mb-4">
            {displayedAchievements.map((userAchievement) => (
              <div
                key={userAchievement.id}
                className="relative group"
                title={`${userAchievement.achievement.name}: ${userAchievement.achievement.description}`}
              >
                {userAchievement.achievement.iconUrl ? (
                  <img
                    src={userAchievement.achievement.iconUrl}
                    alt={userAchievement.achievement.name}
                    className="w-16 h-16 rounded-lg border-2 border-yellow-500"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center text-2xl border-2 border-yellow-500">
                    🏆
                  </div>
                )}
                <div className="absolute inset-0 bg-black/80 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-2">
                  <p className="text-white text-xs text-center font-semibold">
                    {userAchievement.achievement.name}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {achievements.length > 8 && (
            <Link
              href="/achievements"
              className="text-blue-600 dark:text-blue-400 hover:underline text-sm"
            >
              View all {achievements.length} achievements →
            </Link>
          )}
        </>
      )}
    </Card>
  );
}
