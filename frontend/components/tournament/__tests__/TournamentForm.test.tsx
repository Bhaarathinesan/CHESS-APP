import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { TournamentForm } from '../TournamentForm';

describe('TournamentForm', () => {
  const mockOnSubmit = vi.fn();
  const mockOnCancel = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders all required form fields', () => {
    render(<TournamentForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

    expect(screen.getByLabelText(/Tournament Name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Format/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Time Control/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Initial Time/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Increment/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Minimum Players/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Maximum Players/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Registration Deadline/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Start Time/i)).toBeInTheDocument();
  });

  it('shows validation error for empty tournament name', async () => {
    render(<TournamentForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

    const submitButton = screen.getByRole('button', { name: /Create Tournament/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/Tournament name is required/i)).toBeInTheDocument();
    });

    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it('shows validation error for short tournament name', async () => {
    render(<TournamentForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

    const nameInput = screen.getByLabelText(/Tournament Name/i);
    fireEvent.change(nameInput, { target: { value: 'AB' } });

    const submitButton = screen.getByRole('button', { name: /Create Tournament/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/must be at least 3 characters/i)).toBeInTheDocument();
    });
  });

  it('shows validation error when min players exceeds max players', async () => {
    render(<TournamentForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

    const minPlayersInput = screen.getByLabelText(/Minimum Players/i);
    const maxPlayersInput = screen.getByLabelText(/Maximum Players/i);

    fireEvent.change(minPlayersInput, { target: { value: '100' } });
    fireEvent.change(maxPlayersInput, { target: { value: '50' } });

    const submitButton = screen.getByRole('button', { name: /Create Tournament/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/cannot exceed maximum players/i)).toBeInTheDocument();
    });
  });

  it('shows rounds field when Swiss format is selected', () => {
    render(<TournamentForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

    const formatSelect = screen.getByLabelText(/Format/i);
    fireEvent.change(formatSelect, { target: { value: 'SWISS' } });

    expect(screen.getByLabelText(/Number of Rounds/i)).toBeInTheDocument();
  });

  it('validates rounds are required for Swiss format', async () => {
    render(<TournamentForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

    const formatSelect = screen.getByLabelText(/Format/i);
    fireEvent.change(formatSelect, { target: { value: 'SWISS' } });

    const nameInput = screen.getByLabelText(/Tournament Name/i);
    fireEvent.change(nameInput, { target: { value: 'Test Tournament' } });

    const submitButton = screen.getByRole('button', { name: /Create Tournament/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/Number of rounds is required/i)).toBeInTheDocument();
    });
  });

  it('handles banner image upload', () => {
    render(<TournamentForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

    const file = new File(['banner'], 'banner.png', { type: 'image/png' });
    const input = screen.getByLabelText(/Banner Image/i) as HTMLInputElement;

    fireEvent.change(input, { target: { files: [file] } });

    expect(input.files?.[0]).toBe(file);
  });

  it('validates banner image size', async () => {
    render(<TournamentForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

    // Create a file larger than 2MB
    const largeFile = new File(['x'.repeat(3 * 1024 * 1024)], 'large.png', {
      type: 'image/png',
    });
    const input = screen.getByLabelText(/Banner Image/i);

    fireEvent.change(input, { target: { files: [largeFile] } });

    await waitFor(() => {
      expect(screen.getByText(/must be less than 2MB/i)).toBeInTheDocument();
    });
  });

  it('calls onCancel when cancel button is clicked', () => {
    render(<TournamentForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

    const cancelButton = screen.getByRole('button', { name: /Cancel/i });
    fireEvent.click(cancelButton);

    expect(mockOnCancel).toHaveBeenCalledTimes(1);
  });

  it('submits form with valid data', async () => {
    mockOnSubmit.mockResolvedValue(undefined);

    render(<TournamentForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

    // Fill in required fields
    fireEvent.change(screen.getByLabelText(/Tournament Name/i), {
      target: { value: 'Test Tournament' },
    });

    // Set future dates
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dayAfterTomorrow = new Date();
    dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);

    fireEvent.change(screen.getByLabelText(/Registration Deadline/i), {
      target: { value: tomorrow.toISOString().slice(0, 16) },
    });

    fireEvent.change(screen.getByLabelText(/Start Time/i), {
      target: { value: dayAfterTomorrow.toISOString().slice(0, 16) },
    });

    const submitButton = screen.getByRole('button', { name: /Create Tournament/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledTimes(1);
    });

    const submittedData = mockOnSubmit.mock.calls[0][0];
    expect(submittedData.name).toBe('Test Tournament');
    expect(submittedData.format).toBe('SWISS');
    expect(submittedData.timeControl).toBe('BLITZ');
  });

  it('displays loading state during submission', async () => {
    mockOnSubmit.mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 100))
    );

    render(<TournamentForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

    // Fill in required fields
    fireEvent.change(screen.getByLabelText(/Tournament Name/i), {
      target: { value: 'Test Tournament' },
    });

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dayAfterTomorrow = new Date();
    dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);

    fireEvent.change(screen.getByLabelText(/Registration Deadline/i), {
      target: { value: tomorrow.toISOString().slice(0, 16) },
    });

    fireEvent.change(screen.getByLabelText(/Start Time/i), {
      target: { value: dayAfterTomorrow.toISOString().slice(0, 16) },
    });

    const submitButton = screen.getByRole('button', { name: /Create Tournament/i });
    fireEvent.click(submitButton);

    // Button should be disabled during submission
    expect(submitButton).toBeDisabled();

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalled();
    });
  });

  it('populates form with initial data', () => {
    const initialData = {
      name: 'Existing Tournament',
      description: 'Test description',
      format: 'ROUND_ROBIN',
      timeControl: 'RAPID',
      initialTimeMinutes: 15,
      incrementSeconds: 10,
      minPlayers: 8,
      maxPlayers: 16,
    };

    render(
      <TournamentForm
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        initialData={initialData}
      />
    );

    expect(screen.getByLabelText(/Tournament Name/i)).toHaveValue('Existing Tournament');
    expect(screen.getByLabelText(/Description/i)).toHaveValue('Test description');
    expect(screen.getByLabelText(/Format/i)).toHaveValue('ROUND_ROBIN');
    expect(screen.getByLabelText(/Time Control/i)).toHaveValue('RAPID');
    expect(screen.getByLabelText(/Initial Time/i)).toHaveValue(15);
    expect(screen.getByLabelText(/Increment/i)).toHaveValue(10);
  });
});
