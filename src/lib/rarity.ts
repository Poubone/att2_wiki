/**
 * Utilitaires pour gérer les couleurs et styles de rareté
 */

export type RarityLevel = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'unknown';

/**
 * Mappe les raretés de notre système vers les niveaux standardisés
 */
export function normalizeRarity(rarity: string | null | undefined): RarityLevel {
  if (!rarity) return 'unknown';
  const lower = rarity.toLowerCase();
  
  if (lower.includes('common') || lower.includes('commun')) return 'common';
  if (lower.includes('uncommon') || lower.includes('peu commun')) return 'uncommon';
  if (lower.includes('rare')) return 'rare';
  if (lower.includes('epic') || lower.includes('épique')) return 'epic';
  if (lower.includes('legendary') || lower.includes('légendaire')) return 'legendary';
  
  return 'unknown';
}

export const RARITY_COLORS: Record<RarityLevel, string> = {
  common: 'text-gray-300',
  uncommon: 'text-green-400',
  rare: 'text-blue-400',
  epic: 'text-purple-400',
  legendary: 'text-yellow-400',
  unknown: 'text-gray-400',
};

// Couleurs pour les icônes SVG (stroke)
export const RARITY_ICON_COLORS: Record<RarityLevel, string> = {
  common: '#d1d5db', // gray-300
  uncommon: '#4ade80', // green-400
  rare: '#60a5fa', // blue-400
  epic: '#a78bfa', // purple-400
  legendary: '#facc15', // yellow-400
  unknown: '#9ca3af', // gray-400
};

export const RARITY_BG: Record<RarityLevel, string> = {
  common: 'bg-gray-600/30',
  uncommon: 'bg-green-600/30',
  rare: 'bg-blue-600/30',
  epic: 'bg-purple-600/30',
  legendary: 'bg-yellow-600/30',
  unknown: 'bg-gray-600/20',
};

export const RARITY_BORDER: Record<RarityLevel, string> = {
  common: 'border-gray-500',
  uncommon: 'border-green-500',
  rare: 'border-blue-500',
  epic: 'border-purple-500',
  legendary: 'border-yellow-500',
  unknown: 'border-gray-400',
};

export const RARITY_ORDER: Record<RarityLevel, number> = {
  common: 0,
  uncommon: 1,
  rare: 2,
  epic: 3,
  legendary: 4,
  unknown: -1,
};
