/**
 * Chess Opening Database
 * Identifies chess openings from move sequences
 */

export interface Opening {
  eco: string; // ECO code (e.g., "B20")
  name: string;
  moves: string; // Space-separated SAN moves
  variation?: string;
}

/**
 * Common chess openings database
 * This is a simplified database. A production system would use a comprehensive ECO database.
 */
export const OPENINGS_DATABASE: Opening[] = [
  // King's Pawn Openings (1.e4)
  { eco: 'B20', name: 'Sicilian Defense', moves: 'e4 c5' },
  { eco: 'B23', name: 'Sicilian Defense: Closed', moves: 'e4 c5 Nc3' },
  { eco: 'B50', name: 'Sicilian Defense: Modern Variations', moves: 'e4 c5 Nf3 d6' },
  { eco: 'B90', name: 'Sicilian Defense: Najdorf', moves: 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6' },
  
  { eco: 'C00', name: 'French Defense', moves: 'e4 e6' },
  { eco: 'C02', name: 'French Defense: Advance Variation', moves: 'e4 e6 d4 d5 e5' },
  { eco: 'C11', name: 'French Defense: Classical', moves: 'e4 e6 d4 d5 Nc3 Nf6' },
  
  { eco: 'B10', name: 'Caro-Kann Defense', moves: 'e4 c6' },
  { eco: 'B12', name: 'Caro-Kann Defense: Advance Variation', moves: 'e4 c6 d4 d5 e5' },
  
  { eco: 'C40', name: 'King\'s Pawn Game', moves: 'e4 e5' },
  { eco: 'C42', name: 'Russian Game', moves: 'e4 e5 Nf3 Nf6' },
  { eco: 'C44', name: 'Scotch Game', moves: 'e4 e5 Nf3 Nc6 d4' },
  { eco: 'C50', name: 'Italian Game', moves: 'e4 e5 Nf3 Nc6 Bc4' },
  { eco: 'C53', name: 'Italian Game: Giuoco Piano', moves: 'e4 e5 Nf3 Nc6 Bc4 Bc5' },
  { eco: 'C55', name: 'Italian Game: Two Knights Defense', moves: 'e4 e5 Nf3 Nc6 Bc4 Nf6' },
  
  { eco: 'C60', name: 'Ruy Lopez', moves: 'e4 e5 Nf3 Nc6 Bb5' },
  { eco: 'C65', name: 'Ruy Lopez: Berlin Defense', moves: 'e4 e5 Nf3 Nc6 Bb5 Nf6' },
  { eco: 'C70', name: 'Ruy Lopez: Morphy Defense', moves: 'e4 e5 Nf3 Nc6 Bb5 a6' },
  { eco: 'C84', name: 'Ruy Lopez: Closed', moves: 'e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Be7 Re1 b5 Bb3 d6' },
  
  { eco: 'C30', name: 'King\'s Gambit', moves: 'e4 e5 f4' },
  { eco: 'C33', name: 'King\'s Gambit Accepted', moves: 'e4 e5 f4 exf4' },
  
  { eco: 'C20', name: 'King\'s Pawn Opening', moves: 'e4 e5 d4' },
  
  // Queen's Pawn Openings (1.d4)
  { eco: 'D00', name: 'Queen\'s Pawn Game', moves: 'd4 d5' },
  { eco: 'D06', name: 'Queen\'s Gambit', moves: 'd4 d5 c4' },
  { eco: 'D08', name: 'Queen\'s Gambit Declined', moves: 'd4 d5 c4 e6' },
  { eco: 'D20', name: 'Queen\'s Gambit Accepted', moves: 'd4 d5 c4 dxc4' },
  { eco: 'D30', name: 'Queen\'s Gambit Declined', moves: 'd4 d5 c4 e6 Nf3' },
  { eco: 'D37', name: 'Queen\'s Gambit Declined: Classical', moves: 'd4 d5 c4 e6 Nf3 Nf6 Nc3 Be7' },
  
  { eco: 'D85', name: 'Grünfeld Defense', moves: 'd4 Nf6 c4 g6 Nc3 d5' },
  
  { eco: 'E00', name: 'Indian Defense', moves: 'd4 Nf6' },
  { eco: 'E20', name: 'Nimzo-Indian Defense', moves: 'd4 Nf6 c4 e6 Nc3 Bb4' },
  { eco: 'E60', name: 'King\'s Indian Defense', moves: 'd4 Nf6 c4 g6' },
  { eco: 'E61', name: 'King\'s Indian Defense', moves: 'd4 Nf6 c4 g6 Nc3 Bg7' },
  
  { eco: 'A40', name: 'Queen\'s Pawn Opening', moves: 'd4 e6' },
  { eco: 'A45', name: 'Indian Defense', moves: 'd4 Nf6' },
  
  { eco: 'A80', name: 'Dutch Defense', moves: 'd4 f5' },
  
  // Flank Openings
  { eco: 'A00', name: 'Uncommon Opening', moves: 'g3' },
  { eco: 'A04', name: 'Réti Opening', moves: 'Nf3' },
  { eco: 'A05', name: 'Réti Opening: King\'s Indian Attack', moves: 'Nf3 Nf6 g3' },
  { eco: 'A06', name: 'Réti Opening', moves: 'Nf3 d5' },
  { eco: 'A07', name: 'King\'s Indian Attack', moves: 'Nf3 d5 g3' },
  
  { eco: 'A10', name: 'English Opening', moves: 'c4' },
  { eco: 'A13', name: 'English Opening', moves: 'c4 e6' },
  { eco: 'A15', name: 'English Opening: Anglo-Indian Defense', moves: 'c4 Nf6' },
  { eco: 'A20', name: 'English Opening', moves: 'c4 e5' },
  { eco: 'A30', name: 'English Opening: Symmetrical', moves: 'c4 c5' },
  
  { eco: 'A01', name: 'Nimzowitsch-Larsen Attack', moves: 'b3' },
  { eco: 'A02', name: 'Bird\'s Opening', moves: 'f4' },
  
  // Other Openings
  { eco: 'B00', name: 'King\'s Pawn Opening', moves: 'e4 Nc6' },
  { eco: 'B01', name: 'Scandinavian Defense', moves: 'e4 d5' },
  { eco: 'B02', name: 'Alekhine\'s Defense', moves: 'e4 Nf6' },
  { eco: 'B06', name: 'Modern Defense', moves: 'e4 g6' },
  
  { eco: 'C21', name: 'Danish Gambit', moves: 'e4 e5 d4 exd4 c3' },
  { eco: 'C25', name: 'Vienna Game', moves: 'e4 e5 Nc3' },
];

/**
 * Identify opening from move sequence
 */
export function identifyOpening(moves: string[]): Opening | null {
  if (moves.length === 0) return null;
  
  // Convert moves array to space-separated string
  const moveSequence = moves.join(' ');
  
  // Find the longest matching opening
  let bestMatch: Opening | null = null;
  let bestMatchLength = 0;
  
  for (const opening of OPENINGS_DATABASE) {
    if (moveSequence.startsWith(opening.moves)) {
      const moveCount = opening.moves.split(' ').length;
      if (moveCount > bestMatchLength) {
        bestMatch = opening;
        bestMatchLength = moveCount;
      }
    }
  }
  
  return bestMatch;
}

/**
 * Get opening name from move sequence
 */
export function getOpeningName(moves: string[]): string {
  const opening = identifyOpening(moves);
  
  if (!opening) {
    // Fallback to basic classification
    if (moves.length === 0) return 'Starting Position';
    
    const firstMove = moves[0];
    if (firstMove === 'e4') return 'King\'s Pawn Opening';
    if (firstMove === 'd4') return 'Queen\'s Pawn Opening';
    if (firstMove === 'Nf3') return 'Réti Opening';
    if (firstMove === 'c4') return 'English Opening';
    if (firstMove === 'f4') return 'Bird\'s Opening';
    if (firstMove === 'b3') return 'Nimzowitsch-Larsen Attack';
    
    return 'Uncommon Opening';
  }
  
  return opening.variation ? `${opening.name}: ${opening.variation}` : opening.name;
}

/**
 * Get ECO code from move sequence
 */
export function getECOCode(moves: string[]): string | null {
  const opening = identifyOpening(moves);
  return opening ? opening.eco : null;
}

/**
 * Get opening category
 */
export function getOpeningCategory(moves: string[]): string {
  if (moves.length === 0) return 'Unknown';
  
  const firstMove = moves[0];
  
  if (firstMove === 'e4') {
    if (moves.length > 1) {
      const secondMove = moves[1];
      if (secondMove === 'e5') return 'Open Games';
      if (secondMove === 'c5') return 'Sicilian Defense';
      if (secondMove === 'e6') return 'French Defense';
      if (secondMove === 'c6') return 'Caro-Kann Defense';
      return 'Semi-Open Games';
    }
    return 'King\'s Pawn Opening';
  }
  
  if (firstMove === 'd4') {
    if (moves.length > 1) {
      const secondMove = moves[1];
      if (secondMove === 'd5') return 'Closed Games';
      if (secondMove === 'Nf6') return 'Indian Defenses';
      return 'Queen\'s Pawn Opening';
    }
    return 'Queen\'s Pawn Opening';
  }
  
  if (['Nf3', 'c4', 'g3', 'b3', 'f4'].includes(firstMove)) {
    return 'Flank Openings';
  }
  
  return 'Irregular Openings';
}

/**
 * Check if opening is aggressive
 */
export function isAggressiveOpening(moves: string[]): boolean {
  const opening = identifyOpening(moves);
  if (!opening) return false;
  
  const aggressiveOpenings = [
    'King\'s Gambit',
    'Danish Gambit',
    'Sicilian Defense',
    'Dragon Variation',
    'Najdorf',
    'Alekhine\'s Defense',
  ];
  
  return aggressiveOpenings.some(name => opening.name.includes(name));
}

/**
 * Check if opening is solid/positional
 */
export function isSolidOpening(moves: string[]): boolean {
  const opening = identifyOpening(moves);
  if (!opening) return false;
  
  const solidOpenings = [
    'Queen\'s Gambit Declined',
    'Caro-Kann',
    'French Defense',
    'London System',
    'Réti Opening',
  ];
  
  return solidOpenings.some(name => opening.name.includes(name));
}

/**
 * Get opening description
 */
export function getOpeningDescription(moves: string[]): string {
  const opening = identifyOpening(moves);
  if (!opening) return 'No specific opening identified';
  
  // This would ideally come from a database
  const descriptions: Record<string, string> = {
    'Sicilian Defense': 'A sharp, asymmetrical opening that leads to complex positions',
    'French Defense': 'A solid defense that creates a strong pawn chain',
    'Caro-Kann Defense': 'A reliable defense that aims for a solid position',
    'Ruy Lopez': 'One of the oldest and most classical openings',
    'Italian Game': 'A classical opening focusing on rapid development',
    'Queen\'s Gambit': 'A strategic opening offering a pawn for central control',
    'King\'s Indian Defense': 'A hypermodern defense allowing White central control',
    'English Opening': 'A flexible flank opening with many transpositional possibilities',
  };
  
  for (const [key, description] of Object.entries(descriptions)) {
    if (opening.name.includes(key)) {
      return description;
    }
  }
  
  return 'A chess opening with various strategic possibilities';
}

/**
 * Get popular continuations for an opening
 */
export function getPopularContinuations(moves: string[]): string[] {
  // This would ideally query a database of master games
  // For now, return empty array as placeholder
  return [];
}

/**
 * Search openings by name
 */
export function searchOpenings(query: string): Opening[] {
  const lowerQuery = query.toLowerCase();
  return OPENINGS_DATABASE.filter(opening => 
    opening.name.toLowerCase().includes(lowerQuery) ||
    opening.eco.toLowerCase().includes(lowerQuery)
  );
}
