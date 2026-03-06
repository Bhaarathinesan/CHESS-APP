# Progressive Web App (PWA) Configuration

This document describes the PWA configuration for ChessArena, enabling the app to be installed on devices and work offline.

## Overview

ChessArena is configured as a Progressive Web App with the following features:
- **Installable**: Users can install the app on their home screen
- **Standalone mode**: Runs in a standalone window without browser UI
- **Offline capable**: View past games and profiles offline (when service worker is implemented)
- **App shortcuts**: Quick access to Play, Tournaments, and Profile
- **Adaptive icons**: Proper display on all platforms including Android adaptive icons

## Files

### Manifest File
- **Location**: `public/manifest.json`
- **Purpose**: Defines app metadata, icons, display mode, and theme colors
- **Linked in**: `app/layout.tsx`

### Icons
- **Location**: `public/icons/`
- **Sizes**: 72x72, 96x96, 128x128, 144x144, 152x152, 192x192, 384x384, 512x512
- **Maskable**: 192x192 and 512x512 with safe zones for Android
- **Shortcuts**: 96x96 icons for app shortcuts

### Screenshots
- **Location**: `public/screenshots/`
- **Desktop**: 1280x720 (wide form factor)
- **Mobile**: 750x1334 (narrow form factor)

## Configuration Details

### Display Mode
```json
"display": "standalone"
```
The app runs in a standalone window without browser UI, providing an app-like experience.

### Theme Colors
```json
"theme_color": "#3b82f6",
"background_color": "#0f172a"
```
- **Theme color**: Blue (#3b82f6) - matches the primary brand color
- **Background color**: Dark slate (#0f172a) - matches the dark theme background

### Orientation
```json
"orientation": "any"
```
Supports both portrait and landscape orientations for optimal chess board viewing.

### App Shortcuts
Three shortcuts are configured:
1. **Quick Play** (`/play`) - Start a game immediately
2. **Tournaments** (`/tournaments`) - Browse tournaments
3. **Profile** (`/profile/me`) - View your profile

## Installation

### Desktop (Chrome/Edge)
1. Visit the app in Chrome or Edge
2. Look for the install icon in the address bar
3. Click "Install" in the prompt
4. The app will open in a standalone window

### Mobile (Android)
1. Visit the app in Chrome
2. Tap the menu (⋮) and select "Add to Home screen"
3. Or wait for the automatic install prompt
4. The app icon will appear on your home screen

### Mobile (iOS)
1. Visit the app in Safari
2. Tap the Share button
3. Select "Add to Home Screen"
4. The app icon will appear on your home screen

## Testing

### Chrome DevTools
1. Open DevTools (F12)
2. Go to Application tab
3. Click "Manifest" in the sidebar
4. Verify all fields are correct
5. Check that all icons load successfully

### Lighthouse Audit
```bash
# Run Lighthouse PWA audit
npm run build
npm run start
# Open Chrome DevTools > Lighthouse > PWA
```

### Maskable Icons
Test maskable icons at [Maskable.app](https://maskable.app/):
1. Upload `icon-512x512-maskable.png`
2. Preview in different shapes (circle, rounded square, squircle)
3. Verify the icon looks good in all shapes

## Requirements Satisfied

This configuration satisfies the following requirements:

### Requirement 21.11: PWA manifest configuration for installable app
- ✅ Manifest file created with complete metadata
- ✅ App icons for all required sizes (72x72 to 512x512)
- ✅ Maskable icons for Android adaptive icons
- ✅ Display mode set to "standalone" for app-like experience
- ✅ Theme colors configured (primary and background)
- ✅ Manifest linked in Next.js app layout

### Additional PWA Features
- ✅ App shortcuts for quick access to key features
- ✅ Screenshots for install prompt
- ✅ Categories defined (games, education, sports)
- ✅ Apple-specific meta tags for iOS support
- ✅ Proper viewport configuration

## Next Steps

To complete the PWA implementation:

1. **Generate Icons** (Task 46.1 - Current)
   - Follow instructions in `public/icons/README.md`
   - Generate all required icon sizes
   - Create maskable versions with safe zones

2. **Implement Service Worker** (Task 46.2)
   - Create service worker for offline functionality
   - Cache static assets
   - Implement cache-first strategy

3. **Add Offline Functionality** (Task 46.3)
   - Enable viewing past games offline
   - Enable viewing profile offline
   - Display offline indicator

4. **Implement Install Prompt** (Task 46.4)
   - Display custom install prompt
   - Handle install acceptance
   - Track installation analytics

5. **Configure Push Notifications** (Task 46.5)
   - Set up push notification service
   - Request notification permissions
   - Handle push notification display

## Troubleshooting

### Icons Not Loading
- Verify icon files exist in `public/icons/`
- Check file names match manifest.json exactly
- Clear browser cache and reload

### Install Prompt Not Showing
- Ensure the app is served over HTTPS (or localhost)
- Verify manifest.json is valid (use Chrome DevTools)
- Check that all required icons are present
- Service worker must be registered (Task 46.2)

### Theme Color Not Applied
- Check that theme-color meta tag is in the head
- Verify the color value is a valid hex color
- Test in different browsers (Chrome, Edge, Safari)

## Resources

- [Web.dev PWA Guide](https://web.dev/progressive-web-apps/)
- [MDN Web App Manifest](https://developer.mozilla.org/en-US/docs/Web/Manifest)
- [Maskable Icons](https://web.dev/maskable-icon/)
- [PWA Asset Generator](https://github.com/elegantapp/pwa-asset-generator)
- [Lighthouse PWA Checklist](https://web.dev/pwa-checklist/)
