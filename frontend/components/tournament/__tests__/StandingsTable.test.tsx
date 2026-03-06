import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { StandingsTable } from '../StandingsTable';

describe('StandingsTable', () => {
  const mockStandings = [
    {
      id: '1',
      userId: 'user1',
      score: 5.5,
      wins: 5,
      losses: 1,
      draws: 1,
      buchholzScore: 28.5,
      sonnebornBerger: 22.5,
      rank: 1,
      user: {
        displayName: 'Alice Johnson',
        username: 'alice',
        avatarUrl: 'https://example.com/alice.jpg',
      },
    },
    {
      id: '2',
      userId: 'user2',
      score: 5.0,
      wins: 4,
      losses: 1,
      draws: 2,
      buchholzScore: 27.0,
      sonnebornBerger: 21.0,
      rank: 2,
      user: {
        displayName: 'Bob Smith',
        username: 'bob',
        avatarUrl: undefined,
      },
    },
    {
      id: '3',
      userId: 'user3',
      score: 4.5,
      wins: 4,
      losses: 2,
      draws: 1,
      buchholzScore: 26.0,
      sonnebornBerger: 19.5,
      rank: 3,
      user: {
        displayName: 'Charlie Brown',
        username: 'charlie',
        avatarUrl: 'https://example.com/charlie.jpg',
      },
    },
    {
      id: '4',
      userId: 'user4',
      score: 3.0,
      wins: 3,
      losses: 4,
      draws: 0,
      buchholzScore: 24.0,
      sonnebornBerger: 15.0,
      rank: 4,
      user: {
        displayName: 'Diana Prince',
        username: 'diana',
        avatarUrl: undefined,
      },
    },
  ];

  describe('Basic Rendering - Requirement 12.4', () => {
    it('renders standings table with all columns', () => {
      render(
        <StandingsTable
          standings={mockStandings}
          format="SWISS"
          currentUserId={null}
        />
      );

      // Check column headers
      expect(screen.getByText('Rank')).toBeInTheDocument();
      expect(screen.getByText('Player')).toBeInTheDocument();
      expect(screen.getByText('Points')).toBeInTheDocument();
      expect(screen.getByText('W')).toBeInTheDocument();
      expect(screen.getByText('D')).toBeInTheDocument();
      expect(screen.getByText('L')).toBeInTheDocument();
    });

    it('displays rank for each player (Requirement 12.2)', () => {
      render(
        <StandingsTable
          standings={mockStandings}
          format="SWISS"
          currentUserId={null}
        />
      );

      expect(screen.getByText('1')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
      expect(screen.getByText('4')).toBeInTheDocument();
    });

    it('displays player names (Requirement 12.4)', () => {
      render(
        <StandingsTable
          standings={mockStandings}
          format="SWISS"
          currentUserId={null}
        />
      );

      expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
      expect(screen.getByText('Bob Smith')).toBeInTheDocument();
      expect(screen.getByText('Charlie Brown')).toBeInTheDocument();
      expect(screen.getByText('Diana Prince')).toBeInTheDocument();
    });

    it('displays points for each player (Requirement 12.4)', () => {
      render(
        <StandingsTable
          standings={mockStandings}
          format="SWISS"
          currentUserId={null}
        />
      );

      expect(screen.getByText('5.5')).toBeInTheDocument();
      expect(screen.getByText('5')).toBeInTheDocument();
      expect(screen.getByText('4.5')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
    });

    it('displays wins, losses, and draws (Requirement 12.4)', () => {
      const { container } = render(
        <StandingsTable
          standings={mockStandings}
          format="SWISS"
          currentUserId={null}
        />
      );

      // Check first player's W/L/D
      const rows = container.querySelectorAll('tbody tr');
      const firstRow = rows[0];
      
      // The table shows wins, draws, losses in order
      expect(within(firstRow).getByText('5')).toBeInTheDocument(); // wins
      expect(within(firstRow).getByText('1')).toBeInTheDocument(); // draws
    });

    it('displays player avatars when available', () => {
      render(
        <StandingsTable
          standings={mockStandings}
          format="SWISS"
          currentUserId={null}
        />
      );

      const aliceAvatar = screen.getByAltText('Alice Johnson');
      expect(aliceAvatar).toBeInTheDocument();
      expect(aliceAvatar).toHaveAttribute('src', 'https://example.com/alice.jpg');
    });

    it('displays initials when avatar is not available', () => {
      render(
        <StandingsTable
          standings={mockStandings}
          format="SWISS"
          currentUserId={null}
        />
      );

      // Bob Smith has no avatar, should show "B" initial
      const { container } = render(
        <StandingsTable
          standings={[mockStandings[1]]}
          format="SWISS"
          currentUserId={null}
        />
      );

      expect(container.textContent).toContain('B');
    });
  });

  describe('Tiebreak Scores - Requirement 12.3', () => {
    it('displays tiebreak columns for Swiss format', () => {
      render(
        <StandingsTable
          standings={mockStandings}
          format="SWISS"
          currentUserId={null}
        />
      );

      expect(screen.getByText('Buchholz')).toBeInTheDocument();
      expect(screen.getByText('SB')).toBeInTheDocument();
    });

    it('displays tiebreak columns for Round Robin format', () => {
      render(
        <StandingsTable
          standings={mockStandings}
          format="ROUND_ROBIN"
          currentUserId={null}
        />
      );

      expect(screen.getByText('Buchholz')).toBeInTheDocument();
      expect(screen.getByText('SB')).toBeInTheDocument();
    });

    it('does not display tiebreak columns for elimination formats', () => {
      render(
        <StandingsTable
          standings={mockStandings}
          format="SINGLE_ELIMINATION"
          currentUserId={null}
        />
      );

      expect(screen.queryByText('Buchholz')).not.toBeInTheDocument();
      expect(screen.queryByText('SB')).not.toBeInTheDocument();
    });

    it('displays Buchholz scores correctly', () => {
      render(
        <StandingsTable
          standings={mockStandings}
          format="SWISS"
          currentUserId={null}
        />
      );

      expect(screen.getByText('28.5')).toBeInTheDocument();
      expect(screen.getByText('27.0')).toBeInTheDocument();
      expect(screen.getByText('26.0')).toBeInTheDocument();
      expect(screen.getByText('24.0')).toBeInTheDocument();
    });

    it('displays Sonneborn-Berger scores correctly', () => {
      render(
        <StandingsTable
          standings={mockStandings}
          format="SWISS"
          currentUserId={null}
        />
      );

      expect(screen.getByText('22.5')).toBeInTheDocument();
      expect(screen.getByText('21.0')).toBeInTheDocument();
      expect(screen.getByText('19.5')).toBeInTheDocument();
      expect(screen.getByText('15.0')).toBeInTheDocument();
    });

    it('displays dash when tiebreak scores are undefined', () => {
      const standingsWithoutTiebreaks = mockStandings.map((s) => ({
        ...s,
        buchholzScore: undefined,
        sonnebornBerger: undefined,
      }));

      const { container } = render(
        <StandingsTable
          standings={standingsWithoutTiebreaks}
          format="SWISS"
          currentUserId={null}
        />
      );

      // Should show dashes for missing tiebreak scores
      const dashes = container.querySelectorAll('td');
      const dashTexts = Array.from(dashes).filter((td) => td.textContent === '-');
      expect(dashTexts.length).toBeGreaterThan(0);
    });
  });

  describe('Current User Highlighting', () => {
    it('highlights current user row with distinct styling', () => {
      const { container } = render(
        <StandingsTable
          standings={mockStandings}
          format="SWISS"
          currentUserId="user2"
        />
      );

      const rows = container.querySelectorAll('tbody tr');
      const bobRow = rows[1]; // Bob is second in the list

      // Check for blue background class
      expect(bobRow.className).toContain('bg-blue-50');
      expect(bobRow.className).toContain('dark:bg-blue-900/20');
    });

    it('displays "(You)" indicator for current user', () => {
      render(
        <StandingsTable
          standings={mockStandings}
          format="SWISS"
          currentUserId="user2"
        />
      );

      expect(screen.getByText('(You)')).toBeInTheDocument();
    });

    it('does not highlight any row when currentUserId is null', () => {
      const { container } = render(
        <StandingsTable
          standings={mockStandings}
          format="SWISS"
          currentUserId={null}
        />
      );

      expect(screen.queryByText('(You)')).not.toBeInTheDocument();
      
      const rows = container.querySelectorAll('tbody tr');
      rows.forEach((row) => {
        expect(row.className).not.toContain('bg-blue-50');
      });
    });
  });

  describe('Sortable Columns', () => {
    it('sorts by rank in ascending order by default', () => {
      const { container } = render(
        <StandingsTable
          standings={mockStandings}
          format="SWISS"
          currentUserId={null}
        />
      );

      const rows = container.querySelectorAll('tbody tr');
      const firstRowRank = within(rows[0]).getByText('1');
      expect(firstRowRank).toBeInTheDocument();
    });

    it('sorts by player name when player column is clicked', () => {
      const { container } = render(
        <StandingsTable
          standings={mockStandings}
          format="SWISS"
          currentUserId={null}
        />
      );

      const playerHeader = screen.getByText('Player').closest('th');
      fireEvent.click(playerHeader!);

      const rows = container.querySelectorAll('tbody tr');
      // After sorting by name, Alice should be first
      expect(within(rows[0]).getByText('Alice Johnson')).toBeInTheDocument();
    });

    it('toggles sort direction when clicking same column twice', () => {
      const { container } = render(
        <StandingsTable
          standings={mockStandings}
          format="SWISS"
          currentUserId={null}
        />
      );

      const playerHeader = screen.getByText('Player').closest('th');
      
      // First click - ascending
      fireEvent.click(playerHeader!);
      let rows = container.querySelectorAll('tbody tr');
      expect(within(rows[0]).getByText('Alice Johnson')).toBeInTheDocument();

      // Second click - descending
      fireEvent.click(playerHeader!);
      rows = container.querySelectorAll('tbody tr');
      expect(within(rows[0]).getByText('Diana Prince')).toBeInTheDocument();
    });

    it('sorts by points when points column is clicked', () => {
      const { container } = render(
        <StandingsTable
          standings={mockStandings}
          format="SWISS"
          currentUserId={null}
        />
      );

      const pointsHeader = screen.getByText('Points').closest('th');
      fireEvent.click(pointsHeader!);

      const rows = container.querySelectorAll('tbody tr');
      // Descending by default for points, so highest score first
      expect(within(rows[0]).getByText('5.5')).toBeInTheDocument();
    });

    it('sorts by wins when wins column is clicked', () => {
      const { container } = render(
        <StandingsTable
          standings={mockStandings}
          format="SWISS"
          currentUserId={null}
        />
      );

      const winsHeader = screen.getByText('W').closest('th');
      fireEvent.click(winsHeader!);

      // Should sort by wins descending
      const rows = container.querySelectorAll('tbody tr');
      expect(within(rows[0]).getByText('Alice Johnson')).toBeInTheDocument();
    });

    it('sorts by Buchholz when Buchholz column is clicked', () => {
      const { container } = render(
        <StandingsTable
          standings={mockStandings}
          format="SWISS"
          currentUserId={null}
        />
      );

      const buchholzHeader = screen.getByText('Buchholz').closest('th');
      fireEvent.click(buchholzHeader!);

      const rows = container.querySelectorAll('tbody tr');
      // Highest Buchholz first (descending)
      expect(within(rows[0]).getByText('28.5')).toBeInTheDocument();
    });

    it('displays sort icons correctly', () => {
      render(
        <StandingsTable
          standings={mockStandings}
          format="SWISS"
          currentUserId={null}
        />
      );

      // Rank column should have an active sort icon (default sort)
      const rankHeader = screen.getByText('Rank').closest('th');
      expect(rankHeader).toBeInTheDocument();
      
      // Other columns should have inactive sort icons
      const playerHeader = screen.getByText('Player').closest('th');
      expect(playerHeader).toBeInTheDocument();
    });
  });

  describe('Top Three Highlighting', () => {
    it('displays trophy emoji for first place', () => {
      render(
        <StandingsTable
          standings={mockStandings}
          format="SWISS"
          currentUserId={null}
        />
      );

      expect(screen.getByText('🏆')).toBeInTheDocument();
    });

    it('displays silver medal emoji for second place', () => {
      render(
        <StandingsTable
          standings={mockStandings}
          format="SWISS"
          currentUserId={null}
        />
      );

      expect(screen.getByText('🥈')).toBeInTheDocument();
    });

    it('displays bronze medal emoji for third place', () => {
      render(
        <StandingsTable
          standings={mockStandings}
          format="SWISS"
          currentUserId={null}
        />
      );

      expect(screen.getByText('🥉')).toBeInTheDocument();
    });

    it('applies special styling to top three rows', () => {
      const { container } = render(
        <StandingsTable
          standings={mockStandings}
          format="SWISS"
          currentUserId={null}
        />
      );

      const rows = container.querySelectorAll('tbody tr');
      
      // First three rows should have yellow background
      expect(rows[0].className).toContain('bg-yellow-50');
      expect(rows[1].className).toContain('bg-yellow-50');
      expect(rows[2].className).toContain('bg-yellow-50');
      
      // Fourth row should not
      expect(rows[3].className).not.toContain('bg-yellow-50');
    });
  });

  describe('Loading and Empty States', () => {
    it('displays loading spinner when loading is true', () => {
      render(
        <StandingsTable
          standings={[]}
          format="SWISS"
          currentUserId={null}
          loading={true}
        />
      );

      const spinner = document.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });

    it('displays empty state message when no standings', () => {
      render(
        <StandingsTable
          standings={[]}
          format="SWISS"
          currentUserId={null}
          loading={false}
        />
      );

      expect(
        screen.getByText(/No standings available yet/i)
      ).toBeInTheDocument();
    });

    it('does not display table when loading', () => {
      render(
        <StandingsTable
          standings={mockStandings}
          format="SWISS"
          currentUserId={null}
          loading={true}
        />
      );

      expect(screen.queryByText('Rank')).not.toBeInTheDocument();
      expect(screen.queryByText('Player')).not.toBeInTheDocument();
    });
  });

  describe('Real-time Updates - Requirement 12.1', () => {
    it('updates standings when props change', () => {
      const { rerender } = render(
        <StandingsTable
          standings={mockStandings}
          format="SWISS"
          currentUserId={null}
        />
      );

      expect(screen.getByText('Alice Johnson')).toBeInTheDocument();

      // Update standings with new data
      const updatedStandings = [
        {
          ...mockStandings[0],
          score: 6.0,
          wins: 6,
        },
      ];

      rerender(
        <StandingsTable
          standings={updatedStandings}
          format="SWISS"
          currentUserId={null}
        />
      );

      expect(screen.getByText('6')).toBeInTheDocument();
    });

    it('maintains sort order when standings update', () => {
      const { container, rerender } = render(
        <StandingsTable
          standings={mockStandings}
          format="SWISS"
          currentUserId={null}
        />
      );

      // Click to sort by player name
      const playerHeader = screen.getByText('Player').closest('th');
      fireEvent.click(playerHeader!);

      // Update standings
      const updatedStandings = [...mockStandings];
      updatedStandings[0] = { ...updatedStandings[0], score: 6.0 };

      rerender(
        <StandingsTable
          standings={updatedStandings}
          format="SWISS"
          currentUserId={null}
        />
      );

      // Should still be sorted by player name
      const rows = container.querySelectorAll('tbody tr');
      expect(within(rows[0]).getByText('Alice Johnson')).toBeInTheDocument();
    });
  });

  describe('Responsive Design', () => {
    it('renders table with overflow-x-auto for mobile responsiveness', () => {
      const { container } = render(
        <StandingsTable
          standings={mockStandings}
          format="SWISS"
          currentUserId={null}
        />
      );

      const wrapper = container.querySelector('.overflow-x-auto');
      expect(wrapper).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper table structure', () => {
      const { container } = render(
        <StandingsTable
          standings={mockStandings}
          format="SWISS"
          currentUserId={null}
        />
      );

      expect(container.querySelector('table')).toBeInTheDocument();
      expect(container.querySelector('thead')).toBeInTheDocument();
      expect(container.querySelector('tbody')).toBeInTheDocument();
    });

    it('has clickable column headers for sorting', () => {
      render(
        <StandingsTable
          standings={mockStandings}
          format="SWISS"
          currentUserId={null}
        />
      );

      const headers = screen.getAllByRole('columnheader');
      headers.forEach((header) => {
        expect(header).toHaveClass('cursor-pointer');
      });
    });

    it('has title attributes for tiebreak columns', () => {
      render(
        <StandingsTable
          standings={mockStandings}
          format="SWISS"
          currentUserId={null}
        />
      );

      const buchholzHeader = screen.getByText('Buchholz').closest('th');
      expect(buchholzHeader).toHaveAttribute('title');

      const sbHeader = screen.getByText('SB').closest('th');
      expect(sbHeader).toHaveAttribute('title');
    });
  });
});
