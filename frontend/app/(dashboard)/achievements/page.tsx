'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';

interface Achievement {
  id: string;
  code: string;
  name: string;
  description: string;
  category: string;
  points: number;
  iconUrl?: string;
  isHidden: boolean;
}

interface UserAchievement {
  id: string;
  earnedAt: string;
  achievement: Achievement;
}

interface AchievementProgress {
  totalAchievements: number;
  earnedAchievements: number;
  progress: {
    totalGames: number;
    wins: number;
    checkmateWins: number;
    tournamentCount: number;
    tournamentGames: number;
    followCount: number;
    highestRating: number;
  };
}

export default function AchievementsPage() {
  const [userAchievements, setUserAchievements] = useState<UserAchievement[]>([]);
  const [allAchievements, setAllAchievements] = useState<Achievement[]>([]);
  const [progress, setProgress] = useState<AchievementProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  useEffect(() => {
    fetchAchievements();
  }, []);

  const fetchAchievements = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      const [userAchievementsRes, allAchievementsRes, progressRes] = await Promise.all([
        fetch('http://localhost:4000/achievements/my', { headers }),
        fetch('http://localhost:4000/achievements', { headers }),
        fetch('http://localhost:4000/achievements/my/progress', { headers }),
      ]);

      const userAchievementsData = await userAchievementsRes.json();
      const allAchievementsData = await allAchievementsRes.json();
      const progressData = await progressRes.json();

      setUserAchievements(userAchievementsData);
      setAllAchievements(allAchievementsData);
      setProgress(progressData);
    } catch (error) {
      console.error('Failed to fetch achievements:', error);
    } finally {
      setLoading(false);
    }
  };

  const earnedAchievementIds = new Set(
    userAchievements.map((ua) => ua.achievement.id)
  );

  const categories = [
    { value: 'all', label: 'All' },
    { value: 'gameplay', label: 'Gameplay' },
    { value: 'tournament', label: 'Tournament' },
    { value: 'rating', label: 'Rating' },
    { value: 'social', label: 'Social' },
  ];

  const filteredAchievements = allAchievements.filter(
    (achievement) =>
      selectedCategory === 'all' || achievement.category === selectedCategory
  );

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Skeleton className="h-8 w-64 mb-6" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Achievements</h1>

      {/* Progress Summary */}
      {progress && (
        <Card className="mb-8 p-6">
          <h2 className="text-xl font-semibold mb-4">Your Progress</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Achievements</p>
              <p className="text-2xl font-bold">
                {progress.earnedAchievements}/{progress.totalAchievements}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Games</p>
              <p className="text-2xl font-bold">{progress.progress.totalGames}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Tournaments</p>
              <p className="text-2xl font-bold">{progress.progress.tournamentCount}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Highest Rating</p>
              <p className="text-2xl font-bold">{progress.progress.highestRating}</p>
            </div>
          </div>
        </Card>
      )}

      {/* Category Filter */}
      <div className="flex gap-2 mb-6 overflow-x-auto">
        {categories.map((category) => (
          <button
            key={category.value}
            onClick={() => setSelectedCategory(category.value)}
            className={`px-4 py-2 rounded-lg whitespace-nowrap ${
              selectedCategory === category.value
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
            }`}
          >
            {category.label}
          </button>
        ))}
      </div>

      {/* Achievements Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredAchievements.map((achievement) => {
          const isEarned = earnedAchievementIds.has(achievement.id);
          const userAchievement = userAchievements.find(
            (ua) => ua.achievement.id === achievement.id
          );

          return (
            <Card
              key={achievement.id}
              className={`p-4 ${
                isEarned
                  ? 'border-2 border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20'
                  : 'opacity-60'
              }`}
            >
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  {achievement.iconUrl ? (
                    <img
                      src={achievement.iconUrl}
                      alt={achievement.name}
                      className="w-16 h-16 rounded-lg"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center text-2xl">
                      🏆
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg mb-1">
                    {achievement.name}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                    {achievement.description}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs px-2 py-1 rounded bg-gray-200 dark:bg-gray-700">
                      {achievement.category}
                    </span>
                    <span className="text-sm font-semibold text-yellow-600 dark:text-yellow-400">
                      {achievement.points} pts
                    </span>
                  </div>
                  {isEarned && userAchievement && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                      Earned {new Date(userAchievement.earnedAt).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {filteredAchievements.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-600 dark:text-gray-400">
            No achievements found in this category.
          </p>
        </div>
      )}
    </div>
  );
}
