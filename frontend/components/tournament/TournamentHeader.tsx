'use client';

import React from 'react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';

interface TournamentHeaderProps {
  tournament: {
    id: string;
    name: string;
    description?: string;
    bannerUrl?: string;
    format: string;
    timeControl: string;
    initialTimeMinutes: number;
    incrementSeconds: number;
    isRated: boolean;
    status: string;
    minPlayers: number;
    maxPlayers: number;
    currentPlayers: number;
    roundsTotal?: number;
    roundsCompleted: number;
    currentRound: number;
    registrationDeadline: string;
    startTime: string;
    prizeDescription?: string;
    creator: {
      id: string;
      displayName: string;
      username: string;
      avatarUrl?: string;
    };
    isUserJoined?: boolean;
  };
  onJoin: () => void;
  onLeave: () => void;
  isJoining: boolean;
  isLeaving: boolean;
  currentUserId: string | null;
}

const formatMap: Record<string, string> = {
  SWISS: 'Swiss System',
  ROUND_ROBIN: 'Round Robin',
  SINGLE_ELIMINATION: 'Single Elimination',
  DOUBLE_ELIMINATION: 'Double Elimination',
  ARENA: 'Arena',
};

const timeControlMap: Record<string, string> = {
  BULLET: 'Bullet',
  BLITZ: 'Blitz',
  RAPID: 'Rapid',
  CLASSICAL: 'Classical',
};

const statusMap: Record<string, { label: string; color: string }> = {
  CREATED: { label: 'Created', color: 'bg-gray-500' },
  REGISTRATION_OPEN: { label: 'Registration Open', color: 'bg-green-500' },
  REGISTRATION_CLOSED: { label: 'Registration Closed', color: 'bg-yellow-500' },
  IN_PROGRESS: { label: 'In Progress', color: 'bg-blue-500' },
  ROUND_IN_PROGRESS: { label: 'Round In Progress', color: 'bg-blue-600' },
  ROUND_COMPLETED: { label: 'Round Completed', color: 'bg-blue-400' },
  COMPLETED: { label: 'Completed', color: 'bg-gray-600' },
  CANCELLED: { label: 'Cancelled', color: 'bg-red-500' },
};

export const TournamentHeader: React.FC<TournamentHeaderProps> = ({
  tournament,
  onJoin,
  onLeave,
  isJoining,
  isLeaving,
  currentUserId,
}) => {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const status = statusMap[tournament.status] || { 
    label: tournament.status, 
    color: 'bg-gray-500' 
  };

  const canJoin = 
    currentUserId &&
    !tournament.isUserJoined &&
    (tournament.status === 'REGISTRATION_OPEN' || 
     (tournament.status === 'IN_PROGRESS' && tournament.allowLateRegistration)) &&
    tournament.currentPlayers < tournament.maxPlayers;

  const canLeave = 
    currentUserId &&
    tournament.isUserJoined &&
    (tournament.status === 'REGISTRATION_OPEN' || tournament.status === 'CREATED');

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
      {/* Banner */}
      {tournament.bannerUrl && (
        <div className="w-full h-48 md:h-64 overflow-hidden">
          <img
            src={tournament.bannerUrl}
            alt={tournament.name}
            className="w-full h-full object-cover"
          />
        </div>
      )}

      {/* Tournament Info */}
      <div className="p-6">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                {tournament.name}
              </h1>
              <span className={`px-3 py-1 text-sm font-semibold text-white rounded ${status.color}`}>
                {status.label}
              </span>
            </div>

            {tournament.description && (
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                {tournament.description}
              </p>
            )}

            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <span>Organized by</span>
              <span className="font-medium text-gray-900 dark:text-white">
                {tournament.creator.displayName}
              </span>
            </div>
          </div>

          {/* Join/Leave Buttons */}
          <div className="flex gap-2">
            {canJoin && (
              <Button
                onClick={onJoin}
                isLoading={isJoining}
                disabled={isJoining}
              >
                Join Tournament
              </Button>
            )}
            {canLeave && (
              <Button
                variant="outline"
                onClick={onLeave}
                isLoading={isLeaving}
                disabled={isLeaving}
              >
                Leave Tournament
              </Button>
            )}
          </div>
        </div>

        {/* Tournament Details Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Format</p>
            <p className="font-semibold text-gray-900 dark:text-white">
              {formatMap[tournament.format] || tournament.format}
            </p>
          </div>

          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Time Control</p>
            <p className="font-semibold text-gray-900 dark:text-white">
              {timeControlMap[tournament.timeControl]} ({tournament.initialTimeMinutes}+{tournament.incrementSeconds})
            </p>
          </div>

          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Players</p>
            <p className="font-semibold text-gray-900 dark:text-white">
              {tournament.currentPlayers} / {tournament.maxPlayers}
            </p>
          </div>

          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Type</p>
            <p className="font-semibold text-gray-900 dark:text-white">
              {tournament.isRated ? 'Rated' : 'Unrated'}
            </p>
          </div>

          {tournament.roundsTotal && (
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Rounds</p>
              <p className="font-semibold text-gray-900 dark:text-white">
                {tournament.roundsCompleted} / {tournament.roundsTotal}
              </p>
            </div>
          )}

          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Registration Deadline</p>
            <p className="font-semibold text-gray-900 dark:text-white text-sm">
              {formatDate(tournament.registrationDeadline)}
            </p>
          </div>

          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Start Time</p>
            <p className="font-semibold text-gray-900 dark:text-white text-sm">
              {formatDate(tournament.startTime)}
            </p>
          </div>

          {tournament.prizeDescription && (
            <div className="col-span-2 md:col-span-4">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Prizes</p>
              <p className="font-semibold text-gray-900 dark:text-white">
                {tournament.prizeDescription}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
