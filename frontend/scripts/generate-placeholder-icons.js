#!/usr/bin/env node

/**
 * Generate placeholder PWA icons for development
 * 
 * This script creates simple SVG-based placeholder icons that can be used
 * during development. For production, replace these with proper branded icons.
 * 
 * Usage: node scripts/generate-placeholder-icons.js
 */

const fs = require('fs');
const path = require('path');

const ICONS_DIR = path.join(__dirname, '../public/icons');
const THEME_COLOR = '#3b82f6';
const SIZES = [72, 96, 128, 144, 152, 192, 384, 512];

// Ensure icons directory exists
if (!fs.existsSync(ICONS_DIR)) {
  fs.mkdirSync(ICONS_DIR, { recursive: true });
}

/**
 * Generate an SVG icon with a chess piece
 */
function generateSVG(size, isMaskable = false) {
  const padding = isMaskable ? size * 0.1 : 0;
  const iconSize = size - (padding * 2);
  const fontSize = iconSize * 0.6;
  
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${size}" height="${size}" fill="${THEME_COLOR}"/>
  <text 
    x="50%" 
    y="50%" 
    font-size="${fontSize}" 
    text-anchor="middle" 
    dominant-baseline="central" 
    fill="white" 
    font-family="Arial, sans-serif"
  >♔</text>
</svg>`;
}

/**
 * Generate a shortcut icon
 */
function generateShortcutSVG(size, emoji) {
  const fontSize = size * 0.6;
  
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${size}" height="${size}" fill="${THEME_COLOR}" rx="12"/>
  <text 
    x="50%" 
    y="50%" 
    font-size="${fontSize}" 
    text-anchor="middle" 
    dominant-baseline="central" 
    fill="white" 
    font-family="Arial, sans-serif"
  >${emoji}</text>
</svg>`;
}

/**
 * Save SVG to file
 */
function saveSVG(filename, content) {
  const filepath = path.join(ICONS_DIR, filename);
  fs.writeFileSync(filepath, content, 'utf8');
  console.log(`✓ Generated ${filename}`);
}

// Generate standard icons
console.log('\nGenerating standard icons...');
SIZES.forEach(size => {
  const svg = generateSVG(size);
  saveSVG(`icon-${size}x${size}.svg`, svg);
});

// Generate maskable icons
console.log('\nGenerating maskable icons...');
[192, 512].forEach(size => {
  const svg = generateSVG(size, true);
  saveSVG(`icon-${size}x${size}-maskable.svg`, svg);
});

// Generate shortcut icons
console.log('\nGenerating shortcut icons...');
saveSVG('shortcut-play.svg', generateShortcutSVG(96, '▶'));
saveSVG('shortcut-tournament.svg', generateShortcutSVG(96, '🏆'));
saveSVG('shortcut-profile.svg', generateShortcutSVG(96, '👤'));

console.log('\n✅ All placeholder icons generated successfully!');
console.log('\nNote: These are SVG placeholders for development.');
console.log('For production, generate PNG icons using:');
console.log('  npm install -g pwa-asset-generator');
console.log('  npx pwa-asset-generator logo.svg ./public/icons\n');
