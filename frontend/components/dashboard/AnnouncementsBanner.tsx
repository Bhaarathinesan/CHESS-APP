'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui';
import { X, AlertCircle, Info, AlertTriangle, Bell } from 'lucide-react';

interface Announcement {
  id: string;
  title: string;
  message: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  linkUrl?: string;
  createdAt: string;
}

const priorityConfig = {
  low: {
    icon: Info,
    bgColor: 'bg-blue-50 dark:bg-blue-950',
    borderColor: 'border-blue-200 dark:border-blue-800',
    iconColor: 'text-blue-600 dark:text-blue-400',
    textColor: 'text-blue-900 dark:text-blue-100',
  },
  normal: {
    icon: Bell,
    bgColor: 'bg-gray-50 dark:bg-gray-900',
    borderColor: 'border-gray-200 dark:border-gray-700',
    iconColor: 'text-gray-600 dark:text-gray-400',
    textColor: 'text-gray-900 dark:text-gray-100',
  },
  high: {
    icon: AlertCircle,
    bgColor: 'bg-orange-50 dark:bg-orange-950',
    borderColor: 'border-orange-200 dark:border-orange-800',
    iconColor: 'text-orange-600 dark:text-orange-400',
    textColor: 'text-orange-900 dark:text-orange-100',
  },
  urgent: {
    icon: AlertTriangle,
    bgColor: 'bg-red-50 dark:bg-red-950',
    borderColor: 'border-red-200 dark:border-red-800',
    iconColor: 'text-red-600 dark:text-red-400',
    textColor: 'text-red-900 dark:text-red-100',
  },
};

export function AnnouncementsBanner() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnnouncements();
    
    // Load dismissed announcements from localStorage
    const dismissed = localStorage.getItem('dismissedAnnouncements');
    if (dismissed) {
      setDismissedIds(new Set(JSON.parse(dismissed)));
    }
  }, []);

  const fetchAnnouncements = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/announcements?limit=5`);
      if (response.ok) {
        const data = await response.json();
        setAnnouncements(data.announcements || []);
      }
    } catch (error) {
      console.error('Failed to fetch announcements:', error);
    } finally {
      setLoading(false);
    }
  };

  const dismissAnnouncement = (id: string) => {
    const newDismissed = new Set(dismissedIds);
    newDismissed.add(id);
    setDismissedIds(newDismissed);
    localStorage.setItem('dismissedAnnouncements', JSON.stringify(Array.from(newDismissed)));
  };

  const visibleAnnouncements = announcements.filter(
    (announcement) => !dismissedIds.has(announcement.id)
  );

  if (loading) {
    return null;
  }

  if (visibleAnnouncements.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      {visibleAnnouncements.map((announcement) => {
        const config = priorityConfig[announcement.priority];
        const Icon = config.icon;

        return (
          <div
            key={announcement.id}
            className={`${config.bgColor} ${config.borderColor} border-l-4 p-4 rounded-lg relative`}
          >
            <button
              onClick={() => dismissAnnouncement(announcement.id)}
              className={`absolute top-2 right-2 ${config.iconColor} hover:opacity-70 transition-opacity`}
              aria-label="Dismiss announcement"
            >
              <X size={18} />
            </button>

            <div className="flex items-start gap-3 pr-8">
              <Icon className={`${config.iconColor} flex-shrink-0 mt-0.5`} size={20} />
              
              <div className="flex-1">
                <h3 className={`font-semibold ${config.textColor} mb-1`}>
                  {announcement.title}
                </h3>
                <p className={`text-sm ${config.textColor} opacity-90`}>
                  {announcement.message}
                </p>
                
                {announcement.linkUrl && (
                  <a
                    href={announcement.linkUrl}
                    className={`text-sm font-medium ${config.iconColor} hover:underline mt-2 inline-block`}
                  >
                    Learn more →
                  </a>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
