/**
 * Chess board and piece customization types
 * Requirements: 22.16, 22.17
 */

export interface BoardTheme {
  id: string;
  name: string;
  lightSquare: string;
  darkSquare: string;
  preview?: string;
}

export interface PieceSet {
  id: string;
  name: string;
  description?: string;
}

export const BOARD_THEMES: BoardTheme[] = [
  {
    id: 'default',
    name: 'Classic Brown',
    lightSquare: '#f0d9b5',
    darkSquare: '#b58863',
  },
  {
    id: 'blue',
    name: 'Ocean Blue',
    lightSquare: '#dee3e6',
    darkSquare: '#8ca2ad',
  },
  {
    id: 'green',
    name: 'Forest Green',
    lightSquare: '#ffffdd',
    darkSquare: '#86a666',
  },
  {
    id: 'purple',
    name: 'Royal Purple',
    lightSquare: '#e8e0f5',
    darkSquare: '#9b7fb8',
  },
  {
    id: 'gray',
    name: 'Modern Gray',
    lightSquare: '#e8e8e8',
    darkSquare: '#6c757d',
  },
  {
    id: 'wood',
    name: 'Wooden',
    lightSquare: '#f4e4c1',
    darkSquare: '#c49a6c',
  },
];

export const PIECE_SETS: PieceSet[] = [
  {
    id: 'default',
    name: 'Classic',
    description: 'Traditional chess pieces',
  },
  {
    id: 'alpha',
    name: 'Alpha',
    description: 'Modern minimalist design',
  },
  {
    id: 'california',
    name: 'California',
    description: 'Bold and distinctive',
  },
  {
    id: 'cardinal',
    name: 'Cardinal',
    description: 'Elegant and refined',
  },
  {
    id: 'cburnett',
    name: 'CBurnett',
    description: 'Clean and professional',
  },
  {
    id: 'chess7',
    name: 'Chess7',
    description: 'Classic tournament style',
  },
  {
    id: 'companion',
    name: 'Companion',
    description: 'Friendly and approachable',
  },
  {
    id: 'dubrovny',
    name: 'Dubrovny',
    description: 'Artistic and unique',
  },
  {
    id: 'fantasy',
    name: 'Fantasy',
    description: 'Imaginative design',
  },
  {
    id: 'fresca',
    name: 'Fresca',
    description: 'Fresh and modern',
  },
  {
    id: 'gioco',
    name: 'Gioco',
    description: 'Italian style',
  },
  {
    id: 'governor',
    name: 'Governor',
    description: 'Authoritative and strong',
  },
  {
    id: 'horsey',
    name: 'Horsey',
    description: 'Playful and fun',
  },
  {
    id: 'icpieces',
    name: 'IC Pieces',
    description: 'Internet Chess style',
  },
  {
    id: 'kosal',
    name: 'Kosal',
    description: 'Distinctive design',
  },
  {
    id: 'leipzig',
    name: 'Leipzig',
    description: 'German tournament style',
  },
  {
    id: 'letter',
    name: 'Letter',
    description: 'Text-based pieces',
  },
  {
    id: 'libra',
    name: 'Libra',
    description: 'Balanced design',
  },
  {
    id: 'maestro',
    name: 'Maestro',
    description: 'Professional tournament',
  },
  {
    id: 'merida',
    name: 'Merida',
    description: 'Classic tournament',
  },
  {
    id: 'pirouetti',
    name: 'Pirouetti',
    description: 'Elegant and flowing',
  },
  {
    id: 'pixel',
    name: 'Pixel',
    description: 'Retro 8-bit style',
  },
  {
    id: 'reillycraig',
    name: 'Reilly Craig',
    description: 'Modern classic',
  },
  {
    id: 'riohacha',
    name: 'Riohacha',
    description: 'South American style',
  },
  {
    id: 'shapes',
    name: 'Shapes',
    description: 'Geometric design',
  },
  {
    id: 'spatial',
    name: 'Spatial',
    description: '3D-inspired',
  },
  {
    id: 'staunty',
    name: 'Staunty',
    description: 'Staunton style',
  },
  {
    id: 'tatiana',
    name: 'Tatiana',
    description: 'Elegant and refined',
  },
];

export interface ChessPreferences {
  boardTheme: string;
  pieceSet: string;
}
