'use client';

import { ReactNode } from 'react';
import { useResponsive } from '@/hooks/useResponsive';

interface ResponsiveGridProps {
  children: ReactNode;
  className?: string;
  cols?: {
    xs?: number;
    sm?: number;
    md?: number;
    lg?: number;
    xl?: number;
    '2xl'?: number;
  };
  gap?: number;
}

export default function ResponsiveGrid({
  children,
  className = '',
  cols = { xs: 1, sm: 2, md: 2, lg: 3, xl: 4, '2xl': 4 },
  gap = 4,
}: ResponsiveGridProps) {
  const { breakpoint } = useResponsive();

  const getGridCols = () => {
    switch (breakpoint) {
      case 'xs':
        return cols.xs || 1;
      case 'sm':
        return cols.sm || 2;
      case 'md':
        return cols.md || 2;
      case 'lg':
        return cols.lg || 3;
      case 'xl':
        return cols.xl || 4;
      case '2xl':
        return cols['2xl'] || 4;
      default:
        return 1;
    }
  };

  const gridCols = getGridCols();
  const gridColsClass = `grid-cols-${gridCols}`;
  const gapClass = `gap-${gap}`;

  return (
    <div className={`grid ${gridColsClass} ${gapClass} ${className}`}>
      {children}
    </div>
  );
}
