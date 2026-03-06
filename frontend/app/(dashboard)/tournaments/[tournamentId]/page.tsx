'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { TournamentHeader } from '@/components/tournament/TournamentHeader';
import { TournamentTabs } from '@/components/tournament/TournamentTabs';
import { apiClient } from '@/lib/api-client';
import { authService } from '@/lib/auth';

interface Tournament {
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
  pairingMethod: string;
  tiebreakCriteria: string;
  allowLateRegistration: boolean;
  spectatorDelaySeconds: number;
  registrationDeadline: string;
  startTime: string;
  endTime?: string;
  shareLink: string;
  qrCodeUrl?: string;
  prizeDescription?: string;
  createdAt: string;
  updatedAt: string;
  creator: {
    id: string;
    displayName: string;
    username: string;
    avatarUrl?: string;
  };
  isUserJoined?: boolean;
}

export default function TournamentDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const tournamentId = params.tournamentId as string;

  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isJoining, setIsJoining] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

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
    fetchTournament();
  }, [tournamentId]);

  const fetchTournament = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiClient.get<Tournament>(`/tournaments/${tournamentId}`);
      setTournament(response);
    } catch (err: any) {
      setError(err.message || 'Failed to load tournament');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinTournament = async () => {
    if (!tournament) return;

    try {
      setIsJoining(true);
      await apiClient.post(`/tournaments/${tournamentId}/join`, {});
      
      // Refresh tournament data
      await fetchTournament();
    } catch (err: any) {
      alert(err.message || 'Failed to join tournament');
    } finally {
      setIsJoining(false);
    }
  };

  const handleLeaveTournament = async () => {
    if (!tournament) return;

    if (!confirm('Are you sure you want to leave this tournament?')) {
      return;
    }

    try {
      setIsLeaving(true);
      await apiClient.post(`/tournaments/${tournamentId}/leave`, {});
      
      // Refresh tournament data
      await fetchTournament();
    } catch (err: any) {
      alert(err.message || 'Failed to leave tournament');
    } finally {
      setIsLeaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error || !tournament) {
    return (
      <div className="max-w-4xl mx-auto py-8">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-800 dark:text-red-200">
            {error || 'Tournament not found'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <TournamentHeader
        tournament={tournament}
        onJoin={handleJoinTournament}
        onLeave={handleLeaveTournament}
        isJoining={isJoining}
        isLeaving={isLeaving}
        currentUserId={currentUserId}
      />

      <TournamentTabs tournament={tournament} />
    </div>
  );
}
