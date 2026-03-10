'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ChevronDown, Menu, X } from 'lucide-react';
import ThemeToggle from '@/components/ui/ThemeToggle';
import { useResponsive } from '@/hooks/useResponsive';
import { InstallButton } from '@/components/pwa/InstallButton';

export default function Navbar() {
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { isMobile } = useResponsive();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background border-b border-border h-16">
      <div className="h-full px-4 flex items-center justify-between max-w-screen-2xl mx-auto">
        {/* Logo */}
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary rounded-md flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-lg">♔</span>
          </div>
          <span className="font-bold text-xl hidden sm:inline">ChessArena</span>
        </Link>

        {/* Desktop Navigation Links */}
        <div className="hidden md:flex items-center gap-6">
          <Link
            href="/play"
            className="text-foreground-secondary hover:text-foreground transition-colors"
          >
            Play
          </Link>
          <Link
            href="/tournaments"
            className="text-foreground-secondary hover:text-foreground transition-colors"
          >
            Tournaments
          </Link>
          <Link
            href="/leaderboard"
            className="text-foreground-secondary hover:text-foreground transition-colors"
          >
            Leaderboard
          </Link>
          <Link
            href="/history"
            className="text-foreground-secondary hover:text-foreground transition-colors"
          >
            History
          </Link>
        </div>

        {/* Right side actions */}
        <div className="flex items-center gap-2">
          {/* Install Button (Desktop only) */}
          <div className="hidden lg:block">
            <InstallButton variant="secondary" size="sm" />
          </div>

          {/* Hamburger Menu Button (Mobile/Tablet) */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2 hover:bg-background-secondary rounded-lg transition-colors"
            aria-label="Toggle menu"
          >
            {isMobileMenuOpen ? (
              <X className="w-6 h-6 text-foreground" />
            ) : (
              <Menu className="w-6 h-6 text-foreground" />
            )}
          </button>

          {/* Theme Toggle */}
          <ThemeToggle />

          {/* User Menu */}
          <div className="relative">
            <button
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              className="flex items-center gap-2 hover:opacity-80 transition-opacity"
              aria-label="User menu"
            >
              <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
                <span className="text-secondary-foreground text-sm font-medium">U</span>
              </div>
              <ChevronDown className="w-4 h-4 text-foreground-secondary hidden sm:block" />
            </button>

            {/* Dropdown Menu */}
            {isUserMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setIsUserMenuOpen(false)}
                />
                <div className="absolute right-0 mt-2 w-56 bg-background-secondary border border-border rounded-lg shadow-lg z-50 animate-fade-in">
                  <div className="p-3 border-b border-border">
                    <p className="font-medium text-foreground">Guest User</p>
                    <p className="text-sm text-foreground-secondary">guest@example.com</p>
                  </div>
                  <div className="py-2">
                    <Link
                      href="/profile/me"
                      className="block px-4 py-2 text-foreground-secondary hover:bg-background-tertiary hover:text-foreground transition-colors"
                      onClick={() => setIsUserMenuOpen(false)}
                    >
                      Profile
                    </Link>
                    <Link
                      href="/settings"
                      className="block px-4 py-2 text-foreground-secondary hover:bg-background-tertiary hover:text-foreground transition-colors"
                      onClick={() => setIsUserMenuOpen(false)}
                    >
                      Settings
                    </Link>
                    <button
                      className="w-full text-left px-4 py-2 text-foreground-secondary hover:bg-background-tertiary hover:text-foreground transition-colors"
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        // TODO: Implement logout
                      }}
                    >
                      Logout
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <div className="fixed top-16 left-0 right-0 bg-background border-b border-border z-50 md:hidden animate-slide-up">
            <div className="p-4 space-y-2">
              <Link
                href="/play"
                className="block px-4 py-3 text-foreground hover:bg-background-secondary rounded-lg transition-colors"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Play
              </Link>
              <Link
                href="/tournaments"
                className="block px-4 py-3 text-foreground hover:bg-background-secondary rounded-lg transition-colors"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Tournaments
              </Link>
              <Link
                href="/leaderboard"
                className="block px-4 py-3 text-foreground hover:bg-background-secondary rounded-lg transition-colors"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Leaderboard
              </Link>
              <Link
                href="/history"
                className="block px-4 py-3 text-foreground hover:bg-background-secondary rounded-lg transition-colors"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                History
              </Link>
            </div>
          </div>
        </>
      )}
    </nav>
  );
}
