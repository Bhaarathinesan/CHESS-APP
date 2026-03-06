'use client';

import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

interface Achievement {
  id: string;
  code: string;
  name: string;
  description: string;
  points: number;
  iconUrl?: string;
  category: string;
}

interface AchievementUnlockedEvent {
  id: string;
  achievement: Achievement;
  earnedAt: string;
}

export function useAchievementNotifications() {
  const [notifications, setNotifications] = useState<AchievementUnlockedEvent[]>([]);
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    // Connect to notifications namespace
    const newSocket = io('http://localhost:4000/notifications', {
      auth: { token },
      transports: ['websocket'],
    });

    newSocket.on('connect', () => {
      console.log('Connected to notifications');
      newSocket.emit('subscribe');
    });

    newSocket.on('achievement_unlocked', (data: AchievementUnlockedEvent) => {
      console.log('Achievement unlocked:', data);
      setNotifications((prev) => [...prev, data]);
    });

    newSocket.on('disconnect', () => {
      console.log('Disconnected from notifications');
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, []);

  const removeNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  return {
    notifications,
    removeNotification,
  };
}
