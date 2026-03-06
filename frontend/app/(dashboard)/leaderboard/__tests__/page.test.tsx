import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import LeaderboardPage from '../page';

// Mock fetch
global.fetch = jest.fn();

describe('LeaderboardPage', () => {
  beforeEach(() => {
    (global.fetch as jest.Mock).mockClear();
  });

  it('should render leaderboard title', () => {
    render(<LeaderboardPage />);
    expect(screen.getByText('Leaderboard')).toBeInTheDocument();
    expect(
      screen.getByText('Top players across all time controls')
    ).toBeInTheDocument();
  });

  it('should render time control tabs', () => {
    render(<LeaderboardPage />);
    expect(screen.getByText('Bullet')).toBeInTheDocument();
    expect(screen.getByText('Blitz')).toBeInTheDocument();
    expect(screen.getByText('Rapid')).toBeInTheDocument();
    expect(screen.getByText('Classical')).toBeInTheDocument();
  });

  it('should render view mode tabs', () => {
    render(<LeaderboardPage />);
    expect(screen.getByText('Global')).toBeInTheDocument();
    expect(screen.getByText('My College')).toBeInTheDocument();
    expect(screen.getByText('Weekly')).toBeInTheDocument();
  });

  it('should fetch and display leaderboard data', async () => {
    const mockData = {
      leaderboard: [
        {
          rank: 1,
          userId: 'user1',
          username: 'player1',
          displayName: 'Player One',
          avatarUrl: null,
          rating: 1800,
          gamesPlayed: 50,
          ratingTrend: 'up',
          collegeName: 'Test College',
        },
        {
          rank: 2,
          userId: 'user2',
          username: 'player2',
          displayName: 'Player Two',
          avatarUrl: null,
          rating: 1750,
          gamesPlayed: 45,
          ratingTrend: 'down',
          collegeName: 'Test College',
        },
      ],
      total: 2,
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      json: async () => mockData,
    });

    render(<LeaderboardPage />);

    await waitFor(() => {
      expect(screen.getByText('Player One')).toBeInTheDocument();
      expect(screen.getByText('Player Two')).toBeInTheDocument();
      expect(screen.getByText('1800')).toBeInTheDocument();
      expect(screen.getByText('1750')).toBeInTheDocument();
    });
  });

  it('should switch time controls', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      json: async () => ({ leaderboard: [], total: 0 }),
    });

    render(<LeaderboardPage />);

    const bulletTab = screen.getByText('Bullet');
    fireEvent.click(bulletTab);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/leaderboards/BULLET')
      );
    });
  });

  it('should switch view modes', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      json: async () => ({ leaderboard: [], total: 0 }),
    });

    render(<LeaderboardPage />);

    const weeklyButton = screen.getByText('Weekly');
    fireEvent.click(weeklyButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/leaderboards/weekly')
      );
    });
  });

  it('should search for a player', async () => {
    const mockSearchResult = {
      player: {
        rank: 5,
        userId: 'user1',
        username: 'player1',
        displayName: 'Player One',
        avatarUrl: null,
        rating: 1800,
        gamesPlayed: 50,
        ratingTrend: 'up',
      },
    };

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        json: async () => ({ leaderboard: [], total: 0 }),
      })
      .mockResolvedValueOnce({
        json: async () => mockSearchResult,
      });

    render(<LeaderboardPage />);

    const searchInput = screen.getByPlaceholderText('Search for a player...');
    const searchButton = screen.getByText('Search');

    fireEvent.change(searchInput, { target: { value: 'player1' } });
    fireEvent.click(searchButton);

    await waitFor(() => {
      expect(screen.getByText('#5')).toBeInTheDocument();
      expect(screen.getAllByText('Player One')[0]).toBeInTheDocument();
    });
  });

  it('should display loading state', () => {
    (global.fetch as jest.Mock).mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );

    render(<LeaderboardPage />);

    expect(screen.getByText('Loading leaderboard...')).toBeInTheDocument();
  });

  it('should display empty state', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      json: async () => ({ leaderboard: [], total: 0 }),
    });

    render(<LeaderboardPage />);

    await waitFor(() => {
      expect(
        screen.getByText('No players on the leaderboard yet')
      ).toBeInTheDocument();
    });
  });

  it('should highlight top 3 players with different colors', async () => {
    const mockData = {
      leaderboard: [
        {
          rank: 1,
          userId: 'user1',
          username: 'player1',
          displayName: 'Player One',
          avatarUrl: null,
          rating: 1900,
          gamesPlayed: 50,
          ratingTrend: 'up',
        },
        {
          rank: 2,
          userId: 'user2',
          username: 'player2',
          displayName: 'Player Two',
          avatarUrl: null,
          rating: 1850,
          gamesPlayed: 45,
          ratingTrend: 'up',
        },
        {
          rank: 3,
          userId: 'user3',
          username: 'player3',
          displayName: 'Player Three',
          avatarUrl: null,
          rating: 1800,
          gamesPlayed: 40,
          ratingTrend: 'stable',
        },
      ],
      total: 3,
    };

    (global.fetch as jest.Mock).mockResolvedValue({
      json: async () => mockData,
    });

    render(<LeaderboardPage />);

    await waitFor(() => {
      const rank1 = screen.getByText('#1');
      const rank2 = screen.getByText('#2');
      const rank3 = screen.getByText('#3');

      expect(rank1).toHaveClass('text-yellow-500');
      expect(rank2).toHaveClass('text-gray-400');
      expect(rank3).toHaveClass('text-orange-600');
    });
  });

  it('should display rating trends correctly', async () => {
    const mockData = {
      leaderboard: [
        {
          rank: 1,
          userId: 'user1',
          username: 'player1',
          displayName: 'Player One',
          avatarUrl: null,
          rating: 1800,
          gamesPlayed: 50,
          ratingTrend: 'up',
        },
      ],
      total: 1,
    };

    (global.fetch as jest.Mock).mockResolvedValue({
      json: async () => mockData,
    });

    render(<LeaderboardPage />);

    await waitFor(() => {
      const trendIcon = screen.getByText('↑');
      expect(trendIcon).toHaveClass('text-green-500');
    });
  });
});
