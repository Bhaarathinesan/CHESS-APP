'use client';

interface MoveNavigatorProps {
  currentMoveIndex: number;
  totalMoves: number;
  onNavigate: (index: number) => void;
}

export default function MoveNavigator({
  currentMoveIndex,
  totalMoves,
  onNavigate,
}: MoveNavigatorProps) {
  const handleFirst = () => onNavigate(0);
  const handlePrevious = () => onNavigate(Math.max(0, currentMoveIndex - 1));
  const handleNext = () => onNavigate(Math.min(totalMoves, currentMoveIndex + 1));
  const handleLast = () => onNavigate(totalMoves);

  return (
    <div className="flex items-center justify-center space-x-2 bg-background-secondary border border-border rounded-lg p-4">
      {/* First Move Button */}
      <button
        onClick={handleFirst}
        disabled={currentMoveIndex === 0}
        className="p-2 bg-background border border-border rounded-lg text-foreground disabled:opacity-50 disabled:cursor-not-allowed hover:bg-background-secondary hover:border-primary transition-colors"
        title="First move"
      >
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M11 19l-7-7 7-7m8 14l-7-7 7-7"
          />
        </svg>
      </button>

      {/* Previous Move Button */}
      <button
        onClick={handlePrevious}
        disabled={currentMoveIndex === 0}
        className="p-2 bg-background border border-border rounded-lg text-foreground disabled:opacity-50 disabled:cursor-not-allowed hover:bg-background-secondary hover:border-primary transition-colors"
        title="Previous move"
      >
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 19l-7-7 7-7"
          />
        </svg>
      </button>

      {/* Move Counter */}
      <div className="px-4 py-2 bg-background border border-border rounded-lg text-foreground font-medium min-w-[120px] text-center">
        Move {currentMoveIndex} / {totalMoves}
      </div>

      {/* Next Move Button */}
      <button
        onClick={handleNext}
        disabled={currentMoveIndex === totalMoves}
        className="p-2 bg-background border border-border rounded-lg text-foreground disabled:opacity-50 disabled:cursor-not-allowed hover:bg-background-secondary hover:border-primary transition-colors"
        title="Next move"
      >
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 5l7 7-7 7"
          />
        </svg>
      </button>

      {/* Last Move Button */}
      <button
        onClick={handleLast}
        disabled={currentMoveIndex === totalMoves}
        className="p-2 bg-background border border-border rounded-lg text-foreground disabled:opacity-50 disabled:cursor-not-allowed hover:bg-background-secondary hover:border-primary transition-colors"
        title="Last move"
      >
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 5l7 7-7 7M5 5l7 7-7 7"
          />
        </svg>
      </button>
    </div>
  );
}
