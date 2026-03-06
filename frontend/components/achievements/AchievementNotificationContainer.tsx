'use client';

import { useAchievementNotifications } from '@/hooks/useAchievementNotifications';
import { AchievementNotification } from './AchievementNotification';

export function AchievementNotificationContainer() {
  const { notifications, removeNotification } = useAchievementNotifications();

  return (
    <div className="fixed top-0 right-0 z-50 p-4 space-y-4 pointer-events-none">
      {notifications.map((notification) => (
        <div key={notification.id} className="pointer-events-auto">
          <AchievementNotification
            achievement={notification.achievement}
            earnedAt={notification.earnedAt}
            onClose={() => removeNotification(notification.id)}
          />
        </div>
      ))}
    </div>
  );
}
