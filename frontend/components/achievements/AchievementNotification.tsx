'use client';

import { useEffect, useState } from 'react';

interface Achievement {
  id: string;
  code: string;
  name: string;
  description: string;
  points: number;
  iconUrl?: string;
  category: string;
}

interface AchievementNotificationProps {
  achievement: Achievement;
  earnedAt: string;
  onClose: () => void;
}

export function AchievementNotification({
  achievement,
  earnedAt,
  onClose,
}: AchievementNotificationProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    // Trigger entrance animation
    setTimeout(() => setIsVisible(true), 10);

    // Auto-close after 5 seconds
    const timer = setTimeout(() => {
      handleClose();
    }, 5000);

    return () => clearTimeout(timer);
  }, []);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => {
      setIsVisible(false);
      onClose();
    }, 300);
  };

  return (
    <div
      className={`fixed top-4 right-4 z-50 max-w-sm transition-all duration-300 ${
        isVisible && !isExiting
          ? 'opacity-100 translate-y-0 scale-100'
          : 'opacity-0 -translate-y-4 scale-95'
      }`}
    >
      <div className="bg-gradient-to-r from-yellow-400 to-yellow-600 rounded-lg shadow-2xl p-6 text-white animate-bounce-once">
        <div className="flex items-center gap-4">
          <div className="flex-shrink-0">
            {achievement.iconUrl ? (
              <img
                src={achievement.iconUrl}
                alt={achievement.name}
                className="w-16 h-16 rounded-lg"
              />
            ) : (
              <div className="w-16 h-16 rounded-lg bg-white/20 flex items-center justify-center text-4xl">
                🏆
              </div>
            )}
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-lg mb-1">Achievement Unlocked!</h3>
            <p className="font-semibold text-white/90">{achievement.name}</p>
            <p className="text-sm text-white/80 mt-1">{achievement.description}</p>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-xs px-2 py-1 rounded bg-white/20">
                {achievement.category}
              </span>
              <span className="text-sm font-semibold">+{achievement.points} pts</span>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="flex-shrink-0 text-white/80 hover:text-white transition-colors"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
