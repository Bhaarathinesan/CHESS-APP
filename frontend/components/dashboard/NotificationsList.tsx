'use client';

import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useState } from 'react';

interface Notification {
  id: string;
  type: 'game_challenge' | 'tournament_start' | 'achievement' | 'game_result' | 'announcement';
  title: string;
  message: string;
  timestamp: string;
  isRead: boolean;
  linkUrl?: string;
}

// Mock data - will be replaced with API call
const mockNotifications: Notification[] = [];

export default function NotificationsList() {
  const [notifications, setNotifications] = useState<Notification[]>(mockNotifications);

  const handleMarkAsRead = (notificationId: string) => {
    setNotifications((prev) =>
      prev.map((notif) =>
        notif.id === notificationId ? { ...notif, isRead: true } : notif
      )
    );
  };

  const handleMarkAllAsRead = () => {
    setNotifications((prev) => prev.map((notif) => ({ ...notif, isRead: true })));
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.isRead) {
      handleMarkAsRead(notification.id);
    }
    if (notification.linkUrl) {
      window.location.href = notification.linkUrl;
    }
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'game_challenge':
        return '⚔️';
      case 'tournament_start':
        return '🏆';
      case 'achievement':
        return '🎖️';
      case 'game_result':
        return '♟️';
      case 'announcement':
        return '📢';
      default:
        return '🔔';
    }
  };

  if (notifications.length === 0) {
    return (
      <Card className="p-6">
        <h2 className="text-2xl font-semibold text-foreground mb-4">Notifications</h2>
        <div className="text-center py-8">
          <p className="text-foreground-secondary">No notifications yet</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-2">
          <h2 className="text-2xl font-semibold text-foreground">Notifications</h2>
          {unreadCount > 0 && (
            <Badge variant="info">{unreadCount}</Badge>
          )}
        </div>
        {unreadCount > 0 && (
          <Button variant="secondary" size="sm" onClick={handleMarkAllAsRead}>
            Mark All Read
          </Button>
        )}
      </div>
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {notifications.map((notification) => (
          <div
            key={notification.id}
            className={`p-4 rounded-lg cursor-pointer transition-colors ${
              notification.isRead
                ? 'bg-background-secondary hover:bg-background-tertiary'
                : 'bg-primary/10 hover:bg-primary/20 border border-primary/30'
            }`}
            onClick={() => handleNotificationClick(notification)}
          >
            <div className="flex items-start gap-3">
              <div className="text-2xl">{getNotificationIcon(notification.type)}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-foreground truncate">{notification.title}</h3>
                  {!notification.isRead && (
                    <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0" />
                  )}
                </div>
                <p className="text-sm text-foreground-secondary mb-1">{notification.message}</p>
                <p className="text-xs text-foreground-secondary">{notification.timestamp}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
