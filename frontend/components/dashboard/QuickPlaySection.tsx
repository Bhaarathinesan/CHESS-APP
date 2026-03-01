'use client';

import { useRouter } from 'next/navigation';

interface TimeControl {
  id: string;
  name: string;
  icon: string;
  description: string;
  timeControl: string;
}

const timeControls: TimeControl[] = [
  { id: 'bullet', name: 'Bullet', icon: '⚡', description: '1-2 minutes', timeControl: '1+0' },
  { id: 'blitz', name: 'Blitz', icon: '🔥', description: '3-5 minutes', timeControl: '3+2' },
  { id: 'rapid', name: 'Rapid', icon: '⏱️', description: '10-20 minutes', timeControl: '10+5' },
  { id: 'classical', name: 'Classical', icon: '♟️', description: '30+ minutes', timeControl: '30+0' },
];

export default function QuickPlaySection() {
  const router = useRouter();

  const handleQuickPlay = (timeControl: string) => {
    // TODO: Implement matchmaking logic
    console.log('Quick play:', timeControl);
    router.push('/play');
  };

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold text-foreground">Quick Play</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {timeControls.map((tc) => (
          <div
            key={tc.id}
            className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 hover:border-primary transition-colors cursor-pointer border border-transparent"
            onClick={() => handleQuickPlay(tc.timeControl)}
          >
            <div className="text-3xl mb-2">{tc.icon}</div>
            <h3 className="font-semibold text-foreground mb-1">{tc.name}</h3>
            <p className="text-sm text-foreground-secondary">{tc.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
