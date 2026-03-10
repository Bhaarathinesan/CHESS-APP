// Service Worker for PWA and Push Notifications
// Requirements: 18.13, 21.14

const CACHE_VERSION = 'v1';
const CACHE_NAME = `chessarena-${CACHE_VERSION}`;
const RUNTIME_CACHE = `chessarena-runtime-${CACHE_VERSION}`;
const OFFLINE_DATA_CACHE = `chessarena-offline-data-${CACHE_VERSION}`;

// Static assets to cache on install
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
];

// API endpoints to cache for offline access
const OFFLINE_API_PATTERNS = [
  /\/api\/games\/\w+$/,           // Individual game details
  /\/api\/games\?.*$/,            // Game history
  /\/api\/users\/\w+$/,           // User profiles
  /\/api\/users\/me$/,            // Current user profile
  /\/api\/users\/\w+\/stats$/,   // User statistics
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => self.skipWaiting())
      .catch((error) => {
        console.error('Failed to cache static assets:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((cacheName) => {
              // Delete old versions of our caches
              return cacheName.startsWith('chessarena-') && 
                     cacheName !== CACHE_NAME && 
                     cacheName !== RUNTIME_CACHE &&
                     cacheName !== OFFLINE_DATA_CACHE;
            })
            .map((cacheName) => {
              console.log('Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            })
        );
      })
      .then(() => self.clients.claim())
  );
});

// Fetch event - implement caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip cross-origin requests
  if (url.origin !== self.location.origin) {
    return;
  }

  // Skip WebSocket connections
  if (request.headers.get('upgrade') === 'websocket') {
    return;
  }

  // Handle API requests for offline data
  if (url.pathname.startsWith('/api/')) {
    // Check if this is an offline-cacheable API endpoint
    if (isOfflineCacheableAPI(url.pathname)) {
      event.respondWith(networkFirstWithOfflineCache(request));
      return;
    }
    // Other API requests - network only
    return;
  }

  // Cache-first strategy for static assets
  if (isStaticAsset(url.pathname)) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // Network-first strategy for HTML pages
  if (request.mode === 'navigate' || request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(networkFirst(request));
    return;
  }

  // Default: network-first with cache fallback
  event.respondWith(networkFirst(request));
});

// Helper: Check if URL is a static asset
function isStaticAsset(pathname) {
  const staticExtensions = [
    '.js', '.css', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp',
    '.woff', '.woff2', '.ttf', '.eot', '.ico', '.json'
  ];
  
  return staticExtensions.some(ext => pathname.endsWith(ext)) ||
         pathname.startsWith('/icons/') ||
         pathname.startsWith('/_next/static/');
}

// Helper: Check if API endpoint should be cached for offline access
function isOfflineCacheableAPI(pathname) {
  return OFFLINE_API_PATTERNS.some(pattern => pattern.test(pathname));
}

// Strategy: Cache-first (for static assets)
async function cacheFirst(request) {
  try {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(request);
    
    if (cached) {
      console.log('Serving from cache:', request.url);
      return cached;
    }
    
    // Not in cache, fetch from network
    const response = await fetch(request);
    
    // Cache successful responses
    if (response.ok) {
      cache.put(request, response.clone());
    }
    
    return response;
  } catch (error) {
    console.error('Cache-first strategy failed:', error);
    
    // Try to return cached version as fallback
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(request);
    
    if (cached) {
      return cached;
    }
    
    // Return offline page or error
    return new Response('Offline', {
      status: 503,
      statusText: 'Service Unavailable',
      headers: new Headers({
        'Content-Type': 'text/plain'
      })
    });
  }
}

// Strategy: Network-first (for HTML pages and dynamic content)
async function networkFirst(request) {
  try {
    const response = await fetch(request);
    
    // Cache successful responses
    if (response.ok) {
      const cache = await caches.open(RUNTIME_CACHE);
      cache.put(request, response.clone());
    }
    
    return response;
  } catch (error) {
    console.log('Network failed, trying cache:', request.url);
    
    // Network failed, try cache
    const cache = await caches.open(RUNTIME_CACHE);
    const cached = await cache.match(request);
    
    if (cached) {
      return cached;
    }
    
    // Also try static cache
    const staticCache = await caches.open(CACHE_NAME);
    const staticCached = await staticCache.match(request);
    
    if (staticCached) {
      return staticCached;
    }
    
    // Return offline page or error
    return new Response('Offline - No cached version available', {
      status: 503,
      statusText: 'Service Unavailable',
      headers: new Headers({
        'Content-Type': 'text/plain'
      })
    });
  }
}

// Strategy: Network-first with offline data cache (for API endpoints)
async function networkFirstWithOfflineCache(request) {
  try {
    const response = await fetch(request);
    
    // Cache successful GET responses
    if (response.ok && request.method === 'GET') {
      const cache = await caches.open(OFFLINE_DATA_CACHE);
      cache.put(request, response.clone());
    }
    
    return response;
  } catch (error) {
    console.log('API request failed, trying offline cache:', request.url);
    
    // Network failed, try offline data cache
    const cache = await caches.open(OFFLINE_DATA_CACHE);
    const cached = await cache.match(request);
    
    if (cached) {
      // Add custom header to indicate this is cached data
      const clonedResponse = cached.clone();
      const body = await clonedResponse.text();
      
      return new Response(body, {
        status: 200,
        statusText: 'OK (Cached)',
        headers: {
          'Content-Type': 'application/json',
          'X-Offline-Cache': 'true',
        },
      });
    }
    
    // No cached version available
    return new Response(
      JSON.stringify({
        error: 'Offline',
        message: 'This content is not available offline',
      }),
      {
        status: 503,
        statusText: 'Service Unavailable',
        headers: new Headers({
          'Content-Type': 'application/json'
        })
      }
    );
  }
}

// Handle push notifications
// Requirements: 21.13 - PWA push notification support
self.addEventListener('push', (event) => {
  console.log('Push notification received:', event);

  if (!event.data) {
    console.log('Push event has no data');
    return;
  }

  try {
    const data = event.data.json();
    const { title, body, icon, badge, data: notificationData } = data;

    // Determine notification type and customize accordingly
    const notificationType = notificationData?.type || 'default';
    const options = buildNotificationOptions(title, body, icon, badge, notificationData, notificationType);

    event.waitUntil(
      self.registration.showNotification(title, options)
    );
  } catch (error) {
    console.error('Error handling push notification:', error);
  }
});

// Build notification options based on type
// Requirements: 21.13 - Support notification actions and customization
function buildNotificationOptions(title, body, icon, badge, data, type) {
  const baseOptions = {
    body,
    icon: icon || '/icons/icon-192x192.png',
    badge: badge || '/icons/badge-72x72.png',
    vibrate: [200, 100, 200],
    data: data || {},
    tag: type,
    renotify: false,
    requireInteraction: false,
  };

  // Customize based on notification type
  switch (type) {
    case 'game_challenge':
      return {
        ...baseOptions,
        actions: [
          { action: 'accept', title: 'Accept', icon: '/icons/accept.png' },
          { action: 'decline', title: 'Decline', icon: '/icons/decline.png' },
          { action: 'view', title: 'View', icon: '/icons/view.png' },
        ],
        requireInteraction: true,
        vibrate: [200, 100, 200, 100, 200],
      };

    case 'draw_offer':
      return {
        ...baseOptions,
        actions: [
          { action: 'accept', title: 'Accept Draw', icon: '/icons/accept.png' },
          { action: 'decline', title: 'Decline', icon: '/icons/decline.png' },
        ],
        requireInteraction: true,
      };

    case 'tournament_start':
      return {
        ...baseOptions,
        actions: [
          { action: 'open', title: 'Join Now', icon: '/icons/tournament.png' },
          { action: 'close', title: 'Dismiss', icon: '/icons/close.png' },
        ],
        requireInteraction: true,
        vibrate: [300, 100, 300],
      };

    case 'game_end':
      return {
        ...baseOptions,
        actions: [
          { action: 'view', title: 'View Game', icon: '/icons/view.png' },
          { action: 'rematch', title: 'Rematch', icon: '/icons/rematch.png' },
        ],
      };

    case 'achievement':
      return {
        ...baseOptions,
        actions: [
          { action: 'view', title: 'View Achievement', icon: '/icons/trophy.png' },
        ],
        vibrate: [100, 50, 100, 50, 100, 50, 200],
      };

    case 'tournament_pairing':
      return {
        ...baseOptions,
        actions: [
          { action: 'open', title: 'View Pairing', icon: '/icons/tournament.png' },
        ],
        requireInteraction: true,
      };

    case 'friend_online':
      return {
        ...baseOptions,
        actions: [
          { action: 'challenge', title: 'Challenge', icon: '/icons/challenge.png' },
          { action: 'view', title: 'View Profile', icon: '/icons/profile.png' },
        ],
      };

    default:
      return {
        ...baseOptions,
        actions: [
          { action: 'open', title: 'Open', icon: '/icons/open.png' },
          { action: 'close', title: 'Close', icon: '/icons/close.png' },
        ],
      };
  }
}

// Handle notification clicks
// Requirements: 21.13 - Handle notification clicks to navigate to relevant pages
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event);
  
  const notification = event.notification;
  const action = event.action;
  const data = notification.data || {};

  notification.close();

  // Handle different actions
  event.waitUntil(
    handleNotificationAction(action, data)
  );
});

// Handle notification actions
// Requirements: 21.13 - Support notification actions (click, close)
async function handleNotificationAction(action, data) {
  const type = data.type || 'default';
  let urlToOpen = '/dashboard';

  // Determine URL based on action and type
  if (action === 'close') {
    return; // Just close, no navigation
  }

  switch (type) {
    case 'game_challenge':
      if (action === 'accept' || action === 'decline') {
        urlToOpen = `/api/challenges/${data.challengeId}/${action}`;
        // Make API call to accept/decline
        try {
          await fetch(urlToOpen, { method: 'POST' });
        } catch (error) {
          console.error('Failed to handle challenge action:', error);
        }
        urlToOpen = '/dashboard';
      } else {
        urlToOpen = `/challenges/${data.challengeId}`;
      }
      break;

    case 'draw_offer':
      if (action === 'accept' || action === 'decline') {
        urlToOpen = `/api/games/${data.gameId}/draw/${action}`;
        try {
          await fetch(urlToOpen, { method: 'POST' });
        } catch (error) {
          console.error('Failed to handle draw offer:', error);
        }
        urlToOpen = `/games/${data.gameId}`;
      } else {
        urlToOpen = `/games/${data.gameId}`;
      }
      break;

    case 'tournament_start':
    case 'tournament_pairing':
      urlToOpen = `/tournaments/${data.tournamentId}`;
      break;

    case 'game_end':
      if (action === 'rematch') {
        urlToOpen = `/api/games/${data.gameId}/rematch`;
        try {
          await fetch(urlToOpen, { method: 'POST' });
        } catch (error) {
          console.error('Failed to request rematch:', error);
        }
        urlToOpen = '/dashboard';
      } else {
        urlToOpen = `/history/${data.gameId}`;
      }
      break;

    case 'achievement':
      urlToOpen = '/achievements';
      break;

    case 'friend_online':
      if (action === 'challenge') {
        urlToOpen = `/profile/${data.userId}?action=challenge`;
      } else {
        urlToOpen = `/profile/${data.userId}`;
      }
      break;

    default:
      urlToOpen = data.linkUrl || '/dashboard';
  }

  // Open or focus the app
  const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  
  // Check if there's already a window open with the target URL
  for (const client of clients) {
    if (client.url.includes(urlToOpen) && 'focus' in client) {
      return client.focus();
    }
  }

  // Check if there's any window open
  if (clients.length > 0) {
    const client = clients[0];
    if ('focus' in client) {
      client.focus();
    }
    if ('navigate' in client) {
      return client.navigate(urlToOpen);
    }
  }

  // Open new window
  if (self.clients.openWindow) {
    return self.clients.openWindow(urlToOpen);
  }
}

// Handle notification close
// Requirements: 21.13 - Track notification dismissals
self.addEventListener('notificationclose', (event) => {
  console.log('Notification closed:', event);
  
  const data = event.notification.data || {};
  
  // Track notification dismissal (optional analytics)
  if (data.notificationId) {
    // Could send analytics event here
    console.log(`Notification ${data.notificationId} dismissed`);
  }
});
