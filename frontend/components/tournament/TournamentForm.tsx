'use client';

import React, { useState } from 'react';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';

interface TournamentFormProps {
  onSubmit: (data: TournamentFormData) => Promise<void>;
  onCancel: () => void;
  initialData?: Partial<TournamentFormData>;
}

export interface TournamentFormData {
  name: string;
  description?: string;
  bannerUrl?: string;
  format: string;
  timeControl: string;
  initialTimeMinutes: number;
  incrementSeconds: number;
  isRated: boolean;
  minPlayers: number;
  maxPlayers: number;
  roundsTotal?: number;
  pairingMethod: string;
  tiebreakCriteria: string;
  allowLateRegistration: boolean;
  spectatorDelaySeconds: number;
  registrationDeadline: string;
  startTime: string;
  prizeDescription?: string;
}

const formatOptions = [
  { value: 'SWISS', label: 'Swiss System' },
  { value: 'ROUND_ROBIN', label: 'Round Robin' },
  { value: 'SINGLE_ELIMINATION', label: 'Single Elimination' },
  { value: 'DOUBLE_ELIMINATION', label: 'Double Elimination' },
  { value: 'ARENA', label: 'Arena' },
];

const timeControlOptions = [
  { value: 'BULLET', label: 'Bullet' },
  { value: 'BLITZ', label: 'Blitz' },
  { value: 'RAPID', label: 'Rapid' },
  { value: 'CLASSICAL', label: 'Classical' },
];

const pairingMethodOptions = [
  { value: 'automatic', label: 'Automatic' },
  { value: 'manual', label: 'Manual' },
];

const tiebreakOptions = [
  { value: 'buchholz', label: 'Buchholz' },
  { value: 'sonneborn_berger', label: 'Sonneborn-Berger' },
  { value: 'direct_encounter', label: 'Direct Encounter' },
];

export const TournamentForm: React.FC<TournamentFormProps> = ({
  onSubmit,
  onCancel,
  initialData,
}) => {
  const [formData, setFormData] = useState<TournamentFormData>({
    name: initialData?.name || '',
    description: initialData?.description || '',
    bannerUrl: initialData?.bannerUrl || '',
    format: initialData?.format || 'SWISS',
    timeControl: initialData?.timeControl || 'BLITZ',
    initialTimeMinutes: initialData?.initialTimeMinutes || 5,
    incrementSeconds: initialData?.incrementSeconds || 3,
    isRated: initialData?.isRated ?? true,
    minPlayers: initialData?.minPlayers || 4,
    maxPlayers: initialData?.maxPlayers || 100,
    roundsTotal: initialData?.roundsTotal,
    pairingMethod: initialData?.pairingMethod || 'automatic',
    tiebreakCriteria: initialData?.tiebreakCriteria || 'buchholz',
    allowLateRegistration: initialData?.allowLateRegistration ?? false,
    spectatorDelaySeconds: initialData?.spectatorDelaySeconds || 0,
    registrationDeadline: initialData?.registrationDeadline || '',
    startTime: initialData?.startTime || '',
    prizeDescription: initialData?.prizeDescription || '',
  });

  const [errors, setErrors] = useState<Partial<Record<keyof TournamentFormData, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(
    initialData?.bannerUrl || null
  );

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : type === 'number' ? Number(value) : value,
    }));

    // Clear error for this field
    if (errors[name as keyof TournamentFormData]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const handleBannerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file size (2MB max)
      if (file.size > 2 * 1024 * 1024) {
        setErrors((prev) => ({ ...prev, bannerUrl: 'Banner image must be less than 2MB' }));
        return;
      }

      // Validate file type
      if (!file.type.startsWith('image/')) {
        setErrors((prev) => ({ ...prev, bannerUrl: 'Please select a valid image file' }));
        return;
      }

      setBannerFile(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setBannerPreview(reader.result as string);
      };
      reader.readAsDataURL(file);

      // Clear error
      setErrors((prev) => ({ ...prev, bannerUrl: undefined }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof TournamentFormData, string>> = {};

    // Required fields
    if (!formData.name.trim()) {
      newErrors.name = 'Tournament name is required';
    } else if (formData.name.length < 3) {
      newErrors.name = 'Tournament name must be at least 3 characters';
    } else if (formData.name.length > 255) {
      newErrors.name = 'Tournament name must be less than 255 characters';
    }

    if (!formData.registrationDeadline) {
      newErrors.registrationDeadline = 'Registration deadline is required';
    }

    if (!formData.startTime) {
      newErrors.startTime = 'Start time is required';
    }

    // Validate dates
    if (formData.registrationDeadline && formData.startTime) {
      const regDeadline = new Date(formData.registrationDeadline);
      const startTime = new Date(formData.startTime);
      const now = new Date();

      if (regDeadline <= now) {
        newErrors.registrationDeadline = 'Registration deadline must be in the future';
      }

      if (startTime <= regDeadline) {
        newErrors.startTime = 'Start time must be after registration deadline';
      }
    }

    // Validate player limits
    if (formData.minPlayers < 4) {
      newErrors.minPlayers = 'Minimum players must be at least 4';
    }

    if (formData.maxPlayers > 1000) {
      newErrors.maxPlayers = 'Maximum players cannot exceed 1000';
    }

    if (formData.minPlayers > formData.maxPlayers) {
      newErrors.minPlayers = 'Minimum players cannot exceed maximum players';
    }

    // Validate rounds for Swiss System
    if (formData.format === 'SWISS' && !formData.roundsTotal) {
      newErrors.roundsTotal = 'Number of rounds is required for Swiss System';
    }

    // Validate time control
    if (formData.initialTimeMinutes < 1 || formData.initialTimeMinutes > 180) {
      newErrors.initialTimeMinutes = 'Initial time must be between 1 and 180 minutes';
    }

    if (formData.incrementSeconds < 0 || formData.incrementSeconds > 60) {
      newErrors.incrementSeconds = 'Increment must be between 0 and 60 seconds';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      let bannerUrl = formData.bannerUrl;

      // Upload banner if a new file was selected
      if (bannerFile) {
        // TODO: Implement actual image upload to Cloudinary or similar service
        // For now, we'll use a placeholder
        // In production, you would upload to Cloudinary and get the URL
        bannerUrl = bannerPreview || '';
      }

      await onSubmit({
        ...formData,
        bannerUrl,
      });
    } catch (error: any) {
      setErrors({ name: error.message || 'Failed to create tournament' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic Information */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Basic Information
        </h3>

        <Input
          label="Tournament Name *"
          name="name"
          value={formData.name}
          onChange={handleChange}
          error={errors.name}
          placeholder="Enter tournament name"
          maxLength={255}
        />

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Description
          </label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors bg-white dark:bg-gray-800 dark:text-white border-gray-300 dark:border-gray-600 min-h-[100px]"
            placeholder="Enter tournament description"
            maxLength={5000}
          />
          {errors.description && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.description}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Banner Image (Max 2MB)
          </label>
          <input
            type="file"
            accept="image/*"
            onChange={handleBannerChange}
            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors bg-white dark:bg-gray-800 dark:text-white border-gray-300 dark:border-gray-600"
          />
          {errors.bannerUrl && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.bannerUrl}</p>
          )}
          {bannerPreview && (
            <div className="mt-2">
              <img
                src={bannerPreview}
                alt="Banner preview"
                className="w-full h-32 object-cover rounded-lg"
              />
            </div>
          )}
        </div>
      </div>

      {/* Tournament Format */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Tournament Format
        </h3>

        <Select
          label="Format *"
          name="format"
          value={formData.format}
          onChange={handleChange}
          options={formatOptions}
          error={errors.format}
        />

        {formData.format === 'SWISS' && (
          <Input
            label="Number of Rounds *"
            name="roundsTotal"
            type="number"
            value={formData.roundsTotal || ''}
            onChange={handleChange}
            error={errors.roundsTotal}
            min={1}
            max={50}
          />
        )}

        <Select
          label="Pairing Method"
          name="pairingMethod"
          value={formData.pairingMethod}
          onChange={handleChange}
          options={pairingMethodOptions}
        />

        <Select
          label="Tiebreak Criteria"
          name="tiebreakCriteria"
          value={formData.tiebreakCriteria}
          onChange={handleChange}
          options={tiebreakOptions}
        />
      </div>

      {/* Time Control */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Time Control
        </h3>

        <Select
          label="Time Control *"
          name="timeControl"
          value={formData.timeControl}
          onChange={handleChange}
          options={timeControlOptions}
          error={errors.timeControl}
        />

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Initial Time (minutes) *"
            name="initialTimeMinutes"
            type="number"
            value={formData.initialTimeMinutes}
            onChange={handleChange}
            error={errors.initialTimeMinutes}
            min={1}
            max={180}
          />

          <Input
            label="Increment (seconds) *"
            name="incrementSeconds"
            type="number"
            value={formData.incrementSeconds}
            onChange={handleChange}
            error={errors.incrementSeconds}
            min={0}
            max={60}
          />
        </div>

        <div className="flex items-center">
          <input
            type="checkbox"
            name="isRated"
            checked={formData.isRated}
            onChange={handleChange}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <label className="ml-2 text-sm text-gray-700 dark:text-gray-300">
            Rated Tournament
          </label>
        </div>
      </div>

      {/* Player Limits */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Player Limits
        </h3>

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Minimum Players *"
            name="minPlayers"
            type="number"
            value={formData.minPlayers}
            onChange={handleChange}
            error={errors.minPlayers}
            min={4}
            max={1000}
          />

          <Input
            label="Maximum Players *"
            name="maxPlayers"
            type="number"
            value={formData.maxPlayers}
            onChange={handleChange}
            error={errors.maxPlayers}
            min={4}
            max={1000}
          />
        </div>
      </div>

      {/* Schedule */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Schedule
        </h3>

        <Input
          label="Registration Deadline *"
          name="registrationDeadline"
          type="datetime-local"
          value={formData.registrationDeadline}
          onChange={handleChange}
          error={errors.registrationDeadline}
        />

        <Input
          label="Start Time *"
          name="startTime"
          type="datetime-local"
          value={formData.startTime}
          onChange={handleChange}
          error={errors.startTime}
        />
      </div>

      {/* Additional Settings */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Additional Settings
        </h3>

        <div className="flex items-center">
          <input
            type="checkbox"
            name="allowLateRegistration"
            checked={formData.allowLateRegistration}
            onChange={handleChange}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <label className="ml-2 text-sm text-gray-700 dark:text-gray-300">
            Allow Late Registration
          </label>
        </div>

        <Input
          label="Spectator Delay (seconds)"
          name="spectatorDelaySeconds"
          type="number"
          value={formData.spectatorDelaySeconds}
          onChange={handleChange}
          min={0}
          max={3600}
          helperText="Delay before spectators see moves (0 for no delay)"
        />

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Prize Description
          </label>
          <textarea
            name="prizeDescription"
            value={formData.prizeDescription}
            onChange={handleChange}
            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors bg-white dark:bg-gray-800 dark:text-white border-gray-300 dark:border-gray-600 min-h-[80px]"
            placeholder="Enter prize details (optional)"
            maxLength={1000}
          />
        </div>
      </div>

      {/* Form Actions */}
      <div className="flex items-center justify-end gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button type="submit" isLoading={isSubmitting} disabled={isSubmitting}>
          Create Tournament
        </Button>
      </div>
    </form>
  );
};
