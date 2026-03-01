'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Play, Trophy, BarChart3, User } from 'lucide-react';

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const navItems: NavItem[] = [
  { href: '/dashboard', label: 'Home', icon: Home },
  { href: '/play', label: 'Play', icon: Play },
  { href: '/tournaments', label: 'Tournaments', icon: Trophy },
  { href: '/leaderboard', label: 'Ranks', icon: BarChart3 },
  { href: '/profile/me', label: 'Profile', icon: User },
];

export default function MobileNav() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return pathname === href;
    }
    if (href === '/profile/me') {
      return pathname?.startsWith('/profile');
    }
    return pathname?.startsWith(href);
  };

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-background-secondary border-t border-border">
      <div className="flex items-center justify-around h-16">
        {navItems.map((item) => {
          const active = isActive(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
                active
                  ? 'text-primary'
                  : 'text-foreground-secondary hover:text-foreground'
              }`}
            >
              <Icon className={`w-6 h-6 ${active ? 'scale-110' : ''}`} />
              <span className="text-xs mt-1 font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
