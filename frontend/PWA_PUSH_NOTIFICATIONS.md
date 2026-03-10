# PWA Push Notifications

This document describes the PWA push notification implementation for ChessArena.

## Overview

The push notification system enables real-time notifications for PWA users, including game challenges, tournament updates, draw offers, and more. The implementation follows web standards and integrates seamlessly with the existing notification system.

**Requirements:** 21.13

## Architecture

### Components

1. **Service Worker** (`frontend/public/sw.js`)
   - Handles push events from the server
   - Displays notifications with custom actions
   - Manages notification clicks and navigation
   - Supports different notification types with customized UI

2. **Push Notification Hook** (`frontend/hooks/usePushNotifications.ts`)
   - Manages push notification subscription state
   - Handles permission requests
   - Provides subscribe/unsubscribe functionality
   - Detects PWA mode
   - Supports testing notifications

3. **UI Components**
   - `PushNotificationPrompt`: Auto-prompt for enabling notifications
   - `PushNotificationSettings`: Settings panel for managing notifications

4. **Backend Service** (`backend/src/notifications/push-notification.service.ts`)
   - Sends push notifications using Web Push protocol
   - Manages user subscriptions
   - Handles VAPID authentication
   - Provides key event notifications

## Features

### Notification Types

The system supports the following notification types with customized actions:

1. **Game Challenge**
   - Actions: Accept, Decline, View
   - Requires interaction
   - Enhanced vibration pattern

2. **Draw Offer**
   - Actions: Accept Draw, Decline
   - Requires interaction

3. **Tournament Start**
   - Actions: Join Now, Dismiss
   - Requires interaction
   - Enhanced vibration pattern

4. **Game End**
   - Actions: View Game, Rematch
   - Shows rating changes

5. **Achievement**
   - Actions: View Achievement
   - Special vibration pattern

6. **Tournament Pairing**
   - Actions: View Pairing
   - Requires interaction

7. **Friend Online**
   - Actions: Challenge, View Profile

### Notification Actions

Each notification type supports specific actions that users can take directly from the notification:

- **Accept/Decline**: Respond to challenges or draw offers
- **View**: Navigate to relevant pages
- **Rematch**: Request a rematch after game ends
- **Challenge**: Challenge a friend who comes online

### PWA Detection

The system automatically detects if the app is running as a PWA:

```typescript
const isPWA = window.matchMedia('(display-mode: standalone)').matches ||
              (window.navigator as any).standalone === true ||
              document.referrer.includes('android-app://');
```

## Usage

### Frontend Hook

```typescript
import { usePushNotifications } from '@/hooks/usePushNotifications';

function MyComponent() {
  const {
    isSupported,      // Browser supports push notifications
    permission,       // Current permission state
    isSubscribed,     // User is subscribed
    isLoading,        // Operation in progress
    isPWA,            // Running as PWA
    subscribe,        // Subscribe to notifications
    unsubscribe,      // Unsubscribe from notifications
    testNotification, // Test local notification
    testServerPush,   // Test server push
  } = usePushNotifications();

  return (
    <button onClick={subscribe} disabled={!isSupported || isLoading}>
      Enable Notifications
    </button>
  );
}
```

### Permission Prompt

The `PushNotificationPrompt` component automatically shows after 10 seconds if:
- Push notifications are supported
- User is not subscribed
- Permission is not granted or denied
- Prompt hasn't been dismissed
- Not shown in last 7 days

```typescript
import { PushNotificationPrompt } from '@/components/pwa/PushNotificationPrompt';

function App() {
  return (
    <>
      {/* Your app content */}
      <PushNotificationPrompt />
    </>
  );
}
```

### Settings Component

```typescript
import { PushNotificationSettings } from '@/components/pwa/PushNotificationSettings';

function SettingsPage() {
  return (
    <div>
      <h1>Notification Settings</h1>
      <PushNotificationSettings />
    </div>
  );
}
```

### Backend Service

```typescript
// Send push notification
await pushNotificationService.sendPushNotification(
  userId,
  'Game Challenge',
  'Alice has challenged you to a blitz game',
  {
    type: 'game_challenge',
    challengeId: 'challenge-123',
    challengerName: 'Alice',
    timeControl: 'blitz',
  }
);

// Send key event notification
await pushNotificationService.sendKeyEventPush(
  userId,
  'game_challenge',
  {
    challengerName: 'Alice',
    timeControl: 'blitz',
  }
);
```

## Service Worker Implementation

### Push Event Handler

The service worker listens for push events and displays notifications:

```javascript
self.addEventListener('push', (event) => {
  const data = event.data.json();
  const options = buildNotificationOptions(
    data.title,
    data.body,
    data.icon,
    data.badge,
    data.data,
    data.data.type
  );
  
  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});
```

### Notification Click Handler

Handles user interactions with notifications:

```javascript
self.addEventListener('notificationclick', (event) => {
  const action = event.action;
  const data = event.notification.data;
  
  event.notification.close();
  event.waitUntil(handleNotificationAction(action, data));
});
```

### Action Handling

Different actions trigger different behaviors:

- **API Calls**: Accept/decline challenges, draw offers
- **Navigation**: Open relevant pages
- **Focus**: Bring existing window to front
- **New Window**: Open new window if needed

## Configuration

### Environment Variables

Backend requires VAPID keys for Web Push:

```env
VAPID_PUBLIC_KEY=your-vapid-public-key
VAPID_PRIVATE_KEY=your-vapid-private-key
VAPID_SUBJECT=mailto:admin@chessarena.com
```

### Generating VAPID Keys

```bash
npx web-push generate-vapid-keys
```

## API Endpoints

### GET /api/notifications/push-config

Get VAPID public key for subscription.

**Response:**
```json
{
  "vapidPublicKey": "BN..."
}
```

### POST /api/notifications/push-subscribe

Subscribe to push notifications.

**Request:**
```json
{
  "subscription": {
    "endpoint": "https://...",
    "keys": {
      "p256dh": "...",
      "auth": "..."
    }
  }
}
```

### POST /api/notifications/push-unsubscribe

Unsubscribe from push notifications.

**Request:**
```json
{
  "endpoint": "https://..."
}
```

### POST /api/notifications/test-push

Send a test push notification.

**Response:**
```json
{
  "success": true
}
```

## Browser Support

Push notifications are supported in:
- Chrome 50+
- Firefox 44+
- Edge 17+
- Safari 16+ (macOS 13+, iOS 16.4+)
- Opera 37+

## Testing

### Unit Tests

```bash
# Frontend tests
cd frontend
npm test -- usePushNotifications.test.ts

# Backend tests
cd backend
npm test -- push-notification.service.spec.ts
```

### Manual Testing

1. **Enable Notifications**
   - Open app in supported browser
   - Click "Enable Notifications" in settings
   - Grant permission when prompted

2. **Test Local Notification**
   - Click "Test Local" button
   - Verify notification appears

3. **Test Server Push**
   - Click "Test Server Push" button
   - Verify notification appears with server data

4. **Test Actions**
   - Trigger a game challenge
   - Click "Accept" in notification
   - Verify action is processed

## Troubleshooting

### Notifications Not Appearing

1. Check browser support
2. Verify permission is granted
3. Check service worker is registered
4. Verify VAPID keys are configured
5. Check browser notification settings

### Subscription Fails

1. Verify VAPID public key is correct
2. Check service worker is active
3. Verify HTTPS connection (required for push)
4. Check browser console for errors

### Actions Not Working

1. Verify service worker is handling clicks
2. Check notification data includes required fields
3. Verify API endpoints are accessible
4. Check browser console for errors

## Best Practices

1. **Request Permission Contextually**: Ask for permission when user performs related action
2. **Provide Value**: Explain benefits before requesting permission
3. **Respect User Choice**: Don't repeatedly ask if denied
4. **Test Thoroughly**: Test on multiple browsers and devices
5. **Handle Errors Gracefully**: Provide fallbacks when push fails
6. **Keep Notifications Relevant**: Only send important updates
7. **Support Unsubscribe**: Make it easy to disable notifications

## Security

1. **VAPID Authentication**: Ensures notifications come from your server
2. **HTTPS Required**: Push API only works over secure connections
3. **User Consent**: Requires explicit user permission
4. **Subscription Validation**: Server validates subscriptions before sending
5. **Data Privacy**: Notification data is encrypted in transit

## Performance

1. **Lazy Loading**: Service worker loads on demand
2. **Efficient Caching**: Minimizes network requests
3. **Background Sync**: Handles offline scenarios
4. **Optimized Payload**: Keeps notification data small
5. **Batch Operations**: Groups multiple subscriptions

## Future Enhancements

1. **Rich Notifications**: Add images and media
2. **Notification Grouping**: Group related notifications
3. **Custom Sounds**: Per-notification-type sounds
4. **Notification History**: View past notifications
5. **Advanced Filtering**: User-defined notification rules
6. **Analytics**: Track notification engagement
7. **A/B Testing**: Optimize notification content

## References

- [Web Push Protocol](https://datatracker.ietf.org/doc/html/rfc8030)
- [Push API](https://developer.mozilla.org/en-US/docs/Web/API/Push_API)
- [Notifications API](https://developer.mozilla.org/en-US/docs/Web/API/Notifications_API)
- [Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [VAPID](https://datatracker.ietf.org/doc/html/rfc8292)
