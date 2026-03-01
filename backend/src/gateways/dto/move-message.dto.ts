/**
 * Optimized DTOs for move transmission with minimal payload size
 * Task 14.5: Move transmission with latency optimization
 */

/**
 * Minimal move data for transmission (optimized for size)
 * Uses short property names to reduce payload size
 */
export interface OptimizedMoveDto {
  /** Game ID */
  g: string;
  /** From square (e.g., 'e2') */
  f: string;
  /** To square (e.g., 'e4') */
  t: string;
  /** Promotion piece (optional: 'q', 'r', 'b', 'n') */
  p?: string;
}

/**
 * Minimal move broadcast data (optimized for size)
 */
export interface OptimizedMoveBroadcastDto {
  /** Game ID */
  g: string;
  /** Move in SAN notation */
  m: string;
  /** From square */
  f: string;
  /** To square */
  t: string;
  /** Promotion piece (optional) */
  p?: string;
  /** FEN position after move */
  fen: string;
  /** Move count */
  mc: number;
  /** Is check */
  ch?: boolean;
  /** Is checkmate */
  cm?: boolean;
  /** White time remaining (ms) */
  wt: number;
  /** Black time remaining (ms) */
  bt: number;
  /** Player ID who made the move */
  pid: string;
  /** Server timestamp when move was processed */
  ts: number;
}

/**
 * Latency tracking data
 */
export interface MoveLatencyDto {
  /** Client send timestamp */
  clientSendTime?: number;
  /** Server receive timestamp */
  serverReceiveTime: number;
  /** Server validation time (ms) */
  validationTime: number;
  /** Server broadcast time (ms) */
  broadcastTime: number;
  /** Total server processing time (ms) */
  totalServerTime: number;
}

/**
 * Move success response with latency data
 */
export interface MoveSuccessDto {
  /** Game ID */
  gameId: string;
  /** Move in SAN notation */
  move: string;
  /** FEN position after move */
  fen: string;
  /** Latency tracking data */
  latency: MoveLatencyDto;
}

/**
 * Binary move encoding utilities (for future optimization)
 */
export class BinaryMoveEncoder {
  /**
   * Encode a square (e.g., 'e2') to a single byte (0-63)
   */
  static encodeSquare(square: string): number {
    const file = square.charCodeAt(0) - 97; // 'a' = 0, 'h' = 7
    const rank = parseInt(square[1]) - 1; // '1' = 0, '8' = 7
    return rank * 8 + file;
  }

  /**
   * Decode a byte (0-63) to a square (e.g., 'e2')
   */
  static decodeSquare(byte: number): string {
    const file = String.fromCharCode(97 + (byte % 8));
    const rank = Math.floor(byte / 8) + 1;
    return `${file}${rank}`;
  }

  /**
   * Encode promotion piece to 2 bits
   * q=0, r=1, b=2, n=3
   */
  static encodePromotion(piece?: string): number {
    if (!piece) return 0;
    const map: Record<string, number> = { q: 0, r: 1, b: 2, n: 3 };
    return map[piece] || 0;
  }

  /**
   * Decode promotion piece from 2 bits
   */
  static decodePromotion(bits: number): string | undefined {
    const map = ['q', 'r', 'b', 'n'];
    return bits > 0 ? map[bits] : undefined;
  }

  /**
   * Encode a move to 2 bytes (16 bits)
   * Bits 0-5: from square (6 bits)
   * Bits 6-11: to square (6 bits)
   * Bits 12-13: promotion (2 bits)
   * Bits 14-15: reserved
   */
  static encodeMove(from: string, to: string, promotion?: string): Buffer {
    const fromByte = this.encodeSquare(from);
    const toByte = this.encodeSquare(to);
    const promoBits = this.encodePromotion(promotion);
    
    const value = (fromByte & 0x3f) | ((toByte & 0x3f) << 6) | ((promoBits & 0x03) << 12);
    
    const buffer = Buffer.allocUnsafe(2);
    buffer.writeUInt16LE(value, 0);
    return buffer;
  }

  /**
   * Decode a move from 2 bytes
   */
  static decodeMove(buffer: Buffer): { from: string; to: string; promotion?: string } {
    const value = buffer.readUInt16LE(0);
    
    const fromByte = value & 0x3f;
    const toByte = (value >> 6) & 0x3f;
    const promoBits = (value >> 12) & 0x03;
    
    return {
      from: this.decodeSquare(fromByte),
      to: this.decodeSquare(toByte),
      promotion: this.decodePromotion(promoBits),
    };
  }
}
