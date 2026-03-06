import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { TournamentTabs } from '../TournamentTabs';

// Mock the tab components
jest.mock('../tabs/OverviewTab', () => ({
  OverviewTab: ({ tournamentId }: { tournamentId: string }) => (
    <div data-testid="overview-tab">Overview Tab - {tournamentId}</div>
  ),
}));

jest.mock('../tabs/StandingsTab', () => ({
  StandingsTab: ({ tournamentId }: { tournamentId: string }) => (
    <div data-testid="standings-tab">Standings Tab - {tournamentId}</div>
  ),
}));

jest.mock('../tabs/PairingsTab', () => ({
  PairingsTab: ({ tournamentId }: { tournamentId: string }) => (
    <div data-testid="pairings-tab">Pairings Tab - {tournamentId}</div>
  ),
}));

jest.mock('../tabs/GamesTab', () => ({
  GamesTab: ({ tournamentId }: { tournamentId: string }) => (
    <div data-testid="games-tab">Games Tab - {tournamentId}</div>
  ),
}));

const mockTournament = {
  id: 'tournament-1',
  name: 'Test Tournament',
  format: 'SWISS',
  status: 'IN_PROGRESS',
  tiebreakCriteria: 'buchholz',
  pairingMethod: 'automatic',
  currentRound: 2,
  roundsTotal: 5,
  roundsCompleted: 1,
};

describe('TournamentTabs', () => {
  it('renders all tab buttons', () => {
    render(<TournamentTabs tournament={mockTournament} />);

    expect(screen.getByText('Overview')).toBeInTheDocument();
    expect(screen.getByText('Standings')).toBeInTheDocument();
    expect(screen.getByText('Pairings')).toBeInTheDocument();
    expect(screen.getByText('Games')).toBeInTheDocument();
  });

  it('displays overview tab by default', () => {
    render(<TournamentTabs tournament={mockTournament} />);

    expect(screen.getByTestId('overview-tab')).toBeInTheDocument();
    expect(screen.getByText(/Overview Tab - tournament-1/)).toBeInTheDocument();
  });

  it('switches to standings tab when clicked', () => {
    render(<TournamentTabs tournament={mockTournament} />);

    const standingsButton = screen.getByText('Standings');
    fireEvent.click(standingsButton);

    expect(screen.getByTestId('standings-tab')).toBeInTheDocument();
    expect(screen.getByText(/Standings Tab - tournament-1/)).toBeInTheDocument();
  });

  it('switches to pairings tab when clicked', () => {
    render(<TournamentTabs tournament={mockTournament} />);

    const pairingsButton = screen.getByText('Pairings');
    fireEvent.click(pairingsButton);

    expect(screen.getByTestId('pairings-tab')).toBeInTheDocument();
    expect(screen.getByText(/Pairings Tab - tournament-1/)).toBeInTheDocument();
  });

  it('switches to games tab when clicked', () => {
    render(<TournamentTabs tournament={mockTournament} />);

    const gamesButton = screen.getByText('Games');
    fireEvent.click(gamesButton);

    expect(screen.getByTestId('games-tab')).toBeInTheDocument();
    expect(screen.getByText(/Games Tab - tournament-1/)).toBeInTheDocument();
  });

  it('passes correct props to tab components', () => {
    render(<TournamentTabs tournament={mockTournament} />);

    // Check Overview tab
    expect(screen.getByTestId('overview-tab')).toBeInTheDocument();

    // Switch to Standings tab
    fireEvent.click(screen.getByText('Standings'));
    expect(screen.getByTestId('standings-tab')).toBeInTheDocument();

    // Switch to Pairings tab
    fireEvent.click(screen.getByText('Pairings'));
    expect(screen.getByTestId('pairings-tab')).toBeInTheDocument();

    // Switch to Games tab
    fireEvent.click(screen.getByText('Games'));
    expect(screen.getByTestId('games-tab')).toBeInTheDocument();
  });
});
