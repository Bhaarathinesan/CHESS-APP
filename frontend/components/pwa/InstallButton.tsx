'use client';

import { usePWAInstall } from '@/hooks/usePWAInstall';
import { Button } from '@/components/ui/Button';
import { Download, Check } from 'lucide-react';

/**
 * PWA Install Button Component
 * Requirements: 21.15
 */

interface InstallButtonProps {
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  className?: string;
}

export function InstallButton({ 
  variant = 'secondary',
  size = 'md',
  showIcon = true,
  className = '',
}: InstallButtonProps) {
  const { 
    isInstallable, 
    isInstalled, 
    canPrompt,
    promptInstall,
  } = usePWAInstall();

  // Don't show if can't install
  if (!isInstallable && !isInstalled) {
    return null;
  }

  // Show installed state
  if (isInstalled) {
    return (
      <Button
        variant={variant}
        size={size}
        disabled
        className={`flex items-center gap-2 ${className}`}
      >
        {showIcon && <Check className="w-4 h-4" />}
        Installed
      </Button>
    );
  }

  // Don't show if dismissed
  if (!canPrompt) {
    return null;
  }

  const handleInstall = async () => {
    await promptInstall();
  };

  return (
    <Button
      onClick={handleInstall}
      variant={variant}
      size={size}
      className={`flex items-center gap-2 ${className}`}
    >
      {showIcon && <Download className="w-4 h-4" />}
      Install App
    </Button>
  );
}
