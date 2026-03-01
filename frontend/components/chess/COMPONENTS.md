# Chess UI Components

This directory contains React components for the ChessArena chess interface.

## Components

### ChessBoard

A wrapper component for `react-chessboard` that provides move validation using `chess.js`.

**Props:**
- `position?: string` - FEN string for board position (default: 'start')
- `orientation?: 'white' | 'black'` - Board orientation (default: 'white')
- `onMove?: (move) => void` - Callback when a move is made
- `boardWidth?: number` - Width of the board in pixels
- `arePiecesDraggable?: boolean` - Enable/disable piece dragging (default: true)

**Requirements:** 22.16

### MoveList

Displays chess moves in Standard Algebraic Notation (SAN) with support for figurine notation, timestamps, and move history navigation.

**Props:**
- `moves: Move[]` - Array of moves to display
- `currentMoveIndex?: number` - Index of the currently selected move
- `onMoveClick?: (moveIndex: number) => void` - Callback when a move is clicked
- `showTimestamps?: boolean` - Show/hide move timestamps (default: false)
- `useFigurineNotation?: boolean` - Use figurine notation (♔♕♖♗♘♙) instead of letters (default: false)

**Move Interface:**
```typescript
interface Move {
  moveNumber: number;
  white?: {
    san: string;
    timestamp?: number; // milliseconds
  };
  black?: {
    san: string;
    timestamp?: number; // milliseconds
  };
}
```

**Features:**
- Two-column format (White | Black)
- Move numbers displayed on the left
- Click moves to navigate through game history
- Hover effects for better UX
- Highlights current move
- Optional timestamps in MM:SS format
- Optional figurine notation (♔♕♖♗♘♙)
- Scrollable list for long games
- Empty state when no moves

**Requirements:** 14.1, 14.2, 14.3, 14.4

**Example Usage:**
```tsx
import { MoveList } from '@/components/chess';

const moves = [
  {
    moveNumber: 1,
    white: { san: 'e4', timestamp: 5000 },
    black: { san: 'e5', timestamp: 4500 },
  },
  {
    moveNumber: 2,
    white: { san: 'Nf3', timestamp: 3000 },
    black: { san: 'Nc6', timestamp: 3500 },
  },
];

<MoveList
  moves={moves}
  currentMoveIndex={2}
  onMoveClick={(index) => console.log('Navigate to move:', index)}
  showTimestamps={true}
  useFigurineNotation={false}
/>
```

### CapturedPieces

Displays captured pieces for both players with material advantage calculation.

**Props:**
- `capturedByWhite: CapturedPiece[]` - Pieces captured by white (black pieces)
- `capturedByBlack: CapturedPiece[]` - Pieces captured by black (white pieces)

**CapturedPiece Interface:**
```typescript
type PieceType = 'p' | 'n' | 'b' | 'r' | 'q' | 'k';
type PieceColor = 'w' | 'b';

interface CapturedPiece {
  type: PieceType;
  color: PieceColor;
}
```

**Features:**
- Displays captured pieces using Unicode chess symbols (♔♕♖♗♘♙)
- Calculates and displays material advantage (+3, -2, etc.)
- Sorts pieces by value (highest to lowest)
- Separate sections for white and black
- Material values: Pawn=1, Knight=3, Bishop=3, Rook=5, Queen=9
- Empty state when no pieces captured
- Color-coded advantage indicator (green)

**Requirements:** 14.6

**Example Usage:**
```tsx
import { CapturedPieces } from '@/components/chess';

const capturedByWhite = [
  { type: 'p', color: 'b' },
  { type: 'n', color: 'b' },
];

const capturedByBlack = [
  { type: 'p', color: 'w' },
];

<CapturedPieces
  capturedByWhite={capturedByWhite}
  capturedByBlack={capturedByBlack}
/>
```

## Styling

All components use Tailwind CSS with the following design tokens:
- `text-foreground` - Primary text color
- `text-foreground-secondary` - Secondary text color
- `bg-background-secondary` - Secondary background
- `bg-background-tertiary` - Tertiary background
- `bg-primary` - Primary accent color
- `text-primary-foreground` - Text on primary background
- `border-border` - Border color

Components are responsive and work on all screen sizes.

## Integration

These components are designed to work together on the Play page:

```tsx
import { ChessBoard, MoveList, CapturedPieces } from '@/components/chess';

<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
  <div className="lg:col-span-2">
    <ChessBoard />
  </div>
  <div className="space-y-6">
    <MoveList moves={moves} />
    <CapturedPieces 
      capturedByWhite={capturedByWhite}
      capturedByBlack={capturedByBlack}
    />
  </div>
</div>
```

## Future Enhancements

- Add move annotations (!, !!, ?, ??, !?, ?!)
- Add opening name display
- Add evaluation bar
- Add move comments
- Export moves to PGN
- Copy moves to clipboard
- Filter moves by player
- Search through moves
