'use client';

import React from 'react';
import Link from 'next/link';
import { Card, CardContent } from '../ui/Card';

interface TournamentCardProps {
  tournament: {
    id: string;
    name: string;
    description?: string;
    format: string;
    timeControl: string;
    status: string;
    currentPlayers: number;
    maxPlayers: number;
    startTime: string;
    bannerUrl?: string;
    creator: {
      displayName: string;
    };
  };
}

const formatMap: Record<string, string> = {
  SWISS: 'Swiss',
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
  REGISTRATION_OPEN: { label: 'Open', color: 'bg-green-500' },
  REGISTRATION_CLOSED: { label: 'Closed', color: 'bg-yellow-500' },
  IN_PROGRESS: { label: 'In Progress', color: 'bg-blue-500' },
  ROUND_IN_PROGRESS: { label: 'Round Active', color: 'bg-blue-600' },
  ROUND_COMPLETED: { label: 'Round Done', color: 'bg-blue-400' },
  COMPLETED: { label: 'Completed', color: 'bg-gray-600' },
  CANCELLED: { label: 'Cancelled', color: 'bg-red-500' },
};

export const TournamentCard: React.FC<TournamentCardProps> = ({ tournament }) => {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const status = statusMap[tournament.status] || { label: tournament.status, color: 'bg-gray-500' };

  return (
    <Link href={`/tournaments/${tournament.id}`}>
      <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
        {tournament.bannerUrl && (
          <div className="w-full h-32 overflow-hidden rounded-t-lg">
            <img
              src={tournament.bannerUrl}
              alt={tournament.name}
              className="w-full h-full object-cover"
            />
          </div>
        )}
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-2">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white line-clamp-1">
              {tournament.name}
            </h3>
            <span className={`px-2 py-1 text-xs font-semibold text-white rounded ${status.color}`}>
              {status.label}
            </span>
          </div>

          {tournament.description && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
              {tournament.description}
            </p>
          )}

          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-gray-600 dark:text-gray-400">Format:</span>
              <span className="font-medium text-gray-900 dark:text-white">
                {formatMap[tournament.format] || tournament.format}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-gray-600 dark:text-gray-400">Time Control:</span>
              <span className="font-medium text-gray-900 dark:text-white">
                {timeControlMap[tournament.timeControl] || tournament.timeControl}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-gray-600 dark:text-gray-400">Players:</span>
              <span className="font-medium text-gray-900 dark:text-white">
                {tournament.currentPlayers} / {tournament.maxPlayers}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-gray-600 dark:text-gray-400">Starts:</span>
              <span className="font-medium text-gray-900 dark:text-white text-xs">
                {formatDate(tournament.startTime)}
              </span>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-gray-200 dark:border-gray-700">
              <span className="text-xs text-gray-500 dark:text-gray-500">
                By {tournament.creator.displayName}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
};
