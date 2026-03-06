'use client';

import React from 'react';
import { Tabs } from '@/components/ui/Tabs';
import { OverviewTab } from './tabs/OverviewTab';
import { StandingsTab } from './tabs/StandingsTab';
import { PairingsTab } from './tabs/PairingsTab';
import { GamesTab } from './tabs/GamesTab';

interface TournamentTabsProps {
  tournament: {
    id: string;
    name: string;
    format: string;
    status: string;
    tiebreakCriteria: string;
    pairingMethod: string;
    currentRound: number;
    roundsTotal?: number;
    roundsCompleted: number;
  };
}

export const TournamentTabs: React.FC<TournamentTabsProps> = ({ tournament }) => {
  const tabs = [
    {
      id: 'overview',
      label: 'Overview',
      content: <OverviewTab tournamentId={tournament.id} />,
    },
    {
      id: 'standings',
      label: 'Standings',
      content: <StandingsTab tournamentId={tournament.id} format={tournament.format} />,
    },
    {
      id: 'pairings',
      label: 'Pairings',
      content: (
        <PairingsTab
          tournamentId={tournament.id}
          format={tournament.format}
          currentRound={tournament.currentRound}
          roundsTotal={tournament.roundsTotal}
        />
      ),
    },
    {
      id: 'games',
      label: 'Games',
      content: <GamesTab tournamentId={tournament.id} />,
    },
  ];

  return <Tabs tabs={tabs} defaultTab="overview" />;
};
