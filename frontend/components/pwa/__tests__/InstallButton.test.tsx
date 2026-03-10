import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { InstallButton } from '../InstallButton';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { vi, describe, it, expect, beforeEach } from 'vitest';

/**
 * Tests for InstallButton component
 * Requirements: 21.15
 */

vi.mock('@/hooks/usePWAInstall');

const mockUsePWAInstall = usePWAInstall as ReturnType<typeof vi.fn>;

describe('InstallButton', () => {
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

  describe('Rendering', () => {
    it('should render install button when installable', () => {
      render(<InstallButton />);

      expect(screen.getByRole('button', { name: /Install App/i })).toBeInTheDocument();
    });

    it('should render with custom variant', () => {
      render(<InstallButton variant="primary" />);

      const button = screen.getByRole('button', { name: /Install App/i });
      expect(button).toBeInTheDocument();
    });

    it('should render with custom size', () => {
      render(<InstallButton size="sm" />);

      const button = screen.getByRole('button', { name: /Install App/i });
      expect(button).toBeInTheDocument();
    });

    it('should render without icon when showIcon is false', () => {
      render(<InstallButton showIcon={false} />);

      const button = screen.getByRole('button', { name: /Install App/i });
      expect(button).toBeInTheDocument();
      
      // Icon should not be present
      const svg = button.querySelector('svg');
      expect(svg).not.toBeInTheDocument();
    });

    it('should apply custom className', () => {
      render(<InstallButton className="custom-class" />);

      const button = screen.getByRole('button', { name: /Install App/i });
      expect(button).toHaveClass('custom-class');
    });
  });

  describe('Installed State', () => {
    beforeEach(() => {
      (mockUsePWAInstall as any).mockReturnValue({
        isInstallable: true,
        isInstalled: true,
        isIOS: false,
        canPrompt: false,
        isDismissed: false,
        promptInstall: mockPromptInstall,
        dismissPrompt: mockDismissPrompt,
        resetDismissal: vi.fn(),
      });
    });

    it('should render installed state when app is installed', () => {
      render(<InstallButton />);

      const button = screen.getByRole('button', { name: /Installed/i });
      expect(button).toBeInTheDocument();
      expect(button).toBeDisabled();
    });

    it('should show check icon in installed state', () => {
      render(<InstallButton />);

      const button = screen.getByRole('button', { name: /Installed/i });
      const svg = button.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });
  });

  describe('Visibility Conditions', () => {
    it('should not render when not installable and not installed', () => {
      (mockUsePWAInstall as any).mockReturnValue({
        isInstallable: false,
        isInstalled: false,
        isIOS: false,
        canPrompt: false,
        isDismissed: false,
        promptInstall: mockPromptInstall,
        dismissPrompt: mockDismissPrompt,
        resetDismissal: vi.fn(),
      });

      const { container } = render(<InstallButton />);

      expect(container.firstChild).toBeNull();
    });

    it('should not render when dismissed', () => {
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

      const { container } = render(<InstallButton />);

      expect(container.firstChild).toBeNull();
    });
  });

  describe('Install Interaction', () => {
    it('should call promptInstall when button clicked', async () => {
      mockPromptInstall.mockResolvedValue({ outcome: 'accepted', platform: 'web' });

      render(<InstallButton />);

      const button = screen.getByRole('button', { name: /Install App/i });
      fireEvent.click(button);

      await waitFor(() => {
        expect(mockPromptInstall).toHaveBeenCalled();
      });
    });

    it('should handle install acceptance', async () => {
      mockPromptInstall.mockResolvedValue({ outcome: 'accepted', platform: 'web' });

      render(<InstallButton />);

      const button = screen.getByRole('button', { name: /Install App/i });
      fireEvent.click(button);

      await waitFor(() => {
        expect(mockPromptInstall).toHaveBeenCalled();
      });
    });

    it('should handle install dismissal', async () => {
      mockPromptInstall.mockResolvedValue({ outcome: 'dismissed', platform: 'web' });

      render(<InstallButton />);

      const button = screen.getByRole('button', { name: /Install App/i });
      fireEvent.click(button);

      await waitFor(() => {
        expect(mockPromptInstall).toHaveBeenCalled();
      });
    });
  });
});
