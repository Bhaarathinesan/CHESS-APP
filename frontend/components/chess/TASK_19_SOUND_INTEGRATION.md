# Task 19: Sound Effects Integration Guide

This document explains how to integrate sound effects with existing chess components.

## Overview

The sound system consists of:
- **AudioService**: Core service managing sound playback
- **useSoundPreferences**: Hook for managing sound preferences
- **useChessSound**: Hook for chess-specific sound integration
- **SoundSettings**: UI component for sound controls

## Integration Examples

### 1. ChessBoard Component Integration

Add sound effects to the ChessBoard component by using the `useChessSound` hook:

```typescript
import { useChessSound } from '@/hooks/useChessSound';

export default function ChessBoard({ ... }: ChessBoardProps) {
  const [game, setGame] = useState<Chess>(new Chess());
  const { playMoveSound, playGameStart, playGameEnd } = useChessSound({
    game,
    isGameActive: !gameOver,
  });

  // Play sound when game starts
  useEffect(() => {
    playGameStart();
  }, []);

  // Play sound when move is made
  const makeMove = useCallback(
    (from: Square, to: Square, promotion?: string) => {
      const move = game.move({ from, to, promotion });
      if (move) {
        playMoveSound(move); // Automatically detects move type and plays appropriate sound
        // ... rest of move logic
      }
    },
    [game, playMoveSound]
  );

  // Play sound when game ends
  useEffect(() => {
    if (gameOver) {
      playGameEnd();
    }
  }, [gameOver, playGameEnd]);
}
```

### 2. ChessClock Component Integration

Add low time warning sound to the ChessClock component:

```typescript
import { useChessSound } from '@/hooks/useChessSound';

export default function ChessClock({ timeRemaining, isActive, ... }: ChessClockProps) {
  const { playMoveSound } = useChessSound({
    game: new Chess(), // Dummy game object
    timeRemaining,
    isGameActive: isActive,
  });

  // The useChessSound hook automatically handles low time warning
  // when timeRemaining < 10000ms
}
```

### 3. GameChat Component Integration

Add chat message sound to the GameChat component:

```typescript
import { useSoundPreferences } from '@/hooks/useSoundPreferences';

export default function GameChat({ ... }: GameChatProps) {
  const { playSound } = useSoundPreferences();

  useEffect(() => {
    if (!socket) return;

    socket.on('message_received', (message: ChatMessage) => {
      // Only play sound for messages from other users
      if (message.sender.id !== currentUserId) {
        playSound('chatMessage');
      }
      setMessages((prev) => [...prev, message]);
    });
  }, [socket, currentUserId, playSound]);
}
```

### 4. Notification System Integration

Add notification sounds to the notification system:

```typescript
import { useSoundPreferences } from '@/hooks/useSoundPreferences';

export function NotificationsList() {
  const { playSound } = useSoundPreferences();

  useEffect(() => {
    // Listen for new notifications
    socket.on('notification', (notification) => {
      playSound('notification');
      // ... handle notification
    });
  }, [socket, playSound]);
}
```

### 5. Challenge System Integration

Add challenge sound when receiving game challenges:

```typescript
import { useSoundPreferences } from '@/hooks/useSoundPreferences';

export function ChallengeNotification() {
  const { playSound } = useSoundPreferences();

  useEffect(() => {
    socket.on('challenge_received', (challenge) => {
      playSound('challenge');
      // ... handle challenge
    });
  }, [socket, playSound]);
}
```

### 6. Settings Page Integration

Add the SoundSettings component to the user settings page:

```typescript
import { SoundSettings } from '@/components/ui/SoundSettings';

export default function SettingsPage() {
  return (
    <div className="settings-page">
      <h1>Settings</h1>
      
      {/* Other settings tabs */}
      
      <section>
        <h2>Sound Settings</h2>
        <SoundSettings />
      </section>
    </div>
  );
}
```

## Sound Effect Types

The system supports the following sound effects:

| Type | Description | Requirement |
|------|-------------|-------------|
| `move` | Standard piece move | 23.1 |
| `capture` | Piece capture | 23.2 |
| `check` | King in check | 23.3 |
| `checkmate` | Checkmate | 23.4 |
| `castling` | Castling move | 23.5 |
| `gameStart` | Game beginning | 23.6 |
| `gameEnd` | Game completion | 23.7 |
| `lowTime` | Clock < 10 seconds | 23.8 |
| `notification` | General notification | 23.9 |
| `challenge` | Game challenge | 23.10 |
| `chatMessage` | Chat message | 23.11 |

## User Preferences

Sound preferences are automatically persisted to localStorage and include:

- **enabled**: Master mute toggle (Requirement 23.13)
- **volume**: Master volume 0-100% (Requirement 23.12)
- **effects**: Individual sound effect toggles (Requirement 23.14)

Preferences persist across sessions (Requirement 23.15).

## Audio Context Resumption

Modern browsers require user interaction before playing audio. The `useChessSound` hook automatically calls `resumeAudio()` on the first move to ensure sounds work properly.

## Testing

Tests are provided for:
- `useSoundPreferences` hook
- `SoundSettings` component
- Sound preference persistence
- Volume control
- Individual effect toggles

## Sound Files

Sound files should be placed in `frontend/public/sounds/` directory. See `frontend/public/sounds/README.md` for specifications and sources.

## Implementation Checklist

- [x] AudioService created
- [x] useSoundPreferences hook created
- [x] useChessSound hook created
- [x] SoundSettings component created
- [x] Sound preference types defined
- [ ] Integrate with ChessBoard component
- [ ] Integrate with ChessClock component
- [ ] Integrate with GameChat component
- [ ] Integrate with notification system
- [ ] Integrate with challenge system
- [ ] Add SoundSettings to settings page
- [ ] Add actual sound files to public/sounds/
- [ ] Test all sound integrations
