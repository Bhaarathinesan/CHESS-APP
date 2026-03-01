'use client';

import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { useRouter } from 'next/navigation';

interface Game {
  id: string;
  opponent: {
    name: string;
    rating: number;
    avatar?: string;
  };
  result: 'win' | 'loss' | 'draw';
  timeControl: string;
  moves: number;
  date: string;
  userColor: 'white' | 'black';
}

// Mock data - will be replaced with API call
const mockGames: Game[] = [];

export default function RecentGamesSection() {
  const router = useRouter();

  const handleViewGame = (gameId: string) => {
    router.push(`/history/${gameId}`);
  };

  const handleViewHistory = () => {
    router.push('/history');
  };

  const handleStartGame = () => {
    router.push('/play');
  };

  const getResultBadge = (result: Game['result']) => {
    switch (result) {
      case 'win':
        return <Badge variant="success">Win</Badge>;
      case 'loss':
        return <Badge variant="error">Loss</Badge>;
      case 'draw':
        return <Badge variant="default">Draw</Badge>;
    }
  };

  if (mockGames.length === 0) {
    return (
      <Card className="p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-semibold text-foreground">Recent Games</h2>
        </div>
        <div className="text-center py-8">
          <p className="text-foreground-secondary mb-4">No games played yet. Start your first game!</p>
          <Button variant="primary" onClick={handleStartGame}>
            Play Now
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-semibold text-foreground">Recent Games</h2>
        <Button variant="secondary" size="sm" onClick={handleViewHistory}>
          View All
        </Button>
      </div>
      <div className="space-y-3">
        {mockGames.map((game) => (
          <div
            key={game.id}
            className="flex items-center justify-between p-4 bg-background-secondary rounded-lg hover:bg-background-tertiary transition-colors cursor-pointer"
            onClick={() => handleViewGame(game.id)}
          >
            <div className="flex items-center gap-3 flex-1">
              <Avatar
                src={game.opponent.avatar}
                alt={game.opponent.name}
                size="md"
              />
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-foreground">{game.opponent.name}</span>
                  <span className="text-sm text-foreground-secondary">({game.opponent.rating})</span>
                  {getResultBadge(game.result)}
                </div>
                <p className="text-sm text-foreground-secondary">
                  {game.timeControl} • {game.moves} moves • {game.date}
                </p>
              </div>
            </div>
            <Button variant="secondary" size="sm">
              Review
            </Button>
          </div>
        ))}
      </div>
    </Card>
  );
}
