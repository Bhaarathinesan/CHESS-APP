# Service Worker Implementation

This document describes the service worker implementation for ChessArena PWA, providing offline functionality and caching strategies.

## Overview

The service worker enables:
- **Offline functionality**: View cached pages and assets when offline
- **Cache-first strategy**: Fast loading of static assets from cache
- **Network-first strategy**: Fresh content for dynamic pages with cache fallback
- **Automatic cache management**: Version-based cache cleanup
- **Push notifications**: Support for browser push notifications

## Requirements Satisfied

✅ **Requirement 21.14**: Create service worker for offline functionality
- Service worker caches static assets (HTML, CSS, JS, images, fonts)
- Implements cache-first strategy for assets
- Handles service worker lifecycle (install, activate, fetch)
- Implements cache versioning and cleanup

## Architecture

### Cache Strategy

The service worker uses two caches:

1. **Static Cache** (`chessarena-v1`)
   - Contains critical static assets
   - Cached during service worker installation
   - Used for offline functionality

2. **Runtime Cache** (`chessarena-runtime-v1`)
   - Contains dynamically cached pages and assets
   - Populated as users navigate the app
   - Provides fallback for offline viewing

### Caching Strategies

#### Cache-First (Static Assets)
```
Request → Check Cache → Return Cached
                ↓ (if not cached)
            Fetch Network → Cache → Return
```

Used for:
- JavaScript files (`.js`)
- CSS files (`.css`)
- Images (`.png`, `.jpg`, `.svg`, `.webp`)
- Fonts (`.woff`, `.woff2`, `.ttf`)
- Icons (`/icons/*`)
- Next.js static files (`/_next/static/*`)

#### Network-First (Dynamic Content)
```
Request → Fetch Network → Cache → Return
                ↓ (if offline)
            Check Cache → Return Cached
```

Used for:
- HTML pages (navigation requests)
- Dynamic content
- API responses (not cached)

## Files

### Service Worker
- **Location**: `public/sw.js`
- **Purpose**: Main service worker file with caching logic
- **Scope**: `/` (entire application)

### Utilities
- **Location**: `lib/service-worker.ts`
- **Purpose**: Service worker registration and management utilities
- **Functions**:
  - `registerServiceWorker()` - Register the service worker
  - `unregisterServiceWorker()` - Unregister the service worker
  - `getServiceWorkerStatus()` - Get current status
  - `clearAllCaches()` - Clear all caches
  - `getCacheStorageUsage()` - Get storage usage information
  - `formatBytes()` - Format bytes to human-readable string

### React Hook
- **Location**: `hooks/useServiceWorker.ts`
- **Purpose**: React hook for service worker management
- **Features**:
  - Automatic registration on mount
  - Status monitoring
  - Cache usage tracking
  - Cache clearing
  - Service worker unregistration

### UI Component
- **Location**: `components/pwa/ServiceWorkerStatus.tsx`
- **Purpose**: Display service worker status and controls
- **Features**:
  - Status indicator (Active/Registered/Not Registered)
  - Cache usage display with progress bar
  - Refresh, Clear Cache, and Unregister buttons

## Service Worker Lifecycle

### 1. Install
```javascript
self.addEventListener('install', (event) => {
  // Cache static assets
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});
```

**What happens:**
- Service worker is downloaded and installed
- Static assets are cached
- `skipWaiting()` activates the new service worker immediately

### 2. Activate
```javascript
self.addEventListener('activate', (event) => {
  // Clean up old caches
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames
            .filter(name => name.startsWith('chessarena-') && name !== CACHE_NAME)
            .map(name => caches.delete(name))
        );
      })
      .then(() => self.clients.claim())
  );
});
```

**What happens:**
- Old cache versions are deleted
- `claim()` takes control of all pages immediately

### 3. Fetch
```javascript
self.addEventListener('fetch', (event) => {
  // Intercept network requests
  // Apply caching strategy based on request type
});
```

**What happens:**
- All network requests are intercepted
- Appropriate caching strategy is applied
- Responses are served from cache or network

## Usage

### Automatic Registration

The service worker is automatically registered when the app loads:

```typescript
import { registerServiceWorker } from '@/lib/service-worker';

// In your app initialization
registerServiceWorker();
```

### Using the Hook

```typescript
import { useServiceWorker } from '@/hooks/useServiceWorker';

function MyComponent() {
  const { status, cacheUsage, clearCaches } = useServiceWorker();

  return (
    <div>
      <p>Status: {status.isActive ? 'Active' : 'Inactive'}</p>
      <p>Cache: {cacheUsage?.usage} bytes</p>
      <button onClick={clearCaches}>Clear Cache</button>
    </div>
  );
}
```

### Using the Status Component

```typescript
import { ServiceWorkerStatus } from '@/components/pwa/ServiceWorkerStatus';

function SettingsPage() {
  return (
    <div>
      <h1>PWA Settings</h1>
      <ServiceWorkerStatus />
    </div>
  );
}
```

## Cache Management

### Cache Versioning

Caches are versioned using the `CACHE_VERSION` constant:

```javascript
const CACHE_VERSION = 'v1';
const CACHE_NAME = `chessarena-${CACHE_VERSION}`;
```

To update the cache:
1. Increment `CACHE_VERSION` (e.g., `'v2'`)
2. Deploy the new service worker
3. Old caches are automatically deleted on activation

### Cache Size Limits

Browser cache limits vary:
- **Chrome**: ~6% of free disk space
- **Firefox**: ~10% of free disk space
- **Safari**: ~50 MB

Monitor cache usage with `getCacheStorageUsage()`.

### Clearing Caches

Users can clear caches through:
1. **UI Component**: ServiceWorkerStatus component
2. **Programmatically**: `clearAllCaches()` function
3. **Browser DevTools**: Application > Storage > Clear site data

## Offline Functionality

### What Works Offline

✅ **Cached Pages**
- Previously visited pages
- Static assets (JS, CSS, images)
- App icons and manifest

✅ **Cached Data**
- Past games (if cached)
- User profile (if cached)
- Tournament information (if cached)

### What Doesn't Work Offline

❌ **Real-time Features**
- Live games
- WebSocket connections
- Real-time notifications

❌ **API Requests**
- New data fetching
- User authentication
- Game creation

### Offline Detection

The app can detect offline status:

```typescript
if (!navigator.onLine) {
  // Show offline indicator
}

window.addEventListener('online', () => {
  // User is back online
});

window.addEventListener('offline', () => {
  // User went offline
});
```

## Testing

### Manual Testing

1. **Install Service Worker**
   ```
   1. Open app in Chrome
   2. Open DevTools > Application > Service Workers
   3. Verify service worker is registered and active
   ```

2. **Test Offline Mode**
   ```
   1. Visit several pages while online
   2. Open DevTools > Network
   3. Check "Offline" checkbox
   4. Navigate to previously visited pages
   5. Verify pages load from cache
   ```

3. **Test Cache Updates**
   ```
   1. Make changes to the app
   2. Deploy new version
   3. Reload the page
   4. Verify update prompt appears
   5. Accept update and verify new version loads
   ```

### Automated Testing

Run the test suite:

```bash
# Run all service worker tests
npm test -- service-worker

# Run specific test file
npm test -- lib/__tests__/service-worker.test.ts
npm test -- hooks/__tests__/useServiceWorker.test.ts
```

### Chrome DevTools

**Application Tab:**
- Service Workers: View registration status
- Cache Storage: Inspect cached files
- Storage: View storage usage

**Network Tab:**
- Filter by "Service Worker"
- See which requests are served from cache

**Lighthouse:**
- Run PWA audit
- Check offline functionality
- Verify caching strategies

## Troubleshooting

### Service Worker Not Registering

**Symptoms:**
- No service worker in DevTools
- Offline mode doesn't work

**Solutions:**
1. Ensure app is served over HTTPS (or localhost)
2. Check browser console for errors
3. Verify `sw.js` file exists in `public/` directory
4. Clear browser cache and reload

### Stale Content

**Symptoms:**
- Old version of app still showing
- Changes not appearing

**Solutions:**
1. Increment `CACHE_VERSION` in `sw.js`
2. Unregister old service worker in DevTools
3. Clear cache storage
4. Hard reload (Ctrl+Shift+R)

### Cache Not Working

**Symptoms:**
- Assets not loading offline
- Cache storage empty

**Solutions:**
1. Check service worker is active
2. Verify fetch event is intercepting requests
3. Check cache names match
4. Inspect cache storage in DevTools

### Update Not Installing

**Symptoms:**
- New version available but not installing
- Update prompt not showing

**Solutions:**
1. Check `skipWaiting()` is called in install event
2. Verify update detection logic
3. Manually skip waiting in DevTools
4. Close all tabs and reopen

## Best Practices

### 1. Version Your Caches
Always use versioned cache names to ensure clean updates:
```javascript
const CACHE_VERSION = 'v1';
const CACHE_NAME = `chessarena-${CACHE_VERSION}`;
```

### 2. Clean Up Old Caches
Delete old caches in the activate event:
```javascript
caches.keys().then(names => {
  return Promise.all(
    names
      .filter(name => name.startsWith('chessarena-') && name !== CACHE_NAME)
      .map(name => caches.delete(name))
  );
});
```

### 3. Skip Waiting Carefully
Use `skipWaiting()` to activate new service workers immediately, but be aware it can cause issues if pages expect the old version.

### 4. Don't Cache API Requests
API requests should always be fresh. Skip caching for `/api/*` routes.

### 5. Handle Offline Gracefully
Provide meaningful offline pages and error messages instead of generic browser errors.

### 6. Monitor Cache Size
Regularly check cache usage and implement cleanup strategies if needed.

### 7. Test Thoroughly
Test offline functionality, cache updates, and edge cases before deploying.

## Browser Support

| Browser | Service Worker | Cache API | Push Notifications |
|---------|---------------|-----------|-------------------|
| Chrome | ✅ | ✅ | ✅ |
| Edge | ✅ | ✅ | ✅ |
| Firefox | ✅ | ✅ | ✅ |
| Safari | ✅ | ✅ | ❌ (iOS 16.4+) |
| Samsung Internet | ✅ | ✅ | ✅ |

## Security Considerations

### HTTPS Required
Service workers only work on HTTPS (or localhost for development).

### Same-Origin Policy
Service workers can only intercept requests from the same origin.

### Scope Limitations
Service workers can only control pages within their scope.

### Content Security Policy
Ensure CSP headers allow service worker registration.

## Performance

### Cache Hit Rate
Monitor cache hit rate to optimize caching strategies:
```javascript
// In service worker
let cacheHits = 0;
let cacheMisses = 0;

// Track in fetch handler
if (cached) {
  cacheHits++;
} else {
  cacheMisses++;
}
```

### Cache Size
Keep cache size reasonable:
- Static cache: < 10 MB
- Runtime cache: < 50 MB
- Total: < 100 MB

### Update Frequency
Balance between freshness and performance:
- Static assets: Cache-first (long-lived)
- Dynamic content: Network-first (fresh)
- API data: Network-only (always fresh)

## Future Enhancements

### Background Sync
Sync data when connection is restored:
```javascript
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-games') {
    event.waitUntil(syncGames());
  }
});
```

### Periodic Background Sync
Update cache periodically:
```javascript
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'update-cache') {
    event.waitUntil(updateCache());
  }
});
```

### Advanced Caching
- Implement stale-while-revalidate strategy
- Add cache expiration logic
- Implement cache size limits

## Resources

- [Service Worker API - MDN](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [Cache API - MDN](https://developer.mozilla.org/en-US/docs/Web/API/Cache)
- [Service Worker Cookbook](https://serviceworke.rs/)
- [Workbox - Google](https://developers.google.com/web/tools/workbox)
- [PWA Checklist](https://web.dev/pwa-checklist/)

