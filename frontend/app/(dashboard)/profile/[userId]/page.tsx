'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { ProfileHeader } from '@/components/profile/ProfileHeader';
import { ProfileTabs } from '@/components/profile/ProfileTabs';
import { apiClient } from '@/lib/api-client';
import { authService } from '@/lib/auth';

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

interface UserProfile {
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
  recentGames: any[];
  achievements: any[];
}

export default function ProfilePage() {
  const params = useParams();
  const userId = params.userId as string;

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);

  useEffect(() => {
    // Get current user ID from token
    const token = authService.getToken();
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setCurrentUserId(payload.sub);
      } catch (e) {
        console.error('Failed to parse token:', e);
      }
    }
  }, []);

  useEffect(() => {
    fetchProfile();
    if (currentUserId && currentUserId !== userId) {
      checkFollowStatus();
    }
  }, [userId, currentUserId]);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiClient.get<UserProfile>(`/users/${userId}`);
      setProfile(response);
    } catch (err: any) {
      setError(err.message || 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const checkFollowStatus = async () => {
    try {
      const response = await apiClient.get<{ isFollowing: boolean }>(
        `/follows/status/${userId}`
      );
      setIsFollowing(response.isFollowing);
    } catch (err) {
      console.error('Failed to check follow status:', err);
    }
  };

  const handleFollowToggle = async () => {
    if (!currentUserId || currentUserId === userId) return;

    try {
      setFollowLoading(true);

      if (isFollowing) {
        await apiClient.delete(`/follows/${userId}`);
        setIsFollowing(false);
      } else {
        await apiClient.post(`/follows/${userId}`, {});
        setIsFollowing(true);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to update follow status');
    } finally {
      setFollowLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="max-w-6xl mx-auto py-8">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-800 dark:text-red-200">
            {error || 'Profile not found'}
          </p>
        </div>
      </div>
    );
  }

  const isOwnProfile = currentUserId === userId;

  return (
    <div className="space-y-6">
      <ProfileHeader
        profile={profile}
        isOwnProfile={isOwnProfile}
        isFollowing={isFollowing}
        onFollowToggle={handleFollowToggle}
        followLoading={followLoading}
      />

      <ProfileTabs profile={profile} userId={userId} />
    </div>
  );
}
