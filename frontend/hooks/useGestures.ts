import { useEffect, useRef, useCallback } from 'react';

export interface SwipeGestureConfig {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  threshold?: number; // Minimum distance for swipe (default: 50px)
  velocityThreshold?: number; // Minimum velocity for swipe (default: 0.3)
}

export interface PinchGestureConfig {
  onPinch?: (scale: number) => void;
  onPinchStart?: () => void;
  onPinchEnd?: (finalScale: number) => void;
  minScale?: number;
  maxScale?: number;
}

export interface LongPressGestureConfig {
  onLongPress?: (x: number, y: number) => void;
  delay?: number; // Delay in ms before long press triggers (default: 500ms)
  movementThreshold?: number; // Max movement allowed during long press (default: 10px)
}

export interface PullToRefreshConfig {
  onRefresh?: () => void | Promise<void>;
  threshold?: number; // Distance to pull before refresh triggers (default: 80px)
  enabled?: boolean;
}

export interface GestureConfig {
  swipe?: SwipeGestureConfig;
  pinch?: PinchGestureConfig;
  longPress?: LongPressGestureConfig;
  pullToRefresh?: PullToRefreshConfig;
}

interface TouchPoint {
  x: number;
  y: number;
  time: number;
}

/**
 * Custom hook for handling mobile gestures
 * Supports: swipe, pinch-to-zoom, long-press, pull-to-refresh
 * 
 * Requirements:
 * - 21.5: Swipe gestures for move history navigation
 * - 21.6: Pinch-to-zoom for board viewing
 * - 21.7: Long-press for move options
 * - 21.10: Pull-to-refresh for content updates
 */
export function useGestures(elementRef: React.RefObject<HTMLElement>, config: GestureConfig) {
  const touchStartRef = useRef<TouchPoint | null>(null);
  const touchesRef = useRef<Touch[]>([]);
  const initialDistanceRef = useRef<number>(0);
  const currentScaleRef = useRef<number>(1);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isPinchingRef = useRef<boolean>(false);
  const pullDistanceRef = useRef<number>(0);
  const isRefreshingRef = useRef<boolean>(false);

  const {
    swipe,
    pinch,
    longPress,
    pullToRefresh,
  } = config;

  // Calculate distance between two touch points
  const getDistance = useCallback((touch1: Touch, touch2: Touch): number => {
    const dx = touch1.clientX - touch2.clientX;
    const dy = touch1.clientY - touch2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }, []);

  // Handle touch start
  const handleTouchStart = useCallback((e: TouchEvent) => {
    const touch = e.touches[0];
    touchStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now(),
    };

    // Store all touches for pinch detection
    touchesRef.current = Array.from(e.touches);

    // Pinch gesture detection
    if (e.touches.length === 2 && pinch) {
      isPinchingRef.current = true;
      initialDistanceRef.current = getDistance(e.touches[0], e.touches[1]);
      pinch.onPinchStart?.();
      
      // Cancel long press when pinching
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }
    }

    // Long press detection
    if (e.touches.length === 1 && longPress) {
      const delay = longPress.delay ?? 500;
      longPressTimerRef.current = setTimeout(() => {
        if (touchStartRef.current) {
          longPress.onLongPress?.(touchStartRef.current.x, touchStartRef.current.y);
        }
      }, delay);
    }
  }, [pinch, longPress, getDistance]);

  // Handle touch move
  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!touchStartRef.current) return;

    const touch = e.touches[0];
    const deltaX = touch.clientX - touchStartRef.current.x;
    const deltaY = touch.clientY - touchStartRef.current.y;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

    // Cancel long press if moved too much
    if (longPress && longPressTimerRef.current) {
      const threshold = longPress.movementThreshold ?? 10;
      if (distance > threshold) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }
    }

    // Pinch gesture
    if (e.touches.length === 2 && pinch && isPinchingRef.current) {
      const currentDistance = getDistance(e.touches[0], e.touches[1]);
      const scale = currentDistance / initialDistanceRef.current;
      
      // Apply scale constraints
      const minScale = pinch.minScale ?? 0.5;
      const maxScale = pinch.maxScale ?? 3;
      const constrainedScale = Math.max(minScale, Math.min(maxScale, scale));
      
      currentScaleRef.current = constrainedScale;
      pinch.onPinch?.(constrainedScale);
      
      // Prevent default to avoid page zoom
      e.preventDefault();
    }

    // Pull to refresh (only when at top of scroll)
    if (pullToRefresh?.enabled && e.touches.length === 1 && !isPinchingRef.current) {
      const element = elementRef.current;
      if (element && element.scrollTop === 0 && deltaY > 0) {
        pullDistanceRef.current = deltaY;
        
        // Visual feedback could be added here
        const threshold = pullToRefresh.threshold ?? 80;
        if (deltaY >= threshold && !isRefreshingRef.current) {
          // Trigger refresh
          isRefreshingRef.current = true;
          const result = pullToRefresh.onRefresh?.();
          if (result instanceof Promise) {
            result.finally(() => {
              isRefreshingRef.current = false;
              pullDistanceRef.current = 0;
            });
          } else {
            isRefreshingRef.current = false;
            pullDistanceRef.current = 0;
          }
        }
        
        // Prevent default scrolling during pull
        e.preventDefault();
      }
    }
  }, [pinch, longPress, pullToRefresh, getDistance, elementRef]);

  // Handle touch end
  const handleTouchEnd = useCallback((e: TouchEvent) => {
    // Clear long press timer
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }

    // Handle pinch end
    if (isPinchingRef.current && pinch) {
      pinch.onPinchEnd?.(currentScaleRef.current);
      isPinchingRef.current = false;
      currentScaleRef.current = 1;
    }

    // Handle swipe gesture
    if (touchStartRef.current && swipe && e.changedTouches.length === 1) {
      const touch = e.changedTouches[0];
      const deltaX = touch.clientX - touchStartRef.current.x;
      const deltaY = touch.clientY - touchStartRef.current.y;
      const deltaTime = Date.now() - touchStartRef.current.time;
      
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
      const velocity = distance / deltaTime;
      
      const threshold = swipe.threshold ?? 50;
      const velocityThreshold = swipe.velocityThreshold ?? 0.3;
      
      // Check if swipe meets threshold requirements
      if (distance >= threshold && velocity >= velocityThreshold) {
        const absX = Math.abs(deltaX);
        const absY = Math.abs(deltaY);
        
        // Determine swipe direction (horizontal or vertical)
        if (absX > absY) {
          // Horizontal swipe
          if (deltaX > 0) {
            swipe.onSwipeRight?.();
          } else {
            swipe.onSwipeLeft?.();
          }
        } else {
          // Vertical swipe
          if (deltaY > 0) {
            swipe.onSwipeDown?.();
          } else {
            swipe.onSwipeUp?.();
          }
        }
      }
    }

    // Reset pull to refresh
    pullDistanceRef.current = 0;

    // Reset touch start
    touchStartRef.current = null;
    touchesRef.current = [];
  }, [swipe, pinch]);

  // Set up event listeners
  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    element.addEventListener('touchstart', handleTouchStart, { passive: false });
    element.addEventListener('touchmove', handleTouchMove, { passive: false });
    element.addEventListener('touchend', handleTouchEnd, { passive: false });
    element.addEventListener('touchcancel', handleTouchEnd, { passive: false });

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('touchend', handleTouchEnd);
      element.removeEventListener('touchcancel', handleTouchEnd);
      
      // Clean up timers
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
      }
    };
  }, [elementRef, handleTouchStart, handleTouchMove, handleTouchEnd]);

  return {
    isPinching: isPinchingRef.current,
    currentScale: currentScaleRef.current,
    pullDistance: pullDistanceRef.current,
    isRefreshing: isRefreshingRef.current,
  };
}
