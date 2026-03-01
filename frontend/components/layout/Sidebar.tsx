'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Play, Trophy, BarChart3, History } from 'lucide-react';

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const navItems: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: Home },
  { href: '/play', label: 'Play', icon: Play },
  { href: '/tournaments', label: 'Tournaments', icon: Trophy },
  { href: '/leaderboard', label: 'Leaderboard', icon: BarChart3 },
  { href: '/history', label: 'History', icon: History },
];

export default function Sidebar() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return pathname === href;
    }
    return pathname?.startsWith(href);
  };

  return (
    <aside className="hidden lg:flex fixed left-0 top-16 bottom-0 w-64 bg-background-secondary border-r border-border flex-col">
      <nav className="flex-1 p-4 space-y-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                isActive(item.href)
                  ? 'bg-primary text-primary-foreground'
                  : 'text-foreground-secondary hover:bg-background-tertiary hover:text-foreground'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Quick Stats Section */}
      <div className="p-4 border-t border-border">
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-foreground-secondary">Rating</span>
            <span className="font-semibold text-foreground">1200</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-foreground-secondary">Games</span>
            <span className="font-semibold text-foreground">0</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-foreground-secondary">Win Rate</span>
            <span className="font-semibold text-foreground">0%</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
