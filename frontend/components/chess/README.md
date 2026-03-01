# Chess Components

This directory contains chess-related UI components for the ChessArena platform.

## Components

### ChessBoard

A wrapper component around `react-chessboard` that provides:
- Move validation using chess.js
- Custom board styling with professional colors
- Piece drag-and-drop functionality
- Board orientation control (white/black)
- Move callback for game state management

#### Usage

```tsx
import { ChessBoard } from '@/components/chess';

function GamePage() {
  const handleMove = (move: { from: string; to: string; promotion?: string }) => {
    console.log('Move made:', move);
  };

  return (
    <ChessBoard
      orientation="white"
      onMove={handleMove}
      arePiecesDraggable={true}
    />
  );
}
```

#### Props

- `position?: string` - FEN string for board position (default: 'start')
- `orientation?: 'white' | 'black'` - Board orientation (default: 'white')
- `onMove?: (move) => void` - Callback when a valid move is made
- `boardWidth?: number` - Custom board width in pixels
- `arePiecesDraggable?: boolean` - Enable/disable piece dragging (default: true)

## Dependencies

- `react-chessboard` - Chess board UI component
- `chess.js` - Chess move validation and game logic
- `lucide-react` - Icon library for UI elements

## Board Themes

The default board uses professional chess colors:
- Light squares: #f0d9b5 (cream)
- Dark squares: #b58863 (brown)

These colors are commonly used in professional chess interfaces and provide good contrast.

## Future Enhancements

- [ ] Multiple board theme options
- [ ] Multiple piece set options
- [ ] Move highlighting
- [ ] Legal move indicators
- [ ] Promotion piece selection dialog
- [ ] Move sound effects
- [ ] Board flip animation
- [ ] Premove support
