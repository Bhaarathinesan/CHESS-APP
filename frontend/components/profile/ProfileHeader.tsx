'use client';

import React from 'react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';

interface Rating {
  id: string;
  timeControl: string;
  rating: number;
  peakRating: number;
  gamesPlayed: number;
  wins: number;
  losses: number;
  draws: number;
  isProvisional: boolean;
}

interface ProfileHeaderProps {
  profile: {
    user: {
      id: string;
      username: string;
      displayName: string;
      avatarUrl?: string;
      bio?: string;
      country?: string;
      city?: string;
      collegeName: string;
      isOnline: boolean;
      lastOnline?: string;
      createdAt: string;
    };
    ratings: Rating[];
  };
  isOwnProfile: boolean;
  isFollowing: boolean;
  onFollowToggle: () => void;
  followLoading: boolean;
}

const timeControlMap: Record<string, string> = {
  BULLET: 'Bullet',
  BLITZ: 'Blitz',
  RAPID: 'Rapid',
  CLASSICAL: 'Classical',
};

export const ProfileHeader: React.FC<ProfileHeaderProps> = ({
  profile,
  isOwnProfile,
  isFollowing,
  onFollowToggle,
  followLoading,
}) => {
  const { user, ratings } = profile;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric',
    });
  };

  const formatLastOnline = (dateString?: string) => {
    if (!dateString) return 'Never';
    
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  // Calculate total stats
  const totalGames = ratings.reduce((sum, r) => sum + r.gamesPlayed, 0);
  const totalWins = ratings.reduce((sum, r) => sum + r.wins, 0);
  const totalLosses = ratings.reduce((sum, r) => sum + r.losses, 0);
  const totalDraws = ratings.reduce((sum, r) => sum + r.draws, 0);
  const winRate = totalGames > 0 ? ((totalWins / totalGames) * 100).toFixed(1) : '0.0';

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
      <div className="p-6">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
          {/* Left: Avatar and Basic Info */}
          <div className="flex items-start gap-4">
            <div className="relative">
              <Avatar
                src={user.avatarUrl}
                alt={user.displayName}
                size="xl"
              />
              {user.isOnline && (
                <div className="absolute bottom-1 right-1 w-4 h-4 bg-green-500 border-2 border-white dark:border-gray-800 rounded-full"></div>
              )}
            </div>

            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
                {user.displayName}
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mb-2">
                @{user.username}
              </p>

              {user.bio && (
                <p className="text-gray-700 dark:text-gray-300 mb-3 max-w-2xl">
                  {user.bio}
                </p>
              )}

              <div className="flex flex-wrap gap-3 text-sm text-gray-600 dark:text-gray-400">
                {user.country && (
                  <div className="flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span>{user.city ? `${user.city}, ${user.country}` : user.country}</span>
                  </div>
                )}
                <div className="flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  <span>{user.collegeName}</span>
                </div>
                <div className="flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span>Joined {formatDate(user.createdAt)}</span>
                </div>
                {!user.isOnline && user.lastOnline && (
                  <div className="flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>Last seen {formatLastOnline(user.lastOnline)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right: Action Buttons */}
          {!isOwnProfile && (
            <div className="flex gap-2">
              <Button
                onClick={onFollowToggle}
                isLoading={followLoading}
                disabled={followLoading}
                variant={isFollowing ? 'outline' : 'primary'}
              >
                {isFollowing ? 'Unfollow' : 'Follow'}
              </Button>
              <Button variant="outline">
                Challenge
              </Button>
            </div>
          )}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {totalGames}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Games</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">
              {totalWins}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Wins</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-red-600 dark:text-red-400">
              {totalLosses}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Losses</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-600 dark:text-gray-400">
              {totalDraws}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Draws</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {winRate}%
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Win Rate</p>
          </div>
        </div>

        {/* Ratings */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          {ratings.map((rating) => (
            <div
              key={rating.id}
              className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4"
            >
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  {timeControlMap[rating.timeControl] || rating.timeControl}
                </p>
                {rating.isProvisional && (
                  <Badge variant="secondary" size="sm">?</Badge>
                )}
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {rating.rating}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                Peak: {rating.peakRating}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-500">
                {rating.gamesPlayed} games
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
