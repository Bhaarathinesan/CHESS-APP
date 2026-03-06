# Icon Generation Instructions

## Quick Setup

Since actual icon files are not included in the repository, you need to generate them before deploying the PWA.

### Option 1: Use Existing Logo (Recommended)

If you have a logo file (SVG, PNG, or JPG):

```bash
# Install pwa-asset-generator
npm install -g pwa-asset-generator

# Generate all icons from your logo
npx pwa-asset-generator path/to/logo.svg ./public/icons \
  --background "#0f172a" \
  --manifest ./public/manifest.json \
  --index ./app/layout.tsx
```

### Option 2: Create Simple Placeholder Icons

For development/testing, create simple placeholder icons:

```bash
# Install ImageMagick (if not already installed)
# macOS: brew install imagemagick
# Ubuntu: sudo apt-get install imagemagick
# Windows: Download from https://imagemagick.org/

# Create a simple chess-themed icon
convert -size 512x512 xc:"#3b82f6" \
  -gravity center \
  -pointsize 300 \
  -fill white \
  -annotate +0+0 "♔" \
  icon-512x512.png

# Resize for other sizes
for size in 72 96 128 144 152 192 384; do
  convert icon-512x512.png -resize ${size}x${size} icon-${size}x${size}.png
done

# Create maskable versions (with padding)
convert -size 512x512 xc:"#3b82f6" \
  -gravity center \
  -pointsize 240 \
  -fill white \
  -annotate +0+0 "♔" \
  icon-512x512-maskable.png

convert icon-512x512-maskable.png -resize 192x192 icon-192x192-maskable.png

# Create shortcut icons
convert -size 96x96 xc:"#3b82f6" \
  -gravity center \
  -pointsize 60 \
  -fill white \
  -annotate +0+0 "▶" \
  shortcut-play.png

convert -size 96x96 xc:"#3b82f6" \
  -gravity center \
  -pointsize 60 \
  -fill white \
  -annotate +0+0 "🏆" \
  shortcut-tournament.png

convert -size 96x96 xc:"#3b82f6" \
  -gravity center \
  -pointsize 60 \
  -fill white \
  -annotate +0+0 "👤" \
  shortcut-profile.png
```

### Option 3: Use Online Tools

1. Go to [RealFaviconGenerator](https://realfavicongenerator.net/)
2. Upload your logo
3. Configure settings:
   - iOS: Use a solid background color (#3b82f6)
   - Android: Enable maskable icon with safe zone
   - Windows: Use theme color #3b82f6
4. Download the generated package
5. Extract icons to this directory

## Verification

After generating icons, verify them:

```bash
# Check all required icons exist
ls -la icon-*.png shortcut-*.png

# Verify icon sizes
file icon-*.png
```

## Testing

1. Start the development server: `npm run dev`
2. Open Chrome DevTools > Application > Manifest
3. Verify all icons are loaded correctly
4. Test maskable icons at [Maskable.app](https://maskable.app/)
