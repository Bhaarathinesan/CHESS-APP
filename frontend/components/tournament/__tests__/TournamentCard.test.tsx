import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { TournamentCard } from '../TournamentCard';

// Mock Next.js Link component
vi.mock('next/link', () => {
  return {
    default: ({ children, href }: { children: React.ReactNode; href: string }) => {
      return <a href={href}>{children}</a>;
    },
  };
});

describe('TournamentCard', () => {
  const mockTournament = {
    id: '123',
    name: 'Test Tournament',
    description: 'A test tournament description',
    format: 'SWISS',
    timeControl: 'BLITZ',
    status: 'REGISTRATION_OPEN',
    currentPlayers: 10,
    maxPlayers: 50,
    startTime: '2024-01-15T10:00:00Z',
    creator: {
      displayName: 'Test Creator',
    },
  };

  it('renders tournament name', () => {
    render(<TournamentCard tournament={mockTournament} />);
    expect(screen.getByText('Test Tournament')).toBeInTheDocument();
  });

  it('renders tournament description', () => {
    render(<TournamentCard tournament={mockTournament} />);
    expect(screen.getByText('A test tournament description')).toBeInTheDocument();
  });

  it('renders tournament format', () => {
    render(<TournamentCard tournament={mockTournament} />);
    expect(screen.getByText('Swiss')).toBeInTheDocument();
  });

  it('renders tournament time control', () => {
    render(<TournamentCard tournament={mockTournament} />);
    expect(screen.getByText('Blitz')).toBeInTheDocument();
  });

  it('renders player count', () => {
    render(<TournamentCard tournament={mockTournament} />);
    expect(screen.getByText('10 / 50')).toBeInTheDocument();
  });

  it('renders status badge', () => {
    render(<TournamentCard tournament={mockTournament} />);
    expect(screen.getByText('Open')).toBeInTheDocument();
  });

  it('renders creator name', () => {
    render(<TournamentCard tournament={mockTournament} />);
    expect(screen.getByText(/By Test Creator/)).toBeInTheDocument();
  });

  it('renders banner image when provided', () => {
    const tournamentWithBanner = {
      ...mockTournament,
      bannerUrl: 'https://example.com/banner.jpg',
    };
    render(<TournamentCard tournament={tournamentWithBanner} />);
    const img = screen.getByAltText('Test Tournament');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', 'https://example.com/banner.jpg');
  });

  it('links to tournament details page', () => {
    const { container } = render(<TournamentCard tournament={mockTournament} />);
    const link = container.querySelector('a');
    expect(link).toHaveAttribute('href', '/tournaments/123');
  });
});
