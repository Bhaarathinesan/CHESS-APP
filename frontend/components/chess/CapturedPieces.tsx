'use client';

export type PieceType = 'p' | 'n' | 'b' | 'r' | 'q' | 'k';
export type PieceColor = 'w' | 'b';

export interface CapturedPiece {
  type: PieceType;
  color: PieceColor;
}

export interface CapturedPiecesProps {
  capturedByWhite: CapturedPiece[];
  capturedByBlack: CapturedPiece[];
}

/**
 * CapturedPieces component displays captured pieces for both players
 * Shows material advantage with piece symbols
 * 
 * Requirements: 14.6
 */
export default function CapturedPieces({
  capturedByWhite,
  capturedByBlack,
}: CapturedPiecesProps) {
  // Piece values for material calculation
  const pieceValues: Record<PieceType, number> = {
    p: 1,
    n: 3,
    b: 3,
    r: 5,
    q: 9,
    k: 0, // King has no material value
  };

  // Unicode symbols for chess pieces
  const pieceSymbols: Record<PieceColor, Record<PieceType, string>> = {
    w: {
      k: '♔',
      q: '♕',
      r: '♖',
      b: '♗',
      n: '♘',
      p: '♙',
    },
    b: {
      k: '♚',
      q: '♛',
      r: '♜',
      b: '♝',
      n: '♞',
      p: '♟',
    },
  };

  // Calculate material advantage
  const calculateMaterial = (pieces: CapturedPiece[]): number => {
    return pieces.reduce((total, piece) => total + pieceValues[piece.type], 0);
  };

  const whiteMaterial = calculateMaterial(capturedByWhite);
  const blackMaterial = calculateMaterial(capturedByBlack);
  const materialDifference = whiteMaterial - blackMaterial;

  // Sort pieces by value (highest to lowest)
  const sortPieces = (pieces: CapturedPiece[]): CapturedPiece[] => {
    return [...pieces].sort((a, b) => pieceValues[b.type] - pieceValues[a.type]);
  };

  // Render captured pieces
  const renderPieces = (pieces: CapturedPiece[]) => {
    const sorted = sortPieces(pieces);
    return sorted.map((piece, index) => (
      <span
        key={`${piece.type}-${index}`}
        className="text-2xl leading-none"
        title={`${piece.color === 'w' ? 'White' : 'Black'} ${piece.type.toUpperCase()}`}
      >
        {pieceSymbols[piece.color][piece.type]}
      </span>
    ));
  };

  return (
    <div className="captured-pieces w-full space-y-4">
      {/* Captured by White (Black pieces) */}
      <div className="flex items-center justify-between p-3 bg-background-secondary rounded-lg">
        <div className="flex items-center gap-1 flex-wrap">
          <span className="text-xs font-medium text-foreground-secondary mr-2">
            White:
          </span>
          {capturedByWhite.length > 0 ? (
            renderPieces(capturedByWhite)
          ) : (
            <span className="text-sm text-foreground-secondary">—</span>
          )}
        </div>
        {materialDifference > 0 && (
          <div className="text-sm font-semibold text-green-600 dark:text-green-400">
            +{materialDifference}
          </div>
        )}
      </div>

      {/* Captured by Black (White pieces) */}
      <div className="flex items-center justify-between p-3 bg-background-secondary rounded-lg">
        <div className="flex items-center gap-1 flex-wrap">
          <span className="text-xs font-medium text-foreground-secondary mr-2">
            Black:
          </span>
          {capturedByBlack.length > 0 ? (
            renderPieces(capturedByBlack)
          ) : (
            <span className="text-sm text-foreground-secondary">—</span>
          )}
        </div>
        {materialDifference < 0 && (
          <div className="text-sm font-semibold text-green-600 dark:text-green-400">
            +{Math.abs(materialDifference)}
          </div>
        )}
      </div>
    </div>
  );
}
