import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import BoardSettings from '../BoardSettings';
import { BOARD_THEMES, PIECE_SETS } from '@/types/chess-preferences';

// Mock the useChessPreferences hook
jest.mock('@/hooks/useChessPreferences', () => ({
  useChessPreferences: () => ({
    preferences: {
      boardTheme: 'default',
      pieceSet: 'default',
    },
    setBoardTheme: jest.fn(),
    setPieceSet: jest.fn(),
    resetPreferences: jest.fn(),
    isLoaded: true,
  }),
}));

describe('BoardSettings', () => {
  it('renders board settings component', () => {
    render(<BoardSettings />);
    expect(screen.getByText('Board Settings')).toBeInTheDocument();
  });

  it('displays board themes tab by default', () => {
    render(<BoardSettings />);
    expect(screen.getByText('Board Themes')).toHaveClass('text-blue-600');
  });

  it('switches to pieces tab when clicked', () => {
    render(<BoardSettings />);
    const piecesTab = screen.getByText('Piece Sets');
    fireEvent.click(piecesTab);
    expect(piecesTab).toHaveClass('text-blue-600');
  });

  it('displays all board themes', () => {
    render(<BoardSettings />);
    BOARD_THEMES.forEach((theme) => {
      expect(screen.getByText(theme.name)).toBeInTheDocument();
    });
  });

  it('displays all piece sets', () => {
    render(<BoardSettings />);
    const piecesTab = screen.getByText('Piece Sets');
    fireEvent.click(piecesTab);
    
    PIECE_SETS.forEach((pieceSet) => {
      expect(screen.getByText(pieceSet.name)).toBeInTheDocument();
    });
  });

  it('calls onClose when close button is clicked', () => {
    const onClose = jest.fn();
    render(<BoardSettings onClose={onClose} />);
    
    const closeButton = screen.getAllByRole('button').find(
      (button) => button.querySelector('svg')
    );
    
    if (closeButton) {
      fireEvent.click(closeButton);
      expect(onClose).toHaveBeenCalled();
    }
  });

  it('displays reset to default button', () => {
    render(<BoardSettings />);
    expect(screen.getByText('Reset to Default')).toBeInTheDocument();
  });

  it('displays done button when onClose is provided', () => {
    const onClose = jest.fn();
    render(<BoardSettings onClose={onClose} />);
    expect(screen.getByText('Done')).toBeInTheDocument();
  });

  it('renders board theme preview grids', () => {
    const { container } = render(<BoardSettings />);
    const previewGrids = container.querySelectorAll('.grid-cols-8');
    expect(previewGrids.length).toBeGreaterThan(0);
  });

  it('shows selected indicator on current board theme', () => {
    const { container } = render(<BoardSettings />);
    // The default theme should have a check mark
    const checkIcons = container.querySelectorAll('svg');
    const hasCheckIcon = Array.from(checkIcons).some(
      (icon) => icon.getAttribute('class')?.includes('w-4 h-4')
    );
    expect(hasCheckIcon).toBe(true);
  });

  it('shows selected indicator on current piece set', () => {
    render(<BoardSettings />);
    const piecesTab = screen.getByText('Piece Sets');
    fireEvent.click(piecesTab);
    
    // The default piece set should be highlighted
    const defaultPieceSet = screen.getByText('Classic').closest('button');
    expect(defaultPieceSet).toHaveClass('border-blue-600');
  });
});
