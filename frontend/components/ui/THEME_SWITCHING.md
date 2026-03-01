# Theme Switching Implementation

## Overview

This implementation provides theme switching functionality for the ChessArena platform, allowing users to toggle between dark and light themes with persistence across sessions.

## Requirements Satisfied

- **22.2**: Support dark and light themes ✅
- **22.3**: Theme preference persists across sessions ✅
- **22.4**: Smooth theme transitions without flicker ✅

## Components

### 1. `useTheme` Hook (`frontend/hooks/useTheme.ts`)

A custom React hook that manages theme state and persistence.

**Features:**
- Initializes with dark theme by default
- Loads saved theme from localStorage on mount
- Provides `toggleTheme()` to switch between themes
- Provides `setTheme()` to set a specific theme
- Returns `mounted` flag to prevent hydration mismatches

**Usage:**
```tsx
const { theme, toggleTheme, setTheme, mounted } = useTheme();
```

### 2. `ThemeToggle` Component (`frontend/components/ui/ThemeToggle.tsx`)

A button component that displays a sun/moon icon and toggles the theme.

**Features:**
- Shows sun icon in dark mode, moon icon in light mode
- Accessible with proper ARIA labels
- Prevents hydration mismatch by not rendering until mounted
- Smooth hover transitions

**Usage:**
```tsx
import ThemeToggle from '@/components/ui/ThemeToggle';

<ThemeToggle />
```

### 3. `ThemeProvider` Component (`frontend/components/ThemeProvider.tsx`)

A client-side provider that ensures theme is applied on mount.

**Features:**
- Runs on client-side only
- Applies saved theme from localStorage
- Wraps the application children

### 4. Root Layout Updates (`frontend/app/layout.tsx`)

**Features:**
- Includes inline script to apply theme before hydration (prevents FOUC)
- Uses `suppressHydrationWarning` on html element
- Wraps children with ThemeProvider

### 5. Navbar Integration (`frontend/components/layout/Navbar.tsx`)

The ThemeToggle component is added to the Navbar between the navigation links and user menu.

## How It Works

### 1. Initial Load (No FOUC)

```
1. HTML loads with inline script in <head>
2. Script reads localStorage and applies 'dark' class if needed
3. CSS variables are applied immediately
4. React hydrates without theme flicker
```

### 2. Theme Toggle

```
1. User clicks ThemeToggle button
2. useTheme hook updates state
3. localStorage is updated
4. 'dark' class is toggled on document.documentElement
5. CSS transitions smoothly animate the change
```

### 3. Persistence

```
1. Theme is saved to localStorage on every change
2. On page reload, inline script reads localStorage
3. Theme is applied before React hydration
4. User sees consistent theme across sessions
```

## CSS Implementation

The theme system uses CSS custom properties defined in `frontend/app/globals.css`:

```css
:root {
  /* Light theme variables */
  --background: 255 255 255;
  --foreground: 17 24 39;
  /* ... */
}

.dark {
  /* Dark theme variables */
  --background: 17 24 39;
  --foreground: 243 244 246;
  /* ... */
}

/* Smooth transitions */
* {
  transition-property: background-color, border-color, color, fill, stroke;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
  transition-duration: 150ms;
}
```

## Testing

Unit tests are provided in `frontend/hooks/__tests__/useTheme.test.ts`:

- ✅ Initialize with dark theme by default
- ✅ Toggle theme from dark to light
- ✅ Toggle theme from light to dark
- ✅ Set theme directly
- ✅ Persist theme in localStorage
- ✅ Apply dark class to document element
- ✅ Remove dark class from document element
- ✅ Mounted state management

Run tests:
```bash
npm test -- useTheme.test.ts --run
```

## Browser Support

- Modern browsers with localStorage support
- Graceful degradation if localStorage is unavailable
- No flash of unstyled content (FOUC)
- Smooth CSS transitions (150ms)

## Accessibility

- Proper ARIA labels on toggle button
- Keyboard accessible
- Screen reader friendly
- High contrast support through CSS variables

## Future Enhancements

Potential improvements for future iterations:

1. System theme detection (prefers-color-scheme)
2. Multiple theme options (not just dark/light)
3. Theme customization (user-defined colors)
4. Sync theme across tabs using storage events
5. Theme animation preferences (respect prefers-reduced-motion)
