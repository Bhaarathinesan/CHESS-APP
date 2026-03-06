import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { TournamentHeader } from '../TournamentHeader';

const mockTournament = {
  id: '1',
  name: 'Test Tournament',
  description: 'A test tournament',
  bannerUrl: 'https://example.com/banner.jpg',
  format: 'SWISS',
  timeControl: 'BLITZ',
  initialTimeMinutes: 5,
  incrementSeconds: 3,
  isRated: true,
  status: 'REGISTRATION_OPEN',
  minPlayers: 4,
  maxPlayers: 100,
  currentPlayers: 10,
  roundsTotal: 5,
  roundsCompleted: 0,
  currentRound: 0,
  registrationDeadline: '2024-12-31T23:59:59Z',
  startTime: '2025-01-01T10:00:00Z',
  prizeDescription: 'Trophy for winner',
  creator: {
    id: 'creator-1',
    displayName: 'Tournament Organizer',
    username: 'organizer',
    avatarUrl: 'https://example.com/avatar.jpg',
  },
  isUserJoined: false,
};

describe('TournamentHeader', () => {
  const mockOnJoin = jest.fn();
  const mockOnLeave = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders tournament information correctly', () => {
    render(
      <TournamentHeader
        tournament={mockTournament}
        onJoin={mockOnJoin}
        onLeave={mockOnLeave}
        isJoining={false}
        isLeaving={false}
        currentUserId="user-1"
      />
    );

    expect(screen.getByText('Test Tournament')).toBeInTheDocument();
    expect(screen.getByText('A test tournament')).toBeInTheDocument();
    expect(screen.getByText('Tournament Organizer')).toBeInTheDocument();
  });

  it('displays tournament format and time control', () => {
    render(
      <TournamentHeader
        tournament={mockTournament}
        onJoin={mockOnJoin}
        onLeave={mockOnLeave}
        isJoining={false}
        isLeaving={false}
        currentUserId="user-1"
      />
    );

    expect(screen.getByText('Swiss System')).toBeInTheDocument();
    expect(screen.getByText(/Blitz \(5\+3\)/)).toBeInTheDocument();
  });

  it('displays player count', () => {
    render(
      <TournamentHeader
        tournament={mockTournament}
        onJoin={mockOnJoin}
        onLeave={mockOnLeave}
        isJoining={false}
        isLeaving={false}
        currentUserId="user-1"
      />
    );

    expect(screen.getByText('10 / 100')).toBeInTheDocument();
  });

  it('shows join button when user can join', () => {
    render(
      <TournamentHeader
        tournament={mockTournament}
        onJoin={mockOnJoin}
        onLeave={mockOnLeave}
        isJoining={false}
        isLeaving={false}
        currentUserId="user-1"
      />
    );

    const joinButton = screen.getByText('Join Tournament');
    expect(joinButton).toBeInTheDocument();
  });

  it('calls onJoin when join button is clicked', () => {
    render(
      <TournamentHeader
        tournament={mockTournament}
        onJoin={mockOnJoin}
        onLeave={mockOnLeave}
        isJoining={false}
        isLeaving={false}
        currentUserId="user-1"
      />
    );

    const joinButton = screen.getByText('Join Tournament');
    fireEvent.click(joinButton);

    expect(mockOnJoin).toHaveBeenCalledTimes(1);
  });

  it('shows leave button when user is joined', () => {
    const joinedTournament = { ...mockTournament, isUserJoined: true };

    render(
      <TournamentHeader
        tournament={joinedTournament}
        onJoin={mockOnJoin}
        onLeave={mockOnLeave}
        isJoining={false}
        isLeaving={false}
        currentUserId="user-1"
      />
    );

    const leaveButton = screen.getByText('Leave Tournament');
    expect(leaveButton).toBeInTheDocument();
  });

  it('calls onLeave when leave button is clicked', () => {
    const joinedTournament = { ...mockTournament, isUserJoined: true };

    render(
      <TournamentHeader
        tournament={joinedTournament}
        onJoin={mockOnJoin}
        onLeave={mockOnLeave}
        isJoining={false}
        isLeaving={false}
        currentUserId="user-1"
      />
    );

    const leaveButton = screen.getByText('Leave Tournament');
    fireEvent.click(leaveButton);

    expect(mockOnLeave).toHaveBeenCalledTimes(1);
  });

  it('disables join button when joining', () => {
    render(
      <TournamentHeader
        tournament={mockTournament}
        onJoin={mockOnJoin}
        onLeave={mockOnLeave}
        isJoining={true}
        isLeaving={false}
        currentUserId="user-1"
      />
    );

    const joinButton = screen.getByText('Join Tournament');
    expect(joinButton).toBeDisabled();
  });

  it('does not show join button when tournament is full', () => {
    const fullTournament = { ...mockTournament, currentPlayers: 100 };

    render(
      <TournamentHeader
        tournament={fullTournament}
        onJoin={mockOnJoin}
        onLeave={mockOnLeave}
        isJoining={false}
        isLeaving={false}
        currentUserId="user-1"
      />
    );

    expect(screen.queryByText('Join Tournament')).not.toBeInTheDocument();
  });

  it('does not show join button when registration is closed', () => {
    const closedTournament = { ...mockTournament, status: 'REGISTRATION_CLOSED' };

    render(
      <TournamentHeader
        tournament={closedTournament}
        onJoin={mockOnJoin}
        onLeave={mockOnLeave}
        isJoining={false}
        isLeaving={false}
        currentUserId="user-1"
      />
    );

    expect(screen.queryByText('Join Tournament')).not.toBeInTheDocument();
  });

  it('displays status badge correctly', () => {
    render(
      <TournamentHeader
        tournament={mockTournament}
        onJoin={mockOnJoin}
        onLeave={mockOnLeave}
        isJoining={false}
        isLeaving={false}
        currentUserId="user-1"
      />
    );

    expect(screen.getByText('Registration Open')).toBeInTheDocument();
  });

  it('displays prize description when available', () => {
    render(
      <TournamentHeader
        tournament={mockTournament}
        onJoin={mockOnJoin}
        onLeave={mockOnLeave}
        isJoining={false}
        isLeaving={false}
        currentUserId="user-1"
      />
    );

    expect(screen.getByText('Trophy for winner')).toBeInTheDocument();
  });

  it('displays rounds information for Swiss tournaments', () => {
    render(
      <TournamentHeader
        tournament={mockTournament}
        onJoin={mockOnJoin}
        onLeave={mockOnLeave}
        isJoining={false}
        isLeaving={false}
        currentUserId="user-1"
      />
    );

    expect(screen.getByText('0 / 5')).toBeInTheDocument();
  });

  it('displays rated/unrated status', () => {
    render(
      <TournamentHeader
        tournament={mockTournament}
        onJoin={mockOnJoin}
        onLeave={mockOnLeave}
        isJoining={false}
        isLeaving={false}
        currentUserId="user-1"
      />
    );

    expect(screen.getByText('Rated')).toBeInTheDocument();
  });
});
