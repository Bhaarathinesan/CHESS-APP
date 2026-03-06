'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/Card';
import { apiClient } from '@/lib/api-client';
import { StandingsTable } from '../StandingsTable';
import { io, Socket } from 'socket.io-client';

interface Standing {
  id: string;
  userId: string;
  score: number;
  wins: number;
  losses: number;
  draws: number;
  buchholzScore?: number;
  sonnebornBerger?: number;
  rank: number;
  user: {
    displayName: string;
    username: string;
    avatarUrl?: string;
  };
}

interface StandingsTabProps {
  tournamentId: string;
  format: string;
}

/**
 * StandingsTab Component
 * 
 * Displays tournament standings with real-time updates.
 * 
 * Features:
 * - Fetch standings from API
 * - Real-time updates via WebSocket (Requirement 12.1)
 * - Display standings using StandingsTable component
 * - Error handling and loading states
 * 
 * WebSocket Events:
 * - standings_updated: Receive real-time standings updates
 */
export const StandingsTab: React.FC<StandingsTabProps> = ({ tournamentId, format }) => {
  const [standings, setStandings] = useState<Standing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);

  // Get current user ID from JWT token
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setCurrentUserId(payload.sub);
      } catch (e) {
        console.error('Failed to parse token:', e);
      }
    }
  }, []);

  // Fetch initial standings
  useEffect(() => {
    fetchStandings();
  }, [tournamentId]);

  // Set up WebSocket connection for real-time updates (Requirement 12.1)
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token || !tournamentId) return;

    // Connect to tournament namespace
    const socketInstance = io(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/tournament`, {
      auth: { token },
      transports: ['websocket', 'polling'],
    });

    socketInstance.on('connect', () => {
      console.log('Connected to tournament WebSocket');
      // Join tournament room for updates
      socketInstance.emit('join_tournament', { tournamentId });
    });

    // Listen for standings updates (Requirement 12.1)
    socketInstance.on('standings_updated', (data: { tournamentId: string; players: Standing[] }) => {
      if (data.tournamentId === tournamentId) {
        console.log('Received standings update:', data.players.length, 'players');
        setStandings(data.players || []);
      }
    });

    socketInstance.on('connect_error', (err) => {
      console.error('WebSocket connection error:', err);
    });

    setSocket(socketInstance);

    return () => {
      if (socketInstance) {
        socketInstance.emit('leave_tournament', { tournamentId });
        socketInstance.disconnect();
      }
    };
  }, [tournamentId]);

  const fetchStandings = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiClient.get<{ players: Standing[] }>(
        `/tournaments/${tournamentId}/standings`
      );

      setStandings(response.players || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load standings');
    } finally {
      setLoading(false);
    }
  };

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
        <p className="text-red-800 dark:text-red-200">{error}</p>
      </div>
    );
  }

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">
            Current Standings
          </h3>
          {socket?.connected && (
            <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span>Live</span>
            </div>
          )}
        </div>

        <StandingsTable
          standings={standings}
          format={format}
          currentUserId={currentUserId}
          loading={loading}
        />
      </CardContent>
    </Card>
  );
};
