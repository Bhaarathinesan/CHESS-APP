# Chess Analysis UI Components

This directory contains comprehensive UI components for post-game chess analysis, implementing Requirements 15.3, 15.4, 15.7, 15.8, 15.9, and 15.11.

## Components

### AnalysisPanel
Displays detailed analysis for the current move including:
- Evaluation bar showing position advantage
- Move classification (brilliant, great, good, inaccuracy, mistake, blunder)
- Centipawn loss
- Best move suggestions
- Position evaluation description

**Props:**
- `currentMove?: MoveAnalysis` - The move to analyze
- `className?: string` - Additional CSS classes

**Requirements:** 15.3, 15.7

### EvaluationBar
Visual representation of position evaluation with a horizontal bar showing white/black advantage.

**Props:**
- `evaluation: number` - Centipawn evaluation
- `mate?: number` - Mate in N moves
- `className?: string` - Additional CSS classes

### AccuracyChart
Line chart showing accuracy over time for both players.

**Props:**
- `moves: MoveAnalysis[]` - All game moves
- `whiteAccuracy: number` - White's overall accuracy percentage
- `blackAccuracy: number` - Black's overall accuracy percentage
- `className?: string` - Additional CSS classes

**Requirements:** 15.4

### WinProbabilityGraph
Interactive graph showing win probability throughout the game with key moments highlighted.

**Props:**
- `moves: MoveAnalysis[]` - All game moves
- `keyMoments: KeyMoment[]` - Critical moments in the game
- `onMoveClick?: (moveIndex: number) => void` - Callback when a move is clicked
- `currentMoveIndex?: number` - Currently selected move
- `className?: string` - Additional CSS classes

**Requirements:** 15.8

### MistakesBlundersList
Filterable list of mistakes and blunders with alternative better moves.

**Props:**
- `moves: MoveAnalysis[]` - All game moves
- `onMoveClick?: (moveIndex: number) => void` - Callback when a move is clicked
- `className?: string` - Additional CSS classes

**Features:**
- Filter by player (all/white/black)
- Shows alternative better moves
- Displays centipawn loss
- Click to jump to position

**Requirements:** 15.7

### AnalysisNavigation
Navigation controls for moving through the game with engine evaluation at each position.

**Props:**
- `moves: MoveAnalysis[]` - All game moves
- `currentMoveIndex: number` - Currently selected move index
- `onMoveChange: (index: number) => void` - Callback when move changes
- `className?: string` - Additional CSS classes

**Features:**
- First/Previous/Next/Last navigation buttons
- Keyboard shortcuts (Arrow keys, Home, End)
- Move list with evaluations
- Current move details with best move suggestion

**Requirements:** 15.9

### AnalysisExport
Export analysis reports as PDF or HTML.

**Props:**
- `analysis: GameAnalysis` - Complete game analysis
- `gamePgn: string` - Game in PGN format
- `whitePlayer: string` - White player name
- `blackPlayer: string` - Black player name
- `result?: string` - Game result
- `date?: string` - Game date
- `className?: string` - Additional CSS classes

**Features:**
- Export as PDF (opens print dialog)
- Export as HTML file
- Includes all key metrics and insights
- Professional formatting

**Requirements:** 15.11

### GameAnalysisView
Comprehensive view that integrates all analysis components.

**Props:**
- `pgn: string` - Game in PGN format
- `whitePlayer: string` - White player name
- `blackPlayer: string` - Black player name
- `result?: string` - Game result
- `date?: string` - Game date
- `className?: string` - Additional CSS classes

**Features:**
- Automatic game analysis on mount
- Interactive chess board showing current position
- All analysis components integrated
- Progress indicator during analysis
- Re-analyze functionality

## Usage Example

```tsx
import { GameAnalysisView } from '@/components/analysis';

function AnalysisPage() {
  const pgn = '[Event "Casual Game"]\n[Site "ChessArena"]\n...\n1. e4 e5 2. Nf3 Nc6...';
  
  return (
    <GameAnalysisView
      pgn={pgn}
      whitePlayer="Player1"
      blackPlayer="Player2"
      result="1-0"
      date="2024-01-15"
    />
  );
}
```

## Individual Component Usage

```tsx
import { 
  AnalysisPanel, 
  AccuracyChart, 
  WinProbabilityGraph,
  MistakesBlundersList,
  AnalysisNavigation 
} from '@/components/analysis';

function CustomAnalysisView({ analysis }) {
  const [currentMoveIndex, setCurrentMoveIndex] = useState(0);
  
  return (
    <div>
      <AnalysisPanel currentMove={analysis.moves[currentMoveIndex]} />
      <AccuracyChart 
        moves={analysis.moves}
        whiteAccuracy={analysis.whiteAccuracy}
        blackAccuracy={analysis.blackAccuracy}
      />
      <WinProbabilityGraph
        moves={analysis.moves}
        keyMoments={analysis.keyMoments}
        onMoveClick={setCurrentMoveIndex}
        currentMoveIndex={currentMoveIndex}
      />
      <MistakesBlundersList
        moves={analysis.moves}
        onMoveClick={setCurrentMoveIndex}
      />
      <AnalysisNavigation
        moves={analysis.moves}
        currentMoveIndex={currentMoveIndex}
        onMoveChange={setCurrentMoveIndex}
      />
    </div>
  );
}
```

## Dependencies

- `@/lib/analysis-service` - Analysis service with Stockfish integration
- `@/lib/move-classification` - Move classification utilities
- `chess.js` - Chess logic
- `react-chessboard` - Chess board component
- `@/components/ui` - UI component library

## Styling

All components use Tailwind CSS with dark mode support. They follow the existing design system and are fully responsive.

## Keyboard Shortcuts

**AnalysisNavigation:**
- `←` - Previous move
- `→` - Next move
- `Home` - First move
- `End` - Last move

## Performance

- Analysis runs client-side using Stockfish WASM
- Progress callbacks for long-running analysis
- Efficient re-rendering with React hooks
- Lazy loading of analysis service

## Testing

Components can be tested with mock analysis data:

```tsx
import { render } from '@testing-library/react';
import { AnalysisPanel } from './AnalysisPanel';

const mockMove = {
  moveNumber: 1,
  color: 'white',
  san: 'e4',
  uci: 'e2e4',
  fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1',
  evaluation: 25,
  classification: 'great',
  centipawnLoss: 5,
  bestMove: 'e2e4',
};

test('renders analysis panel', () => {
  render(<AnalysisPanel currentMove={mockMove} />);
  // assertions...
});
```

## Future Enhancements

- [ ] Add variation explorer
- [ ] Add position search
- [ ] Add comparison with database games
- [ ] Add training mode with hints
- [ ] Add annotation export to PGN
- [ ] Add sharing functionality
- [ ] Add mobile-optimized views
