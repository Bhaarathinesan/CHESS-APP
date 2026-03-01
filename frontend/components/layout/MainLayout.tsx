'use client';

import { ReactNode } from 'react';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import MobileNav from './MobileNav';

interface MainLayoutProps {
  children: ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      {/* Top Navigation Bar */}
      <Navbar />

      {/* Desktop Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <main className="pt-16 lg:pl-64 pb-16 lg:pb-0">
        <div className="max-w-screen-2xl mx-auto p-4 md:p-6 lg:p-8">
          {children}
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <MobileNav />
    </div>
  );
}
