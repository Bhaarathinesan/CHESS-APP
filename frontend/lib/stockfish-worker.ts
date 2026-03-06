/**
 * Stockfish Worker Wrapper
 * Provides a clean interface for communicating with Stockfish WASM engine
 */

export interface StockfishEvaluation {
  score: number; // Centipawn score (positive = white advantage)
  mate?: number; // Mate in N moves (positive = white mates, negative = black mates)
  depth: number;
  bestMove?: string;
  pv?: string[]; // Principal variation (best line)
}

export interface StockfishAnalysisOptions {
  depth?: number;
  multiPV?: number; // Number of variations to analyze
  timeLimit?: number; // Time limit in milliseconds
}

export type StockfishCallback = (evaluation: StockfishEvaluation) => void;

export class StockfishWorker {
  private worker: Worker | null = null;
  private isReady = false;
  private readyPromise: Promise<void>;
  private callbacks: Map<string, StockfishCallback> = new Map();
  private currentEvaluation: Partial<StockfishEvaluation> = {};

  constructor() {
    this.readyPromise = this.initialize();
  }

  private async initialize(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // Load Stockfish worker from public directory
        this.worker = new Worker('/stockfish/stockfish.js');

        this.worker.onmessage = (event) => {
          this.handleMessage(event.data);
        };

        this.worker.onerror = (error) => {
          console.error('Stockfish worker error:', error);
          reject(error);
        };

        // Send UCI command to initialize
        this.sendCommand('uci');

        // Wait for uciok response
        const checkReady = (data: string) => {
          if (data === 'uciok') {
            this.isReady = true;
            this.sendCommand('isready');
          } else if (data === 'readyok') {
            resolve();
          }
        };

        this.callbacks.set('init', checkReady as any);
      } catch (error) {
        reject(error);
      }
    });
  }

  private handleMessage(data: string): void {
    // Handle initialization callbacks
    if (this.callbacks.has('init')) {
      const callback = this.callbacks.get('init');
      if (callback) {
        callback({ score: 0, depth: 0 });
      }
    }

    // Parse evaluation info
    if (data.startsWith('info')) {
      this.parseInfoLine(data);
    }

    // Parse best move
    if (data.startsWith('bestmove')) {
      this.parseBestMove(data);
      this.notifyCallbacks();
    }
  }

  private parseInfoLine(line: string): void {
    const parts = line.split(' ');
    
    // Extract depth
    const depthIndex = parts.indexOf('depth');
    if (depthIndex !== -1 && parts[depthIndex + 1]) {
      this.currentEvaluation.depth = parseInt(parts[depthIndex + 1], 10);
    }

    // Extract score
    const scoreIndex = parts.indexOf('score');
    if (scoreIndex !== -1) {
      const scoreType = parts[scoreIndex + 1];
      const scoreValue = parts[scoreIndex + 2];

      if (scoreType === 'cp' && scoreValue) {
        // Centipawn score
        this.currentEvaluation.score = parseInt(scoreValue, 10);
        this.currentEvaluation.mate = undefined;
      } else if (scoreType === 'mate' && scoreValue) {
        // Mate in N moves
        this.currentEvaluation.mate = parseInt(scoreValue, 10);
        this.currentEvaluation.score = this.currentEvaluation.mate > 0 ? 10000 : -10000;
      }
    }

    // Extract principal variation
    const pvIndex = parts.indexOf('pv');
    if (pvIndex !== -1) {
      this.currentEvaluation.pv = parts.slice(pvIndex + 1);
      if (this.currentEvaluation.pv.length > 0) {
        this.currentEvaluation.bestMove = this.currentEvaluation.pv[0];
      }
    }

    // Notify callbacks with intermediate results
    if (this.currentEvaluation.depth && this.currentEvaluation.score !== undefined) {
      this.notifyCallbacks();
    }
  }

  private parseBestMove(line: string): void {
    const parts = line.split(' ');
    if (parts[1]) {
      this.currentEvaluation.bestMove = parts[1];
    }
  }

  private notifyCallbacks(): void {
    const evaluation: StockfishEvaluation = {
      score: this.currentEvaluation.score ?? 0,
      depth: this.currentEvaluation.depth ?? 0,
      bestMove: this.currentEvaluation.bestMove,
      pv: this.currentEvaluation.pv,
      mate: this.currentEvaluation.mate,
    };

    this.callbacks.forEach((callback, key) => {
      if (key !== 'init') {
        callback(evaluation);
      }
    });
  }

  private sendCommand(command: string): void {
    if (this.worker) {
      this.worker.postMessage(command);
    }
  }

  /**
   * Wait for Stockfish to be ready
   */
  async waitForReady(): Promise<void> {
    await this.readyPromise;
  }

  /**
   * Set a position using FEN notation
   */
  setPosition(fen: string): void {
    this.sendCommand(`position fen ${fen}`);
  }

  /**
   * Set a position from starting position with moves
   */
  setPositionWithMoves(moves: string[]): void {
    if (moves.length === 0) {
      this.sendCommand('position startpos');
    } else {
      this.sendCommand(`position startpos moves ${moves.join(' ')}`);
    }
  }

  /**
   * Start analysis with options
   */
  analyze(options: StockfishAnalysisOptions = {}): void {
    const { depth = 20, multiPV = 1, timeLimit } = options;

    // Set multi-PV option
    if (multiPV > 1) {
      this.sendCommand(`setoption name MultiPV value ${multiPV}`);
    }

    // Reset current evaluation
    this.currentEvaluation = {};

    // Start analysis
    if (timeLimit) {
      this.sendCommand(`go movetime ${timeLimit}`);
    } else {
      this.sendCommand(`go depth ${depth}`);
    }
  }

  /**
   * Stop current analysis
   */
  stop(): void {
    this.sendCommand('stop');
  }

  /**
   * Subscribe to evaluation updates
   */
  onEvaluation(id: string, callback: StockfishCallback): void {
    this.callbacks.set(id, callback);
  }

  /**
   * Unsubscribe from evaluation updates
   */
  offEvaluation(id: string): void {
    this.callbacks.delete(id);
  }

  /**
   * Get best move for current position
   */
  async getBestMove(fen: string, depth = 20): Promise<string | undefined> {
    await this.waitForReady();
    
    return new Promise((resolve) => {
      const callbackId = `bestmove-${Date.now()}`;
      
      this.onEvaluation(callbackId, (evaluation) => {
        if (evaluation.bestMove) {
          this.offEvaluation(callbackId);
          resolve(evaluation.bestMove);
        }
      });

      this.setPosition(fen);
      this.analyze({ depth });

      // Timeout after 10 seconds
      setTimeout(() => {
        this.offEvaluation(callbackId);
        resolve(undefined);
      }, 10000);
    });
  }

  /**
   * Evaluate a position
   */
  async evaluatePosition(fen: string, depth = 20): Promise<StockfishEvaluation> {
    await this.waitForReady();
    
    return new Promise((resolve) => {
      const callbackId = `eval-${Date.now()}`;
      let lastEvaluation: StockfishEvaluation | null = null;
      
      this.onEvaluation(callbackId, (evaluation) => {
        lastEvaluation = evaluation;
        
        // Resolve when we reach target depth or get a bestmove
        if (evaluation.depth >= depth || evaluation.bestMove) {
          this.offEvaluation(callbackId);
          resolve(evaluation);
        }
      });

      this.setPosition(fen);
      this.analyze({ depth });

      // Timeout after 10 seconds, return last evaluation
      setTimeout(() => {
        this.offEvaluation(callbackId);
        if (lastEvaluation) {
          resolve(lastEvaluation);
        } else {
          resolve({ score: 0, depth: 0 });
        }
      }, 10000);
    });
  }

  /**
   * Terminate the worker
   */
  terminate(): void {
    if (this.worker) {
      this.sendCommand('quit');
      this.worker.terminate();
      this.worker = null;
      this.isReady = false;
      this.callbacks.clear();
    }
  }
}

// Singleton instance
let stockfishInstance: StockfishWorker | null = null;

/**
 * Get or create Stockfish worker instance
 */
export function getStockfishWorker(): StockfishWorker {
  if (!stockfishInstance) {
    stockfishInstance = new StockfishWorker();
  }
  return stockfishInstance;
}

/**
 * Terminate Stockfish worker instance
 */
export function terminateStockfishWorker(): void {
  if (stockfishInstance) {
    stockfishInstance.terminate();
    stockfishInstance = null;
  }
}
