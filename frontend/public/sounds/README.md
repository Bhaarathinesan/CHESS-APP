# Sound Effects for ChessArena

This directory contains sound effect files for the ChessArena platform.

## Required Sound Files

The following sound files are required for the audio system to work properly:

### Game Sounds
- **move.mp3** - Standard piece move sound
- **capture.mp3** - Piece capture sound (more pronounced than move)
- **check.mp3** - King in check warning sound
- **checkmate.mp3** - Checkmate victory/defeat sound
- **castling.mp3** - Castling move sound

### UI Sounds
- **game-start.mp3** - Game beginning sound
- **game-end.mp3** - Game completion sound
- **notification.mp3** - General notification sound
- **challenge.mp3** - Game challenge received sound
- **chat.mp3** - Chat message received sound
- **low-time.mp3** - Clock ticking sound (plays when < 10 seconds)

## Sound File Specifications

- **Format**: MP3 (for broad browser compatibility)
- **Sample Rate**: 44.1 kHz recommended
- **Bit Rate**: 128-192 kbps
- **Duration**: 0.5-2 seconds (short and crisp)
- **Volume**: Normalized to prevent clipping

## Sources for Sound Effects

You can obtain chess sound effects from:
1. **Lichess** - Open source chess sounds (MIT licensed)
2. **Chess.com** - Various sound packs
3. **Freesound.org** - Creative Commons licensed sounds
4. **Custom recording** - Record your own chess piece sounds

## Implementation Notes

- All sounds are preloaded on AudioService initialization
- Sounds can overlap (cloned before playing)
- Volume is controlled globally (0-100%)
- Individual sounds can be toggled on/off
- Low time warning plays every second when clock < 10s

## Temporary Placeholder

For development purposes, you can use silent audio files or download free chess sounds from the sources mentioned above.
