# Responsive Design Implementation

## Overview

ChessArena is fully responsive, supporting screen sizes from 320px (mobile) to 2560px (large desktop). The platform adapts seamlessly across devices with optimized layouts for mobile, tablet, and desktop.

## Breakpoints

We use Tailwind CSS's default breakpoints:

- **xs**: 0px - 639px (Mobile portrait)
- **sm**: 640px - 767px (Mobile landscape)
- **md**: 768px - 1023px (Tablet)
- **lg**: 1024px - 1279px (Desktop)
- **xl**: 1280px - 1535px (Large desktop)
- **2xl**: 1536px+ (Extra large desktop)

## Responsive Hooks

### `useResponsive()`

Main hook for responsive behavior:

```typescript
const { 
  width,          // Current viewport width
  height,         // Current viewport height
  breakpoint,     // Current breakpoint ('xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl')
  orientation,    // 'portrait' | 'landscape'
  isMobile,       // true for xs and sm
  isTablet,       // true for md
  isDesktop,      // true for lg, xl, 2xl
  isTouchDevice   // true if touch is supported
} = useResponsive();
```

### `useBreakpoint(breakpoint)`

Check if viewport matches a specific breakpoint:

```typescript
const isLargeScreen = useBreakpoint('lg'); // true if >= 1024px
```

### `useBreakpointRange(min, max)`

Check if viewport is within a range:

```typescript
const isTabletOnly = useBreakpointRange('md', 'lg'); // true if 768px-1023px
```

## Responsive Components

### ResponsiveContainer

Provides consistent padding and max-width across breakpoints:

```tsx
<ResponsiveContainer maxWidth="2xl" padding>
  {/* Content automatically gets responsive padding */}
</ResponsiveContainer>
```

### ResponsiveGrid

Automatically adjusts grid columns based on breakpoint:

```tsx
<ResponsiveGrid 
  cols={{ xs: 1, sm: 2, md: 2, lg: 3, xl: 4 }}
  gap={4}
>
  {/* Grid items */}
</ResponsiveGrid>
```

## Layout Behavior

### Mobile (xs, sm)
- Bottom navigation bar (MobileNav)
- Hamburger menu in navbar
- Single column layouts
- Larger touch targets (min 44x44px)
- Simplified UI with essential features
- Full-width components

### Tablet (md)
- Bottom navigation hidden
- Sidebar appears
- 2-column layouts where appropriate
- Hybrid touch/mouse interface
- More detailed information displayed

### Desktop (lg, xl, 2xl)
- Full sidebar navigation
- Multi-column layouts
- Hover states and tooltips
- Keyboard shortcuts enabled
- Maximum information density

## Responsive Patterns

### 1. Conditional Rendering

```tsx
const { isMobile } = useResponsive();

return (
  <>
    {isMobile ? <MobileView /> : <DesktopView />}
  </>
);
```

### 2. Responsive Classes

```tsx
<div className="
  w-full           // Full width on mobile
  md:w-1/2         // Half width on tablet
  lg:w-1/3         // Third width on desktop
  p-4              // Padding 1rem on mobile
  md:p-6           // Padding 1.5rem on tablet
  lg:p-8           // Padding 2rem on desktop
">
  Content
</div>
```

### 3. Responsive Typography

```tsx
<h1 className="
  text-2xl         // 1.5rem on mobile
  md:text-3xl      // 1.875rem on tablet
  lg:text-4xl      // 2.25rem on desktop
">
  Title
</h1>
```

### 4. Responsive Spacing

```tsx
<div className="
  space-y-4        // 1rem vertical spacing on mobile
  md:space-y-6     // 1.5rem on tablet
  lg:space-y-8     // 2rem on desktop
">
  {/* Stacked items */}
</div>
```

## Navigation

### Mobile Navigation
- Fixed bottom bar with 5 main sections
- Icons with labels
- Active state highlighting
- Smooth transitions

### Desktop Navigation
- Fixed left sidebar
- Expanded menu items
- Hover effects
- Collapsible sections

### Hamburger Menu
- Appears on mobile/tablet in navbar
- Slide-down animation
- Overlay backdrop
- Quick access to all sections

## Touch Optimization

### Touch Targets
- Minimum 44x44px for all interactive elements
- Increased padding on mobile
- Larger buttons and controls

### Touch Gestures
- Tap for selection
- Long-press for context menus
- Swipe for navigation
- Pinch-to-zoom for chess board
- Pull-to-refresh for content updates

## Orientation Support

The platform adapts to both portrait and landscape orientations:

### Portrait
- Vertical stacking of components
- Bottom navigation
- Scrollable content

### Landscape
- Horizontal layouts where beneficial
- Side-by-side panels
- Optimized for wider screens

## Testing Responsive Design

### Browser DevTools
1. Open Chrome/Firefox DevTools
2. Toggle device toolbar (Ctrl+Shift+M)
3. Test various device presets
4. Test custom dimensions (320px - 2560px)

### Physical Devices
- iPhone SE (320px width)
- iPhone 12/13 (390px width)
- iPad (768px width)
- Desktop (1920px width)
- Large desktop (2560px width)

### Orientation Testing
- Test both portrait and landscape
- Verify layout adapts correctly
- Check navigation behavior

## Performance Considerations

### Mobile Optimization
- Lazy load images
- Reduce animation complexity
- Minimize JavaScript bundle size
- Use CSS transforms for animations
- Optimize touch event handlers

### Responsive Images
```tsx
<Image
  src="/image.jpg"
  alt="Description"
  width={800}
  height={600}
  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
/>
```

## Accessibility

### Responsive Accessibility
- Touch targets meet WCAG 2.1 guidelines (44x44px minimum)
- Text remains readable at all sizes (min 16px)
- Sufficient color contrast at all breakpoints
- Keyboard navigation works on all devices
- Screen reader support across all layouts

## Common Responsive Utilities

### Hide/Show by Breakpoint
```tsx
<div className="hidden md:block">Desktop only</div>
<div className="block md:hidden">Mobile only</div>
```

### Responsive Flexbox
```tsx
<div className="
  flex 
  flex-col         // Stack on mobile
  md:flex-row      // Row on tablet+
  gap-4
">
  {/* Flex items */}
</div>
```

### Responsive Grid
```tsx
<div className="
  grid 
  grid-cols-1      // 1 column on mobile
  md:grid-cols-2   // 2 columns on tablet
  lg:grid-cols-3   // 3 columns on desktop
  gap-4
">
  {/* Grid items */}
</div>
```

## Best Practices

1. **Mobile-First Approach**: Design for mobile first, then enhance for larger screens
2. **Touch-Friendly**: Ensure all interactive elements are easily tappable
3. **Performance**: Optimize for slower mobile connections
4. **Content Priority**: Show most important content first on mobile
5. **Test Real Devices**: Always test on actual devices, not just emulators
6. **Orientation**: Support both portrait and landscape
7. **Accessibility**: Maintain accessibility across all breakpoints
8. **Progressive Enhancement**: Core functionality works everywhere, enhancements for capable devices

## Requirements Validation

✅ **Requirement 21.1**: Renders correctly from 320px to 2560px width
✅ **Requirement 21.8**: Adapts layout for portrait and landscape orientations
✅ **Requirement 21.9**: Uses bottom navigation on mobile devices

## Next Steps

- [ ] Implement touch gestures for chess board (Task 45.3)
- [ ] Add mobile-specific gestures (Task 45.4)
- [ ] Implement haptic feedback (Task 45.5)
- [ ] Configure PWA manifest (Task 46.1)
- [ ] Implement service worker (Task 46.2)
