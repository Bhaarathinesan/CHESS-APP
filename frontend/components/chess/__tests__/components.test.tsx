/**
 * Basic component tests for MoveList and CapturedPieces
 * These tests verify the components render without errors
 */

import MoveList from '../MoveList';
import CapturedPieces from '../CapturedPieces';
import type { Move, CapturedPiece } from '../index';

describe('MoveList Component', () => {
  it('should render with empty moves', () => {
    const moves: Move[] = [];
    // Component should render without errors
    expect(() => {
      MoveList({ moves });
    }).not.toThrow();
  });

  it('should render with sample moves', () => {
    const moves: Move[] = [
      {
        moveNumber: 1,
        white: { san: 'e4', timestamp: 5000 },
        black: { san: 'e5', timestamp: 4500 },
      },
    ];
    // Component should render without errors
    expect(() => {
      MoveList({ moves });
    }).not.toThrow();
  });
});

describe('CapturedPieces Component', () => {
  it('should render with no captured pieces', () => {
    const capturedByWhite: CapturedPiece[] = [];
    const capturedByBlack: CapturedPiece[] = [];
    // Component should render without errors
    expect(() => {
      CapturedPieces({ capturedByWhite, capturedByBlack });
    }).not.toThrow();
  });

  it('should render with captured pieces', () => {
    const capturedByWhite: CapturedPiece[] = [
      { type: 'p', color: 'b' },
      { type: 'n', color: 'b' },
    ];
    const capturedByBlack: CapturedPiece[] = [
      { type: 'p', color: 'w' },
    ];
    // Component should render without errors
    expect(() => {
      CapturedPieces({ capturedByWhite, capturedByBlack });
    }).not.toThrow();
  });
});
