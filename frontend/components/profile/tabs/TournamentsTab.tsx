'use client';

import React, { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api-client';

interface TournamentsTabProps {
  userId: string;
}

export const TournamentsTab: React.FC<TournamentsTabProps> = ({ userId }) => {
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTournaments();
  }, [userId]);

  const fetchTournaments = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get<any[]>(`/users/${userId}/tournaments`);
      setTournaments(response || []);
    } catch (err) {
      console.error('Failed to fetch tournaments:', err);
      setTournaments([]);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatMap: Record<string, string> = {
    SWISS: 'Swiss',
    ROUND_ROBIN: 'Round Robin',
    SINGLE_ELIMINATION: 'Single Elim',
    DOUBLE_ELIMINATION: 'Double Elim',
    ARENA: 'Arena',
  };

  const statusMap: Record<string, { label: string; color: string }> = {
    COMPLETED: { label: 'Completed', color: 'bg-gray-500' },
    IN_PROGRESS: { label: 'In Progress', color: 'bg-blue-500' },
    REGISTRATION_OPEN: { label: 'Open', color: 'bg-green-500' },
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (tournaments.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500 dark:text-gray-400">
        No tournament history
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {tournaments.map((tournament) => {
        const status = statusMap[tournament.status] || { label: tournament.status, color: 'bg-gray-500' };
        
        return (
          <div
            key={tournament.id}
            className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer"
            onClick={() => window.location.href = `/tournaments/${tournament.id}`}
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1">
                <h4 className="font-semibold text-gray-900 dark:text-white mb-1">
                  {tournament.name}
                </h4>
                <div className="flex flex-wrap gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <span>{formatMap[tournament.format] || tournament.format}</span>
                  <span>•</span>
                  <span>{tournament.currentPlayers} players</span>
                  {tournament.rank && (
                    <>
                      <span>•</span>
                      <span className="font-medium text-blue-600 dark:text-blue-400">
                        #{tournament.rank}
                      </span>
                    </>
                  )}
                </div>
              </div>
              <span className={`px-2 py-1 text-xs font-semibold text-white rounded ${status.color}`}>
                {status.label}
              </span>
            </div>
            
            {tournament.score !== undefined && (
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Score: {tournament.score} points
              </div>
            )}
            
            <div className="text-xs text-gray-500 dark:text-gray-500 mt-2">
              {formatDate(tournament.startTime)}
            </div>
          </div>
        );
      })}
    </div>
  );
};
