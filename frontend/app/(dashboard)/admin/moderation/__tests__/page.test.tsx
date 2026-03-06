import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import ModerationPage from '../page';

// Mock fetch
global.fetch = vi.fn();

const mockReports = [
  {
    id: 'report-1',
    reportType: 'cheating',
    status: 'PENDING',
    description: 'Suspected engine use',
    gameId: 'game-1',
    createdAt: '2024-01-15T10:30:00Z',
    reporter: {
      id: 'user-1',
      username: 'reporter1',
      displayName: 'Reporter One',
      email: 'reporter1@college.edu',
    },
    reportedUser: {
      id: 'user-2',
      username: 'reported1',
      displayName: 'Reported One',
      email: 'reported1@college.edu',
    },
  },
  {
    id: 'report-2',
    reportType: 'inappropriate_chat',
    status: 'REVIEWED',
    description: 'Offensive language in chat',
    gameId: 'game-2',
    createdAt: '2024-01-15T11:00:00Z',
    reporter: {
      id: 'user-3',
      username: 'reporter2',
      displayName: 'Reporter Two',
      email: 'reporter2@college.edu',
    },
    reportedUser: {
      id: 'user-4',
      username: 'reported2',
      displayName: 'Reported Two',
      email: 'reported2@college.edu',
    },
  },
];

const mockReportDetails = {
  ...mockReports[0],
  gameDetails: {
    id: 'game-1',
    whitePlayerId: 'user-1',
    blackPlayerId: 'user-2',
    timeControl: 'BLITZ',
    status: 'COMPLETED',
    result: 'WHITE_WIN',
    terminationReason: 'checkmate',
    whitePlayer: {
      username: 'player1',
      displayName: 'Player One',
    },
    blackPlayer: {
      username: 'player2',
      displayName: 'Player Two',
    },
  },
};

const mockChatLogs = {
  game: {
    id: 'game-2',
    whitePlayerId: 'user-3',
    blackPlayerId: 'user-4',
    status: 'COMPLETED',
    whitePlayer: {
      username: 'player3',
      displayName: 'Player Three',
    },
    blackPlayer: {
      username: 'player4',
      displayName: 'Player Four',
    },
  },
  messages: [
    {
      id: 'msg-1',
      gameId: 'game-2',
      senderId: 'user-3',
      message: 'Good luck!',
      isSpectator: false,
      createdAt: '2024-01-15T10:00:00Z',
      sender: {
        id: 'user-3',
        username: 'player3',
        displayName: 'Player Three',
      },
      reports: [],
    },
    {
      id: 'msg-2',
      gameId: 'game-2',
      senderId: 'user-4',
      message: 'Offensive message',
      isSpectator: false,
      createdAt: '2024-01-15T10:05:00Z',
      sender: {
        id: 'user-4',
        username: 'player4',
        displayName: 'Player Four',
      },
      reports: [
        {
          id: 'chat-report-1',
          messageId: 'msg-2',
          reporterId: 'user-3',
          reason: 'Inappropriate language',
          status: 'pending',
        },
      ],
    },
  ],
  totalMessages: 2,
};

describe('ModerationPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.setItem('token', 'test-token');
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({
        reports: mockReports,
        total: 2,
        page: 1,
        limit: 20,
        totalPages: 1,
      }),
    });
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('renders the moderation page with title', async () => {
    render(<ModerationPage />);
    
    await waitFor(() => {
      expect(screen.getByText('Content Moderation')).toBeInTheDocument();
    });
  });

  it('fetches and displays reports', async () => {
    render(<ModerationPage />);
    
    await waitFor(() => {
      expect(screen.getByText('Reporter One')).toBeInTheDocument();
      expect(screen.getByText('Reported One')).toBeInTheDocument();
      expect(screen.getByText('Reporter Two')).toBeInTheDocument();
      expect(screen.getByText('Reported Two')).toBeInTheDocument();
    });
  });

  it('displays report types with correct badges', async () => {
    render(<ModerationPage />);
    
    await waitFor(() => {
      expect(screen.getByText('Cheating')).toBeInTheDocument();
      expect(screen.getByText('Inappropriate Chat')).toBeInTheDocument();
    });
  });

  it('displays report statuses', async () => {
    render(<ModerationPage />);
    
    await waitFor(() => {
      expect(screen.getByText('PENDING')).toBeInTheDocument();
      expect(screen.getByText('REVIEWED')).toBeInTheDocument();
    });
  });

  it('filters reports by status', async () => {
    render(<ModerationPage />);
    
    await waitFor(() => {
      expect(screen.getByText('Reporter One')).toBeInTheDocument();
    });

    const statusSelect = screen.getByLabelText('Status');
    fireEvent.change(statusSelect, { target: { value: 'pending' } });

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('status=pending'),
        expect.any(Object)
      );
    });
  });

  it('filters reports by type', async () => {
    render(<ModerationPage />);
    
    await waitFor(() => {
      expect(screen.getByText('Reporter One')).toBeInTheDocument();
    });

    const typeSelect = screen.getByLabelText('Report Type');
    fireEvent.change(typeSelect, { target: { value: 'cheating' } });

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('reportType=cheating'),
        expect.any(Object)
      );
    });
  });

  it('opens report detail modal when View Details is clicked', async () => {
    (global.fetch as any)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          reports: mockReports,
          total: 2,
          page: 1,
          limit: 20,
          totalPages: 1,
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockReportDetails,
      });

    render(<ModerationPage />);
    
    await waitFor(() => {
      expect(screen.getByText('Reporter One')).toBeInTheDocument();
    });

    const viewButtons = screen.getAllByText('View Details');
    fireEvent.click(viewButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('Report Details')).toBeInTheDocument();
      expect(screen.getByText('Suspected engine use')).toBeInTheDocument();
    });
  });

  it('displays game details in report modal', async () => {
    (global.fetch as any)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          reports: mockReports,
          total: 2,
          page: 1,
          limit: 20,
          totalPages: 1,
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockReportDetails,
      });

    render(<ModerationPage />);
    
    await waitFor(() => {
      expect(screen.getByText('Reporter One')).toBeInTheDocument();
    });

    const viewButtons = screen.getAllByText('View Details');
    fireEvent.click(viewButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('Game Details')).toBeInTheDocument();
      expect(screen.getByText('Player One')).toBeInTheDocument();
      expect(screen.getByText('Player Two')).toBeInTheDocument();
    });
  });

  it('fetches and displays chat logs for chat reports', async () => {
    const chatReport = {
      ...mockReports[1],
      gameDetails: mockChatLogs.game,
    };

    (global.fetch as any)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          reports: mockReports,
          total: 2,
          page: 1,
          limit: 20,
          totalPages: 1,
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => chatReport,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockChatLogs,
      });

    render(<ModerationPage />);
    
    await waitFor(() => {
      expect(screen.getByText('Reporter Two')).toBeInTheDocument();
    });

    const viewButtons = screen.getAllByText('View Details');
    fireEvent.click(viewButtons[1]);

    await waitFor(() => {
      expect(screen.getByText('Chat Logs')).toBeInTheDocument();
      expect(screen.getByText('Good luck!')).toBeInTheDocument();
      expect(screen.getByText('Offensive message')).toBeInTheDocument();
    });
  });

  it('updates report status and admin notes', async () => {
    (global.fetch as any)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          reports: mockReports,
          total: 2,
          page: 1,
          limit: 20,
          totalPages: 1,
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockReportDetails,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          message: 'Report status updated successfully',
          report: { ...mockReportDetails, status: 'RESOLVED' },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          reports: mockReports,
          total: 2,
          page: 1,
          limit: 20,
          totalPages: 1,
        }),
      });

    render(<ModerationPage />);
    
    await waitFor(() => {
      expect(screen.getByText('Reporter One')).toBeInTheDocument();
    });

    const viewButtons = screen.getAllByText('View Details');
    fireEvent.click(viewButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('Report Details')).toBeInTheDocument();
    });

    const statusSelect = screen.getByLabelText('Update Status');
    fireEvent.change(statusSelect, { target: { value: 'resolved' } });

    const notesTextarea = screen.getByLabelText('Admin Notes');
    fireEvent.change(notesTextarea, {
      target: { value: 'Reviewed and resolved. No evidence of cheating.' },
    });

    const updateButton = screen.getByText('Update Report');
    fireEvent.click(updateButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/admin/reports/report-1'),
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({
            status: 'resolved',
            adminNotes: 'Reviewed and resolved. No evidence of cheating.',
          }),
        })
      );
    });
  });

  it('displays error message when fetch fails', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ message: 'Failed to fetch reports' }),
    });

    render(<ModerationPage />);
    
    await waitFor(() => {
      expect(screen.getByText(/Failed to fetch reports/i)).toBeInTheDocument();
    });
  });

  it('clears filters when Clear Filters button is clicked', async () => {
    render(<ModerationPage />);
    
    await waitFor(() => {
      expect(screen.getByText('Reporter One')).toBeInTheDocument();
    });

    // Set filters
    const statusSelect = screen.getByLabelText('Status');
    fireEvent.change(statusSelect, { target: { value: 'pending' } });

    const typeSelect = screen.getByLabelText('Report Type');
    fireEvent.change(typeSelect, { target: { value: 'cheating' } });

    // Clear filters
    const clearButton = screen.getByText('Clear Filters');
    fireEvent.click(clearButton);

    expect(statusSelect).toHaveValue('');
    expect(typeSelect).toHaveValue('');
  });

  it('displays pagination controls when there are multiple pages', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        reports: mockReports,
        total: 50,
        page: 1,
        limit: 20,
        totalPages: 3,
      }),
    });

    render(<ModerationPage />);
    
    await waitFor(() => {
      expect(screen.getByText('Page 1 of 3')).toBeInTheDocument();
      expect(screen.getByText('Previous')).toBeInTheDocument();
      expect(screen.getByText('Next')).toBeInTheDocument();
    });
  });

  it('navigates to next page when Next button is clicked', async () => {
    (global.fetch as any)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          reports: mockReports,
          total: 50,
          page: 1,
          limit: 20,
          totalPages: 3,
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          reports: mockReports,
          total: 50,
          page: 2,
          limit: 20,
          totalPages: 3,
        }),
      });

    render(<ModerationPage />);
    
    await waitFor(() => {
      expect(screen.getByText('Page 1 of 3')).toBeInTheDocument();
    });

    const nextButton = screen.getByText('Next');
    fireEvent.click(nextButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('page=2'),
        expect.any(Object)
      );
    });
  });

  it('includes authorization header in fetch requests', async () => {
    render(<ModerationPage />);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/admin/reports'),
        expect.objectContaining({
          headers: {
            Authorization: 'Bearer test-token',
          },
        })
      );
    });
  });
});
