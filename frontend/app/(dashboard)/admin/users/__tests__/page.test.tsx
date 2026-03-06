import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import UserManagementPage from '../page';

// Mock fetch
global.fetch = vi.fn();

// Mock window.confirm
global.confirm = vi.fn();

describe('UserManagementPage', () => {
  const mockUsersResponse = {
    users: [
      {
        id: '1',
        username: 'johndoe',
        email: 'john@example.edu',
        displayName: 'John Doe',
        role: 'PLAYER',
        isBanned: false,
        createdAt: '2024-01-01T00:00:00Z',
        lastOnline: '2024-01-15T10:30:00Z',
        isOnline: true,
      },
      {
        id: '2',
        username: 'janedoe',
        email: 'jane@example.edu',
        displayName: 'Jane Doe',
        role: 'TOURNAMENT_ADMIN',
        isBanned: false,
        createdAt: '2024-01-02T00:00:00Z',
        lastOnline: '2024-01-14T15:20:00Z',
        isOnline: false,
      },
      {
        id: '3',
        username: 'banned_user',
        email: 'banned@example.edu',
        displayName: 'Banned User',
        role: 'PLAYER',
        isBanned: true,
        banReason: 'Cheating',
        createdAt: '2024-01-03T00:00:00Z',
        isOnline: false,
      },
    ],
    total: 3,
    page: 1,
    limit: 20,
  };

  beforeEach(() => {
    (global.fetch as any).mockClear();
    (global.confirm as any).mockClear();
    localStorage.setItem('token', 'test-token');
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should render loading state initially', () => {
    (global.fetch as any).mockImplementation(
      () => new Promise(() => {}), // Never resolves
    );

    render(<UserManagementPage />);
    expect(screen.getByText('Loading users...')).toBeInTheDocument();
  });

  it('should render user management page with users', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockUsersResponse,
    });

    render(<UserManagementPage />);

    await waitFor(() => {
      expect(screen.getByText('User Management')).toBeInTheDocument();
    });

    // Check if users are displayed
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('@johndoe')).toBeInTheDocument();
    expect(screen.getByText('jane@example.edu')).toBeInTheDocument();
  });

  it('should display user roles with correct badges', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockUsersResponse,
    });

    render(<UserManagementPage />);

    await waitFor(() => {
      expect(screen.getByText('PLAYER')).toBeInTheDocument();
      expect(screen.getByText('TOURNAMENT ADMIN')).toBeInTheDocument();
    });
  });

  it('should display online status correctly', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockUsersResponse,
    });

    render(<UserManagementPage />);

    await waitFor(() => {
      expect(screen.getByText('Online')).toBeInTheDocument();
    });
  });

  it('should display banned status', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockUsersResponse,
    });

    render(<UserManagementPage />);

    await waitFor(() => {
      expect(screen.getByText('Banned')).toBeInTheDocument();
    });
  });

  it('should handle search input', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => mockUsersResponse,
    });

    render(<UserManagementPage />);

    await waitFor(() => {
      expect(screen.getByText('User Management')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText('Search by username or email...');
    fireEvent.change(searchInput, { target: { value: 'john' } });

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('search=john'),
        expect.any(Object),
      );
    });
  });

  it('should handle role filter', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => mockUsersResponse,
    });

    render(<UserManagementPage />);

    await waitFor(() => {
      expect(screen.getByText('User Management')).toBeInTheDocument();
    });

    const roleFilter = screen.getByDisplayValue('All Roles');
    fireEvent.change(roleFilter, { target: { value: 'PLAYER' } });

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('role=PLAYER'),
        expect.any(Object),
      );
    });
  });

  it('should handle status filter', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => mockUsersResponse,
    });

    render(<UserManagementPage />);

    await waitFor(() => {
      expect(screen.getByText('User Management')).toBeInTheDocument();
    });

    const statusFilter = screen.getByDisplayValue('All Status');
    fireEvent.change(statusFilter, { target: { value: 'banned' } });

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('status=banned'),
        expect.any(Object),
      );
    });
  });

  it('should include authorization header in fetch request', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockUsersResponse,
    });

    render(<UserManagementPage />);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/admin/users'),
        expect.objectContaining({
          headers: {
            Authorization: 'Bearer test-token',
          },
        }),
      );
    });
  });

  it('should display total users count', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockUsersResponse,
    });

    render(<UserManagementPage />);

    await waitFor(() => {
      expect(screen.getByText('Total Users: 3')).toBeInTheDocument();
    });
  });

  it('should render error state on fetch failure', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
    });

    render(<UserManagementPage />);

    await waitFor(() => {
      expect(screen.getByText(/Failed to fetch users/)).toBeInTheDocument();
    });
  });

  it('should handle pagination', async () => {
    const mockPaginatedResponse = {
      ...mockUsersResponse,
      total: 50,
    };

    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => mockPaginatedResponse,
    });

    render(<UserManagementPage />);

    await waitFor(() => {
      expect(screen.getByText('User Management')).toBeInTheDocument();
    });

    // Check if pagination is displayed
    expect(screen.getByText('Next')).toBeInTheDocument();
    expect(screen.getByText('Previous')).toBeInTheDocument();
  });

  it('should open edit modal when edit action is clicked', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockUsersResponse,
    });

    render(<UserManagementPage />);

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    // Find and click the first Actions button
    const actionsButtons = screen.getAllByText('Actions');
    fireEvent.click(actionsButtons[0]);

    // Wait for dropdown to appear and click Edit User
    await waitFor(() => {
      const editButton = screen.getByText('Edit User');
      fireEvent.click(editButton);
    });

    // Check if modal is opened
    await waitFor(() => {
      expect(screen.getByText('Edit User: John Doe')).toBeInTheDocument();
    });
  });

  it('should handle password reset', async () => {
    (global.fetch as any)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockUsersResponse,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ newPassword: 'temp123' }),
      });

    (global.confirm as any).mockReturnValue(true);
    global.alert = vi.fn();

    render(<UserManagementPage />);

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    // Find and click the first Actions button
    const actionsButtons = screen.getAllByText('Actions');
    fireEvent.click(actionsButtons[0]);

    // Wait for dropdown and click Reset Password
    await waitFor(() => {
      const resetButton = screen.getByText('Reset Password');
      fireEvent.click(resetButton);
    });

    await waitFor(() => {
      expect(global.confirm).toHaveBeenCalled();
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/reset-password'),
        expect.objectContaining({
          method: 'POST',
        }),
      );
    });
  });

  it('should format dates correctly', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockUsersResponse,
    });

    render(<UserManagementPage />);

    await waitFor(() => {
      // Check that dates are formatted (not raw ISO strings)
      const dateElements = screen.queryAllByText(/Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec/);
      expect(dateElements.length).toBeGreaterThan(0);
    });
  });
});
