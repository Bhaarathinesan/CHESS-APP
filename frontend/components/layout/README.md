# Layout Components

This directory contains the main layout and navigation components for the ChessArena platform.

## Components

### MainLayout
The main layout wrapper that combines all navigation components and provides the overall page structure.

**Features:**
- Responsive design that adapts to different screen sizes
- Integrates Navbar, Sidebar, and MobileNav
- Provides consistent spacing and padding
- Handles the layout shift for desktop sidebar and mobile bottom navigation

**Usage:**
```tsx
import { MainLayout } from '@/components/layout';

export default function Page() {
  return (
    <MainLayout>
      <YourContent />
    </MainLayout>
  );
}
```

### Navbar
Top navigation bar visible on all screen sizes.

**Features:**
- Fixed position at the top of the screen
- ChessArena logo and branding
- Desktop navigation links (Play, Tournaments, Leaderboard, History)
- User menu with dropdown (Profile, Settings, Logout)
- Responsive design (hides navigation links on mobile)

### Sidebar
Desktop-only sidebar navigation visible on screens ≥1024px (lg breakpoint).

**Features:**
- Fixed position on the left side
- Navigation links with icons and active state highlighting
- Quick stats section showing rating, games, and win rate
- Smooth transitions and hover effects

### MobileNav
Mobile-only bottom navigation bar visible on screens <1024px.

**Features:**
- Fixed position at the bottom of the screen
- 5 main navigation items: Home, Play, Tournaments, Ranks, Profile
- Icon-based navigation with labels
- Active state highlighting
- Touch-optimized tap targets

## Responsive Behavior

### Desktop (≥1024px)
- Navbar at top
- Sidebar on left
- Main content area with left padding to accommodate sidebar
- No bottom navigation

### Tablet/Mobile (<1024px)
- Navbar at top (simplified)
- No sidebar
- Main content area with bottom padding to accommodate mobile nav
- Mobile bottom navigation bar

## Layout Structure

```
┌─────────────────────────────────────┐
│           Navbar (fixed)            │
├──────────┬──────────────────────────┤
│          │                          │
│ Sidebar  │   Main Content Area      │
│ (desktop)│                          │
│          │                          │
│          │                          │
└──────────┴──────────────────────────┘
            MobileNav (mobile, fixed)
```

## Styling

All components use:
- Tailwind CSS utility classes
- CSS variables for theming (defined in globals.css)
- Smooth transitions for theme switching
- Consistent spacing and border radius

## Navigation Items

The navigation structure includes:
- **Dashboard**: Main landing page with quick actions
- **Play**: Matchmaking and game creation
- **Tournaments**: Browse and join tournaments
- **Leaderboard**: View top players and rankings
- **History**: Review past games
- **Profile**: User profile and settings

## Future Enhancements

- Add notification badge to user menu
- Implement real user authentication
- Add online status indicator
- Add search functionality
- Implement theme toggle in navbar
- Add keyboard shortcuts for navigation
