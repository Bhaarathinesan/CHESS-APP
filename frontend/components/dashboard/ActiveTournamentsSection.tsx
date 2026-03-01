'use client';

import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useRouter } from 'next/navigation';

interface Tournament {
  id: string;
  name: string;
  format: string;
  timeControl: string;
  players: number;
  maxPlayers: number;
  startTime: string;
  status: 'registration' | 'in_progress' | 'completed';
}

// Mock data - will be replaced with API call
const mockTournaments: Tournament[] = [];

export default function ActiveTournamentsSection() {
  const router = useRouter();

  const handleViewTournament = (tournamentId: string) => {
    router.push(`/tournaments/${tournamentId}`);
  };

  const handleBrowseTournaments = () => {
    router.push('/tournaments');
  };

  if (mockTournaments.length === 0) {
    return (
      <Card className="p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-semibold text-foreground">Active Tournaments</h2>
          <Button variant="secondary" size="sm" onClick={handleBrowseTournaments}>
            Browse All
          </Button>
        </div>
        <div className="text-center py-8">
          <p className="text-foreground-secondary mb-4">No active tournaments at the moment</p>
          <Button variant="primary" onClick={handleBrowseTournaments}>
            Explore Tournaments
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-semibold text-foreground">Active Tournaments</h2>
        <Button variant="secondary" size="sm" onClick={handleBrowseTournaments}>
          View All
        </Button>
      </div>
      <div className="space-y-3">
        {mockTournaments.map((tournament) => (
          <div
            key={tournament.id}
            className="flex items-center justify-between p-4 bg-background-secondary rounded-lg hover:bg-background-tertiary transition-colors cursor-pointer"
            onClick={() => handleViewTournament(tournament.id)}
          >
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-foreground">{tournament.name}</h3>
                <Badge variant={tournament.status === 'in_progress' ? 'success' : 'default'}>
                  {tournament.status === 'registration' ? 'Open' : 'Live'}
                </Badge>
              </div>
              <p className="text-sm text-foreground-secondary">
                {tournament.format} • {tournament.timeControl} • {tournament.players}/{tournament.maxPlayers} players
              </p>
            </div>
            <Button variant="primary" size="sm">
              {tournament.status === 'registration' ? 'Join' : 'View'}
            </Button>
          </div>
        ))}
      </div>
    </Card>
  );
}
