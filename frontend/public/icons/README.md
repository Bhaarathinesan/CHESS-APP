# ChessArena PWA Icons

This directory contains the app icons for the Progressive Web App (PWA) installation.

## Required Icons

The following icon sizes are required for optimal PWA support across all devices:

### Standard Icons (any purpose)
- `icon-72x72.png` - 72x72px
- `icon-96x96.png` - 96x96px
- `icon-128x128.png` - 128x128px
- `icon-144x144.png` - 144x144px
- `icon-152x152.png` - 152x152px
- `icon-192x192.png` - 192x192px (minimum required)
- `icon-384x384.png` - 384x384px
- `icon-512x512.png` - 512x512px (recommended)

### Maskable Icons (adaptive icons for Android)
- `icon-192x192-maskable.png` - 192x192px with safe zone
- `icon-512x512-maskable.png` - 512x512px with safe zone

### Shortcut Icons
- `shortcut-play.png` - 96x96px (Quick Play shortcut)
- `shortcut-tournament.png` - 96x96px (Tournaments shortcut)
- `shortcut-profile.png` - 96x96px (Profile shortcut)

## Design Guidelines

### Standard Icons
- Use the ChessArena logo/branding
- Ensure the icon is recognizable at small sizes
- Use a transparent or solid background
- Center the main icon element

### Maskable Icons
- Include a 10% safe zone around all edges
- The icon should work when cropped to a circle, rounded square, or squircle
- Use a solid background color (theme color: #3b82f6)
- Test with [Maskable.app](https://maskable.app/)

### Color Scheme
- Primary: #3b82f6 (blue)
- Background: #0f172a (dark slate)
- Accent: #60a5fa (light blue)

## Generating Icons

You can use tools like:
- [PWA Asset Generator](https://github.com/elegantapp/pwa-asset-generator)
- [RealFaviconGenerator](https://realfavicongenerator.net/)
- [Maskable.app Editor](https://maskable.app/editor)

Example command using pwa-asset-generator:
```bash
npx pwa-asset-generator logo.svg ./public/icons --manifest ./public/manifest.json
```

## Testing

Test your icons using:
- Chrome DevTools > Application > Manifest
- [Maskable.app](https://maskable.app/) for maskable icons
- Install the PWA on various devices to verify appearance
