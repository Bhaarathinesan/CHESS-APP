import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { InstallPrompt } from '../InstallPrompt';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { vi, describe, it, expect, beforeEach } from 'vitest';

/**
 * Tests for InstallPrompt component
 * Requirements: 21.15
 */

vi.mock('@/hooks/usePWAInstall');

const mockUsePWAInstall = usePWAInstall as ReturnType<typeof vi.fn>;

describe('InstallPrompt', () => {
  const mockPromptInstall = vi.fn();
  const mockDismissPrompt = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    
    (mockUsePWAInstall as any).mockReturnValue({
      isInstallable: true,
      isInstalled: false,
      isIOS: false,
      canPrompt: true,
      isDismissed: false,
      promptInstall: mockPromptInstall,
      dismissPrompt: mockDismissPrompt,
      resetDismissal: vi.fn(),
    });
  });

  describe('Banner Variant', () => {
    it('should render banner when installable', () => {
      render(<InstallPrompt variant="banner" />);

      expect(screen.getByText('Install ChessArena')).toBeInTheDocument();
      expect(screen.getByText(/Get the app for offline access/)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Install/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Not Now/i })).toBeInTheDocument();
    });

    it('should call promptInstall when install button clicked', async () => {
      mockPromptInstall.mockResolvedValue({ outcome: 'accepted', platform: 'web' });

      render(<InstallPrompt variant="banner" />);

      const installButton = screen.getByRole('button', { name: /Install/i });
      fireEvent.click(installButton);

      await waitFor(() => {
        expect(mockPromptInstall).toHaveBeenCalled();
      });
    });

    it('should call dismissPrompt when dismiss button clicked', () => {
      render(<InstallPrompt variant="banner" />);

      const dismissButton = screen.getByRole('button', { name: /Not Now/i });
      fireEvent.click(dismissButton);

      expect(mockDismissPrompt).toHaveBeenCalled();
    });

    it('should call dismissPrompt when close button clicked', () => {
      render(<InstallPrompt variant="banner" />);

      const closeButton = screen.getByRole('button', { name: /Close/i });
      fireEvent.click(closeButton);

      expect(mockDismissPrompt).toHaveBeenCalled();
    });

    it('should call onInstall callback when install accepted', async () => {
      mockPromptInstall.mockResolvedValue({ outcome: 'accepted', platform: 'web' });
      const onInstall = jest.fn();

      render(<InstallPrompt variant="banner" onInstall={onInstall} />);

      const installButton = screen.getByRole('button', { name: /Install/i });
      fireEvent.click(installButton);

      await waitFor(() => {
        expect(onInstall).toHaveBeenCalled();
      });
    });

    it('should call onDismiss callback when dismissed', () => {
      const onDismiss = jest.fn();

      render(<InstallPrompt variant="banner" onDismiss={onDismiss} />);

      const dismissButton = screen.getByRole('button', { name: /Not Now/i });
      fireEvent.click(dismissButton);

      expect(onDismiss).toHaveBeenCalled();
    });
  });

  describe('Modal Variant', () => {
    it('should render modal when installable', () => {
      render(<InstallPrompt variant="modal" />);

      expect(screen.getByText('Install ChessArena')).toBeInTheDocument();
      expect(screen.getByText(/Install ChessArena for a better experience/)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Install/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Not Now/i })).toBeInTheDocument();
    });

    it('should call promptInstall when install button clicked', async () => {
      mockPromptInstall.mockResolvedValue({ outcome: 'accepted', platform: 'web' });

      render(<InstallPrompt variant="modal" />);

      const installButton = screen.getByRole('button', { name: /Install/i });
      fireEvent.click(installButton);

      await waitFor(() => {
        expect(mockPromptInstall).toHaveBeenCalled();
      });
    });

    it('should call dismissPrompt when not now button clicked', () => {
      render(<InstallPrompt variant="modal" />);

      const dismissButton = screen.getByRole('button', { name: /Not Now/i });
      fireEvent.click(dismissButton);

      expect(mockDismissPrompt).toHaveBeenCalled();
    });
  });

  describe('Button Variant', () => {
    it('should render button when installable', () => {
      render(<InstallPrompt variant="button" />);

      expect(screen.getByRole('button', { name: /Install App/i })).toBeInTheDocument();
    });

    it('should call promptInstall when button clicked', async () => {
      mockPromptInstall.mockResolvedValue({ outcome: 'accepted', platform: 'web' });

      render(<InstallPrompt variant="button" />);

      const installButton = screen.getByRole('button', { name: /Install App/i });
      fireEvent.click(installButton);

      await waitFor(() => {
        expect(mockPromptInstall).toHaveBeenCalled();
      });
    });
  });

  describe('iOS Instructions', () => {
    beforeEach(() => {
      (mockUsePWAInstall as any).mockReturnValue({
        isInstallable: false,
        isInstalled: false,
        isIOS: true,
        canPrompt: true,
        isDismissed: false,
        promptInstall: mockPromptInstall,
        dismissPrompt: mockDismissPrompt,
        resetDismissal: vi.fn(),
      });
    });

    it('should render iOS instructions in banner variant', () => {
      render(<InstallPrompt variant="banner" />);

      expect(screen.getByText('Install ChessArena')).toBeInTheDocument();
      expect(screen.getByText(/To install this app on your iPhone/)).toBeInTheDocument();
      expect(screen.getByText(/Tap the Share button/)).toBeInTheDocument();
      expect(screen.getByText(/Add to Home Screen/)).toBeInTheDocument();
    });

    it('should render iOS instructions in modal variant', () => {
      render(<InstallPrompt variant="modal" />);

      expect(screen.getByText('Install ChessArena')).toBeInTheDocument();
      expect(screen.getByText(/To install this app on your iPhone/)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Got it/i })).toBeInTheDocument();
    });

    it('should not render iOS instructions in button variant', () => {
      render(<InstallPrompt variant="button" />);

      expect(screen.queryByText('Install ChessArena')).not.toBeInTheDocument();
    });

    it('should call dismissPrompt when close button clicked', () => {
      render(<InstallPrompt variant="banner" />);

      const closeButton = screen.getByRole('button', { name: /Close/i });
      fireEvent.click(closeButton);

      expect(mockDismissPrompt).toHaveBeenCalled();
    });
  });

  describe('Visibility Conditions', () => {
    it('should not render when already installed', () => {
      (mockUsePWAInstall as any).mockReturnValue({
        isInstallable: true,
        isInstalled: true,
        isIOS: false,
        canPrompt: true,
        isDismissed: false,
        promptInstall: mockPromptInstall,
        dismissPrompt: mockDismissPrompt,
        resetDismissal: vi.fn(),
      });

      const { container } = render(<InstallPrompt variant="banner" />);

      expect(container.firstChild).toBeNull();
    });

    it('should not render when cannot prompt', () => {
      (mockUsePWAInstall as any).mockReturnValue({
        isInstallable: true,
        isInstalled: false,
        isIOS: false,
        canPrompt: false,
        isDismissed: true,
        promptInstall: mockPromptInstall,
        dismissPrompt: mockDismissPrompt,
        resetDismissal: vi.fn(),
      });

      const { container } = render(<InstallPrompt variant="banner" />);

      expect(container.firstChild).toBeNull();
    });

    it('should not render when not installable (non-iOS)', () => {
      (mockUsePWAInstall as any).mockReturnValue({
        isInstallable: false,
        isInstalled: false,
        isIOS: false,
        canPrompt: true,
        isDismissed: false,
        promptInstall: mockPromptInstall,
        dismissPrompt: mockDismissPrompt,
        resetDismissal: vi.fn(),
      });

      const { container } = render(<InstallPrompt variant="banner" />);

      expect(container.firstChild).toBeNull();
    });
  });
});
