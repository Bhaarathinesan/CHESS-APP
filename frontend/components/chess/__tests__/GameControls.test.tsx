import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import GameControls from '../GameControls';

describe('GameControls', () => {
  const defaultProps = {
    gameId: 'test-game-id',
    playerId: 'test-player-id',
    isPlayerTurn: true,
    isGameActive: true,
  };

  describe('Basic Rendering', () => {
    it('should render all main control buttons', () => {
      render(<GameControls {...defaultProps} />);

      expect(screen.getByText('Resign')).toBeInTheDocument();
      expect(screen.getByText('Offer Draw')).toBeInTheDocument();
      expect(screen.getByTitle('Settings')).toBeInTheDocument();
    });

    it('should disable buttons when game is not active', () => {
      render(<GameControls {...defaultProps} isGameActive={false} />);

      const resignButton = screen.getByText('Resign');
      const offerDrawButton = screen.getByText('Offer Draw');

      expect(resignButton).toBeDisabled();
      expect(offerDrawButton).toBeDisabled();
    });

    it('should disable buttons when disabled prop is true', () => {
      render(<GameControls {...defaultProps} disabled={true} />);

      const resignButton = screen.getByText('Resign');
      const offerDrawButton = screen.getByText('Offer Draw');

      expect(resignButton).toBeDisabled();
      expect(offerDrawButton).toBeDisabled();
    });
  });

  describe('Resign Functionality', () => {
    it('should show confirmation modal when resign button is clicked', () => {
      render(<GameControls {...defaultProps} />);

      const resignButton = screen.getByText('Resign');
      fireEvent.click(resignButton);

      expect(screen.getByText('Confirm Resignation')).toBeInTheDocument();
      expect(screen.getByText(/Are you sure you want to resign/)).toBeInTheDocument();
    });

    it('should call onResign when resignation is confirmed', () => {
      const onResign = vi.fn();
      render(<GameControls {...defaultProps} onResign={onResign} />);

      // Open confirmation modal
      const resignButton = screen.getByText('Resign');
      fireEvent.click(resignButton);

      // Confirm resignation
      const confirmButtons = screen.getAllByText('Resign');
      const confirmButton = confirmButtons.find((btn: HTMLElement) => btn.closest('.bg-red-600'));
      fireEvent.click(confirmButton!);

      expect(onResign).toHaveBeenCalledTimes(1);
    });

    it('should close modal when cancel is clicked', () => {
      render(<GameControls {...defaultProps} />);

      // Open confirmation modal
      const resignButton = screen.getByText('Resign');
      fireEvent.click(resignButton);

      // Cancel resignation
      const cancelButton = screen.getByText('Cancel');
      fireEvent.click(cancelButton);

      expect(screen.queryByText('Confirm Resignation')).not.toBeInTheDocument();
    });
  });

  describe('Draw Offer Functionality', () => {
    it('should call onOfferDraw when offer draw button is clicked', () => {
      const onOfferDraw = vi.fn();
      render(<GameControls {...defaultProps} onOfferDraw={onOfferDraw} />);

      const offerDrawButton = screen.getByText('Offer Draw');
      fireEvent.click(offerDrawButton);

      expect(onOfferDraw).toHaveBeenCalledTimes(1);
    });

    it('should disable offer draw button when draw offer exists', () => {
      render(
        <GameControls
          {...defaultProps}
          drawOfferState={{
            hasOffer: true,
            isOffering: false,
          }}
        />
      );

      const offerDrawButton = screen.getByText('Offer Draw');
      expect(offerDrawButton).toBeDisabled();
    });

    it('should show draw offer notification when opponent offers draw', () => {
      render(
        <GameControls
          {...defaultProps}
          drawOfferState={{
            hasOffer: true,
            isOffering: false,
            offeringPlayerId: 'opponent-id',
            expiresAt: Date.now() + 60000,
          }}
        />
      );

      expect(screen.getByText('Draw Offered')).toBeInTheDocument();
      expect(screen.getByText('Your opponent has offered a draw')).toBeInTheDocument();
      expect(screen.getByText('Accept Draw')).toBeInTheDocument();
      expect(screen.getByText('Decline')).toBeInTheDocument();
    });

    it('should show draw offer sent notification when player offers draw', () => {
      render(
        <GameControls
          {...defaultProps}
          drawOfferState={{
            hasOffer: true,
            isOffering: true,
            offeringPlayerId: 'test-player-id',
            expiresAt: Date.now() + 60000,
          }}
        />
      );

      expect(screen.getByText('Draw Offer Sent')).toBeInTheDocument();
      expect(screen.getByText("Waiting for opponent's response")).toBeInTheDocument();
      expect(screen.getByText('Cancel Offer')).toBeInTheDocument();
    });

    it('should call onAcceptDraw when accept button is clicked', () => {
      const onAcceptDraw = vi.fn();
      render(
        <GameControls
          {...defaultProps}
          onAcceptDraw={onAcceptDraw}
          drawOfferState={{
            hasOffer: true,
            isOffering: false,
            offeringPlayerId: 'opponent-id',
            expiresAt: Date.now() + 60000,
          }}
        />
      );

      const acceptButton = screen.getByText('Accept Draw');
      fireEvent.click(acceptButton);

      expect(onAcceptDraw).toHaveBeenCalledTimes(1);
    });

    it('should call onDeclineDraw when decline button is clicked', () => {
      const onDeclineDraw = vi.fn();
      render(
        <GameControls
          {...defaultProps}
          onDeclineDraw={onDeclineDraw}
          drawOfferState={{
            hasOffer: true,
            isOffering: false,
            offeringPlayerId: 'opponent-id',
            expiresAt: Date.now() + 60000,
          }}
        />
      );

      const declineButton = screen.getByText('Decline');
      fireEvent.click(declineButton);

      expect(onDeclineDraw).toHaveBeenCalledTimes(1);
    });

    it('should call onCancelDrawOffer when cancel offer button is clicked', () => {
      const onCancelDrawOffer = vi.fn();
      render(
        <GameControls
          {...defaultProps}
          onCancelDrawOffer={onCancelDrawOffer}
          drawOfferState={{
            hasOffer: true,
            isOffering: true,
            offeringPlayerId: 'test-player-id',
            expiresAt: Date.now() + 60000,
          }}
        />
      );

      const cancelButton = screen.getByText('Cancel Offer');
      fireEvent.click(cancelButton);

      expect(onCancelDrawOffer).toHaveBeenCalledTimes(1);
    });
  });

  describe('Draw Offer Timer', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should display countdown timer for draw offer', () => {
      const expiresAt = Date.now() + 60000; // 60 seconds from now
      render(
        <GameControls
          {...defaultProps}
          drawOfferState={{
            hasOffer: true,
            isOffering: false,
            offeringPlayerId: 'opponent-id',
            expiresAt,
          }}
        />
      );

      // Should show 60s initially
      expect(screen.getByText('60s')).toBeInTheDocument();
    });

    it('should update countdown timer every second', async () => {
      const expiresAt = Date.now() + 5000; // 5 seconds from now
      render(
        <GameControls
          {...defaultProps}
          drawOfferState={{
            hasOffer: true,
            isOffering: false,
            offeringPlayerId: 'opponent-id',
            expiresAt,
          }}
        />
      );

      // Initial state
      expect(screen.getByText('5s')).toBeInTheDocument();

      // Advance time by 1 second
      vi.advanceTimersByTime(1000);

      await waitFor(() => {
        expect(screen.getByText('4s')).toBeInTheDocument();
      });
    });
  });

  describe('Settings Button', () => {
    it('should call onSettings when settings button is clicked', () => {
      const onSettings = vi.fn();
      render(<GameControls {...defaultProps} onSettings={onSettings} />);

      const settingsButton = screen.getByTitle('Settings');
      fireEvent.click(settingsButton);

      expect(onSettings).toHaveBeenCalledTimes(1);
    });

    it('should not disable settings button when game is inactive', () => {
      render(<GameControls {...defaultProps} isGameActive={false} />);

      const settingsButton = screen.getByTitle('Settings');
      expect(settingsButton).not.toBeDisabled();
    });
  });

  describe('Button States and Permissions', () => {
    it('should enable all buttons when game is active', () => {
      render(<GameControls {...defaultProps} />);

      const resignButton = screen.getByText('Resign');
      const offerDrawButton = screen.getByText('Offer Draw');
      const settingsButton = screen.getByTitle('Settings');

      expect(resignButton).not.toBeDisabled();
      expect(offerDrawButton).not.toBeDisabled();
      expect(settingsButton).not.toBeDisabled();
    });

    it('should disable action buttons but not settings when game is inactive', () => {
      render(<GameControls {...defaultProps} isGameActive={false} />);

      const resignButton = screen.getByText('Resign');
      const offerDrawButton = screen.getByText('Offer Draw');
      const settingsButton = screen.getByTitle('Settings');

      expect(resignButton).toBeDisabled();
      expect(offerDrawButton).toBeDisabled();
      expect(settingsButton).not.toBeDisabled();
    });

    it('should disable draw action buttons when draw offer is active', () => {
      render(
        <GameControls
          {...defaultProps}
          drawOfferState={{
            hasOffer: true,
            isOffering: false,
            offeringPlayerId: 'opponent-id',
            expiresAt: Date.now() + 60000,
          }}
        />
      );

      const offerDrawButton = screen.getByText('Offer Draw');
      expect(offerDrawButton).toBeDisabled();
    });
  });
});
