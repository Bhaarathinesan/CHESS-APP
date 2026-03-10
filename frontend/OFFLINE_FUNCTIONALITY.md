# Offline Functionality

This document describes the offline functionality implementation for the Chess Arena PWA.

**Requirements:** 21.12

## Overview

The offline functionality allows users to:
- View past games offline (game history, game replay)
- View profile information offline (user profile, statistics)
- See an offline indicator when network is unavailable
- Gracefully handle offline state throughout the app

## Components

### 1. Online Status Detection

**Hook: `useOnlineStatus`**
- Location: `frontend/hooks/useOnlineStatus.ts`
- Detects online/offline status using browser APIs
- Tracks when user was offline and reconnects
- Returns: `{ isOnline, isOffline, wasOffline }`

```typescript
import { useOnlineStatus } from '@/hooks/useOnlineStatus';

function MyComponent() {
  const { isOnline, isOffline, wasOffline } = useOnlineStatus();
  
  if (isOffline) {
    return <div>You are offline</div>;
  }
  
  return <div>Content</div>;
}
```

### 2. Offline Indicator

**Component: `OfflineIndicator`**
- Location: `frontend/components/pwa/OfflineIndicator.tsx`
- Shows banner at top of screen when offline
- Shows "Back online" message when reconnected
- Auto-hides after 3 seconds when back online
- Integrated into `MainLayout`

### 3. Offline Wrapper

**Component: `OfflineWrapper`**
- Location: `frontend/components/pwa/OfflineWrapper.tsx`
- Wraps content that may require online connection
- Shows offline message when offline and `requiresOnline={true}`
- Supports custom offline messages and fallbacks

```typescript
import { OfflineWrapper } from '@/components/pwa/OfflineWrapper';

function MyPage() {
  return (
    <OfflineWrapper
      requiresOnline={true}
      offlineMessage="This feature requires internet"
    >
      <OnlineOnlyContent />
    </OfflineWrapper>
  );
}
```

### 4. Offline Badge

**Component: `OfflineBadge`**
- Location: `frontend/components/pwa/OfflineBadge.tsx`
- Shows "Cached" badge to indicate data is from offline cache
- Use when displaying cached data

```typescript
import { OfflineBadge } from '@/components/pwa/OfflineBadge';

function GameCard({ isFromCache }) {
  return (
    <div>
      {isFromCache && <OfflineBadge />}
      <GameContent />
    </div>
  );
}
```

## Service Worker Caching

### Cached API Endpoints

The service worker caches the following API endpoints for offline access:

- `/api/games/:id` - Individual game details
- `/api/games?*` - Game history with filters
- `/api/users/:id` - User profiles
- `/api/users/me` - Current user profile
- `/api/users/:id/stats` - User statistics

### Caching Strategy

**Network-first with offline cache:**
1. Try to fetch from network
2. If successful, cache the response
3. If network fails, serve from cache
4. Add `X-Offline-Cache: true` header to cached responses

### Cache Management

Three cache stores:
- `chessarena-v1` - Static assets (JS, CSS, images)
- `chessarena-runtime-v1` - HTML pages
- `chessarena-offline-data-v1` - API responses for offline access

## Utilities

### Offline Utilities

**Location:** `frontend/lib/offline-utils.ts`

#### `isOfflineResponse(response: Response): boolean`
Check if a response is from offline cache.

```typescript
const response = await fetch('/api/games/1');
if (isOfflineResponse(response)) {
  console.log('This is cached data');
}
```

#### `isOnline(): boolean`
Check if browser is currently online.

#### `waitForOnline(timeout?: number): Promise<boolean>`
Wait for online connection (with optional timeout).

```typescript
const isOnline = await waitForOnline(5000);
if (isOnline) {
  // Retry failed request
}
```

#### `prefetchForOffline(urls: string[]): Promise<void>`
Prefetch URLs and cache them for offline access.

```typescript
// Prefetch user's recent games
await prefetchForOffline([
  '/api/games/1',
  '/api/games/2',
  '/api/users/me',
]);
```

#### `clearOfflineCache(): Promise<void>`
Clear all offline data caches.

#### `getOfflineCacheSize(): Promise<number>`
Get total size of offline cache in bytes.

#### `isAvailableOffline(url: string): Promise<boolean>`
Check if specific URL is available offline.

## Usage Examples

### Example 1: Game History Page

```typescript
'use client';

import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { OfflineBadge } from '@/components/pwa/OfflineBadge';
import { isOfflineResponse } from '@/lib/offline-utils';

export default function GameHistoryPage() {
  const { isOffline } = useOnlineStatus();
  const [games, setGames] = useState([]);
  const [isFromCache, setIsFromCache] = useState(false);

  useEffect(() => {
    async function loadGames() {
      const response = await fetch('/api/games');
      setIsFromCache(isOfflineResponse(response));
      const data = await response.json();
      setGames(data);
    }
    loadGames();
  }, []);

  return (
    <div>
      <h1>Game History</h1>
      {isFromCache && <OfflineBadge />}
      {isOffline && (
        <p>You are viewing cached games. Connect to see latest games.</p>
      )}
      <GameList games={games} />
    </div>
  );
}
```

### Example 2: Profile Page

```typescript
'use client';

import { OfflineWrapper } from '@/components/pwa/OfflineWrapper';
import { prefetchForOffline } from '@/lib/offline-utils';

export default function ProfilePage({ userId }) {
  useEffect(() => {
    // Prefetch profile data for offline access
    prefetchForOffline([
      `/api/users/${userId}`,
      `/api/users/${userId}/stats`,
      `/api/games?userId=${userId}`,
    ]);
  }, [userId]);

  return (
    <div>
      <ProfileHeader userId={userId} />
      <ProfileStats userId={userId} />
      
      {/* This section requires online connection */}
      <OfflineWrapper
        requiresOnline={true}
        offlineMessage="Connect to edit your profile"
      >
        <ProfileEditForm userId={userId} />
      </OfflineWrapper>
    </div>
  );
}
```

### Example 3: Handling Offline Errors

```typescript
async function saveGame(gameData) {
  if (!isOnline()) {
    toast.error('Cannot save game while offline');
    return;
  }

  try {
    const response = await fetch('/api/games', {
      method: 'POST',
      body: JSON.stringify(gameData),
    });
    
    if (!response.ok) {
      throw new Error('Failed to save game');
    }
    
    toast.success('Game saved');
  } catch (error) {
    if (!isOnline()) {
      toast.error('Lost connection. Please try again when online.');
    } else {
      toast.error('Failed to save game');
    }
  }
}
```

## Testing

All components and utilities have comprehensive unit tests:

- `frontend/hooks/__tests__/useOnlineStatus.test.ts`
- `frontend/components/pwa/__tests__/OfflineIndicator.test.tsx`
- `frontend/components/pwa/__tests__/OfflineWrapper.test.tsx`
- `frontend/components/pwa/__tests__/OfflineBadge.test.tsx`
- `frontend/lib/__tests__/offline-utils.test.ts`

Run tests:
```bash
cd frontend
npm test -- --testPathPattern="offline|Online"
```

## Browser Support

Offline functionality requires:
- Service Worker API
- Cache API
- Online/Offline events

Supported browsers:
- Chrome 40+
- Firefox 44+
- Safari 11.1+
- Edge 17+

## Best Practices

1. **Always show offline indicator** - Users should know when they're offline
2. **Mark cached data** - Use `OfflineBadge` to indicate cached content
3. **Disable write operations** - Don't allow creating/updating data while offline
4. **Prefetch important data** - Cache user's recent games and profile on page load
5. **Handle errors gracefully** - Check online status before network requests
6. **Clear old caches** - Service worker automatically clears old cache versions

## Limitations

- Cannot create new games offline
- Cannot send messages offline
- Cannot update profile offline
- Cannot join tournaments offline
- Live games require online connection
- Matchmaking requires online connection

## Future Enhancements

- Offline queue for write operations
- Background sync for pending actions
- Selective cache management (user can choose what to cache)
- Cache size limits and automatic cleanup
- Offline game analysis (with cached Stockfish)
