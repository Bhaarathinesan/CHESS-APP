# PWA Install Prompt Implementation

This document describes the PWA install prompt implementation for ChessArena.

**Requirements:** 21.15

## Overview

The PWA install prompt system provides a seamless way for users to install ChessArena as a Progressive Web App on their devices. It handles:

- Detecting install capability
- Managing install prompts across different browsers
- Tracking installation status
- Providing iOS-specific instructions
- Persisting user dismissal preferences

## Components

### 1. usePWAInstall Hook

**Location:** `frontend/hooks/usePWAInstall.ts`

Custom React hook that manages PWA installation state and interactions.

#### Features

- **Install Detection**: Detects when the app is installable via `beforeinstallprompt` event
- **Platform Detection**: Identifies iOS devices for special handling
- **Installation Tracking**: Monitors installation status via `appinstalled` event
- **Dismissal Management**: Persists user dismissal for 7 days
- **Analytics Integration**: Tracks install events with Google Analytics

#### API

```typescript
const {
  isInstallable,    // Can the app be installed?
  isInstalled,      // Is the app already installed?
  isIOS,            // Is this an iOS device?
  canPrompt,        // Should we show the prompt?
  isDismissed,      // Did user dismiss recently?
  promptInstall,    // Show install prompt
  dismissPrompt,    // Dismiss and persist
  resetDismissal,   // Clear dismissal (for testing)
} = usePWAInstall();
```

#### Usage Example

```typescript
import { usePWAInstall } from '@/hooks/usePWAInstall';

function MyComponent() {
  const { canPrompt, promptInstall } = usePWAInstall();

  if (!canPrompt) return null;

  return (
    <button onClick={promptInstall}>
      Install App
    </button>
  );
}
```

### 2. InstallPrompt Component

**Location:** `frontend/components/pwa/InstallPrompt.tsx`

Displays install prompts in various formats.

#### Variants

1. **Banner** (default): Bottom banner with install/dismiss buttons
2. **Modal**: Full-screen modal with detailed information
3. **Button**: Simple install button

#### Props

```typescript
interface InstallPromptProps {
  variant?: 'banner' | 'modal' | 'button';
  onInstall?: () => void;
  onDismiss?: () => void;
}
```

#### Usage Example

```typescript
import { InstallPrompt } from '@/components/pwa/InstallPrompt';

// Banner variant
<InstallPrompt variant="banner" />

// Modal variant
<InstallPrompt variant="modal" />

// Button variant
<InstallPrompt variant="button" />
```

#### iOS Handling

On iOS devices, the component automatically displays instructions for manual installation:

1. Tap the Share button
2. Scroll down and tap "Add to Home Screen"
3. Tap "Add" to confirm

### 3. InstallButton Component

**Location:** `frontend/components/pwa/InstallButton.tsx`

Standalone install button for use in navigation or settings.

#### Props

```typescript
interface InstallButtonProps {
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  className?: string;
}
```

#### Features

- Shows "Install App" when installable
- Shows "Installed" (disabled) when already installed
- Hides when not installable or dismissed
- Customizable styling

#### Usage Example

```typescript
import { InstallButton } from '@/components/pwa/InstallButton';

// In navbar
<InstallButton variant="secondary" size="sm" />

// In settings
<InstallButton variant="primary" size="md" />
```

### 4. PWAProvider Component

**Location:** `frontend/components/pwa/PWAProvider.tsx`

Global provider that manages automatic install prompt display.

#### Props

```typescript
interface PWAProviderProps {
  children: React.ReactNode;
  showPrompt?: boolean;           // Enable/disable auto prompt
  promptVariant?: 'banner' | 'modal';
  promptDelay?: number;           // Delay in ms (default: 3000)
}
```

#### Features

- Automatically shows install prompt after delay
- Respects user dismissal
- Configurable delay and variant
- Can be disabled globally

#### Usage Example

```typescript
import { PWAProvider } from '@/components/pwa/PWAProvider';

function RootLayout({ children }) {
  return (
    <PWAProvider 
      showPrompt={true}
      promptVariant="banner"
      promptDelay={3000}
    >
      {children}
    </PWAProvider>
  );
}
```

## Integration

### 1. Root Layout

The PWAProvider is integrated in `frontend/app/layout.tsx`:

```typescript
import { PWAProvider } from '@/components/pwa/PWAProvider';

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <ThemeProvider>
          <PWAProvider>
            {children}
          </PWAProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
```

### 2. Navbar

The InstallButton is added to the navbar for easy access:

```typescript
import { InstallButton } from '@/components/pwa/InstallButton';

export default function Navbar() {
  return (
    <nav>
      {/* ... other nav items ... */}
      <InstallButton variant="secondary" size="sm" />
    </nav>
  );
}
```

## Browser Support

### Chrome/Edge/Samsung Internet

- Uses native `beforeinstallprompt` event
- Programmatic install prompt via `prompt()` method
- Automatic detection of installation

### iOS Safari

- No programmatic install support
- Shows manual installation instructions
- Detects standalone mode for installed state

### Firefox

- Limited PWA support
- Manual installation via browser menu
- No `beforeinstallprompt` event

## User Experience Flow

### First Visit (Desktop/Android)

1. User visits ChessArena
2. After 3 seconds, banner appears at bottom
3. User can:
   - Click "Install" → App installs
   - Click "Not Now" → Banner dismissed for 7 days
   - Click "X" → Banner dismissed for 7 days

### First Visit (iOS)

1. User visits ChessArena
2. After 3 seconds, banner appears with instructions
3. User follows manual installation steps
4. App appears on home screen

### Subsequent Visits

- If dismissed: No prompt for 7 days
- If installed: No prompt shown
- If not dismissed: Prompt appears after delay

## Analytics Tracking

The implementation tracks the following events:

```typescript
// Install prompt shown
gtag('event', 'pwa_install_prompt', {
  event_category: 'engagement',
  event_label: 'accepted' | 'dismissed',
});

// App installed
gtag('event', 'pwa_install', {
  event_category: 'engagement',
  event_label: 'PWA Installed',
});

// Prompt dismissed
gtag('event', 'pwa_install_dismissed', {
  event_category: 'engagement',
  event_label: 'Install Prompt Dismissed',
});
```

## Local Storage

### Keys

- `pwa-install-dismissed`: Timestamp of last dismissal

### Data Format

```typescript
{
  "pwa-install-dismissed": "1704067200000" // Unix timestamp
}
```

### Expiration

Dismissal expires after 7 days (configurable in hook).

## Testing

### Unit Tests

All components and hooks have comprehensive unit tests:

- `frontend/hooks/__tests__/usePWAInstall.test.ts`
- `frontend/components/pwa/__tests__/InstallPrompt.test.tsx`
- `frontend/components/pwa/__tests__/InstallButton.test.tsx`

### Manual Testing

#### Chrome/Edge (Desktop)

1. Open DevTools → Application → Manifest
2. Verify manifest is valid
3. Click "Add to home screen" to test
4. Verify prompt appears and works

#### Chrome (Android)

1. Visit site on Android device
2. Wait for install banner
3. Test install flow
4. Verify app appears on home screen

#### Safari (iOS)

1. Visit site on iPhone/iPad
2. Verify iOS instructions appear
3. Follow manual installation steps
4. Verify app appears on home screen

### Testing Dismissal

```typescript
// In browser console
localStorage.setItem('pwa-install-dismissed', Date.now().toString());
// Reload page - prompt should not appear

// Clear dismissal
localStorage.removeItem('pwa-install-dismissed');
// Reload page - prompt should appear
```

## Customization

### Change Dismissal Duration

Edit `frontend/hooks/usePWAInstall.ts`:

```typescript
const DISMISSAL_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days
// Change to desired duration
```

### Change Prompt Delay

Edit `frontend/app/layout.tsx`:

```typescript
<PWAProvider promptDelay={5000}> {/* 5 seconds */}
```

### Change Prompt Variant

Edit `frontend/app/layout.tsx`:

```typescript
<PWAProvider promptVariant="modal"> {/* or "banner" */}
```

### Disable Auto Prompt

Edit `frontend/app/layout.tsx`:

```typescript
<PWAProvider showPrompt={false}>
```

Users can still install via the InstallButton in the navbar.

## Troubleshooting

### Prompt Not Showing

1. Check if app is already installed
2. Check if user dismissed recently (check localStorage)
3. Verify manifest.json is valid
4. Ensure HTTPS (or localhost)
5. Check browser support

### iOS Instructions Not Showing

1. Verify user agent detection
2. Check if `isIOS` is true in hook
3. Ensure iOS Safari (not Chrome on iOS)

### Install Button Not Appearing

1. Check if `isInstallable` is true
2. Verify `beforeinstallprompt` event fired
3. Check browser console for errors
4. Ensure service worker is registered

## Best Practices

1. **Don't Show Immediately**: Wait 3-5 seconds before showing prompt
2. **Respect Dismissal**: Don't show again for at least 7 days
3. **Provide Value**: Explain benefits of installation
4. **Multiple Entry Points**: Offer install button in navbar and settings
5. **Track Analytics**: Monitor install rates and user behavior
6. **Test on Real Devices**: Emulators don't always match real behavior

## Future Enhancements

- [ ] A/B test different prompt variants
- [ ] Customize prompt based on user engagement
- [ ] Add install prompt to specific pages (e.g., after first game)
- [ ] Show benefits based on user activity
- [ ] Add install prompt to onboarding flow
- [ ] Implement smart timing based on user behavior

## Related Documentation

- [PWA Configuration](./PWA_CONFIGURATION.md)
- [Service Worker](./SERVICE_WORKER.md)
- [Offline Functionality](./OFFLINE_FUNCTIONALITY.md)
- [Manifest Configuration](./TASK_46.1_PWA_MANIFEST.md)

## Requirements Validation

This implementation satisfies **Requirement 21.15**:

> THE ChessArena_Platform SHALL display install prompt for PWA on supported browsers

✅ Displays install prompt on Chrome, Edge, Samsung Internet
✅ Shows iOS-specific instructions on Safari
✅ Handles install acceptance via `beforeinstallprompt`
✅ Tracks installation status via `appinstalled` event
✅ Persists user dismissal preferences
✅ Provides multiple install entry points
✅ Respects user preferences and browser capabilities
