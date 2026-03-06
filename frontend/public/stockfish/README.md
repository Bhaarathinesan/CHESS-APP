# Stockfish WASM Setup

This directory should contain the Stockfish WebAssembly files for client-side chess analysis.

## Required Files

You need to download and place the following files in this directory:

1. **stockfish.js** - The main Stockfish worker script
2. **stockfish.wasm** - The WebAssembly binary
3. **stockfish.worker.js** (optional) - Additional worker file if needed

## Download Instructions

### Option 1: Official Stockfish.js (Recommended)

1. Visit: https://github.com/nmrugg/stockfish.js
2. Download the latest release
3. Extract `stockfish.js` and `stockfish.wasm` to this directory

### Option 2: NPM Package

```bash
npm install stockfish.js
# or
yarn add stockfish.js
```

Then copy the files from `node_modules/stockfish.js/` to this directory.

### Option 3: CDN (Development Only)

For development, you can use a CDN version, but for production, it's recommended to host the files locally.

## File Structure

After setup, this directory should look like:

```
frontend/public/stockfish/
├── README.md (this file)
├── stockfish.js
└── stockfish.wasm
```

## Verification

To verify the setup:

1. Start the development server: `npm run dev`
2. Open browser console
3. Check for any errors related to Stockfish loading
4. The Stockfish worker should initialize without errors

## Usage

The Stockfish worker is accessed through the `StockfishWorker` class in `frontend/lib/stockfish-worker.ts`.

Example:
```typescript
import { getStockfishWorker } from '@/lib/stockfish-worker';

const stockfish = getStockfishWorker();
await stockfish.waitForReady();

const evaluation = await stockfish.evaluatePosition(
  'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
  20
);

console.log('Score:', evaluation.score);
console.log('Best move:', evaluation.bestMove);
```

## Performance Notes

- Stockfish WASM runs entirely in the browser
- Analysis depth affects computation time (depth 20 is a good balance)
- For production, consider limiting analysis depth based on device capabilities
- The worker runs in a separate thread to avoid blocking the UI

## Troubleshooting

### Worker fails to load
- Ensure files are in the correct directory
- Check browser console for CORS errors
- Verify file paths in the worker initialization

### Slow analysis
- Reduce analysis depth
- Check device CPU capabilities
- Consider implementing progressive analysis (start with low depth, increase gradually)

### Memory issues
- Terminate worker when not in use: `terminateStockfishWorker()`
- Avoid running multiple instances simultaneously
- Clear analysis callbacks after use

## License

Stockfish is free software licensed under the GNU General Public License v3.0.
See: https://github.com/official-stockfish/Stockfish/blob/master/Copying.txt
