'use client';

import { ReactNode } from 'react';
import { useResponsive } from '@/hooks/useResponsive';

interface ResponsiveContainerProps {
  children: ReactNode;
  className?: string;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
  padding?: boolean;
}

const maxWidthClasses = {
  sm: 'max-w-screen-sm',
  md: 'max-w-screen-md',
  lg: 'max-w-screen-lg',
  xl: 'max-w-screen-xl',
  '2xl': 'max-w-screen-2xl',
  full: 'max-w-full',
};

export default function ResponsiveContainer({
  children,
  className = '',
  maxWidth = '2xl',
  padding = true,
}: ResponsiveContainerProps) {
  const { isMobile, isTablet } = useResponsive();

  const paddingClass = padding
    ? isMobile
      ? 'px-4 py-4'
      : isTablet
      ? 'px-6 py-6'
      : 'px-8 py-8'
    : '';

  return (
    <div className={`${maxWidthClasses[maxWidth]} mx-auto ${paddingClass} ${className}`}>
      {children}
    </div>
  );
}
