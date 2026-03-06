'use client';

import React, { useState } from 'react';
import { Button } from '../ui';
import { GameAnalysis } from '@/lib/analysis-service';
import { 
  getClassificationConfig,
  formatCentipawns,
  getAccuracyDescription 
} from '@/lib/move-classification';

interface AnalysisExportProps {
  analysis: GameAnalysis;
  gamePgn: string;
  whitePlayer: string;
  blackPlayer: string;
  result?: string;
  date?: string;
  className?: string;
}

export const AnalysisExport: React.FC<AnalysisExportProps> = ({ 
  analysis,
  gamePgn,
  whitePlayer,
  blackPlayer,
  result,
  date,
  className = '' 
}) => {
  const [isExporting, setIsExporting] = useState(false);

  const generatePDFContent = (): string => {
    const { moves, whiteAccuracy, blackAccuracy, openingName, keyMoments, summary } = analysis;

    // Generate HTML content for PDF
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Chess Game Analysis</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
      color: #333;
    }
    h1 {
      color: #1a1a1a;
      border-bottom: 3px solid #3b82f6;
      padding-bottom: 10px;
    }
    h2 {
      color: #2563eb;
      margin-top: 30px;
      border-bottom: 2px solid #ddd;
      padding-bottom: 5px;
    }
    .game-info {
      background: #f3f4f6;
      padding: 15px;
      border-radius: 8px;
      margin: 20px 0;
    }
    .accuracy-section {
      display: flex;
      justify-content: space-around;
      margin: 20px 0;
    }
    .accuracy-box {
      text-align: center;
      padding: 20px;
      background: #f9fafb;
      border-radius: 8px;
      flex: 1;
      margin: 0 10px;
    }
    .accuracy-value {
      font-size: 36px;
      font-weight: bold;
      color: #3b82f6;
    }
    .summary-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 20px;
      margin: 20px 0;
    }
    .summary-card {
      background: #f9fafb;
      padding: 15px;
      border-radius: 8px;
    }
    .stat-row {
      display: flex;
      justify-content: space-between;
      padding: 5px 0;
      border-bottom: 1px solid #e5e7eb;
    }
    .move-list {
      background: #f9fafb;
      padding: 15px;
      border-radius: 8px;
      margin: 20px 0;
    }
    .critical-move {
      background: #fff;
      border-left: 4px solid #ef4444;
      padding: 10px;
      margin: 10px 0;
      border-radius: 4px;
    }
    .badge {
      display: inline-block;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: bold;
    }
    .badge-blunder { background: #fee2e2; color: #991b1b; }
    .badge-mistake { background: #fed7aa; color: #9a3412; }
    .badge-inaccuracy { background: #fef3c7; color: #92400e; }
    .badge-brilliant { background: #cffafe; color: #164e63; }
    .pgn-section {
      background: #1f2937;
      color: #f3f4f6;
      padding: 15px;
      border-radius: 8px;
      font-family: 'Courier New', monospace;
      font-size: 12px;
      white-space: pre-wrap;
      word-wrap: break-word;
    }
    @media print {
      body { padding: 0; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <h1>Chess Game Analysis Report</h1>
  
  <div class="game-info">
    <p><strong>White:</strong> ${whitePlayer}</p>
    <p><strong>Black:</strong> ${blackPlayer}</p>
    ${result ? `<p><strong>Result:</strong> ${result}</p>` : ''}
    ${date ? `<p><strong>Date:</strong> ${date}</p>` : ''}
    ${openingName ? `<p><strong>Opening:</strong> ${openingName}</p>` : ''}
  </div>

  <h2>Accuracy Analysis</h2>
  <div class="accuracy-section">
    <div class="accuracy-box">
      <h3>White</h3>
      <div class="accuracy-value">${whiteAccuracy.toFixed(1)}%</div>
      <p>${getAccuracyDescription(whiteAccuracy)}</p>
    </div>
    <div class="accuracy-box">
      <h3>Black</h3>
      <div class="accuracy-value">${blackAccuracy.toFixed(1)}%</div>
      <p>${getAccuracyDescription(blackAccuracy)}</p>
    </div>
  </div>

  <h2>Performance Summary</h2>
  <div class="summary-grid">
    <div class="summary-card">
      <h3>White Statistics</h3>
      <div class="stat-row">
        <span>Brilliant Moves:</span>
        <strong>${summary.white.brilliant}</strong>
      </div>
      <div class="stat-row">
        <span>Great Moves:</span>
        <strong>${summary.white.great}</strong>
      </div>
      <div class="stat-row">
        <span>Good Moves:</span>
        <strong>${summary.white.good}</strong>
      </div>
      <div class="stat-row">
        <span>Inaccuracies:</span>
        <strong>${summary.white.inaccuracies}</strong>
      </div>
      <div class="stat-row">
        <span>Mistakes:</span>
        <strong>${summary.white.mistakes}</strong>
      </div>
      <div class="stat-row">
        <span>Blunders:</span>
        <strong>${summary.white.blunders}</strong>
      </div>
      <div class="stat-row">
        <span>Avg CP Loss:</span>
        <strong>${summary.white.averageCentipawnLoss}</strong>
      </div>
    </div>
    <div class="summary-card">
      <h3>Black Statistics</h3>
      <div class="stat-row">
        <span>Brilliant Moves:</span>
        <strong>${summary.black.brilliant}</strong>
      </div>
      <div class="stat-row">
        <span>Great Moves:</span>
        <strong>${summary.black.great}</strong>
      </div>
      <div class="stat-row">
        <span>Good Moves:</span>
        <strong>${summary.black.good}</strong>
      </div>
      <div class="stat-row">
        <span>Inaccuracies:</span>
        <strong>${summary.black.inaccuracies}</strong>
      </div>
      <div class="stat-row">
        <span>Mistakes:</span>
        <strong>${summary.black.mistakes}</strong>
      </div>
      <div class="stat-row">
        <span>Blunders:</span>
        <strong>${summary.black.blunders}</strong>
      </div>
      <div class="stat-row">
        <span>Avg CP Loss:</span>
        <strong>${summary.black.averageCentipawnLoss}</strong>
      </div>
    </div>
  </div>

  <h2>Key Moments</h2>
  <div class="move-list">
    ${keyMoments.length === 0 ? '<p>No critical moments identified.</p>' : keyMoments.map(moment => `
      <div class="critical-move">
        <strong>Move ${moment.moveNumber} (${moment.color === 'white' ? 'White' : 'Black'})</strong><br>
        ${moment.description}<br>
        <small>Evaluation change: ${formatCentipawns(moment.evaluationChange)}</small>
      </div>
    `).join('')}
  </div>

  <h2>Critical Mistakes</h2>
  <div class="move-list">
    ${moves.filter(m => m.classification === 'blunder' || m.classification === 'mistake').map(move => {
      const config = getClassificationConfig(move.classification);
      return `
        <div class="critical-move">
          <strong>Move ${move.moveNumber}. ${move.color === 'white' ? '♔' : '♚'} ${move.san}</strong>
          <span class="badge badge-${move.classification}">${config.label} ${config.icon}</span><br>
          Centipawn loss: -${move.centipawnLoss}<br>
          ${move.bestMove ? `Better move: <strong>${move.bestMove}</strong> (${formatCentipawns(move.bestMoveEvaluation || 0)})` : ''}
        </div>
      `;
    }).join('')}
  </div>

  <h2>Game Notation (PGN)</h2>
  <div class="pgn-section">${gamePgn}</div>

  <div style="margin-top: 40px; text-align: center; color: #6b7280; font-size: 12px;">
    <p>Generated by ChessArena Analysis Engine</p>
    <p>Powered by Stockfish</p>
  </div>
</body>
</html>
    `;
  };

  const handleExportPDF = async () => {
    setIsExporting(true);
    
    try {
      const htmlContent = generatePDFContent();
      
      // Create a blob with the HTML content
      const blob = new Blob([htmlContent], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      
      // Open in new window for printing
      const printWindow = window.open(url, '_blank');
      
      if (printWindow) {
        printWindow.onload = () => {
          // Wait a bit for content to render, then trigger print dialog
          setTimeout(() => {
            printWindow.print();
          }, 500);
        };
      }
      
      // Clean up
      setTimeout(() => {
        URL.revokeObjectURL(url);
      }, 1000);
    } catch (error) {
      console.error('Error exporting PDF:', error);
      alert('Failed to export analysis. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportHTML = () => {
    const htmlContent = generatePDFContent();
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `chess-analysis-${whitePlayer}-vs-${blackPlayer}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className={`flex gap-2 ${className}`}>
      <Button
        variant="primary"
        size="md"
        onClick={handleExportPDF}
        isLoading={isExporting}
        disabled={isExporting}
      >
        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
        Export as PDF
      </Button>
      <Button
        variant="outline"
        size="md"
        onClick={handleExportHTML}
      >
        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        Export as HTML
      </Button>
    </div>
  );
};
