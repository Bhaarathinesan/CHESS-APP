import React from 'react';
import { render, screen } from '@testing-library/react';
import { BracketView } from '../BracketView';

// Mock Next.js Link component
jest.mock('next/link', () => {
  return ({ children, href }: { children: React.ReactNode; href: string }) => {
    return <a href={href}>{children}</a>;
  };
});

describe('BracketView', () => {
  const mockPlayer1 = {
    id: 'player-1',
    displayName: 'Alice',
    username: 'alice',
    avatarUrl: 'https://example.com/alice.jpg',
  };

  const mockPlayer2 = {
    id: 'player-2',
    displayName: 'Bob',
    username: 'bob',
  };

  const mockPlayer3 = {
    id: 'player-3',
    displayName: 'Charlie',
    username: 'charlie',
  };

  const mockPlayer4 = {
    id: 'player-4',
    displayName: 'Diana',
    username: 'diana',
  };

  const mockBracket = [
    {
      roundNumber: 1,
      roundName: 'Semi-Finals',
      matches: [
        {
          id: 'match-1',
          boardNumber: 1,
          whitePlayer: mockPlayer1,
          blackPlayer: mockPlayer2,
          result: 'WHITE_WIN',
          isBye: false,
          winner: 'player-1',
          game: {
            id: 'game-1',
            status: 'completed',
          },
        },
        {
          id: 'match-2',
          boardNumber: 2,
          whitePlayer: mockPlayer3,
          blackPlayer: mockPlayer4,
          result: 'BLACK_WIN',
          isBye: false,
          winner: 'player-4',
          game: {
            id: 'game-2',
            status: 'completed',
          },
        },
      ],
    },
    {
      roundNumber: 2,
      roundName: 'Final',
      matches: [
        {
          id: 'match-3',
          boardNumber: 1,
          whitePlayer: mockPlayer1,
          blackPlayer: mockPlayer4,
          result: undefined,
          isBye: false,
          winner: null,
          game: {
            id: 'game-3',
            status: 'active',
          },
        },
      ],
    },
  ];

  describe('Single Elimination', () => {
    it('should render bracket rounds', () => {
      render(
        <BracketView
          bracket={mockBracket}
          format="SINGLE_ELIMINATION"
          currentRound={2}
        />
      );

      expect(screen.getByText('Semi-Finals')).toBeInTheDocument();
      expect(screen.getByText('Final')).toBeInTheDocument();
    });

    it('should display match results', () => {
      render(
        <BracketView
          bracket={mockBracket}
          format="SINGLE_ELIMINATION"
          currentRound={2}
        />
      );

      // Check for result displays
      expect(screen.getByText('1-0')).toBeInTheDocument();
      expect(screen.getByText('0-1')).toBeInTheDocument();
    });

    it('should highlight winners', () => {
      render(
        <BracketView
          bracket={mockBracket}
          format="SINGLE_ELIMINATION"
          currentRound={2}
        />
      );

      // Winners should have checkmarks
      const aliceElements = screen.getAllByText(/Alice/);
      const aliceWithCheckmark = aliceElements.find(el => el.textContent?.includes('✓'));
      expect(aliceWithCheckmark).toBeInTheDocument();

      const dianaElements = screen.getAllByText(/Diana/);
      const dianaWithCheckmark = dianaElements.find(el => el.textContent?.includes('✓'));
      expect(dianaWithCheckmark).toBeInTheDocument();
    });

    it('should show live game status', () => {
      render(
        <BracketView
          bracket={mockBracket}
          format="SINGLE_ELIMINATION"
          currentRound={2}
        />
      );

      expect(screen.getByText('Live')).toBeInTheDocument();
    });

    it('should render game links', () => {
      render(
        <BracketView
          bracket={mockBracket}
          format="SINGLE_ELIMINATION"
          currentRound={2}
        />
      );

      const viewGameLinks = screen.getAllByText(/View Game|Watch Live/);
      expect(viewGameLinks.length).toBeGreaterThan(0);
    });

    it('should highlight current round', () => {
      const { container } = render(
        <BracketView
          bracket={mockBracket}
          format="SINGLE_ELIMINATION"
          currentRound={2}
        />
      );

      // Current round should have blue background
      const finalRound = screen.getByText('Final').closest('div');
      expect(finalRound).toHaveClass('bg-blue-600');
    });

    it('should show TBD for unassigned players', () => {
      const bracketWithTBD = [
        {
          roundNumber: 1,
          roundName: 'Final',
          matches: [
            {
              id: 'match-1',
              boardNumber: 1,
              whitePlayer: mockPlayer1,
              blackPlayer: undefined,
              result: undefined,
              isBye: false,
              winner: null,
            },
          ],
        },
      ];

      render(
        <BracketView
          bracket={bracketWithTBD}
          format="SINGLE_ELIMINATION"
          currentRound={1}
        />
      );

      expect(screen.getByText('TBD')).toBeInTheDocument();
    });

    it('should show BYE for bye matches', () => {
      const bracketWithBye = [
        {
          roundNumber: 1,
          roundName: 'Round 1',
          matches: [
            {
              id: 'match-1',
              boardNumber: 1,
              whitePlayer: mockPlayer1,
              blackPlayer: undefined,
              result: 'BYE',
              isBye: true,
              winner: 'player-1',
            },
          ],
        },
      ];

      render(
        <BracketView
          bracket={bracketWithBye}
          format="SINGLE_ELIMINATION"
          currentRound={1}
        />
      );

      expect(screen.getByText('BYE')).toBeInTheDocument();
    });
  });

  describe('Double Elimination', () => {
    const doubleElimBracket = [
      {
        roundNumber: 1,
        roundName: 'Winners Round 1',
        matches: [
          {
            id: 'match-1',
            boardNumber: 1,
            whitePlayer: mockPlayer1,
            blackPlayer: mockPlayer2,
            result: 'WHITE_WIN',
            isBye: false,
            winner: 'player-1',
          },
        ],
      },
      {
        roundNumber: 2,
        roundName: 'Losers Round 1',
        matches: [
          {
            id: 'match-2',
            boardNumber: 1,
            whitePlayer: mockPlayer2,
            blackPlayer: mockPlayer3,
            result: 'BLACK_WIN',
            isBye: false,
            winner: 'player-3',
          },
        ],
      },
    ];

    it('should separate winners and losers brackets', () => {
      render(
        <BracketView
          bracket={doubleElimBracket}
          format="DOUBLE_ELIMINATION"
          currentRound={1}
        />
      );

      expect(screen.getByText('Winners Bracket')).toBeInTheDocument();
      expect(screen.getByText('Losers Bracket')).toBeInTheDocument();
    });

    it('should display both brackets correctly', () => {
      render(
        <BracketView
          bracket={doubleElimBracket}
          format="DOUBLE_ELIMINATION"
          currentRound={1}
        />
      );

      expect(screen.getByText('Winners Round 1')).toBeInTheDocument();
      expect(screen.getByText('Losers Round 1')).toBeInTheDocument();
    });
  });

  describe('Loading and Empty States', () => {
    it('should show loading spinner when loading', () => {
      const { container } = render(
        <BracketView
          bracket={[]}
          format="SINGLE_ELIMINATION"
          currentRound={1}
          loading={true}
        />
      );

      const spinner = container.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });

    it('should show empty state when no bracket data', () => {
      render(
        <BracketView
          bracket={[]}
          format="SINGLE_ELIMINATION"
          currentRound={1}
        />
      );

      expect(screen.getByText(/No bracket available yet/)).toBeInTheDocument();
    });
  });

  describe('Match Display', () => {
    it('should display player avatars when available', () => {
      render(
        <BracketView
          bracket={mockBracket}
          format="SINGLE_ELIMINATION"
          currentRound={1}
        />
      );

      const avatar = screen.getByAltText('Alice');
      expect(avatar).toHaveAttribute('src', 'https://example.com/alice.jpg');
    });

    it('should display player initials when no avatar', () => {
      render(
        <BracketView
          bracket={mockBracket}
          format="SINGLE_ELIMINATION"
          currentRound={1}
        />
      );

      // Bob has no avatar, should show initial
      const bobInitial = screen.getByText('B');
      expect(bobInitial).toBeInTheDocument();
    });

    it('should show draw result', () => {
      const bracketWithDraw = [
        {
          roundNumber: 1,
          roundName: 'Round 1',
          matches: [
            {
              id: 'match-1',
              boardNumber: 1,
              whitePlayer: mockPlayer1,
              blackPlayer: mockPlayer2,
              result: 'DRAW',
              isBye: false,
              winner: null,
            },
          ],
        },
      ];

      render(
        <BracketView
          bracket={bracketWithDraw}
          format="SINGLE_ELIMINATION"
          currentRound={1}
        />
      );

      expect(screen.getByText('½-½')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper alt text for images', () => {
      render(
        <BracketView
          bracket={mockBracket}
          format="SINGLE_ELIMINATION"
          currentRound={1}
        />
      );

      const avatar = screen.getByAltText('Alice');
      expect(avatar).toBeInTheDocument();
    });

    it('should have descriptive link text', () => {
      render(
        <BracketView
          bracket={mockBracket}
          format="SINGLE_ELIMINATION"
          currentRound={2}
        />
      );

      const links = screen.getAllByRole('link');
      links.forEach(link => {
        expect(link.textContent).toBeTruthy();
      });
    });
  });
});
