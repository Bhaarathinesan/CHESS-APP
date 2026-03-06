'use client';

import React, { useState, useEffect, useRef } from 'react';
import { apiClient } from '@/lib/api-client';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

/**
 * Profile Tab Component
 * Allows users to edit display name, bio, location, college info, and avatar
 */

interface ProfileData {
  displayName: string;
  bio: string;
  country: string;
  city: string;
  collegeName: string;
  avatarUrl?: string;
}

export function ProfileTab() {
  const [profile, setProfile] = useState<ProfileData>({
    displayName: '',
    bio: '',
    country: '',
    city: '',
    collegeName: '',
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const data = await apiClient.get<any>('/api/users/me');
      setProfile({
        displayName: data.displayName || '',
        bio: data.bio || '',
        country: data.country || '',
        city: data.city || '',
        collegeName: data.collegeName || '',
        avatarUrl: data.avatarUrl,
      });
    } catch (error) {
      console.error('Failed to load profile:', error);
      setMessage({ type: 'error', text: 'Failed to load profile' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (field: keyof ProfileData, value: string) => {
    setProfile((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    setMessage(null);

    try {
      await apiClient.patch('/api/users/me', {
        displayName: profile.displayName,
        bio: profile.bio,
        country: profile.country,
        city: profile.city,
      });

      setMessage({ type: 'success', text: 'Profile updated successfully' });
    } catch (error: any) {
      console.error('Failed to save profile:', error);
      setMessage({ type: 'error', text: error.message || 'Failed to save profile' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      setMessage({ type: 'error', text: 'Avatar must be less than 5MB' });
      return;
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setMessage({ type: 'error', text: 'Avatar must be an image file' });
      return;
    }

    setIsUploadingAvatar(true);
    setMessage(null);

    try {
      const formData = new FormData();
      formData.append('avatar', file);

      const data = await apiClient.post<any>('/api/users/me/avatar', formData);

      setProfile((prev) => ({ ...prev, avatarUrl: data.avatarUrl }));
      setMessage({ type: 'success', text: 'Avatar updated successfully' });
    } catch (error: any) {
      console.error('Failed to upload avatar:', error);
      setMessage({ type: 'error', text: error.message || 'Failed to upload avatar' });
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Profile Information</h2>
        <p className="text-gray-600 dark:text-gray-400">
          Update your profile information and avatar
        </p>
      </div>

      {message && (
        <div
          className={`p-4 rounded-lg ${
            message.type === 'success'
              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
              : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Avatar Upload */}
      <div className="flex items-center gap-6">
        <div className="relative">
          <div
            className="w-24 h-24 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center overflow-hidden cursor-pointer hover:opacity-80 transition-opacity"
            onClick={handleAvatarClick}
          >
            {profile.avatarUrl ? (
              <img
                src={profile.avatarUrl}
                alt="Avatar"
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-4xl text-gray-400">👤</span>
            )}
          </div>
          {isUploadingAvatar && (
            <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-full">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
            </div>
          )}
        </div>
        <div>
          <Button onClick={handleAvatarClick} disabled={isUploadingAvatar}>
            {isUploadingAvatar ? 'Uploading...' : 'Change Avatar'}
          </Button>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
            JPG, PNG or GIF. Max size 5MB.
          </p>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleAvatarChange}
          className="hidden"
        />
      </div>

      {/* Profile Fields */}
      <div className="space-y-4">
        <div>
          <label htmlFor="displayName" className="block text-sm font-medium mb-2">
            Display Name
          </label>
          <Input
            id="displayName"
            type="text"
            value={profile.displayName}
            onChange={(e) => handleChange('displayName', e.target.value)}
            maxLength={100}
            placeholder="Your display name"
          />
        </div>

        <div>
          <label htmlFor="bio" className="block text-sm font-medium mb-2">
            Bio
          </label>
          <textarea
            id="bio"
            value={profile.bio}
            onChange={(e) => handleChange('bio', e.target.value)}
            maxLength={500}
            rows={4}
            placeholder="Tell us about yourself..."
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {profile.bio.length}/500 characters
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="country" className="block text-sm font-medium mb-2">
              Country
            </label>
            <Input
              id="country"
              type="text"
              value={profile.country}
              onChange={(e) => handleChange('country', e.target.value)}
              maxLength={100}
              placeholder="Your country"
            />
          </div>

          <div>
            <label htmlFor="city" className="block text-sm font-medium mb-2">
              City
            </label>
            <Input
              id="city"
              type="text"
              value={profile.city}
              onChange={(e) => handleChange('city', e.target.value)}
              maxLength={100}
              placeholder="Your city"
            />
          </div>
        </div>

        <div>
          <label htmlFor="collegeName" className="block text-sm font-medium mb-2">
            College
          </label>
          <Input
            id="collegeName"
            type="text"
            value={profile.collegeName}
            disabled
            className="bg-gray-100 dark:bg-gray-700 cursor-not-allowed"
          />
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            College information cannot be changed
          </p>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </div>
  );
}
