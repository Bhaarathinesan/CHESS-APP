'use client';

import { useEffect } from 'react';
import BoardSettings from './BoardSettings';

interface BoardSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Modal wrapper for BoardSettings component
 * Requirements: 22.16, 22.17
 */
export default function BoardSettingsModal({ isOpen, onClose }: BoardSettingsModalProps) {
  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50"
      onClick={onClose}
    >
      <div onClick={(e) => e.stopPropagation()}>
        <BoardSettings onClose={onClose} />
      </div>
    </div>
  );
}
