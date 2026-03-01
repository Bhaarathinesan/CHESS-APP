# Time Control Configuration Reference

## Quick Reference

### Predefined Time Controls

#### Bullet (≤3 minutes)
```typescript
1+0  // 1 minute, no increment
1+1  // 1 minute + 1 second
2+1  // 2 minutes + 1 second
```

#### Blitz (3-10 minutes)
```typescript
3+0  // 3 minutes, no increment
3+2  // 3 minutes + 2 seconds
5+0  // 5 minutes, no increment
5+3  // 5 minutes + 3 seconds
5+5  // 5 minutes + 5 seconds
```

#### Rapid (10-30 minutes)
```typescript
10+0   // 10 minutes, no increment
10+5   // 10 minutes + 5 seconds
15+10  // 15 minutes + 10 seconds
15+15  // 15 minutes + 15 seconds
20+0   // 20 minutes, no increment
```

#### Classical (>30 minutes)
```typescript
30+0   // 30 minutes, no increment
30+20  // 30 minutes + 20 seconds
45+45  // 45 minutes + 45 seconds
60+30  // 60 minutes + 30 seconds
90+30  // 90 minutes + 30 seconds
```

## Common Use Cases

### 1. Get a Predefined Time Control
```typescript
import { findTimeControlByConfig } from '@chess-arena/shared/utils/time-control.utils';

const blitz = findTimeControlByConfig(5, 3);
// Returns: TimeControlConfig for Blitz 5+3
```

### 2. Create Custom Time Control
```typescript
import { createCustomTimeControl } from '@chess-arena/shared/utils/time-control.utils';

const custom = createCustomTimeControl(7, 5, 'My Game');
// Creates: Custom 7+5 time control
```

### 3. Validate Time Control
```typescript
import { validateTimeControl } from '@chess-arena/shared/utils/time-control.utils';

const result = validateTimeControl(5, 3);
if (result.isValid) {
  // Time control is valid
} else {
  console.error(result.errors);
}
```

### 4. Get All Time Controls for a Category
```typescript
import { getTimeControlsByCategory } from '@chess-arena/shared/utils/time-control.utils';

const bulletControls = getTimeControlsByCategory('bullet');
// Returns: Array of all bullet time controls
```

### 5. Determine Category from Base Time
```typescript
import { getTimeControlCategory } from '@chess-arena/shared/utils/time-control.utils';

const category = getTimeControlCategory(5);
// Returns: 'blitz'
```

## Type Definitions

### TimeControlConfig
```typescript
interface TimeControlConfig {
  id: string;                    // Unique identifier
  name: string;                  // Display name
  category: TimeControlCategory; // bullet, blitz, rapid, classical, custom
  baseTimeMinutes: number;       // Base time in minutes
  incrementSeconds: number;      // Increment per move in seconds
  totalTimeMs: number;           // Total time in milliseconds
  isPredefined: boolean;         // Whether this is a predefined control
  displayFormat: string;         // Short format (e.g., "5+3")
}
```

### TimeControlCategory
```typescript
type TimeControlCategory = 'bullet' | 'blitz' | 'rapid' | 'classical' | 'custom';
```

## Validation Constraints

```typescript
const TIME_CONTROL_CONSTRAINTS = {
  MIN_BASE_TIME_MINUTES: 0.5,   // 30 seconds minimum
  MAX_BASE_TIME_MINUTES: 180,   // 3 hours maximum
  MIN_INCREMENT_SECONDS: 0,
  MAX_INCREMENT_SECONDS: 180,   // 3 minutes maximum
};
```

## Category Boundaries

```typescript
const TIME_CONTROL_BOUNDARIES = {
  BULLET_MAX: 3,    // ≤3 minutes = bullet
  BLITZ_MAX: 10,    // 3-10 minutes = blitz
  RAPID_MAX: 30,    // 10-30 minutes = rapid
                    // >30 minutes = classical
};
```

## Component Usage

### TimeControlSelector
```typescript
import TimeControlSelector from '@/components/chess/TimeControlSelector';

<TimeControlSelector
  value={selectedTimeControl}
  onChange={handleTimeControlChange}
  allowCustom={true}
/>
```

### ChessClock with Time Control
```typescript
import ChessClock from '@/components/chess/ChessClock';

<ChessClock
  timeRemaining={timeControl.totalTimeMs}
  timeControlDisplay={timeControl.displayFormat}
  isActive={true}
  playerName="Player 1"
/>
```

## Utility Functions Reference

| Function | Purpose | Example |
|----------|---------|---------|
| `getTimeControlCategory(minutes)` | Get category from base time | `getTimeControlCategory(5)` → `'blitz'` |
| `createCustomTimeControl(base, inc, name?)` | Create custom config | `createCustomTimeControl(7, 5)` |
| `validateTimeControl(base, inc)` | Validate settings | `validateTimeControl(5, 3)` |
| `findTimeControlById(id)` | Find by ID | `findTimeControlById('blitz-5+3')` |
| `findTimeControlByConfig(base, inc)` | Find by config | `findTimeControlByConfig(5, 3)` |
| `getTimeControlsByCategory(cat)` | Get all for category | `getTimeControlsByCategory('bullet')` |
| `formatTimeControl(config)` | Format for display | `formatTimeControl(config)` → `'5+3'` |
| `parseTimeControlFormat(str)` | Parse from string | `parseTimeControlFormat('5+3')` |
| `getOrCreateTimeControl(base, inc, name?)` | Get or create | `getOrCreateTimeControl(5, 3)` |
| `timeControlToMs(minutes)` | Convert to ms | `timeControlToMs(5)` → `300000` |
| `msToMinutes(ms)` | Convert to minutes | `msToMinutes(300000)` → `5` |
| `isPredefinedTimeControl(base, inc)` | Check if predefined | `isPredefinedTimeControl(5, 3)` → `true` |
| `getCategoryDisplayName(cat)` | Get display name | `getCategoryDisplayName('bullet')` → `'Bullet'` |
| `getCategoryDescription(cat)` | Get description | `getCategoryDescription('bullet')` |

## Constants

### All Predefined Time Controls
```typescript
import {
  BULLET_TIME_CONTROLS,
  BLITZ_TIME_CONTROLS,
  RAPID_TIME_CONTROLS,
  CLASSICAL_TIME_CONTROLS,
  ALL_TIME_CONTROLS,
} from '@chess-arena/shared/types/time-control.types';
```

## Best Practices

1. **Always validate custom time controls** before creating games
2. **Use predefined time controls** when possible for consistency
3. **Store time control ID** in database for predefined controls
4. **Store base time and increment** for custom controls
5. **Display format consistently** using `displayFormat` property
6. **Convert to milliseconds** for clock operations using `totalTimeMs`

## Examples

### Game Creation Flow
```typescript
// 1. User selects time control
const [timeControl, setTimeControl] = useState<TimeControlConfig>();

// 2. Validate if custom
if (!timeControl.isPredefined) {
  const validation = validateTimeControl(
    timeControl.baseTimeMinutes,
    timeControl.incrementSeconds
  );
  if (!validation.isValid) {
    showError(validation.errors[0]);
    return;
  }
}

// 3. Create game with time control
const game = await createGame({
  timeControl: timeControl.category,
  initialTimeMinutes: timeControl.baseTimeMinutes,
  incrementSeconds: timeControl.incrementSeconds,
});

// 4. Initialize clocks
setWhiteTime(timeControl.totalTimeMs);
setBlackTime(timeControl.totalTimeMs);
```

### Tournament Configuration
```typescript
// Tournament admin selects time control
<TimeControlSelector
  value={tournamentTimeControl}
  onChange={(tc) => {
    setTournamentTimeControl(tc);
    // Update tournament settings
    updateTournament({
      timeControl: tc.category,
      initialTimeMinutes: tc.baseTimeMinutes,
      incrementSeconds: tc.incrementSeconds,
    });
  }}
  allowCustom={true}
/>
```

### Display Time Control Info
```typescript
function TimeControlInfo({ config }: { config: TimeControlConfig }) {
  return (
    <div>
      <h3>{config.name}</h3>
      <p>Format: {config.displayFormat}</p>
      <p>Category: {getCategoryDisplayName(config.category)}</p>
      <p>Base Time: {config.baseTimeMinutes} minutes</p>
      <p>Increment: {config.incrementSeconds} seconds</p>
      <p>Type: {config.isPredefined ? 'Predefined' : 'Custom'}</p>
    </div>
  );
}
```
